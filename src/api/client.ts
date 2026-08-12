import axios from 'axios'
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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    if (status === 401 && localStorage.getItem('aperte_token')) {
      localStorage.removeItem('aperte_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export default api
