<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, type Property } from '@/api'
import PropertyCard from '@/components/PropertyCard.vue'

const router = useRouter()

// --- hero search state ---
const purpose = ref('rent')
const keyword = ref('')
const category = ref('')
const rooms = ref('')

// --- latest properties ---
const latest = ref<Property[]>([])
const loadingLatest = ref(true)
const listTab = ref('All')

const featuredTabs = ['All', 'Rent', 'Sell'] as const

const stats = [
  { value: '72k+', label: 'Happy Customers' },
  { value: '200+', label: 'New Listings Everyday!' },
]

const logos = [
  '/images/p1.jpg',
  '/images/p2.jpg',
  '/images/p3.jpg',
  '/images/p4.jpg',
  '/images/p5.jpg',
  '/images/p6.jpg',
]

const services = [
  { icon: 'home', color: 'blue', title: 'Buy a New Home', desc: 'Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus.' },
  { icon: 'tag', color: 'purple', title: 'Sell a House', desc: 'Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus.' },
  { icon: 'key', color: 'green', title: 'Rent a House', desc: 'Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus.' },
]

const areas = [
  { city: 'New York City, NY', count: '216', img: '/images/area1.jpg' },
  { city: 'Houston, TX', count: '141', img: '/images/area2.jpg' },
  { city: 'San Diego, CA', count: '212', img: '/images/area3.jpg' },
  { city: 'San Francisco, CA', count: '112', img: '/images/area1.jpg' },
  { city: 'Philadelphia, PA', count: '183', img: '/images/area2.jpg' },
]

const team = [
  { name: 'Jodi J. Appleby', role: 'Real Estate Developer', img: '/images/team1.jpg' },
  { name: 'Brendon M', role: 'CEO & Founder', img: '/images/team2.jpg' },
  { name: 'Justin S. Meza', role: 'Listing Agent', img: '/images/team3.jpg' },
  { name: 'Susan T. Smith', role: "Buyer's Agent", img: '/images/team4.jpg' },
]

const blogs = [
  {
    title: 'Top 10 Home Buying Mistakes to Avoid',
    desc: 'Etiam eget elementum elit. Aenean dignissim dapibus vestibulum.',
    img: '/images/blog1.jpg',
  },
  {
    title: 'How to Stage Your Home for a Quick Sale',
    desc: 'Fusce venenatis tellus a felis scelerisque, non pulvinar est pellentesque.',
    img: '/images/blog2.jpg',
  },
  {
    title: '5 Tips for First-Time Home Sellers',
    desc: 'Nullam odio lacus, dictum quis pretium congue, vehicula venenatis nunc.',
    img: '/images/blog3.jpg',
  },
]

const featured = computed(() => {
  if (listTab.value === 'All') return latest.value
  return latest.value.filter((p) => p.purpose === listTab.value.toLowerCase())
})

function search() {
  router.push({
    path: '/listings',
    query: {
      purpose: purpose.value,
      city: keyword.value || undefined,
      category: category.value || undefined,
    },
  })
}

onMounted(async () => {
  try {
    const res = await propertyApi.browse({ per_page: 6 })
    latest.value = res.data.data
  } catch {
    latest.value = []
  } finally {
    loadingLatest.value = false
  }
})
</script>

