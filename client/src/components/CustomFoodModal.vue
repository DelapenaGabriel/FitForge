<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['close', 'save'])

const form = ref({
  food_name: '',
  brand: '',
  calories: '',
  protein_g: '',
  fat_g: '',
  carbs_g: '',
  fiber_g: '',
  sugars_g: '',
  serving_qty: 1,
  serving_unit: 'serving',
  serving_weight_g: ''
})

const loading = ref(false)

// Drag to close logic
// Drag logic (matching NotificationPanel style)
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isDragging = ref(false)

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

function saveFood() {
  if (!form.value.food_name || !form.value.calories || !form.value.serving_weight_g) return

  loading.value = true
  // Prepare payload
  const payload = {
    food_name: form.value.food_name,
    brand: form.value.brand || null,
    serving_size: `${form.value.serving_qty} ${form.value.serving_unit}`,
    serving_weight_g: Number(form.value.serving_weight_g),
    calories: Number(form.value.calories) || 0,
    protein_g: Number(form.value.protein_g) || 0,
    fat_g: Number(form.value.fat_g) || 0,
    carbs_g: Number(form.value.carbs_g) || 0,
    fiber_g: form.value.fiber_g ? Number(form.value.fiber_g) : null,
    sugars_g: form.value.sugars_g ? Number(form.value.sugars_g) : null,
  }
  
  emit('save', payload)
}
</script>

<template>
  <transition name="cfm-overlay-fade" appear>
    <div class="cfm-overlay" @click.self="emit('close')">
      <transition name="cfm-modal-slide" appear>
        <div 
          class="cfm-modal" 
          :style="modalStyle"
        >
          <div 
            class="cfm-header-drag"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
          >
            <div class="cfm-drag-handle"></div>
            <h2 class="cfm-title">Create Custom Food</h2>
          </div>

          <div class="cfm-content">
            <div class="cfm-form-group">
              <label>Food Name <span class="cfm-req">*</span></label>
              <input v-model="form.food_name" type="text" placeholder="e.g. My Special Smoothie" />
            </div>

        <div class="cfm-form-row">
          <div class="cfm-form-group">
            <label>Brand (Optional)</label>
            <input v-model="form.brand" type="text" placeholder="e.g. Homemade" />
          </div>
          <div class="cfm-form-group">
            <label>Serving Weight (g) <span class="cfm-req">*</span></label>
            <input v-model="form.serving_weight_g" type="number" placeholder="e.g. 150" />
          </div>
        </div>

        <div class="cfm-form-group">
          <label>Serving Size</label>
          <div class="cfm-serving-wrap">
            <input v-model="form.serving_qty" type="number" placeholder="1" class="cfm-qty-input" />
            <select v-model="form.serving_unit" class="cfm-select">
              <option value="serving">serving</option>
              <option value="g">grams</option>
              <option value="oz">oz</option>
              <option value="cup">cup</option>
              <option value="tbsp">tbsp</option>
              <option value="tsp">tsp</option>
              <option value="ml">ml</option>
              <option value="piece">piece</option>
            </select>
          </div>
        </div>

        <div class="cfm-macros-grid">
          <!-- Calories -->
          <div class="cfm-macro-box cfm-macro-cal">
            <div class="cfm-mb-header">
              <div class="cfm-dot cfm-dot-cal"></div>
              <span class="cfm-mb-label">Calories <span class="cfm-req">*</span></span>
            </div>
            <div class="cfm-mb-input-wrap">
              <input v-model="form.calories" type="number" placeholder="0" />
              <span class="cfm-mb-unit">kcal</span>
            </div>
          </div>

          <!-- Protein -->
          <div class="cfm-macro-box cfm-macro-p">
            <div class="cfm-mb-header">
              <div class="cfm-dot cfm-dot-p"></div>
              <span class="cfm-mb-label">Protein</span>
            </div>
            <div class="cfm-mb-input-wrap">
              <input v-model="form.protein_g" type="number" placeholder="0" />
              <span class="cfm-mb-unit">g</span>
            </div>
          </div>

          <!-- Fat -->
          <div class="cfm-macro-box cfm-macro-f">
            <div class="cfm-mb-header">
              <div class="cfm-dot cfm-dot-f"></div>
              <span class="cfm-mb-label">Fat</span>
            </div>
            <div class="cfm-mb-input-wrap">
              <input v-model="form.fat_g" type="number" placeholder="0" />
              <span class="cfm-mb-unit">g</span>
            </div>
          </div>

          <!-- Carbs -->
          <div class="cfm-macro-box cfm-macro-c">
            <div class="cfm-mb-header">
              <div class="cfm-dot cfm-dot-c"></div>
              <span class="cfm-mb-label">Carbs</span>
            </div>
            <div class="cfm-mb-input-wrap">
              <input v-model="form.carbs_g" type="number" placeholder="0" />
              <span class="cfm-mb-unit">g</span>
            </div>
          </div>
        </div>

        <!-- Optional Fiber and Sugar -->
        <div class="cfm-form-row" style="margin-top: -4px;">
          <div class="cfm-form-group">
            <label>Fiber (g) - Optional</label>
            <input v-model="form.fiber_g" type="number" placeholder="0" />
          </div>
          <div class="cfm-form-group">
            <label>Sugars (g) - Optional</label>
            <input v-model="form.sugars_g" type="number" placeholder="0" />
          </div>
        </div>
      </div>

      <div class="cfm-footer">
        <button 
          class="cfm-save-btn" 
          :disabled="!form.food_name || !form.calories || !form.serving_weight_g || loading"
          @click="saveFood"
        >
          <span v-if="!loading">Save Custom Food</span>
          <div v-else class="cfm-spinner"></div>
        </button>
      </div>
    </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.cfm-overlay {
  position: fixed; inset: 0; z-index: 3000;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  display: flex; flex-direction: column; justify-content: flex-end;
}
.cfm-modal {
  background: #121212; border-top-left-radius: 32px; border-top-right-radius: 32px;
  max-width: 680px; width: 100%; margin: 0 auto;
  display: flex; flex-direction: column;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
  position: relative;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Transitions */
.cfm-overlay-fade-enter-active,
.cfm-overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}
.cfm-overlay-fade-enter-from,
.cfm-overlay-fade-leave-to {
  opacity: 0;
}

