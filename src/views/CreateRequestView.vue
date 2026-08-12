<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { requestApi } from '@/api'

const route = useRoute()
const router = useRouter()

const editId = Number(route.query.edit) || 0

const form = reactive({
  title: '',
  description: '',
  property_type: 'apartment',
  sub_category: '',
  bedrooms: '',
  bathrooms: '',
  location: '',
  city: '',
  state: '',
  country: '',
  min_price: '',
  max_price: '',
  area: '',
  year_built: '',
  amenities: '',
})

const propertyTypes = ['apartment', 'house', 'duplex', 'bungalow', 'office', 'shop', 'warehouse', 'land', 'hotel', 'hall', 'event_center', 'shortlet', 'other']

const error = ref('')
const msg = ref('')
const loading = ref(false)
const fetching = ref(false)

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
  msg.value = ''
  loading.value = true
  try {
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      property_type: form.property_type,
      location: form.location,
      city: form.city,
      state: form.state,
      country: form.country,
      min_price: Number(form.min_price) || 0,
      max_price: Number(form.max_price) || 0,
      amenities: parseJson(form.amenities, 'Amenities'),
    }
    if (form.sub_category) payload.sub_category = form.sub_category
    if (form.bedrooms) payload.bedrooms = Number(form.bedrooms)
    if (form.bathrooms) payload.bathrooms = Number(form.bathrooms)
    if (form.area) payload.area = Number(form.area)
    if (form.year_built) payload.year_built = Number(form.year_built)

    if (editId) {
      await requestApi.update(editId, payload)
      msg.value = 'Request updated.'
    } else {
      await requestApi.create(payload)
      import('@/analytics/tracker').then((m) => m.default.trackEvent('create_request', 'conversion', { property_type: form.property_type }))
      msg.value = 'Request created. Property owners can now reach out to you.'
    }
    setTimeout(() => router.push('/requests'), 1200)
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to save request.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!editId) return
  fetching.value = true
  try {
    const res = await requestApi.get(editId)
    const r = res.data
    form.title = r.title
    form.description = r.description
    form.property_type = r.property_type
    form.sub_category = r.sub_category || ''
    form.bedrooms = r.bedrooms != null ? String(r.bedrooms) : ''
    form.bathrooms = r.bathrooms != null ? String(r.bathrooms) : ''
    form.location = r.location || ''
    form.city = r.city || ''
    form.state = r.state || ''
    form.country = r.country || ''
    form.min_price = r.min_price != null ? String(r.min_price) : ''
    form.max_price = r.max_price != null ? String(r.max_price) : ''
    form.area = r.area != null ? String(r.area) : ''
    form.year_built = r.year_built != null ? String(r.year_built) : ''
    form.amenities = Object.keys(r.amenities || {}).length ? JSON.stringify(r.amenities) : ''
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load request.'
  } finally {
    fetching.value = false
  }
})
</script>

<template>
  <div class="page container">
    <h1>{{ editId ? 'Edit Request' : 'Create a Request' }}</h1>
    <p class="sub">
      Tell property owners exactly what you are looking for — they can contact you directly.
    </p>

    <p v-if="msg" class="success-text">{{ msg }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <div v-if="fetching" class="loading">Loading…</div>
    <form v-else class="form" @submit.prevent="submit">
      <div class="grid">
        <div class="field">
          <label>Title *</label>
          <input v-model="form.title" type="text" placeholder="e.g. 3-bedroom flat in Lekki" required />
        </div>
        <div class="field">
          <label>Property Type *</label>
          <select v-model="form.property_type">
            <option v-for="t in propertyTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="field">
          <label>Sub Category</label>
          <input v-model="form.sub_category" type="text" placeholder="e.g. self-contained, duplex" />
        </div>
        <div class="field">
          <label>Location</label>
          <input v-model="form.location" type="text" placeholder="Street / area" />
        </div>
        <div class="field">
          <label>City</label>
          <input v-model="form.city" type="text" placeholder="City" />
        </div>
        <div class="field">
          <label>State</label>
          <input v-model="form.state" type="text" placeholder="State" />
        </div>
        <div class="field">
          <label>Country</label>
          <input v-model="form.country" type="text" placeholder="Country" />
        </div>
        <div class="field">
          <label>Bedrooms</label>
          <input v-model.number="form.bedrooms" type="number" min="0" placeholder="e.g. 3" />
        </div>
        <div class="field">
          <label>Bathrooms</label>
          <input v-model.number="form.bathrooms" type="number" min="0" placeholder="e.g. 2" />
        </div>
        <div class="field">
          <label>Min Price</label>
          <input v-model.number="form.min_price" type="number" min="0" placeholder="0" />
        </div>
        <div class="field">
          <label>Max Price</label>
          <input v-model.number="form.max_price" type="number" min="0" placeholder="No max" />
        </div>
        <div class="field">
          <label>Area (m²)</label>
          <input v-model.number="form.area" type="number" min="0" placeholder="e.g. 200" />
        </div>
        <div class="field">
          <label>Year Built</label>
          <input v-model.number="form.year_built" type="number" min="0" placeholder="e.g. 2020" />
        </div>
        <div class="field full">
          <label>Amenities (JSON)</label>
          <textarea v-model="form.amenities" rows="2" placeholder='e.g. {"furnished": true, "parking": true}'></textarea>
        </div>
        <div class="field full">
          <label>Description *</label>
          <textarea v-model="form.description" rows="4" placeholder="Describe the property you are looking for…" required></textarea>
        </div>
      </div>

      <button class="btn btn-primary" :disabled="loading">
        {{ loading ? 'Saving…' : editId ? 'Update Request' : 'Create Request' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.page {
  padding: 50px 0 70px;
}

.page h1 {
  font-size: 2.2rem;
  color: var(--color-purple-dark);
}

.sub {
  color: var(--color-muted);
  margin-bottom: 24px;
}

.form {
  background: var(--color-bg-soft);
  border-radius: var(--radius);
  padding: 30px;
  max-width: 860px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field.full {
  grid-column: span 2;
}

.field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-muted);
}

.field input,
.field select,
.field textarea {
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 11px 13px;
  font-size: 0.95rem;
  font-family: inherit;
  background: #fff;
}

.loading {
  text-align: center;
  color: var(--color-muted);
  padding: 60px;
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .field.full {
    grid-column: span 1;
  }
}
</style>
