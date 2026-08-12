<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="admin-layout">
    <!-- Sidebar (from Figma: 212px, "ByeWind" logo + nav groups) -->
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
        <RouterLink to="/admin/analytics" class="nav-item" active-class="active">
          <span class="dot" style="background:#ff9f0a"></span> Analytics
        </RouterLink>

        <p class="nav-label">Management</p>
        <RouterLink to="/admin/users" class="nav-item" active-class="active">
          <span class="dot" style="background:#71dd8c"></span> Users
        </RouterLink>
        <RouterLink to="/admin/properties" class="nav-item" active-class="active">
          <span class="dot" style="background:#b899eb"></span> Properties
        </RouterLink>
        <RouterLink v-if="auth.isAdmin || auth.isStaff" to="/admin/claims" class="nav-item" active-class="active">
          <span class="dot" style="background:#64d2ff"></span> Claims
        </RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin/roles" class="nav-item" active-class="active">
          <span class="dot" style="background:#adadfb"></span> Roles & Permissions
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

    <!-- Main -->
    <div class="main">
      <!-- Header (from Figma: breadcrumb + search) -->
      <header class="header">
        <div class="breadcrumb">
          <span>Dashboards</span>
          <span class="sep">/</span>
          <span class="current">Admin</span>
        </div>
        <div class="header-right">
          <div class="search">
            <span>⌕</span>
            <input type="text" placeholder="Search" />
          </div>
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

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  padding: 7px 12px;
  color: #9aa0a6;
}

.search input {
  border: none;
  outline: none;
  font-size: 0.9rem;
  min-width: 160px;
  background: none;
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
</style>
