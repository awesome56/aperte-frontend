<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const initials = computed(() => {
  if (!auth.user?.full_name) return ''
  return auth.user.full_name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <header class="navbar">
    <div class="container nav-inner">
      <RouterLink to="/" class="brand">
        <span class="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z" fill="currentColor" />
          </svg>
        </span>
        Aperte
      </RouterLink>

      <nav class="nav-links">
        <RouterLink to="/" exact-active-class="active">Home</RouterLink>
        <RouterLink to="/#about" class="anchor">About</RouterLink>
        <RouterLink to="/listings" active-class="active">Listings</RouterLink>
        <RouterLink to="/#services" class="anchor">Services</RouterLink>
        <RouterLink to="/#testimonials" class="anchor">Reviews</RouterLink>
      </nav>

      <div class="nav-actions">
        <template v-if="!auth.isAuthenticated">
          <RouterLink to="/login" class="login-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"
              />
            </svg>
            Login/Register
          </RouterLink>
          <RouterLink to="/add-listing" class="btn btn-primary btn-sm">Add Listing</RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/dashboard" class="avatar" :title="auth.user?.full_name">
            <img v-if="auth.user?.profile_picture && auth.user.profile_picture !== 'default_profile.png'" :src="auth.user.profile_picture" alt="" />
            <span v-else>{{ initials }}</span>
          </RouterLink>
          <RouterLink to="/add-listing" class="btn btn-primary btn-sm">Add Listing</RouterLink>
          <button class="btn btn-outline btn-sm" @click="logout">Logout</button>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
  height: var(--header-height);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-purple-dark);
}

.brand-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--color-primary);
  color: #fff;
}

.nav-links {
  display: flex;
  gap: 28px;
  font-weight: 500;
}

.nav-links a {
  color: var(--color-text-2);
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a.active {
  color: var(--color-primary);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.login-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-2);
  font-weight: 500;
}

.login-link:hover {
  color: var(--color-primary);
}

.btn-sm {
  padding: 10px 18px;
  font-size: 0.9rem;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  .btn-sm {
    display: none;
  }
}
</style>
