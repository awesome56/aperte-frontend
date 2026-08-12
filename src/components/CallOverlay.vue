<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { callState, callPhase, localStream, remoteStream, muted, videoEnabled, callError, calleeOnline, callManager } from '@/calls/callManager'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const remoteVideoEl = ref<HTMLVideoElement | null>(null)
const localVideoEl = ref<HTMLVideoElement | null>(null)

watch(remoteStream, (s) => {
  if (remoteVideoEl.value && s) remoteVideoEl.value.srcObject = s
})
watch(localStream, (s) => {
  if (localVideoEl.value && s) localVideoEl.value.srcObject = s
})

const elapsed = ref(0)
let timer: number | null = null

const other = computed(() => {
  const uid = auth.user?.id
  const call = callState.value
  if (!call) return null
  if (call.caller?.id === uid) return call.callee
  return call.caller
})

const initials = computed(() => {
  const name = other.value?.full_name || other.value?.username || '?'
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
})

const phaseLabel = computed(() => {
  if (callPhase.value === 'outgoing') {
    return calleeOnline.value ? 'Ringing…' : 'Calling…'
  }
  if (callPhase.value === 'incoming') return 'Incoming call'
  return 'In call'
})

const callKindLabel = computed(() => {
  const kind = callState.value?.call_type === 'video' ? 'video call' : 'voice call'
  if (callPhase.value === 'incoming') return `Incoming ${kind}`
  return kind
})

