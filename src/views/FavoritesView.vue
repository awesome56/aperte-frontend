<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { favoriteApi, type Property } from '@/api'
import PropertyCard from '@/components/PropertyCard.vue'

const favorites = ref<Property[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await favoriteApi.list({ per_page: 50 })
    favorites.value = res.data.data
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load favorites.'
  } finally {
    loading.value = false
  }
}

async function removeFavorite(id: number) {
  try {
    await favoriteApi.toggle(id)
    favorites.value = favorites.value.filter((p) => p.id !== id)
  } catch {
    // ignore
  }
}

onMounted(load)
</script>

<template>
  <div class="favs container">
    <h1>My Favorites</h1>
    <p class="sub">Properties you have saved for later</p>

    <p v-if="error" class="error-text">{{ error }}</p>
    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="!favorites.length" class="empty">
      <svg class="empty-heart" viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      <p class="empty-title">No saved properties yet</p>
      <p class="empty-sub">Tap the heart on any property and find it here later.</p>
      <RouterLink to="/listings" class="btn btn-primary">Explore Properties</RouterLink>
    </div>
    <div v-else class="grid">
      <div v-for="p in favorites" :key="p.id" class="cell">
        <PropertyCard :property="p" />
        <button class="btn btn-outline btn-sm remove" @click="removeFavorite(p.id)">Remove</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favs {
  padding: 50px 0 70px;
}

.favs h1 {
  font-size: 2.2rem;
  color: var(--color-purple-dark);
}

.sub {
  color: var(--color-muted);
  margin-bottom: 24px;
}

.empty {
  text-align: center;
  color: var(--color-muted);
  padding: 60px 0;
}

.empty-heart {
  color: #d5dbe6;
  margin-bottom: 14px;
}

.empty-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-dark, #222);
  margin: 0 0 4px;
}

.empty-sub {
  margin: 0 0 20px;
}

.empty p {
  margin-bottom: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
  padding: 10px 0 40px;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.remove {
  align-self: flex-start;
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.loading {
  text-align: center;
  color: var(--color-muted);
  padding: 60px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .favs {
    padding: 28px 0 70px;
  }
  .favs h1 {
    font-size: 1.5rem;
  }
}
</style>
