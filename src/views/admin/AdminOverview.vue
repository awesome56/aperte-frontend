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
