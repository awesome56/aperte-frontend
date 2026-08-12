// Server-Sent Events client for real-time messaging updates.
// Uses fetch + ReadableStream so the JWT can be sent as a header (EventSource
// cannot). Auto-reconnects with backoff. Exposes a shared unread count and a
// tiny pub/sub for events.

import { ref } from 'vue'
import { getVisitorId } from '@/analytics/ids'

const STREAM_URL = '/api/v1/messages/stream'

export const unreadCount = ref(0)

type Listener = (payload: any) => void
const listeners = new Map<string, Set<Listener>>()

export function on(event: string, fn: Listener): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(fn)
  return () => {
    listeners.get(event)?.delete(fn)
  }
}

function emit(event: string, payload: any) {
  listeners.get(event)?.forEach((fn) => {
    try {
      fn(payload)
    } catch {
      // listener errors must not kill the stream
    }
  })
}

let controller: AbortController | null = null
let reconnectTimer: number | null = null
let backoff = 2000
let stopped = false

async function connect() {
  const token = localStorage.getItem('aperte_token')
  if (!token) {
    // not logged in (or logged out) — wait and retry
    scheduleReconnect()
    return
  }

  controller = new AbortController()
  try {
    const res = await fetch(STREAM_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Visitor-Id': getVisitorId(),
      },
      signal: controller.signal,
    })
    if (!res.ok || !res.body) {
      throw new Error(`stream status ${res.status}`)
    }

    backoff = 2000
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let eventName = 'message'
    let dataLines: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let idx
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).replace(/\r$/, '')
        buffer = buffer.slice(idx + 1)

        if (line === '') {
          // dispatch the completed event
          if (dataLines.length) {
            const data = dataLines.join('\n')
            try {
              emit(eventName, JSON.parse(data))
            } catch {
              // malformed payload — ignore
            }
          }
          eventName = 'message'
          dataLines = []
        } else if (line.startsWith(':')) {
          // comment (keep-alive ping)
        } else if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart())
        }
      }
    }
  } catch {
    // aborted or network error — reconnect
  } finally {
    controller = null
  }

  if (!stopped) scheduleReconnect()
}

function scheduleReconnect() {
  if (stopped || reconnectTimer != null) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connect()
  }, backoff)
  backoff = Math.min(backoff * 1.5, 30000)
}

export function startStream() {
  stopped = false
  backoff = 2000
  connect()
}

export function stopStream() {
  stopped = true
  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (controller) controller.abort()
  controller = null
}
