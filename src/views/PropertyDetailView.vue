<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  pricePeriod,
  propertyApi,
  bookingApi,
  roomApi,
  slotApi,
  favoriteApi,
  type Property,
  type Room,
  type Slot,
  categoryLabels,
  purposeLabels,
  formatPrice,
} from '@/api'
import { useAuthStore } from '@/stores/auth'
import ClaimPropertyModal from '@/components/ClaimPropertyModal.vue'
import PropertyGallery from '@/components/PropertyGallery.vue'
import PropertyCard from '@/components/PropertyCard.vue'
import AvailabilityCalendar from '@/components/AvailabilityCalendar.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import { recentlyViewed, recordPropertyView } from '@/composables/recentlyViewed'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const property = ref<Property | null>(null)
const loading = ref(true)
const error = ref('')

const favorited = ref(false)
const favoritesCount = ref(0)

const rooms = ref<Room[]>([])
const slots = ref<Slot[]>([])

// booking state
const bookingOpen = ref(false)
const bookingForm = ref({
  room_id: 0,
  slot_id: 0,
  check_in: '',
  check_out: '',
  guests: 1,
})
const bookingMsg = ref('')
const bookingErr = ref('')
const bookingSubmitting = ref(false)

// recommendations
const similar = ref<Property[]>([])
const sameCity = ref<Property[]>([])
const recentItems = computed(() => recentlyViewed.value.filter((x) => x.id !== property.value?.id).slice(0, 6))
const recLoading = ref(true)

const isBookable = computed(() =>
  ['hotel', 'hall', 'event_center', 'shortlet'].includes(property.value?.category || ''),
)

const isOwner = computed(() => property.value?.user_id === auth.user?.id)

const ownerInitials = computed(() => {
  const name = property.value?.owner_full_name || property.value?.username || ''
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const contactPhone = computed(() => property.value?.contact_phone || '')
const contactEmail = computed(() => property.value?.contact_email || '')
const contactWebsite = computed(() => {
  const w = property.value?.contact_website || ''
  if (!w) return ''
  // hide scraped source URLs that were incorrectly stored as contact_website
  if (w.includes('propertypro.ng') || w.includes('propertypro.com')) return ''
  return w
})
const contactPhones = computed(() => {
  const list = property.value?.contact_phones?.filter(Boolean) || []
  return list.length ? list : contactPhone.value ? [contactPhone.value] : []
})
const contactEmails = computed(() => {
  const list = property.value?.contact_emails?.filter(Boolean) || []
  return list.length ? list : contactEmail.value ? [contactEmail.value] : []
})

const isVerified = computed(() => Boolean(property.value?.approved))
const isClaimed = computed(() => Boolean(property.value?.owner_is_admin === false))
const isUnclaimedAdmin = computed(() => Boolean(property.value?.owner_is_admin) && !isClaimed.value)
const showOwnerCard = computed(() => !isUnclaimedAdmin.value)

const AMENITY_ICONS: Record<string, string> = {
  parking: 'P',
  security: '🛡',
  electricity: '⚡',
  water: '💧',
  ac: '❄',
  air_conditioning: '❄',
  elevator: '🛗',
  swimming_pool: '🏊',
  gym: '🏋',
  furnished: '🛋',
  backup_power: '🔋',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

function fmtPrice(n: number | null | undefined) {
  if (n == null) return '—'
  return formatPrice(n, property.value?.currency)
}

function startBooking() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  bookingOpen.value = true
  bookingMsg.value = ''
  bookingErr.value = ''
}

async function toggleFavorite() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  try {
    await favoriteApi.toggle(property.value!.id)
    favorited.value = !favorited.value
    favoritesCount.value += favorited.value ? 1 : -1
  } catch (e: any) {
    bookingErr.value = e.response?.data?.error || 'Failed to update favorite.'
  }
}

function messageOwner() {
  if (!property.value) return
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  router.push({
    name: 'messages',
    query: { user: property.value.user_id, property: property.value.id },
  })
}

// calls temporarily disabled
/*
function callOwner(type: 'audio' | 'video') {
  if (!property.value) return
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  import('@/calls/callManager').then(({ callManager }) => callManager.startCall(property.value!.user_id, type))
}
*/

// ---- claim property ----

const claimStatus = ref<string | null>(null)
const claimModalOpen = ref(false)

function openClaimModal() {
  claimModalOpen.value = true
}

function onClaimUpdated(status: string) {
  claimStatus.value = status
}

function onClaimModalClose() {
  claimModalOpen.value = false
}

async function submitBooking() {
  bookingSubmitting.value = true
  bookingErr.value = ''
  bookingMsg.value = ''
  try {
    const payload: Record<string, unknown> = {
      guests: Number(bookingForm.value.guests),
    }
    const cat = property.value?.category
    if (cat === 'hotel') {
      payload.room_id = Number(bookingForm.value.room_id)
      payload.check_in = bookingForm.value.check_in
      payload.check_out = bookingForm.value.check_out
    } else if (cat === 'hall' || cat === 'event_center') {
      payload.slot_id = Number(bookingForm.value.slot_id)
    } else {
      payload.check_in = bookingForm.value.check_in
      payload.check_out = bookingForm.value.check_out
    }
    const res = await bookingApi.create(property.value!.id, payload)
    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent('booking', 'conversion', { property_id: property.value!.id, total: res.data.total }),
    )
    bookingMsg.value = `Booking requested! Total: ${formatPrice(res.data.total, property.value?.currency)} (status: ${res.data.status}).`
    bookingOpen.value = false
  } catch (e: any) {
    bookingErr.value = e.response?.data?.error || 'Booking failed. Please try again.'
  } finally {
    bookingSubmitting.value = false
  }
}

