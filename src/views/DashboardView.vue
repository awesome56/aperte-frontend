<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import {
  propertyApi,
  bookingApi,
  roomApi,
  slotApi,
  userApi,
  type Property,
  type Booking,
  type Room,
  type Slot,
  bookingStatusLabels,
  formatPrice,
} from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const tab = ref('properties')

// my properties
const properties = ref<Property[]>([])
// my bookings (as customer)
const myBookings = ref<Booking[]>([])
// selected property for management
const selected = ref<Property | null>(null)
const rooms = ref<Room[]>([])
const slots = ref<Slot[]>([])
const propertyBookings = ref<Booking[]>([])
const loading = ref(false)
const msg = ref('')
const err = ref('')

// room form
const roomForm = reactive({ room_type: '', beds: 1, price: 0, amenities: '' })
// slot form
const slotForm = reactive({ date: '', start_time: '', end_time: '', price: 0 })
// profile
const profileForm = reactive({ full_name: '', phone_number: '' })
const dpFile = ref<File | null>(null)

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

async function loadAll() {
  if (!auth.user) return
  loading.value = true
  try {
    const [p, b] = await Promise.all([
      propertyApi.mine(auth.user.id),
      bookingApi.user(auth.user.id),
    ])
    properties.value = p.data.data
    myBookings.value = b.data.data
    profileForm.full_name = auth.user.full_name || ''
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load dashboard.'
  } finally {
    loading.value = false
  }
}

async function selectProperty(id: number) {
  selected.value = properties.value.find((p) => p.id === id) || null
  if (!selected.value) return
  rooms.value = []
  slots.value = []
  propertyBookings.value = []
  const cat = selected.value.category
  if (cat === 'hotel') {
    const r = await roomApi.list(id)
    rooms.value = r.data.data
  } else if (cat === 'hall' || cat === 'event_center') {
    const s = await slotApi.list(id)
    slots.value = s.data.data
  }
  const b = await bookingApi.property(id)
  propertyBookings.value = b.data.data
}

async function addRoom() {
  if (!selected.value) return
  try {
    await roomApi.create(selected.value.id, {
      room_type: roomForm.room_type,
      beds: Number(roomForm.beds),
      price: Number(roomForm.price),
      amenities: roomForm.amenities ? JSON.parse(roomForm.amenities) : {},
    })
    msg.value = 'Room added.'
    await selectProperty(selected.value.id)
    roomForm.room_type = ''
    roomForm.beds = 1
    roomForm.price = 0
    roomForm.amenities = ''
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to add room.'
  }
}

async function deleteRoom(id: number) {
  try {
    await roomApi.delete(id)
    msg.value = 'Room deleted.'
    await selectProperty(selected.value!.id)
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete room.'
  }
}

async function addSlot() {
  if (!selected.value) return
  try {
    await slotApi.create(selected.value.id, {
      date: slotForm.date,
      start_time: slotForm.start_time,
      end_time: slotForm.end_time,
      price: Number(slotForm.price),
    })
    msg.value = 'Slot added.'
    await selectProperty(selected.value.id)
    slotForm.date = ''
    slotForm.start_time = ''
    slotForm.end_time = ''
    slotForm.price = 0
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to add slot.'
  }
}

async function deleteSlot(id: number) {
  try {
    await slotApi.delete(id)
    msg.value = 'Slot deleted.'
    await selectProperty(selected.value!.id)
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete slot.'
  }
}

async function setBookingStatus(id: number, status: string) {
  try {
    await bookingApi.updateStatus(id, status)
    msg.value = `Booking ${status}.`
    if (selected.value) await selectProperty(selected.value.id)
    await loadAll()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update booking.'
  }
}

async function saveProfile() {
  try {
    await userApi.update({
      full_name: profileForm.full_name,
      phone_number: profileForm.phone_number ? Number(profileForm.phone_number) : null,
    })
    if (dpFile.value) await userApi.uploadDp(dpFile.value)
    msg.value = 'Profile updated.'
    await auth.fetchMe()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update profile.'
  }
}

function onDp(e: Event) {
  dpFile.value = (e.target as HTMLInputElement).files?.[0] || null
}

