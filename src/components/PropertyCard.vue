<script setup lang="ts">
import type { Property } from '@/api'
import { categoryLabels, purposeLabels } from '@/api'

const props = defineProps<{ property: Property }>()

const dpImage = computed(() => {
  const imgs = props.property.images || []
  return imgs.find((i: any) => i.dp === 1)?.image_url || imgs[0]?.image_url || ''
})

import { computed } from 'vue'

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}
</script>

<template>
  <div class="card">
    <RouterLink :to="`/properties/${property.id}`" class="media">
      <img v-if="dpImage" :src="dpImage" :alt="property.title" loading="lazy" />
      <div v-else class="placeholder">Aperte</div>
      <span class="badge">{{ categoryLabels[property.category] || property.category }}</span>
      <span class="purpose" :class="property.purpose">{{ purposeLabels[property.purpose] || property.purpose }}</span>
    </RouterLink>
    <div class="body">
      <h3 class="title">
        <RouterLink :to="`/properties/${property.id}`">{{ property.title }}</RouterLink>
      </h3>
      <p class="location">{{ property.location }}, {{ property.city }}, {{ property.state }}</p>
      <div class="meta">
        <span v-if="property.bedrooms">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h20v-6a3 3 0 0 0-3-3H2v9zm0-2v-5h15v5H2zm0 2v1a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-1H2z"/></svg>
          {{ property.bedrooms }} Bed
        </span>
        <span v-if="property.bathrooms">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21v-2h20v2H2zM4 17v-4a6 6 0 0 1 12 0h2a8 8 0 0 0-16 0v4h2z"/></svg>
          {{ property.bathrooms }} Bath
        </span>
        <span v-if="property.area">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/></svg>
          {{ fmt(property.area) }} m²
        </span>
      </div>
      <div class="footer-row">
        <span class="price">${{ fmt(property.price) }}</span>
        <RouterLink :to="`/properties/${property.id}`" class="btn btn-primary btn-sm">View</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.media {
  position: relative;
  display: block;
  height: 220px;
  overflow: hidden;
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--color-blue-2), var(--color-purple));
  color: #fff;
  font-weight: 600;
  font-size: 1.3rem;
}

.badge {
  position: absolute;
  top: 14px;
  left: 14px;
  background: rgba(255, 255, 255, 0.95);
  color: var(--color-purple-dark);
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.purpose {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
}

.purpose.rent {
  background: var(--color-accent);
}

.purpose.sale {
  background: var(--color-pink);
}

.purpose.both {
  background: var(--color-blue-2);
}

.body {
  padding: 18px 20px 20px;
}

.title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-purple-dark);
  margin-bottom: 6px;
}

.title a {
  color: inherit;
}

.title a:hover {
  color: var(--color-primary);
}

.location {
  color: var(--color-muted);
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.meta {
  display: flex;
  gap: 16px;
  color: var(--color-muted);
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-border);
  padding-top: 14px;
}

.price {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-primary);
}
</style>
