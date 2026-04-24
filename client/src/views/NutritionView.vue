<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNutritionStore } from '@/stores/nutrition'
import NutritionFoodSearch from '@/components/NutritionFoodSearch.vue'
import NutritionSettings from '@/components/NutritionSettings.vue'
import BarcodeScannerModal from '@/components/BarcodeScannerModal.vue'
import FoodDetailModal from '@/components/FoodDetailModal.vue'

const auth = useAuthStore()
const nutrition = useNutritionStore()

const showSettings = ref(false)
const showFoodSearch = ref(false)
const selectedHour = ref(null)
const exactTime = ref(false)
const showDatePicker = ref(false)
const menuOpenId = ref(null)
const showScanner = ref(false)
const selectedFood = ref(null)
const scannerLoading = ref(false)
const scanError = ref(null)
const editLog = ref(null)

const today = new Date()
const selectedDate = computed(() => new Date(nutrition.selectedDate))

const calendarDays = computed(() => {
  const days = []
  for (let i = -60; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
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
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayHour = h % 12 || 12
  return `${displayHour}:00 ${ampm}`
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
  exactTime.value = false
  showFoodSearch.value = true
}

function openSearchBar() {
  selectedHour.value = new Date().getHours()
  exactTime.value = true
  showFoodSearch.value = true
}

function openBarcodeScanner() {
  selectedHour.value = new Date().getHours()
  exactTime.value = true
  showScanner.value = true
}

function handleOpenScannerFromSearch() {
  showFoodSearch.value = false
  showScanner.value = true
}

async function onBarcodeDetected(barcode) {
  showScanner.value = false
  scannerLoading.value = true
  scanError.value = null
  try {
    const food = await nutrition.searchBarcode(barcode)
    if (food) {
      selectedFood.value = food
    } else {
      scanError.value = 'No product found for this barcode.'
      setTimeout(() => { scanError.value = null }, 3000)
    }
  } catch (e) {
    scanError.value = 'Lookup failed. Try again.'
    setTimeout(() => { scanError.value = null }, 3000)
  } finally {
    scannerLoading.value = false
  }
}

const detailLoading = ref(false)
const detailError = ref(null)

async function onFoodSelected(food) {
  // If it's a FatSecret search result with a source_id, fetch full details
  if (food.source === 'fatsecret' && food.source_id) {
    detailLoading.value = true
    detailError.value = null
    try {
      const detailed = await nutrition.getFoodDetails(food.source_id)
      if (detailed) {
        selectedFood.value = detailed
      } else {
        // Fallback to the basic data we already have
        selectedFood.value = food
      }
    } catch (e) {
      console.error('Failed to fetch food details:', e)
      selectedFood.value = food
    } finally {
      detailLoading.value = false
    }
  } else {
    selectedFood.value = food
  }
}

function onFoodAdded() {
  selectedFood.value = null
  editLog.value = null
  showFoodSearch.value = false
}

async function openEditFood(log) {
  editLog.value = log
  selectedHour.value = new Date(log.logged_at).getHours()
  exactTime.value = false

  if (log.source === 'fatsecret' && log.source_id) {
    detailLoading.value = true
    try {
      const detailed = await nutrition.getFoodDetails(log.source_id)
      if (detailed) {
        selectedFood.value = detailed
      } else {
        selectedFood.value = log
      }
    } catch (e) {
      console.error('Failed to fetch food details:', e)
      selectedFood.value = log
    } finally {
      detailLoading.value = false
    }
  } else {
    selectedFood.value = log
  }
}

async function handleDeleteLog(id) {
  menuOpenId.value = null
  await nutrition.deleteFoodLog(id)
}

function toggleMenu(id) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}

const draggedLog = ref(null)
const dragHoverHour = ref(null)

function onDragStart(log, event) {
  draggedLog.value = log
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', log.id)
  }
}

function onDragOver(hour, event) {
  if (draggedLog.value) {
    dragHoverHour.value = hour
  }
}

function onDragLeave(hour, event) {
  if (dragHoverHour.value === hour) {
    dragHoverHour.value = null
  }
}

function onDragEnd() {
  draggedLog.value = null
  dragHoverHour.value = null
}

