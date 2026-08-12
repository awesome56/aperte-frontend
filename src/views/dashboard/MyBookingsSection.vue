<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { bookingApi, formatPrice, bookingStatusLabels, type Booking } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const bookings = ref<Booking[]>([])
const loading = ref(true)
const err = ref('')
const msg = ref('')

async function cancel(id: number) {
  try {
    await bookingApi.updateStatus(id, 'cancelled')
    msg.value = 'Booking cancelled.'
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to cancel booking.'
  }
}

async function load() {
  if (!auth.user?.id) return
  try {
    const r = await bookingApi.user(auth.user.id)
    bookings.value = r.data.data
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load bookings.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="page-title">My Bookings</h1>
    <p v-if="msg" class="success-text">{{ msg }}</p>
    <p v-if="err" class="error-text">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="!bookings.length" class="empty">
      <p>You have no bookings yet.</p>
      <RouterLink to="/listings" class="btn btn-primary">Browse Properties</RouterLink>
    </div>
    <div v-else class="book-list">
      <div v-for="b in bookings" :key="b.id" class="book-row">
        <div>
          <strong>Booking #{{ b.id }} · Property {{ b.property_id }}</strong>
          <span class="book-meta">{{ b.check_in || '—' }} → {{ b.check_out || '—' }} · {{ formatPrice(b.total, 'NGN') }} · {{ b.guests }} guest(s)</span>
        </div>
        <span class="status-badge" :class="b.status">{{ bookingStatusLabels[b.status] || b.status }}</span>
        <button v-if="b.status === 'pending' || b.status === 'confirmed'" class="btn btn-danger btn-sm" @click="cancel(b.id)">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 18px;
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

.book-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.book-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1.5px solid var(--color-border, #e8ecf3);
  border-radius: 12px;
  padding: 14px 16px;
  flex-wrap: wrap;
}

.book-row > div {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.book-meta {
  color: var(--color-muted, #777);
  font-size: 0.85rem;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.pending { background: #fff4e5; color: #b7791f; }
.status-badge.confirmed { background: #e6f7ec; color: #1a7f37; }
.status-badge.completed { background: #eef4ff; color: #0a84ff; }
.status-badge.cancelled { background: #ffeceb; color: #d0342c; }

@media (max-width: 520px) {
  .book-row {
    flex-direction: column;
    align-items: stretch;
  }
  .book-row .btn {
    align-self: flex-start;
  }
}
</style>
