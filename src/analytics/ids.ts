// Anonymous, first-party analytics identifiers (no cookies, no PII).
// Visitor id persists across sessions (localStorage); session id is per tab (sessionStorage).

const VISITOR_KEY = 'aperte_visitor_id'
const SESSION_KEY = 'aperte_session_id'

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(VISITOR_KEY, id)
  }
  return id
}

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}
