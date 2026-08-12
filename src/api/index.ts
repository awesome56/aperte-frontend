import api from './client'

export interface AuthResponse {
  user: {
    id: number
    username: string
    email: string
    full_name: string
    phone_number: number | null
    profile_picture: string
    email_verified: number
    role?: string
    access?: string
    refresh?: string
  }
  msg?: string
  refresh?: string
}

export interface Property {
  id: number
  user_id: number
  title: string
  description: string
  category: string
  property_type: string
  purpose: string
  attributes: Record<string, unknown>
  price: number
  currency: string
  area: number | null
  bedrooms: number | null
  bathrooms: number | null
  location: string
  city: string
  state: string
  country: string
  latitude?: number | null
  logitude?: number | null
  year_built?: number | null
  amenities: Record<string, unknown>
  images: { id: number; image_url: string; dp?: number; created_at: string }[]
  dp?: string
  videos: { id: number; video_url: string; created_at: string }[]
  negotiable: number
  available: number
  approved: number
  views?: number
  favorites_count?: number
  favorited?: boolean
  average_rating: number | null
  username: string
  owner_full_name?: string
  owner_email?: string
  owner_phone_number?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  contact_website?: string | null
  created_at: string
}

export interface Paginated<T> {
  data: T[]
  meta: {
    page: number
    pages: number
    total_count: number
    prev_page: number | null
    next_page: number | null
    has_next: boolean
    has_prev: boolean
  }
}

export interface Booking {
  id: number
  property_id: number
  room_id: number | null
  slot_id: number | null
  customer_id: number
  check_in: string | null
  check_out: string | null
  guests: number
  nights: number | null
  total: number
  status: string
  created_at: string
}

export interface RoomImage {
  id: number
  image_url: string
  dp: number
  created_at: string
  updated_at: string
}

export interface Room {
  id: number
  property_id: number
  room_type: string
  beds: number
  price: number
  amenities: Record<string, unknown>
  available: number
  images: RoomImage[]
}

export interface Slot {
  id: number
  property_id: number
  date: string
  start_time: string
  end_time: string
  price: number
  status: string
  booked_by: number | null
}

export interface Request {
  id: number
  user_id: number
  title: string
  description: string
  property_type: string
  sub_category: string | null
  min_price: number | null
  max_price: number | null
  area: number | null
  bedrooms: number | null
  bathrooms: number | null
  location: string
  city: string
  state: string
  country: string
  year_built: number | null
  amenities: Record<string, unknown>
  created_at: string
  updated_at: string
}

export const authApi = {
  register: (data: Record<string, unknown>) => api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post<AuthResponse>('/auth/login', data),
  me: () => api.get<{ id: number; username: string; email: string; full_name: string; profile_picture: string }>('/auth/user'),
  verify: (email: string, code: string) => api.post(`/auth/verifyemail/${email}`, { code }),
  resendVerify: (email: string) => api.get(`/auth/resendverify/${email}`),
  forgot: (email: string) => api.get(`/auth/forgotpassword/${email}`),
  reset: (email: string, code: string, new_password: string) => api.post(`/auth/resetpassword/${email}`, { code, new_password }),
  changePassword: (old_password: string, new_password: string, comfirm_password: string) =>
    api.post('/auth/changepassword', { old_password, new_password, comfirm_password }),
}

export const favoriteApi = {
  toggle: (id: number) => api.post<{ message: string }>(`/favorites/${id}`),
  check: (id: number) => api.get<{ favorited: boolean }>(`/favorites/check/${id}`),
  list: (params?: Record<string, unknown>) => api.get<Paginated<Property>>('/favorites/', { params }),
}

export const trackingApi = {
  batch: (events: Record<string, unknown>[]) => api.post('/tracking/batch', { events }),
  pageview: (path: string, propertyId?: number | null) =>
    api.post('/tracking/pageview', {
      path,
      visitor_id: getVisitorId(),
      property_id: propertyId || null,
      referrer: document.referrer || null,
    }),
}

