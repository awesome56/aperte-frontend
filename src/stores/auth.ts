import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

interface User {
  id: number
  username: string
  email: string
  full_name: string
  profile_picture: string
  email_verified?: number
  role?: string
}

const TOKEN_KEY = 'aperte_token'
const REFRESH_KEY = 'aperte_refresh'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))
  const isAdmin = computed(() => user.value?.role === 'admin')
  // staff + admin can access the admin area
  const isStaff = computed(() => ['admin', 'staff'].includes(user.value?.role || ''))

  function setTokens(access: string, refresh?: string) {
    token.value = access
    localStorage.setItem(TOKEN_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  }

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password })
    if (res.data?.user?.access) {
      setTokens(res.data.user.access, res.data.user.refresh)
      user.value = {
        id: res.data.user.id,
        username: res.data.user.username,
        email: res.data.user.email,
        full_name: res.data.user.full_name,
        profile_picture: res.data.user.profile_picture,
        email_verified: res.data.user.email_verified,
        role: res.data.user.role,
      }
    }
    return res.data
  }

  // keep the pinia token in sync when the axios interceptor refreshes it
  if (typeof window !== 'undefined') {
    window.addEventListener('aperte-token-refreshed', ((e: CustomEvent<string>) => {
      token.value = e.detail
    }) as EventListener)
  }

  async function register(data: Record<string, unknown>) {
    return authApi.register(data)
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await authApi.me()
      user.value = res.data as unknown as User
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  }

  return { token, user, isAuthenticated, isAdmin, isStaff, login, register, fetchMe, logout, setTokens }
})
