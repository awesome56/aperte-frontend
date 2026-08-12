<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { propertyApi, type Property } from '@/api'
import PropertyCard from '@/components/PropertyCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'

const route = useRoute()

const filters = reactive({
  category: (route.query.category as string) || '',
  purpose: (route.query.purpose as string) || '',
  property_type: (route.query.property_type as string) || '',
  city: (route.query.city as string) || '',
  state: (route.query.state as string) || '',
  country: (route.query.country as string) || '',
  min_price: (route.query.min_price as string) || '',
  max_price: (route.query.max_price as string) || '',
  bedrooms: (route.query.bedrooms as string) || '',
  amenities: (route.query.amenities as string) || '',
})

const sort = ref((route.query.sort as string) || 'newest')
const results = ref<Property[]>([])
const meta = ref({ page: 1, pages: 1, total_count: 0, has_next: false, has_prev: false })
const loading = ref(true)
const error = ref('')
const page = ref(1)
const sheetOpen = ref(false)

const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Benin City', 'Enugu', 'Kano', 'Owerri', 'Abeokuta', 'Onitsha']
const AMENITY_OPTIONS = ['furnished', 'parking', 'security', 'ac', 'backup_power', 'swimming_pool', 'gym', 'elevator']
const SORTS = [
  { key: 'newest', label: 'Newest first' },
  { key: 'popular', label: 'Most viewed' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
]

const activeFilterCount = computed(() =>
  Object.values(filters).filter((v) => v !== '').length,
)

async function load() {
  loading.value = true
  error.value = ''
  const params: Record<string, unknown> = {
    page: page.value,
    per_page: 12,
    sort: sort.value,
  }
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params[k] = v
  })
  try {
    const res = await propertyApi.browse(params)
    results.value = res.data.data
    meta.value = res.data.meta
  } catch {
    error.value = 'We couldn\'t load these properties right now. Please try again.'
    results.value = []
  } finally {
    loading.value = false
  }
}

function apply() {
  page.value = 1
  sheetOpen.value = false
  load()
  import('@/analytics/tracker').then((m) =>
    m.default.trackEvent('search', 'search', {
      category: filters.category,
      purpose: filters.purpose,
      city: filters.city,
      min_price: filters.min_price,
      max_price: filters.max_price,
      sort: sort.value,
      results: meta.value.total_count,
    }),
  )
}

function reset() {
  Object.keys(filters).forEach((k) => (filters[k as keyof typeof filters] = ''))
  sort.value = 'newest'
  apply()
}

watch(page, load)
watch(() => route.query, () => {
  if (route.query.category) filters.category = route.query.category as string
  if (route.query.purpose) filters.purpose = route.query.purpose as string
  if (route.query.city) filters.city = route.query.city as string
  if (route.query.sort) sort.value = route.query.sort as string
  apply()
})

onMounted(load)
</script>

