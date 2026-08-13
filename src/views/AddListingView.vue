<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, categoryLabels, purposeLabels, PROPERTY_SERVICES } from '@/api'

const router = useRouter()

const form = reactive({
  title: '',
  description: '',
  category: 'property',
  property_type: 'apartment',
  purpose: 'rent',
  price: 0,
  currency: 'NGN',
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
  contact_phones: [''],
  contact_emails: [''],
})

const images = ref<File[]>([])
const videos = ref<File[]>([])
const services = ref<string[]>([])
const isServiceCat = computed(() => ['hotel', 'hall', 'event_center', 'shortlet'].includes(form.category))

function toggleService(s: string) {
  const i = services.value.indexOf(s)
  if (i >= 0) services.value.splice(i, 1)
  else services.value.push(s)
}
const error = ref('')
const loading = ref(false)

const step = ref(1)
const STEPS = ['Basics', 'Location', 'Photos', 'Details', 'Pricing', 'Publish']
const stepValid = computed(() => {
  if (step.value === 1) return Boolean(form.title.trim() && form.description.trim())
  if (step.value === 2) return Boolean(form.location.trim() && form.city.trim() && form.state.trim() && form.country.trim())
  if (step.value === 3) return true
  if (step.value === 4) return true
  if (step.value === 5) return form.price > 0
  return true
})

function next() {
  error.value = ''
  if (step.value < 6) step.value++
}

