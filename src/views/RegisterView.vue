<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = ref({
  full_name: '',
  username: '',
  email: '',
  password: '',
  phone_number: '',
})
const error = ref('')
const msg = ref('')
const loading = ref(false)

const passwordRule = 'Password must contain a capital letter, a symbol, a number and be more than 5 characters.'

async function submit() {
  error.value = ''
  msg.value = ''
  loading.value = true
  try {
    const payload: Record<string, unknown> = {
      full_name: form.value.full_name,
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
    }
    if (form.value.phone_number) payload.phone_number = Number(form.value.phone_number)
    const res = await auth.register(payload)
    msg.value = res.data?.msg || 'Registered! Check your email for a verification code.'
  } catch (e: any) {
    error.value = e.response?.data?.error || e.response?.data?.msg || 'Registration failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth">
    <div class="card">
      <h1>Create an account</h1>
      <p class="sub">Start listing and discovering properties today.</p>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="form.full_name" type="text" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input v-model="form.username" type="text" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Phone (optional)</label>
          <input v-model="form.phone_number" type="tel" class="form-control" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" class="form-control" required />
          <small class="hint">{{ passwordRule }}</small>
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>
        <p v-if="msg" class="success-text">{{ msg }}</p>

        <button class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? 'Registering…' : 'Register' }}
        </button>
      </form>

      <p class="switch">
        Already have an account?
        <RouterLink to="/login">Login</RouterLink>
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

.hint {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.switch {
  margin-top: 20px;
  text-align: center;
  color: var(--color-muted);
  font-size: 0.95rem;
}
</style>
