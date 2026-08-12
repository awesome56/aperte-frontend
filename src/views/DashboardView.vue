<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// personal sections (lazy)
const MyAnalyticsSection = defineAsyncComponent(() => import('@/views/dashboard/MyAnalyticsSection.vue'))
const MyPropertiesSection = defineAsyncComponent(() => import('@/views/dashboard/MyPropertiesSection.vue'))
const MyBookingsSection = defineAsyncComponent(() => import('@/views/dashboard/MyBookingsSection.vue'))
const MyRequestsSection = defineAsyncComponent(() => import('@/views/dashboard/MyRequestsSection.vue'))
const ProfileSection = defineAsyncComponent(() => import('@/views/dashboard/ProfileSection.vue'))
// embedded pages
const FavoritesView = defineAsyncComponent(() => import('@/views/FavoritesView.vue'))
const MessagesView = defineAsyncComponent(() => import('@/views/MessagesView.vue'))
// admin sections (lazy)
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

// section registry: personal for everyone, admin only for staff
const PERSONAL_SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { key: 'properties', label: 'My Properties', icon: 'building' },
  { key: 'bookings', label: 'My Bookings', icon: 'calendar' },
  { key: 'requests', label: 'My Requests', icon: 'list' },
  { key: 'favorites', label: 'Favorites', icon: 'heart' },
  { key: 'messages', label: 'Messages', icon: 'chat' },
  { key: 'profile', label: 'Profile', icon: 'user' },
]

const ADMIN_SECTIONS = [
  { key: 'overview', label: 'Admin Overview', icon: 'grid' },
  { key: 'analytics', label: 'Analytics', icon: 'chart' },
  { key: 'users', label: 'Users', icon: 'users' },
  { key: 'adminproperties', label: 'Properties', icon: 'building' },
  { key: 'claims', label: 'Claims', icon: 'shield' },
  { key: 'roles', label: 'Roles & Permissions', icon: 'lock', adminOnly: true },
]

const isStaff = computed(() => auth.isStaff)

const section = ref((route.query.section as string) || 'dashboard')

