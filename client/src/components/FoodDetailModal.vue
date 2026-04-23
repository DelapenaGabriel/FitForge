<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useNutritionStore } from '@/stores/nutrition'

const props = defineProps({
  food: { type: Object, required: true },
  hour: { type: Number, default: () => new Date().getHours() },
  date: { type: Date, default: () => new Date() }
})
const emit = defineEmits(['close', 'added'])
const nutrition = useNutritionStore()

const unit = ref('grams')
const quantity = ref(100)
const showSuccess = ref(false)
const nutrientMode = ref('g') // 'g' or '%'

// Drag-to-close state
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isDragging = ref(false)

// Parse grams from serving_size string
function parseGrams(str) {
  if (!str) return null
  const match = str.match(/([\d.]+)\s*g/i)
  return match ? parseFloat(match[1]) : null
}

const baseServingGrams = computed(() => {
  return props.food.serving_weight_g || parseGrams(props.food.serving_size) || 100
})

onMounted(() => {
  quantity.value = baseServingGrams.value
})

// Convert when switching units
watch(unit, (newU, oldU) => {
  if (oldU === 'grams' && newU === 'oz') {
    quantity.value = Math.round(quantity.value / 28.3495 * 10) / 10
  } else if (oldU === 'oz' && newU === 'grams') {
    quantity.value = Math.round(quantity.value * 28.3495)
  }
})

const quantityGrams = computed(() => {
  return unit.value === 'oz' ? quantity.value * 28.3495 : quantity.value
})

const scale = computed(() => {
  if (baseServingGrams.value <= 0) return 1
  return quantityGrams.value / baseServingGrams.value
})

const scaled = computed(() => ({
  calories: Math.round((props.food.calories || 0) * scale.value),
  protein_g: Math.round((props.food.protein_g || 0) * scale.value * 10) / 10,
  fat_g: Math.round((props.food.fat_g || 0) * scale.value * 10) / 10,
  carbs_g: Math.round((props.food.carbs_g || 0) * scale.value * 10) / 10,
  fiber_g: Math.round((props.food.fiber_g || 0) * scale.value * 10) / 10,
  sugars_g: Math.round((props.food.sugars_g || 0) * scale.value * 10) / 10,
  sodium_mg: Math.round((props.food.sodium_mg || 0) * scale.value),
  cholesterol_mg: Math.round((props.food.cholesterol_mg || 0) * scale.value),
}))

// Percentage of daily goals
const pct = computed(() => {
  const s = nutrition.settings
  return {
    calories: s.daily_calories ? Math.round(scaled.value.calories / s.daily_calories * 100) : 0,
    protein: s.protein_g ? Math.round(scaled.value.protein_g / s.protein_g * 100) : 0,
    fat: s.fat_g ? Math.round(scaled.value.fat_g / s.fat_g * 100) : 0,
    carbs: s.carbs_g ? Math.round(scaled.value.carbs_g / s.carbs_g * 100) : 0,
  }
})

// Ring dasharray (100-based)
function ringDash(pctVal) {
  return `${Math.min(pctVal, 100)} 100`
}

async function handleAdd() {
  const d = new Date(props.date)
  const logTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), props.hour, 0, 0)
  const foodPayload = {
    food_name: props.food.food_name,
    brand: props.food.brand || null,
    calories: scaled.value.calories,
    protein_g: scaled.value.protein_g,
    fat_g: scaled.value.fat_g,
    carbs_g: scaled.value.carbs_g,
    serving_size: `${quantity.value}${unit.value === 'oz' ? 'oz' : 'g'}`,
    serving_qty: quantity.value,
    source: props.food.source || 'manual',
    source_id: props.food.source_id || null
  }
  await nutrition.addFoodLog(foodPayload, logTime)
  showSuccess.value = true
  setTimeout(() => { emit('added') }, 600)
}

// Drag logic (matching CustomFoodModal style)
const handleTouchStart = (e) => {
  touchStartY.value = e.touches[0].clientY
  touchCurrentY.value = e.touches[0].clientY
  isDragging.value = true
}

const handleTouchMove = (e) => {
  if (!isDragging.value) return
  touchCurrentY.value = e.touches[0].clientY
}

const handleTouchEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false
  
  const deltaY = touchCurrentY.value - touchStartY.value
  if (deltaY > 80) { // Threshold to close
    emit('close')
  }
  
  touchStartY.value = 0
  touchCurrentY.value = 0
}

const modalStyle = computed(() => {
  if (!isDragging.value) return {}
  const delta = Math.max(0, touchCurrentY.value - touchStartY.value)
  if (delta === 0) return {}
  return {
    transform: `translateY(${delta}px)`,
    transition: 'none'
  }
})

