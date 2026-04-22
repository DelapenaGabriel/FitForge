<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useNutritionStore } from '@/stores/nutrition'

const props = defineProps({ hour: Number, date: Date })
const emit = defineEmits(['close'])
const nutrition = useNutritionStore()

const searchQuery = ref('')
const activeTab = ref('search')
const addedItems = ref([])
const showBarcode = ref(false)
const barcodeInput = ref('')
const barcodeResult = ref(null)
const barcodeLoading = ref(false)

let debounceTimer = null

const allResults = computed(() => {
  const custom = nutrition.customFoods || []
  const usda = nutrition.searchResults || []
  const seen = new Set()
  const merged = []
  custom.forEach(f => { const k = f.food_name.toLowerCase(); if (!seen.has(k)) { seen.add(k); merged.push(f) } })
  usda.forEach(f => { const k = f.food_name.toLowerCase(); if (!seen.has(k)) { seen.add(k); merged.push(f) } })
  return merged
})

const displayResults = ref(8)
const visibleResults = computed(() => allResults.value.slice(0, displayResults.value))
const hasMore = computed(() => allResults.value.length > displayResults.value)

function showMore() { displayResults.value += 10 }

watch(searchQuery, (q) => {
  clearTimeout(debounceTimer)
  displayResults.value = 8
  if (!q || q.length < 2) { nutrition.searchResults = []; nutrition.customFoods = []; return }
  debounceTimer = setTimeout(() => {
    nutrition.searchUSDA(q)
    nutrition.searchCustomFoods(q)
  }, 400)
})

