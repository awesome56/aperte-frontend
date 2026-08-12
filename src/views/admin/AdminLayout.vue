<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_NAV } from '@/config/navigation'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const drawerOpen = ref(false)

// visible admin items (role/permission-aware)
const navItems = ADMIN_NAV.filter((item) => {
  if (item.adminOnly) return auth.isAdmin
  if (item.label === 'Roles & Permissions') return auth.isAdmin
  return true
})

function logout() {
  auth.logout()
  router.push('/')
}

watch(() => route.fullPath, () => {
  drawerOpen.value = false
})
</script>

<template>
  <div class="admin-layout">
    <!-- Desktop sidebar -->
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-mark">A</div>
        <span>Aperte Admin</span>
      </div>

      <nav class="nav">
        <p class="nav-label">Dashboards</p>
        <RouterLink to="/admin" class="nav-item" active-class="active" exact-active-class="active">
          <span class="dot" style="background:#0a84ff"></span> Overview
        </RouterLink>

        <p class="nav-label">Management</p>
        <RouterLink v-for="item in navItems.filter((i) => i.to !== '/admin')" :key="item.to" :to="item.to" class="nav-item" active-class="active">
          <span class="dot" :style="{ background: item.label === 'Analytics' ? '#ff9f0a' : item.label === 'Users' ? '#71dd8c' : item.label === 'Properties' ? '#b899eb' : item.label === 'Claims' ? '#64d2ff' : '#adadfb' }"></span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="sidebar-bottom">
        <RouterLink to="/" class="nav-item">
          <span class="dot" style="background:#adadfb"></span> View Site
        </RouterLink>
        <button class="nav-item logout" @click="logout">
          <span class="dot" style="background:#ff453a"></span> Logout
        </button>
      </div>
    </aside>

    <!-- Mobile header + drawer -->
    <div class="mobile-topbar">
      <button class="mobile-hamburger" :class="{ open: drawerOpen }" aria-label="Menu" @click="drawerOpen = !drawerOpen">
        <span></span><span></span><span></span>
      </button>
      <div class="mobile-logo"><span class="logo-mark">A</span><strong>Aperte Admin</strong></div>
      <RouterLink to="/" class="mobile-site">Site</RouterLink>
    </div>

    <Teleport to="body">
      <div v-if="drawerOpen" class="drawer-backdrop" @click="drawerOpen = false"></div>
      <div v-if="drawerOpen" class="drawer">
        <nav class="drawer-nav">
          <RouterLink to="/admin" class="drawer-item" exact-active-class="active" @click="drawerOpen = false">Overview</RouterLink>
          <RouterLink
            v-for="item in navItems.filter((i) => i.to !== '/admin')"
            :key="item.to"
            :to="item.to"
            class="drawer-item"
            active-class="active"
            @click="drawerOpen = false"
          >{{ item.label }}</RouterLink>
          <RouterLink to="/" class="drawer-item" @click="drawerOpen = false">View Site</RouterLink>
          <button class="drawer-item logout" @click="logout">Logout</button>
        </nav>
      </div>
    </Teleport>

    <!-- Main -->
    <div class="main">
      <!-- Header -->
      <header class="header">
        <div class="breadcrumb">
          <span>Dashboards</span>
          <span class="sep">/</span>
          <span class="current">Admin</span>
        </div>
        <div class="header-right">
          <div class="avatar" :title="auth.user?.full_name">{{ auth.user?.full_name?.[0]?.toUpperCase() }}</div>
        </div>
      </header>

      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #fff;
  color: #1c1c1c;
}

/* Sidebar */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 212px;
  flex-shrink: 0;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  padding: 24px 14px;
  background: #fff;
  z-index: 100;
  overflow-y: auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  margin-bottom: 30px;
  font-weight: 600;
  font-size: 1rem;
}

.logo-mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #0a84ff;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.nav {
  flex: 1;
}

.nav-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #9aa0a6;
  padding: 14px 10px 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: #444;
  font-size: 0.92rem;
  margin-bottom: 2px;
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
}

.nav-item:hover {
  background: #f5f5f7;
}

.nav-item.active {
  background: #eef4ff;
  color: #0a84ff;
  font-weight: 500;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.logout {
  color: #d0342c;
}

/* Main */
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin-left: 212px;
}

.header {
  height: 68px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
}

.breadcrumb {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.9rem;
  color: #9aa0a6;
}

.breadcrumb .current {
  color: #1c1c1c;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #0a84ff;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
}

.content {
  padding: 28px;
}

/* Mobile header + drawer */
.mobile-topbar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 200;
}

.mobile-hamburger {
  display: flex;
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

.mobile-hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background: #1c1c1c;
  border-radius: 2px;
  transition: transform 0.2s, opacity 0.2s;
}

.mobile-hamburger.open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.mobile-hamburger.open span:nth-child(2) {
  opacity: 0;
}

.mobile-hamburger.open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.mobile-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.mobile-site {
  color: #0a84ff;
  font-size: 0.9rem;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(10, 12, 20, 0.4);
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 260px;
  z-index: 901;
  background: #fff;
  box-shadow: 8px 0 30px rgba(0, 0, 0, 0.15);
  padding: 20px 12px;
  overflow-y: auto;
}

.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-item {
  display: block;
  width: 100%;
  padding: 14px 12px;
  border-radius: 8px;
  color: #444;
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.drawer-item:hover {
  background: #f5f5f7;
}

.drawer-item.active {
  background: #eef4ff;
  color: #0a84ff;
}

.drawer-item.logout {
  color: #d0342c;
}

@media (max-width: 900px) {
  .sidebar {
    display: none;
  }
  .main {
    margin-left: 0;
  }
  .mobile-topbar {
    display: flex;
  }
}
</style>
