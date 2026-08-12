<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { favoriteApi } from '@/api'

const props = defineProps<{ propertyId: number; favorited?: boolean; onToggle?: (favorited: boolean) => void }>()

const router = useRouter()
const auth = useAuthStore()

const active = ref(Boolean(props.favorited))

async function toggle(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  try {
    await favoriteApi.toggle(props.propertyId)
    active.value = !active.value
    props.onToggle?.(active.value)
    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent(active.value ? 'favorite_add' : 'favorite_remove', 'property', { property_id: props.propertyId }),
    )
  } catch {
    // ignore
  }
}
</script>

<template>
  <button
    class="fav-btn"
    :class="{ active }"
    :aria-pressed="active"
    :aria-label="active ? 'Remove from favorites' : 'Save to favorites'"
    :title="active ? 'Saved' : 'Save'"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" width="20" height="20" :fill="active ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  </button>
</template>

<style scoped>
.fav-btn {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.92);
  color: #8a8f9c;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s, color 0.15s;
  z-index: 5;
}

.fav-btn:hover {
  transform: scale(1.1);
  color: #ff4757;
}

.fav-btn.active {
  color: #ff4757;
}

.fav-btn:focus-visible {
  outline: 2px solid #ff4757;
  outline-offset: 2px;
}
</style>