function attr(label: string, key: string) {
  const attrs = property.value?.attributes as Record<string, any> | undefined
  if (!attrs || attrs[key] == null || attrs[key] === '') return null
  return { label, value: attrs[key] }
}

const propertyServices = computed(() => {
  const attrs = property.value?.attributes as Record<string, any> | undefined
  const raw = attrs?.services
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' && raw.trim() ? raw.split(',') : []
  return list
    .map((s: string) => s.trim().replace(/^\s+/, ''))
    .filter(Boolean)
    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
})

// attribute entries shown in the details grid (services and source get their own treatment)
const attrEntries = computed(() => {
  const attrs = property.value?.attributes as Record<string, any> | undefined
  if (!attrs) return []
  return Object.entries(attrs).filter(([k]) => k !== 'services' && k !== 'source')
})

function attrValue(v: any): string {
  if (Array.isArray(v)) return v.map((x: string) => x.charAt(0).toUpperCase() + x.slice(1)).join(', ')
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v).charAt(0).toUpperCase() + String(v).slice(1)
}

function amenityKeys() {
  const a = property.value?.amenities as Record<string, any> | undefined
  if (!a) return []
  return Object.entries(a)
    .filter(([, v]) => v === true || (typeof v === 'string' && v !== 'false'))
    .map(([k]) => k)
}

async function loadProperty() {
  const id = Number(route.params.id)
  loading.value = true
  error.value = ''
  property.value = null
  rooms.value = []
  slots.value = []
  similar.value = []
  sameCity.value = []
  try {
    const res = await propertyApi.get(id)
    property.value = res.data
    claimStatus.value = res.data.claim_status || null
    favoritesCount.value = res.data.favorites_count || 0
    favorited.value = Boolean(res.data.favorited)
    recordPropertyView(res.data)

    const cat = res.data.category
    if (cat === 'hotel') {
      const r = await roomApi.list(id)
      rooms.value = r.data.data
    } else if (cat === 'hall' || cat === 'event_center') {
      const s = await slotApi.list(id)
      slots.value = s.data.data.filter((x) => x.status === 'available')
    }
    const roomId = Number(route.query.room)
    if (roomId && rooms.value.some((x) => x.id === roomId)) {
      bookingForm.value.room_id = roomId
      bookingOpen.value = true
    }

    // recommendations
    if (auth.isAuthenticated) {
      try {
        const fav = await favoriteApi.check(id)
        favorited.value = fav.data.favorited
      } catch {
        // non-fatal
      }
    }
    const [similarRes, cityRes] = await Promise.all([
      propertyApi.browse({ category: res.data.category, per_page: 6 }),
      propertyApi.browse({ city: res.data.city, per_page: 6 }),
    ])
    similar.value = similarRes.data.data.filter((p) => p.id !== id).slice(0, 3)
    sameCity.value = cityRes.data.data.filter((p) => p.id !== id).slice(0, 6)
  } catch (e: any) {
    error.value = e.response?.data?.error || e.response?.data?.message || 'Property not found.'
  } finally {
    loading.value = false
    recLoading.value = false
  }
}

