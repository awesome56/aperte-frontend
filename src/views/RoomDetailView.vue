<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { roomApi, propertyApi, type Room, type Property, formatPrice } from '@/api'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const room = ref<Room | null>(null)
const property = ref<Property | null>(null)
const loading = ref(true)
const error = ref('')
const activeImage = ref(0)

const images = computed(() => room.value?.images || [])
const mainImage = computed(() => images.value[activeImage.value]?.image_url || images.value[0]?.image_url || '')

const isOwner = computed(() => property.value?.user_id === auth.user?.id)

function book() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  router.push({ path: `/properties/${property.value?.id}`, query: { room: room.value?.id } })
}

onMounted(async () => {
  const id = Number(route.params.id)
  try {
    const r = await roomApi.get(id)
    room.value = r.data
    const p = await propertyApi.get(r.data.property_id)
    property.value = p.data
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Room not found.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="room-page" v-if="room">
    <div class="container">
      <div class="breadcrumb">
        <RouterLink :to="`/properties/${property?.id}`">{{ property?.title }}</RouterLink>
        <span> / </span>
        <span>{{ room.room_type }}</span>
      </div>

      <!-- Gallery -->
      <div class="gallery">
        <div class="gallery-main">
          <img v-if="mainImage" :src="mainImage" :alt="room.room_type" />
          <div v-else class="placeholder">{{ room.room_type }}</div>
        </div>
        <div v-if="images.length > 1" class="gallery-thumbs">
          <img
            v-for="(img, i) in images"
            :key="img.id"
            :src="img.image_url"
            :class="{ active: i === activeImage }"
            @click="activeImage = i"
          />
        </div>
      </div>

      <div class="content">
        <div class="main">
          <h1>{{ room.room_type }}</h1>
          <p class="meta">Room at {{ property?.title }}</p>
          <p class="meta">{{ property?.location }}, {{ property?.city }}, {{ property?.state }}</p>

          <div class="block">
            <h3>Room Details</h3>
            <div class="details">
              <div class="detail"><span>Beds</span><b>{{ room.beds }}</b></div>
              <div class="detail"><span>Status</span><b :class="room.available ? 'ok' : 'no'">{{ room.available ? 'Available' : 'Unavailable' }}</b></div>
              <div class="detail"><span>Price</span><b>{{ formatPrice(room.price, property?.currency) }}/night</b></div>
            </div>
          </div>

          <div v-if="room.amenities && Object.keys(room.amenities).length" class="block">
            <h3>Amenities</h3>
            <div class="amenities">
              <span v-for="(v, k) in room.amenities" :key="k" class="amenity">✓ {{ k }}</span>
            </div>
          </div>
        </div>

        <div class="side">
          <div class="book-card">
            <span class="price">{{ formatPrice(room.price, property?.currency) }}</span>
            <span class="per">/ night</span>
            <button class="btn btn-primary btn-block" @click="book">Book This Room</button>
            <RouterLink :to="`/properties/${property?.id}`" class="btn btn-outline btn-block">View All Rooms</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="loading" class="loading">Loading…</div>
  <div v-else class="loading">{{ error }}</div>
</template>

<style scoped>
.room-page { padding: 40px 0 70px; }

.breadcrumb { margin-bottom: 20px; color: var(--clr-muted); font-size: 0.95rem; }
.breadcrumb a { color: var(--clr-blue); }

.gallery-main {
  border-radius: 14px; overflow: hidden; height: 440px;
  background: linear-gradient(135deg, var(--clr-blue2), var(--clr-purple-btn));
}
.gallery-main img { width: 100%; height: 100%; object-fit: cover; }
.placeholder { width: 100%; height: 100%; display: grid; place-items: center; color: #fff; font-size: 1.5rem; }

.gallery-thumbs { display: flex; gap: 12px; margin-top: 12px; }
.gallery-thumbs img { width: 120px; height: 80px; object-fit: cover; border-radius: 8px; cursor: pointer; opacity: 0.6; border: 2px solid transparent; }
.gallery-thumbs img.active { opacity: 1; border-color: var(--clr-blue); }

.content { display: grid; grid-template-columns: 1fr 320px; gap: 40px; margin-top: 36px; }
.main h1 { font-size: 2rem; color: var(--clr-dark); margin-bottom: 6px; }
.meta { color: var(--clr-muted); margin-bottom: 4px; }

.block { margin-top: 30px; }
.block h3 { font-size: 1.2rem; color: var(--clr-dark); margin-bottom: 14px; }

.details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.detail { background: var(--clr-white); border: 1px solid var(--clr-line); border-radius: 10px; padding: 16px; }
.detail span { display: block; color: var(--clr-muted); font-size: 0.9rem; }
.detail b { color: var(--clr-dark); font-size: 1.1rem; }
.detail .ok { color: var(--clr-green); }
.detail .no { color: var(--clr-red); }

.amenities { display: flex; flex-wrap: wrap; gap: 10px; }
.amenity { background: var(--clr-blue-bg); color: var(--clr-blue); border-radius: 8px; padding: 8px 14px; font-size: 0.9rem; }

.side .book-card { background: var(--clr-white); border: 1px solid var(--clr-line); border-radius: 14px; padding: 24px; position: sticky; top: 100px; }
.book-card .price { font-size: 1.9rem; font-weight: 600; color: var(--clr-dark); }
.book-card .per { color: var(--clr-muted); }
.book-card .btn { margin-top: 14px; }

@media (max-width: 800px) { .content { grid-template-columns: 1fr; } .details { grid-template-columns: 1fr; } }
</style>