<template>
  <!-- HERO -->
  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
        <h1>Find a perfect home you love..!</h1>
        <p>
          Etiam eget elementum elit. Aenean dignissim dapibus vestibulum. Integer a dolor eu sapien
          sodales vulputate ac in purus.
        </p>

        <div class="search-card">
          <div class="tabs">
            <button :class="{ active: purpose === 'sale' }" @click="purpose = 'sale'">For Sale</button>
            <button :class="{ active: purpose === 'rent' }" @click="purpose = 'rent'">For Rent</button>
          </div>
          <div class="fields">
            <div class="field grow">
              <input v-model="keyword" type="text" placeholder="New York, San Francisco, etc" />
            </div>
            <div class="field">
              <select v-model="category">
                <option value="">Select Property Type</option>
                <option value="property">Property</option>
                <option value="land">Land</option>
                <option value="hotel">Hotel</option>
                <option value="hall">Hall</option>
                <option value="event_center">Event Center</option>
                <option value="shortlet">Shortlet</option>
              </select>
            </div>
            <div class="field">
              <select v-model="rooms">
                <option value="">Select Rooms</option>
                <option value="1">1 Room</option>
                <option value="2">2 Rooms</option>
                <option value="3">3 Rooms</option>
                <option value="4">4+ Rooms</option>
              </select>
            </div>
            <button class="btn btn-primary search-btn" @click="search">Search</button>
          </div>
          <a href="#" class="advance" @click.prevent="router.push('/listings')">Advance Search</a>
        </div>

        <div class="hero-stats">
          <div v-for="s in stats" :key="s.label" class="stat">
            <span class="stat-value">{{ s.value }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </div>
        </div>
      </div>

      <div class="hero-visual">
        <div class="hero-img">
          <img src="/images/hero.jpg" alt="Luxury home" />
        </div>
      </div>
    </div>

    <div class="trusted container">
      <span class="trusted-label">Trusted by 100+ Companies across the globe!</span>
      <div class="logo-strip">
        <img v-for="l in logos" :key="l" :src="l" alt="company logo" />
      </div>
    </div>
  </section>

  <!-- LATEST PROPERTIES -->
  <section id="listings" class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="section-label">Checkout Our New</span>
          <h2 class="section-title">Latest Listed Properties</h2>
        </div>
        <div class="tabs2">
          <button
            v-for="t in featuredTabs"
            :key="t"
            :class="{ active: listTab === t }"
            @click="listTab = t"
          >
            {{ t }}
          </button>
        </div>
      </div>

      <div v-if="loadingLatest" class="loading">Loading properties…</div>
      <div v-else-if="featured.length" class="grid">
        <PropertyCard v-for="p in featured" :key="p.id" :property="p" />
      </div>
      <div v-else class="loading">No properties yet. Be the first to list one!</div>

      <div class="text-center" style="margin-top: 30px">
        <RouterLink to="/listings" class="btn btn-primary">View All Listings</RouterLink>
      </div>
    </div>
  </section>

  <!-- ABOUT / WHO WE ARE -->
  <section id="about" class="section about">
    <div class="container about-grid">
      <div class="about-visual">
        <img src="/images/about.jpg" alt="About Aperte" />
        <div class="about-card">
          <strong>+1 206-214-2298</strong>
          <span>Call us anytime</span>
        </div>
      </div>
      <div class="about-text">
        <span class="section-label">Who Are We · Real Estate</span>
        <h2 class="section-title">Assisting individuals in locating the appropriate real estate.</h2>
        <p class="about-desc">
          Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus. Nulla
          convallis ipsum molestie nibh malesuada, ac malesuada leo volutpat.
        </p>
        <div class="about-points">
          <div class="point">
            <strong>Donec porttitor euismod</strong>
            <p>Nullam a lacinia ipsum, nec dignissim purus. Nulla convallis ipsum molestie.</p>
          </div>
          <div class="point">
            <strong>Donec porttitor euismod</strong>
            <p>Nullam a lacinia ipsum, nec dignissim purus. Nulla convallis ipsum molestie.</p>
          </div>
        </div>
        <RouterLink to="/listings" class="btn btn-primary">Explore Listings</RouterLink>
      </div>
    </div>
  </section>

  <!-- SERVICES -->
  <section id="services" class="section services">
    <div class="container">
      <div class="text-center">
        <span class="section-label">Our Services</span>
        <h2 class="section-title">Donec porttitor euismod dignissim</h2>
        <p class="section-desc mx-auto">
          Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus.
        </p>
      </div>
      <div class="services-grid">
        <div v-for="s in services" :key="s.title" class="service-card">
          <div class="icon" :class="s.color">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <path
                v-if="s.icon === 'home'"
                d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z"
              />
              <path
                v-else-if="s.icon === 'tag'"
                d="M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8zM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8z"
              />
              <path
                v-else
                d="M2 17h20v-6a3 3 0 0 0-3-3H2v9z"
              />
            </svg>
          </div>
          <h3>{{ s.title }}</h3>
          <p>{{ s.desc }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- AREAS -->
  <section id="areas" class="section">
    <div class="container">
      <div class="text-center">
        <span class="section-label">Areas Across the Town</span>
        <h2 class="section-title">Neighborhood Properties</h2>
      </div>
      <div class="areas-grid">
        <RouterLink
          v-for="a in areas"
          :key="a.city"
          :to="`/listings?city=${(a.city.split(',')[0] || '').trim()}`"
          class="area-card"
        >
          <img :src="a.img" :alt="a.city" />
          <div class="area-overlay">
            <strong>{{ a.city }}</strong>
            <span>{{ a.count }} properties</span>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- TEAM -->
  <section class="section team-section">
    <div class="container">
      <div class="text-center">
        <span class="section-label">What's Trending</span>
        <h2 class="section-title">Our Team of Experts</h2>
      </div>
      <div class="team-grid">
        <div v-for="m in team" :key="m.name" class="team-card">
          <img :src="m.img" :alt="m.name" />
          <div class="team-body">
            <strong>{{ m.name }}</strong>
            <span>{{ m.role }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- BLOGS -->
  <section class="section">
    <div class="container">
      <div class="text-center">
        <span class="section-label">Latest Blogs & Posts</span>
        <h2 class="section-title">Intro Yourself to Our Insights</h2>
      </div>
      <div class="blogs-grid">
        <article v-for="b in blogs" :key="b.title" class="blog-card">
          <img :src="b.img" :alt="b.title" />
          <div class="blog-body">
            <h3>{{ b.title }}</h3>
            <p>{{ b.desc }}</p>
            <a href="#" class="read-more" @click.prevent>Read More →</a>
          </div>
        </article>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section id="testimonials" class="section testimonials">
    <div class="container">
      <div class="text-center">
        <span class="section-label">Testimonials</span>
        <h2 class="section-title">Look What Our Customers Say!</h2>
      </div>
      <div class="testimonial">
        <img src="/images/testimonial.jpg" alt="customer" class="testimonial-img" />
        <p>
          “I highly recommend Aperte. She was attentive to our needs and worked tirelessly to find us
          the perfect home. We couldn't be happier with our new place!”
        </p>
        <div class="author">
          <strong>Barbara D. Smith</strong>
          <span>Happy Customer</span>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta">
    <div class="container cta-inner">
      <div>
        <h2>Become a Agent.</h2>
        <p>Fusce venenatis tellus a felis scelerisque. venenatis tellus a felis scelerisque.</p>
      </div>
      <RouterLink to="/register" class="btn btn-primary">Register Now</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.hero {
  background: linear-gradient(120deg, #f0f6ff 0%, #e8f1ff 55%, #dce7ff 100%);
  padding: 50px 0 0;
}

.hero-inner {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 60px;
  align-items: center;
}

.hero-text h1 {
  font-size: 3.4rem;
  font-weight: 600;
  line-height: 1.12;
  color: var(--color-purple-dark);
  margin-bottom: 20px;
}

.hero-text > p {
  color: var(--color-muted);
  font-size: 1.05rem;
  max-width: 480px;
  margin-bottom: 30px;
}

.search-card {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 22px;
  margin-bottom: 30px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}

.tabs button {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-muted);
  font-weight: 500;
  font-size: 0.9rem;
}

.tabs button.active {
  background: var(--color-bg-blue);
  color: var(--color-primary);
}

.fields {
  display: flex;
  gap: 14px;
  align-items: center;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field.grow {
  flex: 1;
}

.field input,
.field select {
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 11px 12px;
  font-size: 0.9rem;
}

.search-btn {
  padding: 12px 26px;
  white-space: nowrap;
}

.advance {
  display: inline-block;
  margin-top: 14px;
  font-size: 0.9rem;
  color: var(--color-primary);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-primary);
}

.stat-label {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.hero-visual {
  position: relative;
}

.hero-img {
  border-radius: 24px;
  overflow: hidden;
  height: 480px;
  box-shadow: var(--shadow-lg);
}

.hero-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.trusted {
  margin-top: 40px;
  padding-bottom: 30px;
}

.trusted-label {
  display: block;
  text-align: center;
  color: var(--color-muted);
  font-weight: 500;
  margin-bottom: 18px;
}

.logo-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  opacity: 0.6;
}

.logo-strip img {
  height: 40px;
  object-fit: contain;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 40px;
}

.tabs2 {
  display: flex;
  gap: 8px;
  background: var(--color-bg-soft);
  border-radius: 10px;
  padding: 5px;
}

.tabs2 button {
  padding: 9px 22px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-weight: 500;
  color: var(--color-muted);
}

.tabs2 button.active {
  background: #fff;
  color: var(--color-primary);
  box-shadow: var(--shadow);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}

.loading {
  text-align: center;
  color: var(--color-muted);
  padding: 40px;
}

/* ABOUT */
.about {
  background: var(--color-bg-soft);
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.about-visual {
  position: relative;
}

.about-visual > img {
  border-radius: 20px;
  width: 100%;
  height: 440px;
  object-fit: cover;
}

.about-card {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  padding: 16px 22px;
  display: flex;
  flex-direction: column;
}

.about-card strong {
  color: var(--color-primary);
  font-size: 1.1rem;
}

.about-card span {
  color: var(--color-muted);
  font-size: 0.85rem;
}

.about-desc {
  color: var(--color-muted);
  margin-bottom: 24px;
}

.about-points {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 26px;
}

.point strong {
  color: var(--color-purple-dark);
  margin-bottom: 6px;
  display: block;
}

.point p {
  color: var(--color-muted);
  font-size: 0.9rem;
}

/* SERVICES */
.services {
  background: #fff;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
  margin-top: 50px;
}

.service-card {
  background: var(--color-bg-soft);
  border-radius: var(--radius);
  padding: 34px 28px;
  text-align: center;
  transition: all 0.25s;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}

.service-card h3 {
  font-size: 1.2rem;
  color: var(--color-purple-dark);
  margin: 18px 0 10px;
}

.service-card p {
  color: var(--color-muted);
  font-size: 0.92rem;
}

.icon {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  margin: 0 auto;
  color: #fff;
}

.icon.blue {
  background: var(--color-primary);
}

.icon.purple {
  background: var(--color-purple);
}

.icon.green {
  background: var(--color-accent);
}

/* AREAS */
.areas-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-top: 50px;
}

.area-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  height: 260px;
  display: block;
}

.area-card:nth-child(4),
.area-card:nth-child(5) {
  grid-column: span 1;
}

.area-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.area-card:hover img {
  transform: scale(1.05);
}

.area-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40px 20px 18px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: #fff;
}

.area-overlay strong {
  display: block;
  font-size: 1.1rem;
}

.area-overlay span {
  font-size: 0.85rem;
  opacity: 0.9;
}

/* TEAM */
.team-section {
  background: var(--color-bg-soft);
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
  margin-top: 50px;
}

.team-card {
  background: #fff;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  text-align: center;
}

.team-card img {
  width: 100%;
  height: 300px;
  object-fit: cover;
}

.team-body {
  padding: 18px;
}

.team-body strong {
  display: block;
  color: var(--color-purple-dark);
}

.team-body span {
  color: var(--color-muted);
  font-size: 0.88rem;
}

/* BLOGS */
.blogs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
  margin-top: 50px;
}

