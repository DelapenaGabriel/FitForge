<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNutritionStore } from '@/stores/nutrition'
import NutritionFoodSearch from '@/components/NutritionFoodSearch.vue'
import NutritionSettings from '@/components/NutritionSettings.vue'

const auth = useAuthStore()
const nutrition = useNutritionStore()

const showSettings = ref(false)
const showFoodSearch = ref(false)
const selectedHour = ref(null)
const showDatePicker = ref(false)
const menuOpenId = ref(null)

const today = new Date()
const selectedDate = computed(() => new Date(nutrition.selectedDate))

const weekDays = computed(() => {
  const d = new Date(selectedDate.value)
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((day + 6) % 7))
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(mon)
    date.setDate(mon.getDate() + i)
    days.push(date)
  }
  return days
})

const dayLabels = ['SUN','MON','TUE','WED','THU','FRI','SAT']

function isToday(d) {
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}
function isSelected(d) {
  const s = selectedDate.value
  return d.getDate() === s.getDate() && d.getMonth() === s.getMonth() && d.getFullYear() === s.getFullYear()
}
function selectDay(d) { nutrition.setSelectedDate(d) }

function formatDateHeader() {
  return selectedDate.value.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })
}

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return h + ' AM'
  if (h === 12) return '12 PM'
  return (h - 12) + ' PM'
}

function formatLogTime(dt) {
  const d = new Date(dt)
  let h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2,'0')} ${ampm}`
}

function openAddFood(hour) {
  selectedHour.value = hour
  showFoodSearch.value = true
}

function openSearchBar() {
  selectedHour.value = new Date().getHours()
  showFoodSearch.value = true
}

async function handleDeleteLog(id) {
  menuOpenId.value = null
  await nutrition.deleteFoodLog(id)
}

function toggleMenu(id) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function prevWeek() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 7)
  nutrition.setSelectedDate(d)
}
function nextWeek() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 7)
  nutrition.setSelectedDate(d)
}

function goToToday() {
  nutrition.setSelectedDate(new Date())
  showDatePicker.value = false
}

// Current hour for auto-scroll
const currentHour = new Date().getHours()
const timelineRef = ref(null)

onMounted(async () => {
  await nutrition.fetchSettings()
  await nutrition.fetchLogs(nutrition.selectedDate)
  // Scroll to current hour area
  setTimeout(() => {
    const el = document.getElementById(`hour-${currentHour}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 300)
})

const hours = Array.from({ length: 24 }, (_, i) => i)
</script>

