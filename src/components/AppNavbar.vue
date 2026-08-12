<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { unreadCount, on as onStreamEvent } from '@/messaging/stream'

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

// instant badge updates from the SSE stream while it is connected
const offUnread = onStreamEvent('unread', (p: any) => {
  unread.value = p.unread_count
})
watch(unreadCount, (v) => {
  unread.value = v
})

let unreadTimer: number | null = null
onMounted(() => {
  refreshUnread()
  unreadTimer = window.setInterval(refreshUnread, 30000)
})
onUnmounted(() => {
  if (unreadTimer != null) window.clearInterval(unreadTimer)
  offUnread()
})

const initials = computed(() => {
  if (!auth.user?.full_name) return ''
  return auth.user.full_name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase()
})

const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function logout() {
  menuOpen.value = false
  auth.logout()
  router.push('/')
}

// close the mobile menu on navigation
watch(() => router.currentRoute.value.fullPath, closeMenu)
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

        <!-- Hamburger (mobile only) -->
        <button class="hamburger" :class="{ open: menuOpen }" aria-label="Menu" @click="toggleMenu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Teleport to="body">
      <div v-if="menuOpen" class="mobile-menu-backdrop" @click="closeMenu"></div>
      <div v-if="menuOpen" class="mobile-menu">
        <RouterLink to="/" @click="closeMenu">Home</RouterLink>
        <a href="/#about" @click="closeMenu">About</a>
        <RouterLink to="/listings" @click="closeMenu">Listings</RouterLink>
        <RouterLink to="/browse-requests" @click="closeMenu">Requests</RouterLink>
        <a href="/#services" @click="closeMenu">Services</a>
        <a href="/listings" @click="closeMenu">Blogs</a>

        <template v-if="auth.isAuthenticated">
          <div class="menu-sep"></div>
          <RouterLink to="/dashboard" @click="closeMenu">Dashboard</RouterLink>
          <RouterLink to="/messages" @click="closeMenu">
            Messages
            <span v-if="unread" class="unread-dot">{{ unread > 99 ? '99+' : unread }}</span>
          </RouterLink>
          <RouterLink to="/create-request" @click="closeMenu">Post a Request</RouterLink>
          <RouterLink to="/favorites" @click="closeMenu">Favorites</RouterLink>
          <RouterLink v-if="auth.isStaff" to="/admin" @click="closeMenu">Admin</RouterLink>
        </template>
        <template v-else>
          <div class="menu-sep"></div>
          <RouterLink to="/login" @click="closeMenu">Login / Register</RouterLink>
        </template>
      </div>
    </Teleport>
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

/* Hamburger (visible on mobile only) */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 8px;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background: var(--clr-dark, #1c1c1c);
  border-radius: 2px;
  transition: transform 0.2s, opacity 0.2s;
}

.hamburger.open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.hamburger.open span:nth-child(2) {
  opacity: 0;
}

.hamburger.open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }
}

/* Mobile dropdown menu */
.mobile-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(10, 12, 20, 0.4);
}

.mobile-menu {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  z-index: 901;
  background: #fff;
  border-bottom: 1px solid #eee;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  padding: 10px 20px 16px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
}

.mobile-menu a {
  padding: 13px 4px;
  font-size: 1rem;
  font-weight: 500;
  color: var(--clr-dark, #1c1c1c);
  border-bottom: 1px solid #f2f2f4;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-menu a:hover,
.mobile-menu a.router-link-active {
  color: var(--clr-blue, #0a84ff);
}

.mobile-menu .menu-sep {
  height: 1px;
  background: #e5e5e7;
  margin: 8px 0;
}

@media (min-width: 769px) {
  .mobile-menu,
  .mobile-menu-backdrop {
    display: none;
  }
}
</style>
