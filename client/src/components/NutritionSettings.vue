<script setup>
import { ref, onMounted } from 'vue'
import { useNutritionStore } from '@/stores/nutrition'

const emit = defineEmits(['close'])
const nutrition = useNutritionStore()

const calories = ref(2130)
const protein = ref(190)
const fat = ref(70)
const carbs = ref(185)
const saving = ref(false)
const saved = ref(false)

onMounted(() => {
  calories.value = nutrition.settings.daily_calories || 2130
  protein.value = nutrition.settings.protein_g || 190
  fat.value = nutrition.settings.fat_g || 70
  carbs.value = nutrition.settings.carbs_g || 185
})

async function save() {
  saving.value = true
  saved.value = false
  try {
    await nutrition.saveSettings({
      daily_calories: Number(calories.value),
      protein_g: Number(protein.value),
      fat_g: Number(fat.value),
      carbs_g: Number(carbs.value)
    })
    saved.value = true
    setTimeout(() => emit('close'), 800)
  } catch (e) {
    console.error('Error saving settings:', e)
  } finally {
    saving.value = false
  }
}

const totalMacroCals = () => (protein.value * 4) + (fat.value * 9) + (carbs.value * 4)
</script>

<template>
  <div class="ns-overlay" @click.self="emit('close')">
    <div class="ns-modal">
      <div class="ns-header">
        <h2 class="ns-title">Nutrition Goals</h2>
        <button class="ns-close" @click="emit('close')">✕</button>
      </div>

      <div class="ns-content">
        <!-- Calorie Ring Preview -->
        <div class="ns-ring-wrap">
          <svg class="ns-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#calGrad)" stroke-width="8"
              stroke-linecap="round" stroke-dasharray="327" stroke-dashoffset="0"
              transform="rotate(-90 60 60)"/>
            <defs><linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#d9ff4d"/><stop offset="100%" stop-color="#a8cf2b"/>
            </linearGradient></defs>
          </svg>
          <div class="ns-ring-text">
            <span class="ns-ring-num">{{ calories }}</span>
            <span class="ns-ring-label">kcal / day</span>
          </div>
        </div>

        <!-- Macro from calories note -->
        <div class="ns-macro-note">
          Macros total: <strong>{{ totalMacroCals() }} kcal</strong>
          <span v-if="Math.abs(totalMacroCals() - calories) > 50" class="ns-macro-warn">
            ({{ totalMacroCals() > calories ? '+' : '' }}{{ totalMacroCals() - calories }} from goal)
          </span>
        </div>

        <!-- Sliders -->
        <div class="ns-field">
          <div class="ns-field-header">
            <span class="ns-field-label">Daily Calories</span>
            <div class="ns-field-value-wrap">
              <input type="number" v-model.number="calories" class="ns-num-input" min="500" max="10000" />
              <span class="ns-field-unit">kcal</span>
            </div>
          </div>
          <input type="range" v-model.number="calories" min="800" max="6000" step="10" class="ns-slider ns-slider-cal" />
        </div>

        <div class="ns-field">
          <div class="ns-field-header">
            <span class="ns-field-label"><span class="ns-dot ns-dot-p"></span> Protein</span>
            <div class="ns-field-value-wrap">
              <input type="number" v-model.number="protein" class="ns-num-input" min="0" max="500" />
              <span class="ns-field-unit">g</span>
            </div>
          </div>
          <input type="range" v-model.number="protein" min="0" max="400" step="5" class="ns-slider ns-slider-p" />
        </div>

        <div class="ns-field">
          <div class="ns-field-header">
            <span class="ns-field-label"><span class="ns-dot ns-dot-f"></span> Fat</span>
            <div class="ns-field-value-wrap">
              <input type="number" v-model.number="fat" class="ns-num-input" min="0" max="300" />
              <span class="ns-field-unit">g</span>
            </div>
          </div>
          <input type="range" v-model.number="fat" min="0" max="250" step="5" class="ns-slider ns-slider-f" />
        </div>

        <div class="ns-field">
          <div class="ns-field-header">
            <span class="ns-field-label"><span class="ns-dot ns-dot-c"></span> Carbs</span>
            <div class="ns-field-value-wrap">
              <input type="number" v-model.number="carbs" class="ns-num-input" min="0" max="800" />
              <span class="ns-field-unit">g</span>
            </div>
          </div>
          <input type="range" v-model.number="carbs" min="0" max="600" step="5" class="ns-slider ns-slider-c" />
        </div>
      </div>

      <div class="ns-footer">
        <button class="ns-save-btn" :disabled="saving" @click="save">
          <span v-if="saved">✓ Saved!</span>
          <span v-else-if="saving">Saving...</span>
          <span v-else>Save Goals</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ns-overlay {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.ns-modal {
  background: #111113; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px; width: 100%; max-width: 420px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
.ns-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 12px;
}
.ns-title { font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 700; color: #fff; margin: 0; }
.ns-close {
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: none;
  color: rgba(255,255,255,0.4); font-size: 0.9rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.ns-close:hover { background: rgba(255,255,255,0.08); color: #fff; }
.ns-content { flex: 1; overflow-y: auto; padding: 8px 24px 16px; }
.ns-ring-wrap {
  position: relative; width: 120px; height: 120px; margin: 0 auto 8px;
}
.ns-ring { width: 100%; height: 100%; }
.ns-ring-text {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.ns-ring-num { font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 1.4rem; color: #DFFF00; }
.ns-ring-label { font-family: 'Space Grotesk', sans-serif; font-size: 0.6rem; color: rgba(255,255,255,0.35); }
.ns-macro-note {
  text-align: center; font-family: 'Space Grotesk', sans-serif; font-size: 0.72rem;
  color: rgba(255,255,255,0.4); margin-bottom: 16px;
}
.ns-macro-warn { color: #F97316; }
.ns-field { margin-bottom: 18px; }
.ns-field-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.ns-field-label {
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.82rem;
  color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 6px;
}
.ns-dot { width: 8px; height: 8px; border-radius: 50%; }
.ns-dot-p { background: #3B82F6; }
.ns-dot-f { background: #DFFF00; }
.ns-dot-c { background: #F97316; }
.ns-field-value-wrap { display: flex; align-items: center; gap: 4px; }
.ns-num-input {
  width: 60px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: #fff; text-align: center; padding: 4px;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.85rem; outline: none;
}
.ns-num-input:focus { border-color: rgba(217,255,77,0.3); }
.ns-field-unit { font-family: 'Space Grotesk', sans-serif; font-size: 0.7rem; color: rgba(255,255,255,0.3); }
.ns-slider {
  width: 100%; height: 6px; -webkit-appearance: none; appearance: none;
  background: rgba(255,255,255,0.06); border-radius: 10px; outline: none;
}
.ns-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
  cursor: pointer; border: 2px solid #111; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.ns-slider-cal::-webkit-slider-thumb { background: #d4d4d4; }
.ns-slider-p::-webkit-slider-thumb { background: #3B82F6; }
.ns-slider-f::-webkit-slider-thumb { background: #DFFF00; }
.ns-slider-c::-webkit-slider-thumb { background: #F97316; }
.ns-footer { padding: 12px 24px 20px; }
.ns-save-btn {
  width: 100%; padding: 14px; border-radius: 16px;
  background: linear-gradient(135deg, #d9ff4d, #a8cf2b); border: none;
  color: #000; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
  font-size: 0.95rem; cursor: pointer; transition: all 0.2s;
}
.ns-save-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(217,255,77,0.3); }
.ns-save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
</style>
