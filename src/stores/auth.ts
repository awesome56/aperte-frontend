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

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('aperte_token') || '')
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password })
    if (res.data?.user?.access) {
      token.value = res.data.user.access
      localStorage.setItem('aperte_token', res.data.user.access)
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
    localStorage.removeItem('aperte_token')
  }

  return { token, user, isAuthenticated, isAdmin, login, register, fetchMe, logout }
})
