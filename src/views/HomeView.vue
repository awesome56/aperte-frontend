<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, type Property } from '@/api'
import PropertyCard from '@/components/PropertyCard.vue'

const router = useRouter()

// --- hero search state ---
const purpose = ref('rent')
const keyword = ref('')
const category = ref('')
const city = ref('')

// --- latest properties ---
const latest = ref<Property[]>([])
const loadingLatest = ref(true)

// --- stats (from Figma) ---
const stats = [
  { value: '72k+', label: 'Happy Customers' },
  { value: '200+', label: 'New Listings Everyday' },
  { value: '12k+', label: 'Properties Sold' },
  { value: '4.9', label: 'Average Rating' },
]

function search() {
  router.push({
    path: '/listings',
    query: {
      purpose: purpose.value,
      city: city.value || undefined,
      category: category.value || undefined,
      q: keyword.value || undefined,
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
            <button :class="{ active: purpose === 'rent' }" @click="purpose = 'rent'">For Rent</button>
            <button :class="{ active: purpose === 'sale' }" @click="purpose = 'sale'">For Sale</button>
            <button :class="{ active: purpose === 'both' }" @click="purpose = 'both'">All</button>
          </div>
          <div class="fields">
            <div class="field grow">
              <label>Search</label>
              <input v-model="keyword" type="text" placeholder="New York, San Francisco, etc" />
            </div>
            <div class="field">
              <label>Property Type</label>
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
              <label>City</label>
              <input v-model="city" type="text" placeholder="City" />
            </div>
            <button class="btn btn-primary search-btn" @click="search">Search</button>
          </div>
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
          <div class="hero-img-placeholder">Aperte</div>
        </div>
        <div class="float-card">
          <span class="fc-label">200+</span>
          <span class="fc-text">New Listings Everyday!</span>
        </div>
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
        <RouterLink to="/listings" class="btn btn-outline">View All</RouterLink>
      </div>

      <div v-if="loadingLatest" class="loading">Loading properties…</div>
      <div v-else-if="latest.length" class="grid">
        <PropertyCard v-for="p in latest" :key="p.id" :property="p" />
      </div>
      <div v-else class="loading">No properties yet. Be the first to list one!</div>
    </div>
  </section>

  <!-- SERVICES -->
  <section id="services" class="section services">
    <div class="container">
      <div class="text-center">
        <span class="section-label">Our Services</span>
        <h2 class="section-title">Donec porttitor euismod dignissim</h2>
        <p class="section-desc mx-auto">
          Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus. Nulla
          convallis ipsum molestie nibh malesuada.
        </p>
      </div>
      <div class="services-grid">
        <div class="service-card">
          <div class="icon blue">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>
          </div>
          <h3>Buy a New Home</h3>
          <p>Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus.</p>
        </div>
        <div class="service-card">
          <div class="icon purple">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11 12 4 3 11h2v7h5v-5h4v5h5v-7h2z"/></svg>
          </div>
          <h3>Sell a House</h3>
          <p>Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus.</p>
        </div>
        <div class="service-card">
          <div class="icon green">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h20v-6a3 3 0 0 0-3-3H2v9z"/></svg>
          </div>
          <h3>Rent a House</h3>
          <p>Donec porttitor euismod dignissim. Nullam a lacinia ipsum, nec dignissim purus.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section id="testimonials" class="section">
    <div class="container">
      <div class="text-center">
        <span class="section-label">Testimonials</span>
        <h2 class="section-title">Look What Our Customers Say!</h2>
      </div>
      <div class="testimonial">
        <p>
          “I highly recommend Aperte. She was attentive to our needs and worked tirelessly to find us
          the perfect home within our budget. The whole process was smooth and stress-free.”
        </p>
        <div class="author">
          <div class="author-avatar">JA</div>
          <div>
            <strong>Jodi J. Appleby</strong>
            <span>Real Estate Developer</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  background: linear-gradient(120deg, #f0f6ff 0%, #e8f1ff 55%, #dce7ff 100%);
  padding: 60px 0 80px;
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
  margin-bottom: 34px;
}

.search-card {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 22px;
  margin-bottom: 34px;
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
  align-items: flex-end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field.grow {
  flex: 1;
}

.field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-muted);
}

.field input,
.field select {
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  padding: 11px 12px;
  font-size: 0.9rem;
  min-width: 150px;
}

.search-btn {
  padding: 12px 26px;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.9rem;
  font-weight: 600;
  color: var(--color-primary);
}

.stat-label {
  color: var(--color-muted);
  font-size: 0.85rem;
}

.hero-visual {
  position: relative;
}

.hero-img {
  border-radius: 24px;
  overflow: hidden;
  height: 460px;
  background: linear-gradient(135deg, var(--color-blue-2), var(--color-purple));
}

.hero-img-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 2rem;
  font-weight: 600;
}

.float-card {
  position: absolute;
  bottom: 24px;
  left: -20px;
  background: #fff;
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  padding: 16px 22px;
  display: flex;
  flex-direction: column;
}

.fc-label {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--color-primary);
}

.fc-text {
  font-size: 0.85rem;
  color: var(--color-muted);
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 40px;
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

.services {
  background: var(--color-bg-soft);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
  margin-top: 50px;
}

.service-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 34px 28px;
  box-shadow: var(--shadow);
  text-align: center;
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

.testimonial {
  max-width: 760px;
  margin: 40px auto 0;
  text-align: center;
}

.testimonial > p {
  font-size: 1.25rem;
  color: var(--color-purple-dark);
  line-height: 1.7;
  margin-bottom: 26px;
}

.author {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.author-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
}

.author strong,
.author span {
  display: block;
  text-align: left;
}

.author span {
  color: var(--color-muted);
  font-size: 0.85rem;
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
  .services-grid {
    grid-template-columns: 1fr 1fr;
  }
  .fields {
    flex-wrap: wrap;
  }
  .field.grow {
    flex: 1 1 100%;
  }
  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

@media (max-width: 600px) {
  .grid,
  .services-grid {
    grid-template-columns: 1fr;
  }
}
</style>
