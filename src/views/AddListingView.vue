<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, userApi, categoryLabels, purposeLabels } from '@/api'

const router = useRouter()

const form = reactive({
  title: '',
  description: '',
  category: 'property',
  property_type: 'apartment',
  purpose: 'rent',
  price: 0,
  area: '',
  bedrooms: '',
  bathrooms: '',
  location: '',
  city: '',
  state: '',
  country: '',
  year_built: '',
  amenities: '',
  attributes: '',
  negotiable: 0,
})

const images = ref<File[]>([])
const videos = ref<File[]>([])
const error = ref('')
const loading = ref(false)

const attrHints: Record<string, string[]> = {
  property: ['furnished', 'furnishing_status', 'title_document', 'number_of_floors', 'road_access'],
  land: ['plot_size', 'land_title', 'plot_number', 'fenced', 'water_source', 'electricity', 'use_permit'],
  hotel: ['star_rating', 'number_of_rooms', 'room_types', 'check_in_time', 'check_out_time', 'services', 'food_options', 'parking_spaces'],
  hall: ['capacity', 'standing_capacity', 'parking_spaces', 'sound_system', 'lighting', 'ac', 'backup_power', 'booking_duration'],
  event_center: ['capacity', 'standing_capacity', 'parking_spaces', 'sound_system', 'lighting', 'ac', 'backup_power', 'changing_room', 'booking_duration'],
  shortlet: ['furnished', 'minimum_stay_nights', 'maximum_stay_nights', 'check_in_time', 'check_out_time', 'cleaning_fee', 'service_fee'],
  other: [],
}

const propertyTypes: Record<string, string[]> = {
  property: ['apartment', 'house', 'duplex', 'bungalow', 'office', 'shop', 'warehouse'],
  land: ['residential', 'commercial', 'agricultural', 'industrial'],
  hotel: ['hotel', 'motel', 'guesthouse', 'lodge'],
  hall: ['hall', 'convention_hall'],
  event_center: ['event_center', 'ballroom'],
  shortlet: ['shortlet', 'serviced_apartment', 'vacation_rental'],
  other: ['other'],
}

function onImages(e: Event) {
  images.value = Array.from((e.target as HTMLInputElement).files || [])
}

function onVideos(e: Event) {
  videos.value = Array.from((e.target as HTMLInputElement).files || [])
}

function parseJson(value: string, label: string): Record<string, unknown> {
  if (!value.trim()) return {}
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return parsed
  } catch {
    throw new Error(`${label} must be valid JSON, e.g. {"key": value}`)
  }
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const amenities = parseJson(form.amenities, 'Amenities')
    const attributes = parseJson(form.attributes, 'Attributes')

    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      category: form.category,
      property_type: form.property_type,
      purpose: form.purpose,
      price: Number(form.price),
      location: form.location,
      city: form.city,
      state: form.state,
      country: form.country,
      amenities,
      attributes,
      negotiable: Number(form.negotiable),
    }
    if (form.area) payload.area = Number(form.area)
    if (form.bedrooms) payload.bedrooms = Number(form.bedrooms)
    if (form.bathrooms) payload.bathrooms = Number(form.bathrooms)
    if (form.year_built) payload.year_built = Number(form.year_built)

    const res = await propertyApi.create(payload)
    const id = res.data.id

    if (images.value.length) await propertyApi.uploadImages(id, images.value)
    if (videos.value.length) await propertyApi.uploadVideos(id, videos.value)

    router.push(`/properties/${id}`)
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || 'Failed to create listing.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="add">
    <div class="container">
      <h1>Add a Listing</h1>
      <p class="sub">Fill in the details below. Fields marked with attribute hints are optional.</p>

      <form class="card" @submit.prevent="submit">
        <div class="row">
          <div class="form-group">
            <label>Title</label>
            <input v-model="form.title" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Category</label>
            <select v-model="form.category" class="form-control">
              <option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="form-group">
            <label>Property Type</label>
            <select v-model="form.property_type" class="form-control">
              <option v-for="t in propertyTypes[form.category] || ['other']" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Purpose</label>
            <select v-model="form.purpose" class="form-control">
              <option v-for="(label, key) in purposeLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="form-group">
            <label>Price ($)</label>
            <input v-model.number="form.price" type="number" min="0" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Area (m², optional)</label>
            <input v-model="form.area" type="number" class="form-control" />
          </div>
        </div>

        <div class="row">
          <div class="form-group">
            <label>Bedrooms (optional)</label>
            <input v-model="form.bedrooms" type="number" class="form-control" />
          </div>
          <div class="form-group">
            <label>Bathrooms (optional)</label>
            <input v-model="form.bathrooms" type="number" class="form-control" />
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea v-model="form.description" class="form-control" rows="4" required></textarea>
        </div>

        <div class="row">
          <div class="form-group">
            <label>Location / Street</label>
            <input v-model="form.location" class="form-control" required />
          </div>
          <div class="form-group">
            <label>City</label>
            <input v-model="form.city" class="form-control" required />
          </div>
        </div>

        <div class="row">
          <div class="form-group">
            <label>State</label>
            <input v-model="form.state" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Country</label>
            <input v-model="form.country" class="form-control" required />
          </div>
        </div>

        <div class="form-group">
          <label>Amenities (JSON)</label>
          <input v-model="form.amenities" class="form-control" placeholder='{"wifi": true, "parking": true}' />
        </div>

        <div class="form-group">
          <label>Attributes (JSON) — suggested keys for {{ categoryLabels[form.category] }}:
            <code class="hint">{{ attrHints[form.category]?.join(', ') || 'none' }}</code>
          </label>
          <textarea v-model="form.attributes" class="form-control" rows="3" placeholder='{"furnished": true}'></textarea>
        </div>

        <div class="row">
          <div class="form-group">
            <label>Images</label>
            <input type="file" accept="image/*" multiple class="form-control" @change="onImages" />
            <small class="hint">{{ images.length }} selected</small>
          </div>
          <div class="form-group">
            <label>Videos</label>
            <input type="file" accept="video/*" multiple class="form-control" @change="onVideos" />
            <small class="hint">{{ videos.length }} selected</small>
          </div>
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <button class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create Listing' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.add {
  padding: 50px 0 70px;
}

.add h1 {
  font-size: 2.2rem;
  color: var(--color-purple-dark);
}

.sub {
  color: var(--color-muted);
  margin-bottom: 30px;
}

.card {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 34px;
  max-width: 760px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.hint {
  color: var(--color-muted);
  font-size: 0.8rem;
}
</style>
