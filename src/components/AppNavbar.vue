<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const initials = computed(() => {
  if (!auth.user?.full_name) return ''
  return auth.user.full_name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase()
})

function logout() { auth.logout(); router.push('/') }
</script>

<template>
  <!-- Top utility bar -->
  <div class="topbar">
    <div class="container topbar-inner">
      <span class="tb-left">Rezilla, 18 Grattan St, Brooklyn</span>
      <div class="tb-right">
        <span>+1 206-214-2298</span>
        <span class="dot">·</span>
        <span>support@rezilla.com</span>
      </div>
    </div>
  </div>

  <!-- Main header -->
  <header class="navbar">
    <div class="container nav-inner">
      <nav class="nav-links">
        <RouterLink to="/" exact-active-class="active">Home</RouterLink>
        <a href="/#about">About</a>
        <RouterLink to="/listings" active-class="active">Listings</RouterLink>
        <a href="/#services">Services</a>
        <a href="/listings">Blogs</a>
      </nav>

      <RouterLink to="/" class="brand">Aperte</RouterLink>

      <div class="nav-end">
        <template v-if="!auth.isAuthenticated">
          <RouterLink to="/login" class="login-link">Login/Register</RouterLink>
          <RouterLink to="/add-listing" class="btn btn-primary">Add Listing</RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/dashboard" class="avatar" :title="auth.user?.full_name">{{ initials }}</RouterLink>
          <RouterLink to="/add-listing" class="btn btn-primary">Add Listing</RouterLink>
          <button class="logout-btn" @click="logout">Logout</button>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  background: var(--clr-purple-btn);
  height: 40px;
  display: flex;
  align-items: center;
}
.topbar-inner {
  display: flex; justify-content: space-between; align-items: center; width: 100%;
}
.tb-left, .tb-right { color: #fff; font-size: 0.82rem; }
.tb-right { display: flex; gap: 8px; align-items: center; }
.dot { opacity: 0.5; }

.navbar {
  position: sticky; top: 0; z-index: 100;
  background: var(--clr-white); border-bottom: 1px solid #eee;
  height: 80px;
}
.nav-inner {
  display: flex; align-items: center; justify-content: space-between;
  height: 100%; gap: 20px;
}
.nav-links { display: flex; gap: 30px; }
.nav-links a { font-size: 1rem; font-weight: 500; color: var(--clr-dark); transition: color 0.15s; }
.nav-links a:hover, .nav-links a.active { color: var(--clr-blue); }

.brand { font-size: 1.25rem; font-weight: 600; color: var(--clr-black); }

.nav-end { display: flex; align-items: center; gap: 16px; }
.login-link { font-size: 1rem; font-weight: 500; color: var(--clr-dark); }
.login-link:hover { color: var(--clr-blue); }

.avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--clr-blue2); color:#fff; display:grid; place-items:center; font-weight:600; font-size:.85rem; }
.logout-btn { background:none; border:none; font-size:.9rem; color:var(--clr-muted); cursor:pointer; }
.logout-btn:hover { color: var(--clr-red); }

@media (max-width: 768px) { .nav-links { display:none; } .login-link{display:none;} }
</style>
