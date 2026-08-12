<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { favoriteApi, type Property } from '@/api'
import { categoryLabels, purposeLabels, formatPrice } from '@/api'

const props = defineProps<{ property: Property }>()

const router = useRouter()
const auth = useAuthStore()

const dpImage = computed(() => {
  // browse/list responses provide a ready `dp` URL; fall back to the images array
  if (props.property.dp) return props.property.dp
  const imgs = props.property.images || []
  const dp = imgs.find((i: any) => i.dp === 1)
  return dp?.image_url || imgs[0]?.image_url || ''
})

const badge = computed(() => categoryLabels[props.property.category] || props.property.category)
const purpose = computed(() => purposeLabels[props.property.purpose] || props.property.purpose)

const favorited = ref(Boolean(props.property.favorited))
const favoritesCount = ref(props.property.favorites_count || 0)

async function toggleFavorite(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  try {
    await favoriteApi.toggle(props.property.id)
    favorited.value = !favorited.value
    favoritesCount.value += favorited.value ? 1 : -1
  } catch {
    // ignore toggle errors (e.g. offline)
  }
}
</script>

<template>
  <div class="card">
    <button class="heart" :class="{ active: favorited }" title="Save to favorites" @click="toggleFavorite">
      <svg v-if="favorited" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </button>
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
  position: relative;
}
.card:hover { transform: translateY(-4px); }

.heart {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 5;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.92);
  color: #8a8f9c;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: transform 0.15s, color 0.15s;
}
.heart:hover { transform: scale(1.1); color: #ff4757; }
.heart.active { color: #ff4757; }

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
