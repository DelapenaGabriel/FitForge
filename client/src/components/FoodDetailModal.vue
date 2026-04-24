<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useNutritionStore } from '@/stores/nutrition'

const props = defineProps({
  food: { type: Object, required: true },
  hour: { type: Number, default: () => new Date().getHours() },
  date: { type: Date, default: () => new Date() },
  exactTime: { type: Boolean, default: false },
  editLog: { type: Object, default: null }
})
const emit = defineEmits(['close', 'added'])
const nutrition = useNutritionStore()

const showSuccess = ref(false)
const nutrientMode = ref('g') // 'g' or '%'

// Drag-to-close state
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isDragging = ref(false)

// Parse grams from serving_size string if needed
function parseGrams(str) {
  if (!str) return 0
  const match = str.match(/([\d.]+)\s*g/i)
  return match ? parseFloat(match[1]) : 0
}

const unitOptions = computed(() => {
  const options = []
  let canShowStandardUnits = false
  
  if (props.food.servings && props.food.servings.length) {
    props.food.servings.forEach((s, idx) => {
      const desc = (s.serving_description || '').toLowerCase()
      const isWeightNative = desc.includes('g') || desc.includes('oz') || desc.includes('gram') || desc.includes('ounce') || desc.includes('lb') || desc.includes('pound')

      options.push({
        id: `serving_${idx}`,
        type: 'serving',
        label: s.serving_description || `${s.number_of_units} ${s.measurement_description}`,
        data: s
      })

      // We can show standard units if the API natively provides a weight-based serving
      if (isWeightNative && parseFloat(s.metric_serving_amount) > 0) {
        canShowStandardUnits = true
      }
      
      // Or if there are multiple servings and we have weight data to bridge them
      if (props.food.servings.length > 1 && parseFloat(s.metric_serving_amount) > 0) {
        canShowStandardUnits = true
      }
    })
  } else {
    const s_size = props.food.serving_size || '1 serving'
    const weightG = props.food.serving_weight_g || parseGrams(s_size)
    const lsize = s_size.toLowerCase()
    const isWeightNative = lsize.includes('g') || lsize.includes('oz') || lsize.includes('lb') || lsize.includes('ml')

    if (isWeightNative && weightG > 0) {
      canShowStandardUnits = true
    }

    options.push({
      id: 'serving_default',
      type: 'serving_default',
      label: s_size,
      data: {
        number_of_units: 1,
        calories: props.food.calories || 0,
        protein: props.food.protein_g || 0,
        fat: props.food.fat_g || 0,
        carbohydrate: props.food.carbs_g || 0,
        fiber: props.food.fiber_g || 0,
        sugar: props.food.sugars_g || 0,
        sodium: props.food.sodium_mg || 0,
        cholesterol: props.food.cholesterol_mg || 0,
        metric_serving_amount: weightG || 0
      }
    })
  }

  if (canShowStandardUnits) {
    options.push({ id: 'grams', type: 'grams', label: 'Grams (g)' })
    options.push({ id: 'oz', type: 'oz', label: 'Ounces (oz)' })
  }

  return options
})

const selectedUnitId = ref(unitOptions.value[0]?.id || 'serving_default')
const quantity = ref(1)

onMounted(() => {
  if (props.editLog) {
    quantity.value = props.editLog.serving_qty || 1
    const logDesc = (props.editLog.serving_size || '').replace(/^[\d.]+\s*/, '').trim()
    const matchedOpt = unitOptions.value.find(o => {
      if (o.id === 'grams' && (logDesc.toLowerCase() === 'g' || logDesc.toLowerCase() === 'grams')) return true
      if (o.id === 'oz' && (logDesc.toLowerCase() === 'oz' || logDesc.toLowerCase() === 'ounces')) return true
      const oLabel = o.label.replace(/^[\d.]+\s*/, '').trim()
      return o.label === props.editLog.serving_size || oLabel === logDesc
    })
    if (matchedOpt) {
      selectedUnitId.value = matchedOpt.id
    }
  } else {
    const opt = unitOptions.value.find(o => o.id === selectedUnitId.value)
    if (opt && opt.type === 'serving' && opt.data) {
      quantity.value = parseFloat(opt.data.number_of_units) || 1
    } else if (opt && opt.type === 'serving_default') {
      quantity.value = 1
    } else if (opt && opt.id === 'grams') {
      quantity.value = 100
    } else if (opt && opt.id === 'oz') {
      quantity.value = Math.round((100 / 28.3495) * 10) / 10
    }
  }
})