.cfm-modal-slide-enter-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.cfm-modal-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 1, 1);
}
.cfm-modal-slide-enter-from,
.cfm-modal-slide-leave-to {
  transform: translateY(100%);
}

.cfm-header-drag {
  width: 100%; padding: 16px 24px 20px; 
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  cursor: grab;
  touch-action: none;
}
.cfm-header-drag:active { cursor: grabbing; }
.cfm-drag-handle {
  width: 48px; height: 5px; border-radius: 10px;
  background: rgba(255,255,255,0.2);
}

.cfm-title {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 1.3rem; color: #fff; margin: 0; letter-spacing: -0.02em;
  text-align: center; width: 100%;
}

.cfm-content {
  padding: 0 24px 24px; display: flex; flex-direction: column; gap: 20px;
  overflow-y: auto; max-height: calc(100vh - 120px);
}

.cfm-form-row {
  display: flex; gap: 16px;
}
.cfm-form-row .cfm-form-group { flex: 1; min-width: 0; }

.cfm-form-group {
  display: flex; flex-direction: column; gap: 8px; width: 100%;
}
.cfm-form-group label {
  font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 0.8rem;
  color: rgba(255,255,255,0.6); letter-spacing: 0.05em; text-transform: uppercase;
}
.cfm-req { color: #DFFF00; margin-left: 2px; }

.cfm-form-group input {
  width: 100%; box-sizing: border-box;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px; color: #fff;
  font-family: 'Outfit', sans-serif; font-size: 1rem;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.cfm-form-group input:focus { 
  border-color: rgba(223, 255, 0, 0.4); outline: none; 
  background: rgba(223, 255, 0, 0.04); 
  box-shadow: 0 0 0 3px rgba(223, 255, 0, 0.1);
}
.cfm-form-group input::placeholder { color: rgba(255,255,255,0.2); }

.cfm-serving-wrap {
  display: flex; gap: 8px;
}
.cfm-qty-input {
  width: 80px !important; flex-shrink: 0;
}
.cfm-select {
  flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px; color: #fff;
  font-family: 'Outfit', sans-serif; font-size: 1rem;
  appearance: none; outline: none; cursor: pointer;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.cfm-select:focus {
  border-color: rgba(223, 255, 0, 0.4); 
  background-color: rgba(223, 255, 0, 0.04);
  box-shadow: 0 0 0 3px rgba(223, 255, 0, 0.1);
}
.cfm-select option { background: #1a1a1a; color: #fff; }

/* Gorgeous Macros Grid */
.cfm-macros-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  margin-top: 8px;
}
.cfm-macro-box {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 12px;
  position: relative; overflow: hidden;
  transition: all 0.2s;
}
.cfm-macro-box:focus-within {
  background: rgba(255,255,255,0.06);
  transform: translateY(-2px);
}
.cfm-macro-cal:focus-within { border-color: rgba(255,255,255,0.3); box-shadow: 0 4px 16px rgba(255,255,255,0.1); }
.cfm-macro-p:focus-within { border-color: rgba(59,130,246,0.5); box-shadow: 0 4px 16px rgba(59,130,246,0.15); }
.cfm-macro-f:focus-within { border-color: rgba(223,255,0,0.4); box-shadow: 0 4px 16px rgba(223,255,0,0.1); }
.cfm-macro-c:focus-within { border-color: rgba(249,115,22,0.5); box-shadow: 0 4px 16px rgba(249,115,22,0.15); }

.cfm-mb-header {
  display: flex; align-items: center; gap: 8px;
}
.cfm-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.cfm-dot-cal { background: rgba(255,255,255,0.7); box-shadow: 0 0 8px rgba(255,255,255,0.3); }
.cfm-dot-p { background: #3B82F6; box-shadow: 0 0 8px rgba(59,130,246,0.4); }
.cfm-dot-f { background: #DFFF00; box-shadow: 0 0 8px rgba(223,255,0,0.4); }
.cfm-dot-c { background: #F97316; box-shadow: 0 0 8px rgba(249,115,22,0.4); }

.cfm-mb-label {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.75rem;
  color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em;
}

.cfm-mb-input-wrap {
  display: flex; align-items: baseline; gap: 6px;
}
.cfm-mb-input-wrap input {
  width: 100%; box-sizing: border-box; flex: 1; min-width: 0;
  background: none; border: none; outline: none; padding: 0;
  color: #fff; font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700;
  letter-spacing: -0.02em;
}
.cfm-mb-input-wrap input::placeholder { color: rgba(255,255,255,0.15); }

/* Remove number spin buttons */
.cfm-mb-input-wrap input::-webkit-outer-spin-button,
.cfm-mb-input-wrap input::-webkit-inner-spin-button {
  -webkit-appearance: none; margin: 0;
}

.cfm-mb-unit {
  font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 600;
  color: rgba(255,255,255,0.4);
}

.cfm-footer {
  padding: 16px 24px calc(24px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #121212 80%, rgba(18,18,18,0));
}
.cfm-save-btn {
  width: 100%; padding: 18px; border-radius: 16px;
  background: #DFFF00; color: #000; border: none;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.05rem;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(223, 255, 0, 0.2);
}
.cfm-save-btn:disabled { 
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); 
  box-shadow: none; cursor: not-allowed; 
}
.cfm-save-btn:not(:disabled):hover { 
  background: #cbf000; transform: translateY(-2px); 
  box-shadow: 0 8px 24px rgba(223, 255, 0, 0.3); 
}
.cfm-save-btn:not(:disabled):active {
  transform: translateY(1px);
}

.cfm-spinner {
  width: 24px; height: 24px; border: 3px solid rgba(0,0,0,0.1);
  border-top-color: #000; border-radius: 50%;
  animation: cfm-spin 0.6s linear infinite;
}
@keyframes cfm-spin { to { transform: rotate(360deg); } }
</style>