async function onDrop(hour, event) {
  dragHoverHour.value = null
  
  let logId = null
  if (draggedLog.value) {
    logId = draggedLog.value.id
  } else if (event.dataTransfer) {
    logId = event.dataTransfer.getData('text/plain')
  }

  if (!logId) {
    console.error('No logId found on drop')
    return
  }
  
  const log = nutrition.foodLogs.find(l => String(l.id) === String(logId))
  if (!log) {
    console.error('No log found for id:', logId)
    return
  }
  
  const currentHour = new Date(log.logged_at).getHours()
  if (currentHour === hour) return // Dropped in the same hour
  
  try {
    await nutrition.updateFoodLogTime(log.id, hour)
  } catch (error) {
    console.error('Failed to update food log time:', error)
  }
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function goToToday() {
  nutrition.setSelectedDate(new Date())
  showDatePicker.value = false
}

const dateCarouselRef = ref(null)

function scrollToSelectedDate() {
  if (!dateCarouselRef.value) return
  const iso = selectedDate.value.toISOString().split('T')[0]
  const el = document.getElementById('date-' + iso)
  if (el) {
    const container = dateCarouselRef.value
    const scrollLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
    container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
  }
}

watch(selectedDate, () => {
  setTimeout(scrollToSelectedDate, 50)
})

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
    scrollToSelectedDate()
  }, 300)
})

const hours = Array.from({ length: 24 }, (_, i) => i)
</script>

