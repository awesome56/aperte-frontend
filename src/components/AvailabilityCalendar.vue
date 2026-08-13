<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { availabilityApi, type AvailabilityData } from '@/api'

const props = defineProps<{ propertyId: number; category: string }>()

const data = ref<AvailabilityData | null>(null)
const loading = ref(true)
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const roomId = ref<number | null>(null)

const isDateBased = computed(() => props.category === 'hotel' || props.category === 'shortlet')
const isSlotBased = computed(() => props.category === 'hall' || props.category === 'event_center')

const monthLabel = computed(() =>
  month.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
)

function shiftMonth(delta: number) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + delta, 1)
}

interface DayCell {
  date: Date
  inMonth: boolean
  state: 'free' | 'booked' | 'blocked' | 'past' | 'mixed'
  freeSlots: number
  bookedSlots: number
}

function inRange(day: Date, start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  const s = new Date(start)
  const e = new Date(end)
  return day >= s && day < e
}

const cells = computed<DayCell[]>(() => {
  const year = month.value.getFullYear()
  const m = month.value.getMonth()
  const first = new Date(year, m, 1)
  const startOffset = first.getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const cellsOut: DayCell[] = []
  for (let i = 0; i < startOffset; i++) {
    cellsOut.push({ date: new Date(year, m, i - startOffset + 1), inMonth: false, state: 'past', freeSlots: 0, bookedSlots: 0 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, m, d)

    if (!data.value) {
      cellsOut.push({ date: day, inMonth: true, state: day < today ? 'past' : 'free', freeSlots: 0, bookedSlots: 0 })
      continue
    }

    if (isSlotBased.value) {
      const daySlots = data.value.slots.filter((s) => s.date === day.toISOString().slice(0, 10))
      const free = daySlots.filter((s) => s.status === 'available').length
      const booked = daySlots.length - free
      cellsOut.push({
        date: day,
        inMonth: true,
        state: daySlots.length ? (free > 0 && booked > 0 ? 'mixed' : free > 0 ? 'free' : 'booked') : day < today ? 'past' : 'free',
        freeSlots: free,
        bookedSlots: booked,
      })
      continue
    }

    // hotel / shortlet: date-range based
    const relevant = roomId.value != null ? data.value.booked.filter((b) => b.room_id === roomId.value) : data.value.booked
    const isBooked = relevant.some((b) => inRange(day, b.start, b.end))
    const isBlocked = data.value.blocked.some((b) => inRange(day, b.start, new Date(new Date(b.end).getTime() + 86400000).toISOString().slice(0, 10)))
    let state: DayCell['state'] = day < today ? 'past' : 'free'
    if (isBlocked) state = 'blocked'
    if (isBooked) state = 'booked'
    cellsOut.push({ date: day, inMonth: true, state, freeSlots: 0, bookedSlots: 0 })
  }
  return cellsOut
})

onMounted(async () => {
  try {
    const r = await availabilityApi.get(props.propertyId)
    data.value = r.data
    const firstRoom = r.data.rooms?.[0]
    if (firstRoom) roomId.value = firstRoom.id
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="avail" :class="{ loading }">
    <div class="avail-head">
      <button class="nav-btn" aria-label="Previous month" @click="shiftMonth(-1)">‹</button>
      <strong>{{ monthLabel }}</strong>
      <button class="nav-btn" aria-label="Next month" @click="shiftMonth(1)">›</button>
      <select v-if="isDateBased && data?.rooms?.length" v-model="roomId" class="room-select" aria-label="Room">
        <option v-for="r in data.rooms" :key="r.id" :value="r.id">{{ r.room_type }}</option>
      </select>
    </div>

    <div class="weekdays">
      <span v-for="w in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="w">{{ w }}</span>
    </div>

    <div class="grid">
      <div
        v-for="(c, i) in cells"
        :key="i"
        class="day"
        :class="[c.state, { muted: !c.inMonth }]"
        :title="c.inMonth ? `${c.date.toISOString().slice(0, 10)} — ${c.state}` : ''"
      >
        <span class="dnum">{{ c.date.getDate() }}</span>
        <span v-if="c.inMonth && isSlotBased && (c.freeSlots || c.bookedSlots)" class="slot-info">
          {{ c.freeSlots }}/{{ c.freeSlots + c.bookedSlots }} free
        </span>
      </div>
    </div>

    <div class="legend">
      <span><i class="lg free"></i> Available</span>
      <span><i class="lg booked"></i> Booked</span>
      <span v-if="isDateBased"><i class="lg blocked"></i> Blocked</span>
    </div>

    <p v-if="isSlotBased && !data?.slots?.length" class="hint">No slots set up for this period yet — the owner will add available dates.</p>
  </div>
</template>

<style scoped>
.avail {
  border: 1.5px solid var(--color-border, #e8ecf3);
  border-radius: 14px;
  padding: 16px;
  background: #fff;
}

.avail-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid var(--color-border, #e5e8ee);
  background: #fff;
  font-size: 1rem;
  cursor: pointer;
}

.room-select {
  margin-left: auto;
  border: 1.5px solid var(--color-border, #e5e8ee);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 0.85rem;
}

.weekdays,
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.weekdays span {
  text-align: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: #9aa0a6;
  text-transform: uppercase;
  padding: 4px 0;
}

.day {
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.8rem;
  font-weight: 500;
  min-height: 40px;
}

.day.muted {
  visibility: hidden;
}

.dnum {
  line-height: 1;
}

.day.free {
  background: #e6f7ec;
  color: #1a7f37;
}

.day.booked {
  background: #ffeceb;
  color: #d0342c;
}

.day.blocked {
  background: repeating-linear-gradient(45deg, #f4e3c3, #f4e3c3 4px, #f9eeda 4px, #f9eeda 8px);
  color: #b7791f;
}

.day.mixed {
  background: #fff4e5;
  color: #b7791f;
}

.day.past {
  background: #f4f5f7;
  color: #b6bcc4;
}

.slot-info {
  font-size: 0.62rem;
  font-weight: 700;
}

.legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 12px;
  font-size: 0.78rem;
  color: #666;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lg {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  display: inline-block;
}

.lg.free { background: #e6f7ec; border: 1px solid #71dd8c; }
.lg.booked { background: #ffeceb; border: 1px solid #ff453a; }
.lg.blocked { background: #f4e3c3; border: 1px solid #d9a94e; }

.hint {
  margin-top: 12px;
  color: #9aa0a6;
  font-size: 0.82rem;
}
</style>
