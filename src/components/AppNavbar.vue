<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { unreadCount, on as onStreamEvent } from '@/messaging/stream'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const searchQuery = ref('')

function goSearch() {
  const q = searchQuery.value.trim()
  router.push(q ? { path: '/listings', query: { search: q } } : '/listings')
}

// vue-router 5 no longer compares query params when deciding link "active"
// state, so all /listings?… links would light up together. Compute it here:
// active when the path matches AND every query param of the target is present.
function isActive(to: string): boolean {
  const [path, qs] = to.split('?')
  if (route.path !== path) return false
  if (!qs) return true
  const q = new URLSearchParams(qs)
  for (const [k, v] of q.entries()) {
    if (route.query[k] !== v) return false
  }
  return true
}

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
const accountOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) accountOpen.value = false
}

function toggleAccount() {
  accountOpen.value = !accountOpen.value
  if (accountOpen.value) menuOpen.value = false
}

function closeMenu() {
  menuOpen.value = false
}

function closeAccount() {
  accountOpen.value = false
}

function goDashboard() {
  accountOpen.value = false
  router.push('/dashboard')
}

function goCreateRequest() {
  accountOpen.value = false
  router.push('/create-request')
}

function goFavorites() {
  accountOpen.value = false
  router.push('/favorites')
}

function logout() {
  menuOpen.value = false
  accountOpen.value = false
  auth.logout()
  router.push('/')
}

// close menus on navigation
watch(() => router.currentRoute.value.fullPath, () => {
  closeMenu()
  closeAccount()
})
</script>

