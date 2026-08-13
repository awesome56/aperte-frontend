<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  propertyApi,
  bookingApi,
  roomApi,
  slotApi,
  availabilityApi,
  type Property,
  type Room,
  type Slot,
  type Booking,
  type PropertyStats,
  formatPrice,
  bookingStatusLabels,
} from '@/api'
import { useAuthStore } from '@/stores/auth'
import AvailabilityCalendar from '@/components/AvailabilityCalendar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const property = ref<Property | null>(null)
const stats = ref<PropertyStats | null>(null)
const loading = ref(true)
const error = ref('')
const msg = ref('')
const err = ref('')

const tab = ref('overview')
const tabs = computed(() => {
  const base = ['overview', 'availability']
  if (property.value?.category === 'hotel') base.push('rooms')
  if (property.value?.category === 'hall' || property.value?.category === 'event_center') base.push('slots')
  base.push('bookings', 'photos', 'reviews')
  return base
})

const TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  availability: 'Availability',
  rooms: 'Rooms',
  slots: 'Slots',
  bookings: 'Bookings',
  photos: 'Photos',
  reviews: 'Reviews & Ratings',
}

const rooms = ref<Room[]>([])
const slots = ref<Slot[]>([])
const propertyBookings = ref<Booking[]>([])

const roomForm = ref({ room_type: '', beds: 1, price: 0, amenities: '' })
const slotForm = ref({ date: '', start_time: '', end_time: '', price: 0 })
const blockForm = ref({ start_date: '', end_date: '' })

async function load() {
  const id = Number(route.params.id)
  loading.value = true
  try {
    const res = await propertyApi.get(id)
    property.value = res.data
    if (res.data.user_id !== auth.user?.id) {
      router.replace('/dashboard')
      return
    }
    const cat = res.data.category
    if (cat === 'hotel') {
      const r = await roomApi.list(id)
      rooms.value = r.data.data
    } else if (cat === 'hall' || cat === 'event_center') {
      const s = await slotApi.list(id)
      slots.value = s.data.data
    }
    const b = await bookingApi.property(id)
    propertyBookings.value = b.data.data
    const st = await propertyApi.stats(id)
    stats.value = st.data
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load property.'
  } finally {
    loading.value = false
  }
}

