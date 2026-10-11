<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  streamChat, executeConfirmed, listConversations, loadConversation,
  deleteConversation, newSessionId, speakText, type AliceConversation,
} from '@/api/alice'

const auth = useAuthStore()
const route = useRoute()

const open = ref(false)
const input = ref('')
const streaming = ref(false)
const sessionId = ref('')
const messages = ref<{ role: 'user' | 'alice'; content: string }[]>([])
const pendingConfirm = ref<{ request_id: string; name: string; args: Record<string, unknown> } | null>(null)
const confirmBusy = ref(false)
const convs = ref<AliceConversation[]>([])
const showConvs = ref(false)
const bodyEl = ref<HTMLElement | null>(null)
const voiceOn = ref(false)
const voiceBlocked = ref(false)
const voiceHint = ref('')
// True when the current prompt was spoken (mic) — that turn gets a voice
// reply even if the speaker toggle is off (voice in → voice out).
const voiceInitiated = ref(false)
const listening = ref(false)
let voiceAudio: HTMLAudioElement | null = null
let unlockCtx: AudioContext | null = null
let recog: unknown = null
let lastSpokeTurn = false

const micSupported =
  typeof window !== 'undefined' &&
  Boolean((window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition)

// Unlock audio on real user gestures so replies can autoplay afterwards.
function unlockAudio() {
  try {
    const AC = (window as unknown as Record<string, unknown>).AudioContext ||
               (window as unknown as Record<string, unknown>).webkitAudioContext
    if (!AC) return
    if (!unlockCtx) unlockCtx = new (AC as typeof AudioContext)()
    if (unlockCtx.state === 'suspended') void unlockCtx.resume()
  } catch { /* ignore */ }
}

function toggleMic() {
  unlockAudio()
  if (listening.value) {
    try { (recog as { stop: () => void } | null)?.stop() } catch { /* ignore */ }
    return
  }
  const SR = (window as unknown as Record<string, { new (): unknown }>).SpeechRecognition ||
             (window as unknown as Record<string, { new (): unknown }>).webkitSpeechRecognition
  if (!SR) return
  try {
    const r = new SR() as {
      lang: string; interimResults: boolean; continuous: boolean
      onresult: ((e: { results: ArrayLike<{ isFinal: boolean; [i: number]: { transcript: string } }> }) => void) | null
      onerror: (() => void) | null; onend: (() => void) | null
      start: () => void; stop: () => void
    }
    r.lang = 'en-NG'
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1]
      const text = last?.[0]?.transcript || ''
      if (text) input.value = text
      if (last?.isFinal) {
        track('alice_voice_input', 'search', { term: text.slice(0, 80) })
        voiceInitiated.value = true
        void send()
      }
    }
    r.onerror = () => { listening.value = false }
    r.onend = () => { listening.value = false }
    recog = r
    r.start()
    listening.value = true
  } catch {
    listening.value = false
  }
}

try {
  voiceOn.value = localStorage.getItem('aperte_alice_voice') === '1'
} catch { /* private mode */ }

function stopVoice() {
  try {
    voiceAudio?.pause()
  } catch { /* ignore */ }
  voiceAudio = null
}

function toggleVoice() {
  unlockAudio()
  voiceBlocked.value = false
  voiceHint.value = ''
  voiceOn.value = !voiceOn.value
  try {
    localStorage.setItem('aperte_alice_voice', voiceOn.value ? '1' : '0')
  } catch { /* ignore */ }
  if (!voiceOn.value) stopVoice()
  else {
    track('alice_voice', 'engagement', { enabled: true })
    // Instant audible proof the voice path works (also keeps audio unlocked).
    void speak("Voice on! I'll read my replies aloud from now on.")
  }
}

async function speak(text: string, force = false) {
  if ((!voiceOn.value && !force) || !text.trim()) return
  stopVoice()
  const url = await speakText(text)
  if (!url) {
    voiceHint.value = "I couldn't generate voice just now — check your connection and ask again."
    voiceBlocked.value = true
    return
  }
  voiceAudio = new Audio(url)
  try {
    await voiceAudio.play()
  } catch {
    // Autoplay blocked: show a tap-to-enable hint instead of failing silently.
    voiceHint.value = '🔇 Audio was blocked — tap here to enable my voice, then ask again.'
    voiceBlocked.value = true
  }
}