<template>
  <!-- Top utility bar -->
  <div class="topbar">
    <div class="container topbar-inner">
      <span class="tb-left">Lagos, Nigeria</span>
      <div class="tb-right">
        <span>Mon – Sat: 9:00 AM – 6:00 PM</span>
        <span class="dot">·</span>
        <span>oluwaseunawe@awesometech.com.ng</span>
      </div>
    </div>
  </div>

  <!-- Main header -->
  <header class="navbar">
    <div class="container nav-inner">
      <nav class="nav-links">
        <RouterLink to="/" :class="{ active: isActive('/') }">Home</RouterLink>
        <RouterLink to="/listings?purpose=sale" :class="{ active: isActive('/listings?purpose=sale') }">Buy</RouterLink>
        <RouterLink to="/listings?purpose=rent" :class="{ active: isActive('/listings?purpose=rent') }">Rent</RouterLink>
        <RouterLink to="/listings?category=shortlet" :class="{ active: isActive('/listings?category=shortlet') }">Shortlets</RouterLink>
        <RouterLink to="/listings?category=hotel" :class="{ active: isActive('/listings?category=hotel') }">Hotels</RouterLink>
        <RouterLink to="/listings?category=land" :class="{ active: isActive('/listings?category=land') }">Land</RouterLink>
        <RouterLink to="/listings?category=event_center" :class="{ active: isActive('/listings?category=event_center') }">Venues</RouterLink>
        <RouterLink to="/browse-requests" :class="{ active: isActive('/browse-requests') }">Property Requests</RouterLink>
      </nav>

      <RouterLink to="/" class="brand">Aperte</RouterLink>

      <div class="nav-end">
        <form v-if="route.path !== '/listings'" class="nav-search" @submit.prevent="goSearch">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="ns-icon"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input v-model="searchQuery" type="text" placeholder="Search properties…" class="ns-input" aria-label="Search properties" />
        </form>
        <template v-if="!auth.isAuthenticated">
          <RouterLink to="/login" class="login-link">Login/Register</RouterLink>
          <RouterLink to="/add-listing" class="btn btn-primary">Add Listing</RouterLink>
        </template>
        <template v-else>
          <!-- Notifications icon with unread badge -->
          <RouterLink to="/messages" class="icon-link msg-icon" :title="'Notifications'">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
            <span v-if="unread" class="unread-dot">{{ unread > 99 ? '99+' : unread }}</span>
          </RouterLink>

          <!-- Avatar with dropdown -->
          <div class="account">
            <button class="avatar" :class="{ open: accountOpen }" :aria-expanded="accountOpen" :aria-label="`Account menu for ${auth.user?.full_name || auth.user?.username}`" @click="toggleAccount">
              {{ initials }}
            </button>
            <div v-if="accountOpen" class="account-menu" role="menu">
              <div class="account-user">
                <strong>{{ auth.user?.full_name || auth.user?.username }}</strong>
                <span>@{{ auth.user?.username }}</span>
              </div>
              <button class="account-item" role="menuitem" @click="goDashboard">Dashboard</button>
              <button class="account-item" role="menuitem" @click="goCreateRequest">Create Request</button>
              <button class="account-item" role="menuitem" @click="goFavorites">Favorites</button>
              <div class="account-sep"></div>
              <button class="account-item logout" role="menuitem" @click="logout">Logout</button>
            </div>
          </div>

          <RouterLink to="/add-listing" class="btn btn-primary">Add Listing</RouterLink>
        </template>

        <!-- Hamburger (mobile only) -->
        <button class="hamburger" :class="{ open: menuOpen }" aria-label="Menu" @click="toggleMenu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>

    <!-- Mobile: full-width search + scrollable category chips (Jumia-style) -->
    <div class="m-search-row">
      <form v-if="route.path !== '/listings'" class="m-search" @submit.prevent="goSearch">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input v-model="searchQuery" type="text" placeholder="Search properties, areas, cities…" aria-label="Search properties" />
      </form>
      <span v-else class="m-search m-search-ghost" @click="router.push('/listings')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        Search properties, areas, cities…
      </span>
    </div>
    <nav class="m-cats" aria-label="Categories">
      <RouterLink to="/listings?purpose=sale" :class="{ active: isActive('/listings?purpose=sale') }">Buy</RouterLink>
      <RouterLink to="/listings?purpose=rent" :class="{ active: isActive('/listings?purpose=rent') }">Rent</RouterLink>
      <RouterLink to="/listings?category=shortlet" :class="{ active: isActive('/listings?category=shortlet') }">Shortlets</RouterLink>
      <RouterLink to="/listings?category=hotel" :class="{ active: isActive('/listings?category=hotel') }">Hotels</RouterLink>
      <RouterLink to="/listings?category=land" :class="{ active: isActive('/listings?category=land') }">Land</RouterLink>
      <RouterLink to="/listings?category=event_center" :class="{ active: isActive('/listings?category=event_center') }">Venues</RouterLink>
      <RouterLink to="/browse-requests" :class="{ active: isActive('/browse-requests') }">Requests</RouterLink>
    </nav>
  </header>

    <!-- Mobile menu (drawer) -->
    <Teleport to="body">
      <div v-if="menuOpen" class="mobile-menu-backdrop" @click="closeMenu"></div>
      <div v-if="menuOpen" class="mobile-menu">
        <template v-if="auth.isAuthenticated">
          <div class="menu-user">
            <div class="avatar">{{ initials }}</div>
            <div>
              <strong>{{ auth.user?.full_name || auth.user?.username }}</strong>
              <span>@{{ auth.user?.username }}</span>
            </div>
          </div>
          <div class="menu-sep"></div>
          <RouterLink to="/dashboard" @click="closeMenu">Dashboard</RouterLink>
          <RouterLink to="/messages" @click="closeMenu">
            Messages
            <span v-if="unread" class="unread-dot">{{ unread > 99 ? '99+' : unread }}</span>
          </RouterLink>
          <RouterLink to="/create-request" @click="closeMenu">Post a Request</RouterLink>
          <RouterLink to="/favorites" @click="closeMenu">Favorites</RouterLink>
        </template>

        <div class="menu-sep"></div>
        <RouterLink to="/" @click="closeMenu">Home</RouterLink>
        <RouterLink to="/listings?purpose=sale" @click="closeMenu">Buy</RouterLink>
        <RouterLink to="/listings?purpose=rent" @click="closeMenu">Rent</RouterLink>
        <RouterLink to="/listings?category=shortlet" @click="closeMenu">Shortlets</RouterLink>
        <RouterLink to="/listings?category=hotel" @click="closeMenu">Hotels</RouterLink>
        <RouterLink to="/listings?category=land" @click="closeMenu">Land</RouterLink>
        <RouterLink to="/listings?category=event_center" @click="closeMenu">Venues</RouterLink>
        <RouterLink to="/browse-requests" @click="closeMenu">Property Requests</RouterLink>

        <template v-if="!auth.isAuthenticated">
          <div class="menu-sep"></div>
          <RouterLink to="/login" @click="closeMenu">Login</RouterLink>
          <RouterLink to="/register" @click="closeMenu">Register</RouterLink>
          <RouterLink to="/add-listing" @click="closeMenu">Add Listing</RouterLink>
        </template>
        <template v-if="auth.isAuthenticated">
          <div class="menu-sep"></div>
          <button class="menu-logout" @click="logout">Logout</button>
        </template>
      </div>
    </Teleport>
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

.nav-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f2f4f8;
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 999px;
  padding: 7px 14px;
  transition: border-color 0.15s, background 0.15s;
}