<template>
  <div class="nt-page">
    <div class="nt-container">
      <!-- Header -->
      <div class="nt-header animate-in">
        <div class="nt-header-left">
          <h1 class="nt-title">Nutrition</h1>
          <span class="nt-date-sub">{{ formatDateHeader() }}</span>
        </div>
        <div class="nt-header-actions">
          <button class="nt-icon-btn" @click="showSettings = true" title="Settings">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <!-- Date Carousel -->
      <div class="nt-date-carousel-wrapper animate-in" style="animation-delay: 0.05s">
        <div class="nt-date-carousel" ref="dateCarouselRef">
          <button
            v-for="d in calendarDays" :key="d.toISOString()"
            class="nt-day-cell"
            :class="{ 'nt-day-selected': isSelected(d) }"
            :id="'date-' + d.toISOString().split('T')[0]"
            @click="selectDay(d)"
          >
            <span class="nt-day-label">{{ dayLabels[d.getDay()] }}</span>
            <span class="nt-day-num">{{ d.getDate() }}</span>
            <span v-if="isToday(d)" class="nt-today-dot"></span>
          </button>
        </div>
      </div>

      <!-- Macro Summary Hero -->
      <div class="nt-macro-hero animate-in" style="animation-delay: 0.1s">
        <div class="nt-macro-hero-top">
          <div class="nt-cal-info">
            <span class="nt-cal-title">CALORIES</span>
            <div class="nt-cal-value">{{ nutrition.dailyTotals.calories }} <span class="nt-cal-target">/ {{ nutrition.settings.daily_calories }}</span></div>
          </div>
          <div class="nt-cal-progress-ring">
            <svg class="nt-ring-svg" viewBox="0 0 100 100">
              <circle class="nt-ring-bg" cx="50" cy="50" r="44"></circle>
              <circle class="nt-ring-fill" cx="50" cy="50" r="44" :stroke-dasharray="`${Math.min(nutrition.macroProgress.calories, 100) * 2.76} 276`"></circle>
            </svg>
            <span class="nt-ring-icon">⚡</span>
          </div>
        </div>

        <div class="nt-macro-bars">
          <div class="nt-macro-item">
            <div class="nt-macro-header">
              <span class="nt-macro-label">PROTEIN</span>
              <span class="nt-macro-val">{{ nutrition.dailyTotals.protein }}g <span class="nt-macro-target">/ {{ nutrition.settings.protein_g }}</span></span>
            </div>
            <div class="nt-progress"><div class="nt-progress-fill nt-fill-protein" :style="{ width: nutrition.macroProgress.protein + '%' }"></div></div>
          </div>
          <div class="nt-macro-item">
            <div class="nt-macro-header">
              <span class="nt-macro-label">FAT</span>
              <span class="nt-macro-val">{{ nutrition.dailyTotals.fat }}g <span class="nt-macro-target">/ {{ nutrition.settings.fat_g }}</span></span>
            </div>
            <div class="nt-progress"><div class="nt-progress-fill nt-fill-fat" :style="{ width: nutrition.macroProgress.fat + '%' }"></div></div>
          </div>
          <div class="nt-macro-item">
            <div class="nt-macro-header">
              <span class="nt-macro-label">CARBS</span>
              <span class="nt-macro-val">{{ nutrition.dailyTotals.carbs }}g <span class="nt-macro-target">/ {{ nutrition.settings.carbs_g }}</span></span>
            </div>
            <div class="nt-progress"><div class="nt-progress-fill nt-fill-carbs" :style="{ width: nutrition.macroProgress.carbs + '%' }"></div></div>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="nt-timeline animate-in" style="animation-delay: 0.15s" ref="timelineRef">
        <div v-for="h in hours" :key="h" :id="'hour-' + h" class="nt-hour-block" 
             :class="{'has-logs': nutrition.logsByHour[h]?.length, 'nt-drag-hover': dragHoverHour === h}"
             @dragover.prevent="onDragOver(h, $event)"
             @dragenter.prevent="onDragOver(h, $event)"
             @dragleave="onDragLeave(h, $event)"
             @drop.prevent="onDrop(h, $event)">
          <div class="nt-timeline-line" v-if="h < 23"></div>
          
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
              <span class="nt-hm-badge">{{ nutrition.hourMacros(h).calories }} kcal</span>
            </div>
          </div>

          <!-- Food entries for this hour -->
          <transition-group name="list">
            <div v-for="log in nutrition.logsByHour[h]" :key="log.id" class="nt-food-entry"
                 :class="{ 'is-dragging': draggedLog?.id === log.id }"
                 draggable="true"
                 @dragstart="onDragStart(log, $event)"
                 @dragend="onDragEnd">
              <div class="nt-food-time">{{ formatLogTime(log.logged_at) }}</div>
              <div class="nt-food-card">
                <div class="nt-card-main">
                  <div class="nt-drag-handle" title="Drag to move">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </div>
                  <div class="nt-food-info" @click="openEditFood(log)" style="cursor: pointer; flex: 1;">
                    <span class="nt-food-name">{{ log.food_name }}</span>
                    <div class="nt-food-macros">
                      <span class="nt-fm nt-fm-cal">{{ log.calories }} kcal</span>
                      <span class="nt-fm nt-fm-p">P: {{ Math.round(log.protein_g) }}</span>
                      <span class="nt-fm nt-fm-f">F: {{ Math.round(log.fat_g) }}</span>
                      <span class="nt-fm nt-fm-c">C: {{ Math.round(log.carbs_g) }}</span>
                    </div>
                  </div>
                </div>
                <button class="nt-food-menu" @click="toggleMenu(log.id)">⋮</button>
                <div v-if="menuOpenId === log.id" class="nt-food-dropdown">
                  <button @click="handleDeleteLog(log.id)" class="nt-food-drop-item nt-drop-del">Delete</button>
                </div>
              </div>
            </div>
          </transition-group>
        </div>
      </div>
    </div>

    <!-- Bottom Search Bar -->
    <div class="nt-bottom-bar animate-in" style="animation-delay: 0.2s">
      <button class="nt-search-trigger" @click="openSearchBar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <span>Search food database</span>
      </button>
      <button class="nt-barcode-btn" @click="openBarcodeScanner">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3h-3"/><path d="M14 20h3"/><path d="M20 20h0"/></svg>
      </button>
    </div>

    <!-- Barcode Scanner -->
    <BarcodeScannerModal
      v-if="showScanner"
      @detected="onBarcodeDetected"
      @close="showScanner = false"
    />

    <!-- Food Search Modal -->
    <NutritionFoodSearch
      v-if="showFoodSearch"
      :hour="selectedHour"
      :date="selectedDate"
      :exact-time="exactTime"
      @close="showFoodSearch = false"
      @select-food="onFoodSelected"
      @open-scanner="handleOpenScannerFromSearch"
    />

    <!-- Food Detail / Serving Modal -->
    <FoodDetailModal
      v-if="selectedFood"
      :food="selectedFood"
      :hour="selectedHour"
      :date="selectedDate"
      :exact-time="exactTime"
      :edit-log="editLog"
      @close="selectedFood = null; editLog = null"
      @added="onFoodAdded"
    />

    <!-- Scanner loading overlay -->
    <div v-if="scannerLoading" class="nt-scan-loading">
      <div class="nt-scan-spinner"></div>
      <span>Looking up product...</span>
    </div>

    <!-- Detail loading overlay -->
    <div v-if="detailLoading" class="nt-scan-loading">
      <div class="nt-scan-spinner"></div>
      <span>Loading nutrition details...</span>
    </div>

    <!-- Scan error toast -->
    <transition name="nt-toast">
      <div v-if="scanError" class="nt-scan-toast">{{ scanError }}</div>
    </transition>

    <!-- Settings Modal -->
    <NutritionSettings
      v-if="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:ital,wght@0,400;0,600;0,700;1,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');