watch(tab, () => {
  msg.value = ''
  err.value = ''
})

onMounted(loadAll)
</script>

<template>
  <div class="dash container">
    <h1>Dashboard</h1>
    <p class="sub">Welcome back, {{ auth.user?.full_name }}</p>

    <p v-if="msg" class="success-text banner">{{ msg }}</p>
    <p v-if="err" class="error-text banner">{{ err }}</p>

    <div class="tabs">
      <button :class="{ active: tab === 'properties' }" @click="tab = 'properties'">My Properties</button>
      <button :class="{ active: tab === 'bookings' }" @click="tab = 'bookings'">My Bookings</button>
      <button :class="{ active: tab === 'profile' }" @click="tab = 'profile'">Profile</button>
    </div>

    <!-- MY PROPERTIES -->
    <div v-if="tab === 'properties'" class="panel">
      <div v-if="loading" class="loading">Loading…</div>
      <template v-else>
        <div v-if="!properties.length" class="empty">
          <p>You have no listings yet.</p>
          <RouterLink to="/add-listing" class="btn btn-primary">Add Listing</RouterLink>
        </div>

        <div v-else class="prop-list">
          <div v-for="p in properties" :key="p.id" class="prop-row" :class="{ active: selected?.id === p.id }">
            <div class="prop-info" @click="selectProperty(p.id)">
              <img v-if="p.images?.[0]" :src="p.images[0].image_url" alt="" class="thumb" />
              <div class="placeholder" v-else></div>
              <div>
                <strong>{{ p.title }}</strong>
                <span class="meta">{{ p.city }}, {{ p.state }} · {{ formatPrice(p.price, p.currency) }} · {{ p.category }}</span>
              </div>
            </div>
            <RouterLink :to="`/properties/${p.id}`" class="btn btn-outline btn-sm">View</RouterLink>
          </div>
        </div>

        <div v-if="selected" class="manage">
          <h2>{{ selected.title }} — Management</h2>

          <!-- Rooms (hotel) -->
          <div v-if="selected.category === 'hotel'" class="manage-block">
            <h3>Rooms</h3>
            <div v-if="rooms.length" class="mini-list">
              <div v-for="r in rooms" :key="r.id" class="mini-row">
                <span>{{ r.room_type }} — {{ formatPrice(r.price, selected?.currency) }}/night ({{ r.beds }} bed{{ r.beds > 1 ? 's' : '' }})</span>
                <button class="btn btn-danger btn-sm" @click="deleteRoom(r.id)">Delete</button>
              </div>
            </div>
            <p v-else class="empty">No rooms.</p>
            <div class="inline-form">
              <input v-model="roomForm.room_type" placeholder="Room type (e.g. Deluxe)" />
              <input v-model.number="roomForm.beds" type="number" min="1" placeholder="Beds" />
              <input v-model.number="roomForm.price" type="number" min="0" placeholder="Price/night" />
              <button class="btn btn-primary btn-sm" @click="addRoom">Add Room</button>
            </div>
          </div>

          <!-- Slots (hall/event center) -->
          <div v-if="selected.category === 'hall' || selected.category === 'event_center'" class="manage-block">
            <h3>Time Slots</h3>
            <div v-if="slots.length" class="mini-list">
              <div v-for="s in slots" :key="s.id" class="mini-row">
                <span>{{ s.date }} {{ s.start_time }}–{{ s.end_time }} · {{ formatPrice(s.price, selected?.currency) }} · <b>{{ s.status }}</b></span>
                <button class="btn btn-danger btn-sm" @click="deleteSlot(s.id)">Delete</button>
              </div>
            </div>
            <p v-else class="empty">No slots.</p>
            <div class="inline-form">
              <input v-model="slotForm.date" type="date" />
              <input v-model="slotForm.start_time" placeholder="Start (HH:MM)" />
              <input v-model="slotForm.end_time" placeholder="End (HH:MM)" />
              <input v-model.number="slotForm.price" type="number" min="0" placeholder="Price" />
              <button class="btn btn-primary btn-sm" @click="addSlot">Add Slot</button>
            </div>
          </div>

          <!-- Bookings for this property -->
          <div v-if="propertyBookings.length" class="manage-block">
            <h3>Bookings</h3>
            <div class="mini-list">
              <div v-for="b in propertyBookings" :key="b.id" class="mini-row booking-row">
                <span>
                  #{{ b.id }} · {{ b.check_in || '—' }} → {{ b.check_out || '—' }} · {{ formatPrice(b.total, selected?.currency) }} ·
                  <b>{{ bookingStatusLabels[b.status] || b.status }}</b>
                </span>
                <div class="row-actions">
                  <button v-if="b.status === 'pending'" class="btn btn-primary btn-sm" @click="setBookingStatus(b.id, 'confirmed')">Confirm</button>
                  <button v-if="b.status === 'pending'" class="btn btn-danger btn-sm" @click="setBookingStatus(b.id, 'cancelled')">Reject</button>
                  <button v-if="b.status === 'confirmed'" class="btn btn-outline btn-sm" @click="setBookingStatus(b.id, 'completed')">Complete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- MY BOOKINGS -->
    <div v-if="tab === 'bookings'" class="panel">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="!myBookings.length" class="empty">
        <p>You have no bookings yet.</p>
        <RouterLink to="/listings" class="btn btn-primary">Browse Properties</RouterLink>
      </div>
      <div v-else class="mini-list">
        <div v-for="b in myBookings" :key="b.id" class="mini-row booking-row">
          <span>
            #{{ b.id }} · Property {{ b.property_id }} · {{ b.check_in || '—' }} → {{ b.check_out || '—' }} ·
            {{ formatPrice(b.total, 'NGN') }} · <b>{{ bookingStatusLabels[b.status] || b.status }}</b>
          </span>
          <div class="row-actions">
            <button v-if="b.status === 'pending' || b.status === 'confirmed'" class="btn btn-danger btn-sm" @click="setBookingStatus(b.id, 'cancelled')">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PROFILE -->
    <div v-if="tab === 'profile'" class="panel">
      <div class="profile-card">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="profileForm.full_name" class="form-control" />
        </div>
        <div class="form-group">
          <label>Phone Number</label>
          <input v-model="profileForm.phone_number" class="form-control" />
        </div>
        <div class="form-group">
          <label>Profile Picture</label>
          <input type="file" accept="image/*" class="form-control" @change="onDp" />
        </div>
        <button class="btn btn-primary" @click="saveProfile">Save Profile</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash {
  padding: 50px 0 70px;
}

