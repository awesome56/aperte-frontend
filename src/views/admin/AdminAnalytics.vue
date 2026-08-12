<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  adminApi,
  type AnalyticsOverview,
  type AnalyticsContent,
  type AnalyticsAudience,
  type AnalyticsPerformance,
  type AnalyticsEvents,
  type AnalyticsRealtime,
  type AnalyticsPropertyDetail,
} from '@/api'

const tab = ref('overview')

// date range
const PRESETS: { key: string; label: string; fn: () => { start: string; end: string } }[] = [
  { key: 'today', label: 'Today', fn: () => dayRange(0) },
  { key: 'yesterday', label: 'Yesterday', fn: () => dayRange(1) },
  { key: '7d', label: 'Last 7 days', fn: () => dayRange(6) },
  { key: '30d', label: 'Last 30 days', fn: () => dayRange(29) },
  { key: '90d', label: 'Last 90 days', fn: () => dayRange(89) },
  { key: 'month', label: 'This month', fn: () => monthRange(0) },
  { key: 'lastmonth', label: 'Last month', fn: () => monthRange(1) },
  { key: 'year', label: 'This year', fn: () => yearRange() },
]
const preset = ref('30d')
const customStart = ref('')
const customEnd = ref('')
const custom = ref(false)

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function dayRange(back: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - back)
  return { start: iso(start), end: iso(end) }
}
function monthRange(back: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - back, 1)
  const end = back === 0 ? now : new Date(now.getFullYear(), now.getMonth() - back + 1, 0)
  return { start: iso(start), end: iso(end) }
}
function yearRange() {
  const now = new Date()
  return { start: iso(new Date(now.getFullYear(), 0, 1)), end: iso(now) }
}

function range(): { start: string; end: string } {
  if (custom.value && customStart.value && customEnd.value) {
    return { start: customStart.value, end: customEnd.value }
  }
  const p = PRESETS.find((x) => x.key === preset.value)
  return p ? p.fn() : dayRange(29)
}

// data
const overview = ref<AnalyticsOverview | null>(null)
const content = ref<AnalyticsContent | null>(null)
const audience = ref<AnalyticsAudience | null>(null)
const performance = ref<AnalyticsPerformance | null>(null)
const events = ref<AnalyticsEvents | null>(null)
const realtime = ref<AnalyticsRealtime | null>(null)
const propDetail = ref<AnalyticsPropertyDetail | null>(null)
const selectedProp = ref<number | null>(null)
const loading = ref(false)
const err = ref('')

async function load() {
  loading.value = true
  err.value = ''
  try {
    const r = range()
    const [o, c, a, p, e] = await Promise.all([
      adminApi.analyticsOverview(r),
      adminApi.analyticsContent(r),
      adminApi.analyticsAudience(r),
      adminApi.analyticsPerformance(r),
      adminApi.analyticsEvents(r),
    ])
    overview.value = o.data
    content.value = c.data
    audience.value = a.data
    performance.value = p.data
    events.value = e.data
    if (selectedProp.value) {
      const pr = await adminApi.analyticsProperties({ ...r, property_id: selectedProp.value })
      propDetail.value = pr.data as AnalyticsPropertyDetail
    }
  } catch (e2: any) {
    err.value = e2.response?.data?.error || 'Failed to load analytics.'
  } finally {
    loading.value = false
  }
}

async function loadRealtime() {
  try {
    const r = await adminApi.analyticsRealtime()
    realtime.value = r.data
  } catch {
    // ignore polling errors
  }
}

async function selectProperty(id: number) {
  selectedProp.value = id
  if (!id) {
    propDetail.value = null
    return
  }
  try {
    const pr = await adminApi.analyticsProperties({ ...range(), property_id: id })
    propDetail.value = pr.data as AnalyticsPropertyDetail
  } catch {
    // ignore
  }
}

