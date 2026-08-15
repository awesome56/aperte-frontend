// Centralized, role/permission-aware navigation.
// Every surface (desktop navbar, mobile drawer, admin sidebar) builds from
// this config so navigation can never drift out of sync.

export interface NavItem {
  label: string
  to: string
  permission?: string
  adminOnly?: boolean
  staff?: boolean
  requiresAuth?: boolean
}

export const CATEGORY_NAV: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Buy', to: '/listings?purpose=sale' },
  { label: 'Rent', to: '/listings?purpose=rent' },
  { label: 'Shortlets', to: '/listings?category=shortlet' },
  { label: 'Hotels', to: '/listings?category=hotel' },
  { label: 'Land', to: '/listings?category=land' },
  { label: 'Venues', to: '/listings?category=event_center' },
  { label: 'Property Requests', to: '/browse-requests' },
]

// Hamburger / drawer menu (broader navigation)
export const DRAWER_NAV: NavItem[] = [
  ...CATEGORY_NAV,
  { label: 'Dashboard', to: '/dashboard', requiresAuth: true },
  { label: 'Messages', to: '/messages', requiresAuth: true },
  { label: 'Post a Request', to: '/create-request', requiresAuth: true },
  { label: 'Favorites', to: '/favorites', requiresAuth: true },
  { label: 'Admin', to: '/admin', staff: true },
]

// Admin sidebar items (permission-aware)
export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', to: '/admin' },
  { label: 'Analytics', to: '/admin/analytics', permission: 'stats.view' },
  { label: 'Users', to: '/admin/users', permission: 'users.view' },
  { label: 'Properties', to: '/admin/properties', permission: 'properties.view' },
  { label: 'Claims', to: '/admin/claims', permission: 'properties.approve' },
  { label: 'Roles & Permissions', to: '/admin/roles', adminOnly: true },
]

// Bottom navigation per role
export interface BottomNavItem extends NavItem {
  to: string
  icon: string
  badge?: boolean
}

export const VISITOR_BOTTOM_NAV: BottomNavItem[] = [
  { label: 'Home', to: '/', icon: 'M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z' },
  { label: 'Search', to: '/listings', icon: 'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm9.3 13.3-4.2-4.2a7.4 7.4 0 1 0-1.4 1.4l4.2 4.2a1 1 0 0 0 1.4-1.4z' },
  { label: 'Login', to: '/login', icon: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z' },
]

export const USER_BOTTOM_NAV: BottomNavItem[] = [
  { label: 'Home', to: '/', icon: 'M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z' },
  { label: 'Search', to: '/listings', icon: 'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm9.3 13.3-4.2-4.2a7.4 7.4 0 1 0-1.4 1.4l4.2 4.2a1 1 0 0 0 1.4-1.4z' },
  { label: 'Favorites', to: '/favorites', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  { label: 'Messages', to: '/messages', icon: 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z', badge: true },
  { label: 'Account', to: '/dashboard', icon: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z' },
]
