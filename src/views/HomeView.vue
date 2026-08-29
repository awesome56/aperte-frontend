<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, type Property } from '@/api'
import PropertyCard from '@/components/PropertyCard.vue'
import SectionHeading from '@/components/SectionHeading.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import { recentlyViewed } from '@/composables/recentlyViewed'

const router = useRouter()

// ---------- BUY | RENT | SHORTLET segmented control ----------
const MODES = [
  { key: 'sale', label: 'BUY', query: { purpose: 'sale' } },
  { key: 'rent', label: 'RENT', query: { purpose: 'rent' } },
  { key: 'shortlet', label: 'SHORTLET', query: { category: 'shortlet' } },
] as const
const mode = ref<(typeof MODES)[number]['key']>('rent')

// ---------- search ----------
const q = ref('')

function goSearch() {
  const m = MODES.find((x) => x.key === mode.value)!
  const query: Record<string, string> = { ...m.query }
  if (q.value.trim()) query.search = q.value.trim()
  router.push({ path: '/listings', query })
  import('@/analytics/tracker').then((t) =>
    t.default.trackEvent('home_search', 'search', { query: q.value, mode: mode.value }),
  )
}

function quickSearch(label: string) {
  const m = MODES.find((x) => x.key === mode.value)!
  router.push({ path: '/listings', query: { ...m.query, search: label } })
  import('@/analytics/tracker').then((t) =>
    t.default.trackEvent('home_suggestion', 'search', { term: label, mode: mode.value }),
  )
}

const SUGGESTIONS = [
  '2 bedroom flat in Ibadan',
  'Hotels in Bodija',
  'Land for sale in Akobo',
  'Shortlet in Jericho',
  'Venue for rent',
]

// ---------- sections ----------
const featured = ref<Property[]>([])
const affordable = ref<Property[]>([])
const newListings = ref<Property[]>([])
const stays = ref<Property[]>([])
const loading = ref(true)
const totalListings = ref(0)

const categories = ref<{ key: string; label: string; icon: string; img: string; count: number }[]>([
  { key: 'property', label: 'Homes & Offices', icon: '🏢', img: '/images/area1.jpg', count: 0 },
  { key: 'land', label: 'Land', icon: '🌳', img: '/images/area2.jpg', count: 0 },
  { key: 'shortlet', label: 'Shortlets', icon: '🛏️', img: '/images/area3.jpg', count: 0 },
  { key: 'hotel', label: 'Hotels', icon: '🏨', img: '/images/area1.jpg', count: 0 },
  { key: 'hall', label: 'Halls', icon: '🎉', img: '/images/area2.jpg', count: 0 },
  { key: 'event_center', label: 'Event Venues', icon: '🎪', img: '/images/area3.jpg', count: 0 },
])

const CITIES = ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Benin City', 'Enugu']
const CITY_LANDMARKS: Record<string, string> = {
  Lagos: '/images/landmarks/lagos.jpg?v=3',
  Abuja: '/images/landmarks/abuja.jpg?v=3',
  Ibadan: '/images/landmarks/ibadan.jpg?v=3',
  'Port Harcourt': '/images/landmarks/port-harcourt.jpg?v=3',
  'Benin City': '/images/landmarks/benin-city.jpg?v=3',
  Enugu: '/images/landmarks/enugu.jpg?v=3',
}
const CITY_LANDMARK_LABELS: Record<string, string> = {
  Lagos: 'Lekki-Ikoyi Bridge',
  Abuja: 'Abuja National Mosque',
  Ibadan: 'Cocoa House',
  'Port Harcourt': 'Pleasure Park',
  'Benin City': 'Royal Palace',
  Enugu: 'Milliken Hill',
}
const locations = ref<{ name: string; img: string; count: number; landmark: string }[]>([])

function modeParams(extra: Record<string, unknown> = {}) {
  const m = MODES.find((x) => x.key === mode.value)!
  return { ...m.query, ...extra }
}