async function exportCsv() {
  try {
    const r = await adminApi.analyticsExport({ ...range(), format: 'csv' })
    const url = URL.createObjectURL(r.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aperte-analytics-${range().start}-${range().end}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

const fmtMs = (v: number | null | undefined) => {
  if (v == null) return '—'
  if (v < 1000) return `${v}ms`
  return `${(v / 1000).toFixed(1)}s`
}
const fmtNum = (v: number | undefined | null) => (v == null ? '0' : v.toLocaleString())
const pct = (v: number | undefined | null) => (v == null ? '0%' : `${v}%`)
const sourceLabel: Record<string, string> = {
  direct: 'Direct',
  search: 'Search Engines',
  social: 'Social Media',
  referral: 'Referral Sites',
  campaign: 'Campaigns',
  internal: 'Internal',
}
const deviceLabel: Record<string, string> = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' }

// simple bar chart helpers
const maxViews = computed(() => Math.max(...(overview.value?.over_time.map((d) => d.views) || [1])))
const maxSource = computed(() => Math.max(...(overview.value?.sources.map((s) => s.views) || [1])))
const maxAudience = (rows?: { key: string; visitors: number; views: number }[]) =>
  Math.max(...(rows?.map((r) => r.visitors) || [1]))
const maxLanding = computed(() => Math.max(...(content.value?.landing_pages.map((l) => l.sessions) || [1])))
const maxProps = computed(() => Math.max(...(content.value?.properties.map((p) => p.views) || [1])))
const maxRealtimePages = computed(() => Math.max(...(realtime.value?.pages.map((p) => p.active_visitors) || [1])))
const maxSlow = computed(() => Math.max(...(performance.value?.slowest_pages.map((p) => p.load_time || 0) || [1])))

const changeBadge = (v?: number) => {
  if (v == null || v === 0) return { cls: 'flat', text: '0%' }
  const up = v > 0
  return { cls: up ? 'up' : 'down', text: `${up ? '+' : ''}${v}%` }
}

let realtimeTimer: number | null = null

onMounted(() => {
  load()
  loadRealtime()
  realtimeTimer = window.setInterval(loadRealtime, 15000)
})
onUnmounted(() => {
  if (realtimeTimer != null) window.clearInterval(realtimeTimer)
})
</script>

<template>
  <div class="analytics">
    <div class="topbar">
      <h1 class="page-title">Analytics</h1>
      <div class="range-controls">
        <select v-if="!custom" v-model="preset" @change="load">
          <option v-for="p in PRESETS" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
        <input v-if="custom" v-model="customStart" type="date" @change="load" />
        <span v-if="custom">→</span>
        <input v-if="custom" v-model="customEnd" type="date" @change="load" />
        <button class="btn-range" @click="custom = !custom; custom ? null : load()">
          {{ custom ? 'Presets' : 'Custom' }}
        </button>
        <button class="btn-range" @click="load">Refresh</button>
        <button class="btn-range accent" @click="exportCsv">Export CSV</button>
      </div>
    </div>

    <p v-if="err" class="err">{{ err }}</p>

    <div class="tabs">
      <button :class="{ active: tab === 'overview' }" @click="tab = 'overview'">Overview</button>
      <button :class="{ active: tab === 'content' }" @click="tab = 'content'">Content</button>
      <button :class="{ active: tab === 'audience' }" @click="tab = 'audience'">Audience</button>
      <button :class="{ active: tab === 'performance' }" @click="tab = 'performance'">Performance</button>
      <button :class="{ active: tab === 'realtime' }" @click="tab = 'realtime'">Real-Time</button>
      <button :class="{ active: tab === 'events' }" @click="tab = 'events'">Events & Search</button>
    </div>

    <div v-if="loading" class="loading">Loading…</div>

    <!-- ============ OVERVIEW ============ -->
    <template v-else-if="tab === 'overview' && overview">
      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-label">Visitors</span>
          <span class="stat-value">{{ fmtNum(overview.current.unique_visitors) }}</span>
          <span class="stat-change" :class="changeBadge(overview.change.unique_visitors).cls">
            {{ changeBadge(overview.change.unique_visitors).text }} vs prev.
          </span>
          <span class="stat-sub">{{ fmtNum(overview.current.new_visitors) }} new · {{ fmtNum(overview.current.returning_visitors) }} returning</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Page Views</span>
          <span class="stat-value">{{ fmtNum(overview.current.page_views) }}</span>
          <span class="stat-change" :class="changeBadge(overview.change.page_views).cls">
            {{ changeBadge(overview.change.page_views).text }} vs prev.
          </span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Sessions</span>
          <span class="stat-value">{{ fmtNum(overview.current.sessions) }}</span>
          <span class="stat-change" :class="changeBadge(overview.change.sessions).cls">
            {{ changeBadge(overview.change.sessions).text }} vs prev.
          </span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Avg Session Duration</span>
          <span class="stat-value">{{ fmtMs(overview.current.avg_session_duration * 1000) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Bounce Rate</span>
          <span class="stat-value">{{ pct(overview.current.bounce_rate) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Engagement Rate</span>
          <span class="stat-value">{{ pct(overview.current.engagement_rate) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Avg Time on Page</span>
          <span class="stat-value">{{ fmtMs(overview.current.avg_time_on_page) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Conversions</span>
          <span class="stat-value">{{ fmtNum(overview.current.conversions) }}</span>
          <span class="stat-change" :class="changeBadge(overview.change.conversions).cls">
            {{ changeBadge(overview.change.conversions).text }} vs prev.
          </span>
        </div>
      </div>

      <div class="blocks">
        <div class="block block-wide">
          <h3>Visitors & Page Views</h3>
          <div class="line-chart">
            <div class="line-row" v-for="(d, i) in overview.over_time" :key="i" :title="`${d.date}: ${d.views} views`">
              <div class="line-bar" :style="{ height: Math.max((d.views / maxViews) * 100, 2) + '%' }"></div>
              <span class="line-label">{{ d.date.slice(5) }}</span>
            </div>
          </div>
          <div class="legend">
            <span><i class="sw" style="background:#0a84ff"></i> Page views ({{ fmtNum(overview.current.page_views) }})</span>
            <span><i class="sw" style="background:#71dd8c"></i> Visitors ({{ fmtNum(overview.current.unique_visitors) }})</span>
          </div>
        </div>

        <div class="block">
          <h3>Traffic Sources</h3>
          <div v-for="s in overview.sources" :key="s.source" class="src-row">
            <span class="src-name">{{ sourceLabel[s.source] || s.source }}</span>
            <div class="src-bar-track">
              <div class="src-bar" :style="{ width: (s.views / maxSource) * 100 + '%' }"></div>
            </div>
            <span class="src-val">{{ fmtNum(s.views) }} · {{ pct(s.bounce_rate) }} bounce</span>
          </div>
          <p v-if="!overview.sources.length" class="empty-inline">No data yet.</p>
        </div>
      </div>

      <div class="blocks">
        <div class="block block-wide">
          <h3>Most Viewed Properties</h3>
          <div class="rank-list">
            <div v-for="(p, i) in overview.top_properties" :key="p.id" class="rank-row" @click="selectProperty(p.id)">
              <span class="rank-num">{{ i + 1 }}</span>
              <img v-if="p.dp" :src="p.dp" class="rank-thumb" alt="" />
              <div class="rank-info">
                <strong>{{ p.title }}</strong>
                <span class="rank-meta">{{ fmtNum(p.visitors) }} visitors · {{ fmtNum(p.sessions) }} sessions · {{ fmtMs(p.avg_time_on_page) }}</span>
              </div>
              <span class="rank-count">{{ fmtNum(p.views) }} views</span>
            </div>
          </div>
          <p v-if="!overview.top_properties.length" class="empty-inline">No property views yet.</p>
        </div>

        <div class="block">
          <h3>Campaigns (UTM)</h3>
          <div v-for="u in overview.utm" :key="u.source + u.campaign" class="utm-row">
            <span class="src-name">{{ u.source }}<em v-if="u.medium"> · {{ u.medium }}</em></span>
            <span class="src-val">{{ fmtNum(u.views) }} views · {{ fmtNum(u.visitors) }} visitors</span>
          </div>
          <p v-if="!overview.utm.length" class="empty-inline">No campaign traffic.</p>
        </div>
      </div>

      <div v-if="propDetail" class="blocks prop-detail">
        <div class="block block-wide">
          <h3>Property: {{ propDetail.title }} <button class="btn-range" @click="selectProperty(0)">×</button></h3>
          <div class="mini-stats">
            <span>{{ fmtNum(propDetail.views) }} views</span>
            <span>{{ fmtNum(propDetail.visitors) }} visitors</span>
            <span>{{ fmtNum(propDetail.sessions) }} sessions</span>
            <span>{{ fmtMs(propDetail.avg_time_on_page) }} avg time</span>
          </div>
          <div class="line-chart small">
            <div class="line-row" v-for="(d, i) in propDetail.views_over_time" :key="i" :title="`${d.date}: ${d.views}`">
              <div class="line-bar" :style="{ height: Math.max((d.views / Math.max(...(propDetail.views_over_time.map((x) => x.views) || [1]), 1)) * 100, 2) + '%' }"></div>
            </div>
          </div>
          <div class="dual-list">
            <div>
              <h4>Sources</h4>
              <p v-for="s in propDetail.sources" :key="s.source" class="kv">{{ sourceLabel[s.source] || s.source }}: <b>{{ fmtNum(s.visitors) }}</b></p>
            </div>
            <div>
              <h4>Devices</h4>
              <p v-for="d in propDetail.devices" :key="d.device" class="kv">{{ deviceLabel[d.device] || d.device }}: <b>{{ fmtNum(d.visitors) }}</b></p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ CONTENT ============ -->
    <template v-else-if="tab === 'content' && content">
      <div class="blocks">
        <div class="block block-wide">
          <h3>Most Visited Pages</h3>
          <table class="table">
            <thead><tr><th>Page</th><th>Views</th><th>Visitors</th><th>Avg time</th><th>Bounce</th><th>Exits</th></tr></thead>
            <tbody>
              <tr v-for="p in content.pages.slice(0, 15)" :key="p.path">
                <td><RouterLink :to="p.path">{{ p.path }}</RouterLink></td>
                <td>{{ fmtNum(p.views) }}</td>
                <td>{{ fmtNum(p.visitors) }}</td>
                <td>{{ fmtMs(p.avg_time_on_page) }}</td>
                <td>{{ pct(p.bounce_rate) }}</td>
                <td>{{ pct(p.exit_rate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="block">
          <h3>Least Visited</h3>
          <div class="rank-list">
            <div v-for="p in content.least_visited.slice(0, 8)" :key="p.path" class="rank-row">
              <div class="rank-info"><strong>{{ p.path }}</strong></div>
              <span class="rank-count">{{ fmtNum(p.views) }} views</span>
            </div>
          </div>
        </div>
      </div>

      <div class="blocks">
        <div class="block block-wide">
          <h3>Most Visited Properties</h3>
          <div class="rank-list">
            <div v-for="(p, i) in content.properties" :key="p.id" class="rank-row" @click="selectProperty(p.id)">
              <span class="rank-num">{{ i + 1 }}</span>
              <img v-if="p.dp" :src="p.dp" class="rank-thumb" alt="" />
              <div class="rank-info">
                <strong>{{ p.title }}</strong>
                <span class="rank-meta">{{ fmtNum(p.visitors) }} visitors · {{ pct(p.bounce_rate) }} bounce · {{ fmtMs(p.avg_time_on_page) }}</span>
              </div>
              <span class="rank-count">{{ fmtNum(p.views) }} views</span>
            </div>
          </div>
        </div>
        <div class="block">
          <h3>Landing Pages</h3>
          <div v-for="l in content.landing_pages.slice(0, 8)" :key="l.path" class="src-row">
            <span class="src-name">{{ l.path }}</span>
            <div class="src-bar-track"><div class="src-bar" :style="{ width: (l.sessions / maxLanding) * 100 + '%' }"></div></div>
            <span class="src-val">{{ fmtNum(l.sessions) }} sessions</span>
          </div>
        </div>
      </div>

      <div class="blocks">
        <div class="block">
          <h3>Exit Pages</h3>
          <div v-for="e in content.exit_pages.slice(0, 8)" :key="e.path" class="kv-row">
            <span>{{ e.path }}</span><b>{{ fmtNum(e.count) }} exits</b>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ AUDIENCE ============ -->
    <template v-else-if="tab === 'audience' && audience">
      <div class="blocks">
        <div class="block">
          <h3>Devices</h3>
          <div v-for="d in audience.devices" :key="d.key" class="src-row">
            <span class="src-name">{{ deviceLabel[d.key] || d.key }}</span>
            <div class="src-bar-track"><div class="src-bar" :style="{ width: (d.visitors / maxAudience(audience.devices)) * 100 + '%' }"></div></div>
            <span class="src-val">{{ fmtNum(d.visitors) }} visitors</span>
          </div>
        </div>
        <div class="block">
          <h3>Browsers</h3>
          <div v-for="b in audience.browsers.slice(0, 8)" :key="b.key" class="src-row">
            <span class="src-name">{{ b.key }}</span>
            <div class="src-bar-track"><div class="src-bar" :style="{ width: (b.visitors / maxAudience(audience.browsers)) * 100 + '%' }"></div></div>
            <span class="src-val">{{ fmtNum(b.visitors) }}</span>
          </div>
        </div>
      </div>
      <div class="blocks">
        <div class="block">
          <h3>Operating Systems</h3>
          <div v-for="o in audience.os.slice(0, 8)" :key="o.key" class="src-row">
            <span class="src-name">{{ o.key }}</span>
            <div class="src-bar-track"><div class="src-bar" :style="{ width: (o.visitors / maxAudience(audience.os)) * 100 + '%' }"></div></div>
            <span class="src-val">{{ fmtNum(o.visitors) }}</span>
          </div>
        </div>
        <div class="block">
          <h3>Countries</h3>
          <div v-for="c in audience.countries.slice(0, 10)" :key="c.key" class="src-row">
            <span class="src-name">{{ c.key === 'Unknown' ? 'Unknown' : c.key }}</span>
            <div class="src-bar-track"><div class="src-bar" :style="{ width: (c.visitors / maxAudience(audience.countries)) * 100 + '%' }"></div></div>
            <span class="src-val">{{ fmtNum(c.visitors) }}</span>
          </div>
          <p v-if="!audience.countries.length" class="empty-inline">No location data yet.</p>
        </div>
      </div>
      <div class="blocks">
        <div class="block block-wide">
          <h3>Screen Sizes</h3>
          <div class="screen-grid">
            <span v-for="s in audience.screen_sizes.slice(0, 10)" :key="s.key" class="screen-chip">{{ s.key }} · {{ fmtNum(s.visitors) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ PERFORMANCE ============ -->
    <template v-else-if="tab === 'performance' && performance">
      <div class="stat-grid">
        <div class="stat-card"><span class="stat-label">Avg Load Time</span><span class="stat-value">{{ fmtMs(performance.averages.load_time) }}</span><span class="stat-sub">{{ performance.averages.samples }} samples</span></div>
        <div class="stat-card"><span class="stat-label">TTFB</span><span class="stat-value">{{ fmtMs(performance.averages.ttfb) }}</span></div>
        <div class="stat-card"><span class="stat-label">FCP</span><span class="stat-value">{{ fmtMs(performance.averages.fcp) }}</span></div>
        <div class="stat-card"><span class="stat-label">LCP</span><span class="stat-value">{{ fmtMs(performance.averages.lcp) }}</span></div>
        <div class="stat-card"><span class="stat-label">CLS</span><span class="stat-value">{{ performance.averages.cls != null ? performance.averages.cls : '—' }}</span></div>
        <div class="stat-card"><span class="stat-label">JS Errors</span><span class="stat-value">{{ fmtNum(performance.averages.js_errors + performance.error_count) }}</span></div>
        <div class="stat-card"><span class="stat-label">Failed Requests</span><span class="stat-value">{{ fmtNum(performance.averages.failed_requests) }}</span></div>
        <div class="stat-card"><span class="stat-label">DOM Content Loaded</span><span class="stat-value">{{ fmtMs(performance.averages.dom_loaded) }}</span></div>
      </div>

      <div class="blocks">
        <div class="block block-wide">
          <h3>Slowest Pages</h3>
          <table class="table">
            <thead><tr><th>Page</th><th>Avg Load</th><th>LCP</th><th>TTFB</th><th>CLS</th><th>Samples</th></tr></thead>
            <tbody>
              <tr v-for="p in performance.slowest_pages" :key="p.path">
                <td>{{ p.path }}</td>
                <td><b>{{ fmtMs(p.load_time) }}</b></td>
                <td>{{ fmtMs(p.lcp) }}</td>
                <td>{{ fmtMs(p.ttfb) }}</td>
                <td>{{ p.cls ?? '—' }}</td>
                <td>{{ p.samples }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="block">
          <h3>Load Time by Page</h3>
          <div v-for="p in performance.slowest_pages.slice(0, 8)" :key="p.path" class="src-row">
            <span class="src-name" :title="p.path">{{ p.path }}</span>
            <div class="src-bar-track"><div class="src-bar" :style="{ width: ((p.load_time || 0) / maxSlow) * 100 + '%', background: '#ff453a' }"></div></div>
            <span class="src-val">{{ fmtMs(p.load_time) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ REAL-TIME ============ -->
    <template v-else-if="tab === 'realtime'">
      <div class="realtime-banner">
        <span class="pulse"></span>
        <strong>{{ realtime?.active_visitors || 0 }} visitors online</strong>
        <span>· {{ realtime?.active_sessions || 0 }} active sessions</span>
        <span class="auto">auto-refreshes every 15s</span>
      </div>
      <div class="blocks">
        <div class="block block-wide">
          <h3>Pages Currently Being Viewed</h3>
          <div v-for="p in realtime?.pages || []" :key="p.path" class="src-row">
            <span class="src-name">{{ p.path }}</span>
            <div class="src-bar-track"><div class="src-bar" :style="{ width: (p.active_visitors / maxRealtimePages) * 100 + '%' }"></div></div>
            <span class="src-val">{{ p.active_visitors }} visitors</span>
          </div>
          <p v-if="!realtime?.pages.length" class="empty-inline">No one is online right now.</p>
        </div>
        <div class="block">
          <h3>Recent Activity</h3>
          <div v-for="r in realtime?.recent.slice(0, 15) || []" :key="r.created_at + r.path" class="kv-row">
            <span>{{ r.created_at }} · {{ r.path }} <em v-if="r.country">[{{ r.country }}]</em></span>
            <b>{{ r.device_type || '—' }} · {{ r.source_type || '—' }}</b>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ EVENTS & SEARCH ============ -->
    <template v-else-if="tab === 'events' && events">
      <div class="blocks">
        <div class="block block-wide">
          <h3>Tracked Events</h3>
          <table class="table">
            <thead><tr><th>Event</th><th>Category</th><th>Count</th><th>Visitors</th></tr></thead>
            <tbody>
              <tr v-for="e in events.events" :key="e.name">
                <td>{{ e.name }}</td>
                <td>{{ e.category }}</td>
                <td><b>{{ fmtNum(e.count) }}</b></td>
                <td>{{ fmtNum(e.visitors) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!events.events.length" class="empty-inline">No events tracked yet.</p>
        </div>
        <div class="block">
          <h3>Search Terms</h3>
          <div v-for="s in events.search_terms" :key="s.term" class="kv-row">
            <span>"{{ s.term }}"</span><b>{{ fmtNum(s.count) }} searches</b>
          </div>
          <p v-if="!events.search_terms.length" class="empty-inline">No searches yet.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-title { font-size: 1.4rem; font-weight: 600; margin-bottom: 20px; }
.topbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.range-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.range-controls select, .range-controls input {
  border: 1px solid #e5e5e7; border-radius: 8px; padding: 7px 10px; font-size: 0.85rem;
}
.btn-range {
  border: 1px solid #e5e5e7; background: #fff; border-radius: 8px; padding: 7px 12px;
  font-size: 0.85rem; cursor: pointer;
}
.btn-range:hover { background: #f5f5f7; }
.btn-range.accent { background: #0a84ff; border-color: #0a84ff; color: #fff; }
.err { color: #d0342c; margin: 12px 0; }
.tabs { display: flex; gap: 6px; border-bottom: 2px solid #eee; margin: 20px 0; flex-wrap: wrap; }
.tabs button { padding: 10px 16px; border: none; background: none; font-weight: 500; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer; }
.tabs button.active { color: #0a84ff; border-bottom-color: #0a84ff; }

.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 22px; }
.stat-card { background: #f9f9fa; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 0.82rem; color: #444; }
.stat-value { font-size: 1.7rem; font-weight: 600; color: #1c1c1c; }
.stat-sub { font-size: 0.78rem; color: #9aa0a6; }
.stat-change { font-size: 0.8rem; font-weight: 500; }
.stat-change.up { color: #0a84ff; }
.stat-change.down { color: #ff453a; }
.stat-change.flat { color: #9aa0a6; }

.blocks { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; margin-bottom: 18px; }
.block { background: #f9f9fa; border-radius: 14px; padding: 20px; }
.block h3 { font-size: 1rem; font-weight: 600; margin-bottom: 14px; color: #1c1c1c; }
.block h4 { font-size: 0.85rem; color: #666; margin: 8px 0; }
.block-wide { grid-column: span 2; }
.empty-inline { color: #9aa0a6; font-size: 0.88rem; padding: 14px 0; }

/* bar chart */
.line-chart { display: flex; align-items: flex-end; gap: 3px; height: 150px; }
.line-chart.small { height: 90px; margin-top: 10px; }
.line-row { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 4px; }
.line-bar { width: 100%; background: #0a84ff; border-radius: 3px 3px 0 0; min-height: 2px; }
.line-label { font-size: 0.6rem; color: #9aa0a6; }
.legend { display: flex; gap: 18px; margin-top: 10px; font-size: 0.8rem; color: #666; }
.sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; }

/* source bars */
.src-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 0.85rem; }
.src-name { width: 120px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.src-bar-track { flex: 1; height: 8px; background: #eef0f3; border-radius: 4px; overflow: hidden; }
.src-bar { height: 100%; background: #71dd8c; border-radius: 4px; min-width: 2px; }
.src-val { width: 130px; text-align: right; color: #666; flex-shrink: 0; font-size: 0.78rem; }

/* rank lists */
.rank-list { display: flex; flex-direction: column; gap: 8px; }
.rank-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #fff; border-radius: 10px; cursor: pointer; }
.rank-row:hover { background: #eef4ff; }
.rank-num { width: 22px; height: 22px; border-radius: 50%; background: #0a84ff; color: #fff; font-size: 0.75rem; font-weight: 600; display: grid; place-items: center; flex-shrink: 0; }
.rank-thumb { width: 42px; height: 32px; border-radius: 6px; object-fit: cover; }
.rank-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rank-info strong { color: #1c1c1c; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-meta { color: #9aa0a6; font-size: 0.78rem; }
.rank-count { color: #0a84ff; font-weight: 600; font-size: 0.85rem; flex-shrink: 0; }

.utm-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e5e7; font-size: 0.85rem; }
.utm-row em { color: #9aa0a6; font-style: normal; }

/* tables */
.table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.table th { text-align: left; color: #9aa0a6; font-weight: 500; font-size: 0.75rem; padding: 6px 8px; border-bottom: 1px solid #e5e5e7; }
.table td { padding: 8px; border-bottom: 1px solid #f0f1f3; color: #333; }
.table a { color: #0a84ff; }
.table a:hover { text-decoration: underline; }

.kv-row { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px dashed #e5e5e7; font-size: 0.85rem; }
.kv-row em { color: #9aa0a6; font-style: normal; }
.kv { font-size: 0.85rem; margin: 4px 0; }

.mini-stats { display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.9rem; color: #444; margin-bottom: 10px; }
.dual-list { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
.screen-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.screen-chip { background: #fff; border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; color: #333; }

/* realtime */
.realtime-banner { display: flex; align-items: center; gap: 10px; background: #eefaf1; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px; font-size: 0.95rem; color: #1c1c1c; }
.realtime-banner .auto { margin-left: auto; color: #9aa0a6; font-size: 0.8rem; }
.pulse { width: 10px; height: 10px; border-radius: 50%; background: #71dd8c; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(113,221,140,0.6); } 70% { box-shadow: 0 0 0 8px rgba(113,221,140,0); } 100% { box-shadow: 0 0 0 0 rgba(113,221,140,0); } }

.loading { text-align: center; color: #9aa0a6; padding: 60px; }

@media (max-width: 1100px) { .stat-grid { grid-template-columns: 1fr 1fr; } .blocks { grid-template-columns: 1fr; } .block-wide { grid-column: span 1; } }
@media (max-width: 600px) { .stat-grid { grid-template-columns: 1fr; } }
</style>
