<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { propertyApi, type Property } from '@/api'
import PropertyCard from '@/components/PropertyCard.vue'

const route = useRoute()
const router = useRouter()

const filters = reactive({
  category: (route.query.category as string) || '',
  purpose: (route.query.purpose as string) || '',
  property_type: '',
  city: (route.query.city as string) || '',
  state: '',
  country: '',
  min_price: (route.query.min_price as string) || '',
  max_price: (route.query.max_price as string) || '',
})

const results = ref<Property[]>([])
const meta = ref({ page: 1, pages: 1, total_count: 0, has_next: false, has_prev: false })
const loading = ref(true)
const page = ref(1)

async function load() {
  loading.value = true
  const params: Record<string, unknown> = {
    page: page.value,
    per_page: 12,
  }
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params[k] = v
  })
  try {
    const res = await propertyApi.browse(params)
    results.value = res.data.data
    meta.value = res.data.meta
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

function apply() {
  page.value = 1
  load()
}

function reset() {
  Object.keys(filters).forEach((k) => (filters[k as keyof typeof filters] = ''))
  apply()
}

watch(page, load)

onMounted(load)
</script>

<template>
  <div class="listings">
    <div class="banner">
      <div class="container">
        <h1>Browse Properties</h1>
        <p>Find the perfect property across every category</p>
      </div>
    </div>

    <div class="container">
      <div class="filter-bar">
        <div class="field">
          <label>Category</label>
          <select v-model="filters.category">
            <option value="">All Categories</option>
            <option value="property">Property</option>
            <option value="land">Land</option>
            <option value="hotel">Hotel</option>
            <option value="hall">Hall</option>
            <option value="event_center">Event Center</option>
            <option value="shortlet">Shortlet</option>
          </select>
        </div>
        <div class="field">
          <label>Purpose</label>
          <select v-model="filters.purpose">
            <option value="">All</option>
            <option value="rent">For Rent</option>
            <option value="sale">For Sale</option>
            <option value="both">Rent & Sale</option>
          </select>
        </div>
        <div class="field">
          <label>City</label>
          <input v-model="filters.city" type="text" placeholder="City" />
        </div>
        <div class="field">
          <label>State</label>
          <input v-model="filters.state" type="text" placeholder="State" />
        </div>
        <div class="field">
          <label>Min Price</label>
          <input v-model="filters.min_price" type="number" placeholder="0" />
        </div>
        <div class="field">
          <label>Max Price</label>
          <input v-model="filters.max_price" type="number" placeholder="No max" />
        </div>
        <div class="actions">
          <button class="btn btn-primary" @click="apply">Apply</button>
          <button class="btn btn-outline" @click="reset">Reset</button>
        </div>
      </div>

      <p v-if="!loading" class="count">{{ meta.total_count }} propert{{ meta.total_count === 1 ? 'y' : 'ies' }} found</p>

      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="results.length" class="grid">
        <PropertyCard v-for="p in results" :key="p.id" :property="p" />
      </div>
      <div v-else class="loading">No properties match your search.</div>

      <div v-if="meta.pages > 1" class="pagination">
        <button class="btn btn-outline" :disabled="!meta.has_prev" @click="page--">Prev</button>
        <span>Page {{ meta.page }} of {{ meta.pages }}</span>
        <button class="btn btn-outline" :disabled="!meta.has_next" @click="page++">Next</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.banner {
  background: linear-gradient(120deg, #f0f6ff, #dce7ff);
  padding: 60px 0;
}

.banner h1 {
  font-size: 2.6rem;
  color: var(--color-purple-dark);
  margin-bottom: 8px;
}

.banner p {
  color: var(--color-muted);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
  margin-top: -30px;
  position: relative;
  z-index: 2;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-muted);
}

.field input,
.field select {
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.9rem;
  min-width: 130px;
}

.actions {
  display: flex;
  gap: 10px;
}

.count {
  margin: 24px 0;
  color: var(--color-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
  padding: 10px 0 40px;
}

.loading {
  text-align: center;
  color: var(--color-muted);
  padding: 60px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding-bottom: 50px;
}

.pagination span {
  color: var(--color-muted);
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
  .filter-bar .field {
    flex: 1 1 100%;
  }
}
</style>