async function loadSections() {
  try {
    const [featRes, affRes, newRes] = await Promise.all([
      propertyApi.browse(modeParams({ sort: 'popular', per_page: 8 })),
      propertyApi.browse(modeParams({ max_price: 10000000, per_page: 8 })),
      propertyApi.browse(modeParams({ sort: 'newest', per_page: 8 })),
    ])
    featured.value = featRes.data.data
    affordable.value = affRes.data.data
    newListings.value = newRes.data.data
  } catch {
    // keep sections empty
  }
}

onMounted(async () => {
  try {
    const catRes = (await Promise.all([
      propertyApi.browse({ per_page: 1 }),
      propertyApi.browse({ category: 'hotel', per_page: 3 }),
      propertyApi.browse({ category: 'shortlet', per_page: 3 }),
      ...categories.value.map((c) => propertyApi.browse({ category: c.key, per_page: 1 })),
      ...CITIES.map((c) => propertyApi.browse({ city: c, per_page: 1 })),
    ])) as any[]
    totalListings.value = catRes[0]?.data?.meta?.total_count ?? 0
    categories.value = categories.value.map((c, i) => ({
      ...c,
      count: catRes[i + 3]?.data.meta.total_count ?? 0,
    }))
    stays.value = [...(catRes[1]?.data?.data ?? []), ...(catRes[2]?.data?.data ?? [])]
    locations.value = CITIES.map((name, i) => {
      const r = catRes[i + 9]
      return {
        name,
        img: CITY_LANDMARKS[name] || '',
        landmark: CITY_LANDMARK_LABELS[name] || '',
        count: r?.data?.meta?.total_count ?? 0,
      }
    })
  } catch {
    // keep defaults
  }
  await loadSections()
  loading.value = false
})

watch(mode, () => {
  import('@/analytics/tracker').then((t) =>
    t.default.trackEvent('home_mode', 'search', { mode: mode.value }),
  )
  loading.value = true
  loadSections().finally(() => (loading.value = false))
})
</script>

