<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi, type AdminStats } from '@/api'

const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const err = ref('')

onMounted(async () => {
  try {
    const r = await adminApi.stats()
    stats.value = r.data
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load stats.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="overview">
    <h1 class="page-title">Overview</h1>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="err" class="loading">{{ err }}</div>
    <template v-else-if="stats">
      <!-- Stat cards (from Figma: 4 cards with % change) -->
      <div class="stat-grid">
        <div class="stat-card" style="background:#edeefc">
          <span class="stat-label">Total Users</span>
          <span class="stat-value">{{ stats.total_users }}</span>
          <span class="stat-change up">+{{ stats.total_users > 0 ? 100 : 0 }}%</span>
        </div>
        <div class="stat-card" style="background:#e6f1fd">
          <span class="stat-label">Total Properties</span>
          <span class="stat-value">{{ stats.total_properties }}</span>
          <span class="stat-change up">+{{ stats.total_properties > 0 ? 100 : 0 }}%</span>
        </div>
        <div class="stat-card" style="background:#edeefc">
          <span class="stat-label">Pending Approval</span>
          <span class="stat-value">{{ stats.pending_properties }}</span>
          <span class="stat-change down">{{ stats.pending_properties > 0 ? 'Needs review' : 'All approved' }}</span>
        </div>
        <div class="stat-card" style="background:#e6f1fd">
          <span class="stat-label">Bookings</span>
          <span class="stat-value">{{ stats.total_bookings }}</span>
          <span class="stat-change up">{{ stats.total_rooms }} rooms</span>
        </div>
      </div>

      <!-- Content blocks (from Figma: Total Users chart + lists) -->
      <div class="blocks">
        <div class="block block-wide">
          <h3>Properties by Category</h3>
          <div class="cat-list">
            <div class="cat-row">
              <span class="cat-name"><span class="swatch" style="background:#0a84ff"></span> Hotels</span>
              <span class="cat-count">{{ stats.hotels }}</span>
            </div>
            <div class="cat-row">
              <span class="cat-name"><span class="swatch" style="background:#71dd8c"></span> Shortlets</span>
              <span class="cat-count">{{ stats.shortlets }}</span>
            </div>
            <div class="cat-row">
              <span class="cat-name"><span class="swatch" style="background:#b899eb"></span> Approved</span>
              <span class="cat-count">{{ stats.approved_properties }}</span>
            </div>
          </div>
        </div>

        <div class="block">
          <h3>Quick Actions</h3>
          <RouterLink to="/admin/properties?status=pending" class="action-link">
            Review Pending Properties →
          </RouterLink>
          <RouterLink to="/admin/users" class="action-link">
            Manage Users →
          </RouterLink>
          <RouterLink to="/admin/properties" class="action-link">
            All Properties →
          </RouterLink>
        </div>
      </div>

      <!-- Analytics -->
      <div class="analytics-banner">
        <h2>Site Analytics</h2>
        <p>Visitors, sessions, page views, property performance, traffic sources, devices and real-time activity.</p>
        <RouterLink to="/admin/analytics" class="action-link">Open Analytics Dashboard →</RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 24px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.85rem;
  color: #444;
}

.stat-value {
  font-size: 2rem;
  font-weight: 600;
  color: #1c1c1c;
}

.stat-change {
  font-size: 0.8rem;
  font-weight: 500;
}

.stat-change.up {
  color: #0a84ff;
}

.stat-change.down {
  color: #ff453a;
}

.blocks {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
}

.block {
  background: #f9f9fa;
  border-radius: 14px;
  padding: 22px;
}

.block h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1c1c1c;
}

.cat-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #fff;
  border-radius: 10px;
}

.cat-name {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #333;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.cat-count {
  font-weight: 600;
  color: #1c1c1c;
}

.action-link {
  display: block;
  padding: 12px 14px;
  background: #fff;
  border-radius: 10px;
  color: #0a84ff;
  font-size: 0.92rem;
  margin-bottom: 10px;
}

.action-link:hover {
  background: #eef4ff;
}

.analytics-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 30px 0 16px;
}

.analytics-banner {
  background: linear-gradient(120deg, #eef4ff, #e6f1fd);
  border-radius: 14px;
  padding: 24px;
  margin-top: 30px;
}

.analytics-banner h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 6px;
}

.analytics-banner p {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 14px;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fff;
  border-radius: 10px;
}

.rank-row:hover {
  background: #eef4ff;
}

.rank-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #0a84ff;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.rank-thumb {
  width: 42px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.rank-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.rank-info strong {
  color: #1c1c1c;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-meta {
  color: #9aa0a6;
  font-size: 0.78rem;
}

.rank-count {
  color: #0a84ff;
  font-weight: 600;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.rank-empty {
  color: #9aa0a6;
  font-size: 0.9rem;
  padding: 20px 0;
}

.day-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 140px;
}

.day-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
}

.bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 100%;
  background: linear-gradient(180deg, #0a84ff, #66b0ff);
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  transition: height 0.3s;
}

.day-label {
  font-size: 0.62rem;
  color: #9aa0a6;
  transform: rotate(-30deg);
  white-space: nowrap;
}

.page-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-radius: 8px;
  font-size: 0.85rem;
}

.page-path {
  color: #333;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-count {
  font-weight: 600;
  color: #0a84ff;
  margin-left: 10px;
}

.loading {
  text-align: center;
  color: #9aa0a6;
  padding: 60px;
}

@media (max-width: 900px) {
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
  .blocks {
    grid-template-columns: 1fr;
  }
}
</style>
