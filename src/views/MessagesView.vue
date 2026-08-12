<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { messageApi, type Conversation, type Message } from '@/api'
import { useAuthStore } from '@/stores/auth'

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

async function openThread(userId: number) {
  activeUserId.value = userId
  threadLoading.value = true
  messages.value = []
  try {
    const res = await messageApi.thread(userId)
    threadUser.value = res.data.user
    messages.value = res.data.messages
    scrollToBottom()
    await loadConversations()
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

function initialsOf(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function openConvo(c: Conversation) {
  quotePropertyId.value = null
  quoteRequestId.value = null
  router.replace({ query: { user: c.user.id } })
  openThread(c.user.id)
}

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
  pollTimer = window.setInterval(() => {
    loadConversations()
    if (activeUserId.value) openThread(activeUserId.value)
  }, 10000)
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
              <span>{{ c.last_message.body }}</span>
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
            <div>
              <strong class="with-presence">
                {{ threadUser.full_name || threadUser.username }}
                <i class="presence" :class="{ on: threadUser.online }"></i>
              </strong>
              <span class="sub">
                @{{ threadUser.username }}
                · {{ threadUser.online ? 'Online' : `Last seen ${lastSeenText(threadUser.last_seen)}` }}
              </span>
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
                <p>{{ m.body }}</p>
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
            <textarea
              v-model="draft"
              rows="2"
              placeholder="Type a message…"
              @keydown="onKeydown"
            ></textarea>
            <button class="btn btn-primary" :disabled="sending || !draft.trim()" @click="send">
              {{ sending ? 'Sending…' : 'Send' }}
            </button>
          </footer>
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