.nt-page {
  min-height: 100vh;
  background: #0e0e0e;
  padding: max(24px, calc(12px + env(safe-area-inset-top))) 0 0;
  padding-bottom: calc(180px + env(safe-area-inset-bottom));
  position: relative;
  overflow-x: hidden;
}


.nt-container {
  max-width: 680px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* Header */
.nt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 16px;
}
.nt-header-left { display: flex; flex-direction: column; gap: 4px; }
.nt-title {
  font-family: 'Space Grotesk', sans-serif; 
  font-size: 2.2rem; 
  font-weight: 700;
  font-style: italic;
  letter-spacing: -0.02em;
  color: #fff; 
  margin: 0; 
  line-height: 1.1;
  text-transform: uppercase;
}
.nt-date-sub {
  font-size: 0.75rem; color: #DFFF00;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.nt-header-actions { display: flex; gap: 8px; }
.nt-icon-btn {
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  display: flex; align-items: center; justify-content: center;
  color: #fff; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.nt-icon-btn:hover { background: rgba(255,255,255,0.12); color: #DFFF00; transform: scale(1.05); border-color: rgba(223, 255, 0, 0.3); box-shadow: 0 6px 16px rgba(0,0,0,0.4); }
.nt-icon-btn:active { transform: scale(0.92); }

/* Date Carousel */
.nt-date-carousel-wrapper {
  margin: 0 0 16px 0;
  position: relative;
}
.nt-date-carousel-wrapper::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to left, #0e0e0e, transparent);
  pointer-events: none;
  z-index: 2;
}
.nt-date-carousel-wrapper::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to right, #0e0e0e, transparent);
  pointer-events: none;
  z-index: 2;
}

.nt-date-carousel {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 20px; /* added vertical padding to prevent clipping of scaled items */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.nt-date-carousel::-webkit-scrollbar {
  display: none;
}

.nt-day-cell {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  padding: 12px 6px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04);
  background: rgba(255,255,255,0.03); color: #888888; cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); min-width: 56px; position: relative;
  flex-shrink: 0;
}
.nt-day-cell:hover:not(.nt-day-selected) { 
  background: rgba(255,255,255,0.08); color: #ffffff; 
  transform: translateY(-2px); border-color: rgba(255,255,255,0.12); 
}
.nt-day-selected {
  border-color: #DFFF00; /* Crisp solid neon green border */
  background: rgba(223, 255, 0, 0.05); /* Very subtle tint, no glow */
  color: #fff; transform: translateY(-2px) scale(1.05); 
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5); /* Deep dark shadow instead of radiant glow */
  z-index: 10; /* Ensure it stays above siblings */
}
.nt-day-num {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 1.3rem; line-height: 1;
}
.nt-day-label {
  font-family: 'Space Grotesk', sans-serif; font-weight: 600;
  font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase;
}
.nt-today-dot {
  width: 5px; height: 5px; border-radius: 50%; background: #DFFF00;
  position: absolute; bottom: 6px;
  /* Removed radiant glow box-shadow */
}