<template>
  <main class="home">
    <!-- ============ HERO ============ -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <h1 class="hero-title">Find a place you'll love.</h1>
          <p class="hero-sub">Homes • Land • Offices • Stays • Venues</p>
          <p class="hero-desc">
            Aperte connects Nigerian property owners, agents, travelers and seekers — rent, buy or book
            with no middlemen.
          </p>
        </div>
        <div class="hero-art"><img src="/images/hero.jpg" alt="A property in Nigeria" /></div>
      </div>

      <div class="container hero-search-wrap">
        <form class="home-search" @submit.prevent="goSearch">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input v-model="q" type="text" :placeholder="`Search ${MODES.find((m) => m.key === mode)?.label.toLowerCase()} properties, areas…`" aria-label="Search properties" />
          <button type="submit" class="btn btn-primary hs-btn">Search</button>
        </form>

        <div class="suggest-chips">
          <span class="sc-label">Try:</span>
          <button v-for="s in SUGGESTIONS" :key="s" class="sc-chip" @click="quickSearch(s)">{{ s }}</button>
        </div>
      </div>

      <div class="container hero-stats">
        <div class="stat">
          <span class="hs-val">{{ totalListings.toLocaleString() }}+</span>
          <span class="hs-lbl">Live listings</span>
        </div>
        <div class="stat">
          <span class="hs-val">Rent · Buy · Book</span>
          <span class="hs-lbl">Homes, land, stays &amp; venues</span>
        </div>
        <div class="stat">
          <span class="hs-val">Direct</span>
          <span class="hs-lbl">Message owners, no middlemen</span>
        </div>
      </div>
    </section>

    <!-- ============ BUY | RENT | SHORTLET ============ -->
    <section class="container seg-wrap">
      <div class="seg">
        <button
          v-for="m in MODES"
          :key="m.key"
          :class="{ active: mode === m.key }"
          @click="mode = m.key"
        >{{ m.label }}</button>
      </div>
    </section>

    <!-- ============ CATEGORIES ============ -->
    <section class="container">
      <SectionHeading label="Explore" title="Categories" />
      <div class="cat-row">
        <RouterLink
          v-for="c in categories"
          :key="c.key"
          :to="{ path: '/listings', query: { ...(MODES.find((m) => m.key === mode)?.query as object), category: c.key } }"
          class="cat-tile"
        >
          <img class="cat-img" :src="c.img" :alt="c.label" loading="lazy" />
          <span class="cat-icon">{{ c.icon }}</span>
          <span class="cat-label">{{ c.label }}</span>
          <span class="cat-count">{{ c.count.toLocaleString() }}</span>
        </RouterLink>
      </div>
    </section>

    <!-- ============ FEATURED PROPERTIES ============ -->
    <section class="section">
      <div class="container">
        <SectionHeading label="Handpicked" title="Featured Properties" link="/listings?sort=popular" />
        <div v-if="loading" class="h-scroll">
          <SkeletonCard v-for="i in 3" :key="i" class="h-card-skeleton" />
        </div>
        <div v-else-if="featured.length" class="h-scroll">
          <PropertyCard v-for="p in featured" :key="p.id" :property="p" class="h-card" />
        </div>
        <div v-else class="empty">New listings are on the way — be the first to post one.</div>
      </div>
    </section>

    <!-- ============ UNDER ₦10M ============ -->
    <section class="section alt">
      <div class="container">
        <SectionHeading label="Budget picks" title="Properties Under ₦10M" link="/listings?max_price=10000000" />
        <div v-if="loading" class="h-scroll">
          <SkeletonCard v-for="i in 3" :key="i" class="h-card-skeleton" />
        </div>
        <div v-else-if="affordable.length" class="h-scroll">
          <PropertyCard v-for="p in affordable" :key="p.id" :property="p" class="h-card" />
        </div>
        <div v-else class="empty">No properties in this range yet.</div>
      </div>
    </section>

    <!-- ============ POPULAR LOCATIONS ============ -->
    <section class="section">
      <div class="container">
        <SectionHeading label="Locations" title="Popular areas" link="/listings" />
        <div class="h-scroll loc-scroll">
          <RouterLink
            v-for="l in locations"
            :key="l.name"
            :to="`/listings?city=${encodeURIComponent(l.name)}`"
            class="loc-tile"
          >
            <div class="loc-img-wrap">
              <img v-if="l.img" :src="l.img" :alt="l.name" loading="lazy" />
              <span v-else class="loc-fallback">{{ l.name[0] }}</span>
            </div>
            <div class="loc-info">
              <strong>{{ l.name }}</strong>
              <em class="loc-landmark">{{ l.landmark }}</em>
              <span>{{ l.count.toLocaleString() }} properties</span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ============ NEWLY LISTED ============ -->
    <section class="section alt">
      <div class="container">
        <SectionHeading label="Just listed" title="New listings" link="/listings?sort=newest" />
        <div v-if="loading" class="grid">
          <SkeletonCard v-for="i in 4" :key="i" />
        </div>
        <div v-else-if="newListings.length" class="grid">
          <PropertyCard v-for="p in newListings.slice(0, 4)" :key="p.id" :property="p" />
        </div>
        <div v-else class="empty">No new listings yet.</div>
      </div>
    </section>

    <!-- ============ RECENTLY VIEWED ============ -->
    <section v-if="recentlyViewed.length" class="section">
      <div class="container">
        <SectionHeading label="Pick up where you left off" title="Recently viewed" link="/favorites" />
        <div class="h-scroll">
          <PropertyCard
            v-for="r in recentlyViewed.slice(0, 8)"
            :key="r.id"
            :property="{
              id: r.id, title: r.title, dp: r.dp, price: r.price, currency: r.currency,
              city: r.city, state: r.state, category: r.category, purpose: r.purpose,
            } as unknown as Property"
            class="h-card"
          />
        </div>
      </div>
    </section>

    <!-- ============ SHORTLETS & STAYS ============ -->
    <section v-if="stays.length" class="section alt">
      <div class="container">
        <SectionHeading label="Hospitality" title="Shortlets, hotels & venues" link="/listings?category=shortlet" />
        <div class="h-scroll">
          <PropertyCard v-for="p in stays.slice(0, 6)" :key="p.id" :property="p" class="h-card" />
        </div>
      </div>
    </section>

    <!-- ============ REQUESTS PROMO ============ -->
    <section class="promo requests-promo">
      <div class="container promo-inner">
        <div>
          <span class="section-label">Find what isn't listed</span>
          <h2>Tell us what you're looking for.</h2>
          <p>Post a request — 3-bedroom apartment in Lekki, budget ₦4m/year — and let property owners come to you.</p>
        </div>
        <div class="promo-actions">
          <RouterLink to="/create-request" class="btn btn-primary">Post a Request</RouterLink>
          <RouterLink to="/browse-requests" class="btn btn-outline">Browse Requests</RouterLink>
        </div>
      </div>
    </section>

    <!-- ============ LIST PROPERTY CTA ============ -->
    <section class="promo owner-promo">
      <div class="container promo-inner">
        <div>
          <span class="section-label">Owners &amp; agents</span>
          <h2>Own property? List it on Aperte.</h2>
          <p>Reach thousands of people looking for their next home, land or stay — list for free and manage everything in one place.</p>
        </div>
        <RouterLink to="/add-listing" class="btn btn-light">List Your Property</RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ---------- hero (desktop default) ---------- */
