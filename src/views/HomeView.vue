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

const categories = ref<{ key: string; label: string; icon: string; count: number }[]>([
  { key: 'property', label: 'Homes & Offices', icon: '🏢', count: 0 },
  { key: 'land', label: 'Land', icon: '🌳', count: 0 },
  { key: 'shortlet', label: 'Shortlets', icon: '🛏️', count: 0 },
  { key: 'hotel', label: 'Hotels', icon: '🏨', count: 0 },
  { key: 'hall', label: 'Halls', icon: '🎉', count: 0 },
  { key: 'event_center', label: 'Event Venues', icon: '🎪', count: 0 },
])

const CITIES = ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Benin City', 'Enugu']
const locations = ref<{ name: string; img: string; count: number }[]>([])

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
    categories.value = categories.value.map((c, i) => ({
      ...c,
      count: catRes[i + 2]?.data.meta.total_count ?? 0,
    }))
    stays.value = [...(catRes[1]?.data?.data ?? []), ...(catRes[2]?.data?.data ?? [])]
    locations.value = CITIES.map((name, i) => {
      const r = catRes[i + 8]
      const p = r?.data?.data?.[0]
      return {
        name,
        img: p?.dp || '',
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
    <!-- ============ HERO / SEARCH ============ -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <h1 class="hero-title">Find a place you'll love.</h1>
          <p class="hero-sub">Buy • Rent • Shortlets • Hotels • Venues</p>
        </div>

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
        <div class="h-scroll">
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
/* ---------- hero ---------- */
.hero {
  background: linear-gradient(180deg, #f5f8ff 0%, #fff 100%);
  padding: 28px 0 18px;
}

.hero-title {
  font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 700;
  line-height: 1.1;
  color: var(--clr-black, #111);
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}

.hero-sub {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--clr-blue2, #0a84ff);
  margin: 0 0 16px;
  letter-spacing: 0.02em;
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

/* ---------- suggestions ---------- */
.suggest-chips {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
  padding: 12px 0 4px;
  scrollbar-width: none;
}

.suggest-chips::-webkit-scrollbar {
  display: none;
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
}

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
}

.seg button.active {
  background: #fff;
  color: var(--color-primary, #0a84ff);
  box-shadow: 0 2px 8px rgba(16, 30, 60, 0.1);
}

/* ---------- category tiles ---------- */
.cat-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 0 8px;
  scrollbar-width: none;
}

.cat-row::-webkit-scrollbar {
  display: none;
}

.cat-tile {
  flex: 0 0 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 14px;
  text-align: center;
  transition: border-color 0.15s, transform 0.15s;
}

.cat-tile:active {
  transform: scale(0.97);
}

.cat-icon {
  font-size: 1.6rem;
  line-height: 1;
}

.cat-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--clr-dark, #222);
}

.cat-count {
  font-size: 0.72rem;
  color: var(--color-muted, #888);
}

/* ---------- horizontal scroll sections ---------- */
.h-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 0 10px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
}

.h-scroll::-webkit-scrollbar {
  display: none;
}

.h-scroll :deep(.card) {
  flex: 0 0 250px;
  scroll-snap-align: start;
}

.h-scroll :deep(.h-card-skeleton) {
  flex: 0 0 250px;
}

/* ---------- location tiles ---------- */
.loc-tile {
  flex: 0 0 130px;
  display: block;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #eef0f3;
  background: #fff;
}

.loc-img-wrap {
  height: 90px;
  overflow: hidden;
  background: #eef1f6;
}

.loc-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.loc-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 2rem;
  font-weight: 700;
  color: #b9c2d0;
}

.loc-info {
  padding: 8px 10px 10px;
}

.loc-info strong {
  display: block;
  font-size: 0.88rem;
  color: var(--clr-dark, #222);
}

.loc-info span {
  font-size: 0.72rem;
  color: var(--color-muted, #888);
}

/* ---------- sections ---------- */
.section {
  padding: 34px 0;
}

.section.alt {
  background: #f7f9fc;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.empty {
  text-align: center;
  color: var(--color-muted, #888);
  padding: 30px 0;
  font-size: 0.95rem;
}

/* ---------- promos ---------- */
.promo-inner {
  padding: 40px 0;
}

.promo h2 {
  font-size: clamp(1.5rem, 4vw, 2.2rem);
  margin: 6px 0 8px;
}

.promo p {
  color: #444;
  max-width: 520px;
}

.promo-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.requests-promo {
  background: linear-gradient(120deg, #eef4ff, #e7edfb);
}

.owner-promo {
  background: #151a24;
  color: #fff;
}

.owner-promo p {
  color: #b7bfcc;
}

/* ---------- responsive ---------- */
@media (min-width: 769px) {
  .hero {
    padding: 48px 0 24px;
  }
  .hero-inner {
    max-width: 640px;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 20px 0 8px;
  }
  .section {
    padding: 26px 0;
  }
  .h-scroll {
    margin: 0 -16px;
    padding: 4px 16px 10px;
  }
  .h-scroll :deep(.card) {
    flex: 0 0 62vw;
    max-width: 240px;
  }
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .promo-inner {
    padding: 28px 0;
  }
  .hs-btn {
    padding: 10px 14px;
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