<template>
  <div class="nt-page">
    <!-- Header -->
    <div class="nt-header">
      <div class="nt-header-left">
        <div class="nt-header-text">
          <h1 class="nt-title">Nutrition</h1>
          <span class="nt-date-sub">{{ formatDateHeader() }}</span>
        </div>
      </div>
      <div class="nt-header-actions">
        <button class="nt-icon-btn" @click="showSettings = true" title="Settings">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    </div>

    <!-- Week Calendar Strip -->
    <div class="nt-week-strip">
      <button class="nt-week-nav" @click="prevWeek">‹</button>
      <div class="nt-week-days">
        <button
          v-for="d in weekDays" :key="d.toISOString()"
          class="nt-day-cell"
          :class="{ 'nt-day-selected': isSelected(d), 'nt-day-today': isToday(d) }"
          @click="selectDay(d)"
        >
          <span class="nt-day-num">{{ d.getDate() }}</span>
          <span class="nt-day-label">{{ dayLabels[d.getDay()] }}</span>
          <span v-if="isToday(d)" class="nt-today-dot"></span>
        </button>
      </div>
      <button class="nt-week-nav" @click="nextWeek">›</button>
    </div>

    <!-- Macro Summary -->
    <div class="nt-macro-bar">
      <div class="nt-macro-item">
        <div class="nt-macro-label"><span class="nt-fire">🔥</span> {{ nutrition.dailyTotals.calories }} / {{ nutrition.settings.daily_calories }}</div>
        <div class="nt-macro-label-letter cal">C</div>
        <div class="nt-progress"><div class="nt-progress-fill nt-fill-cal" :style="{ width: nutrition.macroProgress.calories + '%' }"></div></div>
      </div>
      <div class="nt-macro-item">
        <div class="nt-macro-label"><span class="nt-macro-p">P</span> {{ nutrition.dailyTotals.protein }} / {{ nutrition.settings.protein_g }}</div>
        <div class="nt-progress"><div class="nt-progress-fill nt-fill-protein" :style="{ width: nutrition.macroProgress.protein + '%' }"></div></div>
      </div>
      <div class="nt-macro-item">
        <div class="nt-macro-label"><span class="nt-macro-f">F</span> {{ nutrition.dailyTotals.fat }} / {{ nutrition.settings.fat_g }}</div>
        <div class="nt-progress"><div class="nt-progress-fill nt-fill-fat" :style="{ width: nutrition.macroProgress.fat + '%' }"></div></div>
      </div>
      <div class="nt-macro-item">
        <div class="nt-macro-label"><span class="nt-macro-c">C</span> {{ nutrition.dailyTotals.carbs }} / {{ nutrition.settings.carbs_g }}</div>
        <div class="nt-progress"><div class="nt-progress-fill nt-fill-carbs" :style="{ width: nutrition.macroProgress.carbs + '%' }"></div></div>
      </div>
    </div>

    <!-- Timeline -->
    <div class="nt-timeline" ref="timelineRef">
      <div v-for="h in hours" :key="h" :id="'hour-' + h" class="nt-hour-block">
        <div class="nt-hour-row">
          <div class="nt-hour-left">
            <div class="nt-timeline-dot"></div>
            <button class="nt-hour-pill" @click="openAddFood(h)">
              <span class="nt-hour-text">{{ formatHour(h) }}</span>
              <span class="nt-hour-plus">+</span>
            </button>
          </div>
          <!-- Macro badges for hour if any -->
          <div v-if="nutrition.logsByHour[h]?.length" class="nt-hour-macros">
            <span class="nt-hm-badge nt-hm-cal">🔥 {{ nutrition.hourMacros(h).calories }}</span>
            <span class="nt-hm-badge nt-hm-p">P {{ nutrition.hourMacros(h).protein }}</span>
            <span class="nt-hm-badge nt-hm-f">F {{ nutrition.hourMacros(h).fat }}</span>
            <span class="nt-hm-badge nt-hm-c">C {{ nutrition.hourMacros(h).carbs }}</span>
          </div>
        </div>

        <!-- Food entries for this hour -->
        <div v-for="log in nutrition.logsByHour[h]" :key="log.id" class="nt-food-entry">
          <div class="nt-food-time">{{ formatLogTime(log.logged_at) }}</div>
          <div class="nt-food-card">
            <div class="nt-food-info">
              <span class="nt-food-name">{{ log.food_name }}</span>
              <div class="nt-food-macros">
                <span class="nt-fm nt-fm-cal">🔥 {{ log.calories }}</span>
                <span class="nt-fm nt-fm-p">P {{ Math.round(log.protein_g) }}</span>
                <span class="nt-fm nt-fm-f">F {{ Math.round(log.fat_g) }}</span>
                <span class="nt-fm nt-fm-c">C {{ Math.round(log.carbs_g) }}</span>
              </div>
            </div>
            <button class="nt-food-menu" @click="toggleMenu(log.id)">⋮</button>
            <div v-if="menuOpenId === log.id" class="nt-food-dropdown">
              <button @click="handleDeleteLog(log.id)" class="nt-food-drop-item nt-drop-del">Delete</button>
            </div>
          </div>
        </div>

        <div class="nt-timeline-line" v-if="h < 23"></div>
      </div>
    </div>

    <!-- Bottom Search Bar -->
    <div class="nt-bottom-bar">
      <button class="nt-search-trigger" @click="openSearchBar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <span>Search food database</span>
      </button>
      <button class="nt-barcode-btn" @click="openSearchBar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3h-3"/><path d="M14 20h3"/><path d="M20 20h0"/></svg>
      </button>
    </div>

    <!-- Food Search Modal -->
    <NutritionFoodSearch
      v-if="showFoodSearch"
      :hour="selectedHour"
      :date="selectedDate"
      @close="showFoodSearch = false"
    />

    <!-- Settings Modal -->
    <NutritionSettings
      v-if="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>