function fmtElapsed() {
  const s = elapsed.value
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

onMounted(() => {
  timer = window.setInterval(() => {
    if (callPhase.value === 'active') elapsed.value += 1
  }, 1000)
})
onUnmounted(() => {
  if (timer != null) window.clearInterval(timer)
})

// stop everything on logout
watch(
  () => auth.isAuthenticated,
  (v) => {
    if (!v) callManager.resetCalls()
  },
)
</script>

<template>
  <Teleport to="body">
    <!-- Incoming call: top-right dismissible notification (any page) -->
    <div v-if="callPhase === 'incoming'" class="call-notif">
      <div class="notif-avatar">{{ initials }}</div>
      <div class="notif-info">
        <strong>{{ other?.full_name || other?.username || '…' }}</strong>
        <span>{{ callKindLabel }}</span>
      </div>
      <div class="notif-actions">
        <button class="notif-btn decline" title="Decline" @click="callManager.declineCall()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
        </button>
        <button class="notif-btn accept" title="Accept" @click="callManager.acceptCall()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
        </button>
      </div>
      <button class="notif-dismiss" title="Dismiss" @click="callManager.declineCall()">×</button>
    </div>

    <!-- Outgoing / active call: center overlay -->
    <div v-else-if="callPhase !== 'idle'" class="call-overlay">
      <div class="card" :class="{ video: callState?.call_type === 'video' && callPhase === 'active' }">
        <!-- remote video -->
        <video
          v-if="callState?.call_type === 'video' && callPhase === 'active'"
          ref="remoteVideoEl"
          autoplay
          playsinline
          class="remote-video"
        ></video>
        <div v-else class="avatar-big">
          {{ initials }}
        </div>        <!-- local video PiP -->
        <video
          v-if="callState?.call_type === 'video' && callPhase === 'active'"
          ref="localVideoEl"
          autoplay
          playsinline
          muted
          class="local-video"
        ></video>

        <!-- info -->
        <h3>{{ other?.full_name || other?.username || '…' }}</h3>
        <p class="phase">
          {{ phaseLabel }}
          <span v-if="callPhase === 'active'">· {{ fmtElapsed() }}</span>
        </p>
        <p v-if="callError" class="err">{{ callError }}</p>

        <!-- actions -->
        <div class="actions">
          <template v-if="callPhase === 'outgoing'">
            <button class="btn-act decline" title="Cancel" @click="callManager.endCall()">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
            </button>
          </template>

          <template v-else>
            <button class="btn-act" :class="{ off: muted }" :title="muted ? 'Unmute' : 'Mute'" @click="callManager.toggleMute()">
              <svg v-if="!muted" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
              <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.8 11.4c.12-.45.2-.92.2-1.4V5a5 5 0 0 0-9.9-1.3l9.7 7.7zM19 11c0 1.2-.22 2.36-.63 3.42l1.41 1.41A9.97 9.97 0 0 0 21 11h-2zM3.27 2L2 3.27l5.9 5.9V10a4 4 0 0 0 6.35 3.22l1.33 1.33A5.95 5.95 0 0 1 12 16a6 6 0 0 1-6-6H4a8 8 0 0 0 12.6 6.6l1.48 1.48A9.97 9.97 0 0 1 12 20a9.96 9.96 0 0 1-9.7-7.7l-2 2H2l.5-1.5L3.27 2zM15 11.18V5a3 3 0 0 0-6-.17v1.4l6 4.95z"/></svg>
            </button>
            <button v-if="callState?.call_type === 'video'" class="btn-act" :class="{ off: !videoEnabled }" :title="videoEnabled ? 'Turn off camera' : 'Turn on camera'" @click="callManager.toggleVideo()">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
            </button>
            <button class="btn-act decline" title="End call" @click="callManager.endCall()">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ---- incoming call notification (top right) ---- */
.call-notif {
  position: fixed;
  top: 90px;
  right: 20px;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
  padding: 14px 16px;
  min-width: 300px;
  max-width: min(92vw, 380px);
  animation: slide-in 0.25s ease;
  border: 1px solid var(--color-border, #eee);
}

@keyframes slide-in {
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.notif-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--clr-blue2, #0a84ff);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  flex-shrink: 0;
}

.notif-info {
  flex: 1;
  min-width: 0;
}

.notif-info strong {
  display: block;
  color: var(--color-dark, #1c1c1c);
  font-size: 0.98rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-info span {
  color: var(--color-muted, #666);
  font-size: 0.82rem;
}

.notif-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.notif-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.15s;
}

.notif-btn:hover {
  transform: scale(1.08);
}

.notif-btn.accept {
  background: #2ecc71;
  color: #fff;
}

.notif-btn.decline {
  background: #ff453a;
  color: #fff;
}

.notif-dismiss {
  position: absolute;
  top: 6px;
  right: 8px;
  border: none;
  background: none;
  color: var(--color-muted, #999);
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 6px;
}

.notif-dismiss:hover {
  background: #f0f0f2;
  color: #333;
}

/* ---- center overlay (outgoing / active) ---- */
.call-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(10, 12, 20, 0.75);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
}

.card {
  background: #fff;
  border-radius: 20px;
  padding: 30px 40px;
  text-align: center;
  min-width: 300px;
  position: relative;
  overflow: hidden;
}

.card.video {
  background: #10141f;
  min-width: min(90vw, 640px);
  min-height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 24px;
}

.remote-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.local-video {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 140px;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  object-fit: cover;
  background: #000;
}

.avatar-big {
  position: relative;
  width: 96px;
  height: 96px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--clr-blue2, #0a84ff);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 1.8rem;
  font-weight: 700;
}

.card.video .avatar-big {
  display: none;
}

.pulse-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 3px solid #2ecc71;
  animation: ring 1.2s infinite;
}

@keyframes ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.35); opacity: 0; }
}

.card h3 {
  color: var(--color-dark, #1c1c1c);
  font-size: 1.3rem;
  margin-bottom: 4px;
}

.card.video h3,
.card.video .phase {
  color: #fff;
  z-index: 2;
}

.phase {
  color: var(--color-muted, #666);
  margin-bottom: 8px;
  z-index: 2;
}

.err {
  color: #ff453a;
  font-size: 0.85rem;
  margin-bottom: 8px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 22px;
  margin-top: 18px;
  z-index: 2;
}

.btn-act {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: #eef0f3;
  color: #1c1c1c;
  transition: transform 0.15s;
}

.btn-act:hover {
  transform: scale(1.08);
}

.btn-act.accept {
  background: #2ecc71;
  color: #fff;
}

.btn-act.decline {
  background: #ff453a;
  color: #fff;
}

.btn-act.off {
  background: #ff453a;
  color: #fff;
}
</style>
