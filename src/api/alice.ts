const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

export interface AliceEvent {
  type: 'session_start' | 'content' | 'tool_start' | 'tool_end' | 'request_permission' | 'action' | 'done' | 'error'
  session_id?: string
  content?: string
  name?: string
  args?: Record<string, unknown>
  result?: string
  error?: string
  request_id?: string
}

export interface AliceConversation {
  session_id: string
  title: string
  messages: number
  updated_at: number
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('aperte_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function* streamChat(prompt: string, sessionId: string, opts: { incognito?: boolean; pageContext?: Record<string, unknown> } = {}): AsyncGenerator<AliceEvent> {
  const res = await fetch(`${baseURL}/alice/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      prompt,
      session_id: sessionId,
      incognito: opts.incognito || false,
      page_context: opts.pageContext || {},
    }),
  })
  if (!res.ok || !res.body) {
    let msg = 'ALICE is unavailable right now.'
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch { /* keep default */ }
    yield { type: 'error', content: msg }
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      const t = line.trim()
      if (!t) continue
      try {
        yield JSON.parse(t) as AliceEvent
      } catch { /* skip malformed line */ }
    }
  }
  if (buf.trim()) {
    try {
      yield JSON.parse(buf.trim()) as AliceEvent
    } catch { /* ignore */ }
  }
}

export async function executeConfirmed(name: string, args: Record<string, unknown>): Promise<{ success: boolean; name: string; result: unknown }> {
  const res = await fetch(`${baseURL}/alice/execute`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, args }),
  })
  return res.json()
}

export async function listConversations(): Promise<AliceConversation[]> {
  const res = await fetch(`${baseURL}/alice/conversations`, { headers: authHeaders() })
  const j = await res.json()
  return j.conversations || []
}

export async function loadConversation(sessionId: string): Promise<{ role: string; content: string }[]> {
  const res = await fetch(`${baseURL}/alice/conversations?load=${encodeURIComponent(sessionId)}`, { headers: authHeaders() })
  const j = await res.json()
  return j.messages || []
}

export async function deleteConversation(sessionId: string): Promise<void> {
  await fetch(`${baseURL}/alice/conversations/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}

export async function newSessionId(): Promise<string> {
  return 'conv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}
