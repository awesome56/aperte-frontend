// Recently-viewed properties, stored locally (privacy-friendly personalization).
import { ref, watch } from 'vue'
import type { Property } from '@/api'

export interface RecentlyViewedItem {
  id: number
  title: string
  dp: string
  price: number
  currency: string
  city: string
  state: string
  category: string
  purpose: string
  viewed_at: number
}

const KEY = 'aperte_recently_viewed'
const MAX = 12

export const recentlyViewed = ref<RecentlyViewedItem[]>(load())

function load(): RecentlyViewedItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

watch(recentlyViewed, (v) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v.slice(0, MAX)))
  } catch {
    // storage full — ignore
  }
})

export function recordPropertyView(p: Property) {
  const item: RecentlyViewedItem = {
    id: p.id,
    title: p.title,
    dp: p.dp || p.images?.[0]?.image_url || '',
    price: p.price,
    currency: p.currency,
    city: p.city,
    state: p.state,
    category: p.category,
    purpose: p.purpose,
    viewed_at: Date.now(),
  }
  recentlyViewed.value = [item, ...recentlyViewed.value.filter((x) => x.id !== p.id)].slice(0, MAX)
}

export function clearRecentlyViewed() {
  recentlyViewed.value = []
}
