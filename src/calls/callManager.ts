// In-app voice/video calling manager.
// WebRTC peer-to-peer media with STUN, signaling relayed through the backend
// (call_signal table + 700ms polling during setup), lifecycle events pushed
// over the existing SSE stream.

import { ref } from 'vue'
import { callApi, type Call, type CallUser } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { on as onStreamEvent, ensureStream } from '@/messaging/stream'

export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'active'

export const callState = ref<Call | null>(null)
export const callPhase = ref<CallPhase>('idle')
export const localStream = ref<MediaStream | null>(null)
export const remoteStream = ref<MediaStream | null>(null)
export const muted = ref(false)
export const videoEnabled = ref(true)
export const callError = ref('')

const STUN = { urls: 'stun:stun.l.google.com:19302' }
const RING_TIMEOUT_MS = 60000

let pc: RTCPeerConnection | null = null
let signalAfter = 0
let signalTimer: number | null = null
let ringTimer: number | null = null
let pendingIce: RTCIceCandidateInit[] = []
let audioCtx: AudioContext | null = null
let ringNodes: { osc: OscillatorNode; gain: GainNode } | null = null
let stopFns: (() => void)[] = []

function me(): number | null {
  return useAuthStore().user?.id ?? null
}

function otherUser(call: Call): CallUser | null {
  const uid = me()
  if (call.caller?.id === uid) return call.callee
  if (call.callee?.id === uid) return call.caller
  return call.caller || call.callee
}

// ---------- ringtone (WebAudio, no asset files) ----------

function startRing() {
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 520
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    // trill: alternate 520/420 Hz every 400ms
    ringNodes = { osc, gain }
    ;(audioCtx as any)._trill = setInterval(() => {
      osc.frequency.value = osc.frequency.value === 520 ? 420 : 520
    }, 400)
  } catch {
    // audio not available — silent ring
  }
}

function stopRing() {
  if (audioCtx) {
    try {
      clearInterval((audioCtx as any)._trill)
      ringNodes?.osc.stop()
    } catch {
      // already stopped
    }
    audioCtx.close().catch(() => {})
  }
  audioCtx = null
  ringNodes = null
}

// ---------- WebRTC ----------

async function getUserMedia(type: 'audio' | 'video'): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      type === 'video' ? { audio: true, video: { facingMode: 'user' } } : { audio: true },
    )
    return stream
  } catch {
    callError.value = 'Microphone/camera access denied. Enable it in your browser.'
    return null
  }
}

function cleanupPeer() {
  if (signalTimer != null) {
    window.clearInterval(signalTimer)
    signalTimer = null
  }
  if (pc) {
    pc.onicecandidate = null
    pc.ontrack = null
    try {
      pc.close()
    } catch {
      // already closed
    }
    pc = null
  }
  localStream.value?.getTracks().forEach((t) => t.stop())
  localStream.value = null
  remoteStream.value = null
  pendingIce = []
}

function setupPeer(callId: string, isCaller: boolean) {
  const stream = localStream.value
  if (!stream) return

  pc = new RTCPeerConnection({ iceServers: [STUN] })
  stream.getTracks().forEach((t) => pc!.addTrack(t, stream))
  pc.ontrack = (e) => {
    if (e.streams[0]) remoteStream.value = e.streams[0]
  }
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      callApi.signal(callId, 'ice', { candidate: e.candidate.toJSON() }).catch(() => {})
    }
  }

  if (isCaller) {
    pc.createOffer()
      .then((offer) => {
        pc!.setLocalDescription(offer)
        return callApi.signal(callId, 'offer', { sdp: offer })
      })
      .catch(() => {
        callError.value = 'Could not start the call.'
      })
  }

  // poll for the other party's signals during setup
  signalTimer = window.setInterval(() => pollSignals(callId), 700)
  pollSignals(callId)
}

async function pollSignals(callId: string) {
  if (!pc) return
  try {
    const res = await callApi.signals(callId, signalAfter)
    for (const s of res.data.signals) {
      signalAfter = s.id
      const payload = s.payload
      if (s.type === 'offer') {
        await pc.setRemoteDescription(payload as unknown as RTCSessionDescriptionInit)
        pendingIce.forEach((c) => pc!.addIceCandidate(c).catch(() => {}))
        pendingIce = []
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        callApi.signal(callId, 'answer', { sdp: answer }).catch(() => {})
      } else if (s.type === 'answer') {
        await pc.setRemoteDescription(payload as unknown as RTCSessionDescriptionInit)
        pendingIce.forEach((c) => pc!.addIceCandidate(c).catch(() => {}))
        pendingIce = []
      } else if (s.type === 'ice') {
        if (pc.remoteDescription) {
          pc.addIceCandidate(payload as RTCIceCandidateInit).catch(() => {})
        } else {
          pendingIce.push(payload as RTCIceCandidateInit)
        }
      }
    }
  } catch {
    // transient — keep polling
  }
}

