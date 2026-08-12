<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  propertyApi,
  bookingApi,
  roomApi,
  slotApi,
  favoriteApi,
  type Property,
  type Room,
  type Slot,
  categoryLabels,
  purposeLabels,
  formatPrice,
} from '@/api'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const property = ref<Property | null>(null)
const loading = ref(true)
const error = ref('')

const favorited = ref(false)
const favoritesCount = ref(0)

const rooms = ref<Room[]>([])
const slots = ref<Slot[]>([])
const activeImage = ref(0)

// booking state
const bookingOpen = ref(false)
const bookingForm = ref({
  room_id: 0,
  slot_id: 0,
  check_in: '',
  check_out: '',
  guests: 1,
})
const bookingMsg = ref('')
const bookingErr = ref('')
const bookingSubmitting = ref(false)

const mainImage = computed(() => {
  const imgs = property.value?.images || []
  if (imgs.length) return imgs[activeImage.value]?.image_url || imgs[0]?.image_url || ''
  return ''
})

const isBookable = computed(() =>
  ['hotel', 'hall', 'event_center', 'shortlet'].includes(property.value?.category || ''),
)

const isOwner = computed(() => property.value?.user_id === auth.user?.id)

const ownerInitials = computed(() => {
  const name = property.value?.owner_full_name || property.value?.username || ''
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

// Only show the property's own published contact. No fallback to owner placeholders.
const contactPhone = computed(() => property.value?.contact_phone || '')
const contactEmail = computed(() => property.value?.contact_email || '')
const contactWebsite = computed(() => property.value?.contact_website || '')

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

function fmtPrice(n: number | null | undefined) {
  if (n == null) return '—'
  return formatPrice(n, property.value?.currency)
}

function startBooking() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  bookingOpen.value = true
  bookingMsg.value = ''
  bookingErr.value = ''
}

async function toggleFavorite() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  try {
    await favoriteApi.toggle(property.value!.id)
    favorited.value = !favorited.value
    favoritesCount.value += favorited.value ? 1 : -1
    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent(favorited.value ? 'favorite_add' : 'favorite_remove', 'property', { property_id: property.value!.id }),
    )
  } catch (e: any) {
    bookingErr.value = e.response?.data?.error || 'Failed to update favorite.'
  }
}

function messageOwner() {
  if (!property.value) return
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  // quote the property so the owner knows where the message came from
  router.push({
    name: 'messages',
    query: { user: property.value.user_id, property: property.value.id },
  })
}

function callOwner(type: 'audio' | 'video') {
  if (!property.value) return
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  import('@/calls/callManager').then(({ callManager }) => callManager.startCall(property.value!.user_id, type))
}

async function submitBooking() {
  bookingSubmitting.value = true
  bookingErr.value = ''
  bookingMsg.value = ''
  try {
    const payload: Record<string, unknown> = {
      guests: Number(bookingForm.value.guests),
    }
    const cat = property.value?.category
    if (cat === 'hotel') {
      payload.room_id = Number(bookingForm.value.room_id)
      payload.check_in = bookingForm.value.check_in
      payload.check_out = bookingForm.value.check_out
    } else if (cat === 'hall' || cat === 'event_center') {
      payload.slot_id = Number(bookingForm.value.slot_id)
    } else {
      payload.check_in = bookingForm.value.check_in
      payload.check_out = bookingForm.value.check_out
    }
    const res = await bookingApi.create(property.value!.id, payload)
    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent('booking', 'conversion', { property_id: property.value!.id, total: res.data.total }),
    )
    bookingMsg.value = `Booking requested! Total: ${formatPrice(res.data.total, property.value?.currency)} (status: ${res.data.status}).`
    bookingOpen.value = false
  } catch (e: any) {
    bookingErr.value = e.response?.data?.error || 'Booking failed. Please try again.'
  } finally {
    bookingSubmitting.value = false
  }
}

function attr(label: string, key: string) {
  const attrs = property.value?.attributes as Record<string, any> | undefined
  if (!attrs || attrs[key] == null || attrs[key] === '') return null
  return { label, value: attrs[key] }
}

