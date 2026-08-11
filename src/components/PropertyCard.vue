<script setup lang="ts">
import { computed } from 'vue'
import type { Property } from '@/api'
import { categoryLabels, purposeLabels, formatPrice } from '@/api'

const props = defineProps<{ property: Property }>()

const dpImage = computed(() => {
  // browse/list responses provide a ready `dp` URL; fall back to the images array
  if (props.property.dp) return props.property.dp
  const imgs = props.property.images || []
  const dp = imgs.find((i: any) => i.dp === 1)
  return dp?.image_url || imgs[0]?.image_url || ''
})

const badge = computed(() => categoryLabels[props.property.category] || props.property.category)
const purpose = computed(() => purposeLabels[props.property.purpose] || props.property.purpose)
</script>

<template>
  <div class="card">
    <RouterLink :to="`/properties/${property.id}`" class="media">
      <img v-if="dpImage" :src="dpImage" :alt="property.title" loading="lazy" />
      <div v-else class="placeholder">{{ badge }}</div>
      <span class="badge" :class="property.purpose">{{ purpose }}</span>
    </RouterLink>
    <div class="body">
      <span class="price">{{ formatPrice(property.price, property.currency) }}</span>
      <h3 class="title"><RouterLink :to="`/properties/${property.id}`">{{ property.title }}</RouterLink></h3>
      <p class="loc">{{ property.location }}, {{ property.city }}, {{ property.state }}</p>
      <div v-if="property.contact_phone || property.contact_email" class="contacts">
        <a v-if="property.contact_phone" :href="`tel:${property.contact_phone}`">{{ property.contact_phone }}</a>
        <a v-if="property.contact_email" :href="`mailto:${property.contact_email}`">{{ property.contact_email }}</a>
      </div>
      <div class="meta">
        <span v-if="property.bedrooms != null">{{ property.bedrooms }} Beds</span>
        <span v-if="property.bathrooms != null">{{ property.bathrooms }} Bath</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  transition: transform 0.2s;
  width: 100%;
}
.card:hover { transform: translateY(-4px); }

.media { position: relative; display: block; height: 340px; overflow: hidden; }
.media img { width: 100%; height: 100%; object-fit: cover; }
.placeholder { width:100%; height:100%; display:grid; place-items:center; background:#e8eaef; color:#9aa0ac; font-size:1rem; }

.badge {
  position: absolute; top: 14px; left: 14px;
  padding: 9px 18px; border-radius: 8px;
  font-size: 0.88rem; font-weight: 500;
}
.badge.rent { background: var(--clr-green-bg); color: var(--clr-green); }
.badge.sale { background: var(--clr-red-bg); color: var(--clr-red); }
.badge.both { background: var(--clr-blue-bg); color: var(--clr-blue); }

.body { padding: 18px 20px 20px; }
.price { font-size: 1.72rem; font-weight: 600; color: var(--clr-dark); display: block; }
.title { margin: 4px 0 4px; font-size: 1.2rem; font-weight: 500; }
.title a { color: var(--clr-dark); }
.title a:hover { color: var(--clr-blue); }
.loc { color: var(--clr-muted); font-size: 1rem; margin-bottom: 12px; }
.contacts { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
.contacts a { color: var(--clr-blue); font-size: 0.85rem; }
.contacts a:hover { text-decoration: underline; }
.meta { display: flex; gap: 18px; color: var(--clr-dark); font-size: 1rem; font-weight: 400; }
</style>
