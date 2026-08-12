import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getVisitorId, getSessionId } from '@/analytics/ids'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aperte_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // anonymous analytics identifiers so server-side tracking (e.g. property
  // views) can attribute sessions/visitors
  config.headers['X-Visitor-Id'] = getVisitorId()
  config.headers['X-Session-Id'] = getSessionId()
  if (window.screen) {
    config.headers['X-Screen-Size'] = `${window.screen.width}x${window.screen.height}`
  }
  return config
})

// ---- automatic token refresh ----
// On a 401 the refresh token (if present) is exchanged for a new access
// token (single-flight: concurrent 401s share one refresh) and the failed
// request is retried once. If refresh fails, the session is cleared.

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let refreshing: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refresh = localStorage.getItem('aperte_refresh')
  if (!refresh) throw new Error('no refresh token')
  const res = await axios.get(`${baseURL}/auth/token/refresh`, {
    headers: { Authorization: `Bearer ${refresh}` },
  })
  return res.data.access as string
}

function clearSession() {
  localStorage.removeItem('aperte_token')
  localStorage.removeItem('aperte_refresh')
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const status = err.response?.status
    const original = err.config as RetriableConfig | undefined

    if (status === 401 && original && !original._retried && localStorage.getItem('aperte_refresh')) {
      original._retried = true
      try {
        if (!refreshing) {
          refreshing = refreshAccessToken()
            .then((access) => {
              localStorage.setItem('aperte_token', access)
              window.dispatchEvent(new CustomEvent('aperte-token-refreshed', { detail: access }))
              return access
            })
            .finally(() => {
              refreshing = null
            })
        }
        const newToken = await refreshing
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        clearSession()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(err)
      }
    }

    if (status === 401 && localStorage.getItem('aperte_token')) {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export default api