function formatDateTime() {
  const d = new Date(props.date)
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  const h = props.hour
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${month} ${day} | ${hour}:00 ${ampm}`
}

function addItem(food) {
  addedItems.value.push({ ...food })
}

function removeItem(idx) {
  addedItems.value.splice(idx, 1)
}

async function logAllFood() {
  const d = new Date(props.date)
  for (const item of addedItems.value) {
    const logTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), props.hour, 0, 0)
    await nutrition.addFoodLog(item, logTime)
  }
  addedItems.value = []
  emit('close')
}

async function handleBarcodeLookup() {
  if (!barcodeInput.value) return
  barcodeLoading.value = true
  barcodeResult.value = null
  const result = await nutrition.searchBarcode(barcodeInput.value)
  barcodeResult.value = result
  barcodeLoading.value = false
}

onMounted(() => { nutrition.fetchRecentFoods() })
</script>

<template>
  <div class="nfs-overlay" @click.self="emit('close')">
    <div class="nfs-modal">
      <!-- Top Bar -->
      <div class="nfs-top">
        <button class="nfs-back" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div class="nfs-tabs">
          <button :class="['nfs-tab', activeTab==='search' && 'nfs-tab-active']" @click="activeTab='search'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          <button :class="['nfs-tab', activeTab==='barcode' && 'nfs-tab-active']" @click="activeTab='barcode'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3"/></svg>
          </button>
        </div>
      </div>

      <!-- Header -->
      <div class="nfs-header">
        <h2 class="nfs-title">All Foods</h2>
        <span class="nfs-datetime">{{ formatDateTime() }}</span>
      </div>

      <!-- Search Tab -->
      <div v-if="activeTab==='search'" class="nfs-content">
        <div class="nfs-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input v-model="searchQuery" type="text" placeholder="Search" class="nfs-search-input" autofocus />
        </div>

        <!-- Loading -->
        <div v-if="nutrition.searchLoading" class="nfs-loading">
          <div class="nfs-spinner"></div>
          <span>Searching...</span>
        </div>

        <!-- Results -->
        <div v-if="visibleResults.length" class="nfs-results">
          <div v-for="food in visibleResults" :key="food.food_name + food.brand" class="nfs-food-card">
            <div class="nfs-food-info">
              <span class="nfs-food-name">{{ food.food_name }}</span>
              <span v-if="food.brand" class="nfs-food-brand">{{ food.brand }}</span>
              <div class="nfs-food-macros">
                <span class="nfs-fm nfs-fm-cal">🔥 {{ food.calories }}</span>
                <span class="nfs-fm nfs-fm-p">P {{ food.protein_g }}</span>
                <span class="nfs-fm nfs-fm-f">F {{ food.fat_g }}</span>
                <span class="nfs-fm nfs-fm-c">C {{ food.carbs_g }}</span>
                <span v-if="food.serving_size" class="nfs-fm nfs-fm-s">⚖ {{ food.serving_size }}</span>
              </div>
            </div>
            <button class="nfs-add-btn" @click="addItem(food)">+</button>
          </div>
          <button v-if="hasMore" class="nfs-show-more" @click="showMore">Show more ({{ allResults.length - displayResults }})</button>
        </div>

        <!-- Recent History -->
        <div v-if="!searchQuery && nutrition.recentFoods.length" class="nfs-section">
          <h3 class="nfs-section-title">Recent History</h3>
          <div v-for="food in nutrition.recentFoods" :key="'r-'+food.food_name" class="nfs-food-card">
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
            <button class="nfs-add-btn" @click="addItem(food)">+</button>
          </div>
        </div>
      </div>

      <!-- Barcode Tab -->
      <div v-if="activeTab==='barcode'" class="nfs-content">
        <div class="nfs-barcode-section">
          <p class="nfs-barcode-desc">Enter a UPC/EAN barcode number to look up nutrition info.</p>
          <div class="nfs-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <input v-model="barcodeInput" type="text" placeholder="Enter barcode..." class="nfs-search-input" @keyup.enter="handleBarcodeLookup" />
            <button class="nfs-barcode-go" @click="handleBarcodeLookup">Go</button>
          </div>
          <div v-if="barcodeLoading" class="nfs-loading"><div class="nfs-spinner"></div><span>Looking up...</span></div>
          <div v-if="barcodeResult" class="nfs-food-card" style="margin-top:12px">
            <div class="nfs-food-info">
              <span class="nfs-food-name">{{ barcodeResult.food_name }}</span>
              <span v-if="barcodeResult.brand" class="nfs-food-brand">{{ barcodeResult.brand }}</span>
              <div class="nfs-food-macros">
                <span class="nfs-fm nfs-fm-cal">🔥 {{ barcodeResult.calories }}</span>
                <span class="nfs-fm nfs-fm-p">P {{ barcodeResult.protein_g }}</span>
                <span class="nfs-fm nfs-fm-f">F {{ barcodeResult.fat_g }}</span>
                <span class="nfs-fm nfs-fm-c">C {{ barcodeResult.carbs_g }}</span>
              </div>
            </div>
            <button class="nfs-add-btn" @click="addItem(barcodeResult)">+</button>
          </div>
          <div v-if="barcodeResult === null && !barcodeLoading && barcodeInput" class="nfs-no-result">
            No product found for this barcode.
          </div>
        </div>
      </div>

      <!-- Bottom Action Bar -->
      <div class="nfs-bottom-bar">
        <div class="nfs-bottom-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <span>{{ addedItems.length }} item{{ addedItems.length !== 1 ? 's' : '' }} added</span>
        </div>
        <button class="nfs-log-btn" :disabled="!addedItems.length" @click="logAllFood">Log Food</button>
      </div>
    </div>
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
  background: #0a0a0a; max-width: 500px; width: 100%;
  margin: 0 auto; overflow: hidden;
}
.nfs-top {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.nfs-back {
  background: none; border: none; color: rgba(255,255,255,0.5);
  cursor: pointer; padding: 6px; border-radius: 8px; transition: all 0.2s;
}
.nfs-back:hover { color: #fff; background: rgba(255,255,255,0.06); }
.nfs-tabs { display: flex; gap: 4px; margin: 0 auto; }
.nfs-tab {
  width: 38px; height: 38px; border-radius: 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.nfs-tab:hover { background: rgba(255,255,255,0.08); }
.nfs-tab-active { background: rgba(217,255,77,0.1); border-color: rgba(217,255,77,0.3); color: #DFFF00; }
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
.nfs-content { flex: 1; overflow-y: auto; padding: 8px 16px 100px; }
.nfs-search-wrap {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.3); margin-bottom: 12px;
}
.nfs-search-input {
  flex: 1; background: none; border: none; outline: none;
  color: #fff; font-family: 'Space Grotesk', sans-serif; font-size: 0.9rem;
}
.nfs-search-input::placeholder { color: rgba(255,255,255,0.25); }
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
.nfs-results { display: flex; flex-direction: column; gap: 2px; }
.nfs-food-card {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 14px 16px; border-radius: 14px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);
  transition: background 0.2s;
}
.nfs-food-card:hover { background: rgba(255,255,255,0.04); }
.nfs-food-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.nfs-food-name {
  font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 0.88rem;
  color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
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
.nfs-add-btn {
  width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); font-size: 1.1rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.nfs-add-btn:hover { background: rgba(217,255,77,0.1); border-color: rgba(217,255,77,0.3); color: #DFFF00; }
.nfs-show-more {
  background: none; border: none; color: #3B82F6;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.85rem;
  padding: 12px; cursor: pointer; text-align: center;
}
.nfs-show-more:hover { color: #60A5FA; }
.nfs-section { margin-top: 20px; }
.nfs-section-title {
  font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem;
  color: #fff; margin: 0 0 8px;
}
.nfs-barcode-section { padding: 8px 0; }
.nfs-barcode-desc {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem;
  color: rgba(255,255,255,0.4); margin-bottom: 12px;
}
.nfs-barcode-go {
  padding: 6px 16px; border-radius: 10px;
  background: rgba(217,255,77,0.12); border: 1px solid rgba(217,255,77,0.3);
  color: #DFFF00; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 0.8rem; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
}
.nfs-barcode-go:hover { background: rgba(217,255,77,0.2); }
.nfs-no-result {
  padding: 20px; text-align: center;
  color: rgba(255,255,255,0.3); font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem;
}
.nfs-bottom-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; background: rgba(10,10,10,0.95); backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255,255,255,0.06);
}
.nfs-bottom-left {
  display: flex; align-items: center; gap: 8px;
  color: rgba(255,255,255,0.5); font-family: 'Space Grotesk', sans-serif;
  font-size: 0.82rem; font-weight: 600;
}
.nfs-log-btn {
  padding: 10px 24px; border-radius: 14px;
  background: linear-gradient(135deg, #d9ff4d, #a8cf2b); border: none;
  color: #000; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
}
.nfs-log-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(217,255,77,0.3); }
.nfs-log-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
</style>
