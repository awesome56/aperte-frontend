<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ images: { id: number; image_url: string }[]; videos?: { id: number; video_url: string }[] }>()

const active = ref(0)
const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
const touchX = ref<number | null>(null)

const items = computed(() => {
  const imgs = props.images.map((i, idx) => ({ type: 'image' as const, url: i.image_url, key: `i${i.id}` }))
  const vids = (props.videos || []).map((v, idx) => ({ type: 'video' as const, url: v.video_url, key: `v${v.id}` }))
  return [...imgs, ...vids]
})

const current = computed(() => items.value[active.value])
const lightboxItem = computed(() => items.value[lightboxIdx.value])
const firstItem = computed(() => items.value[0])

function next() {
  if (!items.value.length) return
  active.value = (active.value + 1) % items.value.length
  trackGallery()
}

function prev() {
  if (!items.value.length) return
  active.value = (active.value - 1 + items.value.length) % items.value.length
  trackGallery()
}

function openLightbox(idx: number) {
  if (!items.value.length) return
  lightboxIdx.value = Math.min(idx, items.value.length - 1)
  lightboxOpen.value = true
  trackGallery()
}

function lightboxNav(dir: 1 | -1) {
  if (!items.value.length) return
  lightboxIdx.value = (lightboxIdx.value + dir + items.value.length) % items.value.length
}

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  if (t) touchX.value = t.clientX
}

function onTouchEnd(e: TouchEvent) {
  if (touchX.value == null) return
  const t = e.changedTouches[0]
  if (!t) return
  const dx = t.clientX - touchX.value
  if (Math.abs(dx) > 40) {
    if (dx < 0) next()
    else prev()
  }
  touchX.value = null
}

function onKey(e: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') lightboxOpen.value = false
  if (e.key === 'ArrowRight') lightboxNav(1)
  if (e.key === 'ArrowLeft') lightboxNav(-1)
}

function trackGallery() {
  import('@/analytics/tracker').then((m) => m.default.trackEvent('gallery_view', 'property', { index: active.value }))
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="gallery">
    <!-- desktop grid -->
    <div v-if="items.length > 1" class="gallery-grid">
      <div class="main-shot" @click="openLightbox(0)">
        <template v-if="firstItem">
          <img v-if="firstItem.type === 'image'" :src="firstItem.url" alt="Property photo 1" />
          <video v-else :src="firstItem.url" muted playsinline></video>
        </template>
        <span class="gallery-hint">View all photos</span>
      </div>      <div v-for="(item, i) in items.slice(1, 5)" :key="item.key" class="side-shot" @click="openLightbox(i + 1)">
        <img v-if="item.type === 'image'" :src="item.url" :alt="`Property photo ${i + 2}`" loading="lazy" />
        <video v-else :src="item.url" muted playsinline></video>
      </div>
      <button v-if="items.length > 5" class="more-shot" @click="openLightbox(0)">+{{ items.length - 5 }} more</button>
    </div>

    <!-- mobile swipe carousel -->
    <div v-else-if="items.length" class="carousel" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
      <div class="carousel-track" :style="{ transform: `translateX(-${active * 100}%)` }">
        <div v-for="(item, i) in items" :key="item.key" class="carousel-slide" @click="openLightbox(i)">
          <img v-if="item.type === 'image'" :src="item.url" :alt="`Property photo ${i + 1}`" />
          <video v-else :src="item.url" muted playsinline></video>
        </div>
      </div>
      <span class="counter">{{ active + 1 }} / {{ items.length }}</span>
      <button v-if="items.length > 1" class="carousel-nav prev" aria-label="Previous" @click.stop="prev">‹</button>
      <button v-if="items.length > 1" class="carousel-nav next" aria-label="Next" @click.stop="next">›</button>
    </div>

    <div v-else class="no-media">
      <p>No photos yet</p>
    </div>

    <!-- fullscreen lightbox -->
    <Teleport to="body">
      <div v-if="lightboxOpen" class="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
        <button class="lb-close" aria-label="Close" @click="lightboxOpen = false">×</button>
        <button class="lb-nav prev" aria-label="Previous" @click="lightboxNav(-1)">‹</button>
        <div class="lb-main" @click.self="lightboxOpen = false">
          <template v-if="lightboxItem">
            <img
              v-if="lightboxItem.type === 'image'"
              :src="lightboxItem.url"
              :alt="`Property photo ${lightboxIdx + 1}`"
            />
            <video v-else :src="lightboxItem.url" controls autoplay playsinline></video>
          </template>
        </div>
        <button class="lb-nav next" aria-label="Next" @click="lightboxNav(1)">›</button>
        <span class="lb-counter">{{ lightboxIdx + 1 }} / {{ items.length }}</span>
        <div class="lb-thumbs">
          <button
            v-for="(item, i) in items"
            :key="item.key"
            class="lb-thumb"
            :class="{ active: i === lightboxIdx }"
            @click="lightboxIdx = i"
          >
            <img v-if="item.type === 'image'" :src="item.url" :alt="`Thumbnail ${i + 1}`" />
            <span v-else class="lb-vid">▶</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-rows: 220px 220px;
  gap: 8px;
  border-radius: 16px;
  overflow: hidden;
}

.main-shot {
  grid-row: 1 / 3;
  position: relative;
  cursor: zoom-in;
}

.main-shot img,
.main-shot video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.side-shot {
  cursor: zoom-in;
  position: relative;
}

.side-shot img,
.side-shot video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.more-shot {
  position: absolute;
  bottom: 12px;
  right: 12px;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  background: rgba(10, 12, 20, 0.72);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  z-index: 3;
}

.gallery-hint {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 7px 12px;
  border-radius: 8px;
  background: rgba(10, 12, 20, 0.6);
  color: #fff;
  font-size: 0.8rem;
}

/* mobile carousel */
.carousel {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  aspect-ratio: 4 / 3;
}

.carousel-track {
  display: flex;
  height: 100%;
  transition: transform 0.3s ease;
}

.carousel-slide {
  flex: 0 0 100%;
  height: 100%;
}

.carousel-slide img,
.carousel-slide video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.counter {
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(10, 12, 20, 0.6);
  color: #fff;
  font-size: 0.78rem;
}

.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #222;
  font-size: 1.2rem;
  cursor: pointer;
  z-index: 2;
}

.carousel-nav.prev { left: 10px; }
.carousel-nav.next { right: 10px; }

.no-media {
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  background: #eef0f3;
  color: #8a94a6;
  border-radius: 14px;
}

/* lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(6, 8, 14, 0.96);
  display: grid;
  place-items: center;
  padding: 20px;
}

.lb-main {
  max-width: min(92vw, 1100px);
  max-height: 74vh;
}

.lb-main img,
.lb-main video {
  max-width: 100%;
  max-height: 74vh;
  border-radius: 10px;
}

.lb-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
}

.lb-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 1.6rem;
  cursor: pointer;
}

.lb-nav.prev { left: 16px; }
.lb-nav.next { right: 16px; }

.lb-counter {
  position: absolute;
  top: 22px;
  left: 24px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
}

.lb-thumbs {
  position: absolute;
  bottom: 14px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  overflow-x: auto;
}

.lb-thumb {
  width: 64px;
  height: 48px;
  border-radius: 8px;
  border: 2px solid transparent;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.lb-thumb.active {
  border-color: #0a84ff;
}

.lb-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lb-vid {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  background: #222;
  color: #fff;
}

@media (max-width: 900px) {
  .gallery-grid {
    display: none;
  }
}

@media (min-width: 901px) {
  .carousel {
    display: none;
  }
}
</style>
