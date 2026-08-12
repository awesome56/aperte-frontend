<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { unreadCount } from '@/messaging/stream'

const route = useRoute()
const auth = useAuthStore()

const hidden = computed(() => route.path.startsWith('/admin') || route.path === '/login' || route.path === '/register')

const items = computed<{ to: string; label: string; icon: string; badge?: number }[]>(() => {
  const base = [
    { to: '/', label: 'Home', icon: 'M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z' },
    { to: '/listings', label: 'Explore', icon: 'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm9.3 13.3-4.2-4.2a7.4 7.4 0 1 0-1.4 1.4l4.2 4.2a1 1 0 0 0 1.4-1.4z' },
  ]
  if (auth.isAuthenticated) {
    base.push(
      { to: '/favorites', label: 'Favorites', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', badge: 0 },
      { to: '/messages', label: 'Messages', icon: 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z', badge: unreadCount.value },
      { to: '/dashboard', label: 'Account', icon: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z' },
    )
  } else {
    base.push({ to: '/login', label: 'Login', icon: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z' })
  }
  return base
})

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <nav v-if="!hidden" class="bottom-nav" aria-label="Primary">
    <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="bn-item" :class="{ active: isActive(item.to) }">
      <span class="bn-icon-wrap">
        <svg viewBox="0 0 24 24" width="22" height="22" :fill="isActive(item.to) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8"><path :d="item.icon"/></svg>
        <span v-if="item.badge" class="bn-badge">{{ item.badge > 99 ? '99+' : item.badge }}</span>
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