const currentSection = computed(() => {
  const all = [...PERSONAL_SECTIONS, ...ADMIN_SECTIONS]
  const found = all.find((s) => s.key === section.value)
  if (!found) return null
  if (ADMIN_SECTIONS.includes(found)) {
    if (!isStaff.value) return null
    if ((found as { adminOnly?: boolean }).adminOnly && !auth.isAdmin) return null
  }
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

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="combined">
    <!-- desktop sidebar -->
    <aside class="c-sidebar">
      <div class="c-logo"><span class="c-mark">A</span><strong>Aperte Dashboard</strong></div>
      <nav class="c-nav">
        <p class="c-label">My Account</p>
        <button
          v-for="s in PERSONAL_SECTIONS"
          :key="s.key"
          class="c-item"
          :class="{ active: section === s.key }"
          @click="setSection(s.key)"
        >
          <span class="c-ico" :class="s.icon"></span>{{ s.label }}
        </button>

        <template v-if="isStaff">
          <p class="c-label">Admin</p>
          <button
            v-for="s in ADMIN_SECTIONS.filter((x) => !x.adminOnly || auth.isAdmin)"
            :key="s.key"
            class="c-item"
            :class="{ active: section === s.key }"
            @click="setSection(s.key)"
          >
            <span class="c-ico" :class="s.icon"></span>{{ s.label }}
          </button>
        </template>
      </nav>
      <div class="c-bottom">
        <RouterLink to="/" class="c-item"><span class="c-ico globe"></span>View Site</RouterLink>
        <button class="c-item logout" @click="logout"><span class="c-ico exit"></span>Logout</button>
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
          <button v-for="s in PERSONAL_SECTIONS" :key="s.key" class="c-item" :class="{ active: section === s.key }" @click="setSection(s.key)">
            <span class="c-ico" :class="s.icon"></span>{{ s.label }}
          </button>
          <template v-if="isStaff">
            <p class="c-label">Admin</p>
            <button v-for="s in ADMIN_SECTIONS.filter((x) => !x.adminOnly || auth.isAdmin)" :key="s.key" class="c-item" :class="{ active: section === s.key }" @click="setSection(s.key)">
              <span class="c-ico" :class="s.icon"></span>{{ s.label }}
            </button>
          </template>
          <RouterLink to="/" class="c-item" @click="drawerOpen = false"><span class="c-ico globe"></span>View Site</RouterLink>
          <button class="c-item logout" @click="logout"><span class="c-ico exit"></span>Logout</button>
        </nav>
      </div>
    </Teleport>

    <main class="c-main">
      <!-- LANDING (shows personal analytics) -->
      <div v-if="currentSection?.key === 'dashboard'" class="landing">
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

        <MyAnalyticsSection />
      </div>

      <!-- PERSONAL SECTIONS -->
      <MyPropertiesSection v-else-if="currentSection?.key === 'properties'" />
      <MyBookingsSection v-else-if="currentSection?.key === 'bookings'" />
      <MyRequestsSection v-else-if="currentSection?.key === 'requests'" />
      <MyAnalyticsSection v-else-if="currentSection?.key === 'myanalytics'" />
      <ProfileSection v-else-if="currentSection?.key === 'profile'" />
      <FavoritesView v-else-if="currentSection?.key === 'favorites'" />
      <MessagesView v-else-if="currentSection?.key === 'messages'" />

      <!-- ADMIN SECTIONS -->
      <AdminOverview v-else-if="currentSection?.key === 'overview'" />
      <AdminAnalytics v-else-if="currentSection?.key === 'analytics'" />
      <AdminUsers v-else-if="currentSection?.key === 'users'" />
      <AdminProperties v-else-if="currentSection?.key === 'adminproperties'" />
      <AdminClaims v-else-if="currentSection?.key === 'claims'" />
      <AdminRoles v-else-if="currentSection?.key === 'roles'" />

      <!-- no access -->
      <div v-else class="c-denied">
        <h2>No access</h2>
        <p>You don't have permission to view this section.</p>
        <button class="btn btn-primary" @click="setSection('dashboard')">Go to Dashboard</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.combined {
  display: flex;
  min-height: calc(100vh - 0px);
  background: #fff;
}

.c-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 224px;
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

.c-ico {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 4px;
  background: #eef0f3;
}

.c-ico.home { background: #0a84ff; }
.c-ico.building { background: #b899eb; }
.c-ico.calendar { background: #71dd8c; }
.c-ico.list { background: #ff9f0a; }
.c-ico.chart { background: #64d2ff; }
.c-ico.heart { background: #ff4757; }
.c-ico.chat { background: #adadfb; }
.c-ico.user { background: #34c759; }
.c-ico.grid { background: #0a84ff; }
.c-ico.users { background: #71dd8c; }
.c-ico.shield { background: #64d2ff; }
.c-ico.lock { background: #adadfb; }
.c-ico.globe { background: #9aa0a6; }
.c-ico.exit { background: #ff453a; }

.c-main {
  flex: 1;
  min-width: 0;
  padding: 26px 30px;
  overflow-x: hidden;
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

/* landing */
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
  background: #0a84ff;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  font-weight: 700;
}

.dash-head h1 {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  color: #2b2358;
}

.dash-head p {
  color: #666;
  font-size: 0.92rem;
}

.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-actions .btn {
  padding: 9px 20px;
  font-size: 0.9rem;
}

/* mobile */
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
  width: 268px;
  z-index: 901;
  background: #fff;
  box-shadow: 8px 0 30px rgba(0, 0, 0, 0.15);
  padding: 18px 12px;
  overflow-y: auto;
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
  .c-main {
    padding: 18px 14px;
  }
}
</style>
