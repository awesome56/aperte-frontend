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
  images: { id: number; image_url: string; created_at: string }[]
  videos: { id: number; video_url: string; created_at: string }[]
  negotiable: number
  available: number
  approved: number
  average_rating: number | null
  username: string
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

export interface Room {
  id: number
  property_id: number
  room_type: string
  beds: number
  price: number
  amenities: Record<string, unknown>
  available: number
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

export const authApi = {
  register: (data: Record<string, unknown>) => api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post<AuthResponse>('/auth/login', data),
  me: () => api.get<{ id: number; username: string; email: string; full_name: string; profile_picture: string }>('/auth/user'),
  verify: (email: string, code: string) => api.post(`/auth/verifyemail/${email}`, { code }),
  resendVerify: (email: string) => api.get(`/auth/resendverify/${email}`),
  forgot: (email: string) => api.get(`/auth/forgotpassword/${email}`),
  reset: (email: string, code: string, new_password: string) => api.post(`/auth/resetpassword/${email}`, { code, new_password }),
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
  create: (propertyId: number, data: Record<string, unknown>) => api.post<Room>(`/rooms/property/${propertyId}`, data),
  update: (id: number, data: Record<string, unknown>) => api.put<Room>(`/rooms/${id}`, data),
  delete: (id: number) => api.delete(`/rooms/${id}`),
}

export const slotApi = {
  list: (propertyId: number, params?: Record<string, unknown>) => api.get<{ data: Slot[] }>(`/slots/property/${propertyId}`, { params }),
  create: (propertyId: number, data: Record<string, unknown>) => api.post<Slot>(`/slots/property/${propertyId}`, data),
  update: (id: number, data: Record<string, unknown>) => api.put<Slot>(`/slots/${id}`, data),
  delete: (id: number) => api.delete(`/slots/${id}`),
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
