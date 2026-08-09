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
const listTab = ref('All' as 'All' | 'Rent' | 'Sell')

const filtered = computed(() => {
  if (listTab.value === 'All') return latest.value
  return latest.value.filter(p => p.purpose === listTab.value.toLowerCase())
})

const logos = ['p1','p2','p3','p4','p5','p6'].map(n => `/images/${n}.jpg`)

const areas = [
  { city: 'New York City, NY', count: '216', img: '/images/area1.jpg' },
  { city: 'Houston, TX',         count: '141', img: '/images/area2.jpg' },
  { city: 'San Diego, CA',      count: '212', img: '/images/area3.jpg' },
  { city: 'San Francisco, CA',  count: '112', img: '/images/area1.jpg' },
  { city: 'Philadelphia, PA',   count: '183', img: '/images/area2.jpg' },
]

const team = [
  { name: 'Jodi J. Appleby',    role: 'Real Estate Developer', img: '/images/team1.jpg' },
  { name: 'Brendon M',          role: 'CEO & Founder',         img: '/images/team2.jpg' },
  { name: 'Justin S. Meza',     role: 'Listing Agent',          img: '/images/team3.jpg' },
  { name: 'Susan T. Smith',     role: "Buyer's Agent",          img: '/images/team4.jpg' },
]

const blogs = [
  { title: 'Top 10 Home Buying Mistakes to Avoid', desc: 'Etiam eget elementum elit. Aenean dignissim dapibus vestibulum.', img: '/images/blog1.jpg' },
  { title: 'How to Stage Your Home for a Quick Sale', desc: 'Fusce venenatis tellus a felis scelerisque, non pulvinar est pellentesque.', img: '/images/blog2.jpg' },
  { title: '5 Tips for First-Time Home Sellers', desc: 'Nullam odio lacus, dictum quis pretium congue, vehicula venenatis nunc.', img: '/images/blog3.jpg' },
]

const services = [
  { title: 'Buy a New Home', icon: 'M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z' },
  { title: 'Sell a House', icon: 'M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8zM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8z' },
  { title: 'Rent a House', icon: 'M2 17h20v-6a3 3 0 0 0-3-3H2v9z' },
]

function search() {
  router.push({ path: '/listings', query: { purpose: purpose.value, city: keyword.value || undefined, category: category.value || undefined } })
}

onMounted(async () => {
  try { const r = await propertyApi.browse({ per_page: 6 }); latest.value = r.data.data } catch { latest.value = [] }
  finally { loadingLatest.value = false }
})
</script>

