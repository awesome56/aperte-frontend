<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, type Property } from '@/api'
import PropertyCard from '@/components/PropertyCard.vue'

const router = useRouter()
const purpose = ref('rent')
const keyword = ref('')
const category = ref('')
const rooms = ref('')

const latest = ref<Property[]>([])
const loadingLatest = ref(true)
const totalListings = ref(0)
const listTab = ref('All' as 'All' | 'Rent' | 'Sell')

const filtered = computed(() => {
  if (listTab.value === 'All') return latest.value
  return latest.value.filter(p => p.purpose === listTab.value.toLowerCase())
})

const categories = ref([
  { key: 'property', label: 'Apartments & Houses', img: '/images/area1.jpg' },
  { key: 'land', label: 'Land', img: '/images/area2.jpg' },
  { key: 'hotel', label: 'Hotels', img: '/images/area3.jpg' },
  { key: 'shortlet', label: 'Shortlets', img: '/images/area1.jpg' },
  { key: 'hall', label: 'Halls', img: '/images/area2.jpg' },
  { key: 'event_center', label: 'Event Centers', img: '/images/area3.jpg' },
])

const services = [
  { title: 'List & Sell Properties', icon: 'M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z', desc: 'List apartments, houses, land and offices for rent or sale — reach thousands of seekers instantly.' },
  { title: 'Rent & Book Stays', icon: 'M2 17h20v-6a3 3 0 0 0-3-3H2v9z', desc: 'Book hotels, shortlets, halls and event centers directly with secure requests and instant owner confirmation.' },
  { title: 'Post a Property Request', icon: 'M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8z', desc: "Tell owners exactly what you're looking for — they contact you directly with matching offers." },
]

const howItWorks = [
  { step: '01', title: 'Create an Account', desc: 'Sign up free and claim or list your property in minutes.' },
  { step: '02', title: 'Browse, Book & Chat', desc: 'Explore verified listings, book hotels and shortlets, and message owners directly.' },
  { step: '03', title: 'Get Matched', desc: 'Post a request for what you need and let property owners come to you.' },
]

const whyAperte = [
  { title: 'Verified Listings', desc: 'Admins verify ownership claims so you deal with genuine owners.' },
  { title: 'Secure Bookings', desc: 'Hotels, shortlets, halls and event centers bookable in a few taps.' },
  { title: 'Direct Messaging', desc: 'Chat with owners and send voice notes — no middlemen.' },
  { title: 'One Platform', desc: 'Rent, sale, hospitality and requests all in one place.' },
]

const cities = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Enugu', 'Kano']

function search() {
  router.push({ path: '/listings', query: { purpose: purpose.value, city: keyword.value || undefined, category: category.value || undefined } })
}

onMounted(async () => {
  try {
    const [latestRes, ...catRes] = await Promise.all([
      propertyApi.browse({ per_page: 6 }),
      ...categories.value.map((c) => propertyApi.browse({ category: c.key, per_page: 1 })),
    ])
    latest.value = latestRes.data.data
    totalListings.value = latestRes.data.meta.total_count
    categories.value = categories.value.map((c, i) => ({ ...c, count: catRes[i].data.meta.total_count }))
  } catch {
    latest.value = []
  } finally {
    loadingLatest.value = false
  }
})
</script>