<style scoped>
.nt-page {
  min-height: 100vh;
  background: #080808;
  padding: max(16px, env(safe-area-inset-top)) 0 0;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  position: relative;
}

/* Header */
.nt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 8px;
}
.nt-header-left { display: flex; align-items: center; gap: 12px; }
.nt-avatar-circle {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(217,255,77,0.12); border: 2px solid rgba(217,255,77,0.3);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Space Grotesk', sans-serif; font-weight: 800;
  font-size: 0.8rem; color: #DFFF00;
}
.nt-title {
  font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 700;
  color: #fff; margin: 0; line-height: 1.2;
}
.nt-date-sub {
  font-size: 0.75rem; color: rgba(255,255,255,0.4);
  font-family: 'Space Grotesk', sans-serif;
}
.nt-header-actions { display: flex; gap: 8px; }
.nt-icon-btn {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.2s;
}
.nt-icon-btn:hover { background: rgba(255,255,255,0.08); color: #DFFF00; }

/* Week Strip */
.nt-week-strip {
  display: flex; align-items: center; gap: 4px;
  padding: 12px 8px 8px; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.nt-week-nav {
  width: 28px; height: 28px; border-radius: 8px;
  background: none; border: none; color: rgba(255,255,255,0.3);
  font-size: 1.2rem; cursor: pointer; transition: color 0.2s;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.nt-week-nav:hover { color: #DFFF00; }
.nt-week-days { display: flex; flex: 1; justify-content: space-around; gap: 2px; }
.nt-day-cell {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 6px; border-radius: 12px; border: 2px solid transparent;
  background: none; color: rgba(255,255,255,0.5); cursor: pointer;
  transition: all 0.2s; min-width: 42px; position: relative;
}
.nt-day-cell:hover { background: rgba(255,255,255,0.04); }
.nt-day-selected {
  border-color: #3B82F6; background: rgba(59,130,246,0.08);
  color: #fff;
}
.nt-day-num {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 1rem;
}
.nt-day-label {
  font-family: 'Space Grotesk', sans-serif; font-weight: 600;
  font-size: 0.55rem; letter-spacing: 0.08em; text-transform: uppercase;
}
.nt-today-dot {
  width: 5px; height: 5px; border-radius: 50%; background: #3B82F6;
  position: absolute; bottom: 3px;
}

/* Macro Summary */
.nt-macro-bar {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.nt-macro-item { display: flex; flex-direction: column; gap: 4px; }
.nt-macro-label {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.68rem;
  font-weight: 600; color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 3px;
}
.nt-macro-label-letter { display: none; }
.nt-fire { font-size: 0.7rem; }
.nt-macro-p { color: #3B82F6; font-weight: 800; }
.nt-macro-f { color: #DFFF00; font-weight: 800; }
.nt-macro-c { color: #F97316; font-weight: 800; }
.nt-progress {
  height: 5px; background: rgba(255,255,255,0.06);
  border-radius: 10px; overflow: hidden;
}
.nt-progress-fill {
  height: 100%; border-radius: 10px;
  transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
}
.nt-fill-cal { background: linear-gradient(90deg, #a3a3a3, #d4d4d4); }
.nt-fill-protein { background: linear-gradient(90deg, #2563EB, #60A5FA); }
.nt-fill-fat { background: linear-gradient(90deg, #a8cf2b, #DFFF00); }
.nt-fill-carbs { background: linear-gradient(90deg, #EA580C, #F97316); }

/* Timeline */
.nt-timeline { padding: 8px 16px 0; }
.nt-hour-block { position: relative; padding-left: 8px; }
.nt-hour-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 0; position: relative; z-index: 1;
}
.nt-hour-left { display: flex; align-items: center; gap: 10px; }
.nt-timeline-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.2);
  flex-shrink: 0;
}
.nt-hour-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px; border-radius: 20px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.2s;
  font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem; font-weight: 600;
}
.nt-hour-pill:hover { background: rgba(217,255,77,0.08); border-color: rgba(217,255,77,0.2); color: #DFFF00; }
.nt-hour-plus {
  font-size: 0.9rem; font-weight: 700; color: rgba(255,255,255,0.4);
  width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; background: rgba(255,255,255,0.06);
}
.nt-hour-pill:hover .nt-hour-plus { background: rgba(217,255,77,0.15); color: #DFFF00; }

/* Hour macros badges */
.nt-hour-macros { display: flex; gap: 4px; flex-wrap: wrap; }
.nt-hm-badge {
  padding: 3px 8px; border-radius: 12px; font-size: 0.65rem;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
}
.nt-hm-cal { background: rgba(255,255,255,0.08); color: #fff; }
.nt-hm-p { background: rgba(59,130,246,0.15); color: #60A5FA; }
.nt-hm-f { background: rgba(217,255,77,0.12); color: #DFFF00; }
.nt-hm-c { background: rgba(249,115,22,0.15); color: #FB923C; }

/* Food entry */
.nt-food-entry {
  display: flex; gap: 12px; padding: 8px 0 8px 22px;
  position: relative; z-index: 1;
}
.nt-food-time {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.65rem;
  color: rgba(255,255,255,0.35); min-width: 42px; padding-top: 4px;
  text-align: right;
}
.nt-food-card {
  flex: 1; display: flex; align-items: flex-start; justify-content: space-between;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 12px 14px; position: relative;
  transition: background 0.2s;
}
.nt-food-card:hover { background: rgba(255,255,255,0.05); }
.nt-food-info { display: flex; flex-direction: column; gap: 4px; }
.nt-food-name {
  font-family: 'Outfit', sans-serif; font-weight: 600;
  font-size: 0.9rem; color: #fff;
}
.nt-food-macros { display: flex; gap: 8px; flex-wrap: wrap; }
.nt-fm {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.65rem;
  font-weight: 700; color: rgba(255,255,255,0.5);
}
.nt-fm-cal { color: rgba(255,255,255,0.7); }
.nt-fm-p { color: #60A5FA; }
.nt-fm-f { color: #DFFF00; }
.nt-fm-c { color: #FB923C; }

.nt-food-menu {
  background: none; border: none; color: rgba(255,255,255,0.3);
  font-size: 1.2rem; cursor: pointer; padding: 4px 6px; border-radius: 8px;
  transition: all 0.2s;
}
.nt-food-menu:hover { background: rgba(255,255,255,0.06); color: #fff; }
.nt-food-dropdown {
  position: absolute; top: 36px; right: 8px;
  background: #1a1a1c; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 4px; z-index: 20; min-width: 100px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6);
}
.nt-food-drop-item {
  width: 100%; padding: 8px 14px; border: none; border-radius: 8px;
  background: none; color: rgba(255,255,255,0.7); font-size: 0.8rem;
  cursor: pointer; text-align: left; font-family: 'Space Grotesk', sans-serif;
  transition: background 0.15s;
}
.nt-food-drop-item:hover { background: rgba(255,255,255,0.06); }
.nt-drop-del { color: #ef4444; }
.nt-drop-del:hover { background: rgba(239,68,68,0.1); }

/* Timeline connector */
.nt-timeline-line {
  position: absolute; left: 11.5px; top: 28px; bottom: -8px;
  width: 1px; background: rgba(255,255,255,0.06);
  border-left: 1px dashed rgba(255,255,255,0.08);
}

/* Bottom Bar */
.nt-bottom-bar {
  position: fixed; bottom: calc(72px + env(safe-area-inset-bottom));
  left: 0; right: 0; padding: 10px 16px;
  display: flex; gap: 10px; z-index: 50;
  background: linear-gradient(to top, #080808 60%, transparent);
}
.nt-search-trigger {
  flex: 1; display: flex; align-items: center; gap: 10px;
  padding: 12px 18px; border-radius: 16px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.35); cursor: pointer; transition: all 0.2s;
  font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem;
}
.nt-search-trigger:hover { background: rgba(255,255,255,0.06); border-color: rgba(217,255,77,0.2); }
.nt-barcode-btn {
  width: 48px; height: 48px; border-radius: 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.nt-barcode-btn:hover { background: rgba(217,255,77,0.08); color: #DFFF00; }

@media (max-width: 768px) {
  .nt-macro-bar { grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 10px 12px; }
  .nt-macro-label { font-size: 0.6rem; }
}
</style>