// A stable per-browser visitor id used for anonymous analytics.
function getVisitorId(): string {
  let id = localStorage.getItem('aperte_visitor_id')
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('aperte_visitor_id', id)
  }
  return id
}

export const propertyApi = {
  browse: (params: Record<string, unknown>) => api.get<Paginated<Property>>('/properties/', { params }),
  get: (id: number) => api.get<Property>(`/properties/${id}`),
  mine: (userId: number) => api.get<Paginated<Property>>(`/properties/user/${userId}/`),
  create: (data: Record<string, unknown>) => api.post<Property>('/properties/', data),
  update: (id: number, data: Record<string, unknown>) => api.put<Property>(`/properties/${id}`, data),
  uploadImages: (id: number, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('file', f))
    return api.post(`/properties/images/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadVideos: (id: number, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('file', f))
    return api.post(`/properties/videos/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  deleteImage: (id: number) => api.delete(`/properties/images/${id}`),
  deleteVideo: (id: number) => api.delete(`/properties/videos/${id}`),
  setDp: (id: number) => api.put(`/properties/images/${id}/dp`),
}

export const bookingApi = {
  create: (propertyId: number, data: Record<string, unknown>) => api.post<Booking>(`/bookings/property/${propertyId}`, data),
  property: (propertyId: number, params?: Record<string, unknown>) => api.get<Paginated<Booking>>(`/bookings/property/${propertyId}`, { params }),
  user: (userId: number, params?: Record<string, unknown>) => api.get<Paginated<Booking>>(`/bookings/user/${userId}/`, { params }),
  updateStatus: (id: number, status: string) => api.put<Booking>(`/bookings/${id}`, { status }),
  delete: (id: number) => api.delete(`/bookings/${id}`),
}

export const roomApi = {
  list: (propertyId: number) => api.get<{ data: Room[] }>(`/rooms/property/${propertyId}`),
  get: (id: number) => api.get<Room>(`/rooms/${id}`),
  create: (propertyId: number, data: Record<string, unknown>) => api.post<Room>(`/rooms/property/${propertyId}`, data),
  update: (id: number, data: Record<string, unknown>) => api.put<Room>(`/rooms/${id}`, data),
  delete: (id: number) => api.delete(`/rooms/${id}`),
  uploadImages: (id: number, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('file', f))
    return api.post(`/rooms/${id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  deleteImage: (id: number) => api.delete(`/rooms/images/${id}`),
  setDp: (id: number) => api.put(`/rooms/images/${id}/dp`),
}

export const slotApi = {
  list: (propertyId: number, params?: Record<string, unknown>) => api.get<{ data: Slot[] }>(`/slots/property/${propertyId}`, { params }),
  create: (propertyId: number, data: Record<string, unknown>) => api.post<Slot>(`/slots/property/${propertyId}`, data),
  update: (id: number, data: Record<string, unknown>) => api.put<Slot>(`/slots/${id}`, data),
  delete: (id: number) => api.delete(`/slots/${id}`),
}

export const requestApi = {
  create: (data: Record<string, unknown>) => api.post<Request>('/requests/', data),
  list: (userId: number, params?: Record<string, unknown>) => api.get<Paginated<Request>>(`/requests/user/${userId}/`, { params }),
  get: (id: number) => api.get<Request>(`/requests/${id}`),
  update: (id: number, data: Record<string, unknown>) => api.put<Request>(`/requests/${id}`, data),
  remove: (id: number) => api.delete(`/requests/${id}`),
}

export const userApi = {
  update: (data: Record<string, unknown>) => api.put('/users/', data),
  uploadDp: (file: File) => {
    const fd = new FormData()
    fd.append('dp', file)
    return api.post('/users/dp', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  deleteDp: () => api.delete('/users/dp'),
}

export interface AdminStats {
  total_users: number
  total_properties: number
  pending_properties: number
  approved_properties: number
  total_bookings: number
  total_rooms: number
  hotels: number
  shortlets: number
}

export interface AdminAnalytics {
  total_page_views: number
  unique_visitors: number
  views_today: number
  views_7d: number
  new_visitors_today: number
  new_visitors_7d: number
  total_favorites: number
  total_property_views: number
  top_properties: {
    id: number
    title: string
    views: number
    dp: string
    price: number
    currency: string
    location: string
    city: string
    state: string
  }[]
  favorite_properties: {
    id: number
    title: string
    favorites_count: number
    dp: string
    price: number
    currency: string
  }[]
  top_pages: { path: string; count: number }[]
  views_by_day: { date: string; count: number }[]
}

export interface AnalyticsKpis {
  page_views: number
  unique_visitors: number
  new_visitors: number
  returning_visitors: number
  sessions: number
  total_sessions: number
  bounce_rate: number
  avg_session_duration: number
  avg_time_on_page: number
  engagement_rate: number
  events: number
  conversions: number
}

export interface AnalyticsOverview {
  range: { start: string; end: string }
  current: AnalyticsKpis
  previous: AnalyticsKpis
  change: Partial<Record<keyof AnalyticsKpis, number>>
  over_time: { date: string; views: number; visitors: number; sessions: number }[]
  sources: { source: string; visitors: number; sessions: number; views: number; bounce_rate: number }[]
  utm: { source: string; medium: string; campaign: string; visitors: number; views: number }[]
  top_properties: {
    id: number
    title: string
    views: number
    visitors: number
    sessions: number
    avg_time_on_page: number
    bounce_rate: number
    dp: string
  }[]
}

export interface AnalyticsPage {
  path: string
  title: string
  views: number
  visitors: number
  sessions: number
  avg_time_on_page: number
  landings: number
  exits: number
  exit_rate: number
  bounce_rate: number
}

export interface AnalyticsProperty {
  id: number
  title: string
  views: number
  visitors: number
  sessions: number
  avg_time_on_page: number
  bounce_rate: number
  dp: string
}

export interface AnalyticsPropertyDetail extends AnalyticsProperty {
  sources: { source: string; visitors: number }[]
  devices: { device: string; visitors: number }[]
  views_over_time: { date: string; views: number }[]
}

export interface AnalyticsContent {
  pages: AnalyticsPage[]
  least_visited: AnalyticsPage[]
  landing_pages: { path: string; sessions: number; avg_duration: number }[]
  exit_pages: { path: string; count: number }[]
  properties: AnalyticsProperty[]
}

export interface AnalyticsAudience {
  devices: { key: string; visitors: number; views: number }[]
  browsers: { key: string; visitors: number; views: number }[]
  os: { key: string; visitors: number; views: number }[]
  countries: { key: string; visitors: number; views: number }[]
  screen_sizes: { key: string; visitors: number; views: number }[]
}

export interface AnalyticsPerformance {
  averages: {
    ttfb: number | null
    dom_loaded: number | null
    load_time: number | null
    fcp: number | null
    lcp: number | null
    cls: number | null
    js_errors: number
    failed_requests: number
    samples: number
  }
  slowest_pages: { path: string; load_time: number | null; lcp: number | null; ttfb: number | null; cls: number | null; samples: number }[]
  error_count: number
}

export interface AnalyticsEvents {
  events: { name: string; category: string; count: number; visitors: number }[]
  search_terms: { term: string; count: number }[]
}

export interface AnalyticsRealtime {
  active_sessions: number
  active_visitors: number
  pages: { path: string; active_visitors: number }[]
  recent: { path: string; event_type: string; device_type: string; source_type: string; country: string; created_at: string }[]
}

export type AnalyticsRange = { start: string; end: string }

export interface AdminUser {
  id: number
  username: string
  email: string
  full_name: string
  phone_number: string | null
  profile_picture: string
  email_verified: number
  role: string
  created_at: string
}

export interface AdminProperty {
  id: number
  user_id: number
  title: string
  category: string
  property_type: string
  purpose: string
  price: number
  currency: string
  city: string
  state: string
  country: string
  dp: string
  approved: number
  available: number
  username: string | null
  created_at: string
}

export interface Permission {
  id: number
  name: string
  description: string
}

export interface Role {
  id: number
  name: string
  description: string | null
  permissions: string[]
  created_at: string
}

export const adminApi = {
  stats: () => api.get<AdminStats>('/admin/stats'),
  analytics: () => api.get<AdminAnalytics>('/admin/analytics'),
  analyticsOverview: (params: AnalyticsRange) => api.get<AnalyticsOverview>('/admin/insights/overview', { params }),
  analyticsTraffic: (params: AnalyticsRange & { group?: string }) => api.get('/admin/insights/traffic', { params }),
  analyticsContent: (params: AnalyticsRange) => api.get<AnalyticsContent>('/admin/insights/content', { params }),
  analyticsProperties: (params: AnalyticsRange & { property_id?: number }) =>
    api.get<{ properties?: AnalyticsProperty[] } | AnalyticsPropertyDetail>('/admin/insights/properties', { params }),
  analyticsAudience: (params: AnalyticsRange) => api.get<AnalyticsAudience>('/admin/insights/audience', { params }),
  analyticsPerformance: (params: AnalyticsRange) => api.get<AnalyticsPerformance>('/admin/insights/performance', { params }),
  analyticsEvents: (params: AnalyticsRange) => api.get<AnalyticsEvents>('/admin/insights/events', { params }),
  analyticsRealtime: () => api.get<AnalyticsRealtime>('/admin/insights/realtime'),
  analyticsExport: (params: AnalyticsRange & { format?: string }) =>
    api.get('/admin/insights/export', { params, responseType: 'blob' }),
  analyticsPrune: (days: number) => api.post(`/admin/insights/prune?days=${days}`),
  users: (params: Record<string, unknown>) => api.get<Paginated<AdminUser>>('/admin/users', { params }),
  setRole: (id: number, role: string) => api.put<AdminUser>(`/admin/users/${id}/role`, { role }),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  properties: (params: Record<string, unknown>) => api.get<Paginated<AdminProperty>>('/admin/properties', { params }),
  approve: (id: number) => api.put(`/admin/properties/${id}/approve`),
  reject: (id: number) => api.put(`/admin/properties/${id}/reject`),
  deleteProperty: (id: number) => api.delete(`/admin/properties/${id}`),
  permissions: () => api.get<{ data: Permission[] }>('/admin/permissions'),
  roles: () => api.get<{ data: Role[] }>('/admin/roles'),
  createRole: (data: { name: string; description: string }) => api.post<Role>('/admin/roles', data),
  updateRole: (id: number, data: { name: string; description: string }) => api.put<Role>(`/admin/roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/admin/roles/${id}`),
  setRolePermissions: (id: number, permissions: string[]) => api.put<Role>(`/admin/roles/${id}/permissions`, { permissions }),
}

export const authApiPermissions = {
  mine: () => api.get<{ permissions: string[] }>('/auth/permissions'),
}

export const categoryLabels: Record<string, string> = {
  property: 'Property',
  land: 'Land',
  hotel: 'Hotel',
  hall: 'Hall',
  event_center: 'Event Center',
  shortlet: 'Shortlet',
  other: 'Other',
}

export const purposeLabels: Record<string, string> = {
  rent: 'For Rent',
  sale: 'For Sale',
  both: 'Rent & Sale',
}

export const bookingStatusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

// Map ISO currency code to its symbol for display.
const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
  GHS: 'GH₵',
  KES: 'KSh',
  ZAR: 'R',
  CAD: 'CA$',
  AUD: 'A$',
}

export function currencySymbol(code?: string | null): string {
  return (code && CURRENCY_SYMBOLS[code.toUpperCase()]) || (code ? `${code} ` : '$')
}

// Format a price with the property's currency symbol.
// e.g. formatPrice(20000, 'NGN') -> "₦20,000"
export function formatPrice(price: number | null | undefined, currency?: string | null): string {
  if (price == null) return '—'
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price)
  return `${currencySymbol(currency)}${n}`
}
