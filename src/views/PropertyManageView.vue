<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  propertyApi,
  bookingApi,
  roomApi,
  slotApi,
  type Property,
  type Room,
  type Slot,
  type Booking,
  formatPrice,
  bookingStatusLabels,
} from '@/api'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const property = ref<Property | null>(null)
const loading = ref(true)
const error = ref('')
const msg = ref('')
const err = ref('')

const rooms = ref<Room[]>([])
const slots = ref<Slot[]>([])
const propertyBookings = ref<Booking[]>([])

// edit form
const editForm = reactive({
  title: '',
  description: '',
  price: 0,
  currency: 'NGN',
  negotiable: 0,
  available: 1,
  contact_phone: '',
  contact_email: '',
  contact_website: '',
})
const savingEdit = ref(false)

const roomForm = reactive({ room_type: '', beds: 1, price: 0, amenities: '' })
const slotForm = reactive({ date: '', start_time: '', end_time: '', price: 0 })

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
    editForm.title = res.data.title
    editForm.description = res.data.description
    editForm.price = res.data.price
    editForm.currency = res.data.currency
    editForm.negotiable = res.data.negotiable
    editForm.available = res.data.available
    editForm.contact_phone = res.data.contact_phone || ''
    editForm.contact_email = res.data.contact_email || ''
    editForm.contact_website = res.data.contact_website || ''

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
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load property.'
  } finally {
    loading.value = false
  }
}

async function saveEdit() {
  savingEdit.value = true
  msg.value = ''
  err.value = ''
  try {
    await propertyApi.update(property.value!.id, {
      title: editForm.title,
      description: editForm.description,
      price: Number(editForm.price),
      currency: editForm.currency,
      negotiable: Number(editForm.negotiable),
      available: Number(editForm.available),
      contact_phone: editForm.contact_phone || null,
      contact_email: editForm.contact_email || null,
      contact_website: editForm.contact_website || null,
    })
    msg.value = 'Property details updated.'
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update property.'
  } finally {
    savingEdit.value = false
  }
}

// photos
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

// rooms
async function addRoom() {
  if (!property.value) return
  try {
    await roomApi.create(property.value.id, {
      room_type: roomForm.room_type,
      beds: Number(roomForm.beds),
      price: Number(roomForm.price),
      amenities: roomForm.amenities ? JSON.parse(roomForm.amenities) : {},
    })
    msg.value = 'Room added.'
    await load()
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

// slots
async function addSlot() {
  if (!property.value) return
  try {
    await slotApi.create(property.value.id, {
      date: slotForm.date,
      start_time: slotForm.start_time,
      end_time: slotForm.end_time,
      price: Number(slotForm.price),
    })
    msg.value = 'Slot added.'
    await load()
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
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete slot.'
  }
}

// bookings
async function setBookingStatus(id: number, status: string) {
  try {
    await bookingApi.updateStatus(id, status)
    msg.value = `Booking ${status}.`
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update booking.'
  }
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
      <RouterLink v-if="property" :to="`/properties/${property.id}`" class="btn btn-outline">View Listing</RouterLink>
    </div>

    <p v-if="msg" class="success-text banner">{{ msg }}</p>
    <p v-if="err" class="error-text banner">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="loading">{{ error }}</div>

    <div v-else-if="property" class="grid">
      <!-- details -->
      <section class="panel">
        <h2>Details</h2>
        <div class="form-group">
          <label>Title</label>
          <input v-model="editForm.title" class="form-control" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="editForm.description" rows="3" class="form-control"></textarea>
        </div>
        <div class="row2">
          <div class="form-group">
            <label>Price</label>
            <input v-model.number="editForm.price" type="number" min="0" class="form-control" />
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select v-model="editForm.currency" class="form-control">
              <option value="NGN">₦ NGN</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
            </select>
          </div>
        </div>
        <div class="row2">
          <div class="form-group check">
            <label><input v-model="editForm.negotiable" type="checkbox" :true-value="1" :false-value="0" /> Negotiable</label>
          </div>
          <div class="form-group">
            <label>Available</label>
            <select v-model="editForm.available" class="form-control">
              <option :value="1">Available</option>
              <option :value="0">Unavailable</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Contact phone</label>
          <input v-model="editForm.contact_phone" class="form-control" />
        </div>
        <div class="form-group">
          <label>Contact email</label>
          <input v-model="editForm.contact_email" class="form-control" />
        </div>
        <div class="form-group">
          <label>Contact website</label>
          <input v-model="editForm.contact_website" class="form-control" />
        </div>
        <button class="btn btn-primary" :disabled="savingEdit" @click="saveEdit">
          {{ savingEdit ? 'Saving…' : 'Save Details' }}
        </button>
      </section>

      <!-- photos -->
      <section class="panel">
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
      </section>

      <!-- rooms -->
      <section v-if="property.category === 'hotel'" class="panel">
        <h2>Rooms</h2>
        <div v-if="rooms.length" class="mini-list">
          <div v-for="r in rooms" :key="r.id" class="mini-row">
            <div class="mini-info">
              <strong>{{ r.room_type }}</strong>
              <span>{{ formatPrice(r.price, property.currency) }}/night · {{ r.beds }} bed</span>
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
        <p v-else class="empty">No rooms.</p>
        <div class="inline-form">
          <input v-model="roomForm.room_type" placeholder="Room type (e.g. Deluxe)" />
          <input v-model.number="roomForm.beds" type="number" min="1" placeholder="Beds" />
          <input v-model.number="roomForm.price" type="number" min="0" placeholder="Price/night" />
          <button class="btn btn-primary btn-sm" @click="addRoom">Add Room</button>
        </div>
      </section>

      <!-- slots -->
      <section v-if="property.category === 'hall' || property.category === 'event_center'" class="panel">
        <h2>Time Slots</h2>
        <div v-if="slots.length" class="mini-list">
          <div v-for="s in slots" :key="s.id" class="mini-row">
            <span>{{ s.date }} {{ s.start_time }}–{{ s.end_time }} · {{ formatPrice(s.price, property.currency) }} · <b>{{ s.status }}</b></span>
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
      </section>

      <!-- bookings -->
      <section v-if="propertyBookings.length" class="panel">
        <h2>Bookings</h2>
        <div class="mini-list">
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
      </section>
    </div>
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
  margin-bottom: 20px;
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

.banner {
  margin-bottom: 14px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.panel {
  background: #f8f9fc;
  border-radius: 14px;
  padding: 22px;
}

.panel h2 {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 14px;
  color: var(--color-dark, #222);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 12px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-muted, #666);
}

.form-control {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 0.92rem;
}

.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group.check label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--color-dark, #222);
  padding-top: 24px;
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

.file-btn {
  display: inline-flex;
  align-items: center;
  padding: 9px 16px;
  border: 1.5px solid var(--color-primary, #0a84ff);
  border-radius: 9px;
  color: var(--color-primary, #0a84ff);
  font-size: 0.85rem;
  cursor: pointer;
}

.file-btn.small {
  padding: 6px 12px;
  font-size: 0.78rem;
  margin-top: 6px;
}

.file-btn input {
  display: none;
}

.mini-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.mini-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
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

.inline-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
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

.empty {
  color: var(--color-muted, #888);
  font-size: 0.9rem;
  padding: 12px 0;
}

.loading {
  text-align: center;
  color: var(--color-muted, #888);
  padding: 60px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
