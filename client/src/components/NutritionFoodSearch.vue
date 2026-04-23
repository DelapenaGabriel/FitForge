<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useNutritionStore } from '@/stores/nutrition'

const props = defineProps({ hour: Number, date: Date })
const emit = defineEmits(['close', 'select-food', 'open-scanner'])
const nutrition = useNutritionStore()

import CustomFoodModal from './CustomFoodModal.vue'

const searchQuery = ref('')
const activeTab = ref('search')
const showCustomModal = ref(false)

let debounceTimer = null

// Merge USDA + OFF + FatSecret + custom results, deduplicated
const allResults = computed(() => {
  const custom = nutrition.customFoods || []
  const usda = nutrition.searchResults || []
  const off = nutrition.offResults || []
  const fatsecret = nutrition.fatSecretResults || []
  const seen = new Set()
  const merged = []
  // Custom first, then FatSecret, then OFF (branded), then USDA
  custom.forEach(f => {
    const k = (f.food_name || '').toLowerCase()
    if (k && !seen.has(k)) { seen.add(k); merged.push(f) }
  })
  fatsecret.forEach(f => {
    const k = (f.food_name || '').toLowerCase()
    if (k && !seen.has(k)) { seen.add(k); merged.push(f) }
  })
  off.forEach(f => {
    const k = (f.food_name || '').toLowerCase()
    if (k && !seen.has(k)) { seen.add(k); merged.push(f) }
  })
  usda.forEach(f => {
    const k = (f.food_name || '').toLowerCase()
    if (k && !seen.has(k)) { seen.add(k); merged.push(f) }
  })
  return merged
})

const displayResults = ref(10)
const visibleResults = computed(() => allResults.value.slice(0, displayResults.value))
const hasMore = computed(() => allResults.value.length > displayResults.value)

function showMore() { displayResults.value += 10 }

watch(searchQuery, (q) => {
  clearTimeout(debounceTimer)
  displayResults.value = 10
  if (!q || q.length < 2) {
    nutrition.searchResults = []
    nutrition.offResults = []
    nutrition.customFoods = []
    nutrition.fatSecretResults = []
    return
  }
  debounceTimer = setTimeout(() => {
    nutrition.searchFatSecret(q)
    nutrition.searchUSDA(q)
    nutrition.searchOpenFoodFacts(q)
    nutrition.searchCustomFoods(q)
  }, 400)
}, { immediate: true })