// ---------- actions ----------

async function startCall(userId: number, callType: 'audio' | 'video') {
  if (callPhase.value !== 'idle') return
  callError.value = ''
  ensureStream()
  try {
    const res = await callApi.create(userId, callType)
    callState.value = res.data
    callPhase.value = 'outgoing'
    startRing()
    ringTimer = window.setTimeout(() => {
      // no answer
      callApi.end(res.data.id, 'missed').catch(() => {})
      resetUi()
    }, RING_TIMEOUT_MS)
    import('@/analytics/tracker').then((m) => m.default.trackEvent('call_start', 'conversion', { call_type: callType }))
  } catch (e: any) {
    callError.value = e.response?.data?.error || 'Call could not be started.'
  }
}

async function acceptCall() {
  const call = callState.value
  if (!call || callPhase.value !== 'incoming') return
  stopRing()
  const stream = await getUserMedia(call.call_type)
  if (!stream) return
  localStream.value = stream
  try {
    await callApi.answer(call.id, true)
    callPhase.value = 'active'
    setupPeer(call.id, false)
    import('@/analytics/tracker').then((m) => m.default.trackEvent('call_answer', 'conversion', { call_type: call.call_type }))
  } catch (e: any) {
    callError.value = e.response?.data?.error || 'Could not answer the call.'
  }
}

async function declineCall() {
  const call = callState.value
  stopRing()
  cleanupPeer()
  if (call) {
    callApi.answer(call.id, false).catch(() => {})
  }
  resetUi()
}

async function endCall() {
  const call = callState.value
  stopRing()
  cleanupPeer()
  if (call) {
    callApi.end(call.id).catch(() => {})
    import('@/analytics/tracker').then((m) => m.default.trackEvent('call_end', 'event', { call_type: call.call_type }))
  }
  resetUi()
}

function resetUi() {
  if (ringTimer != null) {
    window.clearTimeout(ringTimer)
    ringTimer = null
  }
  callState.value = null
  callPhase.value = 'idle'
  muted.value = false
  videoEnabled.value = true
}

function toggleMute() {
  muted.value = !muted.value
  localStream.value?.getAudioTracks().forEach((t) => (t.enabled = !muted.value))
}

function toggleVideo() {
  videoEnabled.value = !videoEnabled.value
  localStream.value?.getVideoTracks().forEach((t) => (t.enabled = videoEnabled.value))
}

// ---------- SSE wiring ----------

function wireStream() {
  const offCall = onStreamEvent('call', (p: any) => {
    const call = p.call as Call
    const uid = me()
    if (callState.value && call.id === callState.value.id) return
    // ignore calls for other users on shared devices
    if (call.caller?.id !== uid && call.callee?.id !== uid) return
    if (call.status !== 'ringing') return
    // a new call involving me — stop ringing the previous one
    stopRing()
    cleanupPeer()
    callState.value = call
    callPhase.value = call.caller?.id === uid ? 'outgoing' : 'incoming'
    startRing()
    if (call.caller?.id === uid) {
      ringTimer = window.setTimeout(() => {
        callApi.end(call.id, 'missed').catch(() => {})
        resetUi()
      }, RING_TIMEOUT_MS)
    }
  })

  const offUpdate = onStreamEvent('call_update', (p: any) => {
    const call = p.call as Call
    if (!callState.value || call.id !== callState.value.id) {
      // a call the caller already dismissed (e.g. declined elsewhere) — clear stale UI
      if (callPhase.value !== 'idle' && call.status !== 'active') resetUi()
      return
    }
    if (call.status === 'active' && callPhase.value === 'outgoing') {
      // callee accepted — become the caller side of the peer connection
      stopRing()
      callState.value = call
      getUserMedia(call.call_type).then((stream) => {
        if (!stream) return
        localStream.value = stream
        callPhase.value = 'active'
        setupPeer(call.id, true)
      })
    } else if (['ended', 'declined', 'missed'].includes(call.status)) {
      stopRing()
      cleanupPeer()
      resetUi()
    }
  })

  stopFns.push(offCall, offUpdate)
}

wireStream()

// reset everything on logout
export function resetCalls() {
  stopRing()
  cleanupPeer()
  resetUi()
  stopFns.forEach((fn) => fn())
  stopFns = []
  wireStream()
}

export const callManager = {
  startCall,
  acceptCall,
  declineCall,
  endCall,
  toggleMute,
  toggleVideo,
  resetCalls,
}

export default callManager
