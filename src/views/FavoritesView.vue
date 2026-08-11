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
      <p>You have not saved any properties yet.</p>
      <RouterLink to="/listings" class="btn btn-primary">Browse Properties</RouterLink>
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
    grid-template-columns: 1fr;
  }
}
</style>
