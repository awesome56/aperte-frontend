<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, type Property } from '@/api'
import PropertyCard from '@/components/PropertyCard.vue'
import SectionHeading from '@/components/SectionHeading.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'

const router = useRouter()

// guided search
const looking = ref('rent') // rent | buy | shortlet | hotel | venue | office | commercial | land
const city = ref('')
const budgetMin = ref('')
const budgetMax = ref('')

const LOOKING_OPTIONS = [
  { key: 'rent', label: 'Rent', purpose: 'rent', category: '' },
  { key: 'buy', label: 'Buy', purpose: 'sale', category: '' },
  { key: 'land', label: 'Land', purpose: '', category: 'land' },
  { key: 'shortlet', label: 'Shortlet', purpose: '', category: 'shortlet' },
  { key: 'hotel', label: 'Hotel', purpose: '', category: 'hotel' },
  { key: 'venue', label: 'Event Venue', purpose: '', category: 'event_center' },
  { key: 'office', label: 'Office', purpose: '', category: 'property' },
  { key: 'commercial', label: 'Commercial', purpose: '', category: 'property' },
]

const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Benin City', 'Enugu', 'Kano', 'Owerri', 'Abeokuta', 'Onitsha']

// sections
const popular = ref<Property[]>([])
const newListings = ref<Property[]>([])
const stays = ref<Property[]>([])
const loading = ref(true)
const totalListings = ref(0)

const categories = ref<{ key: string; label: string; img: string; count: number }[]>([
  { key: 'property', label: 'Homes & Offices', img: '/images/area1.jpg', count: 0 },
  { key: 'land', label: 'Land', img: '/images/area2.jpg', count: 0 },
  { key: 'hotel', label: 'Hotels', img: '/images/area3.jpg', count: 0 },
  { key: 'shortlet', label: 'Shortlets', img: '/images/area1.jpg', count: 0 },
  { key: 'hall', label: 'Halls', img: '/images/area2.jpg', count: 0 },
  { key: 'event_center', label: 'Event Venues', img: '/images/area3.jpg', count: 0 },
])

const locationImages = ['/images/area1.jpg', '/images/area2.jpg', '/images/area3.jpg', '/images/area1.jpg', '/images/area2.jpg', '/images/area3.jpg']
const locations = CITIES.slice(0, 6).map((name, i) => ({ name, img: locationImages[i] }))

function search() {
  const opt = LOOKING_OPTIONS.find((o) => o.key === looking.value)
  const query: Record<string, string> = { purpose: opt?.purpose || '', category: opt?.category || '' }
  if (city.value) query.city = city.value
  if (budgetMin.value) query.min_price = budgetMin.value
  if (budgetMax.value) query.max_price = budgetMax.value
  router.push({ path: '/listings', query })
  import('@/analytics/tracker').then((m) =>
    m.default.trackEvent('home_search', 'search', { looking: looking.value, city: city.value, has_budget: Boolean(budgetMin.value || budgetMax.value) }),
  )
}

