<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const msg = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  msg.value = ''
  loading.value = true
  try {
    const data = await auth.login(email.value, password.value)
    if (auth.isAuthenticated) {
      import('@/analytics/tracker').then((m) => m.default.trackEvent('login', 'conversion'))
      const redirect = (route.query.redirect as string) || '/dashboard'
      router.push(redirect)
    } else {
      msg.value =
        data.msg || (data.user ? '' : 'Credentials are correct but your email is not verified.')
      if (!data.user?.access) {
        msg.value = 'Please verify your email first. Check your inbox for the 6-digit code.'
      }
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || e.response?.data?.msg || 'Invalid login credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth">
    <div class="card">
      <h1>Welcome back</h1>
      <p class="sub">Login to manage your listings and bookings.</p>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" class="form-control" required placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" class="form-control" required placeholder="••••••••" />
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>
        <p v-if="msg" class="success-text">{{ msg }}</p>

        <button class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? 'Logging in…' : 'Login' }}
        </button>
      </form>

      <p class="switch">
        Don't have an account?
        <RouterLink to="/register">Register</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
  min-height: 70vh;
  padding: 60px 20px;
}

.card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 40px;
}

.card h1 {
  font-size: 1.8rem;
  color: var(--color-purple-dark);
  margin-bottom: 6px;
}

.sub {
  color: var(--color-muted);
  margin-bottom: 28px;
}

.switch {
  margin-top: 20px;
  text-align: center;
  color: var(--color-muted);
  font-size: 0.95rem;
}
</style>
