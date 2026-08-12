<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { requestApi, type Request, type Paginated } from '@/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const results = ref<Request[]>([])
const meta = ref<Paginated<Request>['meta'] | null>(null)
const loading = ref(true)
const page = ref(1)

const filters = reactive({ city: '', state: '', country: '', property_type: '' })

function fmtPrice(v: number | null | undefined) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)
}

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

async function load() {
  loading.value = true
  const params: Record<string, unknown> = { page: page.value, per_page: 12 }
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params[k] = v
  })
  try {
    const res = await requestApi.browse(params)
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

function message(r: Request) {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: `/browse-requests` } })
    return
  }
  router.push({ name: 'messages', query: { user: r.user_id, request: r.id } })
}

watch(page, load)
onMounted(load)
</script>

<template>
  <div class="browse">
    <div class="banner">
      <div class="container">
        <h1>Browse Requests</h1>
        <p>What property seekers are looking for — reach out and connect</p>
      </div>
    </div>

    <div class="container">
      <div class="filter-bar">
        <div class="field">
          <label>City</label>
          <input v-model="filters.city" type="text" placeholder="City" @change="apply" />
        </div>
        <div class="field">
          <label>State</label>
          <input v-model="filters.state" type="text" placeholder="State" @change="apply" />
        </div>
        <div class="field">
          <label>Property Type</label>
          <select v-model="filters.property_type" @change="apply">
            <option value="">All types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="duplex">Duplex</option>
            <option value="bungalow">Bungalow</option>
            <option value="office">Office</option>
            <option value="shop">Shop</option>
            <option value="warehouse">Warehouse</option>
            <option value="land">Land</option>
            <option value="shortlet">Shortlet</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="actions">
          <button class="btn btn-primary" @click="apply">Filter</button>
        </div>
      </div>

      <p v-if="!loading" class="count">{{ meta?.total_count || 0 }} request{{ (meta?.total_count || 0) === 1 ? '' : 's' }} found</p>

      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="results.length" class="grid">
        <div v-for="r in results" :key="r.id" class="card">
          <h3>{{ r.title }}</h3>
          <p class="desc">{{ r.description }}</p>
          <div class="chips">
            <span class="chip">{{ r.property_type }}</span>
            <span v-if="r.sub_category" class="chip">{{ r.sub_category }}</span>
            <span v-if="r.city" class="chip">{{ r.city }}{{ r.state ? ', ' + r.state : '' }}</span>
            <span v-if="r.bedrooms != null" class="chip">{{ r.bedrooms }} beds</span>
          </div>
          <div class="price">
            {{ fmtPrice(r.min_price) }} – {{ fmtPrice(r.max_price) }}
          </div>
          <div class="foot">
            <span class="user">{{ r.username }} · {{ fmtDate(r.created_at) }}</span>
            <button class="btn btn-primary btn-sm" @click="message(r)">Message</button>
          </div>
        </div>
      </div>
      <div v-else class="loading">No requests match your search.</div>

      <div v-if="meta && meta.pages > 1" class="pagination">
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
  min-width: 140px;
}

.count {
  margin: 24px 0;
  color: var(--color-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 10px 0 40px;
}

.card {
  background: #fff;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}

.card h3 {
  color: var(--color-dark);
}

.desc {
  color: var(--color-muted);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  background: var(--color-bg-blue);
  color: var(--color-primary);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 500;
}

.price {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.user {
  color: var(--color-muted);
  font-size: 0.8rem;
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
}
</style>