// Nutrient rows
const nutrientRows = computed(() => {
  const rows = []
  if (props.food.fiber_g !== undefined || props.food.fiber_100g !== undefined) {
    rows.push({ label: 'Fiber', value: scaled.value.fiber_g, unit: 'g', dv: 28 })
  }
  if (props.food.sugars_g !== undefined || props.food.sugars_100g !== undefined) {
    rows.push({ label: 'Sugars', value: scaled.value.sugars_g, unit: 'g', dv: 50 })
  }
  if ((props.food.cholesterol_mg || 0) > 0 || (props.food.cholesterol_100g || 0) > 0) {
    rows.push({ label: 'Cholesterol', value: scaled.value.cholesterol_mg, unit: 'mg', dv: 300 })
  }
  if (props.food.sodium_mg !== undefined || props.food.sodium_100g !== undefined) {
    rows.push({ label: 'Sodium', value: scaled.value.sodium_mg, unit: 'mg', dv: 2300 })
  }
  return rows
})
</script>

<template>
  <transition name="fdm-overlay-fade" appear>
    <div class="fdm-overlay" @click.self="emit('close')">
      <transition name="fdm-modal-slide" appear>
        <div
          class="fdm-sheet"
          ref="sheetRef"
          :class="{ 'fdm-success': showSuccess }"
          :style="modalStyle"
        >
          <!-- Drag Header Area -->
          <div 
            class="fdm-header-drag"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
          >
            <div class="fdm-drag-handle"></div>
            <div class="fdm-header-info">
              <h2 class="fdm-food-name">{{ food.food_name }}</h2>
              <span v-if="food.brand" class="fdm-brand">{{ food.brand }}</span>
            </div>
          </div>

          <!-- Success overlay -->
          <div v-if="showSuccess" class="fdm-success-overlay">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DFFF00" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
            <span>Added!</span>
          </div>

          <div class="fdm-scroll" v-show="!showSuccess">
            <!-- Content (Header removed, now part of drag area) -->

            <!-- Macro Breakdown -->
            <div class="fdm-section">
              <h3 class="fdm-section-title">Macro Breakdown</h3>
              <div class="fdm-macros-grid">
                <!-- Calories -->
                <div class="fdm-macro-card">
                  <div class="fdm-ring-wrap fdm-ring-cal">
                    <svg viewBox="0 0 36 36" class="fdm-ring-svg">
                      <circle class="fdm-ring-bg" cx="18" cy="18" r="15.9" />
                      <circle class="fdm-ring-fill fdm-fill-cal" cx="18" cy="18" r="15.9" :stroke-dasharray="ringDash(pct.calories)" />
                    </svg>
                    <span class="fdm-ring-icon">🔥</span>
                  </div>
                  <span class="fdm-macro-val">{{ scaled.calories }}cal</span>
                  <span class="fdm-macro-pct">{{ pct.calories }}%</span>
                </div>
                <!-- Protein -->
                <div class="fdm-macro-card">
                  <div class="fdm-ring-wrap fdm-ring-pro">
                    <svg viewBox="0 0 36 36" class="fdm-ring-svg">
                      <circle class="fdm-ring-bg" cx="18" cy="18" r="15.9" />
                      <circle class="fdm-ring-fill fdm-fill-pro" cx="18" cy="18" r="15.9" :stroke-dasharray="ringDash(pct.protein)" />
                    </svg>
                    <span class="fdm-ring-letter">P</span>
                  </div>
                  <span class="fdm-macro-val">{{ scaled.protein_g }}g</span>
                  <span class="fdm-macro-pct">{{ pct.protein }}%</span>
                </div>
                <!-- Fat -->
                <div class="fdm-macro-card">
                  <div class="fdm-ring-wrap fdm-ring-fat">
                    <svg viewBox="0 0 36 36" class="fdm-ring-svg">
                      <circle class="fdm-ring-bg" cx="18" cy="18" r="15.9" />
                      <circle class="fdm-ring-fill fdm-fill-fat" cx="18" cy="18" r="15.9" :stroke-dasharray="ringDash(pct.fat)" />
                    </svg>
                    <span class="fdm-ring-letter">F</span>
                  </div>
                  <span class="fdm-macro-val">{{ scaled.fat_g }}g</span>
                  <span class="fdm-macro-pct">{{ pct.fat }}%</span>
                </div>
                <!-- Carbs -->
                <div class="fdm-macro-card">
                  <div class="fdm-ring-wrap fdm-ring-carb">
                    <svg viewBox="0 0 36 36" class="fdm-ring-svg">
                      <circle class="fdm-ring-bg" cx="18" cy="18" r="15.9" />
                      <circle class="fdm-ring-fill fdm-fill-carb" cx="18" cy="18" r="15.9" :stroke-dasharray="ringDash(pct.carbs)" />
                    </svg>
                    <span class="fdm-ring-letter">C</span>
                  </div>
                  <span class="fdm-macro-val">{{ scaled.carbs_g }}g</span>
                  <span class="fdm-macro-pct">{{ pct.carbs }}%</span>
                </div>
              </div>
            </div>

            <!-- Nutrients -->
            <div v-if="nutrientRows.length" class="fdm-section">
              <div class="fdm-nutrients-header">
                <h3 class="fdm-section-title">Nutrients</h3>
                <div class="fdm-nutrient-toggle">
                  <button :class="['fdm-nt-btn', nutrientMode==='g' && 'fdm-nt-active']" @click="nutrientMode='g'">g</button>
                  <button :class="['fdm-nt-btn', nutrientMode==='%' && 'fdm-nt-active']" @click="nutrientMode='%'">%</button>
                </div>
              </div>
              <div class="fdm-nutrient-list">
                <div v-for="row in nutrientRows" :key="row.label" class="fdm-nutrient-row">
                  <span class="fdm-nutrient-label">{{ row.label }}</span>
                  <span class="fdm-nutrient-dots"></span>
                  <span class="fdm-nutrient-val" v-if="nutrientMode==='g'">{{ row.value }} {{ row.unit }}</span>
                  <span class="fdm-nutrient-val" v-else>{{ row.dv ? Math.round(row.value / row.dv * 100) : 0 }}%</span>
                </div>
              </div>
            </div>

            <!-- Serving Info -->
            <div class="fdm-section fdm-serving-section">
              <div class="fdm-serving-info">
                <span class="fdm-serving-label">Serving: {{ food.serving_size || '100g' }}</span>
              </div>
              <div class="fdm-unit-toggle">
                <button :class="['fdm-unit-btn', unit==='oz' && 'fdm-unit-active']" @click="unit='oz'">Oz</button>
                <button :class="['fdm-unit-btn', unit==='grams' && 'fdm-unit-active']" @click="unit='grams'">grams</button>
              </div>
              <div class="fdm-qty-row">
                <input
                  v-model.number="quantity"
                  type="number"
                  class="fdm-qty-input"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                />
                <span class="fdm-qty-unit">{{ unit === 'oz' ? 'Oz' : 'g' }}</span>
                <button class="fdm-add-btn" @click="handleAdd">Add</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');