// When switching units, intelligently convert if possible
watch(selectedUnitId, (newId, oldId) => {
  const oldOpt = unitOptions.value.find(o => o.id === oldId)
  const newOpt = unitOptions.value.find(o => o.id === newId)
  
  if (!oldOpt || !newOpt) return

  // Find equivalent in grams
  let currentGrams = 0
  if (oldOpt.id === 'grams') currentGrams = quantity.value
  else if (oldOpt.id === 'oz') currentGrams = quantity.value * 28.3495
  else if (oldOpt.data && oldOpt.data.metric_serving_amount) {
    currentGrams = (quantity.value / (parseFloat(oldOpt.data.number_of_units)||1)) * parseFloat(oldOpt.data.metric_serving_amount)
  }

  // Convert to new unit
  if (newOpt.id === 'grams') {
    quantity.value = currentGrams > 0 ? Math.round(currentGrams) : 100
  } else if (newOpt.id === 'oz') {
    quantity.value = currentGrams > 0 ? Math.round((currentGrams / 28.3495) * 100) / 100 : 3.5
  } else if (newOpt.data) {
    if (currentGrams > 0 && parseFloat(newOpt.data.metric_serving_amount) > 0) {
      const units = currentGrams / parseFloat(newOpt.data.metric_serving_amount)
      quantity.value = Math.round(units * (parseFloat(newOpt.data.number_of_units)||1) * 100) / 100
    } else {
      quantity.value = parseFloat(newOpt.data.number_of_units) || 1
    }
  }
})

const macrosPerGram = computed(() => {
  // Find the best serving to calculate per-gram from
  let bestServing = null
  if (props.food.servings && props.food.servings.length) {
    bestServing = props.food.servings.find(s => parseFloat(s.metric_serving_amount) > 0) || props.food.servings[0]
  }
  
  if (bestServing && parseFloat(bestServing.metric_serving_amount) > 0) {
    const weight = parseFloat(bestServing.metric_serving_amount)
    return {
      cal: parseFloat(bestServing.calories || 0) / weight,
      p: parseFloat(bestServing.protein || 0) / weight,
      f: parseFloat(bestServing.fat || 0) / weight,
      c: parseFloat(bestServing.carbohydrate || 0) / weight,
      fib: parseFloat(bestServing.fiber || 0) / weight,
      sug: parseFloat(bestServing.sugar || 0) / weight,
      sod: parseFloat(bestServing.sodium || 0) / weight,
      chol: parseFloat(bestServing.cholesterol || 0) / weight
    }
  } else {
    // Fallback
    const weight = props.food.serving_weight_g || 100
    return {
      cal: (props.food.calories || 0) / weight,
      p: (props.food.protein_g || 0) / weight,
      f: (props.food.fat_g || 0) / weight,
      c: (props.food.carbs_g || 0) / weight,
      fib: (props.food.fiber_g || 0) / weight,
      sug: (props.food.sugars_g || 0) / weight,
      sod: (props.food.sodium_mg || 0) / weight,
      chol: (props.food.cholesterol_mg || 0) / weight
    }
  }
})

