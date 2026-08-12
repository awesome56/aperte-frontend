<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { requestApi, type Request, type Paginated } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const requests = ref<Request[]>([])
const meta = ref<Paginated<Request>['meta'] | null>(null)
const loading = ref(true)
const err = ref('')
const msg = ref('')
const page = ref(1)

function fmtPrice(v: number | null | undefined) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)
}

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

async function load() {
  if (!auth.user?.id) return
  loading.value = true
  err.value = ''
  try {
    const res = await requestApi.list(auth.user.id, { page: page.value, per_page: 20 })
    requests.value = res.data.data
    meta.value = res.data.meta
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load requests.'
  } finally {
    loading.value = false
  }
}

async function remove(id: number) {
  if (!window.confirm('Delete this request?')) return
  try {
    await requestApi.remove(id)
    msg.value = 'Request deleted.'
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete request.'
  }
}

function edit(id: number) {
  router.push({ name: 'create-request', query: { edit: id } })
}

onMounted(load)
</script>

<template>
  <div class="reqs container">
    <div class="head">
      <div>
        <h1>My Requests</h1>
        <p class="sub">Requests you have posted for property owners to see</p>
      </div>
      <RouterLink to="/create-request" class="btn btn-primary">+ New Request</RouterLink>
    </div>

    <p v-if="msg" class="success-text banner">{{ msg }}</p>
    <p v-if="err" class="error-text banner">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="!requests.length" class="empty">
      <p>You have not created any requests yet.</p>
      <RouterLink to="/create-request" class="btn btn-primary">Create Your First Request</RouterLink>
    </div>

    <div v-else class="list">
      <div v-for="r in requests" :key="r.id" class="card">
        <div class="card-main">
          <h3>{{ r.title }}</h3>
          <p class="desc">{{ r.description }}</p>
          <div class="chips">
            <span class="chip">{{ r.property_type }}</span>
            <span v-if="r.sub_category" class="chip">{{ r.sub_category }}</span>
            <span class="chip">{{ r.city || '—' }}, {{ r.state || '—' }}</span>
          </div>
          <div class="specs">
            <span v-if="r.bedrooms != null">{{ r.bedrooms }} beds</span>
            <span v-if="r.bathrooms != null">{{ r.bathrooms }} baths</span>
            <span v-if="r.area != null">{{ r.area }} m²</span>
            <span>₦{{ fmtPrice(r.min_price) }} – ₦{{ fmtPrice(r.max_price) }}</span>
          </div>
        </div>
        <div class="card-side">
          <span class="date">{{ fmtDate(r.created_at) }}</span>
          <div class="actions">
            <button class="btn btn-outline btn-sm" @click="edit(r.id)">Edit</button>
            <button class="btn btn-danger btn-sm" @click="remove(r.id)">Delete</button>
          </div>
        </div>
      </div>

      <div v-if="meta && meta.pages > 1" class="pagination">
        <button class="btn btn-outline" :disabled="!meta.has_prev" @click="page--; load()">Prev</button>
        <span>Page {{ meta.page }} of {{ meta.pages }}</span>
        <button class="btn btn-outline" :disabled="!meta.has_next" @click="page++; load()">Next</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reqs {
  padding: 50px 0 70px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.head h1 {
  font-size: 2.2rem;
  color: var(--color-purple-dark);
}

.sub {
  color: var(--color-muted);
}

.banner {
  margin-bottom: 16px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  background: #fff;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  padding: 20px 22px;
  flex-wrap: wrap;
}

.card-main {
  flex: 1;
  min-width: 260px;
}

.card-main h3 {
  color: var(--color-dark);
  margin-bottom: 6px;
}

.desc {
  color: var(--color-muted);
  font-size: 0.92rem;
  margin-bottom: 12px;
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.chip {
  background: var(--color-bg-blue);
  color: var(--color-primary);
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 0.78rem;
  font-weight: 500;
}

.specs {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--color-dark);
  font-size: 0.9rem;
}

.card-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.date {
  color: var(--color-muted);
  font-size: 0.82rem;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-danger {
  background: var(--color-danger);
  color: #fff;
}

.empty {
  text-align: center;
  color: var(--color-muted);
  padding: 60px 0;
}

.empty p {
  margin-bottom: 20px;
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
  padding-top: 30px;
}

.pagination span {
  color: var(--color-muted);
}
</style>