<template>
  <div class="listings">
    <div class="banner">
      <div class="container">
        <h1>Explore Properties</h1>
        <p>Homes, land, offices, stays and venues across Nigeria</p>
      </div>
    </div>

    <div class="container">
      <!-- top bar: filter toggle + sort + count -->
      <div class="topbar-row">
        <button class="btn btn-outline filter-btn" @click="sheetOpen = true">
          Filters
          <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
        </button>
        <p class="count">{{ meta.total_count.toLocaleString() }} propert{{ meta.total_count === 1 ? 'y' : 'ies' }}</p>
        <select v-model="sort" class="sort-select" @change="apply" aria-label="Sort results">
          <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
      </div>

      <div class="layout">
        <!-- desktop filter sidebar -->
        <aside class="filters">
          <div class="filter-group">
            <label>Category</label>
            <select v-model="filters.category" @change="apply">
              <option value="">All categories</option>
              <option value="property">Property</option>
              <option value="land">Land</option>
              <option value="hotel">Hotel</option>
              <option value="hall">Hall</option>
              <option value="event_center">Event Center</option>
              <option value="shortlet">Shortlet</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Purpose</label>
            <select v-model="filters.purpose" @change="apply">
              <option value="">All</option>
              <option value="rent">For Rent</option>
              <option value="sale">For Sale</option>
              <option value="both">Rent & Sale</option>
            </select>
          </div>
          <div class="filter-group">
            <label>City</label>
            <select v-model="filters.city" @change="apply">
              <option value="">All cities</option>
              <option v-for="c in CITIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Bedrooms</label>
            <select v-model="filters.bedrooms" @change="apply">
              <option value="">Any</option>
              <option v-for="n in 6" :key="n" :value="String(n)">{{ n }}+</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Min Price (₦)</label>
            <input v-model="filters.min_price" type="number" min="0" placeholder="0" @change="apply" />
          </div>
          <div class="filter-group">
            <label>Max Price (₦)</label>
            <input v-model="filters.max_price" type="number" min="0" placeholder="No max" @change="apply" />
          </div>
          <div class="filter-group">
            <label>Amenities</label>
            <div class="amenity-list">
              <label v-for="a in AMENITY_OPTIONS" :key="a" class="amenity">
                <input v-model="filters.amenities" type="checkbox" :value="a" @change="apply" />
                <span>{{ a.replace('_', ' ') }}</span>
              </label>
            </div>
          </div>
          <button class="btn btn-outline btn-block" @click="reset">Clear all filters</button>
        </aside>

        <!-- results -->
        <section class="results" aria-live="polite">
          <div v-if="loading" class="grid">
            <SkeletonCard v-for="i in 6" :key="i" />
          </div>

          <div v-else-if="error" class="state-box">
            <h3>Something went wrong</h3>
            <p>{{ error }}</p>
            <button class="btn btn-primary" @click="load">Try Again</button>
          </div>

          <div v-else-if="!results.length" class="state-box">
            <h3>No properties found</h3>
            <p>We couldn't find a match for those filters.</p>
            <div class="state-actions">
              <button class="btn btn-primary" @click="reset">Clear filters</button>
              <RouterLink to="/browse-requests" class="btn btn-outline">Post a property request</RouterLink>
            </div>
          </div>

          <div v-else class="grid">
            <PropertyCard v-for="p in results" :key="p.id" :property="p" />
          </div>

          <div v-if="meta.pages > 1" class="pagination">
            <button class="btn btn-outline" :disabled="!meta.has_prev" @click="page--">Prev</button>
            <span>Page {{ meta.page }} of {{ meta.pages }}</span>
            <button class="btn btn-outline" :disabled="!meta.has_next" @click="page++">Next</button>
          </div>
        </section>
      </div>
    </div>

    <!-- mobile bottom-sheet filters -->
    <Teleport to="body">
      <div v-if="sheetOpen" class="sheet-backdrop" @click="sheetOpen = false"></div>
      <div v-if="sheetOpen" class="sheet" role="dialog" aria-label="Filters">
        <div class="sheet-head">
          <h3>Filters</h3>
          <button class="sheet-close" @click="sheetOpen = false">×</button>
        </div>
        <div class="sheet-body">
          <div class="filter-group">
            <label>Category</label>
            <select v-model="filters.category"><option value="">All categories</option><option value="property">Property</option><option value="land">Land</option><option value="hotel">Hotel</option><option value="hall">Hall</option><option value="event_center">Event Center</option><option value="shortlet">Shortlet</option></select>
          </div>
          <div class="filter-group">
            <label>Purpose</label>
            <select v-model="filters.purpose"><option value="">All</option><option value="rent">For Rent</option><option value="sale">For Sale</option><option value="both">Rent & Sale</option></select>
          </div>
          <div class="filter-group">
            <label>City</label>
            <select v-model="filters.city"><option value="">All cities</option><option v-for="c in CITIES" :key="c" :value="c">{{ c }}</option></select>
          </div>
          <div class="filter-group">
            <label>Bedrooms</label>
            <select v-model="filters.bedrooms"><option value="">Any</option><option v-for="n in 6" :key="n" :value="String(n)">{{ n }}+</option></select>
          </div>
          <div class="filter-group">
            <label>Min Price (₦)</label>
            <input v-model="filters.min_price" type="number" min="0" placeholder="0" />
          </div>
          <div class="filter-group">
            <label>Max Price (₦)</label>
            <input v-model="filters.max_price" type="number" min="0" placeholder="No max" />
          </div>
          <div class="filter-group">
            <label>Amenities</label>
            <div class="amenity-list">
              <label v-for="a in AMENITY_OPTIONS" :key="a" class="amenity">
                <input v-model="filters.amenities" type="checkbox" :value="a" />
                <span>{{ a.replace('_', ' ') }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="sheet-foot">
          <button class="btn btn-outline" @click="reset">Reset</button>
          <button class="btn btn-primary" @click="apply">Show results</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.banner {
  background: linear-gradient(120deg, #f0f6ff, #e8eefc);
  padding: 48px 0;
}

.banner h1 {
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  color: var(--color-purple-dark, #2b2358);
  margin-bottom: 6px;
}

.banner p {
  color: var(--color-muted, #666);
}

.topbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 22px 0 18px;
  flex-wrap: wrap;
}

.filter-btn {
  display: none;
}

.filter-count {
  background: var(--color-primary, #0a84ff);
  color: #fff;
  border-radius: 12px;
  font-size: 0.72rem;
  padding: 1px 7px;
  margin-left: 4px;
}

.count {
  color: var(--color-muted, #666);
  margin: 0;
}

.sort-select {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 0.9rem;
  background: #fff;
}

.layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 28px;
  align-items: start;
  padding-bottom: 60px;
}

.filters {
  position: sticky;
  top: 100px;
  background: #f8f9fc;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-muted, #666);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.filter-group select,
.filter-group input {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 9px;
  padding: 9px 11px;
  font-size: 0.9rem;
  background: #fff;
}

.amenity-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.amenity {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: #333;
  cursor: pointer;
  text-transform: capitalize;
}

.amenity input {
  accent-color: var(--color-primary, #0a84ff);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
}

.state-box {
  text-align: center;
  padding: 70px 20px;
  color: var(--color-muted, #666);
}

.state-box h3 {
  font-size: 1.3rem;
  color: var(--color-dark, #222);
  margin-bottom: 8px;
}

.state-box p {
  margin-bottom: 20px;
}

.state-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding-top: 34px;
}

.pagination span {
  color: var(--color-muted, #666);
}

/* mobile sheet */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 950;
  background: rgba(10, 12, 20, 0.45);
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 951;
  background: #fff;
  border-radius: 18px 18px 0 0;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  animation: sheet-up 0.22s ease;
}

@keyframes sheet-up {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 10px;
  border-bottom: 1px solid #eef0f3;
}

.sheet-head h3 {
  margin: 0;
  font-size: 1.1rem;
}

.sheet-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f0f1f3;
  font-size: 1.1rem;
  cursor: pointer;
}

.sheet-body {
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sheet-foot {
  display: flex;
  gap: 10px;
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid #eef0f3;
}

.sheet-foot .btn {
  flex: 1;
}

@media (max-width: 1000px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 820px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .filters {
    display: none;
  }
  .filter-btn {
    display: inline-flex;
  }
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