// ---------- photos ----------
async function uploadPropertyImages(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  if (!files.length || !property.value) return
  try {
    await propertyApi.uploadImages(property.value.id, files)
    msg.value = 'Property photos uploaded.'
    await load()
  } catch (e2: any) {
    err.value = e2.response?.data?.error || 'Failed to upload property photos.'
  } finally {
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function setPropertyDp(imageId: number) {
  try {
    await propertyApi.setDp(imageId)
    msg.value = 'Display picture updated.'
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to set display picture.'
  }
}

async function deletePropertyImage(imageId: number) {
  try {
    await propertyApi.deleteImage(imageId)
    msg.value = 'Photo deleted.'
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete photo.'
  }
}

// ---------- rooms ----------
async function addRoom() {
  if (!property.value) return
  try {
    await roomApi.create(property.value.id, {
      room_type: roomForm.value.room_type,
      beds: Number(roomForm.value.beds),
      price: Number(roomForm.value.price),
      amenities: roomForm.value.amenities ? JSON.parse(roomForm.value.amenities) : {},
    })
    msg.value = 'Room added.'
    await load()
    roomForm.value = { room_type: '', beds: 1, price: 0, amenities: '' }
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to add room.'
  }
}

async function deleteRoom(id: number) {
  try {
    await roomApi.delete(id)
    msg.value = 'Room deleted.'
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete room.'
  }
}

async function uploadRoomImages(roomId: number, e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  if (!files.length) return
  try {
    await roomApi.uploadImages(roomId, files)
    msg.value = 'Room images uploaded.'
    await load()
  } catch (e2: any) {
    err.value = e2.response?.data?.error || 'Failed to upload room images.'
  } finally {
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function deleteRoomImage(id: number) {
  try {
    await roomApi.deleteImage(id)
    msg.value = 'Room image deleted.'
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete room image.'
  }
}

async function setRoomDp(roomId: number, imageId: number) {
  try {
    await roomApi.setDp(imageId)
    msg.value = 'Room display picture updated.'
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to set room display picture.'
  }
}

// ---------- slots ----------
async function addSlot() {
  if (!property.value) return
  try {
    await slotApi.create(property.value.id, {
      date: slotForm.value.date,
      start_time: slotForm.value.start_time,
      end_time: slotForm.value.end_time,
      price: Number(slotForm.value.price),
    })
    msg.value = 'Slot added.'
    await load()
    slotForm.value = { date: '', start_time: '', end_time: '', price: 0 }
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to add slot.'
  }
}

async function deleteSlot(id: number) {
  try {
    await slotApi.delete(id)
    msg.value = 'Slot deleted.'
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete slot.'
  }
}

// ---------- availability ----------
async function blockDates() {
  err.value = ''
  msg.value = ''
  if (!blockForm.value.start_date || !blockForm.value.end_date) {
    err.value = 'Select a start and end date.'
    return
  }
  try {
    await availabilityApi.block(property.value!.id, blockForm.value.start_date, blockForm.value.end_date)
    msg.value = 'Dates blocked.'
    blockForm.value = { start_date: '', end_date: '' }
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to block dates.'
  }
}

async function unblockDates(blockId: number) {
  try {
    await availabilityApi.unblock(blockId)
    msg.value = 'Dates unblocked.'
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to unblock dates.'
  }
}

// ---------- bookings ----------
async function setBookingStatus(id: number, status: string) {
  try {
    await bookingApi.updateStatus(id, status)
    msg.value = `Booking ${status}.`
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update booking.'
  }
}

function fmtN(n: number | null | undefined) {
  if (n == null) return '0'
  return n.toLocaleString()
}

onMounted(load)
</script>

<template>
  <div class="manage container">
    <div class="head">
      <div>
        <RouterLink to="/dashboard" class="back">← Back to dashboard</RouterLink>
        <h1>Manage Property</h1>
        <p v-if="property" class="sub">{{ property.title }} · {{ property.city }}, {{ property.state }}</p>
      </div>
      <div class="head-actions">
        <RouterLink :to="`/properties/edit/${route.params.id}`" class="btn btn-outline">Edit Details</RouterLink>
        <RouterLink :to="`/properties/${route.params.id}`" class="btn btn-outline">View Listing</RouterLink>
      </div>
    </div>

    <p v-if="msg" class="success-text banner">{{ msg }}</p>
    <p v-if="err" class="error-text banner">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="loading">{{ error }}</div>

    <template v-else-if="property">
      <!-- tabs -->
      <div class="tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t"
          :class="{ active: tab === t }"
          @click="tab = t"
          role="tab"
          :aria-selected="tab === t"
        >{{ TAB_LABELS[t] }}</button>
      </div>

      <!-- OVERVIEW -->
      <div v-if="tab === 'overview'">
        <div class="stat-grid">
          <div class="stat-card"><span>Views</span><b>{{ fmtN(stats?.property.views) }}</b></div>
          <div class="stat-card"><span>Favorites</span><b>{{ fmtN(stats?.property.favorites) }}</b></div>
          <div class="stat-card"><span>Bookings</span><b>{{ stats?.bookings.total ?? 0 }}</b></div>
          <div class="stat-card"><span>Revenue</span><b>{{ formatPrice(stats?.revenue ?? 0, property.currency) }}</b></div>
          <div class="stat-card"><span>Avg rating</span><b>{{ stats?.average_rating ? stats.average_rating.toFixed(1) + ' ★' : '—' }}</b></div>
          <div class="stat-card"><span>Reviews</span><b>{{ stats?.review_count ?? 0 }}</b></div>
        </div>

        <div class="overview-blocks">
          <section class="panel">
            <h2>Booking Status</h2>
            <div class="mini-list">
              <div class="mini-row"><span>Pending</span><b>{{ stats?.bookings.pending ?? 0 }}</b></div>
              <div class="mini-row"><span>Confirmed</span><b>{{ stats?.bookings.confirmed ?? 0 }}</b></div>
              <div class="mini-row"><span>Completed</span><b>{{ stats?.bookings.completed ?? 0 }}</b></div>
              <div class="mini-row"><span>Cancelled</span><b>{{ stats?.bookings.cancelled ?? 0 }}</b></div>
            </div>
          </section>

          <section v-if="stats?.rooms?.length" class="panel">
            <h2>Rooms Performance</h2>
            <div class="room-stats">
              <div v-for="r in stats.rooms" :key="r.id" class="room-stat">
                <div class="rs-head">
                  <strong>{{ r.room_type }}</strong>
                  <span class="status-badge" :class="r.available ? 'ok' : 'no'">{{ r.available ? 'Available' : 'Unavailable' }}</span>
                </div>
                <span>{{ formatPrice(r.price, property.currency) }}/night · {{ r.beds }} bed</span>
                <span>{{ r.bookings }} bookings · {{ r.active_bookings }} active</span>
                <span class="rs-rev">Revenue: {{ formatPrice(r.revenue, property.currency) }}</span>
              </div>
            </div>
          </section>

          <section v-if="property.category === 'hall' || property.category === 'event_center'" class="panel">
            <h2>Slots</h2>
            <p class="big-num">{{ stats?.slot_count ?? 0 }}</p>
            <p class="hint">slots set up for this venue</p>
          </section>
        </div>
      </div>

      <!-- AVAILABILITY -->
      <div v-else-if="tab === 'availability'" class="panel">
        <h2>Availability Calendar</h2>
        <AvailabilityCalendar :property-id="property.id" :category="property.category" />

        <div v-if="property.category === 'hotel' || property.category === 'shortlet'" class="block-form">
          <h2>Block Dates</h2>
          <div class="inline-form">
            <input v-model="blockForm.start_date" type="date" aria-label="Block start date" />
            <input v-model="blockForm.end_date" type="date" aria-label="Block end date" />
            <button class="btn btn-primary btn-sm" @click="blockDates">Block Dates</button>
          </div>
        </div>
      </div>

      <!-- ROOMS -->
      <div v-else-if="tab === 'rooms'" class="panel">
        <h2>Rooms</h2>
        <div v-if="rooms.length" class="mini-list">
          <div v-for="r in rooms" :key="r.id" class="mini-row">
            <div class="mini-info">
              <strong>{{ r.room_type }}</strong>
              <span>{{ formatPrice(r.price, property.currency) }}/night · {{ r.beds }} bed · {{ r.available ? 'Available' : 'Unavailable' }}</span>
              <div class="room-thumbs">
                <div v-for="img in (r.images || [])" :key="img.id" class="room-thumb" :class="{ active: img.dp === 1 }">
                  <img :src="img.image_url" alt="" />
                  <button class="thumb-dp" @click="setRoomDp(r.id, img.id)">★</button>
                  <button class="thumb-del" @click="deleteRoomImage(img.id)">×</button>
                </div>
              </div>
              <label class="file-btn small">
                Upload Images
                <input type="file" accept="image/*" multiple @change="(e) => uploadRoomImages(r.id, e)" />
              </label>
            </div>
            <button class="btn btn-danger btn-sm" @click="deleteRoom(r.id)">Delete</button>
          </div>
        </div>
        <p v-else class="empty">No rooms yet.</p>
        <div class="inline-form">
          <input v-model="roomForm.room_type" placeholder="Room type (e.g. Deluxe)" />
          <input v-model.number="roomForm.beds" type="number" min="1" placeholder="Beds" />
          <input v-model.number="roomForm.price" type="number" min="0" placeholder="Price/night" />
          <button class="btn btn-primary btn-sm" @click="addRoom">Add Room</button>
        </div>
      </div>

      <!-- SLOTS -->
      <div v-else-if="tab === 'slots'" class="panel">
        <h2>Time Slots</h2>
        <div v-if="slots.length" class="mini-list">
          <div v-for="s in slots" :key="s.id" class="mini-row">
            <span>{{ s.date }} {{ s.start_time }}–{{ s.end_time }} · {{ formatPrice(s.price, property.currency) }} · <b>{{ s.status }}</b></span>
            <button class="btn btn-danger btn-sm" @click="deleteSlot(s.id)">Delete</button>
          </div>
        </div>
        <p v-else class="empty">No slots yet.</p>
        <div class="inline-form">
          <input v-model="slotForm.date" type="date" />
          <input v-model="slotForm.start_time" placeholder="Start (HH:MM)" />
          <input v-model="slotForm.end_time" placeholder="End (HH:MM)" />
          <input v-model.number="slotForm.price" type="number" min="0" placeholder="Price" />
          <button class="btn btn-primary btn-sm" @click="addSlot">Add Slot</button>
        </div>
      </div>

      <!-- BOOKINGS -->
      <div v-else-if="tab === 'bookings'" class="panel">
        <h2>Bookings</h2>
        <div v-if="propertyBookings.length" class="mini-list">
          <div v-for="b in propertyBookings" :key="b.id" class="mini-row booking-row">
            <span>
              #{{ b.id }} · {{ b.check_in || '—' }} → {{ b.check_out || '—' }} · {{ formatPrice(b.total, property.currency) }} ·
              <b>{{ bookingStatusLabels[b.status] || b.status }}</b>
            </span>
            <div class="row-actions">
              <button v-if="b.status === 'pending'" class="btn btn-primary btn-sm" @click="setBookingStatus(b.id, 'confirmed')">Confirm</button>
              <button v-if="b.status === 'pending'" class="btn btn-danger btn-sm" @click="setBookingStatus(b.id, 'cancelled')">Reject</button>
              <button v-if="b.status === 'confirmed'" class="btn btn-outline btn-sm" @click="setBookingStatus(b.id, 'completed')">Complete</button>
            </div>
          </div>
        </div>
        <p v-else class="empty">No bookings yet.</p>
      </div>

      <!-- PHOTOS -->
      <div v-else-if="tab === 'photos'" class="panel">
        <h2>Photos ({{ property.images?.length || 0 }}/5)</h2>
        <div class="photos">
          <div v-for="img in property.images" :key="img.id" class="photo" :class="{ active: img.dp === 1 }">
            <img :src="img.image_url" alt="" />
            <span v-if="img.dp === 1" class="photo-dp">Display</span>
            <button v-else class="photo-set" @click="setPropertyDp(img.id)">Set as Display</button>
            <button class="photo-del" @click="deletePropertyImage(img.id)">×</button>
          </div>
        </div>
        <label class="file-btn">
          Upload Photos
          <input type="file" accept="image/*" multiple @change="uploadPropertyImages" />
        </label>
      </div>

      <!-- REVIEWS -->
      <div v-else class="panel">
        <h2>Reviews &amp; Ratings ({{ stats?.review_count ?? 0 }})</h2>
        <p v-if="stats?.average_rating" class="avg-rating">
          Average: <b>{{ stats.average_rating.toFixed(1) }} / 5 ★</b>
        </p>
        <div v-if="stats?.reviews?.length" class="review-list">
          <div v-for="rv in stats.reviews" :key="rv.id" class="review">
            <div class="review-head">
              <div class="review-avatar">{{ ((rv.full_name || rv.username || '?')[0] || '?').toUpperCase() }}</div>
              <div class="review-info">
                <strong>{{ rv.full_name || rv.username }}</strong>
                <span class="stars">{{ '★'.repeat(Math.round(rv.rating)) }}{{ '☆'.repeat(5 - Math.round(rv.rating)) }}</span>
              </div>
              <span class="review-date">{{ new Date(rv.created_at).toLocaleDateString() }}</span>
            </div>
            <p class="review-title">{{ rv.title }}</p>
            <p class="review-content">{{ rv.content }}</p>
          </div>
        </div>
        <p v-else class="empty">No reviews yet — they'll appear here once customers who booked leave ratings.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.manage {
  padding: 40px 0 70px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.head h1 {
  font-size: 2rem;
  color: var(--color-purple-dark, #2b2358);
}

.back {
  display: inline-block;
  color: var(--color-primary, #0a84ff);
  font-size: 0.88rem;
  margin-bottom: 6px;
}

.sub {
  color: var(--color-muted, #666);
}

.head-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.head-actions .btn {
  padding: 8px 16px;
  font-size: 0.88rem;
}

.banner {
  margin-bottom: 12px;
}

.tabs {
  display: flex;
  gap: 6px;
  border-bottom: 2px solid var(--color-border, #e8ecf3);
  margin-bottom: 22px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tabs button {
  padding: 11px 16px;
  border: none;
  background: transparent;
  font-weight: 600;
  color: var(--color-muted, #777);
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  white-space: nowrap;
}

.tabs button.active {
  color: var(--color-primary, #0a84ff);
  border-bottom-color: var(--color-primary, #0a84ff);
}

.panel {
  background: #f8f9fc;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 18px;
}

.panel h2 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 14px;
  color: var(--color-dark, #222);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-card span {
  font-size: 0.74rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.stat-card b {
  font-size: 1.35rem;
  color: #1c1c1c;
}

.overview-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: start;
}

.mini-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #fff;
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.mini-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-info span {
  color: var(--color-muted, #777);
  font-size: 0.82rem;
}

.room-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-stat {
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.88rem;
  color: #666;
}

.rs-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.rs-rev {
  color: #1a7f37;
  font-weight: 600;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
}

.status-badge.ok { background: #e6f7ec; color: #1a7f37; }
.status-badge.no { background: #fff4e5; color: #b7791f; }

.big-num {
  font-size: 2.2rem;
  font-weight: 700;
  color: #1c1c1c;
  margin: 0;
}

.hint {
  color: #9aa0a6;
  font-size: 0.82rem;
}

.inline-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.inline-form input {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 8px;
  padding: 9px 11px;
  min-width: 100px;
}

.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.room-thumbs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.room-thumb {
  position: relative;
  width: 64px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
}

.room-thumb.active {
  border-color: var(--color-primary, #0a84ff);
}

.room-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-dp {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #ffd700;
  font-size: 0.62rem;
  cursor: pointer;
}

.thumb-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(220, 20, 20, 0.85);
  color: #fff;
  font-size: 0.72rem;
  line-height: 1;
  cursor: pointer;
}

.file-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border: 1.5px solid var(--color-primary, #0a84ff);
  border-radius: 8px;
  color: var(--color-primary, #0a84ff);
  font-size: 0.84rem;
  cursor: pointer;
}

.file-btn.small {
  padding: 6px 10px;
  font-size: 0.76rem;
  margin-top: 6px;
}

.file-btn input {
  display: none;
}

.photos {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.photo {
  position: relative;
  width: 120px;
  height: 90px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
}

.photo.active {
  border-color: var(--color-primary, #0a84ff);
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-dp {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.68rem;
  background: var(--color-primary, #0a84ff);
  color: #fff;
  padding: 3px;
}

.photo-set {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border: none;
  font-size: 0.68rem;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px;
  cursor: pointer;
}

.photo-del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(220, 20, 20, 0.85);
  color: #fff;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
}

/* reviews */
.avg-rating {
  font-size: 1rem;
  color: #666;
  margin-bottom: 14px;
}

.avg-rating b {
  color: #1a7f37;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review {
  background: #fff;
  border-radius: 10px;
  padding: 14px 16px;
}

.review-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.review-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0a84ff;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  flex-shrink: 0;
}

.review-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.review-info strong {
  color: #1c1c1c;
  font-size: 0.9rem;
}

.stars {
  color: #f5a623;
  font-size: 0.85rem;
}

.review-date {
  color: #9aa0a6;
  font-size: 0.78rem;
}

.review-title {
  font-weight: 600;
  color: #333;
  margin: 0 0 4px;
}

.review-content {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.empty {
  color: var(--color-muted, #888);
  font-size: 0.9rem;
  padding: 14px 0;
}

.loading {
  text-align: center;
  color: var(--color-muted, #888);
  padding: 60px;
}

@media (max-width: 900px) {
  .overview-blocks {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