function prev() {
  error.value = ''
  if (step.value > 1) step.value--
}

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
    if (services.value.length) attributes.services = services.value

    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      category: form.category,
      property_type: form.property_type,
      purpose: form.purpose,
      price: Number(form.price),
      currency: form.currency,
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

    const phones = form.contact_phones.map((p) => p.trim()).filter(Boolean)
    const emails = form.contact_emails.map((e) => e.trim()).filter(Boolean)
    if (phones.length) payload.contact_phones = phones
    if (emails.length) payload.contact_emails = emails

    const res = await propertyApi.create(payload)
    const id = res.data.id

    if (images.value.length) await propertyApi.uploadImages(id, images.value)
    if (videos.value.length) await propertyApi.uploadVideos(id, videos.value)

    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent('property_listed', 'conversion', { category: form.category, purpose: form.purpose }),
    )
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
      <h1>List Your Property</h1>
      <p class="sub">Reach thousands of property seekers across Nigeria. Steps marked * are required.</p>

      <!-- progress -->
      <ol class="steps" aria-label="Listing progress">
        <li v-for="(s, i) in STEPS" :key="s" :class="{ done: i + 1 < step, active: i + 1 === step }">
          <span class="step-dot">{{ i + 1 }}</span>
          <span class="step-name">{{ s }}</span>
        </li>
      </ol>

      <form class="card" @submit.prevent="step === 6 ? submit() : next()">
        <!-- 1. BASICS -->
        <template v-if="step === 1">
          <div class="form-group">
            <label>Title *</label>
            <input v-model="form.title" class="form-control" placeholder="e.g. Luxury 3-bedroom apartment in Lekki" required />
          </div>
          <div class="row">
            <div class="form-group">
              <label>Category *</label>
              <select v-model="form.category" class="form-control">
                <option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Property Type *</label>
              <select v-model="form.property_type" class="form-control">
                <option v-for="t in propertyTypes[form.category] || ['other']" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Purpose *</label>
            <select v-model="form.purpose" class="form-control">
              <option v-for="(label, key) in purposeLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Description *</label>
            <textarea v-model="form.description" class="form-control" rows="4" placeholder="Describe the property…" required></textarea>
          </div>
        </template>

        <!-- 2. LOCATION -->
        <template v-else-if="step === 2">
          <div class="form-group">
            <label>Location / Street *</label>
            <input v-model="form.location" class="form-control" placeholder="e.g. 12 Admiralty Way, Lekki Phase 1" required />
          </div>
          <div class="row">
            <div class="form-group">
              <label>City *</label>
              <input v-model="form.city" class="form-control" placeholder="e.g. Lagos" required />
            </div>
            <div class="form-group">
              <label>State *</label>
              <input v-model="form.state" class="form-control" placeholder="e.g. Lagos" required />
            </div>
          </div>
          <div class="form-group">
            <label>Country *</label>
            <input v-model="form.country" class="form-control" placeholder="Nigeria" required />
          </div>
        </template>

        <!-- 3. PHOTOS -->
        <template v-else-if="step === 3">
          <div class="row">
            <div class="form-group">
              <label>Images (up to 5)</label>
              <input type="file" accept="image/*" multiple class="form-control" @change="onImages" />
              <small class="hint">{{ images.length }} selected</small>
            </div>
            <div class="form-group">
              <label>Videos</label>
              <input type="file" accept="video/*" multiple class="form-control" @change="onVideos" />
              <small class="hint">{{ videos.length }} selected</small>
            </div>
          </div>
          <p class="hint">Photos make your listing stand out — the first photo becomes the display picture.</p>
        </template>

        <!-- 4. DETAILS -->
        <template v-else-if="step === 4">
          <div class="row">
            <div class="form-group">
              <label>Bedrooms</label>
              <input v-model="form.bedrooms" type="number" min="0" class="form-control" />
            </div>
            <div class="form-group">
              <label>Bathrooms</label>
              <input v-model="form.bathrooms" type="number" min="0" class="form-control" />
            </div>
          </div>
          <div class="row">
            <div class="form-group">
              <label>Area (m²)</label>
              <input v-model="form.area" type="number" min="0" class="form-control" />
            </div>
            <div class="form-group">
              <label>Year Built</label>
              <input v-model="form.year_built" type="number" min="0" class="form-control" />
            </div>
          </div>
          <div class="form-group">
            <label>Amenities (JSON)</label>
            <input v-model="form.amenities" class="form-control" placeholder='{"parking": true, "security": true}' />
          </div>
          <div v-if="isServiceCat" class="form-group">
            <label>Services</label>
            <div class="chip-row">
              <button
                v-for="s in PROPERTY_SERVICES"
                :key="s"
                type="button"
                class="svc-chip"
                :class="{ active: services.includes(s) }"
                @click="toggleService(s)"
              >{{ s }}</button>
            </div>
          </div>
          <div class="form-group">
            <label>Attributes (JSON) — suggested keys for {{ categoryLabels[form.category] }}:
              <code class="hint">{{ attrHints[form.category]?.join(', ') || 'none' }}</code>
            </label>
            <textarea v-model="form.attributes" class="form-control" rows="3" placeholder='{"furnished": true}'></textarea>
          </div>

          <!-- multiple contacts -->
          <div class="form-group">
            <label>Phone Numbers</label>
            <div v-for="(p, i) in form.contact_phones" :key="i" class="multi-row">
              <input v-model="form.contact_phones[i]" class="form-control" placeholder="+234 803 000 0000" />
              <button type="button" class="multi-del" @click="form.contact_phones.splice(i, 1)">×</button>
            </div>
            <button type="button" class="btn btn-outline btn-sm" @click="form.contact_phones.push('')">+ Add phone</button>
          </div>
          <div class="form-group">
            <label>Emails</label>
            <div v-for="(e, i) in form.contact_emails" :key="i" class="multi-row">
              <input v-model="form.contact_emails[i]" class="form-control" placeholder="owner@example.com" />
              <button type="button" class="multi-del" @click="form.contact_emails.splice(i, 1)">×</button>
            </div>
            <button type="button" class="btn btn-outline btn-sm" @click="form.contact_emails.push('')">+ Add email</button>
          </div>
        </template>

        <!-- 5. PRICING -->
        <template v-else-if="step === 5">
          <div class="row">
            <div class="form-group">
              <label>Price *</label>
              <input v-model.number="form.price" type="number" min="0" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Currency</label>
              <select v-model="form.currency" class="form-control">
                <option value="NGN">₦ NGN (Naira)</option>
                <option value="USD">$ USD (Dollar)</option>
                <option value="GBP">£ GBP (Pound)</option>
                <option value="EUR">€ EUR (Euro)</option>
                <option value="GHS">GH₵ GHS (Cedi)</option>
                <option value="KES">KSh KES (Shilling)</option>
                <option value="ZAR">R ZAR (Rand)</option>
              </select>
            </div>
          </div>
          <div class="form-group check">
            <label>
              <input v-model="form.negotiable" type="checkbox" :true-value="1" :false-value="0" />
              Price is negotiable
            </label>
          </div>
        </template>

        <!-- 6. PUBLISH -->
        <template v-else>
          <div class="review">
            <div class="review-row"><span>Title</span><b>{{ form.title || '—' }}</b></div>
            <div class="review-row"><span>Category</span><b>{{ categoryLabels[form.category] }} · {{ form.property_type }} · {{ purposeLabels[form.purpose] }}</b></div>
            <div class="review-row"><span>Location</span><b>{{ [form.location, form.city, form.state, form.country].filter(Boolean).join(', ') || '—' }}</b></div>
            <div class="review-row"><span>Price</span><b>₦{{ Number(form.price).toLocaleString() }} {{ form.currency }} {{ form.negotiable ? '(negotiable)' : '' }}</b></div>
            <div class="review-row"><span>Photos</span><b>{{ images.length }} images · {{ videos.length }} videos</b></div>
          </div>
        </template>

        <p v-if="error" class="error-text">{{ error }}</p>

        <div class="wizard-actions">
          <button v-if="step > 1" type="button" class="btn btn-outline" @click="prev">Back</button>
          <button v-if="step < 6" type="button" class="btn btn-primary" :disabled="!stepValid" @click="next">Continue →</button>
          <button v-else class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Publishing…' : 'Publish Listing' }}
          </button>
        </div>
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
  margin-bottom: 26px;
}

