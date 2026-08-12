<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi, type PropertyClaim } from '@/api'

const claims = ref<PropertyClaim[]>([])
const filter = ref('pending')
const meta = ref({ page: 1, pages: 1, total_count: 0, has_next: false, has_prev: false })
const page = ref(1)
const loading = ref(true)
const msg = ref('')
const err = ref('')

async function load() {
  loading.value = true
  err.value = ''
  try {
    const r = await adminApi.claims({ status: filter.value || undefined, page: page.value, per_page: 15 })
    claims.value = r.data.data
    meta.value = r.data.meta
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load claims.'
  } finally {
    loading.value = false
  }
}

function setFilter(s: string) {
  filter.value = s
  page.value = 1
  load()
}

async function decide(c: PropertyClaim, approved: boolean) {
  if (!confirm(`${approved ? 'Approve' : 'Reject'} the claim by ${c.user.full_name || c.user.username} for "${c.property.title}"?`)) return
  try {
    const r = await adminApi.claimDecision(c.id, approved)
    msg.value = r.data.message
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update claim.'
  }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div class="claims">
    <div class="head">
      <h1 class="page-title">Property Claims</h1>
      <div class="tabs">
        <button :class="{ active: filter === 'pending' }" @click="setFilter('pending')">Pending</button>
        <button :class="{ active: filter === 'approved' }" @click="setFilter('approved')">Approved</button>
        <button :class="{ active: filter === 'rejected' }" @click="setFilter('rejected')">Rejected</button>
        <button :class="{ active: filter === '' }" @click="setFilter('')">All</button>
      </div>
    </div>

    <p v-if="msg" class="ok">{{ msg }}</p>
    <p v-if="err" class="bad">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Claimant</th>
          <th>Requested</th>
          <th>Status</th>
          <th>Document</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in claims" :key="c.id">
          <td>
            <div class="prop-cell">
              <img v-if="c.property.dp" :src="c.property.dp" class="thumb" alt="" />
              <div>
                <strong>{{ c.property.title }}</strong>
                <span class="sub">{{ c.property.city }}, {{ c.property.state }}</span>
              </div>
            </div>
          </td>
          <td>
            <strong>{{ c.user.full_name || c.user.username }}</strong>
            <span class="sub">{{ c.user.email }}</span>
          </td>
          <td>{{ fmtDate(c.created_at) }}</td>
          <td>
            <span class="pill" :class="c.status">{{ c.status }}</span>
          </td>
          <td>
            <a
              v-if="c.document_url"
              :href="c.document_url"
              target="_blank"
              rel="noopener"
              class="doc-link"
              title="Open the submitted ownership document"
            >
              View document
            </a>
            <span v-else class="muted">—</span>
          </td>
          <td class="actions">
            <template v-if="c.status === 'pending'">
              <button class="btn small" @click="decide(c, true)">Approve</button>
              <button class="btn small danger" @click="decide(c, false)">Reject</button>
            </template>
            <span v-else class="muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="!loading && !claims.length" class="loading">No claims found.</p>

    <div v-if="meta.pages > 1" class="pagination">
      <button class="btn small" :disabled="!meta.has_prev" @click="page--; load()">Prev</button>
      <span>{{ meta.page }} / {{ meta.pages }}</span>
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
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.tabs {
  display: flex;
  gap: 6px;
}

.tabs button {
  padding: 8px 14px;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  background: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  color: #555;
}

.tabs button.active {
  background: #0a84ff;
  border-color: #0a84ff;
  color: #fff;
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

.prop-cell {
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

.sub {
  display: block;
  color: #9aa0a6;
  font-size: 0.8rem;
}

.pill {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.pill.pending {
  background: #fff4e5;
  color: #b7791f;
}

.pill.approved {
  background: #e6f7ec;
  color: #1a7f37;
}

.pill.rejected {
  background: #ffeceb;
  color: #d0342c;
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

.btn.danger {
  background: #ff453a;
}

.actions {
  display: flex;
  gap: 6px;
}

.doc-link {
  color: #0a84ff;
  font-size: 0.85rem;
}

.doc-link:hover {
  text-decoration: underline;
}

.muted {
  color: #9aa0a6;
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