const scaled = computed(() => {
  const opt = unitOptions.value.find(o => o.id === selectedUnitId.value)
  if (!opt) return {}

  let sCal=0, sP=0, sF=0, sC=0, sFib=0, sSug=0, sSod=0, sChol=0

  if (opt.id === 'grams' || opt.id === 'oz') {
    const grams = opt.id === 'oz' ? quantity.value * 28.3495 : quantity.value
    const m = macrosPerGram.value
    sCal = m.cal * grams
    sP = m.p * grams
    sF = m.f * grams
    sC = m.c * grams
    sFib = m.fib * grams
    sSug = m.sug * grams
    sSod = m.sod * grams
    sChol = m.chol * grams
  } else if (opt.data) {
    const scale = quantity.value / (parseFloat(opt.data.number_of_units) || 1)
    sCal = parseFloat(opt.data.calories || 0) * scale
    sP = parseFloat(opt.data.protein || opt.data.protein_g || 0) * scale
    sF = parseFloat(opt.data.fat || opt.data.fat_g || 0) * scale
    sC = parseFloat(opt.data.carbohydrate || opt.data.carbs_g || 0) * scale
    sFib = parseFloat(opt.data.fiber || opt.data.fiber_g || 0) * scale
    sSug = parseFloat(opt.data.sugar || opt.data.sugars_g || 0) * scale
    sSod = parseFloat(opt.data.sodium || opt.data.sodium_mg || 0) * scale
    sChol = parseFloat(opt.data.cholesterol || opt.data.cholesterol_mg || 0) * scale
  }

  return {
    calories: Math.round(sCal),
    protein_g: Math.round(sP * 10) / 10,
    fat_g: Math.round(sF * 10) / 10,
    carbs_g: Math.round(sC * 10) / 10,
    fiber_g: Math.round(sFib * 10) / 10,
    sugars_g: Math.round(sSug * 10) / 10,
    sodium_mg: Math.round(sSod),
    cholesterol_mg: Math.round(sChol)
  }
})

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
  try {
    const opt = unitOptions.value.find(o => o.id === selectedUnitId.value)
    let servingSizeStr = `${quantity.value} ${opt ? opt.label : ''}`
    
    let weightGrams = null
    if (opt?.id === 'grams') weightGrams = quantity.value
    else if (opt?.id === 'oz') weightGrams = quantity.value * 28.3495
    else if (opt?.data && opt.data.metric_serving_amount) {
      weightGrams = (quantity.value / (parseFloat(opt.data.number_of_units)||1)) * parseFloat(opt.data.metric_serving_amount)
    }

    const foodPayload = {
      food_name: props.food.food_name || 'Unknown',
      brand: props.food.brand || null,
      calories: scaled.value.calories || 0,
      protein_g: scaled.value.protein_g || 0,
      fat_g: scaled.value.fat_g || 0,
      carbs_g: scaled.value.carbs_g || 0,
      fiber_g: scaled.value.fiber_g || 0,
      sugars_g: scaled.value.sugars_g || 0,
      serving_size: servingSizeStr.trim(),
      serving_weight_g: weightGrams ? Math.round(weightGrams) : null,
      serving_qty: quantity.value || 1,
      source: props.food.source || 'manual',
      source_id: props.food.source_id || null
    }

    if (props.editLog) {
      await nutrition.updateFoodLogDetails(props.editLog.id, foodPayload)
    } else {
      const d = new Date(props.date)
      let logTime
      if (props.exactTime) {
        const now = new Date()
        logTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())
      } else {
        logTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), props.hour, 0, 0)
      }
      await nutrition.addFoodLog(foodPayload, logTime)
    }

    showSuccess.value = true
    setTimeout(() => { emit('added') }, 600)
  } catch (err) {
    console.error('Failed to add/update food:', err)
    alert('Failed to save. Please try again.')
  }
}

// Drag logic
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
  if (scaled.value.fiber_g > 0 || props.food.fiber_g !== undefined) {
    rows.push({ label: 'Fiber', value: scaled.value.fiber_g, unit: 'g', dv: 28 })
  }
  if (scaled.value.sugars_g > 0 || props.food.sugars_g !== undefined) {
    rows.push({ label: 'Sugars', value: scaled.value.sugars_g, unit: 'g', dv: 50 })
  }
  if (scaled.value.cholesterol_mg > 0 || (props.food.cholesterol_mg || 0) > 0) {
    rows.push({ label: 'Cholesterol', value: scaled.value.cholesterol_mg, unit: 'mg', dv: 300 })
  }
  if (scaled.value.sodium_mg > 0 || props.food.sodium_mg !== undefined) {
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

          <div v-if="showSuccess" class="fdm-success-overlay">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DFFF00" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
            <span>{{ editLog ? 'Updated!' : 'Added!' }}</span>
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
                <span class="fdm-serving-label">Serving Settings</span>
              </div>
              <div class="fdm-qty-row fdm-serving-select-row">
                <select v-model="selectedUnitId" class="fdm-unit-select">
                  <option v-for="opt in unitOptions" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="fdm-qty-row">
                <input
                  v-model.number="quantity"
                  type="number"
                  class="fdm-qty-input"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                />
                <button class="fdm-add-btn" @click="handleAdd">{{ editLog ? 'Update' : 'Add' }}</button>
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
  font-family: 'Space Grotesk', sans-serif; font-size: 0.7rem;
  color: rgba(255,255,255,0.35); font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase;
}

.fdm-serving-select-row { margin-bottom: 12px; }
.fdm-unit-select {
  width: 100%; height: 44px; border-radius: 12px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #fff; font-family: 'Space Grotesk', sans-serif;
  font-weight: 700; font-size: 0.85rem; padding: 0 14px;
  outline: none; cursor: pointer; transition: border-color 0.2s;
  -webkit-appearance: none; -moz-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}
.fdm-unit-select:focus { border-color: rgba(223,255,0,0.4); }
.fdm-unit-select option {
  background: #1a1a1a; color: #fff;
  font-family: 'Space Grotesk', sans-serif;
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