onMounted(async () => {
  const id = Number(route.params.id)
  try {
    const res = await propertyApi.get(id)
    property.value = res.data
    favoritesCount.value = res.data.favorites_count || 0
    if (auth.isAuthenticated) {
      try {
        const fav = await favoriteApi.check(id)
        favorited.value = fav.data.favorited
      } catch {
        // non-fatal: heart defaults to unfavorited
      }
    }
    const cat = res.data.category
    if (cat === 'hotel') {
      const r = await roomApi.list(id)
      rooms.value = r.data.data
    } else if (cat === 'hall' || cat === 'event_center') {
      const s = await slotApi.list(id)
      slots.value = s.data.data.filter((x) => x.status === 'available')
    }
    // If arrived from a room detail page with ?room=<id>, open booking with that room preselected
    const roomId = Number(route.query.room)
    if (roomId && rooms.value.some((x) => x.id === roomId)) {
      bookingForm.value.room_id = roomId
      bookingOpen.value = true
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || e.response?.data?.message || 'Property not found.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="detail" v-if="property">
    <!-- Gallery -->
    <div class="gallery">
      <div class="gallery-main">
        <img v-if="mainImage" :src="mainImage" :alt="property.title" />
        <div v-else class="placeholder">Aperte</div>
      </div>
      <div v-if="property.images.length > 1" class="gallery-thumbs">
        <img
          v-for="(img, i) in property.images"
          :key="img.id"
          :src="img.image_url"
          :class="{ active: i === activeImage }"
          @click="activeImage = i"
        />
      </div>
    </div>

    <!-- Header -->
    <div class="container section compact">
      <div class="top-row">
        <div>
          <div class="chips">
            <span class="chip">{{ categoryLabels[property.category] || property.category }}</span>
            <span class="chip">{{ purposeLabels[property.purpose] || property.purpose }}</span>
          </div>
          <h1>{{ property.title }}</h1>
          <p class="location">
            {{ property.location }}, {{ property.city }}, {{ property.state }}, {{ property.country }}
          </p>
        </div>
        <div class="price-box">
          <span class="price">{{ fmtPrice(property.price) }}</span>
          <button
            class="btn btn-outline btn-block fav-btn"
            :class="{ active: favorited }"
            @click="toggleFavorite"
          >
            {{ favorited ? '♥ Saved' : '♡ Save to Favorites' }}
            <span v-if="favoritesCount" class="fav-count">({{ favoritesCount }})</span>
          </button>
          <button v-if="isBookable" class="btn btn-primary btn-block" @click="startBooking">Book Now</button>
          <button
            v-if="!isOwner"
            class="btn btn-outline btn-block"
            @click="messageOwner"
          >
            Message Owner
          </button>
          <div v-if="!isOwner" class="call-row">
            <button class="btn btn-outline btn-block" @click="callOwner('audio')">Call Owner</button>
            <button class="btn btn-outline btn-block" @click="callOwner('video')">Video Call</button>
          </div>
          <RouterLink
            v-if="!isOwner && contactEmail"
            :to="`mailto:${contactEmail}?subject=${encodeURIComponent(property.title)}`"
            class="btn btn-outline btn-block"
          >
            Email Contact
          </RouterLink>
          <a
            v-if="!isOwner && contactPhone"
            :href="`tel:${contactPhone}`"
            class="btn btn-primary btn-block"
          >
            Call Now
          </a>
        </div>
      </div>

      <!-- Contact card -->
      <div v-if="contactPhone || contactEmail || contactWebsite" class="owner-card">
        <h3 class="subhead">Contact {{ property.title }}</h3>
        <div class="owner-info">
          <div class="owner-avatar">{{ ownerInitials }}</div>
          <div class="owner-details">
            <strong>{{ property.owner_full_name || property.username }}</strong>
            <a v-if="contactPhone" :href="`tel:${contactPhone}`">{{ contactPhone }}</a>
            <a v-if="contactEmail" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
            <a v-if="contactWebsite" :href="contactWebsite" target="_blank" rel="noopener">{{ contactWebsite.replace(/^https?:\/\//, '') }} ↗</a>
          </div>
        </div>
      </div>

      <!-- Videos -->
      <div v-if="property.videos.length" class="videos">
        <h3 class="subhead">Videos</h3>
        <div class="video-list">
          <video v-for="v in property.videos" :key="v.id" :src="v.video_url" controls preload="metadata"></video>
        </div>
      </div>

      <!-- Description -->
      <div class="block">
        <h3 class="subhead">Description</h3>
        <p class="desc">{{ property.description }}</p>
      </div>

      <!-- Attributes -->
      <div v-if="property.attributes && Object.keys(property.attributes).length" class="block">
        <h3 class="subhead">Property Details</h3>
        <div class="attrs">
          <div v-if="property.bedrooms != null" class="attr"><span>Bedrooms</span><b>{{ property.bedrooms }}</b></div>
          <div v-if="property.bathrooms != null" class="attr"><span>Bathrooms</span><b>{{ property.bathrooms }}</b></div>
          <div v-if="property.area != null" class="attr"><span>Area</span><b>{{ fmt(property.area) }} m²</b></div>
          <div v-if="property.year_built" class="attr"><span>Year Built</span><b>{{ property.year_built }}</b></div>
          <div
            v-for="a in [
              attr('Plot Size', 'plot_size'),
              attr('Land Title', 'land_title'),
              attr('Star Rating', 'star_rating'),
              attr('Capacity', 'capacity'),
              attr('Minimum Stay (nights)', 'minimum_stay_nights'),
              attr('Maximum Stay (nights)', 'maximum_stay_nights'),
              attr('Check-in', 'check_in_time'),
              attr('Check-out', 'check_out_time'),
              attr('Cleaning Fee', 'cleaning_fee'),
            ].filter(Boolean)"
            :key="a!.label"
            class="attr"
          >
            <span>{{ a!.label }}</span><b>{{ a!.value }}</b>
          </div>
        </div>
      </div>

      <!-- Amenities -->
      <div v-if="property.amenities && Object.keys(property.amenities).length" class="block">
        <h3 class="subhead">Amenities</h3>
        <div class="amenities">
          <span v-for="(v, k) in property.amenities" :key="k" class="amenity">✓ {{ k }}</span>
        </div>
      </div>

      <!-- Hotel rooms -->
      <div v-if="property.category === 'hotel'" class="block">
        <h3 class="subhead">Rooms</h3>
        <div v-if="rooms.length" class="rooms">
          <RouterLink v-for="r in rooms" :key="r.id" :to="`/rooms/${r.id}`" class="room">
            <div class="room-thumb">
              <img v-if="r.images?.[0]" :src="r.images[0].image_url" :alt="r.room_type" />
              <div v-else class="thumb-placeholder">{{ r.room_type }}</div>
            </div>
            <div class="room-info">
              <strong>{{ r.room_type }}</strong>
              <span class="room-meta">{{ r.beds }} bed · {{ r.available ? 'Available' : 'Unavailable' }}</span>
              <span class="room-price">{{ formatPrice(r.price, property.currency) }}/night</span>
            </div>
            <span class="view-link">View Room →</span>
          </RouterLink>
        </div>
        <p v-else class="empty">No rooms added yet.</p>
      </div>

      <!-- Hall / event center slots -->
      <div v-if="(property.category === 'hall' || property.category === 'event_center') && slots.length" class="block">
        <h3 class="subhead">Available Slots</h3>
        <div class="slots">
          <div v-for="s in slots" :key="s.id" class="slot">
            <span>{{ s.date }} · {{ s.start_time }}–{{ s.end_time }}</span>
            <span class="room-price">{{ formatPrice(s.price, property.currency) }}</span>
            <button v-if="isBookable" class="btn btn-primary btn-sm" @click="bookingForm.slot_id = s.id; startBooking()">Book</button>
          </div>
        </div>
      </div>

      <!-- Booking modal -->
      <div v-if="bookingOpen" class="modal-backdrop" @click.self="bookingOpen = false">
        <div class="modal">
          <h3>Request Booking</h3>
          <p class="modal-property">{{ property.title }}</p>

          <div v-if="property.category === 'hotel'" class="form-group">
            <label>Room</label>
            <select v-model.number="bookingForm.room_id" class="form-control" required>
              <option value="0" disabled>Select a room</option>
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.room_type }} — {{ formatPrice(r.price, property.currency) }}/night</option>
            </select>
          </div>

          <div v-if="property.category === 'hall' || property.category === 'event_center'" class="form-group">
            <label>Slot</label>
            <select v-model.number="bookingForm.slot_id" class="form-control" required>
              <option value="0" disabled>Select a slot</option>
              <option v-for="s in slots" :key="s.id" :value="s.id">{{ s.date }} {{ s.start_time }}–{{ s.end_time }} — {{ formatPrice(s.price, property.currency) }}</option>
            </select>
          </div>

          <div v-if="property.category === 'hotel' || property.category === 'shortlet'" class="form-row">
            <div class="form-group">
              <label>Check-in</label>
              <input v-model="bookingForm.check_in" type="date" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Check-out</label>
              <input v-model="bookingForm.check_out" type="date" class="form-control" required />
            </div>
          </div>

          <div class="form-group">
            <label>Guests</label>
            <input v-model.number="bookingForm.guests" type="number" min="1" class="form-control" />
          </div>

          <p v-if="bookingErr" class="error-text">{{ bookingErr }}</p>
          <p v-if="bookingMsg" class="success-text">{{ bookingMsg }}</p>

          <div class="modal-actions">
            <button class="btn btn-outline" @click="bookingOpen = false">Cancel</button>
            <button class="btn btn-primary" :disabled="bookingSubmitting" @click="submitBooking">
              {{ bookingSubmitting ? 'Requesting…' : 'Request Booking' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="loading" class="loading">Loading…</div>
  <div v-else class="loading">{{ error }}</div>
</template>

<style scoped>
.gallery {
  max-width: var(--container);
  margin: 0 auto;
  padding: 30px 24px 0;
}

.gallery-main {
  border-radius: 20px;
  overflow: hidden;
  height: 440px;
  background: linear-gradient(135deg, var(--color-blue-2), var(--color-purple));
}

.gallery-main img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 2rem;
  font-weight: 600;
}

.gallery-thumbs {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.gallery-thumbs img {
  width: 110px;
  height: 74px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0.6;
  border: 2px solid transparent;
}

.gallery-thumbs img.active {
  opacity: 1;
  border-color: var(--color-primary);
}

.section.compact {
  padding-top: 40px;
}

.top-row {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.chips {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.chip {
  background: var(--color-bg-blue);
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 20px;
}

.top-row h1 {
  font-size: 2.2rem;
  color: var(--color-purple-dark);
  margin-bottom: 8px;
}

.location {
  color: var(--color-muted);
}

.price-box {
  min-width: 240px;
}

.fav-btn {
  color: var(--color-primary);
  border-color: var(--color-primary);
  margin-bottom: 10px;
}

.fav-btn.active {
  color: #ff4757;
  border-color: #ff4757;
}

.fav-count {
  font-weight: 600;
}

.call-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.price {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-primary);
  display: block;
  margin-bottom: 14px;
}

.videos {
  margin-bottom: 34px;
}

.video-list {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.video-list video {
  width: 320px;
  height: 180px;
  border-radius: 12px;
  background: #000;
}

.subhead {
  font-size: 1.25rem;
  color: var(--color-purple-dark);
  margin-bottom: 16px;
}

.owner-card {
  background: var(--color-bg-soft);
  border-radius: var(--radius);
  padding: 22px 24px;
  margin-bottom: 36px;
}

.owner-card .subhead {
  margin-bottom: 14px;
}

.owner-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.owner-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
}

.owner-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.owner-details strong {
  color: var(--color-purple-dark);
  font-size: 1.05rem;
}

.owner-details a {
  color: var(--color-primary);
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.owner-details a:hover {
  text-decoration: underline;
}

.block {
  margin-bottom: 36px;
}

.desc {
  color: var(--color-text-2);
  line-height: 1.8;
  max-width: 800px;
}

.attrs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.attr {
  background: var(--color-bg-soft);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
}

.attr span {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.attr b {
  color: var(--color-purple-dark);
}

.amenities {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.amenity {
  background: #eef7ff;
  color: var(--color-primary);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 500;
}

.rooms,
.slots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.room,
.slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 18px;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.room:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow);
}

.room-thumb {
  width: 90px;
  height: 66px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.room-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: var(--color-bg-soft);
  color: var(--color-muted);
  font-size: 0.75rem;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.view-link {
  color: var(--color-primary);
  font-weight: 500;
  font-size: 0.85rem;
  white-space: nowrap;
}

.room-meta {
  display: block;
  color: var(--color-muted);
  font-size: 0.85rem;
}

.room-price {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 0.9rem;
}

.empty {
  color: var(--color-muted);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 8, 9, 0.55);
  display: grid;
  place-items: center;
  z-index: 200;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  padding: 30px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h3 {
  color: var(--color-purple-dark);
  margin-bottom: 6px;
}

.modal-property {
  color: var(--color-muted);
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.loading {
  text-align: center;
  color: var(--color-muted);
  padding: 80px;
}

@media (max-width: 700px) {
  .attrs {
    grid-template-columns: 1fr 1fr;
  }
  .rooms,
  .slots {
    grid-template-columns: 1fr;
  }
}
</style>