.nav-search:focus-within {
  background: #fff;
  border-color: var(--color-primary, #0a84ff);
}

.ns-icon { color: var(--color-muted, #888); flex-shrink: 0; }

.nav-search input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9rem;
  width: 150px;
  min-width: 0;
  transition: width 0.2s;
}

.nav-search input:focus { width: 190px; }
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

.avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--clr-blue2); color:#fff; display:grid; place-items:center; font-weight:600; font-size:.85rem; cursor: pointer; border: 2px solid transparent; }
.avatar.open { border-color: var(--clr-blue2, #0a84ff); box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.15); }

/* messages icon link */
.icon-link {
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--clr-dark, #1c1c1c);
}

.icon-link:hover {
  background: #f0f2f6;
  color: var(--clr-blue, #0a84ff);
}

/* avatar dropdown */
.account {
  position: relative;
}

.account-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 300;
  min-width: 210px;
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(16, 30, 60, 0.14);
  padding: 8px;
  animation: drop-in 0.15s ease;
}

@keyframes drop-in {
  from { transform: translateY(-6px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.account-user {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  border-bottom: 1px solid #f0f1f3;
  margin-bottom: 6px;
}

.account-user strong {
  color: var(--clr-dark, #1c1c1c);
  font-size: 0.92rem;
}

.account-user span {
  color: var(--clr-muted, #888);
  font-size: 0.78rem;
}

.account-item {
  display: block;
  width: 100%;
  border: none;
  background: none;
  text-align: left;
  padding: 11px 12px;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--clr-dark, #333);
  cursor: pointer;
}

.account-item:hover {
  background: #f0f4ff;
  color: var(--clr-blue, #0a84ff);
}

.account-item.logout {
  color: #d0342c;
}

.account-item.logout:hover {
  background: #ffeceb;
  color: #d0342c;
}

.account-sep {
  height: 1px;
  background: #f0f1f3;
  margin: 6px 0;
}
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

@media (max-width: 1024px) {
  .nav-search { display: none; }
}

/* Mobile: single compact row — avatar + primary actions only */
@media (max-width: 768px) {
  .topbar { display: none; }
  .navbar { height: auto; }
  .nav-links { display: none; }
  .nav-end { gap: 10px; }
  .login-link { display: none; }
  .avatar { width: 34px; height: 34px; }
  .nav-end .btn { padding: 9px 14px; font-size: 0.88rem; }
  .logout-btn { font-size: 0.85rem; }
}

/* Jumia-style sticky mobile header: brand row + full-width search + chips */
.m-search-row,
.m-cats {
  display: none;
}

@media (max-width: 768px) {
  .navbar {
    position: sticky;
    top: 0;
    z-index: 900;
    background: #fff;
    border-bottom: 1px solid #eef0f3;
  }
  .nav-inner {
    padding-top: 10px;
    padding-bottom: 0;
  }
  .m-search-row {
    display: block;
    padding: 10px 16px 0;
  }
  .m-search {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f2f4f8;
    border: 1.5px solid #e5e8ee;
    border-radius: 999px;
    padding: 9px 14px;
    color: var(--color-muted, #888);
    font-size: 0.9rem;
  }
  .m-search:focus-within {
    background: #fff;
    border-color: var(--color-primary, #0a84ff);
  }
  .m-search input {
    border: none;
    outline: none;
    background: transparent;
    flex: 1;
    min-width: 0;
    font-size: 0.9rem;
  }
  .m-search-ghost {
    cursor: pointer;
  }
  .m-cats {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 10px 16px 12px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }  .m-cats::-webkit-scrollbar { display: none; }
  .m-cats a {
    flex-shrink: 0;
    padding: 7px 14px;
    border-radius: 999px;
    border: 1.5px solid #e5e8ee;
    background: #fff;
    color: var(--clr-dark, #333);
    font-size: 0.85rem;
    font-weight: 500;
    white-space: nowrap;
  }
  .m-cats a.active {
    background: var(--color-primary, #0a84ff);
    border-color: var(--color-primary, #0a84ff);
    color: #fff;
  }
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

.menu-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 4px 10px;
}

.menu-user strong {
  display: block;
  color: var(--clr-dark, #1c1c1c);
}

.menu-user span {
  color: var(--clr-muted, #888);
  font-size: 0.82rem;
}

.menu-logout {
  width: 100%;
  border: none;
  background: none;
  text-align: left;
  padding: 13px 4px;
  font-size: 1rem;
  font-weight: 500;
  color: #d0342c;
  cursor: pointer;
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
