<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { propertyApi, type Property } from '@/api'
import PropertyCard from '@/components/PropertyCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'

const route = useRoute()

const filters = reactive({
  search: (route.query.search as string) || '',
  category: (route.query.category as string) || '',
  purpose: (route.query.purpose as string) || '',
  property_type: (route.query.property_type as string) || '',
  city: (route.query.city as string) || '',
  state: (route.query.state as string) || '',
  country: (route.query.country as string) || '',
  min_price: (route.query.min_price as string) || '',
  max_price: (route.query.max_price as string) || '',
  bedrooms: (route.query.bedrooms as string) || '',
  bathrooms: (route.query.bathrooms as string) || '',
  amenities: (route.query.amenities as string) || '',
  available: (route.query.available as string) || '',
})

const sort = ref((route.query.sort as string) || 'newest')
const results = ref<Property[]>([])
const meta = ref({ page: 1, pages: 1, total_count: 0, has_next: false, has_prev: false })
const loading = ref(true)
const error = ref('')
const aiNote = ref('')
const aiLoading = ref(false)
const page = ref(1)
const sheetOpen = ref(false)
const liveCount = ref<number | null>(null)
let liveTimer: number | null = null

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

const summaryText = computed(() => {
  const parts: string[] = []
  if (filters.city) parts.push(filters.city)
  if (filters.purpose) parts.push(filters.purpose === 'rent' ? 'Rent' : 'Sale')
  if (filters.bedrooms) parts.push(`${filters.bedrooms}+ beds`)
  if (filters.category) parts.push(filters.category.replace('_', ' '))
  return parts.length ? parts.join(' · ') : 'All properties'
})

function filterParams(includePage = true): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (includePage) params.page = page.value
  params.per_page = 12
  params.sort = sort.value
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params[k] = v
  })
  return params
}

async function load() {
  loading.value = true
  error.value = ''
  aiNote.value = ''
  try {
    const res = await propertyApi.browse(filterParams())
    results.value = res.data.data
    meta.value = res.data.meta
    // natural-language fallback: no exact match but a search term was given
    if (res.data.meta.total_count === 0 && filters.search.trim()) {
      tryAiSearch(filters.search)
    }
  } catch {
    error.value = 'We couldn\'t load these properties right now. Please try again.'
    results.value = []
  } finally {
    loading.value = false
  }
}

async function tryAiSearch(q: string) {
  aiLoading.value = true
  try {
    const res = await propertyApi.aiSearch(q)
    if (res.data.meta.total_count > 0) {
      results.value = res.data.data
      meta.value = res.data.meta
      const it = res.data.interpretation
      aiNote.value = it?.used_ai ? `Interpreted as: ${it.suggested_query}` : ''
    }
  } catch {
    // stay with the empty state
  } finally {
    aiLoading.value = false
  }
}

// live match count while the filter sheet is open
function updateLiveCount() {
  if (liveTimer != null) window.clearTimeout(liveTimer)
  liveTimer = window.setTimeout(async () => {
    try {
      const res = await propertyApi.browse({ ...filterParams(false), per_page: 1 })
      liveCount.value = res.data.meta.total_count
    } catch {
      liveCount.value = null
    }
  }, 350)
}

function openSheet() {
  sheetOpen.value = true
  liveCount.value = null
  updateLiveCount()
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
  liveCount.value = null
  updateLiveCount()
}