.blog-card {
  background: #fff;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.blog-card img {
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.blog-body {
  padding: 22px;
}

.blog-body h3 {
  font-size: 1.1rem;
  color: var(--color-purple-dark);
  margin-bottom: 8px;
}

.blog-body p {
  color: var(--color-muted);
  font-size: 0.92rem;
  margin-bottom: 12px;
}

.read-more {
  color: var(--color-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

/* TESTIMONIALS */
.testimonials {
  background: var(--color-purple-dark);
}

.testimonials .section-label {
  color: var(--color-pink);
}

.testimonials .section-title {
  color: #fff;
}

.testimonial {
  max-width: 700px;
  margin: 40px auto 0;
  text-align: center;
}

.testimonial-img {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto 24px;
  border: 3px solid rgba(255, 255, 255, 0.2);
}

.testimonial > p {
  font-size: 1.2rem;
  color: #e8eaf6;
  line-height: 1.7;
  margin-bottom: 22px;
}

.author strong {
  display: block;
  color: #fff;
}

.author span {
  color: #aab0d0;
  font-size: 0.88rem;
}

/* CTA */
.cta {
  background: var(--color-bg-blue);
}

.cta-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 60px 0;
}

.cta h2 {
  font-size: 2rem;
  color: var(--color-purple-dark);
  margin-bottom: 6px;
}

.cta p {
  color: var(--color-muted);
}

@media (max-width: 900px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }
  .hero-visual {
    display: none;
  }
  .hero-text h1 {
    font-size: 2.6rem;
  }
  .grid,
  .services-grid,
  .blogs-grid {
    grid-template-columns: 1fr 1fr;
  }
  .team-grid {
    grid-template-columns: 1fr 1fr;
  }
  .areas-grid {
    grid-template-columns: 1fr 1fr;
  }
  .about-grid {
    grid-template-columns: 1fr;
  }
  .fields {
    flex-wrap: wrap;
  }
  .field.grow {
    flex: 1 1 100%;
  }
}

@media (max-width: 600px) {
  .grid,
  .services-grid,
  .blogs-grid,
  .team-grid,
  .areas-grid {
    grid-template-columns: 1fr;
  }
  .cta-inner {
    flex-direction: column;
    text-align: center;
  }
}
</style>
