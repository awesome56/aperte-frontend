<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { propertyApi, PROPERTY_SERVICES } from '@/api'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const property = ref<any>(null)
const services = ref<string[]>([])
const isServiceCat = computed(() => ['hotel', 'hall', 'event_center', 'shortlet'].includes(property.value?.category))

function toggleService(s: string) {
  const i = services.value.indexOf(s)
  if (i >= 0) services.value.splice(i, 1)
  else services.value.push(s)
}
const loading = ref(true)
const error = ref('')
const msg = ref('')
const err = ref('')
const saving = ref(false)

const form = reactive({
  title: '',
  description: '',
  price: 0,
  currency: 'NGN',
  negotiable: 0,
  available: 1,
  disabled: 0,
  contact_phones: [''],
  contact_emails: [''],
  contact_website: '',
})

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
    form.title = res.data.title
    form.description = res.data.description
    form.price = res.data.price
    form.currency = res.data.currency
    form.negotiable = res.data.negotiable
    form.available = res.data.available
    form.disabled = res.data.disabled || 0
    form.contact_phones = (res.data.contact_phones?.length ? res.data.contact_phones : ['']).map((p: string) => p)
    form.contact_emails = (res.data.contact_emails?.length ? res.data.contact_emails : ['']).map((e: string) => e)
    form.contact_website = res.data.contact_website || ''
    const attrs = (res.data.attributes as Record<string, any>) || {}
    services.value = Array.isArray(attrs.services) ? attrs.services.filter((s: string) => PROPERTY_SERVICES.includes(s)) : []
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load property.'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  msg.value = ''
  err.value = ''
  try {
    await propertyApi.update(property.value.id, {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      currency: form.currency,
      negotiable: Number(form.negotiable),
      available: Number(form.available),
      disabled: Number(form.disabled),
      contact_phones: form.contact_phones.map((p) => p.trim()).filter(Boolean),
      contact_emails: form.contact_emails.map((e) => e.trim()).filter(Boolean),
      contact_website: form.contact_website || null,
      attributes: services.value.length ? { services: services.value } : {},
    })
    msg.value = 'Property details updated.'
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update property.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="edit container">
    <div class="head">
      <div>
        <RouterLink to="/dashboard" class="back">← Back to dashboard</RouterLink>
        <h1>Edit Property</h1>
        <p v-if="property" class="sub">{{ property.title }}</p>
      </div>
      <div class="head-actions">
        <RouterLink :to="`/properties/manage/${route.params.id}`" class="btn btn-outline">Manage Property</RouterLink>
        <RouterLink :to="`/properties/${route.params.id}`" class="btn btn-outline">View Listing</RouterLink>
      </div>
    </div>

    <p v-if="msg" class="success-text banner">{{ msg }}</p>
    <p v-if="err" class="error-text banner">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="loading">{{ error }}</div>

    <form v-else class="card" @submit.prevent="save">
      <div class="form-group">
        <label>Title</label>
        <input v-model="form.title" class="form-control" required />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea v-model="form.description" rows="4" class="form-control" required></textarea>
      </div>
      <div class="row2">
        <div class="form-group">
          <label>Price</label>
          <input v-model.number="form.price" type="number" min="0" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Currency</label>
          <select v-model="form.currency" class="form-control">
            <option value="NGN">₦ NGN</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
          </select>
        </div>
      </div>
      <div class="row2">
        <div class="form-group check">
          <label><input v-model="form.negotiable" type="checkbox" :true-value="1" :false-value="0" /> Price is negotiable</label>
        </div>
        <div class="form-group">
          <label>Availability</label>
          <select v-model="form.available" class="form-control">
            <option :value="1">Available</option>
            <option :value="0">Unavailable</option>
          </select>
        </div>
      </div>
      <div class="form-group check">
        <label><input v-model="form.disabled" type="checkbox" :true-value="1" :false-value="0" /> Disable listing (hidden from the site)</label>
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
      <div class="form-group">
        <label>Contact website</label>
        <input v-model="form.contact_website" class="form-control" />
      </div>
      <button class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save Changes' }}</button>
    </form>
  </div>
</template>

<style scoped>
.edit {
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

.head-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.banner {
  margin-bottom: 14px;
}

.card {
  background: #f8f9fc;
  border-radius: 14px;
  padding: 24px;
  max-width: 720px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 14px;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-muted, #666);
}

.form-group.check label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--color-dark, #222);
  cursor: pointer;
}

.form-group.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary, #0a84ff);
}

.form-control {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 0.92rem;
  font-family: inherit;
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
  border: 1.5px solid var(--color-border, #e5e8ee);
  background: #fff;
  color: #d0342c;
  font-size: 1rem;
  cursor: pointer;
  flex-shrink: 0;
}

.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.loading {
  text-align: center;
  color: var(--color-muted, #888);
  padding: 60px;
}

@media (max-width: 600px) {
  .row2 {
    grid-template-columns: 1fr;
  }
}
</style>
