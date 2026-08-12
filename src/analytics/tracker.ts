// Lightweight, privacy-conscious analytics tracker for Aperte.
// - Anonymous visitor id (localStorage) + per-tab session id (sessionStorage)
// - Buffers events and flushes them as a single batched, fire-and-forget POST
// - Captures page views (incl. SPA route changes), time on page, performance
//   metrics (TTFB/DOMContentLoaded/load/FCP/LCP/CLS), JS errors and events

import { getVisitorId, getSessionId } from './ids'

const VISITOR_KEY = 'aperte_visitor_id'
const SESSION_KEY = 'aperte_session_id'
const UTM_KEY = 'aperte_utm'
const BATCH_URL = '/api/v1/tracking/batch'

interface TrackEvent {
  type: string
  session_id: string
  visitor_id: string
  path: string
  title?: string
  referrer?: string
  property_id?: number | null
  time_on_page_ms?: number
  name?: string
  category?: string
  properties?: Record<string, unknown>
  screen_size?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  ttfb?: number
  dom_loaded?: number
  load_time?: number
  fcp?: number
  lcp?: number
  cls?: number
  js_errors?: number
  failed_requests?: number
}

function getUtm(): Record<string, string> {
  const raw = sessionStorage.getItem(UTM_KEY)
  if (raw) return JSON.parse(raw)
  const params = new URLSearchParams(window.location.search)
  const utm: Record<string, string> = {}
  ;(['source', 'medium', 'campaign', 'term', 'content'] as const).forEach((k) => {
    const v = params.get(`utm_${k}`)
    if (v) utm[`utm_${k}`] = v
  })
  if (Object.keys(utm).length) sessionStorage.setItem(UTM_KEY, JSON.stringify(utm))
  return utm
}

const screenSize = `${window.screen.width}x${window.screen.height}`

// ---- buffering ----

let buffer: TrackEvent[] = []
let flushTimer: number | null = null
let flushing = false

function enqueue(evt: TrackEvent) {
  if (buffer.length >= 50) flush()
  buffer.push(evt)
  if (flushTimer == null) {
    flushTimer = window.setTimeout(flush, 4000)
  }
}

function flush() {
  if (flushTimer != null) {
    window.clearTimeout(flushTimer)
    flushTimer = null
  }
  if (!buffer.length || flushing) return
  flushing = true
  const payload = JSON.stringify({ events: buffer })
  buffer = []
  const send = () => {
    // sendBeacon keeps the request alive when the page is closing
    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(BATCH_URL, new Blob([payload], { type: 'application/json' }))
      } catch {
        fetch(BATCH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
      }
    } else {
      fetch(BATCH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
    }
  }
  // let the current task finish before sending (avoids blocking interactions)
  requestAnimationFrame(() => requestAnimationFrame(send))
  window.setTimeout(() => { flushing = false }, 50)
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush()
})
window.addEventListener('pagehide', flush)
window.addEventListener('beforeunload', flush)

// ---- page views + time on page ----

let currentPath = ''
let pageStart = Date.now()
let lastReportedPath = ''

function pageview(path: string, title?: string, propertyId?: number | null) {
  const now = Date.now()
  const previous = lastReportedPath
  const timeOnPage = previous ? now - pageStart : undefined
  pageStart = now
  lastReportedPath = path
  currentPath = path
  enqueue({
    type: 'pageview',
    session_id: getSessionId(),
    visitor_id: getVisitorId(),
    path,
    title: title || document.title,
    referrer: previous ? undefined : document.referrer || undefined,
    property_id: propertyId ?? null,
    time_on_page_ms: timeOnPage,
    screen_size: screenSize,
    ...getUtm(),
  })
  // capture performance once per full page load, attached to the landing view
  if (!performanceCaptured) capturePerformance(path)
  return () => {
    const elapsed = Date.now() - pageStart
    if (elapsed >= 2000) enqueue({ type: 'pageview', session_id: getSessionId(), visitor_id: getVisitorId(), path, time_on_page_ms: elapsed })
  }
}

// ---- events ----

function trackEvent(name: string, category = 'event', properties?: Record<string, unknown>) {
  enqueue({
    type: 'event',
    session_id: getSessionId(),
    visitor_id: getVisitorId(),
    path: currentPath,
    name,
    category,
    properties,
    screen_size: screenSize,
    ...getUtm(),
  })
}

function trackError(name: string) {
  enqueue({
    type: 'error',
    session_id: getSessionId(),
    visitor_id: getVisitorId(),
    path: currentPath,
    name: name.slice(0, 300),
    js_errors: 1,
  })
}

// ---- performance metrics ----

let performanceCaptured = false

function capturePerformance(path: string) {
  if (!('performance' in window)) return
  performanceCaptured = true

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const base: TrackEvent = {
    type: 'performance',
    session_id: getSessionId(),
    visitor_id: getVisitorId(),
    path,
    screen_size: screenSize,
    ...getUtm(),
  }
  let jsErrors = 0
  let failedRequests = 0

  if (nav) {
    base.ttfb = Math.round(nav.responseStart - nav.requestStart)
    base.dom_loaded = Math.round(nav.domContentLoadedEventEnd - nav.fetchStart)
    base.load_time = Math.round(nav.loadEventEnd - nav.fetchStart)
  }

  let fcp = 0
  let lcp = 0
  let cls = 0

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          fcp = Math.round(entry.startTime)
        }
      }
      report()
    }).observe({ type: 'paint', buffered: true })

    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) lcp = Math.round(last.startTime)
      report()
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) cls += (entry as any).value || 0
      }
      report()
    }).observe({ type: 'layout-shift', buffered: true })
  } catch {
    // PerformanceObserver unsupported; navigation timing still captured below
  }

  function report() {
    const evt: TrackEvent = { ...base }
    if (fcp) evt.fcp = fcp
    if (lcp) evt.lcp = lcp
    if (cls) evt.cls = Math.round(cls * 1000) / 1000
    evt.js_errors = jsErrors
    evt.failed_requests = failedRequests
    enqueue(evt)
  }

  // report with what we have shortly after load
  window.setTimeout(report, 3000)

  // JS errors + failed network requests
  window.addEventListener('error', (e) => {
    jsErrors += 1
    if (e.message && (e.message.includes('Script error') === false)) {
      trackError(e.message)
    }
  })
  window.addEventListener('unhandledrejection', (e) => {
    jsErrors += 1
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason || 'unhandledrejection')
    trackError(reason)
  })
  window.addEventListener('error', (e) => {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      failedRequests += 1
    }
  }, true)
}

// ---- error events (after full load) ----

export const tracker = {
  pageview,
  trackEvent,
  trackError,
  flush,
}

export default tracker
