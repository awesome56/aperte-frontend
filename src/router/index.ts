import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/listings',
      name: 'listings',
      component: () => import('../views/ListingsView.vue'),
    },
    {
      path: '/browse-requests',
      name: 'browse-requests',
      component: () => import('../views/BrowseRequestsView.vue'),
    },
    {
      path: '/properties/:id',
      name: 'property-detail',
      component: () => import('../views/PropertyDetailView.vue'),
    },
    {
      path: '/properties/manage/:id',
      name: 'property-manage',
      component: () => import('../views/PropertyManageView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rooms/:id',
      name: 'room-detail',
      component: () => import('../views/RoomDetailView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('../views/FavoritesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/requests',
      name: 'my-requests',
      component: () => import('../views/MyRequestsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/create-request',
      name: 'create-request',
      component: () => import('../views/CreateRequestView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('../views/MessagesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/add-listing',
      name: 'add-listing',
      component: () => import('../views/AddListingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      redirect: () => ({ path: '/dashboard', query: { section: 'overview' } }),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/analytics',
      redirect: () => ({ path: '/dashboard', query: { section: 'analytics' } }),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/users',
      redirect: () => ({ path: '/dashboard', query: { section: 'users' } }),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/properties',
      redirect: () => ({ path: '/dashboard', query: { section: 'properties' } }),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/claims',
      redirect: () => ({ path: '/dashboard', query: { section: 'claims' } }),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/roles',
      redirect: () => ({ path: '/dashboard', query: { section: 'roles' } }),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // If we have a token but haven't loaded the user yet, fetch it (needed for role checks)
  if (auth.isAuthenticated && !auth.user) {
    await auth.fetchMe()
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !auth.isStaff) {
    return { name: 'dashboard' }
  }
  if (to.meta.requiresPermission && !auth.isAdmin) {
    // non-admins need the specific permission; admins pass
    const res = await import('@/api').then((m) => m.authApiPermissions.mine())
    const perms = res.data.permissions
    if (!perms.includes(to.meta.requiresPermission as string)) {
      return { name: 'admin-overview' }
    }
  }
})

// Fire-and-forget page view tracking for analytics (SPA route changes included).
router.afterEach((to) => {
  if (to.path === '/favicon.ico') return
  const propMatch = to.path.match(/^\/properties\/(\d+)/)
  const propertyId = propMatch ? Number(propMatch[1]) : null
  import('@/analytics/tracker')
    .then((m) => m.default.pageview(to.fullPath, undefined, propertyId))
    .catch(() => {})
})

export default router
