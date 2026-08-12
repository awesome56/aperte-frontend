<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const unread = ref(0)

async function refreshUnread() {
  if (!auth.isAuthenticated) return
  try {
    const { authApi } = await import('@/api')
    const res = await authApi.heartbeat()
    unread.value = res.data.unread_count
  } catch {
    // ignore
  }
}

let unreadTimer: number | null = null
onMounted(() => {
  refreshUnread()
  unreadTimer = window.setInterval(refreshUnread, 30000)
})
onUnmounted(() => {
  if (unreadTimer != null) window.clearInterval(unreadTimer)
})

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
        <RouterLink to="/browse-requests" active-class="active">Requests</RouterLink>
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
          <RouterLink v-if="auth.isStaff" to="/admin" class="login-link">Admin</RouterLink>
          <RouterLink to="/messages" class="login-link msg-link">
            Messages
            <span v-if="unread" class="unread-dot">{{ unread > 99 ? '99+' : unread }}</span>
          </RouterLink>
          <RouterLink to="/favorites" class="login-link">Favorites</RouterLink>
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
.tb-left, .tb-right { color: #fff; font-size: 0.82rem; white-space: nowrap; }
.tb-right { display: flex; gap: 8px; align-items: center; }
.dot { opacity: 0.5; }

.navbar {
  position: sticky; top: 0; z-index: 100;
  background: var(--clr-white); border-bottom: 1px solid #eee;
  height: 80px;
  display: flex;
  align-items: center;
}
.nav-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 20px; width: 100%;
}
.nav-links {
  display: flex; align-items: center; gap: 26px;
  white-space: nowrap; flex-shrink: 0;
}
.nav-links a { font-size: 1rem; font-weight: 500; color: var(--clr-dark); transition: color 0.15s; }
.nav-links a:hover, .nav-links a.active { color: var(--clr-blue); }

.brand { font-size: 1.25rem; font-weight: 600; color: var(--clr-black); white-space: nowrap; }

.nav-end { display: flex; align-items: center; gap: 14px; white-space: nowrap; flex-shrink: 0; }
.login-link { font-size: 1rem; font-weight: 500; color: var(--clr-dark); position: relative; }
.login-link:hover { color: var(--clr-blue); }

.msg-link { display: inline-flex; align-items: center; gap: 6px; }
.unread-dot {
  background: #ff4757;
  color: #fff;
  border-radius: 20px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 700;
}

.avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--clr-blue2); color:#fff; display:grid; place-items:center; font-weight:600; font-size:.85rem; }
.logout-btn { background:none; border:none; font-size:.9rem; color:var(--clr-muted); cursor:pointer; }
.logout-btn:hover { color: var(--clr-red); }

/* Between 769px and 1100px the header gets tight: shrink spacing instead of wrapping */
@media (max-width: 1100px) {
  .nav-links { gap: 16px; }
  .nav-links a { font-size: 0.92rem; }
  .nav-end { gap: 10px; }
  .login-link { font-size: 0.92rem; }
}

@media (max-width: 900px) {
  .nav-links a:not(.active) { display: none; }
  .nav-links { gap: 10px; }
}

/* Mobile: single compact row — avatar + primary actions only */
@media (max-width: 768px) {
  .topbar { display: none; }
  .navbar { height: 64px; }
  .nav-links { display: none; }
  .nav-end { gap: 10px; }
  .login-link { display: none; }
  .avatar { width: 34px; height: 34px; }
  .nav-end .btn { padding: 9px 14px; font-size: 0.88rem; }
  .logout-btn { font-size: 0.85rem; }
}
</style>
