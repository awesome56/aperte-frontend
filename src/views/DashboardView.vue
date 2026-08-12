<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { propertyApi, bookingApi, requestApi, userApi, type Property, type Booking, type Request, bookingStatusLabels, formatPrice } from '@/api'
import { useAuthStore } from '@/stores/auth'

const AdminOverview = defineAsyncComponent(() => import('@/views/admin/AdminOverview.vue'))
const AdminAnalytics = defineAsyncComponent(() => import('@/views/admin/AdminAnalytics.vue'))
const AdminUsers = defineAsyncComponent(() => import('@/views/admin/AdminUsers.vue'))
const AdminProperties = defineAsyncComponent(() => import('@/views/admin/AdminProperties.vue'))
const AdminClaims = defineAsyncComponent(() => import('@/views/admin/AdminClaims.vue'))
const AdminRoles = defineAsyncComponent(() => import('@/views/admin/AdminRoles.vue'))

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const drawerOpen = ref(false)

// staff get the combined admin-style dashboard; regular users get the personal one
const isStaff = computed(() => auth.isStaff)

const section = ref((route.query.section as string) || 'mydashboard')

const SECTIONS = [
  { key: 'mydashboard', label: 'My Dashboard', staff: false },
  { key: 'overview', label: 'Admin Overview', staff: true, permission: 'stats.view' },
  { key: 'analytics', label: 'Analytics', staff: true, permission: 'stats.view' },
  { key: 'users', label: 'Users', staff: true, permission: 'users.view' },
  { key: 'properties', label: 'Properties', staff: true, permission: 'properties.view' },
  { key: 'claims', label: 'Claims', staff: true, permission: 'properties.approve' },
  { key: 'roles', label: 'Roles & Permissions', staff: true, adminOnly: true },
]

const visibleSections = computed(() => SECTIONS.filter((s) => !s.staff || (isStaff.value && (!s.adminOnly || auth.isAdmin))))

const currentSection = computed(() => {
  const found = SECTIONS.find((s) => s.key === section.value)
  if (!found || (found.staff && !isStaff.value)) return null
  if (found.adminOnly && !auth.isAdmin) return null
  return found
})

function setSection(key: string) {
  section.value = key
  drawerOpen.value = false
  router.replace({ query: { section: key } })
}

watch(
  () => route.query.section,
  (s) => {
    if (typeof s === 'string') section.value = s
  },
)

// ============ personal dashboard (user content) ============

const tab = ref('properties')
const tabs = ['properties', 'bookings', 'requests', 'profile']

const TAB_LABELS: Record<string, string> = {
  properties: 'My Properties',
  bookings: 'My Bookings',
  requests: 'My Requests',
  profile: 'Profile',
}

const loadedTabs = ref<Set<string>>(new Set(['properties']))

const properties = ref<Property[]>([])
const myBookings = ref<Booking[]>([])
const myRequests = ref<Request[]>([])
const loading = ref(false)
const msg = ref('')
const err = ref('')

const profileForm = reactive({ full_name: '', phone_number: '' })
const dpFile = ref<File | null>(null)
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

function logout() {
  auth.logout()
  router.push('/')
}

onMounted(loadProperties)
</script>

