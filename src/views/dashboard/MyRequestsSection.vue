<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { requestApi, type Request } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const requests = ref<Request[]>([])
const loading = ref(true)
const err = ref('')
const msg = ref('')

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
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

async function load() {
  if (!auth.user?.id) return
  try {
    const r = await requestApi.list(auth.user.id, { per_page: 50 })
    requests.value = r.data.data
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load requests.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="sec-head">
      <h1 class="page-title">My Requests</h1>
      <RouterLink to="/create-request" class="btn btn-primary">+ Post a Request</RouterLink>
    </div>
    <p v-if="msg" class="success-text">{{ msg }}</p>
    <p v-if="err" class="error-text">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="!requests.length" class="empty">
      <p>You have not created any requests yet.</p>
      <RouterLink to="/create-request" class="btn btn-primary">Post a Request</RouterLink>
    </div>
    <div v-else class="req-list">
      <div v-for="r in requests" :key="r.id" class="req-card">
        <div class="req-main">
          <strong>{{ r.title }}</strong>
          <span class="req-meta">{{ r.property_type }} · {{ r.city || '—' }}, {{ r.state || '—' }} · {{ fmtDate(r.created_at) }}</span>
          <span class="req-meta">₦{{ r.min_price != null ? r.min_price.toLocaleString() : '—' }} – ₦{{ r.max_price != null ? r.max_price.toLocaleString() : '—' }}</span>
        </div>
        <div class="req-actions">
          <RouterLink :to="{ name: 'messages', query: { request: r.id } }" class="btn btn-primary btn-sm">Messages</RouterLink>
          <RouterLink :to="{ name: 'create-request', query: { edit: r.id } }" class="btn btn-outline btn-sm">Edit</RouterLink>
          <button class="btn btn-danger btn-sm" @click="remove(r.id)">Delete</button>
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

.loading,
.empty {
  text-align: center;
  color: #888;
  padding: 60px 0;
}

.empty p {
  margin-bottom: 16px;
}

.req-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.req-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1.5px solid var(--color-border, #e8ecf3);
  border-radius: 12px;
  padding: 14px 16px;
  flex-wrap: wrap;
}

.req-main {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.req-meta {
  color: var(--color-muted, #777);
  font-size: 0.85rem;
}

.req-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 520px) {
  .req-card {
    flex-direction: column;
    align-items: stretch;
  }
  .req-actions .btn {
    align-self: flex-start;
  }
}
</style>
