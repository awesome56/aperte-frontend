<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, formatPrice, type Property } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const properties = ref<Property[]>([])
const loading = ref(true)
const err = ref('')

const searchTerm = ref('')
const categoryFilter = ref('')
const statusFilter = ref('all')
const showFilters = ref(false)
let searchTimer: number | null = null

const CATEGORIES = ['property', 'land', 'hotel', 'hall', 'event_center', 'shortlet', 'other']

const filteredProperties = computed(() => {
  let list = properties.value
  if (statusFilter.value === 'approved') list = list.filter((p) => p.approved === 1 && !p.disabled)
  if (statusFilter.value === 'pending') list = list.filter((p) => p.approved === 0)
  if (statusFilter.value === 'hidden') list = list.filter((p) => p.disabled)
  return list
})

function onSearch() {
  if (searchTimer != null) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(load, 350)
}

async function load() {
  if (!auth.user?.id) {
    await auth.fetchMe()
  }
  if (!auth.user?.id) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const params: Record<string, unknown> = {}
    if (searchTerm.value.trim()) params.search = searchTerm.value.trim()
    if (categoryFilter.value) params.category = categoryFilter.value
    const r = await propertyApi.mine(auth.user.id, params)
    properties.value = r.data.data
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load properties.'
  } finally {
    loading.value = false
  }
}

function manageProperty(id: number) {
  router.push({ name: 'property-manage', params: { id } })
}

const toggling = ref<number | null>(null)
const msg = ref('')

async function toggleDisabled(p: Property) {
  toggling.value = p.id
  msg.value = ''
  err.value = ''
  try {
    await propertyApi.update(p.id, { disabled: p.disabled ? 0 : 1 })
    p.disabled = p.disabled ? 0 : 1
    msg.value = p.disabled ? 'Listing hidden from the site.' : 'Listing is now visible on the site.'
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update listing.'
  } finally {
    toggling.value = null
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="sec-head">
      <h1 class="page-title">My Properties</h1>
      <div class="head-right">
        <button class="btn btn-outline filter-toggle" @click="showFilters = !showFilters">Search & Filter</button>
        <RouterLink to="/add-listing" class="btn btn-primary add-btn">+ Add Listing</RouterLink>
      </div>
    </div>

    <!-- search + filters -->
    <div v-if="showFilters" class="filters">
      <div class="filter-row">
        <input
          v-model="searchTerm"
          class="filter-input"
          type="search"
          placeholder="Search by title…"
          @input="onSearch"
        />
        <select v-model="categoryFilter" class="filter-select" @change="load">
          <option value="">All categories</option>
          <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c.replace('_', ' ') }}</option>
        </select>
        <select v-model="statusFilter" class="filter-select">
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending approval</option>
          <option value="hidden">Hidden</option>
        </select>
        <button class="btn btn-outline btn-sm" @click="searchTerm = ''; categoryFilter = ''; statusFilter = 'all'; load()">Clear</button>
      </div>
    </div>

    <p v-if="msg" class="success-text banner">{{ msg }}</p>
    <p v-if="err" class="error-text banner">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="err" class="loading">{{ err }}</div>
    <div v-else-if="!filteredProperties.length" class="empty">
      <p v-if="searchTerm || categoryFilter || statusFilter !== 'all'">No properties match your search.</p>
      <p v-else>You have no listings yet.</p>
      <RouterLink to="/add-listing" class="btn btn-primary">Add Listing</RouterLink>
    </div>
    <div v-else class="prop-list">
      <div v-for="p in filteredProperties" :key="p.id" class="prop-card" :class="{ hidden: p.disabled }">
        <img v-if="p.dp || p.images?.[0]" :src="p.dp || p.images?.[0]?.image_url" alt="" class="prop-thumb" />
        <div class="prop-ph" v-else></div>
        <div class="prop-body">
          <div class="prop-title-row">
            <strong class="prop-title">{{ p.title }}</strong>
            <div class="badges">
              <span v-if="p.disabled" class="status-badge hidden-badge">Hidden</span>
              <span class="status-badge" :class="p.approved ? 'ok' : 'no'">{{ p.approved ? 'Approved' : 'Pending' }}</span>
            </div>
          </div>
          <span class="prop-meta">{{ p.city }}, {{ p.state }} · {{ formatPrice(p.price, p.currency) }} · {{ p.category }}</span>
          <div class="prop-stats">
            <span v-if="p.views != null">{{ p.views }} views</span>
            <span v-if="p.favorites_count != null">{{ p.favorites_count }} ♥</span>
            <span :class="p.available ? 'ok-text' : 'bad-text'">{{ p.available ? 'Available' : 'Unavailable' }}</span>
          </div>
          <div class="prop-actions">
            <button class="btn btn-primary btn-sm" @click="manageProperty(p.id)">Manage</button>
            <RouterLink :to="`/properties/edit/${p.id}`" class="btn btn-outline btn-sm">Edit</RouterLink>
            <RouterLink :to="`/properties/${p.id}`" class="btn btn-outline btn-sm">View</RouterLink>
            <button class="btn btn-outline btn-sm" :disabled="toggling === p.id" @click="toggleDisabled(p)">
              {{ toggling === p.id ? '…' : p.disabled ? 'Enable' : 'Disable' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 600;
}

.banner {
  margin-bottom: 12px;
}

/* average-size buttons */
.add-btn,
.prop-actions .btn,
.empty .btn {
  padding: 8px 16px;
  font-size: 0.88rem;
}

.prop-actions .btn-sm,
.prop-actions .btn {
  padding: 7px 14px;
  font-size: 0.84rem;
}

.badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.hidden-badge {
  background: #eceef1;
  color: #6b7280;
}

.prop-card.hidden {
  opacity: 0.75;
}

/* search + filters */
.head-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filter-toggle {
  padding: 8px 16px;
  font-size: 0.88rem;
}

.filters {
  background: #f8f9fc;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-input {
  flex: 1;
  min-width: 200px;
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 9px;
  padding: 9px 12px;
  font-size: 0.9rem;
}

.filter-select {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 9px;
  padding: 9px 12px;
  font-size: 0.9rem;
  background: #fff;
}

.loading,
.empty {
  text-align: center;
  color: #888;
  padding: 60px 0;
}

.empty p {
  margin-bottom: 16px;
}

.prop-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.prop-card {
  display: flex;
  gap: 14px;
  background: #fff;
  border: 1.5px solid var(--color-border, #e8ecf3);
  border-radius: 14px;
  padding: 14px;
  align-items: stretch;
}

.prop-thumb,
.prop-ph {
  width: 150px;
  min-height: 110px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.prop-ph {
  background: #eef0f3;
}

.prop-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.prop-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.prop-title {
  color: var(--color-dark, #222);
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-badge.ok { background: #e6f7ec; color: #1a7f37; }
.status-badge.no { background: #fff4e5; color: #b7791f; }

.prop-meta {
  color: var(--color-muted, #777);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prop-stats {
  display: flex;
  gap: 14px;
  font-size: 0.82rem;
  color: var(--color-muted, #777);
}

.ok-text { color: #1a7f37; }
.bad-text { color: #d0342c; }

.prop-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .prop-card {
    flex-direction: column;
  }
  .prop-thumb,
  .prop-ph {
    width: 100%;
    height: 150px;
  }
}
</style>
