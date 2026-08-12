<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi, type AdminProperty, formatPrice } from '@/api'

const route = useRoute()
const router = useRouter()

const props = ref<AdminProperty[]>([])
const meta = ref({ page: 1, pages: 1, total_count: 0, has_next: false, has_prev: false })
const page = ref(1)
const status = ref((route.query.status as string) || 'all')
const search = ref('')
const loading = ref(true)
const msg = ref('')
const err = ref('')

async function load() {
  loading.value = true
  try {
    const r = await adminApi.properties({
      page: page.value,
      per_page: 15,
      status: status.value === 'all' ? undefined : status.value,
      search: search.value || undefined,
    })
    props.value = r.data.data
    meta.value = r.data.meta
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load properties.'
  } finally {
    loading.value = false
  }
}

function setStatus(s: string) {
  status.value = s
  page.value = 1
  router.replace({ query: { status: s === 'all' ? undefined : s } })
  load()
}

async function approve(p: AdminProperty) {
  try {
    await adminApi.approve(p.id)
    msg.value = `"${p.title}" approved.`
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to approve.'
  }
}

async function reject(p: AdminProperty) {
  try {
    await adminApi.reject(p.id)
    msg.value = `"${p.title}" rejected.`
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to reject.'
  }
}

async function remove(p: AdminProperty) {
  if (!confirm(`Delete "${p.title}"? This removes its images, videos, rooms and bookings.`)) return
  try {
    await adminApi.deleteProperty(p.id)
    msg.value = `"${p.title}" deleted.`
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete.'
  }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div class="props">
    <div class="head">
      <h1 class="page-title">Properties</h1>
      <div class="search">
        <input v-model="search" type="text" placeholder="Search properties…" @keyup.enter="page = 1; load()" />
        <button class="btn" @click="page = 1; load()">Search</button>
      </div>
    </div>

    <div class="tabs">
      <button :class="{ active: status === 'all' }" @click="setStatus('all')">All</button>
      <button :class="{ active: status === 'pending' }" @click="setStatus('pending')">Pending</button>
      <button :class="{ active: status === 'approved' }" @click="setStatus('approved')">Approved</button>
    </div>

    <p v-if="msg" class="ok">{{ msg }}</p>
    <p v-if="err" class="bad">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Category</th>
          <th>Price</th>
          <th>Owner</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in props" :key="p.id">
          <td data-label="Property">
            <div class="p-cell">
              <img v-if="p.dp" :src="p.dp" alt="" class="thumb" />
              <div class="no-thumb" v-else></div>
              <div>
                <RouterLink :to="`/properties/${p.id}`" class="p-title">{{ p.title }}</RouterLink>
                <span class="p-loc">{{ p.city }}, {{ p.state }}</span>
              </div>
            </div>
          </td>
          <td data-label="Category">{{ p.category }}</td>
          <td data-label="Price">{{ formatPrice(p.price, p.currency) }}</td>
          <td data-label="Owner">{{ p.username || '—' }}</td>
          <td data-label="Status">
            <span class="pill" :class="p.approved ? 'ok' : 'no'">
              {{ p.approved ? 'Approved' : 'Pending' }}
            </span>
          </td>
          <td class="actions" data-label="Actions">
            <button v-if="!p.approved" class="btn small" @click="approve(p)">Approve</button>
            <button v-else class="btn small outline" @click="reject(p)">Reject</button>
            <button class="btn small danger" @click="remove(p)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="meta.pages > 1" class="pagination">
      <button class="btn small" :disabled="!meta.has_prev" @click="page--; load()">Prev</button>
      <span>{{ meta.page }} / {{ meta.pages }} ({{ meta.total_count }})</span>
      <button class="btn small" :disabled="!meta.has_next" @click="page++; load()">Next</button>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 20px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.search {
  display: flex;
  gap: 8px;
}

.search input {
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 0.9rem;
  min-width: 220px;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.tabs button {
  border: none;
  background: #f5f5f7;
  border-radius: 8px;
  padding: 8px 18px;
  font-weight: 500;
  font-size: 0.88rem;
  color: #555;
  cursor: pointer;
}

.tabs button.active {
  background: #0a84ff;
  color: #fff;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 9px 16px;
  background: #0a84ff;
  color: #fff;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn.small {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.btn.outline {
  background: #fff;
  color: #0a84ff;
  border: 1.5px solid #0a84ff;
}

.btn.danger {
  background: #ff453a;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ok {
  color: #28a745;
  margin-bottom: 12px;
}

.bad {
  color: #ff453a;
  margin-bottom: 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  overflow: hidden;
  font-size: 0.9rem;
}

.table th {
  text-align: left;
  padding: 12px 16px;
  background: #f9f9fa;
  color: #666;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table td {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f2;
}

.p-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.thumb {
  width: 48px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}

.no-thumb {
  width: 48px;
  height: 40px;
  border-radius: 6px;
  background: #f0f0f2;
}

.p-title {
  color: #1c1c1c;
  font-weight: 500;
}

.p-title:hover {
  color: #0a84ff;
}

.p-loc {
  display: block;
  color: #9aa0a6;
  font-size: 0.8rem;
}

.pill {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.pill.ok {
  background: #e6f7ec;
  color: #1a7f37;
}

.pill.no {
  background: #ffeceb;
  color: #d0342c;
}

.actions {
  display: flex;
  gap: 6px;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  color: #666;
}

.loading {
  text-align: center;
  color: #9aa0a6;
  padding: 60px;
}
</style>