<template>
  <!-- ============ HERO ============ -->
  <section class="hero">
    <div class="container hero-grid">
      <div class="hero-left">
        <span class="hero-label">APERTE REAL ESTATE</span>
        <h1 class="hero-title">Find your perfect property — rent, buy or book</h1>
        <p class="hero-desc">Apartments, houses, land, hotels, shortlets, halls and event centers across Nigeria. List, discover, book and connect with owners directly — all on one platform.</p>
        <div class="hero-img"><img src="/images/hero.jpg" alt="Property" /></div>
      </div>

      <div class="hero-right">
        <div class="search-box">
          <div class="search-tabs">
            <button :class="{active:purpose==='sale'}" @click="purpose='sale'">For Sale</button>
            <button :class="{active:purpose==='rent'}" @click="purpose='rent'">For Rent</button>
          </div>
          <div class="field">
            <input v-model="keyword" placeholder="Lagos, Abuja, Port Harcourt…" />
          </div>
          <div class="field">
            <select v-model="category"><option value="">Select Property Type</option><option value="property">Property</option><option value="land">Land</option><option value="hotel">Hotel</option><option value="hall">Hall</option><option value="event_center">Event Center</option><option value="shortlet">Shortlet</option></select>
          </div>
          <div class="field">
            <select v-model="rooms"><option value="">Select Rooms</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select>
          </div>
          <button class="btn btn-primary search-btn" @click="search">Search</button>
          <a class="adv-link" href="#" @click.prevent="router.push('/listings')">Advance Search</a>
        </div>
      </div>
    </div>

    <div class="container hero-stats">
      <div class="stat"><span class="hs-val">{{ totalListings.toLocaleString() }}+</span><span class="hs-lbl">Live<br/>Listings</span></div>
      <div class="stat"><span class="hs-val">Rent · Sale · Book</span><span class="hs-lbl">Apartments, Land,<br/>Hotels &amp; Shortlets</span></div>
    </div>

    <div class="trusted-row">
      <div class="container">
        <p class="trust-label">Serving property seekers across Nigeria</p>
        <div class="city-chips">
          <span v-for="c in cities" :key="c" class="city-chip">{{ c }}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ LATEST LISTED PROPERTIES ============ -->
  <section id="listings" class="section">
    <div class="container">
      <div class="sec-head">
        <div><span class="section-label">JUST LISTED</span><h2 class="section-title">Latest Listed Properties</h2></div>
        <div class="filter-tabs">
          <button v-for="t in (['All','Rent','Sell'] as const)" :key="t" :class="{active:listTab===t}" @click="listTab=t">{{ t }}</button>
        </div>
      </div>
      <div v-if="loadingLatest" class="loading">Loading…</div>
      <div v-else-if="filtered.length" class="prop-grid">
        <PropertyCard v-for="p in filtered" :key="p.id" :property="p" />
      </div>
      <div v-else class="loading">No listings yet.</div>
    </div>
  </section>

  <!-- ============ WHO WE ARE ============ -->
  <section id="about" class="who-we-are">
    <div class="container who-grid">
      <div class="who-left">
        <span class="section-label">WHO ARE WE</span>
        <h2 class="section-title">APERTE</h2>
        <h3 class="who-heading">Helping you find, rent and book the right property.</h3>
        <p class="who-p">Aperte is a Nigerian real estate platform where owners list their properties and seekers discover them. From residential and commercial spaces to hospitality — hotels, shortlets, halls and event centers — everything is on one platform with direct owner contact.</p>
        <div class="who-cols">
          <div><h4>List for free</h4><p>Owners can list apartments, land and commercial properties and connect with thousands of seekers.</p></div>
          <div><h4>Verified ownership</h4><p>Admin-listed properties can be claimed with email or document verification before transfer.</p></div>
        </div>
        <p class="who-phone">support@awesometech.com.ng</p>
      </div>
      <div class="who-right">
        <div class="who-img"><img src="/images/about.jpg" alt="Aperte" /></div>
      </div>
    </div>
  </section>

  <!-- ============ OUR SERVICES ============ -->
  <section id="services" class="section services">
    <div class="container">
      <div class="text-center"><span class="section-label">OUR SERVICES</span><h2 class="section-title">Everything property, one platform</h2></div>
      <div class="svc-grid">
        <div v-for="(s,i) in services" :key="s.title" class="svc-card">
          <div class="svc-icon" :class="'c'+i"><svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path :d="s.icon"/></svg></div>
          <h3>{{ s.title }}</h3>
          <p>{{ s.desc }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ BROWSE BY CATEGORY ============ -->
  <section class="section">
    <div class="container">
      <div class="text-center"><span class="section-label">EXPLORE</span><h2 class="section-title">Browse by Category</h2></div>
      <div class="areas-grid">
        <RouterLink v-for="c in categories" :key="c.key" :to="`/listings?category=${c.key}`" class="area-card">
          <img :src="c.img" :alt="c.label" />
          <div class="area-info"><span class="a-count">{{ c.count }}</span><strong>{{ c.label }}</strong></div>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- ============ WHY APERTE ============ -->
  <section class="section team-sec">
    <div class="container">
      <div class="text-center"><span class="section-label">WHY CHOOSE US</span><h2 class="section-title">Built for owners and seekers</h2></div>
      <div class="team-grid">
        <div v-for="w in whyAperte" :key="w.title" class="why-card">
          <h3>{{ w.title }}</h3>
          <p>{{ w.desc }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ HOW IT WORKS ============ -->
  <section class="section blogs-sec">
    <div class="container">
      <div class="text-center"><span class="section-label">GET STARTED</span><h2 class="section-title white">How Aperte Works</h2></div>
      <div class="blog-grid">
        <article v-for="h in howItWorks" :key="h.step" class="blog-card">
          <div class="step-num">{{ h.step }}</div>
          <div class="blog-body"><h3>{{ h.title }}</h3><p>{{ h.desc }}</p></div>
        </article>
      </div>
    </div>
  </section>

  <!-- ============ TESTIMONIALS ============ -->
  <section class="section testimonials">
    <div class="container">
      <div class="text-center"><span class="section-label">WHY APERTE</span><h2 class="section-title">One platform for it all</h2></div>
      <div class="testi-wrap">
        <div class="testi-quote">"From Lagos apartments to Abuja event centers — find it, book it, or post a request and let owners come to you."</div>
        <div class="testi-author"><div class="testi-avatar"><img src="/images/testimonial.jpg" alt="" /></div><div><strong>The Aperte Team</strong><span>Lagos, Nigeria</span></div></div>
      </div>
    </div>
  </section>

  <!-- ============ CTA ============ -->
  <section class="cta-section">
    <div class="container cta-inner">
      <div><h2>Own property? List it on Aperte.</h2><p>Reach thousands of seekers across Nigeria — list for free and manage bookings, chats and requests in one place.</p></div>
      <div class="cta-actions">
        <RouterLink to="/add-listing" class="btn btn-primary cta-btn">List a Property</RouterLink>
        <RouterLink to="/browse-requests" class="btn cta-btn-ghost">See What People Need</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* --------- HERO --------- */
.hero { background: #fff; padding-top: 60px; }
.hero-grid { display: grid; grid-template-columns: 1fr 420px; gap: 80px; align-items: start; }

.hero-label { font-size: 0.85rem; font-weight: 500; color: var(--clr-blue2); letter-spacing: 2px; margin-bottom: 14px; display: block; }
.hero-title { font-size: 3.6rem; font-weight: 600; line-height: 1.12; color: var(--clr-black); margin-bottom: 20px; }
.hero-desc { color: var(--clr-muted); font-size: 1rem; max-width: 520px; margin-bottom: 30px; }
.hero-img { border-radius: 12px; overflow: hidden; max-width: 540px; }
.hero-img img { width: 100%; height: 340px; object-fit: cover; }

/* search form (right) */
.search-box { background: #f4f6fa; border-radius: 10px; padding: 30px 24px; }
.search-tabs { display: flex; gap: 6px; margin-bottom: 24px; }
.search-tabs button { padding: 9px 22px; border-radius: 8px; border: none; background: transparent; font-weight: 500; color: var(--clr-muted); }
.search-tabs button.active { background: #fff; color: var(--clr-blue); box-shadow: var(--shadow); }
.field { margin-bottom: 16px; }
.field input, .field select { width: 100%; border: 1px solid var(--clr-line); border-radius: 8px; padding: 14px 15px; font-size: 0.95rem; background: #fff; }
.search-btn { width: 100%; padding: 14px; }
.adv-link { display: inline-block; margin-top: 12px; font-size: 0.85rem; color: var(--clr-blue); }

/* stats */
.hero-stats { display: flex; gap: 60px; padding: 50px 0; }
.stat { display: flex; align-items: baseline; gap: 10px; }
.hs-val { font-size: 2rem; font-weight: 500; color: var(--clr-dark); }
.hs-lbl { color: var(--clr-dark); font-size: 1rem; }

/* trusted */
.trusted-row { border-top: 1px solid #eee; padding: 26px 0 30px; text-align: center; }
.trust-label { color: var(--clr-muted); font-weight: 500; margin-bottom: 18px; }
.city-chips { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.city-chip { padding: 8px 18px; border-radius: 20px; background: #f4f6fa; color: var(--clr-dark); font-weight: 500; font-size: 0.9rem; }

/* --------- SECTION HEAD --------- */
.sec-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 40px; }
.filter-tabs { display: flex; gap: 6px; background: #f4f6fa; border-radius: 10px; padding: 5px; }
.filter-tabs button { padding: 9px 22px; border: none; border-radius: 8px; background: transparent; font-weight: 500; color: var(--clr-muted); }
.filter-tabs button.active { background: #fff; color: var(--clr-blue); box-shadow: var(--shadow); }
.prop-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 30px; }

/* --------- WHO WE ARE --------- */
.who-we-are { padding: 90px 0; background: #f8f9fc; }
.who-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 60px; align-items: center; }
.who-heading { font-size: 1.3rem; font-weight: 600; color: var(--clr-dark); max-width: 460px; margin-bottom: 14px; }
.who-p { color: var(--clr-muted); margin-bottom: 26px; max-width: 460px; }
.who-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.who-cols h4 { color: var(--clr-blue2); font-weight: 500; margin-bottom: 4px; }
.who-cols p { color: var(--clr-muted); font-size: 0.9rem; }
.who-phone { color: var(--clr-dark); font-weight: 500; }
.who-img { border-radius: 12px; overflow: hidden; }
.who-img img { width: 100%; height: 420px; object-fit: cover; }

/* --------- SERVICES --------- */
.services { background: var(--clr-line); }
.svc-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 50px; }
.svc-card { background: #fff; border-radius: 10px; padding: 40px 28px; text-align: center; }
.svc-icon { width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center; margin: 0 auto 18px; }
.svc-icon.c0 { background: var(--clr-blue); }
.svc-icon.c1 { background: var(--clr-purple-btn); }
.svc-icon.c2 { background: var(--clr-green); }
.svc-card h3 { font-size: 1.22rem; font-weight: 500; color: var(--clr-dark); margin-bottom: 10px; }
.svc-card p { color: var(--clr-muted); font-size: 0.92rem; }

/* --------- CATEGORIES --------- */
.areas-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-top: 50px; }
.area-card { position: relative; border-radius: 10px; overflow: hidden; height: 320px; display: block; }
.area-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.area-card:hover img { transform: scale(1.05); }
.area-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 50px 16px 14px; background: linear-gradient(transparent, rgba(0,0,0,0.75)); color: #fff; }
.a-count { font-size: 2.6rem; font-weight: 600; display: block; }
.area-info strong { font-size: 1rem; font-weight: 500; }

/* --------- WHY APERTE --------- */
.team-sec { background: #f8f9fc; }
.team-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; margin-top: 50px; }
.why-card { background: #fff; border-radius: 10px; padding: 30px 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); text-align: center; }
.why-card h3 { font-size: 1.15rem; font-weight: 600; color: var(--clr-black); margin-bottom: 10px; }
.why-card p { color: var(--clr-muted); font-size: 0.92rem; line-height: 1.6; }

/* --------- HOW IT WORKS (purple) --------- */
.blogs-sec { background: var(--clr-purple-btn); }
.blogs-sec .section-label { color: var(--clr-blue2); }
.white { color: #fff !important; }
.blog-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 50px; }
.blog-card { border-radius: 10px; }
.step-num { font-size: 3rem; font-weight: 700; color: var(--clr-blue2); line-height: 1; margin-bottom: 10px; }
.blog-body h3 { font-size: 1.2rem; font-weight: 500; color: #fff; margin-bottom: 8px; }
.blog-body p { color: #c9cfe8; font-size: 0.92rem; margin-bottom: 12px; }

/* --------- TESTIMONIALS --------- */
.testimonials { background: #fff; }
.testi-wrap { max-width: 760px; margin: 44px auto 0; text-align: center; }
.testi-quote { font-size: 1.3rem; font-weight: 500; color: var(--clr-dark); line-height: 1.7; margin-bottom: 26px; }
.testi-author { display: flex; align-items: center; justify-content: center; gap: 14px; }
.testi-avatar { width: 60px; height: 60px; border-radius: 50%; overflow: hidden; }
.testi-avatar img { width: 100%; height: 100%; object-fit: cover; }
.testi-author strong { display: block; color: var(--clr-black); }
.testi-author span { color: var(--clr-muted); font-size: 0.9rem; }

/* --------- CTA --------- */
.cta-section { background: var(--clr-purple-btn); padding: 70px 0; }
.cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 30px; background: var(--clr-purple-btn); border-radius: 12px; padding: 40px; }
.cta-section h2 { font-size: 2.5rem; font-weight: 600; color: #fff; margin-bottom: 6px; }
.cta-section p { color: #c9cfe8; }
.cta-actions { display: flex; gap: 14px; flex-wrap: wrap; }
.cta-btn { background: #fff; color: var(--clr-purple-btn); }
.cta-btn:hover { background: #eef; }
.cta-btn-ghost { background: transparent; color: #fff; border: 1.5px solid #fff; }
.cta-btn-ghost:hover { background: rgba(255,255,255,0.1); }

@media (max-width: 1000px) { .hero-grid { grid-template-columns: 1fr; } .hero-right { order: -1; } .areas-grid { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 800px) { .prop-grid { grid-template-columns: 1fr 1fr; } .team-grid { grid-template-columns: 1fr 1fr; } .blog-grid { grid-template-columns: 1fr 1fr; } .who-grid { grid-template-columns: 1fr; } .svc-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .prop-grid, .team-grid, .blog-grid, .svc-grid, .areas-grid { grid-template-columns: 1fr; } .sec-head { flex-direction: column; gap: 14px; } }
</style>