.fdm-overlay {
  position: fixed; inset: 0; z-index: 6000;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  display: flex; flex-direction: column; justify-content: flex-end;
}

/* Transitions */
.fdm-overlay-fade-enter-active,
.fdm-overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}
.fdm-overlay-fade-enter-from,
.fdm-overlay-fade-leave-to {
  opacity: 0;
}

.fdm-modal-slide-enter-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fdm-modal-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 1, 1);
}
.fdm-modal-slide-enter-from,
.fdm-modal-slide-leave-to {
  transform: translateY(100%);
}

.fdm-sheet {
  width: 100%; max-width: 680px; margin: 0 auto;
  max-height: calc(85vh - env(safe-area-inset-bottom));
  background: #111111;
  border-radius: 24px 24px 0 0;
  display: flex; flex-direction: column;
  overflow: hidden;
  position: relative;
  padding-bottom: env(safe-area-inset-bottom);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fdm-header-drag {
  width: 100%; padding: 16px 24px 20px; 
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  cursor: grab;
  touch-action: none;
  background: #111111; /* Keep handle area looking solid */
}
.fdm-header-drag:active { cursor: grabbing; }
.fdm-drag-handle {
  width: 48px; height: 5px; border-radius: 10px;
  background: rgba(255,255,255,0.2);
}

.fdm-scroll {
  flex: 1; overflow-y: auto; padding: 0 20px 24px;
  -webkit-overflow-scrolling: touch;
}

/* Success overlay */
.fdm-success-overlay {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px 0;
  animation: fdm-pop 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
}
.fdm-success-overlay span {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 1.2rem; color: #DFFF00;
}
@keyframes fdm-pop {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Content */
.fdm-header-info { flex: 1; min-width: 0; }
.fdm-food-name {
  font-family: 'Outfit', sans-serif; font-weight: 700;
  font-size: 1.4rem; color: #fff; margin: 0; line-height: 1.2;
}
.fdm-brand {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem;
  color: rgba(255,255,255,0.4); margin-top: 4px; display: block;
}
.fdm-close-x {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.fdm-close-x:hover { background: rgba(255,255,255,0.12); color: #fff; }

/* Sections */
.fdm-section { margin-bottom: 24px; }
.fdm-section-title {
  font-family: 'Outfit', sans-serif; font-weight: 700;
  font-size: 1.05rem; color: #fff; margin: 0 0 14px;
}

/* Macro Grid */
.fdm-macros-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.fdm-macro-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 4px; border-radius: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  transition: transform 0.2s;
}
.fdm-macro-card:hover { transform: translateY(-2px); }

/* Rings */
.fdm-ring-wrap {
  position: relative; width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
}
.fdm-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.fdm-ring-bg { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 3; }
.fdm-ring-fill {
  fill: none; stroke-width: 3; stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease-out;
}
.fdm-fill-cal { stroke: #fff; }
.fdm-fill-pro { stroke: #3B82F6; }
.fdm-fill-fat { stroke: #DFFF00; }
.fdm-fill-carb { stroke: #F97316; }

.fdm-ring-icon, .fdm-ring-letter {
  position: absolute; font-size: 0.9rem;
}
.fdm-ring-icon { font-size: 1rem; }
.fdm-ring-letter {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  color: rgba(255,255,255,0.7);
}
.fdm-ring-pro .fdm-ring-letter { color: #3B82F6; }
.fdm-ring-fat .fdm-ring-letter { color: #DFFF00; }
.fdm-ring-carb .fdm-ring-letter { color: #F97316; }

.fdm-macro-val {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 0.82rem; color: #fff;
}
.fdm-macro-pct {
  font-family: 'Space Grotesk', sans-serif; font-weight: 600;
  font-size: 0.65rem; color: rgba(255,255,255,0.35);
}

/* Nutrients */
.fdm-nutrients-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.fdm-nutrients-header .fdm-section-title { margin: 0; }
.fdm-nutrient-toggle { display: flex; gap: 2px; }
.fdm-nt-btn {
  width: 32px; height: 28px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.4); font-family: 'Space Grotesk', sans-serif;
  font-weight: 700; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
}
.fdm-nt-active {
  background: rgba(223,255,0,0.1); border-color: rgba(223,255,0,0.3);
  color: #DFFF00;
}

.fdm-nutrient-list {
  display: flex; flex-direction: column; gap: 0;
}
.fdm-nutrient-row {
  display: flex; align-items: baseline; gap: 8px;
  padding: 10px 0;
  border-bottom: 1px dotted rgba(255,255,255,0.08);
}
.fdm-nutrient-row:last-child { border-bottom: none; }
.fdm-nutrient-label {
  font-family: 'Outfit', sans-serif; font-weight: 600;
  font-size: 0.9rem; color: rgba(255,255,255,0.7);
  white-space: nowrap;
}
.fdm-nutrient-dots {
  flex: 1; border-bottom: 1px dotted rgba(255,255,255,0.1);
  margin-bottom: 4px;
}
.fdm-nutrient-val {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 0.85rem; color: #fff; white-space: nowrap;
}

/* Serving Section */
.fdm-serving-section {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px; padding: 18px; margin-bottom: 8px;
}
.fdm-serving-info { margin-bottom: 12px; }
.fdm-serving-label {
  font-family: 'Space Grotesk', sans-serif; font-size: 0.75rem;
  color: rgba(255,255,255,0.35); font-weight: 600; letter-spacing: 0.05em;
}

.fdm-unit-toggle { display: flex; gap: 6px; margin-bottom: 14px; }
.fdm-unit-btn {
  padding: 7px 18px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); font-family: 'Space Grotesk', sans-serif;
  font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.2s;
}
.fdm-unit-active {
  background: rgba(223,255,0,0.08); border-color: rgba(223,255,0,0.25);
  color: #DFFF00;
}

.fdm-qty-row {
  display: flex; align-items: center; gap: 8px;
}
.fdm-qty-input {
  flex: 1; height: 48px; border-radius: 14px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #fff; font-family: 'Space Grotesk', sans-serif;
  font-weight: 700; font-size: 1.1rem; padding: 0 16px;
  outline: none; transition: border-color 0.2s;
  -moz-appearance: textfield;
}
.fdm-qty-input::-webkit-inner-spin-button,
.fdm-qty-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.fdm-qty-input:focus { border-color: rgba(223,255,0,0.4); }

.fdm-qty-unit {
  font-family: 'Space Grotesk', sans-serif; font-weight: 600;
  font-size: 0.9rem; color: rgba(255,255,255,0.4); min-width: 24px;
}

.fdm-add-btn {
  height: 48px; padding: 0 28px; border-radius: 14px;
  background: linear-gradient(135deg, #d9ff4d, #a8cf2b);
  border: none; color: #000; font-family: 'Space Grotesk', sans-serif;
  font-weight: 700; font-size: 0.95rem; cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
  box-shadow: 0 4px 16px rgba(223,255,0,0.2);
  flex-shrink: 0;
}
.fdm-add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(223,255,0,0.35);
}
.fdm-add-btn:active { transform: scale(0.96); }

@media (max-width: 380px) {
  .fdm-macros-grid { gap: 6px; }
  .fdm-macro-card { padding: 10px 2px; }
  .fdm-ring-wrap { width: 40px; height: 40px; }
  .fdm-macro-val { font-size: 0.72rem; }
}
</style>
