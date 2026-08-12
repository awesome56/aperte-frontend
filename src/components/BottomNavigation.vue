<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { unreadCount } from '@/messaging/stream'
import { USER_BOTTOM_NAV, VISITOR_BOTTOM_NAV, type BottomNavItem } from '@/config/navigation'

const route = useRoute()
const auth = useAuthStore()

const hidden = computed(() => route.path.startsWith('/admin') || route.path === '/login' || route.path === '/register')

const items = computed<BottomNavItem[]>(() => (auth.isAuthenticated ? USER_BOTTOM_NAV : VISITOR_BOTTOM_NAV))

function isActive(to?: string) {
  if (!to) return false
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to.split('?')[0] ?? '')
}
</script>

<template>
  <nav v-if="!hidden" class="bottom-nav" aria-label="Primary">
    <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="bn-item" :class="{ active: isActive(item.to) }">
      <span class="bn-icon-wrap">
        <svg viewBox="0 0 24 24" width="22" height="22" :fill="isActive(item.to) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8"><path :d="item.icon"/></svg>
        <span v-if="item.badge && unreadCount" class="bn-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </span>
      <span class="bn-label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 900;
  display: none;
  background: #fff;
  border-top: 1px solid #e8ecf3;
  padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(16, 30, 60, 0.06);
}

.bn-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 2px;
  color: #8a94a6;
  text-decoration: none;
}

.bn-item.active {
  color: var(--clr-blue, #0a84ff);
}

.bn-icon-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
}

.bn-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 10px;
  background: #ff4757;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.bn-label {
  font-size: 0.68rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .bottom-nav {
    display: flex;
  }

  body {
    padding-bottom: 64px;
  }
}
</style>