function formatDateTime() {
  const d = new Date(props.date)
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  const now = new Date()
  let dateObj = new Date(d)
  dateObj.setHours(props.hour)
  if (d.toDateString() === now.toDateString() && props.hour === now.getHours()) {
    dateObj.setMinutes(now.getMinutes())
  } else {
    dateObj.setMinutes(0)
  }
  const timeStr = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${month} ${day} | ${timeStr}`
}

function selectFood(food) {
  emit('select-food', food)
}

function getSourceBadge(source) {
  if (source === 'fatsecret') return 'FatSecret'
  if (source === 'openfoodfacts') return 'OFF'
  if (source === 'usda') return 'USDA'
  if (source === 'custom') return '★'
  if (source === 'recent') return '⏱'
  return ''
}

onMounted(() => { nutrition.fetchRecentFoods() })

async function handleSaveCustomFood(payload) {
  const newFood = await nutrition.createCustomFood(payload)
  showCustomModal.value = false
  if (newFood) {
    selectFood(newFood)
  }
}
</script>

<template>
  <div class="nfs-overlay" @click.self="emit('close')">
    <div class="nfs-modal">
      <!-- Top Bar -->
      <div class="nfs-top">
        <button class="nfs-back" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span class="nfs-top-title">Add Food</span>
        <button class="nfs-top-create" @click="showCustomModal = true">
          + Custom
        </button>
      </div>

      <!-- Header -->
      <div class="nfs-header">
        <h2 class="nfs-title">All Foods</h2>
        <span class="nfs-datetime">{{ formatDateTime() }}</span>
      </div>

      <!-- Search Content -->
      <div class="nfs-content">
        <div class="nfs-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input v-model="searchQuery" type="text" placeholder="Search brands, foods..." class="nfs-search-input" autofocus />
          <button v-if="searchQuery" class="nfs-clear-btn" @click="searchQuery = ''">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <button class="nfs-barcode-btn" @click="emit('open-scanner')" title="Scan Barcode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3h-3"/><path d="M14 20h3"/><path d="M20 20h0"/></svg>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="nutrition.searchLoading" class="nfs-loading">
          <div class="nfs-spinner"></div>
          <span>Searching databases...</span>
        </div>

        <!-- Results -->
        <div v-if="searchQuery && searchQuery.length >= 2 && visibleResults.length" class="nfs-results">
          <div v-for="food in visibleResults" :key="food.food_name + food.brand + food.source" class="nfs-food-card" @click="selectFood(food)">
            <div class="nfs-food-info">
              <div class="nfs-food-top-row">
                <span class="nfs-food-name">{{ food.food_name }}</span>
                <span v-if="getSourceBadge(food.source)" :class="['nfs-source-badge', 'nfs-src-' + food.source]">{{ getSourceBadge(food.source) }}</span>
              </div>
              <span v-if="food.brand" class="nfs-food-brand">{{ food.brand }}</span>
              <div class="nfs-food-macros">
                <span class="nfs-fm nfs-fm-cal">🔥 {{ food.calories }}</span>
                <span class="nfs-fm nfs-fm-p">P {{ food.protein_g }}</span>
                <span class="nfs-fm nfs-fm-f">F {{ food.fat_g }}</span>
                <span class="nfs-fm nfs-fm-c">C {{ food.carbs_g }}</span>
                <span v-if="food.serving_size" class="nfs-fm nfs-fm-s">⚖ {{ food.serving_size }}</span>
              </div>
            </div>
            <div class="nfs-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
          <button v-if="hasMore" class="nfs-show-more" @click="showMore">Show more ({{ allResults.length - displayResults }})</button>
        </div>

        <!-- No results -->
        <div v-if="searchQuery && searchQuery.length >= 2 && !nutrition.searchLoading && !visibleResults.length" class="nfs-no-result">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span>No foods found for "{{ searchQuery }}"</span>
        </div>

        <!-- Recent History -->
        <div v-if="!searchQuery && nutrition.recentFoods.length" class="nfs-section">
          <div class="nfs-section-header">
            <h3 class="nfs-section-title">Recent History</h3>
            <button class="nfs-clear-history-btn" @click="nutrition.clearRecentFoods()">
              Clear
            </button>
          </div>
          <div class="nfs-results">
            <div v-for="food in nutrition.recentFoods" :key="'r-'+food.food_name" class="nfs-food-card" @click="selectFood(food)">
              <div class="nfs-food-info">
                <span class="nfs-food-name">{{ food.food_name }}</span>
                <span v-if="food.brand" class="nfs-food-brand">{{ food.brand }}</span>
                <div class="nfs-food-macros">
                  <span class="nfs-fm nfs-fm-cal">🔥 {{ food.calories }}</span>
                  <span class="nfs-fm nfs-fm-p">P {{ Math.round(food.protein_g) }}</span>
                  <span class="nfs-fm nfs-fm-f">F {{ Math.round(food.fat_g) }}</span>
                  <span class="nfs-fm nfs-fm-c">C {{ Math.round(food.carbs_g) }}</span>
                </div>
              </div>
              <div class="nfs-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state when no search and no recents -->
        <div v-if="!searchQuery && !nutrition.recentFoods.length" class="nfs-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span>Search thousands of foods & brands</span>
          <span class="nfs-empty-sub">Kroger, Great Value, Walmart, & more</span>
        </div>
      </div>
    </div>
    
    <CustomFoodModal 
      v-if="showCustomModal" 
      @close="showCustomModal = false"
      @save="handleSaveCustomFood"
    />
  </div>
</template>

<style scoped>
.nfs-overlay {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
  display: flex; flex-direction: column;
}
.nfs-modal {
  flex: 1; display: flex; flex-direction: column;
  background: #0a0a0a; max-width: 680px; width: 100%;
  margin: 0 auto; overflow: hidden;
  position: relative;
  animation: nfs-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes nfs-slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.nfs-top {
  display: flex; align-items: center; justify-content: space-between;
  padding: calc(12px + env(safe-area-inset-top)) 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  position: relative;
}
.nfs-back {
  background: none; border: none; color: rgba(255,255,255,0.5);
  cursor: pointer; padding: 6px; border-radius: 8px; transition: all 0.2s;
  position: relative; z-index: 2;
}
.nfs-back:hover { color: #fff; background: rgba(255,255,255,0.06); }
.nfs-top-title {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 1rem; color: rgba(255,255,255,0.8); letter-spacing: -0.01em;
  position: absolute; left: 50%; transform: translateX(-50%);
  z-index: 1;
}
.nfs-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 8px;
}
.nfs-title { font-family: 'Outfit', sans-serif; font-size: 1.3rem; font-weight: 700; color: #fff; margin: 0; }
.nfs-datetime {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.7rem; font-weight: 600;
  padding: 5px 12px; border-radius: 20px;
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);
}
.nfs-content { flex: 1; overflow-y: auto; padding: 8px 16px calc(40px + env(safe-area-inset-bottom)); -webkit-overflow-scrolling: touch; }
.nfs-search-wrap {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.3); margin-bottom: 12px;
  transition: border-color 0.2s;
}
.nfs-search-wrap:focus-within { border-color: rgba(223,255,0,0.3); }
.nfs-search-input {
  flex: 1; background: none; border: none; outline: none;
  color: #fff; font-family: 'Space Grotesk', sans-serif; font-size: 0.9rem;
}
.nfs-search-input::placeholder { color: rgba(255,255,255,0.25); }
.nfs-clear-btn {
  background: rgba(255,255,255,0.08); border: none; border-radius: 50%;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s;
}
.nfs-clear-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

.nfs-barcode-btn {
  background: rgba(223, 255, 0, 0.1); border: 1px solid rgba(223, 255, 0, 0.2);
  border-radius: 8px; width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  color: #DFFF00; cursor: pointer; transition: all 0.2s;
  flex-shrink: 0; padding: 0;
}
.nfs-barcode-btn:hover { background: rgba(223, 255, 0, 0.2); transform: scale(1.05); }

.nfs-loading {
  display: flex; align-items: center; gap: 10px; padding: 20px;
  color: rgba(255,255,255,0.4); font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem;
}
.nfs-spinner {
  width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.1);
  border-top-color: #DFFF00; border-radius: 50%;
  animation: nfs-spin 0.6s linear infinite;
}
@keyframes nfs-spin { to { transform: rotate(360deg); } }
.nfs-results { display: flex; flex-direction: column; gap: 8px; }
.nfs-food-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-radius: 14px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);
  transition: all 0.2s; cursor: pointer;
}
.nfs-food-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08); }
.nfs-food-card:active { transform: scale(0.98); }
.nfs-food-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.nfs-food-top-row { display: flex; align-items: center; gap: 8px; }
.nfs-food-name {
  font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 0.88rem;
  color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.nfs-source-badge {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.55rem; font-weight: 700;
  padding: 2px 6px; border-radius: 6px; flex-shrink: 0; letter-spacing: 0.05em;
}
.nfs-src-openfoodfacts { background: rgba(46,204,113,0.12); color: #2ecc71; }
.nfs-src-usda { background: rgba(59,130,246,0.12); color: #3B82F6; }
.nfs-src-fatsecret { background: rgba(236,72,153,0.12); color: #EC4899; }
.nfs-src-custom { background: rgba(223,255,0,0.1); color: #DFFF00; }
.nfs-src-recent { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); }
.nfs-food-brand {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.68rem;
  color: rgba(255,255,255,0.35);
}
.nfs-food-macros { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.nfs-fm { font-family: 'Space Grotesk', sans-serif; font-size: 0.65rem; font-weight: 700; }
.nfs-fm-cal { color: rgba(255,255,255,0.6); }
.nfs-fm-p { color: #60A5FA; }
.nfs-fm-f { color: #DFFF00; }
.nfs-fm-c { color: #FB923C; }
.nfs-fm-s { color: rgba(255,255,255,0.3); }
.nfs-arrow {
  color: rgba(255,255,255,0.2); flex-shrink: 0; margin-left: 8px;
  transition: color 0.2s, transform 0.2s;
}
.nfs-food-card:hover .nfs-arrow { color: #DFFF00; transform: translateX(2px); }
.nfs-show-more {
  background: none; border: none; color: #3B82F6;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.85rem;
  padding: 12px; cursor: pointer; text-align: center;
}
.nfs-show-more:hover { color: #60A5FA; }
.nfs-section { margin-top: 20px; }
.nfs-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.nfs-section-title {
  font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem;
  color: #fff; margin: 0;
}
.nfs-clear-history-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.nfs-clear-history-btn:hover {
  background: rgba(255, 112, 67, 0.15);
  border-color: rgba(255, 112, 67, 0.3);
  color: #ff7043;
}
.nfs-no-result {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 40px 20px; text-align: center;
  color: rgba(255,255,255,0.3); font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem;
}
.nfs-empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 60px 20px; text-align: center;
}
.nfs-empty-state span {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.9rem;
  color: rgba(255,255,255,0.3); font-weight: 600;
}
.nfs-empty-sub {
  font-size: 0.75rem !important; color: rgba(255,255,255,0.15) !important;
  font-weight: 500 !important;
}

.nfs-top-create {
  background: rgba(223, 255, 0, 0.1); border: 1px solid rgba(223, 255, 0, 0.2);
  color: #DFFF00; font-family: 'Space Grotesk', sans-serif; font-weight: 600;
  font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
  padding: 6px 12px; border-radius: 8px;
  position: relative; z-index: 2;
}
.nfs-top-create:hover { 
  background: rgba(223, 255, 0, 0.15); 
  transform: translateY(-1px);
}
</style>