function track(name: string, category: string, props: Record<string, unknown> = {}) {
  import('@/analytics/tracker').then((m) => m.default.trackEvent(name, category, props))
}

function scrollDown() {
  nextTick(() => bodyEl.value?.scrollTo({ top: bodyEl.value.scrollHeight }))
}

// Escape HTML, then linkify full URLs and absolute app paths (/add-listing).
// Rendered with v-html so ALICE's links are tappable.
function renderMessage(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  const withUrls = esc.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener" class="alice-link">$1</a>',
  )
  return withUrls.replace(
    /(^|[\s(>])(\/[a-z][a-z0-9\-_/]*(?:\?[^\s<]*)?)/g,
    '$1<a href="$2" class="alice-link">$2</a>',
  )
}

function welcome() {
  messages.value = [
    { role: 'alice', content: "Hey, I'm ALICE — your Aperte assistant. Ask me to find a place, check bookings, or explain a listing." },
  ]
}

async function refreshConvs() {
  if (!auth.isAuthenticated) return
  try {
    convs.value = await listConversations()
  } catch { /* ignore */ }
}

function toggle() {
  open.value = !open.value
  if (!open.value) stopVoice()
  if (open.value) {
    track('alice_open', 'engagement')
    if (!sessionId.value) {
      newSessionId().then((s) => (sessionId.value = s))
      welcome()
    }
    refreshConvs()
  }
}

function newChat() {
  stopVoice()
  newSessionId().then((s) => (sessionId.value = s))
  pendingConfirm.value = null
  welcome()
  refreshConvs()
}

async function openConv(id: string) {
  sessionId.value = id
  pendingConfirm.value = null
  try {
    const loaded = await loadConversation(id)
    messages.value = loaded.map((m) => ({
      role: (m.role === 'user' ? 'user' : 'alice') as 'user' | 'alice',
      content: m.content,
    }))
    if (!messages.value.length) welcome()
  } catch {
    welcome()
  }
  showConvs.value = false
  scrollDown()
}

async function removeConv(id: string) {
  try {
    await deleteConversation(id)
  } catch { /* ignore */ }
  if (sessionId.value === id) newChat()
  else refreshConvs()
}

function describeConfirm(name: string, args: Record<string, unknown>): string {
  const id = (args.property_id ?? args.request_id ?? '') as string | number
  switch (name) {
    case 'toggle_favorite': return `Save listing${id ? ` (id ${id})` : ''} to your favorites?`
    case 'create_request': return `Post your request "${String(args.title || '').slice(0, 60)}"?`
    case 'create_booking': return `Request this booking${id ? ` (listing ${id})` : ''}?`
    case 'send_message': return 'Send this message to the owner?'
    case 'claim_property': return `Claim listing${id ? ` (id ${id})` : ''} as yours?`
    default: return `Confirm: ${name}?`
  }
}

async function send() {
  unlockAudio()
  try { (recog as { stop: () => void } | null)?.stop() } catch { /* ignore */ }
  listening.value = false
  const text = input.value.trim()
  if (!text || streaming.value) return
  if (!auth.isAuthenticated) {
    messages.value.push({ role: 'alice', content: 'Please log in first so I can help with your listings and bookings.' })
    scrollDown()
    return
  }
  input.value = ''
  // Capture + reset: only this turn speaks when voice-initiated.
  const spokeTurn = voiceInitiated.value
  voiceInitiated.value = false
  lastSpokeTurn = spokeTurn
  messages.value.push({ role: 'user', content: text })
  track('alice_message', 'search', { term: text.slice(0, 80) })
  streaming.value = true
  pendingConfirm.value = null
  let reply = ''
  const replyIdx = messages.value.push({ role: 'alice', content: '' }) - 1
  const replyMsg = () => messages.value[replyIdx]!
  scrollDown()
  try {
    for await (const ev of streamChat(text, sessionId.value, {
      pageContext: { path: route.path },
    })) {
      if (ev.type === 'content' && ev.content) {
        reply += ev.content
        replyMsg().content = reply
        scrollDown()
      } else if (ev.type === 'request_permission' && ev.name) {
        pendingConfirm.value = { request_id: ev.request_id || '', name: ev.name, args: ev.args || {} }
      } else if (ev.type === 'error' && ev.content) {
        replyMsg().content = ev.content
      }
    }
    if (!replyMsg().content && !pendingConfirm.value) {
      replyMsg().content = "I'm not able to pull that up right now. Want to try again?"
    }
  } catch {
    replyMsg().content = "Something went wrong on my end. Please try again."
  } finally {
    streaming.value = false
    refreshConvs()
    scrollDown()
    if (replyMsg().content) void speak(replyMsg().content, spokeTurn)
  }
}