.dash h1 {
  font-size: 2.2rem;
  color: var(--color-purple-dark);
}

.sub {
  color: var(--color-muted);
  margin-bottom: 24px;
}

.banner {
  margin-bottom: 16px;
}

.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 24px;
}

.tabs button {
  padding: 12px 20px;
  border: none;
  background: transparent;
  font-weight: 500;
  color: var(--color-muted);
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
}

.tabs button.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.panel {
  min-height: 200px;
}

.empty {
  text-align: center;
  color: var(--color-muted);
  padding: 60px 0;
}

.empty p {
  margin-bottom: 20px;
}

.prop-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 30px;
}

.prop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 18px;
}

.prop-row.active {
  border-color: var(--color-primary);
}

.prop-info {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  flex: 1;
}

.thumb {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  object-fit: cover;
}

.placeholder {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: var(--color-bg-blue);
}

.meta {
  display: block;
  color: var(--color-muted);
  font-size: 0.85rem;
}

.manage {
  background: var(--color-bg-soft);
  border-radius: var(--radius);
  padding: 30px;
}

.manage h2 {
  color: var(--color-purple-dark);
  margin-bottom: 20px;
}

.manage-block {
  margin-bottom: 28px;
}

.manage-block h3 {
  color: var(--color-purple-dark);
  margin-bottom: 12px;
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
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.92rem;
}

.booking-row {
  flex-wrap: wrap;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.inline-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.inline-form input {
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  min-width: 120px;
}

.btn-danger {
  background: var(--color-danger);
  color: #fff;
}

.profile-card {
  max-width: 460px;
  background: var(--color-bg-soft);
  border-radius: var(--radius);
  padding: 30px;
}

.loading {
  text-align: center;
  color: var(--color-muted);
  padding: 60px;
}
</style>
