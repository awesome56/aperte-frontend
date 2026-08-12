<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, bookingApi, requestApi, userApi, type Property, type Booking, type Request, bookingStatusLabels, formatPrice } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const tab = ref('properties')
const tabs = ['properties', 'bookings', 'requests', 'profile']

const TAB_LABELS: Record<string, string> = {
  properties: 'My Properties',
  bookings: 'My Bookings',
  requests: 'My Requests',
  profile: 'Profile',
}

// lazy tab loading
const loadedTabs = ref<Set<string>>(new Set(['properties']))

const properties = ref<Property[]>([])
const myBookings = ref<Booking[]>([])
const myRequests = ref<Request[]>([])
const loading = ref(false)
const msg = ref('')
const err = ref('')

// profile
const profileForm = reactive({ full_name: '', phone_number: '' })
const dpFile = ref<File | null>(null)
// change password
const pwForm = reactive({ old_password: '', new_password: '', comfirm_password: '' })
const pwMsg = ref('')
const pwErr = ref('')
const pwLoading = ref(false)

const stats = computed(() => ({
  properties: properties.value.length,
  activeBookings: myBookings.value.filter((b) => b.status === 'pending' || b.status === 'confirmed').length,
  requests: myRequests.value.length,
}))

function selectTab(t: string) {
  tab.value = t
  if (!loadedTabs.value.has(t)) {
    loadedTabs.value.add(t)
    if (t === 'requests') loadRequests()
    if (t === 'profile') initProfile()
  }
}

