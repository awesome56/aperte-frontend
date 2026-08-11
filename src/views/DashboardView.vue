<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import {
  propertyApi,
  bookingApi,
  roomApi,
  slotApi,
  userApi,
  authApi,
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
// change password
const pwForm = reactive({ old_password: '', new_password: '', comfirm_password: '' })
const pwMsg = ref('')
const pwErr = ref('')
const pwLoading = ref(false)

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
  // fetch full detail so images[] is available for management
  try {
    const detail = await propertyApi.get(id)
    selected.value = detail.data
  } catch {
    // fall back to the list item if detail fetch fails
  }
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

async function uploadRoomImages(roomId: number, e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  if (!files.length) return
  try {
    await roomApi.uploadImages(roomId, files)
    msg.value = 'Room images uploaded.'
    await selectProperty(selected.value!.id)
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
    await selectProperty(selected.value!.id)
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete room image.'
  }
}

async function setRoomDp(roomId: number, imageId: number) {
  try {
    await roomApi.setDp(imageId)
    msg.value = 'Room display picture updated.'
    await selectProperty(selected.value!.id)
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to set room display picture.'
  }
}

async function uploadPropertyImages(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  if (!files.length || !selected.value) return
  try {
    await propertyApi.uploadImages(selected.value.id, files)
    msg.value = 'Property photos uploaded.'
    await selectProperty(selected.value.id)
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
    await selectProperty(selected.value!.id)
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to set display picture.'
  }
}

async function deletePropertyImage(imageId: number) {
  try {
    await propertyApi.deleteImage(imageId)
    msg.value = 'Photo deleted.'
    await selectProperty(selected.value!.id)
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete photo.'
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

async function changePassword() {
  pwMsg.value = ''
  pwErr.value = ''
  if (pwForm.new_password !== pwForm.comfirm_password) {
    pwErr.value = 'New password and confirm password do not match.'
    return
  }
  pwLoading.value = true
  try {
    const res = await authApi.changePassword(pwForm.old_password, pwForm.new_password, pwForm.comfirm_password)
    pwMsg.value = res.data.msg || 'Password changed successfully.'
    pwForm.old_password = ''
    pwForm.new_password = ''
    pwForm.comfirm_password = ''
  } catch (e: any) {
    pwErr.value = e.response?.data?.error || 'Failed to change password.'
  } finally {
    pwLoading.value = false
  }
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
              <img v-if="p.dp || p.images?.[0]" :src="p.dp || p.images?.[0]?.image_url" alt="" class="thumb" />
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
              <div v-for="r in rooms" :key="r.id" class="mini-row room-manage">
                <div class="room-manage-main">
                  <div class="room-thumbs">
                    <div v-for="img in (r.images || [])" :key="img.id" class="room-thumb" :class="{ active: img.dp === 1 }">
                      <img :src="img.image_url" :alt="r.room_type" />
                      <button class="thumb-dp" title="Set as display picture" @click="setRoomDp(r.id, img.id)">★</button>
                      <button class="thumb-del" title="Delete image" @click="deleteRoomImage(img.id)">×</button>
                    </div>
                  </div>
                  <div class="room-manage-info">
                    <RouterLink :to="`/rooms/${r.id}`"><strong>{{ r.room_type }}</strong></RouterLink>
                    <span>{{ formatPrice(r.price, selected?.currency) }}/night ({{ r.beds }} bed{{ r.beds > 1 ? 's' : '' }})</span>
                    <label class="file-btn">
                      Upload Images
                      <input type="file" accept="image/*" multiple @change="(e) => uploadRoomImages(r.id, e)" />
                    </label>
                  </div>
                </div>
                <button class="btn btn-danger btn-sm" @click="deleteRoom(r.id)">Delete Room</button>
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

          <!-- Property photos -->
          <div v-if="selected.images?.length" class="manage-block">
            <h3>Property Photos ({{ selected.images.length }}/5)</h3>
            <div class="prop-photos">
              <div v-for="img in selected.images" :key="img.id" class="prop-photo" :class="{ active: img.dp === 1 }">
                <img :src="img.image_url" alt="" />
                <span v-if="img.dp === 1" class="photo-dp">Display</span>
                <button v-else class="photo-set" title="Set as display picture" @click="setPropertyDp(img.id)">Set as Display</button>
                <button class="photo-del" title="Delete image" @click="deletePropertyImage(img.id)">×</button>
              </div>
            </div>
          </div>
          <div class="manage-block">
            <h3>Add Property Photos (max 5 total)</h3>
            <label class="file-btn">
              Upload Photos
              <input type="file" accept="image/*" multiple @change="uploadPropertyImages" />
            </label>
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

      <div class="profile-card pw-card">
        <h3>Change Password</h3>
        <p v-if="pwMsg" class="success-text">{{ pwMsg }}</p>
        <p v-if="pwErr" class="error-text">{{ pwErr }}</p>
        <div class="form-group">
          <label>Old Password</label>
          <input v-model="pwForm.old_password" type="password" class="form-control" />
        </div>
        <div class="form-group">
          <label>New Password</label>
          <input v-model="pwForm.new_password" type="password" class="form-control" />
        </div>
        <div class="form-group">
          <label>Confirm New Password</label>
          <input v-model="pwForm.comfirm_password" type="password" class="form-control" />
        </div>
        <button class="btn btn-primary" :disabled="pwLoading" @click="changePassword">
          {{ pwLoading ? 'Changing…' : 'Change Password' }}
        </button>
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

/* room management */
.room-manage {
  align-items: flex-start;
  flex-direction: column;
}

.room-manage-main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  flex-wrap: wrap;
}

.room-thumbs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.room-thumb {
  position: relative;
  width: 88px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
}

.room-thumb.active {
  border-color: var(--color-primary);
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
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #ffd700;
  font-size: 0.7rem;
  line-height: 1;
  cursor: pointer;
}

.thumb-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(220, 20, 20, 0.85);
  color: #fff;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
}

.room-manage-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.room-manage-info a {
  color: var(--color-dark);
}

.room-manage-info a:hover {
  color: var(--color-primary);
}

.file-btn {
  display: inline-flex;
  align-items: center;
  margin-top: 6px;
  padding: 8px 14px;
  border: 1.5px solid var(--color-primary);
  border-radius: 8px;
  color: var(--color-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

.file-btn input {
  display: none;
}

/* property photos */
.prop-photos {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.prop-photo {
  position: relative;
  width: 140px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
}

.prop-photo.active {
  border-color: var(--color-primary);
}

.prop-photo img {
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
  font-size: 0.7rem;
  background: var(--color-primary);
  color: #fff;
  padding: 3px;
}

.photo-set {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border: none;
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px;
  cursor: pointer;
}

.photo-del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(220, 20, 20, 0.85);
  color: #fff;
  cursor: pointer;
}

.profile-card {
  max-width: 460px;
  background: var(--color-bg-soft);
  border-radius: var(--radius);
  padding: 30px;
}

.pw-card {
  margin-top: 30px;
}

.pw-card h3 {
  color: var(--color-purple-dark);
  margin-bottom: 16px;
}

.pw-card .form-group {
  margin-bottom: 16px;
}

.loading {
  text-align: center;
  color: var(--color-muted);
  padding: 60px;
}
</style>