/* Macro Summary Hero */
.nt-macro-hero {
  background: #1e1e1e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  margin: 0 20px 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 20px rgba(223, 255, 0, 0.03);
}
.nt-macro-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.nt-cal-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nt-cal-title {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.7rem;
  font-weight: 700; color: #adaaaa; letter-spacing: 0.15em; text-transform: uppercase;
}
.nt-cal-value {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 2.2rem; color: #fff; line-height: 1; letter-spacing: -0.02em;
}
.nt-cal-target {
  font-size: 0.8rem; color: #777575; font-weight: 500; font-family: 'Space Grotesk', sans-serif;
}
.nt-cal-progress-ring {
  position: relative;
  width: 70px; height: 70px;
  display: flex; align-items: center; justify-content: center;
}
.nt-ring-svg { transform: rotate(-90deg); width: 70px; height: 70px; }
.nt-ring-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 6; }
.nt-ring-fill { fill: none; stroke: #DFFF00; stroke-width: 6; stroke-linecap: round; transition: stroke-dasharray 1s ease-out; }
.nt-ring-icon {
  position: absolute;
  font-size: 1.2rem;
}

.nt-macro-bars {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
}
.nt-macro-item { display: flex; flex-direction: column; gap: 6px; }
.nt-macro-header {
  display: flex; justify-content: space-between; align-items: flex-end;
}
.nt-macro-label {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.65rem;
  font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.7);
}
.nt-macro-val {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.7rem; font-weight: 700; color: #fff;
}
.nt-macro-target {
  color: #777575; font-weight: 500; font-size: 0.6rem;
}
.nt-progress {
  height: 6px; background: rgba(255,255,255,0.05);
  border-radius: 10px; overflow: hidden;
}
.nt-progress-fill {
  height: 100%; border-radius: 10px;
  transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
}
.nt-fill-protein { background: #3B82F6; box-shadow: 0 0 8px rgba(59,130,246,0.5); }
.nt-fill-fat { background: #DFFF00; box-shadow: 0 0 8px rgba(223,255,0,0.4); }
.nt-fill-carbs { background: #F97316; box-shadow: 0 0 8px rgba(249,115,22,0.5); }

/* Timeline */
.nt-timeline { padding: 0 20px 40px; }
.nt-hour-block { position: relative; padding-left: 12px; margin-bottom: 2px; transition: all 0.2s; border-radius: 12px; border: 1px dashed transparent; }
.nt-hour-block:hover { background: rgba(255,255,255,0.02); }
.nt-hour-block.nt-drag-hover {
  background: rgba(223, 255, 0, 0.08);
  border-color: rgba(223, 255, 0, 0.3);
  transform: scale(1.01);
  z-index: 10;
}
.nt-hour-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; position: relative; z-index: 1;
}
.nt-hour-left { display: flex; align-items: center; gap: 14px; }
.nt-timeline-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #1a1919; border: 2px solid rgba(255,255,255,0.2);
  flex-shrink: 0; position: absolute; left: -5px; z-index: 2;
}
.nt-hour-block.has-logs .nt-timeline-dot {
  border-color: #DFFF00; background: rgba(223,255,0,0.2); box-shadow: 0 0 8px rgba(223,255,0,0.4);
}
.nt-hour-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 12px; border-radius: 100px;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
  color: #ffffff; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.nt-hour-pill:hover { background: rgba(255,255,255,0.12); border-color: rgba(223, 255, 0, 0.4); color: #DFFF00; transform: translateX(4px); box-shadow: 0 4px 12px rgba(223, 255, 0, 0.15); }
.nt-hour-text { font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; }
.nt-hour-plus {
  font-size: 1.1rem; font-weight: 700; color: #DFFF00;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  line-height: 1;
}
.nt-hour-pill:hover .nt-hour-plus { color: #fff; transform: scale(1.1); }

/* Hour macros badges */
.nt-hour-macros { display: flex; gap: 6px; flex-wrap: wrap; }
.nt-hm-badge {
  padding: 4px 8px; border-radius: 6px; font-size: 0.65rem;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; letter-spacing: 0.05em;
  background: rgba(255,255,255,0.08); color: #dddddd;
  border: 1px solid rgba(255,255,255,0.05);
}

/* Food entry */
.nt-food-entry {
  display: flex; gap: 12px; padding: 4px 0 12px 24px;
  position: relative; z-index: 1;
}
.nt-food-time {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.7rem; font-weight: 600;
  color: #777575; min-width: 48px; padding-top: 6px;
  text-align: right;
}
.nt-food-card {
  flex: 1; display: flex; align-items: flex-start; justify-content: space-between;
  background: #1e1e1e; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; padding: 14px 16px; position: relative;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  transition: transform 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.nt-food-card:hover { background: #252525; transform: translateY(-2px); border-color: rgba(255,255,255,0.15); box-shadow: 0 8px 24px rgba(0,0,0,0.5); }

.nt-food-entry[draggable="true"] {
  cursor: grab;
}
.nt-food-entry[draggable="true"]:active {
  cursor: grabbing;
}
.nt-food-entry.is-dragging {
  opacity: 0.4;
  transform: scale(0.98);
}
.nt-card-main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nt-drag-handle {
  color: rgba(255,255,255,0.2);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}
.nt-food-card:hover .nt-drag-handle {
  color: rgba(255,255,255,0.5);
}
.nt-drag-handle:hover {
  color: #DFFF00 !important;
}
.nt-drag-handle:active {
  cursor: grabbing;
}

.nt-food-info { display: flex; flex-direction: column; gap: 6px; }
.nt-food-name {
  font-family: 'Outfit', sans-serif; font-weight: 600;
  font-size: 1rem; color: #fff;
}
.nt-food-macros { display: flex; gap: 10px; flex-wrap: wrap; }
.nt-fm {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.7rem;
  font-weight: 700; color: rgba(255,255,255,0.5);
}
.nt-fm-cal { color: #fff; }
.nt-fm-p { color: #3B82F6; }
.nt-fm-f { color: #DFFF00; }
.nt-fm-c { color: #F97316; }

.nt-food-menu {
  background: none; border: none; color: #777575;
  font-size: 1.2rem; cursor: pointer; padding: 4px 6px; border-radius: 8px;
  transition: all 0.2s;
}
.nt-food-menu:hover { background: rgba(255,255,255,0.08); color: #fff; }
.nt-food-dropdown {
  position: absolute; top: 36px; right: 8px;
  background: #2a2a2a; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 6px; z-index: 20; min-width: 120px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.6);
}
.nt-food-drop-item {
  width: 100%; padding: 10px 14px; border: none; border-radius: 8px;
  background: none; color: #fff; font-size: 0.85rem; font-weight: 600;
  cursor: pointer; text-align: left; font-family: 'Space Grotesk', sans-serif;
  transition: background 0.15s;
}
.nt-food-drop-item:hover { background: rgba(255,255,255,0.08); }
.nt-drop-del { color: #ff7043; }
.nt-drop-del:hover { background: rgba(255,112,67,0.15); }

/* Timeline connector */
.nt-timeline-line {
  position: absolute; left: 0; top: 24px; bottom: -16px;
  width: 2px; background: rgba(255,255,255,0.04);
}

/* Bottom Bar */
.nt-bottom-bar {
  position: fixed; bottom: 0;
  left: 0; right: 0; padding: 32px 20px calc(96px + env(safe-area-inset-bottom));
  display: flex; gap: 12px; z-index: 50;
  background: linear-gradient(to top, #0e0e0e 80%, transparent);
  max-width: 680px; margin: 0 auto;
  pointer-events: none;
}
.nt-search-trigger {
  pointer-events: auto;
  flex: 1; display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-radius: 16px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #adaaaa; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: 'Space Grotesk', sans-serif; font-size: 0.9rem; font-weight: 600;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
.nt-search-trigger:hover { 
  background: rgba(255,255,255,0.08); 
  border-color: rgba(223, 255, 0, 0.3); 
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.nt-search-trigger svg { color: #DFFF00; }

.nt-barcode-btn {
  pointer-events: auto;
  width: 52px; height: 52px; border-radius: 16px;
  background: #DFFF00; border: none;
  color: #0e0e0e; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(223, 255, 0, 0.2);
}
.nt-barcode-btn:hover { 
  transform: translateY(-2px) scale(1.05); 
  box-shadow: 0 8px 24px rgba(223, 255, 0, 0.3); 
}

@media (max-width: 768px) {
  .nt-macro-hero { padding: 20px; margin: 0 16px 20px; }
  .nt-cal-value { font-size: 1.8rem; }
  .nt-ring-svg { width: 60px; height: 60px; }
  .nt-cal-progress-ring { width: 60px; height: 60px; }
}

/* Scanner loading overlay */
.nt-scan-loading {
  position: fixed; inset: 0; z-index: 5500;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
}
.nt-scan-spinner {
  width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #DFFF00; border-radius: 50%;
  animation: nt-spin 0.6s linear infinite;
}
@keyframes nt-spin { to { transform: rotate(360deg); } }
.nt-scan-loading span {
  font-family: 'Space Grotesk', sans-serif; font-weight: 600;
  font-size: 0.9rem; color: rgba(255,255,255,0.6);
}

/* Scan error toast */
.nt-scan-toast {
  position: fixed; bottom: calc(160px + env(safe-area-inset-bottom));
  left: 50%; transform: translateX(-50%);
  padding: 12px 24px; border-radius: 14px; z-index: 7000;
  background: rgba(255,112,67,0.15); border: 1px solid rgba(255,112,67,0.3);
  color: #ff7043; font-family: 'Space Grotesk', sans-serif;
  font-weight: 700; font-size: 0.85rem; white-space: nowrap;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.nt-toast-enter-active { animation: nt-toast-in 0.3s ease forwards; }
.nt-toast-leave-active { animation: nt-toast-out 0.3s ease forwards; }
@keyframes nt-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
@keyframes nt-toast-out { from { opacity: 1; } to { opacity: 0; transform: translateX(-50%) translateY(10px); } }

/* Animations */
.animate-in { animation: nt-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes nt-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