<template>
  <!-- ============ COMBINED STAFF DASHBOARD ============ -->
  <div v-if="isStaff" class="combined">
    <!-- desktop sidebar -->
    <aside class="c-sidebar">
      <div class="c-logo"><span class="c-mark">A</span><strong>Aperte Dashboard</strong></div>
      <nav class="c-nav">
        <p class="c-label">My Account</p>
        <button v-for="s in visibleSections.filter((x) => !x.staff)" :key="s.key" class="c-item" :class="{ active: section === s.key }" @click="setSection(s.key)">{{ s.label }}</button>
        <p class="c-label">Admin</p>
        <button v-for="s in visibleSections.filter((x) => x.staff)" :key="s.key" class="c-item" :class="{ active: section === s.key }" @click="setSection(s.key)">{{ s.label }}</button>
      </nav>
      <div class="c-bottom">
        <RouterLink to="/" class="c-item">View Site</RouterLink>
        <button class="c-item logout" @click="logout">Logout</button>
      </div>
    </aside>

    <!-- mobile topbar -->
    <div class="c-topbar">
      <button class="c-hamburger" :class="{ open: drawerOpen }" aria-label="Menu" @click="drawerOpen = !drawerOpen">
        <span></span><span></span><span></span>
      </button>
      <div class="c-logo"><span class="c-mark">A</span><strong>Aperte Dashboard</strong></div>
      <RouterLink to="/" class="c-site-link">Site</RouterLink>
    </div>

    <Teleport to="body">
      <div v-if="drawerOpen" class="c-backdrop" @click="drawerOpen = false"></div>
      <div v-if="drawerOpen" class="c-drawer">
        <nav class="c-nav">
          <p class="c-label">My Account</p>
          <button v-for="s in visibleSections.filter((x) => !x.staff)" :key="s.key" class="c-item" :class="{ active: section === s.key }" @click="setSection(s.key)">{{ s.label }}</button>
          <p class="c-label">Admin</p>
          <button v-for="s in visibleSections.filter((x) => x.staff)" :key="s.key" class="c-item" :class="{ active: section === s.key }" @click="setSection(s.key)">{{ s.label }}</button>
          <RouterLink to="/" class="c-item" @click="drawerOpen = false">View Site</RouterLink>
          <button class="c-item logout" @click="logout">Logout</button>
        </nav>
      </div>
    </Teleport>

    <main class="c-main">
      <!-- My Dashboard: the personal sections -->
      <div v-if="currentSection?.key === 'mydashboard'" class="c-content">
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

        <div class="activity-cards">
          <button class="act-card" @click="tab = 'properties'">
            <b>{{ stats.properties }}</b><span>My Properties</span>
          </button>
          <button class="act-card" @click="tab = 'bookings'">
            <b>{{ stats.activeBookings }}</b><span>Active Bookings</span>
          </button>
          <button class="act-card" @click="tab = 'requests'">
            <b>{{ stats.requests }}</b><span>My Requests</span>
          </button>
        </div>

        <p v-if="msg" class="success-text banner">{{ msg }}</p>
        <p v-if="err" class="error-text banner">{{ err }}</p>

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

      <!-- Admin sections -->
      <div v-else-if="currentSection" class="c-content">
        <AdminOverview v-if="currentSection.key === 'overview'" />
        <AdminAnalytics v-else-if="currentSection.key === 'analytics'" />
        <AdminUsers v-else-if="currentSection.key === 'users'" />
        <AdminProperties v-else-if="currentSection.key === 'properties'" />
        <AdminClaims v-else-if="currentSection.key === 'claims'" />
        <AdminRoles v-else-if="currentSection.key === 'roles'" />
      </div>

      <div v-else class="c-content c-denied">
        <h2>No access</h2>
        <p>You don't have permission to view this section.</p>
        <button class="btn btn-primary" @click="setSection('mydashboard')">Go to My Dashboard</button>
      </div>
    </main>
  </div>

  <!-- ============ REGULAR USER DASHBOARD ============ -->
  <div v-else class="dash container">
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

    <div class="activity-cards">
      <button class="act-card" @click="tab = 'properties'"><b>{{ stats.properties }}</b><span>My Properties</span></button>
      <button class="act-card" @click="tab = 'bookings'"><b>{{ stats.activeBookings }}</b><span>Active Bookings</span></button>
      <button class="act-card" @click="tab = 'requests'"><b>{{ stats.requests }}</b><span>My Requests</span></button>
    </div>

    <p v-if="msg" class="success-text banner">{{ msg }}</p>
    <p v-if="err" class="error-text banner">{{ err }}</p>

    <div class="tabs" role="tablist">
      <button v-for="t in tabs" :key="t" :class="{ active: tab === t }" @click="selectTab(t)" role="tab" :aria-selected="tab === t">{{ TAB_LABELS[t] }}</button>
    </div>

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

    <div v-else class="panel" role="tabpanel">
      <div class="profile-grid">
        <div class="profile-card">
          <div class="form-group"><label>Full Name</label><input v-model="profileForm.full_name" class="form-control" /></div>
          <div class="form-group"><label>Phone Number</label><input v-model="profileForm.phone_number" class="form-control" /></div>
          <div class="form-group"><label>Profile Picture</label><input type="file" accept="image/*" class="form-control" @change="onDp" /></div>
          <button class="btn btn-primary" @click="saveProfile">Save Profile</button>
        </div>
        <div class="profile-card pw-card">
          <h3>Change Password</h3>
          <p v-if="pwMsg" class="success-text">{{ pwMsg }}</p>
          <p v-if="pwErr" class="error-text">{{ pwErr }}</p>
          <div class="form-group"><label>Old Password</label><input v-model="pwForm.old_password" type="password" class="form-control" /></div>
          <div class="form-group"><label>New Password</label><input v-model="pwForm.new_password" type="password" class="form-control" /></div>
          <div class="form-group"><label>Confirm New Password</label><input v-model="pwForm.comfirm_password" type="password" class="form-control" /></div>
          <button class="btn btn-primary" :disabled="pwLoading" @click="changePassword">{{ pwLoading ? 'Changing…' : 'Change Password' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ---------- combined staff dashboard shell ---------- */
.combined {
  display: flex;
  min-height: calc(100vh - 120px);
  background: #fff;
}

.c-sidebar {
  position: sticky;
  top: 80px;
  height: calc(100vh - 80px);
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #eee;
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow-y: auto;
}

.c-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  margin-bottom: 22px;
  font-size: 0.95rem;
}

.c-mark {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #0a84ff;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.c-nav {
  flex: 1;
}

.c-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #9aa0a6;
  padding: 12px 10px 6px;
  margin: 0;
}