.steps {
  display: flex;
  gap: 6px;
  list-style: none;
  padding: 0;
  margin: 0 0 26px;
  flex-wrap: wrap;
}

.steps li {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 24px;
  background: #f1f3f7;
  color: var(--color-muted, #777);
  font-size: 0.82rem;
  font-weight: 600;
}

.steps li.active {
  background: var(--color-primary, #0a84ff);
  color: #fff;
}

.steps li.done {
  background: #e6f7ec;
  color: #1a7f37;
}

.step-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  background: rgba(0, 0, 0, 0.08);
}

.steps li.active .step-dot,
.steps li.done .step-dot {
  background: rgba(255, 255, 255, 0.85);
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

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-muted);
}

.form-control {
  border: 1.5px solid var(--color-border);
  border-radius: 9px;
  padding: 11px 13px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group.check label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-dark);
}

.form-group.check input {
  accent-color: var(--color-primary);
  width: 18px;
  height: 18px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.svc-chip {
  padding: 8px 16px;
  border-radius: 24px;
  border: 1.5px solid var(--color-border, #e5e8ee);
  background: #fff;
  color: #555;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.svc-chip:hover {
  border-color: var(--color-primary, #0a84ff);
  color: var(--color-primary, #0a84ff);
}

.svc-chip.active {
  background: var(--color-primary, #0a84ff);
  border-color: var(--color-primary, #0a84ff);
  color: #fff;
}

.multi-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.multi-row .form-control {
  flex: 1;
}

.multi-del {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1.5px solid var(--color-border);
  background: #fff;
  color: #d0342c;
  font-size: 1rem;
  cursor: pointer;
  flex-shrink: 0;
}

.hint {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.review {
  background: #f7f9fc;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 18px;
}

.review-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px solid #eef0f3;
  font-size: 0.92rem;
}

.review-row:last-child {
  border-bottom: none;
}

.review-row span {
  color: var(--color-muted, #777);
}

.review-row b {
  color: var(--color-dark, #222);
  text-align: right;
}

.wizard-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}

@media (max-width: 600px) {
  .row {
    grid-template-columns: 1fr;
  }
  .steps {
    gap: 4px;
  }
  .steps li {
    padding: 6px 9px;
    font-size: 0.72rem;
  }
}
</style>