<template>
  <!-- ============ HERO ============ -->
  <section class="hero">
    <div class="container hero-grid">
      <div class="hero-left">
        <span class="hero-label">REAL ESTATE</span>
        <h1 class="hero-title">Find a perfect home you love..!</h1>
        <p class="hero-desc">Etiam eget elementum elit. Aenean dignissim dapibus vestibulum. Integer a dolor eu sapien sodales vulputate ac in purus.</p>
        <div class="hero-img"><img src="/images/hero.jpg" alt="Luxury home" /></div>
      </div>

      <div class="hero-right">
        <div class="search-box">
          <div class="search-tabs">
            <button :class="{active:purpose==='sale'}" @click="purpose='sale'">For Sale</button>
            <button :class="{active:purpose==='rent'}" @click="purpose='rent'">For Rent</button>
          </div>
          <div class="field">
            <input v-model="keyword" placeholder="New York, San Francisco, etc" />
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
      <div class="stat"><span class="hs-val">72k+</span><span class="hs-lbl">Happy<br/>Customers</span></div>
      <div class="stat"><span class="hs-val">200+</span><span class="hs-lbl">New<br/>Listings Everyday!</span></div>
    </div>

    <div class="trusted-row">
      <div class="container">
        <p class="trust-label">Trusted by 100+ Companies across the globe!</p>
        <div class="trust-logos"><img v-for="l in logos" :key="l" :src="l" alt="" /></div>
      </div>
    </div>
  </section>

  <!-- ============ LATEST LISTED PROPERTIES ============ -->
  <section id="listings" class="section">
    <div class="container">
      <div class="sec-head">
        <div><span class="section-label">CHECKOUT OUR NEW</span><h2 class="section-title">Latest Listed Properties</h2></div>
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
        <h2 class="section-title">REAL ESTATE</h2>
        <h3 class="who-heading">Assisting individuals in locating the appropriate real estate.</h3>
        <p class="who-p">Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus. Nulla convallis ipsum molestie nibh malesuada, ac malesuada leo volutpat.</p>
        <div class="who-cols">
          <div><h4>Donec porttitor euismod</h4><p>Nullam a lacinia ipsum, nec dignissim purus. Nulla convallis ipsum molestie.</p></div>
          <div><h4>Donec porttitor euismod</h4><p>Nullam a lacinia ipsum, nec dignissim purus. Nulla convallis ipsum molestie.</p></div>
        </div>
        <p class="who-phone">+1 206-214-2298</p>
      </div>
      <div class="who-right">
        <div class="who-img"><img src="/images/about.jpg" alt="Real estate" /></div>
      </div>
    </div>
  </section>

  <!-- ============ OUR SERVICES (gray bg) ============ -->
  <section id="services" class="section services">
    <div class="container">
      <div class="text-center"><span class="section-label">OUR SERVICES</span><h2 class="section-title">Donec porttitor euismod dignissim</h2></div>
      <div class="svc-grid">
        <div v-for="(s,i) in services" :key="s.title" class="svc-card">
          <div class="svc-icon" :class="'c'+i"><svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path :d="s.icon"/></svg></div>
          <h3>{{ s.title }}</h3>
          <p>Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ AREAS ACROSS THE TOWN ============ -->
  <section class="section">
    <div class="container">
      <div class="text-center"><span class="section-label">AREAS ACROSS THE TOWN</span><h2 class="section-title">Neighborhood Properties</h2></div>
      <div class="areas-grid">
        <RouterLink v-for="a in areas" :key="a.city" :to="`/listings?city=${(a.city.split(',')[0]||'').trim()}`" class="area-card">
          <img :src="a.img" :alt="a.city" />
          <div class="area-info"><span class="a-count">{{ a.count }}</span><strong>{{ a.city }}</strong></div>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- ============ OUR TEAM ============ -->
  <section class="section team-sec">
    <div class="container">
      <div class="text-center"><span class="section-label">Introduce yourself to</span><h2 class="section-title">Our Team of Experts</h2></div>
      <div class="team-grid">
        <div v-for="m in team" :key="m.name" class="team-card">
          <img :src="m.img" :alt="m.name" />
          <div class="team-info"><strong>{{ m.name }}</strong><span>{{ m.role }}</span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ BLOGS (purple bg) ============ -->
  <section class="section blogs-sec">
    <div class="container">
      <div class="text-center"><span class="section-label">WHAT'S TRENDING</span><h2 class="section-title white">Latest Blogs &amp; Posts</h2></div>
      <div class="blog-grid">
        <article v-for="b in blogs" :key="b.title" class="blog-card">
          <img :src="b.img" :alt="b.title" /><div class="blog-body"><h3>{{ b.title }}</h3><p>{{ b.desc }}</p><a href="#" class="read-more" @click.prevent>Read More →</a></div>
        </article>
      </div>
    </div>
  </section>

  <!-- ============ TESTIMONIALS ============ -->
  <section class="section testimonials">
    <div class="container">
      <div class="text-center"><span class="section-label">TESTIMONIALS</span><h2 class="section-title">Look What Our Customers Say!</h2></div>
      <div class="testi-wrap">
        <div class="testi-quote">"I highly recommend Jodi J. Appleby. She was attentive to our needs and worked tirelessly to find us the perfect home. We couldn't be happier with our new place!"</div>
        <div class="testi-author"><div class="testi-avatar"><img src="/images/testimonial.jpg" alt="" /></div><div><strong>Barbara D. Smith</strong><span>Happy Customer</span></div></div>
      </div>
    </div>
  </section>

  <!-- ============ CTA ============ -->
  <section class="cta-section">
    <div class="container cta-inner">
      <div><h2>Become a Agent.</h2><p>Fusce venenatis tellus a felis scelerisque. venenatis tellus a felis scelerisque.</p></div>
      <RouterLink to="/register" class="btn btn-primary cta-btn">Register Now</RouterLink>
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
.trust-logos { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
.trust-logos img { height: 36px; object-fit: contain; opacity: 0.5; }

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

/* --------- AREAS --------- */
.areas-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; margin-top: 50px; }
.area-card { position: relative; border-radius: 10px; overflow: hidden; height: 320px; display: block; }
.area-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.area-card:hover img { transform: scale(1.05); }
.area-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 50px 16px 14px; background: linear-gradient(transparent, rgba(0,0,0,0.75)); color: #fff; }
.a-count { font-size: 2.6rem; font-weight: 600; display: block; }
.area-info strong { font-size: 1rem; font-weight: 500; }

/* --------- TEAM --------- */
.team-sec { background: #f8f9fc; }
.team-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; margin-top: 50px; }
.team-card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04); text-align: center; }
.team-card img { width: 100%; height: 260px; object-fit: cover; }
.team-info { padding: 18px 12px; }
.team-info strong { display: block; font-size: 1.7rem; font-weight: 600; color: var(--clr-black); }
.team-info span { color: var(--clr-blue2); font-size: 1rem; font-weight: 500; }

/* --------- BLOGS (purple) --------- */
.blogs-sec { background: var(--clr-purple-btn); }
.blogs-sec .section-label { color: var(--clr-blue2); }
.white { color: #fff !important; }
.blog-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 50px; }
.blog-card { border-radius: 10px; overflow: hidden; }
.blog-card img { width: 100%; height: 240px; object-fit: cover; }
.blog-body { padding: 20px 0 0; }
.blog-body h3 { font-size: 1.2rem; font-weight: 500; color: #fff; margin-bottom: 8px; }
.blog-body p { color: #c9cfe8; font-size: 0.92rem; margin-bottom: 12px; }
.read-more { color: #fff; font-weight: 500; font-size: 0.9rem; }
.read-more:hover { text-decoration: underline; }

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
.cta-btn { background: #fff; color: var(--clr-purple-btn); }
.cta-btn:hover { background: #eef; }

@media (max-width: 1000px) { .hero-grid { grid-template-columns: 1fr; } .hero-right { order: -1; } .areas-grid { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 800px) { .prop-grid { grid-template-columns: 1fr 1fr; } .team-grid { grid-template-columns: 1fr 1fr; } .blog-grid { grid-template-columns: 1fr 1fr; } .who-grid { grid-template-columns: 1fr; } .svc-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .prop-grid, .team-grid, .blog-grid, .svc-grid, .areas-grid { grid-template-columns: 1fr; } .sec-head { flex-direction: column; gap: 14px; } }
</style>
