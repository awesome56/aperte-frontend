<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { propertyApi, formatPrice } from '@/api'

interface MyAnalytics {
  totals: {
    properties: number
    views: number
    favorites: number
    requests: number
    request_responses: number
    messages_received: number
    messages_sent: number
  }
  properties: {
    id: number
    title: string
    dp: string
    views: number
    favorites: number
    bookings: { total: number; pending: number; confirmed: number; completed: number; cancelled: number }
    created_at: string
  }[]
  requests: { id: number; title: string; responses: number; created_at: string }[]
}

const data = ref<MyAnalytics | null>(null)
const loading = ref(true)
const err = ref('')

onMounted(async () => {
  try {
    const r = await propertyApi.myAnalytics()
    data.value = r.data as unknown as MyAnalytics
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load analytics.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="myanalytics">
    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="err" class="loading">{{ err }}</div>

    <template v-else-if="data">
      <div v-if="!data.totals.properties && !data.totals.requests" class="empty">
        <p>Post a property or request to start seeing analytics.</p>
        <div class="empty-actions">
          <RouterLink to="/add-listing" class="btn btn-primary">Add Listing</RouterLink>
          <RouterLink to="/create-request" class="btn btn-outline">Post a Request</RouterLink>
        </div>
      </div>

      <template v-else>
        <!-- totals -->
        <div class="stat-grid">
          <div class="stat-card"><span>Properties</span><b>{{ data.totals.properties }}</b></div>
          <div class="stat-card"><span>Total views</span><b>{{ data.totals.views.toLocaleString() }}</b></div>
          <div class="stat-card"><span>Favorites</span><b>{{ data.totals.favorites }}</b></div>
          <div class="stat-card"><span>Requests</span><b>{{ data.totals.requests }}</b></div>
          <div class="stat-card"><span>Request responses</span><b>{{ data.totals.request_responses }}</b></div>
          <div class="stat-card"><span>Messages received</span><b>{{ data.totals.messages_received }}</b></div>
        </div>

        <!-- per property -->
        <section v-if="data.properties.length" class="block">
          <h2>Your Properties</h2>
          <div class="prop-rows">
            <RouterLink v-for="p in data.properties" :key="p.id" :to="`/properties/${p.id}`" class="prop-row">
              <img v-if="p.dp" :src="p.dp" alt="" />
              <div class="prop-ph" v-else></div>
              <div class="prop-info">
                <strong>{{ p.title }}</strong>
                <span class="prop-stats">
                  {{ p.views }} views · {{ p.favorites }} ♥ · {{ p.bookings.total }} bookings
                  <template v-if="p.bookings.pending"> · {{ p.bookings.pending }} pending</template>
                </span>
              </div>
            </RouterLink>
          </div>
        </section>

        <!-- per request -->
        <section v-if="data.requests.length" class="block">
          <h2>Your Requests</h2>
          <div class="req-rows">
            <RouterLink
              v-for="r in data.requests"
              :key="r.id"
              :to="{ name: 'messages', query: { request: r.id } }"
              class="req-row"
            >
              <div class="req-info">
                <strong>{{ r.title }}</strong>
                <span class="req-stats">{{ r.responses }} response{{ r.responses === 1 ? '' : 's' }}</span>
              </div>
              <span class="link">Messages →</span>
            </RouterLink>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.sub {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card {
  background: #f8f9fc;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-card span {
  font-size: 0.78rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.stat-card b {
  font-size: 1.5rem;
  color: #1c1c1c;
}

.block {
  margin-bottom: 24px;
}

.block h2 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.prop-rows,
.req-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prop-row,
.req-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  padding: 10px 12px;
  text-decoration: none;
}

.prop-row:hover,
.req-row:hover {
  border-color: #0a84ff;
}

.prop-row img,
.prop-ph {
  width: 56px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.prop-ph {
  background: #eef0f3;
}

.prop-info,
.req-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.prop-info strong,
.req-info strong {
  color: #1c1c1c;
  font-size: 0.92rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prop-stats,
.req-stats {
  color: #888;
  font-size: 0.82rem;
}

.link {
  color: #0a84ff;
  font-size: 0.82rem;
  font-weight: 600;
}

.empty {
  text-align: center;
  color: #888;
  padding: 60px 0;
}

.empty p {
  margin-bottom: 16px;
}

.empty-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.loading {
  text-align: center;
  color: #888;
  padding: 60px;
}

@media (max-width: 600px) {
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
