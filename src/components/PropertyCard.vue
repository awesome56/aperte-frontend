<script setup lang="ts">
import { computed } from 'vue'
import type { Property } from '@/api'
import { categoryLabels, purposeLabels, formatPrice, pricePeriod } from '@/api'
import FavoriteButton from '@/components/FavoriteButton.vue'

const props = defineProps<{ property: Property }>()

const dpImage = computed(() => {
  if (props.property.dp) return props.property.dp
  const imgs = props.property.images || []
  const dp = imgs.find((i: any) => i.dp === 1)
  return dp?.image_url || imgs[0]?.image_url || ''
})

const badge = computed(() => categoryLabels[props.property.category] || props.property.category)
const purpose = computed(() => purposeLabels[props.property.purpose] || props.property.purpose)

const imageCount = computed(() => props.property.image_count ?? props.property.images?.length ?? 0)
const videoCount = computed(() => props.property.video_count ?? props.property.videos?.length ?? 0)

const verified = computed(() => Boolean(props.property.approved))
</script>

<template>
  <article class="card">
    <RouterLink :to="`/properties/${property.id}`" class="media" :aria-label="property.title">
      <img v-if="dpImage" :src="dpImage" :alt="property.title" loading="lazy" />
      <div v-else class="placeholder">{{ badge }}</div>

      <div class="media-top">
        <span class="badge" :class="property.purpose">{{ purpose }}</span>
        <span v-if="verified" class="verified-badge" title="Aperte verified">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 20 12 16.77 5.82 20 7 13.14l-5-4.87 6.91-1.01L12 1z"/></svg>
          Verified
        </span>
      </div>

      <FavoriteButton class="heart" :property-id="property.id" :favorited="property.favorited" />

      <div class="media-badges">
        <span v-if="videoCount" class="count-badge video" title="Video available">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </span>
        <span v-if="imageCount" class="count-badge">{{ imageCount }}</span>
      </div>

      <div v-if="property.available === 0" class="unavailable">
        <span>Unavailable</span>
      </div>
    </RouterLink>

    <div class="body">
      <span class="price">{{ formatPrice(property.price, property.currency) }}<span class="period">{{ pricePeriod(property.category, property.purpose) }}</span></span>
      <h3 class="title"><RouterLink :to="`/properties/${property.id}`">{{ property.title }}</RouterLink></h3>
      <p class="loc">{{ property.city }}, {{ property.state }}</p>

      <div class="specs">
        <span v-if="property.bedrooms != null">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M2 16h20v3H2zM3 15V9a2 2 0 0 1 2-2h3l2 3h4V7h4a2 2 0 0 1 2 2v6H3z"/></svg>
          {{ property.bedrooms }}
        </span>
        <span v-if="property.bathrooms != null">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm9.5 3h-1a1.5 1.5 0 0 0-1.5 1.5V10H7V7.5A1.5 1.5 0 0 0 5.5 6h-1A1.5 1.5 0 0 0 3 7.5V13h18V7.5A1.5 1.5 0 0 0 19.5 6h-1A1.5 1.5 0 0 0 17 7.5V10h-3V7.5A1.5 1.5 0 0 0 12.5 6h-.1A1.5 1.5 0 0 0 11 7.5V10H9V7.5A1.5 1.5 0 0 0 7.5 6H7a2 2 0 0 0-1.5.7V13h13V7.5A1.5 1.5 0 0 0 17 6h-1a1.5 1.5 0 0 0-1.5 1.5V10h1V7.5zM2 15h20v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1z"/></svg>
          {{ property.bathrooms }}
        </span>
        <span v-if="property.area != null">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
          {{ property.area }} m²
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #eef0f3;
  box-shadow: 0 2px 12px rgba(16, 30, 60, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(16, 30, 60, 0.12);
}

.media {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #eef0f3;
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s;
}

.card:hover .media img {
  transform: scale(1.04);
}

.placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #e8ecf4, #d9e2f0);
  color: #8a94a6;
  font-size: 1rem;
}

.media-top {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 48px;
  display: flex;
  gap: 6px;
  align-items: center;
  pointer-events: none;
}

.badge {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  backdrop-filter: blur(4px);
}

.badge.rent {
  background: rgba(16, 138, 74, 0.92);
  color: #fff;
}

.badge.sale {
  background: rgba(216, 60, 60, 0.92);
  color: #fff;
}

.badge.both {
  background: rgba(10, 84, 255, 0.92);
  color: #fff;
}

.verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  color: #1a7f37;
  font-size: 0.72rem;
  font-weight: 700;
}

.heart {
  position: absolute;
  top: 10px;
  right: 10px;
}

.media-badges {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
  pointer-events: none;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(10, 12, 20, 0.62);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
}

.count-badge.video {
  background: rgba(255, 255, 255, 0.94);
  color: #0a84ff;
}

.unavailable {
  position: absolute;
  top: 12px;
  right: 56px;
  left: auto;
}

.unavailable span {
  background: rgba(10, 12, 20, 0.72);
  color: #fff;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 700;
}

.period {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-muted, #888);
}

.body {
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.price {
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--clr-dark, #151a24);
}

.title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
}

.title a {
  color: var(--clr-dark, #1c1c1c);
}

.title a:hover {
  color: var(--clr-blue, #0a84ff);
}

.loc {
  color: var(--clr-muted, #666);
  font-size: 0.9rem;
  margin: 0;
}

.specs {
  display: flex;
  gap: 14px;
  margin-top: 8px;
  color: var(--clr-dark, #333);
  font-size: 0.85rem;
  font-weight: 500;
}

.specs span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.specs svg {
  color: var(--clr-blue2, #0a84ff);
}
</style>