async function confirmWrite(allow: boolean) {
  const p = pendingConfirm.value
  if (!p || confirmBusy.value) return
  if (!allow) {
    pendingConfirm.value = null
    messages.value.push({ role: 'alice', content: 'No worries — I left that as it was.' })
    scrollDown()
    return
  }
  confirmBusy.value = true
  try {
    const res = await executeConfirmed(p.name, p.args)
    const r = res.result as { success?: boolean; message?: string; total?: number } | undefined
    pendingConfirm.value = null
    track('alice_confirm', 'conversion', { tool: p.name })
    if (r?.success) {
      messages.value.push({ role: 'alice', content: r.message || 'Done!' })
    } else {
      messages.value.push({ role: 'alice', content: r?.message || "I couldn't complete that. Want to try differently?" })
    }
    if (voiceOn.value || lastSpokeTurn) {
      const last = messages.value[messages.value.length - 1]
      if (last) void speak(last.content, lastSpokeTurn)
    }
    lastSpokeTurn = false
  } catch {
    pendingConfirm.value = null
    messages.value.push({ role: 'alice', content: "I couldn't complete that right now. Please try again." })
  } finally {
    confirmBusy.value = false
    refreshConvs()
    scrollDown()
  }
}

onMounted(() => {
  newSessionId().then((s) => (sessionId.value = s))
  welcome()
})
</script>