async function loadProperties() {
  if (!auth.user?.id) return
  if (!auth.user.id) await auth.fetchMe()
  if (!auth.user?.id) return
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

async function loadRequests() {
  if (!auth.user?.id) return
  try {
    const r = await requestApi.list(auth.user.id, { per_page: 50 })
    myRequests.value = r.data.data
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load requests.'
  }
}

function initProfile() {
  profileForm.full_name = auth.user?.full_name || ''
  profileForm.phone_number = auth.user?.phone_number != null ? String(auth.user.phone_number) : ''
}

function manageProperty(id: number) {
  router.push({ name: 'property-manage', params: { id } })
}

async function cancelBooking(id: number) {
  try {
    await bookingApi.updateStatus(id, 'cancelled')
    msg.value = 'Booking cancelled.'
    await loadProperties()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to cancel booking.'
  }
}

async function removeRequest(id: number) {
  if (!window.confirm('Delete this request?')) return
  try {
    await requestApi.remove(id)
    msg.value = 'Request deleted.'
    await loadRequests()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete request.'
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
    const { authApi } = await import('@/api')
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

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtPriceN(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

onMounted(loadProperties)
</script>

<template>
  <div class="dash container">
    <!-- header -->
    <div class="dash-head">
      <div class="dash-welcome">
        <div class="dash-avatar" v-if="auth.user?.profile_picture">
          <img :src="auth.user.profile_picture" alt="" />
        </div>
        <div class="dash-avatar placeholder-avatar" v-else>
          {{ auth.user?.full_name?.[0]?.toUpperCase() || 'A' }}
        </div>
        <div>
          <h1>Welcome back, {{ auth.user?.full_name?.split(' ')[0] || 'there' }}</h1>
          <p>Manage your properties, bookings and requests from one place.</p>
        </div>
      </div>

      <div class="quick-actions">
        <RouterLink to="/add-listing" class="btn btn-primary">+ Add Listing</RouterLink>
        <RouterLink to="/create-request" class="btn btn-outline">Post a Request</RouterLink>
      </div>
    </div>

    <!-- mobile activity summary -->
    <div class="activity-cards">
      <RouterLink to="/dashboard" class="act-card" @click="selectTab('properties')">
        <b>{{ stats.properties }}</b><span>My Properties</span>
      </RouterLink>
      <RouterLink to="/dashboard" class="act-card" @click="selectTab('bookings')">
        <b>{{ stats.activeBookings }}</b><span>Active Bookings</span>
      </RouterLink>
      <RouterLink to="/dashboard" class="act-card" @click="selectTab('requests')">
        <b>{{ stats.requests }}</b><span>My Requests</span>
      </RouterLink>
    </div>

    <p v-if="msg" class="success-text banner">{{ msg }}</p>
    <p v-if="err" class="error-text banner">{{ err }}</p>

    <!-- tabs -->
    <div class="tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t"
        :class="{ active: tab === t }"
        @click="selectTab(t)"
        role="tab"
        :aria-selected="tab === t"
      >{{ TAB_LABELS[t] }}</button>
    </div>

    <!-- MY PROPERTIES -->
    <div v-if="tab === 'properties'" class="panel" role="tabpanel">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="!properties.length" class="empty">
        <p>You have no listings yet.</p>
        <RouterLink to="/add-listing" class="btn btn-primary">Add Listing</RouterLink>
      </div>
      <div v-else class="prop-list">
        <div v-for="p in properties" :key="p.id" class="prop-card">
          <img v-if="p.dp || p.images?.[0]" :src="p.dp || p.images?.[0]?.image_url" alt="" class="prop-thumb" />
          <div class="prop-ph" v-else></div>
          <div class="prop-body">
            <div class="prop-title-row">
              <strong class="prop-title">{{ p.title }}</strong>
              <span class="status-badge" :class="p.approved ? 'ok' : 'no'">{{ p.approved ? 'Approved' : 'Pending' }}</span>
            </div>
            <span class="prop-meta">{{ p.city }}, {{ p.state }} · {{ formatPrice(p.price, p.currency) }} · {{ p.category }}</span>
            <div class="prop-stats">
              <span v-if="p.views != null">{{ p.views }} views</span>
              <span v-if="p.favorites_count != null">{{ p.favorites_count }} ♥</span>
              <span :class="p.available ? 'ok-text' : 'bad-text'">{{ p.available ? 'Available' : 'Unavailable' }}</span>
            </div>
            <div class="prop-actions">
              <button class="btn btn-primary btn-sm" @click="manageProperty(p.id)">Manage Property</button>
              <RouterLink :to="`/properties/${p.id}`" class="btn btn-outline btn-sm">View</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MY BOOKINGS -->
    <div v-else-if="tab === 'bookings'" class="panel" role="tabpanel">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="!myBookings.length" class="empty">
        <p>You have no bookings yet.</p>
        <RouterLink to="/listings" class="btn btn-primary">Browse Properties</RouterLink>
      </div>
      <div v-else class="book-list">
        <div v-for="b in myBookings" :key="b.id" class="book-row">
          <div>
            <strong>Booking #{{ b.id }} · Property {{ b.property_id }}</strong>
            <span class="book-meta">{{ b.check_in || '—' }} → {{ b.check_out || '—' }} · {{ formatPrice(b.total, 'NGN') }}</span>
          </div>
          <span class="status-badge" :class="b.status">{{ bookingStatusLabels[b.status] || b.status }}</span>
          <button v-if="b.status === 'pending' || b.status === 'confirmed'" class="btn btn-danger btn-sm" @click="cancelBooking(b.id)">Cancel</button>
        </div>
      </div>
    </div>

    <!-- MY REQUESTS -->
    <div v-else-if="tab === 'requests'" class="panel" role="tabpanel">
      <div v-if="!myRequests.length" class="empty">
        <p>You have not created any requests yet.</p>
        <RouterLink to="/create-request" class="btn btn-primary">Post a Request</RouterLink>
      </div>
      <div v-else class="req-list">
        <div v-for="r in myRequests" :key="r.id" class="req-card">
          <div class="req-main">
            <strong>{{ r.title }}</strong>
            <span class="req-meta">{{ r.property_type }} · {{ r.city || '—' }}, {{ r.state || '—' }}</span>
            <span class="req-meta">₦{{ fmtPriceN(r.min_price) }} – ₦{{ fmtPriceN(r.max_price) }} · {{ fmtDate(r.created_at) }}</span>
          </div>
          <div class="req-actions">
            <RouterLink :to="{ name: 'messages', query: { request: r.id } }" class="btn btn-primary btn-sm">Messages</RouterLink>
            <RouterLink :to="{ name: 'create-request', query: { edit: r.id } }" class="btn btn-outline btn-sm">Edit</RouterLink>
            <button class="btn btn-danger btn-sm" @click="removeRequest(r.id)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PROFILE -->
    <div v-else class="panel" role="tabpanel">
      <div class="profile-grid">
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
  </div>
</template>

<style scoped>
.dash {
  padding: 40px 0 70px;
}

.dash-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.dash-welcome {
  display: flex;
  align-items: center;
  gap: 14px;
}

.dash-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.dash-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-avatar {
  background: var(--color-primary, #0a84ff);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  font-weight: 700;
}

.dash-head h1 {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  color: var(--color-purple-dark, #2b2358);
}

.dash-head p {
  color: var(--color-muted, #666);
  font-size: 0.92rem;
}

.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* mobile activity summary */
.activity-cards {
  display: none;
  gap: 10px;
  margin-bottom: 18px;
}

.act-card {
  flex: 1;
  background: #f8f9fc;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-decoration: none;
}

.act-card b {
  font-size: 1.3rem;
  color: var(--color-dark, #222);
}

.act-card span {
  font-size: 0.78rem;
  color: var(--color-muted, #777);
}

.banner {
  margin-bottom: 14px;
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
  padding: 12px 18px;
  border: none;
  background: transparent;
  font-weight: 600;
  color: var(--color-muted, #777);
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  white-space: nowrap;
  min-height: 44px;
}

.tabs button.active {
  color: var(--color-primary, #0a84ff);
  border-bottom-color: var(--color-primary, #0a84ff);
}

.panel {
  min-height: 200px;
}

.empty {
  text-align: center;
  color: var(--color-muted, #888);
  padding: 60px 0;
}

.empty p {
  margin-bottom: 18px;
}

/* property cards */
.prop-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.prop-card {
  display: flex;
  gap: 14px;
  background: #fff;
  border: 1.5px solid var(--color-border, #e8ecf3);
  border-radius: 14px;
  padding: 14px;
  align-items: stretch;
}

.prop-thumb,
.prop-ph {
  width: 150px;
  min-height: 110px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.prop-ph {
  background: #eef0f3;
}

.prop-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.prop-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.prop-title {
  color: var(--color-dark, #222);
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-badge.ok { background: #e6f7ec; color: #1a7f37; }
.status-badge.no { background: #fff4e5; color: #b7791f; }
.status-badge.pending { background: #fff4e5; color: #b7791f; }
.status-badge.confirmed { background: #e6f7ec; color: #1a7f37; }
.status-badge.completed { background: #eef4ff; color: #0a84ff; }
.status-badge.cancelled { background: #ffeceb; color: #d0342c; }

.prop-meta {
  color: var(--color-muted, #777);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prop-stats {
  display: flex;
  gap: 14px;
  font-size: 0.82rem;
  color: var(--color-muted, #777);
}

.ok-text { color: #1a7f37; }
.bad-text { color: #d0342c; }

.prop-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  flex-wrap: wrap;
}

/* bookings */
.book-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.book-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1.5px solid var(--color-border, #e8ecf3);
  border-radius: 12px;
  padding: 14px 16px;
  flex-wrap: wrap;
}

.book-row > div {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.book-meta {
  color: var(--color-muted, #777);
  font-size: 0.85rem;
}

/* requests */
.req-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.req-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1.5px solid var(--color-border, #e8ecf3);
  border-radius: 12px;
  padding: 14px 16px;
  flex-wrap: wrap;
}

.req-main {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.req-meta {
  color: var(--color-muted, #777);
  font-size: 0.85rem;
}

.req-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* profile */
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-width: 960px;
}

.profile-card {
  background: #f8f9fc;
  border-radius: 14px;
  padding: 24px;
}

.profile-card h3 {
  margin-bottom: 14px;
  color: var(--color-dark, #222);
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

.form-control {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 0.92rem;
}

.loading {
  text-align: center;
  color: var(--color-muted, #888);
  padding: 60px;
}

@media (max-width: 768px) {
  .dash-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .quick-actions {
    width: 100%;
  }
  .quick-actions .btn {
    flex: 1;
    text-align: center;
  }
  .activity-cards {
    display: flex;
  }
  .prop-card {
    flex-direction: column;
  }
  .prop-thumb,
  .prop-ph {
    width: 100%;
    height: 150px;
  }
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .book-row,
  .req-card {
    flex-direction: column;
    align-items: stretch;
  }
  .book-row .btn,
  .req-actions .btn {
    align-self: flex-start;
  }
}
</style>