.c-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 10px;
  border-radius: 8px;
  border: none;
  background: none;
  color: #444;
  font-size: 0.92rem;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  font-family: inherit;
}

.c-item:hover {
  background: #f5f5f7;
}

.c-item.active {
  background: #eef4ff;
  color: #0a84ff;
  font-weight: 600;
}

.c-item.logout {
  color: #d0342c;
}

.c-bottom {
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.c-main {
  flex: 1;
  min-width: 0;
  padding: 26px 30px;
}

.c-content {
  max-width: 1200px;
  margin: 0 auto;
}

.c-denied {
  text-align: center;
  padding: 80px 20px;
  color: #666;
}

.c-denied h2 {
  color: #1c1c1c;
  margin-bottom: 8px;
}

/* mobile topbar + drawer */
.c-topbar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 200;
  background: #fff;
}

.c-hamburger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 8px;
}

.c-hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background: #1c1c1c;
  border-radius: 2px;
  transition: transform 0.2s, opacity 0.2s;
}

.c-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.c-hamburger.open span:nth-child(2) { opacity: 0; }
.c-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

.c-site-link {
  color: #0a84ff;
  font-size: 0.9rem;
}

.c-backdrop {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(10, 12, 20, 0.4);
}

.c-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 264px;
  z-index: 901;
  background: #fff;
  box-shadow: 8px 0 30px rgba(0, 0, 0, 0.15);
  padding: 18px 12px;
  overflow-y: auto;
}

/* ---------- shared personal dashboard styles ---------- */
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

.activity-cards {
  display: none;
  gap: 10px;
  margin-bottom: 18px;
}

.act-card {
  flex: 1;
  background: #f8f9fc;
  border: none;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
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

@media (max-width: 1024px) {
  .c-sidebar {
    display: none;
  }
  .c-topbar {
    display: flex;
  }
  .combined {
    display: block;
  }
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
  .c-main {
    padding: 18px 14px;
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
