<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { availabilityApi, type AvailabilityData } from '@/api'

const props = defineProps<{
  propertyId: number
  category: string
  manage?: boolean
  compact?: boolean
}>()

const data = ref<AvailabilityData | null>(null)
const loading = ref(true)
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const roomId = ref<number | null>(null)

const busyDay = ref('')
const notice = ref('')

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
  iso: string
  inMonth: boolean
  state: 'free' | 'booked' | 'blocked' | 'past' | 'mixed'
  freeSlots: number
  bookedSlots: number
  blockId?: number
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

  const out: DayCell[] = []
  for (let i = 0; i < startOffset; i++) {
    out.push({ date: new Date(year, m, i - startOffset + 1), iso: '', inMonth: false, state: 'past', freeSlots: 0, bookedSlots: 0 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, m, d)
    const iso = day.toISOString().slice(0, 10)

    if (!data.value) {
      out.push({ date: day, iso, inMonth: true, state: day < today ? 'past' : 'free', freeSlots: 0, bookedSlots: 0 })
      continue
    }

    if (isSlotBased.value) {
      const daySlots = data.value.slots.filter((s) => s.date === iso)
      const free = daySlots.filter((s) => s.status === 'available').length
      const booked = daySlots.length - free
      out.push({
        date: day,
        iso,
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
    const block = data.value.blocked.find((b) => inRange(day, b.start, new Date(new Date(b.end).getTime() + 86400000).toISOString().slice(0, 10)))
    let state: DayCell['state'] = day < today ? 'past' : 'free'
    if (block) {
      state = 'blocked'
    }
    if (isBooked) state = 'booked'
    out.push({ date: day, iso, inMonth: true, state, freeSlots: 0, bookedSlots: 0, blockId: block?.id })
  }
  return out
})

// manage mode: click a free day to block it, click a blocked day to unblock
async function toggleDay(cell: DayCell) {
  if (!props.manage || !isDateBased.value || !cell.inMonth) return
  if (cell.state === 'booked' || cell.state === 'past') return
  if (busyDay.value) return
  busyDay.value = cell.iso
  notice.value = ''
  try {
    if (cell.state === 'blocked' && cell.blockId != null) {
      await availabilityApi.unblock(cell.blockId)
      notice.value = `${cell.iso} unblocked.`
    } else if (cell.state === 'free') {
      await availabilityApi.block(props.propertyId, cell.iso, cell.iso)
      notice.value = `${cell.iso} blocked.`
    }
    await refresh()
  } catch (e: any) {
    notice.value = e.response?.data?.error || 'Could not update availability.'
  } finally {
    busyDay.value = ''
  }
}

async function refresh() {
  try {
    const r = await availabilityApi.get(props.propertyId)
    data.value = r.data
  } catch {
    data.value = null
  }
}

onMounted(async () => {
  await refresh()
  const firstRoom = data.value?.rooms?.[0]
  if (firstRoom) roomId.value = firstRoom.id
  loading.value = false
})
</script>

<template>
  <div class="avail" :class="{ compact, manage }">
    <div class="avail-head">
      <button class="nav-btn" aria-label="Previous month" @click="shiftMonth(-1)">‹</button>
      <strong>{{ monthLabel }}</strong>
      <button class="nav-btn" aria-label="Next month" @click="shiftMonth(1)">›</button>
      <select v-if="isDateBased && data?.rooms?.length" v-model="roomId" class="room-select" aria-label="Room">
        <option v-for="r in data.rooms" :key="r.id" :value="r.id">{{ r.room_type }}</option>
      </select>
    </div>

    <p v-if="manage && notice" class="notice" :class="{ err: notice.startsWith('Could') }">{{ notice }}</p>
    <p v-if="manage" class="hint">Click a day to block it, click a blocked day to unblock.</p>

    <div class="weekdays">
      <span v-for="w in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="w">{{ w }}</span>
    </div>

    <div class="grid">
      <button
        v-for="(c, i) in cells"
        :key="i"
        class="day"
        :class="[c.state, { muted: !c.inMonth, clickable: manage && isDateBased && c.inMonth && (c.state === 'free' || c.state === 'blocked') }]"
        :disabled="busyDay === c.iso || !(manage && isDateBased && c.inMonth && (c.state === 'free' || c.state === 'blocked'))"
        :title="c.inMonth ? `${c.iso} — ${c.state}` : ''"
        @click="toggleDay(c)"
      >
        <span class="dnum">{{ c.date.getDate() }}</span>
        <span v-if="c.inMonth && isSlotBased && (c.freeSlots || c.bookedSlots)" class="slot-info">
          {{ c.freeSlots }}/{{ c.freeSlots + c.bookedSlots }}
        </span>
      </button>
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

/* compact: ~10% smaller */
.avail.compact {
  padding: 12px;
  border-radius: 12px;
  max-width: 720px;
}

.avail.compact .avail-head {
  margin-bottom: 8px;
}

.avail.compact .nav-btn {
  width: 28px;
  height: 28px;
  font-size: 0.9rem;
}

.avail.compact .room-select {
  padding: 5px 8px;
  font-size: 0.78rem;
}

.avail.compact .weekdays span {
  font-size: 0.62rem;
  padding: 3px 0;
}

.avail.compact .day {
  min-height: 34px;
  font-size: 0.72rem;
  border-radius: 7px;
}

.avail.compact .slot-info {
  font-size: 0.56rem;
}

.avail.compact .legend {
  margin-top: 8px;
  font-size: 0.72rem;
  gap: 12px;
}

.avail.compact .lg {
  width: 10px;
  height: 10px;
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

.notice {
  font-size: 0.82rem;
  color: #1a7f37;
  font-weight: 600;
  margin: 0 0 6px;
}

.notice.err {
  color: #d0342c;
}

.hint {
  color: #9aa0a6;
  font-size: 0.8rem;
  margin: 0 0 10px;
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
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.8rem;
  font-weight: 500;
  min-height: 40px;
  font-family: inherit;
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

.day.clickable {
  cursor: pointer;
}

.day.clickable:hover {
  box-shadow: inset 0 0 0 2px #0a84ff;
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
</style>
