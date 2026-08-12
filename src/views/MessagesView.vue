<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { messageApi, type Conversation, type Message } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { unreadCount, on as onStreamEvent } from '@/messaging/stream'
// calls temporarily disabled — see callManager.ts
// import { callManager } from '@/calls/callManager'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const conversations = ref<Conversation[]>([])
const loading = ref(true)
const error = ref('')

// active thread
const activeUserId = ref<number | null>(null)
const threadUser = ref<{ id: number; username: string; full_name: string; profile_picture: string; online: boolean; last_seen: string | null } | null>(null)
const messages = ref<Message[]>([])
const threadLoading = ref(false)
const draft = ref('')
const sending = ref(false)

// quote context from the originating page
const quotePropertyId = ref<number | null>(null)
const quoteRequestId = ref<number | null>(null)

const listFilter = computed(() => {
  const params: Record<string, unknown> = {}
  if (route.query.property) params.property_id = Number(route.query.property)
  if (route.query.request) params.request_id = Number(route.query.request)
  return params
})

const chatRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
  })
}

function isNearBottom() {
  const el = chatRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 150
}

function fmtTime(v: string) {
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(v: string) {
  const d = new Date(v)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay ? fmtTime(v) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function lastSeenText(lastSeen: string | null) {
  if (!lastSeen) return 'offline'
  const diff = Date.now() - new Date(lastSeen).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function receipt(m: Message): { label: string; cls: string; icon: string } {
  if (m.read) return { label: 'Seen', cls: 'seen', icon: '✓✓' }
  if (m.delivered) return { label: 'Delivered', cls: 'delivered', icon: '✓✓' }
  return { label: 'Sent', cls: 'sent', icon: '✓' }
}

async function loadConversations() {
  try {
    const res = await messageApi.conversations(Object.keys(listFilter.value).length ? listFilter.value : undefined)
    conversations.value = res.data.data
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load conversations.'
  } finally {
    loading.value = false
  }
}

async function openThread(userId: number, silent = false) {
  activeUserId.value = userId
  if (!silent) {
    threadLoading.value = true
    messages.value = []
  }
  try {
    const res = await messageApi.thread(userId)
    threadUser.value = res.data.user
    messages.value = res.data.messages
    // only auto-scroll on a fresh open, or on silent refresh when the user is
    // already near the bottom (don't yank them away from reading history)
    if (!silent || isNearBottom()) scrollToBottom()
    if (!silent) await loadConversations()
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load conversation.'
  } finally {
    threadLoading.value = false
  }
}

async function send() {
  const body = draft.value.trim()
  if (!body || !activeUserId.value || sending.value) return
  sending.value = true
  try {
    const payload: { body: string; receiver_id: number; property_id?: number; request_id?: number } = {
      body,
      receiver_id: activeUserId.value,
    }
    if (quotePropertyId.value) payload.property_id = quotePropertyId.value
    if (quoteRequestId.value) payload.request_id = quoteRequestId.value
    const res = await messageApi.send(payload)
    messages.value.push(res.data)
    draft.value = ''
    scrollToBottom()
    await loadConversations()
    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent('message_send', 'conversion', {
        property_id: quotePropertyId.value,
        request_id: quoteRequestId.value,
      }),
    )
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to send message.'
  } finally {
    sending.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// ---------- voice notes ----------

const recording = ref(false)
const previewingVoice = ref(false)
const recordingSeconds = ref(0)
const recordingBlob = ref<Blob | null>(null)
const previewUrl = ref<string | null>(null)
const previewPlaying = ref(false)
const sendingVoice = ref(false)
let mediaRecorder: MediaRecorder | null = null
let mediaChunks: Blob[] = []
let mediaStream: MediaStream | null = null
let recordTimer: number | null = null
let recordStartedAt = 0
let recordedDuration = 0
const voiceErrors = ref('')

async function toggleRecord() {
  if (recording.value) {
    stopRecord()
    return
  }
  if (!activeUserId.value || sendingVoice.value || previewingVoice.value) return
  voiceErrors.value = ''
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaChunks = []
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
    mediaRecorder = mime ? new MediaRecorder(mediaStream, { mimeType: mime }) : new MediaRecorder(mediaStream)
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size) mediaChunks.push(e.data)
    }
    mediaRecorder.onstop = () => {
      // do NOT auto-send — show a preview so the user can listen first
      recordedDuration = Math.max(1, Math.round((Date.now() - recordStartedAt) / 1000))
      recordingBlob.value = new Blob(mediaChunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
      if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = URL.createObjectURL(recordingBlob.value)
      previewingVoice.value = true
      previewPlaying.value = false
      mediaStream?.getTracks().forEach((t) => t.stop())
      mediaStream = null
    }
    mediaRecorder.start()
    recordStartedAt = Date.now()
    recording.value = true
    recordingSeconds.value = 0
    recordTimer = window.setInterval(() => {
      recordingSeconds.value = Math.round((Date.now() - recordStartedAt) / 1000)
    }, 1000)
  } catch {
    voiceErrors.value = 'Microphone access denied.'
  }
}

function stopRecord() {
  if (recordTimer != null) {
    window.clearInterval(recordTimer)
    recordTimer = null
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  recording.value = false
}

function togglePreviewPlay() {
  const el = document.getElementById('voice-preview') as HTMLAudioElement | null
  if (!el) return
  if (previewPlaying.value) {
    el.pause()
    previewPlaying.value = false
  } else {
    el.play().catch(() => (previewPlaying.value = false))
    previewPlaying.value = true
  }
}

function onPreviewEnded() {
  previewPlaying.value = false
}

function discardVoice() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  recordingBlob.value = null
  previewingVoice.value = false
  previewPlaying.value = false
}

async function sendVoice() {
  const blob = recordingBlob.value
  if (!blob || !activeUserId.value || sendingVoice.value) return
  sendingVoice.value = true
  voiceErrors.value = ''
  try {
    const res = await messageApi.voice({
      file: blob,
      receiver_id: activeUserId.value,
      voice_duration: recordedDuration,
      property_id: quotePropertyId.value || undefined,
      request_id: quoteRequestId.value || undefined,
    })
    messages.value.push(res.data)
    discardVoice()
    scrollToBottom()
    await loadConversations()
    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent('voice_note', 'conversion', { duration: res.data.voice_duration }),
    )
  } catch (e: any) {
    voiceErrors.value = e.response?.data?.error || 'Failed to send voice note.'
  } finally {
    sendingVoice.value = false
  }
}

function fmtRecording(sec: number) {
  const m = Math.floor(sec / 60)
  return `${m}:${(sec % 60).toString().padStart(2, '0')}`
}

// ---------- voice playback ----------

const playingId = ref<number | null>(null)

function togglePlay(m: Message) {
  if (playingId.value === m.id) {
    // stop current
    const el = document.getElementById(`voice-${m.id}`) as HTMLAudioElement | null
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    playingId.value = null
    return
  }
  // pause any other
  if (playingId.value != null) {
    const prev = document.getElementById(`voice-${playingId.value}`) as HTMLAudioElement | null
    if (prev) {
      prev.pause()
      prev.currentTime = 0
    }
  }
  playingId.value = m.id
  const el = document.getElementById(`voice-${m.id}`) as HTMLAudioElement | null
  if (el) el.play().catch(() => (playingId.value = null))
}

function onVoiceEnded(id: number) {
  if (playingId.value === id) playingId.value = null
}

function voiceDuration(m: Message) {
  return m.voice_duration ? fmtRecording(m.voice_duration) : '0:01'
}

function initialsOf(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function openConvo(c: Conversation) {
  quotePropertyId.value = null
  quoteRequestId.value = null
  router.replace({ query: { user: c.user.id } })
  openThread(c.user.id)
}

const stopFns: (() => void)[] = []

// --- init from query params ---
onMounted(async () => {
  const q = route.query
  if (q.property) quotePropertyId.value = Number(q.property)
  if (q.request) quoteRequestId.value = Number(q.request)
  if (q.user) activeUserId.value = Number(q.user)

  await loadConversations()

  const uid = activeUserId.value
  if (uid) {
    await openThread(uid)
  } else if (quoteRequestId.value || quotePropertyId.value) {
    // opened from a context but no specific user: auto-open first matching thread
    const first = conversations.value[0]
    if (first) {
      await openThread(first.user.id)
    }
  }

  // ---- real-time SSE wiring ----
  // (the stream itself is managed globally by App.vue — we only subscribe here)

  const offMessage = onStreamEvent('message', (p: any) => {
    const m = p.message as Message
    unreadCount.value = p.unread_count ?? unreadCount.value
    // belongs to the open thread?
    const uid2 = activeUserId.value
    if (uid2 && (m.sender_id === uid2 || m.receiver_id === uid2)) {
      if (!messages.value.some((x) => x.id === m.id)) {
        messages.value.push(m)
        if (isNearBottom()) scrollToBottom()
      }
      // mark incoming as read + refresh conversation previews
      if (m.receiver_id === auth.user?.id) openThread(uid2, true)
    }
    loadConversations()
  })

  const offStatus = onStreamEvent('status', (p: any) => {
    const msg = messages.value.find((x) => x.id === p.message_id)
    if (msg) {
      msg.delivered = p.delivered
      msg.read = p.read
    }
  })

  const offPresence = onStreamEvent('presence', (p: any) => {
    if (threadUser.value && threadUser.value.id === p.user_id) {
      threadUser.value.online = p.online
      threadUser.value.last_seen = p.last_seen
    }
    const c = conversations.value.find((x) => x.user.id === p.user_id)
    if (c) {
      c.user.online = p.online
      c.user.last_seen = p.last_seen
    }
  })

  const offUnread = onStreamEvent('unread', (p: any) => {
    unreadCount.value = p.unread_count
  })

  stopFns.push(offMessage, offStatus, offPresence, offUnread)
})

onUnmounted(() => {
  stopFns.forEach((fn) => fn())
  stopFns.length = 0
  if (pollTimer != null) window.clearInterval(pollTimer)
})

watch(() => route.query, () => {
  if (route.query.user) {
    const uid = Number(route.query.user)
    if (uid !== activeUserId.value) {
      quotePropertyId.value = route.query.property ? Number(route.query.property) : null
      quoteRequestId.value = route.query.request ? Number(route.query.request) : null
      openThread(uid)
    }
  }
})

let pollTimer: number | null = null
onMounted(() => {
  // real-time updates via SSE; a slow reconcile poll is a safety net only
  pollTimer = window.setInterval(() => {
    loadConversations()
    if (activeUserId.value) openThread(activeUserId.value, true)
  }, 60000)
})
onUnmounted(() => {
  if (pollTimer != null) window.clearInterval(pollTimer)
})
</script>

<template>
  <div class="msgs container">
    <h1>Messages</h1>

    <p v-if="error" class="error-text banner">{{ error }}</p>

    <div class="layout">
      <!-- Conversation list -->
      <aside class="convos">
        <p v-if="loading" class="muted">Loading…</p>
        <p v-else-if="!conversations.length" class="muted">
          No conversations yet.
          <span v-if="quoteRequestId || quotePropertyId" class="sub-note">Messages about this item will appear here.</span>
        </p>
        <div
          v-for="c in conversations"
          :key="c.user.id"
          class="convo"
          :class="{ active: c.user.id === activeUserId }"
          @click="openConvo(c)"
        >
          <div class="avatar">{{ initialsOf(c.user.full_name || c.user.username) }}</div>
          <div class="convo-main">
            <div class="convo-top">
              <strong class="with-presence">
                {{ c.user.full_name || c.user.username }}
                <i class="presence" :class="{ on: c.user.online }" :title="c.user.online ? 'Online' : `Last seen ${lastSeenText(c.user.last_seen)}`"></i>
              </strong>
              <span class="time">{{ fmtDate(c.last_activity) }}</span>
            </div>
            <div class="convo-preview">
              <span>{{ c.last_message.voice_url ? 'Voice note' : c.last_message.body }}</span>
              <span v-if="c.unread_count" class="badge">{{ c.unread_count }}</span>
            </div>
            <div v-if="c.last_message.property || c.last_message.request" class="convo-quote">
              <span class="quote-ico">❝</span> {{ (c.last_message.property || c.last_message.request)?.title }}
            </div>
          </div>
        </div>
      </aside>

      <!-- Chat -->
      <section class="chat">
        <template v-if="threadUser">
          <header class="chat-head">
            <div class="avatar">{{ initialsOf(threadUser.full_name || threadUser.username) }}</div>
            <div class="head-info">
              <strong class="with-presence">
                {{ threadUser.full_name || threadUser.username }}
                <i class="presence" :class="{ on: threadUser.online }"></i>
              </strong>
              <span class="sub">
                @{{ threadUser.username }}
                · {{ threadUser.online ? 'Online' : `Last seen ${lastSeenText(threadUser.last_seen)}` }}
              </span>
            </div>
            <div class="head-actions">
              <!-- calls temporarily disabled
              <button class="call-btn" title="Voice call" @click="callManager.startCall(threadUser.id, 'audio')">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z"/></svg>
              </button>
              <button class="call-btn" title="Video call" @click="callManager.startCall(threadUser.id, 'video')">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              </button>
              -->
            </div>
          </header>

          <div v-if="quotePropertyId || quoteRequestId" class="context-banner">
            Regarding:
            <RouterLink v-if="quotePropertyId" :to="`/properties/${quotePropertyId}`" class="context-link">
              Property #{{ quotePropertyId }}
            </RouterLink>
            <RouterLink v-else :to="`/requests`" class="context-link">Request #{{ quoteRequestId }}</RouterLink>
          </div>

          <div ref="chatRef" class="chat-body">
            <p v-if="threadLoading" class="muted center">Loading…</p>
            <div
              v-for="m in messages"
              :key="m.id"
              class="bubble-row"
              :class="{ mine: m.sender_id === auth.user?.id }"
            >
              <div class="bubble">
                <!-- voice note -->
                <div v-if="m.voice_url" class="voice-note">
                  <button
                    class="voice-play"
                    :class="{ playing: playingId === m.id }"
                    @click="togglePlay(m)"
                    :title="playingId === m.id ? 'Stop' : 'Play'"
                  >
                    <svg v-if="playingId !== m.id" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 6h4v12H6zm8 0h4v12h-4z"/></svg>
                  </button>
                  <audio
                    :id="`voice-${m.id}`"
                    :src="m.voice_url"
                    preload="metadata"
                    @ended="onVoiceEnded(m.id)"
                  ></audio>
                  <span class="voice-dur">{{ voiceDuration(m) }}</span>
                </div>
                <p v-if="m.body">{{ m.body }}</p>
                <div v-if="m.property" class="quote-card">
                  <img v-if="m.property.dp" :src="m.property.dp" alt="" />
                  <div>
                    <strong>{{ m.property.title }}</strong>
                    <span>{{ m.property.city }}, {{ m.property.state }} · {{ m.property.property_type }}</span>
                    <RouterLink :to="`/properties/${m.property.id}`">View property</RouterLink>
                  </div>
                </div>
                <div v-if="m.request" class="quote-card">
                  <div>
                    <strong>{{ m.request.title }}</strong>
                    <span>{{ m.request.property_type }} · {{ m.request.city }}, {{ m.request.state }}</span>
                  </div>
                </div>
                <span class="time" v-if="m.sender_id === auth.user?.id">
                  {{ fmtTime(m.created_at) }}
                  <i class="receipt" :class="receipt(m).cls" :title="receipt(m).label">{{ receipt(m).icon }}</i>
                </span>
                <span class="time" v-else>{{ fmtTime(m.created_at) }}</span>
              </div>
            </div>
          </div>

          <footer class="composer">
            <!-- voice note recorder -->
            <button
              v-if="!previewingVoice"
              class="mic-btn"
              :class="{ recording }"
              :title="recording ? 'Stop recording' : 'Record voice note'"
              @click="toggleRecord"
            >
              <svg v-if="!recording" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
              <span v-else class="rec-dot"></span>
            </button>
            <span v-if="recording" class="rec-timer">● {{ fmtRecording(recordingSeconds) }}</span>
            <span v-if="sendingVoice" class="rec-timer">Sending…</span>

            <!-- voice note preview: listen first, then send or discard -->
            <template v-if="previewingVoice">
              <button class="mic-btn" :class="{ playing: previewPlaying }" title="Play / pause preview" @click="togglePreviewPlay">
                <svg v-if="!previewPlaying" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 6h4v12H6zm8 0h4v12h-4z"/></svg>
              </button>
              <audio id="voice-preview" :src="previewUrl || undefined" preload="metadata" @ended="onPreviewEnded"></audio>
              <span class="rec-timer">{{ fmtRecording(recordingSeconds || recordedDuration) }}</span>
              <button class="btn btn-primary" :disabled="sendingVoice" @click="sendVoice">
                {{ sendingVoice ? 'Sending…' : 'Send' }}
              </button>
              <button class="discard-btn" title="Discard" :disabled="sendingVoice" @click="discardVoice">×</button>
            </template>

            <template v-else>
              <textarea
                v-model="draft"
                rows="2"
                :placeholder="recording ? 'Recording…' : 'Type a message…'"
                @keydown="onKeydown"
              ></textarea>
              <button class="btn btn-primary" :disabled="sending || !draft.trim() || recording" @click="send">
                {{ sending ? 'Sending…' : 'Send' }}
              </button>
            </template>
          </footer>
          <p v-if="voiceErrors" class="voice-err">{{ voiceErrors }}</p>
        </template>

        <div v-else class="chat-empty">
          <p>Select a conversation to start messaging.</p>
          <p class="sub-note">Message property owners from any listing, or respond to requests.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.msgs {
  padding: 40px 0 70px;
}

.msgs h1 {
  font-size: 2rem;
  color: var(--color-purple-dark);
  margin-bottom: 20px;
}

.banner {
  margin-bottom: 12px;
}

.layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  height: 72vh;
  min-height: 480px;
}

.convos {
  background: var(--color-bg-soft);
  border-radius: var(--radius);
  overflow-y: auto;
  padding: 10px;
}

.muted {
  color: var(--color-muted);
  text-align: center;
  padding: 30px 10px;
  font-size: 0.92rem;
}

.sub-note {
  display: block;
  font-size: 0.82rem;
  margin-top: 6px;
}

.convo {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 4px;
}

.convo:hover {
  background: #fff;
}

.convo.active {
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--clr-blue2, var(--color-primary));
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.convo-main {
  flex: 1;
  min-width: 0;
}

.convo-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.convo-top strong {
  font-size: 0.92rem;
  color: var(--color-dark);
}

.with-presence {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.presence {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #c4c9d0;
  display: inline-block;
  flex-shrink: 0;
}

.presence.on {
  background: #2ecc71;
  box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.18);
}

.time {
  color: var(--color-muted);
  font-size: 0.75rem;
}

.convo-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.convo-preview span:first-child {
  color: var(--color-muted);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  background: var(--color-primary);
  color: #fff;
  border-radius: 20px;
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0 6px;
}

.convo-quote {
  font-size: 0.75rem;
  color: var(--color-primary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat {
  background: #fff;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border);
}

.chat-head .sub {
  display: block;
  color: var(--color-muted);
  font-size: 0.8rem;
}

.head-info {
  flex: 1;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.call-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: var(--color-bg-blue);
  color: var(--color-primary);
  transition: transform 0.15s, background 0.15s;
}

.call-btn:hover {
  transform: scale(1.08);
  background: var(--color-primary);
  color: #fff;
}

.context-banner {
  background: var(--color-bg-blue);
  color: var(--color-primary);
  font-size: 0.85rem;
  padding: 8px 18px;
  border-bottom: 1px solid var(--color-border);
}

.context-link {
  color: var(--color-primary);
  font-weight: 600;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fafbfc;
}

.center {
  align-self: center;
}

.bubble-row {
  display: flex;
}

.bubble-row.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: 75%;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 10px 14px;
}

.bubble-row.mine .bubble {
  background: var(--color-bg-blue);
  border-color: transparent;
}

.bubble p {
  margin-bottom: 6px;
  color: var(--color-dark);
  white-space: pre-wrap;
}

.bubble .time {
  display: block;
  text-align: right;
}

.receipt {
  font-style: normal;
  font-weight: 700;
  margin-left: 4px;
  color: #b8bdc4;
}

.receipt.delivered {
  color: #7f8c9b;
}

.receipt.seen {
  color: #0a84ff;
}

.quote-card {
  display: flex;
  gap: 10px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  padding: 8px 10px;
  margin-bottom: 6px;
  align-items: center;
}

.bubble-row.mine .quote-card {
  background: #fff;
}

.quote-card img {
  width: 48px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}

.quote-card div {
  display: flex;
  flex-direction: column;
}

.quote-card strong {
  font-size: 0.82rem;
  color: var(--color-dark);
}

.quote-card span {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.quote-card a {
  font-size: 0.75rem;
  color: var(--color-primary);
}

.composer {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid var(--color-border);
}

.composer textarea {
  flex: 1;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 12px;
  resize: none;
  font-family: inherit;
  font-size: 0.92rem;
}

/* voice notes */
.mic-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: var(--color-bg-blue);
  color: var(--color-primary);
  flex-shrink: 0;
  align-self: flex-end;
  transition: transform 0.15s, background 0.15s;
}

.mic-btn:hover {
  transform: scale(1.08);
}

.mic-btn.recording {
  background: #ff453a;
  color: #fff;
  animation: rec-pulse 1.2s infinite;
}

@keyframes rec-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(255, 69, 58, 0); }
}

.rec-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
}

.rec-timer {
  align-self: center;
  color: #ff453a;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
}

#voice-preview {
  display: none;
}

.mic-btn.playing {
  background: #ff453a;
  color: #fff;
}

.discard-btn {
  align-self: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: #fff;
  color: var(--color-muted);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.discard-btn:hover {
  color: #ff453a;
  border-color: #ff453a;
}

.voice-err {
  color: #ff453a;
  font-size: 0.82rem;
  padding: 4px 18px 8px;
}

.voice-note {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
}

.voice-note audio {
  display: none;
}

.voice-play {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: var(--color-primary);
  color: #fff;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.voice-play:hover {
  transform: scale(1.08);
}

.voice-play.playing {
  background: #ff453a;
}

.voice-dur {
  font-size: 0.85rem;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.chat-empty {
  display: grid;
  place-items: center;
  flex: 1;
  color: var(--color-muted);
  text-align: center;
  padding: 30px;
}

@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }
  .convos {
    max-height: 40vh;
  }
  .chat {
    height: 60vh;
  }
}
</style>