<template>
  <div class="alice">
    <button v-if="!open" class="alice-launcher" aria-label="Chat with ALICE" @click="toggle">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="7" width="16" height="12" rx="3"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><path d="M12 7V4M8 4h8"/></svg>
    </button>

    <div v-if="open" class="alice-drawer" role="dialog" aria-label="ALICE chat">
      <div class="alice-head">
        <button class="alice-icon-btn" title="Conversations" @click="showConvs = !showConvs; refreshConvs()">☰</button>
        <strong class="alice-title">ALICE</strong>
        <span class="alice-sub">Aperte assistant</span>
        <span class="alice-head-right">
          <button
            class="alice-icon-btn"
            :class="{ on: voiceOn }"
            title="Voice replies on/off"
            @click="toggleVoice()"
          >{{ voiceOn ? '🔊' : '🔇' }}</button>
          <button class="alice-icon-btn" title="New chat" @click="newChat()">＋</button>
          <button class="alice-icon-btn" title="Close" @click="toggle()">✕</button>
        </span>
      </div>

      <div v-if="showConvs" class="alice-convs">
        <div v-if="!convs.length" class="alice-convs-empty">No conversations yet</div>
        <div
          v-for="c in convs"
          :key="c.session_id"
          class="alice-conv"
          :class="{ active: c.session_id === sessionId }"
          @click="openConv(c.session_id)"
        >
          <span class="alice-conv-title">{{ c.title }}</span>
          <button class="alice-conv-del" title="Delete" @click.stop="removeConv(c.session_id)">🗑</button>
        </div>
      </div>

      <div ref="bodyEl" class="alice-body">
        <div v-for="(m, i) in messages" :key="i" class="alice-msg" :class="m.role">
          <div class="alice-bubble" v-html="renderMessage(m.content)"></div>
        </div>

        <div v-if="pendingConfirm" class="alice-confirm">
          <p>{{ describeConfirm(pendingConfirm.name, pendingConfirm.args) }}</p>
          <div class="alice-confirm-btns">
            <button class="btn btn-primary btn-sm" :disabled="confirmBusy" @click="confirmWrite(true)">
              {{ confirmBusy ? 'Working…' : 'Confirm' }}
            </button>
            <button class="btn btn-outline btn-sm" :disabled="confirmBusy" @click="confirmWrite(false)">Cancel</button>
          </div>
        </div>
      </div>

      <div v-if="voiceBlocked" class="alice-voice-hint" @click="voiceBlocked = false; voiceHint = ''; unlockAudio()">
        {{ voiceHint || '🔇 Audio was blocked — tap here to enable my voice, then ask again.' }}
      </div>

      <div class="alice-foot">
        <button
          v-if="micSupported"
          class="alice-mic"
          :class="{ live: listening }"
          :title="listening ? 'Stop listening' : 'Speak to ALICE'"
          @click="toggleMic"
          aria-label="Speak to ALICE"
        >🎤</button>
        <input
          v-model="input"
          class="alice-input"
          :placeholder="listening ? 'Listening… speak now' : 'Ask ALICE anything…'"
          :disabled="streaming"
          @keyup.enter="send"
        />
        <button class="alice-send" :disabled="streaming || !input.trim()" @click="send" aria-label="Send">➤</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alice-launcher {
  position: fixed;
  bottom: 96px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  border: none;
  background: var(--color-primary, #2076ff);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 900;
  box-shadow: 0 8px 28px rgba(32, 118, 255, 0.4);
}
.alice-launcher:hover { transform: scale(1.06); }

.alice-drawer {
  position: fixed;
  bottom: 160px;
  right: 20px;
  width: min(400px, calc(100vw - 40px));
  height: min(560px, calc(100vh - 220px));
  min-height: 380px;
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(16, 30, 60, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 901;
  font-family: inherit;
}
.alice-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #eef0f3;
  background: #f7f9fc;
}
.alice-title { font-size: 1rem; }
.alice-sub { font-size: 0.75rem; color: var(--color-muted, #888); flex: 1; }
.alice-head-right { display: flex; gap: 4px; }
.alice-icon-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  color: #555;
  padding: 4px 8px;
  border-radius: 8px;
}
.alice-icon-btn:hover { background: #eef1f6; }
.alice-icon-btn.on { color: var(--color-primary, #2076ff); }

.alice-convs {
  max-height: 160px;
  overflow-y: auto;
  border-bottom: 1px solid #eef0f3;
  background: #fbfcfe;
}
.alice-convs-empty { padding: 12px; color: #999; font-size: 0.85rem; text-align: center; }
.alice-conv {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 0.85rem;
  border-bottom: 1px solid #f0f1f3;
}
.alice-conv.active { background: #eef4ff; }
.alice-conv-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.alice-conv-del { border: none; background: none; cursor: pointer; }

.alice-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.alice-msg { display: flex; }
.alice-msg.user { justify-content: flex-end; }
.alice-msg.alice { justify-content: flex-start; }
.alice-bubble {
  max-width: 85%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.alice-msg.user .alice-bubble {
  background: var(--color-primary, #2076ff);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.alice-msg.alice .alice-bubble {
  background: #f1f4f9;
  color: #222;
  border-bottom-left-radius: 4px;
}
.alice-bubble .alice-link {
  color: var(--color-primary, #2076ff);
  font-weight: 600;
  word-break: break-all;
}
.alice-msg.user .alice-bubble .alice-link { color: #fff; text-decoration: underline; }

.alice-confirm {
  border: 1.5px dashed var(--color-primary, #2076ff);
  background: #eef4ff;
  border-radius: 12px;
  padding: 12px;
  font-size: 0.88rem;
}
.alice-confirm p { margin: 0 0 10px; }
.alice-confirm-btns { display: flex; gap: 8px; }
.btn-sm { padding: 8px 16px; font-size: 0.85rem; }

.alice-voice-hint {
  margin: 0 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #fff7e6;
  border: 1px solid #f0d48a;
  color: #8a6d1a;
  font-size: 0.8rem;
  cursor: pointer;
}

.alice-foot {
  display: flex;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid #eef0f3;
  align-items: center;
}
.alice-mic {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1.5px solid #e5e8ee;
  background: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  flex-shrink: 0;
}
.alice-mic.live {
  background: #ff4757;
  border-color: #ff4757;
  animation: alice-pulse 1.2s ease infinite;
}
@keyframes alice-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
.alice-input {
  flex: 1;
  border: 1.5px solid #e5e8ee;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 0.9rem;
  outline: none;
  min-width: 0;
}
.alice-input:focus { border-color: var(--color-primary, #2076ff); }
.alice-send {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary, #2076ff);
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  flex-shrink: 0;
}
.alice-send:disabled { opacity: 0.4; cursor: default; }

@media (max-width: 768px) {
  .alice-launcher { bottom: 150px; }
  .alice-drawer {
    bottom: 210px;
    right: 12px;
    width: calc(100vw - 24px);
  }
}
</style>