onMounted(async () => {
  try {
    const [popularRes, newRes, staysRes, staysRes2, ...catRes] = await Promise.all([
      propertyApi.browse({ sort: 'popular', per_page: 6 }),
      propertyApi.browse({ sort: 'newest', per_page: 6 }),
      propertyApi.browse({ category: 'hotel', per_page: 3 }),
      propertyApi.browse({ category: 'shortlet', per_page: 3 }),
      propertyApi.browse({ per_page: 1 }),
      ...categories.value.map((c) => propertyApi.browse({ category: c.key, per_page: 1 })),
    ])
    popular.value = popularRes.data.data
    newListings.value = newRes.data.data
    stays.value = [...staysRes.data.data, ...staysRes2.data.data]
    totalListings.value = catRes[0].data.meta.total_count
    categories.value = categories.value.map((c, i) => ({ ...c, count: catRes[i + 1]?.data.meta.total_count ?? 0 }))
  } catch {
    // keep empty sections
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main>
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

      <!-- guided search -->
      <div class="container search-card-wrap">
        <div class="search-card">
          <div class="search-step">
            <span class="step-label">What are you looking for?</span>
            <div class="chip-row">
              <button
                v-for="o in LOOKING_OPTIONS"
                :key="o.key"
                class="chip"
                :class="{ active: looking === o.key }"
                @click="looking = o.key"
              >{{ o.label }}</button>
            </div>
          </div>
          <div class="search-step">
            <span class="step-label">Where?</span>
            <div class="chip-row">
              <button
                v-for="c in CITIES"
                :key="c"
                class="chip"
                :class="{ active: city === c }"
                @click="city = city === c ? '' : c"
              >{{ c }}</button>
            </div>
          </div>
          <div class="search-step">
            <span class="step-label">Budget (₦/year or ₦/night)</span>
            <div class="budget-row">
              <input v-model="budgetMin" type="number" min="0" placeholder="Min" />
              <span class="dash">–</span>
              <input v-model="budgetMax" type="number" min="0" placeholder="Max" />
            </div>
          </div>
          <button class="btn btn-primary search-btn" @click="search">Search</button>
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

    <!-- ============ POPULAR IN NIGERIA ============ -->
    <section class="section">
      <div class="container">
        <SectionHeading label="Trending" title="Popular in Nigeria" link="/listings?sort=popular" />
        <div v-if="loading" class="grid"><SkeletonCard v-for="i in 6" :key="i" /></div>
        <div v-else-if="popular.length" class="grid">
          <PropertyCard v-for="p in popular" :key="p.id" :property="p" />
        </div>
        <div v-else class="empty">New listings are on the way — be the first to post one.</div>
      </div>
    </section>

    <!-- ============ EXPLORE BY CATEGORY ============ -->
    <section class="section alt">
      <div class="container">
        <SectionHeading label="Explore" title="Browse by category" />
        <div class="cat-grid">
          <RouterLink v-for="c in categories" :key="c.key" :to="`/listings?category=${c.key}`" class="cat-card">
            <img :src="c.img" :alt="c.label" loading="lazy" />
            <div class="cat-info">
              <strong>{{ c.label }}</strong>
              <span>{{ c.count }} listings</span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ============ POPULAR LOCATIONS ============ -->
    <section class="section">
      <div class="container">
        <SectionHeading label="Locations" title="Popular in your area" link="/listings" />
        <div class="loc-grid">
          <RouterLink v-for="l in locations" :key="l.name" :to="`/listings?city=${encodeURIComponent(l.name)}`" class="loc-card">
            <img :src="l.img" :alt="l.name" loading="lazy" />
            <strong>{{ l.name }}</strong>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ============ NEW LISTINGS ============ -->
    <section class="section alt">
      <div class="container">
        <SectionHeading label="Just listed" title="New listings" link="/listings?sort=newest" />
        <div v-if="loading" class="grid"><SkeletonCard v-for="i in 6" :key="i" /></div>
        <div v-else-if="newListings.length" class="grid">
          <PropertyCard v-for="p in newListings" :key="p.id" :property="p" />
        </div>
        <div v-else class="empty">No new listings yet.</div>
      </div>
    </section>

    <!-- ============ SHORTLETS & STAYS ============ -->
    <section class="section">
      <div class="container">
        <SectionHeading label="Hospitality" title="Shortlets, hotels & venues" link="/listings?category=shortlet" />
        <div v-if="loading" class="grid"><SkeletonCard v-for="i in 3" :key="i" height="280px" /></div>
        <div v-else-if="stays.length" class="grid stay-grid">
          <PropertyCard v-for="p in stays.slice(0, 3)" :key="p.id" :property="p" />
        </div>
        <div v-else class="empty">Bookable stays are coming soon.</div>
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
/* --------- HERO --------- */
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

/* guided search */
.search-card-wrap {
  margin-top: 36px;
}

.search-card {
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(20, 40, 80, 0.08);
  padding: 22px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.step-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--clr-muted, #666);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 9px 16px;
  border-radius: 24px;
  border: 1.5px solid var(--clr-line, #e5e8ee);
  background: #fff;
  color: var(--clr-dark, #333);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover {
  border-color: var(--clr-blue, #0a84ff);
  color: var(--clr-blue, #0a84ff);
}

.chip.active {
  background: var(--clr-blue, #0a84ff);
  border-color: var(--clr-blue, #0a84ff);
  color: #fff;
}

.budget-row {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 360px;
}

.budget-row input {
  flex: 1;
  border: 1.5px solid var(--clr-line, #e5e8ee);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 1rem;
  min-width: 0;
}

.budget-row .dash {
  color: var(--clr-muted, #888);
}

.search-btn {
  align-self: flex-start;
  padding: 10px 24px;
  font-size: 0.95rem;
}

/* stats */
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

/* --------- SECTIONS --------- */
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

.stay-grid {
  grid-template-columns: repeat(3, 1fr);
}

.empty {
  text-align: center;
  color: var(--clr-muted, #888);
  padding: 40px 0;
}

/* categories */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.cat-card {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  height: 210px;
  display: block;
}

.cat-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s;
}

.cat-card:hover img {
  transform: scale(1.05);
}

.cat-info {
  position: absolute;
  inset: auto 0 0 0;
  padding: 40px 16px 14px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.72));
  color: #fff;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.cat-info strong {
  font-size: 1.05rem;
}

.cat-info span {
  font-size: 0.82rem;
  opacity: 0.9;
}

/* locations */
.loc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.loc-card {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  height: 170px;
  display: block;
}

.loc-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s;
}

.loc-card:hover img {
  transform: scale(1.05);
}

.loc-card strong {
  position: absolute;
  inset: auto 0 0 0;
  padding: 30px 14px 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.68));
  color: #fff;
  font-size: 1rem;
}

/* promos */
.promo {
  padding: 56px 0;
}

.promo-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  border-radius: 18px;
  padding: 40px 44px;
  flex-wrap: wrap;
}

.requests-promo .promo-inner {
  background: linear-gradient(120deg, #eaf3ff, #f5f0ff);
}

.owner-promo .promo-inner {
  background: var(--clr-purple-btn, #4b2a85);
}

.promo h2 {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 700;
  color: var(--clr-dark, #1c1c1c);
  margin: 4px 0 8px;
}

.promo p {
  color: var(--clr-muted, #555);
  max-width: 520px;
  line-height: 1.6;
}

.section-label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--clr-blue2, #0a84ff);
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

.promo-actions .btn {
  padding: 10px 24px;
  font-size: 0.92rem;
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

.btn-light:hover {
  background: #efe9fb;
}

/* --------- RESPONSIVE --------- */
@media (max-width: 1000px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }
  .hero-art img {
    height: 280px;
  }
}

@media (max-width: 800px) {
  .grid,
  .cat-grid,
  .loc-grid {
    grid-template-columns: 1fr 1fr;
  }
  .search-btn {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .grid,
  .cat-grid,
  .loc-grid {
    grid-template-columns: 1fr;
  }
  .promo-inner {
    padding: 28px 22px;
  }
}
</style>
