<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
// calls temporarily disabled — see src/calls/callManager.ts
// import CallOverlay from '@/components/CallOverlay.vue'
import { startStream, stopStream, ensureStream } from '@/messaging/stream'

const auth = useAuthStore()
const route = useRoute()

// The admin area has its own chrome (sidebar/header) - hide the site navbar & footer there.
const isAdminArea = computed(() => route.path.startsWith('/admin'))

// The SSE stream (messages + calls) runs globally for authenticated users so
// incoming calls and new messages arrive on ANY page.
watch(
  () => auth.isAuthenticated,
  (v) => {
    if (v) startStream()
    else stopStream()
  },
)

onMounted(() => {
  auth.fetchMe().then(() => {
    if (auth.isAuthenticated) ensureStream()
  })
})

onUnmounted(() => stopStream())
</script>

<template>
  <div class="app">
    <AppNavbar v-if="!isAdminArea" />
    <main class="main">
      <RouterView />
    </main>
    <AppFooter v-if="!isAdminArea" />
    <BottomNavigation />
    <!-- calls temporarily disabled
    <CallOverlay />
    -->
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main {
  flex: 1;
}

@media (max-width: 768px) {
  .main {
    padding-bottom: 64px;
  }
}
</style>