.hero {
  background: linear-gradient(180deg, #f5f8ff 0%, #fff 100%);
  padding: 48px 0 20px;
}

.hero-inner {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 48px;
  align-items: center;
}

.hero-title {
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  font-weight: 700;
  line-height: 1.08;
  color: var(--clr-black, #111);
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}

.hero-sub {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--clr-blue2, #0a84ff);
  margin: 10px 0 14px;
  letter-spacing: 0.02em;
}

.hero-desc {
  color: var(--clr-muted, #555);
  font-size: 1rem;
  max-width: 460px;
  line-height: 1.6;
  margin: 0;
}

.hero-art {
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(10, 60, 120, 0.16);
}

.hero-art img {
  width: 100%;
  height: 380px;
  object-fit: cover;
}

.hero-search-wrap {
  margin-top: 36px;
}

.home-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1.5px solid #e5e8ee;
  border-radius: 12px;
  padding: 6px 6px 6px 14px;
  box-shadow: 0 4px 18px rgba(16, 30, 60, 0.06);
  max-width: 640px;
}

.home-search:focus-within {
  border-color: var(--color-primary, #0a84ff);
}

.home-search svg {
  color: var(--color-muted, #888);
  flex-shrink: 0;
}

.home-search input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  min-width: 0;
}

.hs-btn {
  padding: 10px 18px;
  font-size: 0.9rem;
  border-radius: 10px;
}

/* hero stats */
.hero-stats {
  display: flex;
  gap: 48px;
  padding: 36px 0 30px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hs-val {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--clr-dark, #222);
}

.hs-lbl {
  color: var(--clr-muted, #666);
  font-size: 0.9rem;
}

/* ---------- suggestions ---------- */
.suggest-chips {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 0 4px;
  max-width: 640px;
}

.sc-label {
  font-size: 0.78rem;
  color: var(--color-muted, #888);
  flex-shrink: 0;
}

.sc-chip {
  flex-shrink: 0;
  border: 1px solid #e5e8ee;
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.78rem;
  color: var(--clr-dark, #333);
  white-space: nowrap;
  cursor: pointer;
}
.sc-chip:hover { border-color: var(--clr-blue, #0a84ff); color: var(--clr-blue, #0a84ff); }

/* ---------- segmented control ---------- */
.seg-wrap {
  padding-top: 14px;
  padding-bottom: 0;
}

.seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #eef1f6;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  max-width: 520px;
  margin: 0 auto;
}

.seg button {
  border: none;
  background: transparent;
  border-radius: 9px;
  padding: 11px 0;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #555;
  transition: all 0.15s;
  cursor: pointer;
}

.seg button.active {
  background: #fff;
  color: var(--color-primary, #0a84ff);
  box-shadow: 0 2px 8px rgba(16, 30, 60, 0.1);
}

/* ---------- categories (desktop: image grid) ---------- */
.cat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 4px 0 8px;
}

.cat-tile {
  position: relative;
  display: block;
  border-radius: 14px;
  overflow: hidden;
  height: 210px;
  border: 1px solid #eef0f3;
  background: #fff;
  text-align: left;
  transition: transform 0.2s;
}
.cat-tile:hover { transform: translateY(-2px); }
.cat-tile:hover .cat-img { transform: scale(1.05); }

.cat-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s;
}

.cat-icon {
  display: none;
}

.cat-label {
  position: absolute;
  left: 14px;
  bottom: 32px;
  color: #fff;
  font-size: 1.05rem;
  font-weight: 700;
  z-index: 1;
  text-shadow: 0 1px 8px rgba(0,0,0,0.4);
}
.cat-count {
  position: absolute;
  left: 14px;
  bottom: 12px;
  color: rgba(255,255,255,0.9);
  font-size: 0.82rem;
  z-index: 1;
}
.cat-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 40%, rgba(0,0,0,0.68) 100%);
  pointer-events: none;
}

/* ---------- horizontal scroll sections (desktop: grid) ---------- */
.h-scroll {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  padding: 4px 0 10px;
}

/* keep 4-col grid for stays? use auto */
.h-scroll :deep(.card),
.h-scroll :deep(.h-card-skeleton) {
  width: 100%;
}

/* ---------- location tiles (desktop: image card with overlay) ---------- */
.loc-tile {
  display: block;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #eef0f3;
  background: #fff;
  height: 170px;
  position: relative;
}

.loc-img-wrap {
  position: absolute;
  inset: 0;
  background: #eef1f6;
}

.loc-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s;
}
.loc-tile:hover .loc-img-wrap img { transform: scale(1.05); }

.loc-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 2rem;
  font-weight: 700;
  color: #b9c2d0;
}

.loc-info {
  position: absolute;
  inset: auto 0 0 0;
  padding: 30px 14px 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.68));
  z-index: 1;
}

.loc-info strong {
  display: block;
  font-size: 1rem;
  color: #fff;
}
.loc-info span {
  font-size: 0.82rem;
  color: rgba(255,255,255,0.9);
}
.loc-landmark {
  display: block;
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 500;
  color: rgba(255,255,255,0.88);
  margin-top: 1px;
}

/* ---------- sections ---------- */
.section {
  padding: 56px 0;
}

.section.alt {
  background: #f7f9fc;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.empty {
  text-align: center;
  color: var(--color-muted, #888);
  padding: 40px 0;
  font-size: 0.95rem;
}

/* ---------- promos ---------- */
.promo {
  padding: 0;
}
.promo-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  border-radius: 18px;
  padding: 40px 44px;
  flex-wrap: wrap;
  margin: 56px auto;
}

.requests-promo .promo-inner {
  background: linear-gradient(120deg, #eaf3ff, #f5f0ff);
}

.owner-promo .promo-inner {
  background: var(--clr-purple-btn, #4b2a85);
}

.promo h2 {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  color: var(--clr-dark, #1c1c1c);
  margin: 4px 0 8px;
}

.promo p {
  color: var(--clr-muted, #555);
  max-width: 520px;
  line-height: 1.6;
}

.owner-promo h2,
.owner-promo p {
  color: #fff;
}
.owner-promo .section-label {
  color: #b9a6e8;
}

.promo-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-light {
  background: #fff;
  color: var(--clr-purple-btn, #4b2a85);
  font-weight: 600;
  padding: 10px 24px;
  font-size: 0.92rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  text-decoration: none;
}
.btn-light:hover { background: #efe9fb; }

/* ---------- responsive (mobile overrides) ---------- */
@media (max-width: 1000px) {
  .hero-inner {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .hero-art img {
    height: 280px;
  }
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 20px 0 8px;
    background: linear-gradient(180deg, #f5f8ff 0%, #fff 100%);
  }
  .hero-inner {
    gap: 0;
  }
  .hero-title {
    font-size: clamp(1.8rem, 5vw, 3rem);
    line-height: 1.1;
  }
  .hero-sub {
    font-size: 0.95rem;
    margin: 0 0 16px;
  }
  .hero-desc {
    display: none;
  }
  .hero-art {
    display: none;
  }
  .hero-search-wrap {
    margin-top: 0;
  }
  .home-search {
    max-width: none;
  }
  .suggest-chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    max-width: none;
  }
  .suggest-chips::-webkit-scrollbar { display: none; }
  .hero-stats {
    display: none;
  }
  .section {
    padding: 26px 0;
  }
  .promo-inner {
    margin: 26px auto;
    padding: 28px 22px;
    border-radius: 14px;
  }
  /* categories -> horizontal scroll Jumia style */
  .cat-row {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 8px;
  }
  .cat-row::-webkit-scrollbar { display: none; }
  .cat-tile {
    flex: 0 0 110px;
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 8px;
    background: #fff;
    border: 1px solid #eef0f3;
    border-radius: 14px;
    text-align: center;
    overflow: visible;
  }
  .cat-tile::after { display: none; }
  .cat-img { display: none; }
  .cat-icon {
    display: block;
    font-size: 1.6rem;
    line-height: 1;
  }
  .cat-label {
    position: static;
    color: var(--clr-dark, #222);
    font-size: 0.82rem;
    font-weight: 600;
    text-shadow: none;
  }
  .cat-count {
    position: static;
    color: var(--color-muted, #888);
    font-size: 0.72rem;
  }
  /* h-scroll -> flex horizontal on mobile */
  .h-scroll {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    margin: 0 -16px;
    padding: 4px 16px 10px;
  }
  .h-scroll::-webkit-scrollbar { display: none; }
  .h-scroll :deep(.card) {
    flex: 0 0 62vw;
    max-width: 240px;
    scroll-snap-align: start;
  }
  .h-scroll :deep(.h-card-skeleton) {
    flex: 0 0 62vw;
    max-width: 240px;
  }
  /* locations horizontal on mobile */
  .loc-tile {
    flex: 0 0 130px;
    height: auto;
    border-radius: 14px;
    overflow: hidden;
    display: block;
    position: relative;
  }
  .loc-img-wrap {
    position: relative;
    inset: auto;
    height: 90px;
    overflow: hidden;
  }
  .loc-info {
    position: static;
    background: #fff;
    padding: 8px 10px 10px;
  }
  .loc-info strong { color: var(--clr-dark, #222); font-size: 0.88rem; }
  .loc-info span { color: var(--color-muted, #888); font-size: 0.72rem; }
  .loc-info .loc-landmark { color: var(--clr-blue2, #0a84ff); font-size: 0.68rem; margin: 0; }
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .hs-btn {
    padding: 10px 14px;
  }
  .seg {
    max-width: none;
  }
}

@media (max-width: 400px) {
  .h-scroll :deep(.card) {
    flex: 0 0 66vw;
  }
  .cat-tile {
    flex: 0 0 100px;
  }
}
</style>