onMounted(loadProperty)

// Reload when navigating between property pages (component is reused by the
// router, so onMounted doesn't fire again).
watch(
  () => route.params.id,
  () => {
    bookingOpen.value = false
    loadProperty()
  },
)
</script>

<template>
  <div class="detail" v-if="property">
    <!-- Gallery -->
    <div class="gallery">
      <PropertyGallery :images="property.images" :videos="property.videos" />
    </div>

    <div class="container section compact">
      <!-- Header -->
      <div class="top-row">
        <div>
          <div class="chips">
            <span class="chip">{{ categoryLabels[property.category] || property.category }}</span>
            <span class="chip">{{ purposeLabels[property.purpose] || property.purpose }}</span>
            <span v-if="isVerified" class="chip verified-chip">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 20 12 16.77 5.82 20 7 13.14l-5-4.87 6.91-1.01L12 1z"/></svg>
              Aperte verified
            </span>
            <span v-else-if="isClaimed" class="chip claimed-chip">Ownership verified</span>
          </div>
          <h1>{{ property.title }}</h1>
          <p class="location">
            {{ property.location }}, {{ property.city }}, {{ property.state }}, {{ property.country }}
          </p>
          <p v-if="property.available === 0" class="unavailable-tag">Currently unavailable</p>
        </div>
        <div class="price-box">
          <span class="price">{{ fmtPrice(property.price) }}<span class="price-hint">{{ pricePeriod(property.category, property.purpose) }}</span></span>
        </div>
      </div>

      <!-- Quick facts -->
      <div class="facts">
        <div v-if="property.bedrooms != null" class="fact"><b>{{ property.bedrooms }}</b><span>Bedrooms</span></div>
        <div v-if="property.bathrooms != null" class="fact"><b>{{ property.bathrooms }}</b><span>Bathrooms</span></div>
        <div v-if="property.area != null" class="fact"><b>{{ fmt(property.area) }}</b><span>Area (m²)</span></div>
        <div class="fact"><b>{{ categoryLabels[property.category] || property.category }}</b><span>Type</span></div>
        <div v-if="attr('Furnishing', 'furnished')" class="fact"><b>{{ attr('Furnishing', 'furnished')!.value }}</b><span>Furnishing</span></div>
        <div class="fact"><b>{{ property.available ? 'Available' : 'Unavailable' }}</b><span>Availability</span></div>
      </div>

      <div class="content-grid">
        <div class="main-col">
          <!-- Description -->
          <div class="block">
            <h3 class="subhead">About this property</h3>
            <p class="desc">{{ property.description }}</p>
          </div>

          <!-- Attributes -->
          <div v-if="property.attributes && Object.keys(property.attributes).length" class="block">
            <h3 class="subhead">Property details</h3>
            <div class="attrs">
              <div v-if="property.year_built" class="attr"><span>Year Built</span><b>{{ property.year_built }}</b></div>
              <div v-for="[key, item] in attrEntries" :key="key" class="attr">
                <span>{{ key.replace(/_/g, ' ') }}</span><b>{{ attrValue(item) }}</b>
              </div>
            </div>
          </div>

          <!-- Amenities -->
          <div v-if="amenityKeys().length" class="block">
            <h3 class="subhead">Amenities</h3>
            <div class="amenities">
              <span v-for="a in amenityKeys()" :key="a" class="amenity">
                <span class="amenity-icon">{{ AMENITY_ICONS[a] || '✓' }}</span>
                {{ a.replace(/_/g, ' ') }}
              </span>
            </div>
          </div>

          <!-- Services -->
          <div v-if="propertyServices.length" class="block">
            <h3 class="subhead">Services</h3>
            <div class="amenities">
              <span v-for="s in propertyServices" :key="s" class="amenity">
                <span class="amenity-icon">✦</span>
                {{ s }}
              </span>
            </div>
          </div>

          <!-- Videos -->
          <div v-if="property.videos.length" class="block">
            <h3 class="subhead">Videos</h3>
            <div class="video-list">
              <video v-for="v in property.videos" :key="v.id" :src="v.video_url" controls preload="metadata"></video>
            </div>
          </div>

          <!-- Availability calendar (bookable properties) -->
          <div v-if="isBookable" class="block">
            <h3 class="subhead">Availability</h3>
            <AvailabilityCalendar :property-id="property.id" :category="property.category" />
          </div>

          <!-- Rooms (hotel) -->
          <div v-if="property.category === 'hotel'" class="block">
            <h3 class="subhead">Rooms</h3>
            <div v-if="rooms.length" class="rooms">
              <RouterLink v-for="r in rooms" :key="r.id" :to="`/rooms/${r.id}`" class="room">
                <div class="room-thumb">
                  <img v-if="r.images?.[0]" :src="r.images[0].image_url" :alt="r.room_type" />
                  <div v-else class="thumb-placeholder">{{ r.room_type }}</div>
                </div>
                <div class="room-info">
                  <strong>{{ r.room_type }}</strong>
                  <span class="room-meta">{{ r.beds }} bed · {{ r.available ? 'Available' : 'Unavailable' }}</span>
                  <span class="room-price">{{ formatPrice(r.price, property.currency) }}/night</span>
                </div>
                <span class="view-link">View Room →</span>
              </RouterLink>
            </div>
            <p v-else class="empty">No rooms added yet.</p>
          </div>

          <!-- Slots -->
          <div v-if="(property.category === 'hall' || property.category === 'event_center') && slots.length" class="block">
            <h3 class="subhead">Available Slots</h3>
            <div class="slots">
              <div v-for="s in slots" :key="s.id" class="slot">
                <span>{{ s.date }} · {{ s.start_time }}–{{ s.end_time }}</span>
                <span class="room-price">{{ formatPrice(s.price, property.currency) }}</span>
                <button v-if="isBookable" class="btn btn-primary btn-sm" @click="bookingForm.slot_id = s.id; startBooking()">Book</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar: owner + actions -->
        <aside class="side-col">
          <div class="owner-card">
            <template v-if="showOwnerCard">
              <div class="owner-info">
                <div class="owner-avatar">{{ ownerInitials }}</div>
                <div class="owner-details">
                  <span class="owner-label">Listed by</span>
                  <strong>{{ property.owner_full_name || property.username }}</strong>
                  <span class="owner-verified">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 20 12 16.77 5.82 20 7 13.14l-5-4.87 6.91-1.01L12 1z"/></svg>
                    {{ isVerified ? 'Aperte verified' : 'Verified account' }}
                  </span>
                </div>
              </div>

              <button
                v-if="!isOwner"
                class="btn btn-primary btn-block"
                @click="messageOwner"
              >
                Message Owner
              </button>
              <button v-if="isBookable && !isOwner" class="btn btn-primary btn-block" @click="startBooking">Book Now</button>
            </template>
            <div v-if="!isOwner && (contactEmails.length || contactPhones.length || contactWebsite)" class="contact-list">
              <div v-if="contactEmails.length" class="contact-group">
                <span class="contact-label">Emails</span>
                <a
                  v-for="(em, i) in contactEmails"
                  :key="i"
                  :href="`mailto:${em}?subject=${encodeURIComponent(property.title)}`"
                  class="contact-link"
                >{{ em }}</a>
              </div>
              <div v-if="contactPhones.length" class="contact-group">
                <span class="contact-label">Phones</span>
                <a v-for="(ph, i) in contactPhones" :key="i" :href="`tel:${ph}`" class="contact-link">{{ ph }}</a>
              </div>
              <a v-if="contactWebsite" :href="contactWebsite" target="_blank" rel="noopener" class="contact-link">{{ contactWebsite.replace(/^https?:\/\//, '') }} ↗</a>
            </div>

            <!-- Claim -->
            <div v-if="property.owner_is_admin && !isOwner" class="claim-box">
              <template v-if="claimStatus === 'pending_verification'">
                <p class="claim-note">Your claim needs verification.</p>
                <button class="btn btn-primary btn-block" @click="openClaimModal">Complete Verification</button>
              </template>
              <template v-else-if="claimStatus === 'pending'">
                <p class="claim-status pending">Your claim is pending review by the admin.</p>
              </template>
              <template v-else-if="claimStatus === 'approved'">
                <p class="claim-status approved">You own this property.</p>
              </template>
              <template v-else-if="claimStatus === 'rejected'">
                <p class="claim-status rejected">Your previous claim was declined.</p>
                <button class="btn btn-outline btn-sm" @click="openClaimModal">Claim Again</button>
              </template>
              <template v-else>
                <p class="claim-note">Is this your property? Verify your ownership and take control of this listing.</p>
                <button class="btn btn-primary btn-block" @click="openClaimModal">Claim This Property</button>
              </template>
            </div>
          </div>
        </aside>
      </div>

      <!-- Safety tips -->
      <div class="safety-tips">
        <h3 class="tips-title">Safety tips for your visit</h3>
        <ul class="tips-list">
          <li>Never pay an inspection fee until you have seen both the property and the agent in person.</li>
          <li>Hold off on any rent, deposit or other upfront payment until you have confirmed the landlord is genuine.</li>
          <li>Arrange to meet the agent in a public place and preferably with a companion.</li>
          <li>Agents on Aperte operate independently — Aperte does not represent them and is not liable for any money exchanged directly between you and an agent.</li>
        </ul>
      </div>

      <!-- Booking modal -->
      <div v-if="bookingOpen" class="modal-backdrop" @click.self="bookingOpen = false">
        <div class="modal">
          <h3>Request Booking</h3>
          <p class="modal-property">{{ property.title }}</p>

          <div v-if="property.category === 'hotel'" class="form-group">
            <label>Room</label>
            <select v-model.number="bookingForm.room_id" class="form-control" required>
              <option value="0" disabled>Select a room</option>
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.room_type }} — {{ formatPrice(r.price, property.currency) }}/night</option>
            </select>
          </div>

          <div v-if="property.category === 'hall' || property.category === 'event_center'" class="form-group">
            <label>Slot</label>
            <select v-model.number="bookingForm.slot_id" class="form-control" required>
              <option value="0" disabled>Select a slot</option>
              <option v-for="s in slots" :key="s.id" :value="s.id">{{ s.date }} {{ s.start_time }}–{{ s.end_time }} — {{ formatPrice(s.price, property.currency) }}</option>
            </select>
          </div>

          <div v-if="property.category === 'hotel' || property.category === 'shortlet'" class="form-row">
            <div class="form-group">
              <label>Check-in</label>
              <input v-model="bookingForm.check_in" type="date" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Check-out</label>
              <input v-model="bookingForm.check_out" type="date" class="form-control" required />
            </div>
          </div>

          <div class="form-group">
            <label>Guests</label>
            <input v-model.number="bookingForm.guests" type="number" min="1" class="form-control" />
          </div>

          <p v-if="bookingErr" class="error-text">{{ bookingErr }}</p>
          <p v-if="bookingMsg" class="success-text">{{ bookingMsg }}</p>

          <div class="modal-actions">
            <button class="btn btn-outline" @click="bookingOpen = false">Cancel</button>
            <button class="btn btn-primary" :disabled="bookingSubmitting" @click="submitBooking">
              {{ bookingSubmitting ? 'Requesting…' : 'Request Booking' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Discovery loop -->
      <section v-if="similar.length" class="recs">
        <h2 class="rec-title">You might also like</h2>
        <div class="rec-grid">
          <PropertyCard v-for="p in similar" :key="p.id" :property="p" />
        </div>
      </section>

      <section v-if="sameCity.length" class="recs">
        <h2 class="rec-title">More properties in {{ property.city }}</h2>
        <div class="rec-grid">
          <PropertyCard v-for="p in sameCity.slice(0, 3)" :key="p.id" :property="p" />
        </div>
      </section>

      <section v-if="recentItems.length" class="recs">
        <h2 class="rec-title">Recently viewed</h2>
        <div class="rec-grid">
          <PropertyCard
            v-for="r in recentItems"
            :key="r.id"
            :property="{
              id: r.id, title: r.title, dp: r.dp, price: r.price, currency: r.currency,
              city: r.city, state: r.state, category: r.category, purpose: r.purpose,
            } as unknown as Property"
          />
        </div>
      </section>
    </div>

    <!-- Sticky mobile action bar -->
    <div class="sticky-bar">
      <button class="sb-fav" :class="{ active: favorited }" @click="toggleFavorite">
        <svg viewBox="0 0 24 24" width="20" height="20" :fill="favorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        <span>Save</span>
      </button>
      <button v-if="!isOwner && showOwnerCard" class="sb-msg" @click="messageOwner">Message</button>
      <button v-if="isBookable && !isOwner" class="sb-book" @click="startBooking">Book Now</button>
    </div>
  </div>

  <div v-else-if="loading" class="loading">
    <div class="container"><SkeletonCard height="360px" /></div>
  </div>
  <div v-else class="loading state-box">
    <h3>Something went wrong</h3>
    <p>{{ error }}</p>
    <RouterLink to="/listings" class="btn btn-primary">Browse properties</RouterLink>
  </div>

  <ClaimPropertyModal
    v-if="property && claimModalOpen"
    :property="property"
    :initial-status="claimStatus"
    @updated="onClaimUpdated"
    @close="onClaimModalClose"
  />
</template>

<style scoped>
.gallery {
  max-width: var(--container, 1200px);
  margin: 0 auto;
  padding: 24px 24px 0;
}

.section.compact {
  padding-top: 32px;
}

.top-row {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.chip {
  background: var(--color-bg-blue, #eef4ff);
  color: var(--color-primary, #0a84ff);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.verified-chip {
  background: #e6f7ec;
  color: #1a7f37;
}

.claimed-chip {
  background: #eef4ff;
  color: #0a84ff;
}

.top-row h1 {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  color: var(--color-purple-dark, #2b2358);
  margin-bottom: 6px;
}

.location {
  color: var(--color-muted, #666);
}

.unavailable-tag {
  color: #d0342c;
  font-weight: 600;
  margin-top: 8px;
}

.price-box {
  min-width: 220px;
  text-align: right;
}

.price {
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  font-weight: 700;
  color: var(--color-primary, #0a84ff);
  display: block;
}

.price-hint {
  color: var(--color-muted, #888);
  font-size: 0.85rem;
}

/* quick facts */
.facts {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}

.fact {
  flex: 1;
  min-width: 110px;
  background: #f7f9fc;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fact b {
  font-size: 1.05rem;
  color: var(--color-dark, #222);
}

.fact span {
  font-size: 0.78rem;
  color: var(--color-muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* layout */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 32px;
  align-items: start;
}

.main-col {
  min-width: 0;
}

.block {
  margin-bottom: 28px;
}

.subhead {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-dark, #222);
  margin-bottom: 12px;
}

.desc {
  color: var(--color-muted, #555);
  line-height: 1.75;
  white-space: pre-wrap;
  font-size: 0.98rem;
}

.attrs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.attr {
  background: #f7f9fc;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.9rem;
}

.attr span {
  color: var(--color-muted, #777);
}

.attr b {
  color: var(--color-dark, #222);
  text-transform: capitalize;
}

.amenities {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.amenity {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f7f9fc;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.88rem;
  color: var(--color-dark, #333);
  text-transform: capitalize;
}

.amenity-icon {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #eef4ff;
  color: var(--color-primary, #0a84ff);
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  font-weight: 700;
}

.video-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.video-list video {
  width: min(100%, 360px);
  border-radius: 10px;
}

.rooms {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.room {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #f7f9fc;
  border-radius: 12px;
  padding: 12px 16px;
  color: inherit;
}

.room:hover {
  background: #eef4ff;
}

.room-thumb {
  width: 72px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #e8ecf4;
}

.room-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 0.72rem;
  color: #8a94a6;
}

.room-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.room-meta {
  font-size: 0.82rem;
  color: var(--color-muted, #777);
}

.room-price {
  font-weight: 700;
  color: var(--color-primary, #0a84ff);
}

.view-link {
  color: var(--color-primary, #0a84ff);
  font-weight: 600;
  font-size: 0.88rem;
}

.slots {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #f7f9fc;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 0.9rem;
  flex-wrap: wrap;
}

/* sidebar */
.side-col {
  position: sticky;
  top: 96px;
}

.owner-card {
  background: #f7f9fc;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.owner-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.owner-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--clr-blue2, #0a84ff);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  flex-shrink: 0;
}

.owner-details {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.owner-label {
  font-size: 0.72rem;
  color: var(--color-muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.owner-details strong {
  color: var(--color-dark, #222);
  font-size: 0.98rem;
}

.owner-verified {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1a7f37;
  font-size: 0.78rem;
  font-weight: 600;
}

.claim-box {
  border: 1.5px dashed var(--color-primary, #0a84ff);
  border-radius: 10px;
  padding: 12px;
  background: var(--color-bg-blue, #eef4ff);
}

.contact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--color-border, #e8ecf3);
  border-radius: 10px;
}

.contact-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9aa0a6;
}

.contact-link {
  color: var(--color-primary, #0a84ff);
  font-size: 0.88rem;
  word-break: break-all;
}

.contact-link:hover {
  text-decoration: underline;
}

.claim-note {
  font-size: 0.82rem;
  color: var(--color-primary, #0a84ff);
  margin-bottom: 8px;
}

.claim-status {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

.claim-status.pending { color: #b7791f; }
.claim-status.approved { color: #1a7f37; }
.claim-status.rejected { color: #d0342c; }

/* booking modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(10, 12, 20, 0.55);
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: min(92vw, 440px);
  padding: 26px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h3 {
  font-size: 1.2rem;
  margin-bottom: 4px;
}

.modal-property {
  color: var(--color-muted, #666);
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-muted, #666);
}

.form-control {
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 0.92rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

/* recommendations */
.recs {
  margin-top: 44px;
}

/* safety tips */
.safety-tips {
  margin-top: 40px;
  padding: 20px 22px;
  border: 1px solid var(--color-border, #e6e6e6);
  border-radius: 12px;
  background: #faf9f6;
}

.tips-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-dark, #222);
  margin-bottom: 12px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
}

.tips-list li {
  font-size: 0.9rem;
  line-height: 1.5;
  color: #555;
}

.rec-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-dark, #222);
  margin-bottom: 18px;
}

.rec-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

/* sticky mobile bar */
.sticky-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 800;
  display: none;
  background: #fff;
  border-top: 1px solid #e8ecf3;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  gap: 10px;
  box-shadow: 0 -4px 20px rgba(16, 30, 60, 0.08);
}

.sticky-bar .sb-fav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: none;
  background: none;
  color: #8a94a6;
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 52px;
}

.sticky-bar .sb-fav.active {
  color: #ff4757;
}

.sticky-bar .sb-msg,
.sticky-bar .sb-book {
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 13px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.sticky-bar .sb-msg {
  background: #eef4ff;
  color: var(--color-primary, #0a84ff);
}

.sticky-bar .sb-book {
  background: var(--color-primary, #0a84ff);
  color: #fff;
}

.loading {
  padding: 60px 0;
}

.state-box {
  text-align: center;
  color: var(--color-muted, #666);
  padding: 80px 20px;
}

.state-box h3 {
  color: var(--color-dark, #222);
  margin-bottom: 8px;
}

.state-box p {
  margin-bottom: 18px;
}

@media (max-width: 1000px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  .side-col {
    position: static;
    order: -1;
  }
  .rec-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .sticky-bar {
    display: flex;
  }
  .price-box {
    text-align: left;
  }
}

@media (max-width: 600px) {
  .rec-grid {
    grid-template-columns: 1fr;
  }
  .gallery {
    padding: 0;
  }
  .modal-backdrop {
    align-items: flex-end;
    padding: 0;
  }
  .modal {
    width: 100%;
    border-radius: 18px 18px 0 0;
    padding: 22px 18px calc(22px + env(safe-area-inset-bottom));
    max-height: 88vh;
  }
}
</style>