watch(page, load)
watch(() => route.query, () => {
  if (route.query.search) filters.search = route.query.search as string
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
        <form class="search-form" @submit.prevent="apply">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="sf-icon"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input v-model="filters.search" type="text" placeholder="Search by name, area or city — e.g. Bodija, Jericho, Agodi…" class="sf-input" />
          <button type="submit" class="btn btn-primary sf-btn">Search</button>
        </form>
      </div>
    </div>

    <div class="container">
      <!-- top bar: filter toggle + sort + count -->
      <div class="topbar-row">
        <button class="btn btn-outline filter-btn" @click="openSheet">
          Filters
          <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
        </button>
        <select v-model="sort" class="sort-select" @click.self="() => {}" @change="apply" aria-label="Sort results">
          <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
      </div>

      <!-- compact mobile search bar -->
      <div class="mobile-search">
        <div class="ms-row">
          <button class="ms-loc" @click="openSheet">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
            <span>{{ summaryText }}</span>
          </button>
          <button class="ms-filter" :class="{ on: activeFilterCount > 0 }" @click="openSheet">Filter{{ activeFilterCount ? ` (${activeFilterCount})` : '' }}</button>
          <select v-model="sort" class="ms-sort" @change="apply" aria-label="Sort">
            <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
          </select>
        </div>
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

          <div v-else-if="aiLoading" class="state-box">
            <div class="ai-thinking">
              <span class="ai-spin"></span>
              <h3>Interpreting your search…</h3>
              <p>Looking for the best matches.</p>
            </div>
          </div>

          <div v-else-if="!results.length" class="state-box">
            <h3>No properties found</h3>
            <p>We couldn't find a match for those filters.</p>
            <p class="ai-hint" v-if="aiNote">{{ aiNote }}</p>
            <div class="state-actions">
              <button class="btn btn-primary" @click="reset">Clear filters</button>
              <RouterLink to="/browse-requests" class="btn btn-outline">Post a property request</RouterLink>
            </div>
          </div>

          <p v-if="aiNote" class="ai-bar">{{ aiNote }}</p>
          <div class="grid">
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

    <!-- mobile near-fullscreen filter sheet -->
    <Teleport to="body">
      <div v-if="sheetOpen" class="sheet-backdrop" @click="sheetOpen = false"></div>
      <div v-if="sheetOpen" class="sheet" role="dialog" aria-label="Filters">
        <div class="sheet-head">
          <h3>Filters</h3>
          <button class="sheet-close" @click="sheetOpen = false" aria-label="Close filters">×</button>
        </div>
        <div class="sheet-body">
          <div class="filter-group">
            <label>Location</label>
            <select v-model="filters.city" @change="updateLiveCount">
              <option value="">All cities</option>
              <option v-for="c in CITIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Price (₦)</label>
            <div class="price-pair">
              <input v-model="filters.min_price" type="number" min="0" placeholder="Min" @change="updateLiveCount" />
              <span class="dash">–</span>
              <input v-model="filters.max_price" type="number" min="0" placeholder="Max" @change="updateLiveCount" />
            </div>
          </div>
          <div class="filter-group">
            <label>Property type</label>
            <select v-model="filters.category" @change="updateLiveCount">
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
            <select v-model="filters.purpose" @change="updateLiveCount">
              <option value="">All</option>
              <option value="rent">For Rent</option>
              <option value="sale">For Sale</option>
              <option value="both">Rent & Sale</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Bedrooms</label>
            <select v-model="filters.bedrooms" @change="updateLiveCount">
              <option value="">Any</option>
              <option v-for="n in 6" :key="n" :value="String(n)">{{ n }}+</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Bathrooms</label>
            <select v-model="filters.bathrooms" @change="updateLiveCount">
              <option value="">Any</option>
              <option v-for="n in 5" :key="n" :value="String(n)">{{ n }}+</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Amenities</label>
            <div class="amenity-list">
              <label v-for="a in AMENITY_OPTIONS" :key="a" class="amenity">
                <input v-model="filters.amenities" type="checkbox" :value="a" @change="updateLiveCount" />
                <span>{{ a.replace('_', ' ') }}</span>
              </label>
            </div>
          </div>
          <div class="filter-group">
            <label>Availability</label>
            <select v-model="filters.available" @change="updateLiveCount">
              <option value="">Any</option>
              <option value="1">Available</option>
              <option value="0">Unavailable</option>
            </select>
          </div>
        </div>
        <div class="sheet-foot">
          <button class="btn btn-outline" @click="reset">Clear All</button>
          <button class="btn btn-primary" @click="apply">
            Show {{ liveCount != null ? liveCount.toLocaleString() : '' }} Properties
          </button>
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

.search-form {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 560px;
  margin-top: 18px;
  background: #fff;
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 12px;
  padding: 6px 6px 6px 14px;
}

.sf-icon {
  color: var(--color-muted, #888);
  flex-shrink: 0;
}

.sf-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  min-width: 0;
}

.sf-btn {
  flex-shrink: 0;
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

.sort-select {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 0.9rem;
  background: #fff;
}

/* compact mobile search bar */
.mobile-search {
  display: none;
  margin-bottom: 14px;
}

.ms-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ms-loc {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 10px;
  padding: 11px 12px;
  background: #fff;
  color: var(--color-dark, #222);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.ms-loc span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ms-filter {
  border: 1.5px solid var(--color-primary, #0a84ff);
  border-radius: 10px;
  padding: 11px 14px;
  background: #fff;
  color: var(--color-primary, #0a84ff);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.ms-filter.on {
  background: var(--color-primary, #0a84ff);
  color: #fff;
}

.ms-sort {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 10px;
  padding: 11px 8px;
  font-size: 0.82rem;
  background: #fff;
  max-width: 130px;
}

.price-pair {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-pair input {
  flex: 1;
  min-width: 0;
}

.price-pair .dash {
  color: var(--color-muted, #888);
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

.ai-bar {
  background: #eef6ff;
  border: 1px solid #d3e7ff;
  color: #1a5fae;
  border-radius: 10px;
  padding: 10px 14px;
  margin: 0 0 18px;
  font-size: 0.9rem;
}

.ai-hint {
  font-size: 0.85rem;
  color: var(--color-muted, #777);
  margin-bottom: 16px !important;
}

.ai-spin {
  display: inline-block;
  width: 22px;
  height: 22px;
  border: 3px solid #d3e7ff;
  border-top-color: var(--color-primary, #0a84ff);
  border-radius: 50%;
  animation: ai-rotate 0.8s linear infinite;
  margin-bottom: 14px;
}

@keyframes ai-rotate {
  to { transform: rotate(360deg); }
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
  max-height: 92vh;
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
  .mobile-search {
    display: block;
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
