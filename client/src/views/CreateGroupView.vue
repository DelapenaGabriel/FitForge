<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGroupStore } from '@/stores/groups'

const groups = useGroupStore()
const router = useRouter()

const step = ref(1)
const name = ref('')
const description = ref('')
const startDate = ref(new Date().toISOString().split('T')[0])
const endDate = ref('')
const startWeight = ref('')
const goalWeight = ref('')
const error = ref('')
const transitioning = ref(false)

const totalWeeks = computed(() => {
  if (!startDate.value || !endDate.value) return 0
  const days = Math.ceil((new Date(endDate.value) - new Date(startDate.value)) / (1000*60*60*24))
  return Math.max(1, Math.floor(days / 7))
})

const totalDays = computed(() => {
  if (!startDate.value || !endDate.value) return 0
  return Math.ceil((new Date(endDate.value) - new Date(startDate.value)) / (1000*60*60*24))
})

const weeklyLoss = computed(() => {
  if (!startWeight.value || !goalWeight.value || totalWeeks.value === 0) return 0
  return ((startWeight.value - goalWeight.value) / totalWeeks.value).toFixed(2)
})

const totalLoss = computed(() => {
  if (!startWeight.value || !goalWeight.value) return 0
  return (startWeight.value - goalWeight.value).toFixed(1)
})

const stepLabels = ['Details', 'Timeline', 'Goals']

const nextStep = () => {
  if (step.value === 1 && (!name.value || !description.value)) {
    error.value = 'Please fill in all fields'
    return
  }
  if (step.value === 2 && (!startDate.value || !endDate.value)) {
    error.value = 'Please select both dates'
    return
  }
  if (step.value === 2 && new Date(endDate.value) <= new Date(startDate.value)) {
    error.value = 'End date must be after start date'
    return
  }
  error.value = ''
  transitioning.value = true
  setTimeout(() => {
    step.value++
    transitioning.value = false
  }, 300)
}

const prevStep = () => {
  error.value = ''
  transitioning.value = true
  setTimeout(() => {
    step.value--
    transitioning.value = false
  }, 300)
}

const handleCreate = async () => {
  if (!startWeight.value || !goalWeight.value) {
    error.value = 'Please enter your starting and goal weights'
    return
  }
  try {
    const group = await groups.createGroup({
      name: name.value,
      description: description.value,
      startDate: startDate.value,
      endDate: endDate.value,
      startWeight: parseFloat(startWeight.value),
      goalWeight: parseFloat(goalWeight.value)
    })
    router.push(`/groups/${group.id}`)
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to create group'
  }
}
</script>

<template>
  <div class="cg-page">
    <div class="cg-container">

      <!-- Header -->
      <header class="cg-header animate-in">
        <router-link to="/groups" class="cg-back">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </router-link>
        <div>
          <span class="cg-header-label">CREATE</span>
          <h1 class="cg-header-title">NEW CHALLENGE</h1>
        </div>
      </header>

      <!-- Stepper -->
      <div class="cg-stepper animate-in" style="animation-delay: 0.08s">
        <div class="cg-stepper-track">
          <div class="cg-stepper-fill" :style="{ width: ((step - 1) / 2) * 100 + '%' }"></div>
        </div>
        <div class="cg-stepper-nodes">
          <div
            v-for="(label, idx) in stepLabels"
            :key="idx"
            class="cg-node"
            :class="{ completed: step > idx + 1, active: step === idx + 1 }"
          >
            <div class="cg-node-dot">
              <svg v-if="step > idx + 1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span v-else class="cg-node-num">{{ idx + 1 }}</span>
            </div>
            <span class="cg-node-label">{{ label }}</span>
          </div>
        </div>
      </div>

      <!-- Error -->
      <Transition name="cg-shake">
        <div v-if="error" class="cg-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span>{{ error }}</span>
        </div>
      </Transition>

      <!-- Steps -->
      <Transition name="cg-slide" mode="out-in">

        <!-- Step 1 -->
        <div v-if="step === 1 && !transitioning" key="s1" class="cg-card animate-in" style="animation-delay: 0.12s">
          <div class="cg-card-header">
            <h2 class="cg-card-title">CHALLENGE IDENTITY</h2>
            <p class="cg-card-desc">Give your challenge a name that inspires commitment.</p>
          </div>

          <div class="cg-fields">
            <div class="cg-field">
              <label>CHALLENGE NAME</label>
              <input v-model="name" class="cg-input" placeholder="e.g., 90 Day Engine" />
            </div>
            <div class="cg-field">
              <label>THE VISION</label>
              <textarea v-model="description" class="cg-input cg-textarea" rows="4" placeholder="What are the rules and objectives?"></textarea>
            </div>
          </div>

          <button class="cg-btn-primary" @click="nextStep">
            <span>CONTINUE</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>

        <!-- Step 2 -->
        <div v-else-if="step === 2 && !transitioning" key="s2" class="cg-card animate-in">
          <div class="cg-card-header">
            <h2 class="cg-card-title">SET THE TIMELINE</h2>
            <p class="cg-card-desc">Define when the challenge starts and when victory is won.</p>
          </div>

          <div class="cg-fields">
            <div class="cg-dates-row">
              <div class="cg-field">
                <label>START DATE</label>
                <input v-model="startDate" type="date" class="cg-input" />
              </div>
              <div class="cg-field">
                <label>END DATE</label>
                <input v-model="endDate" type="date" class="cg-input" />
              </div>
            </div>

            <Transition name="cg-expand">
              <div v-if="totalWeeks > 0" class="cg-stats-row">
                <div class="cg-stat-box">
                  <span class="cg-stat-val cg-val-lime">{{ totalWeeks }}</span>
                  <span class="cg-stat-lbl">WEEKS</span>
                </div>
                <div class="cg-stat-divider"></div>
                <div class="cg-stat-box">
                  <span class="cg-stat-val">{{ totalDays }}</span>
                  <span class="cg-stat-lbl">DAYS</span>
                </div>
              </div>
            </Transition>
          </div>

          <div class="cg-btn-row">
            <button class="cg-btn-ghost" @click="prevStep">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              BACK
            </button>
            <button class="cg-btn-primary" @click="nextStep">
              <span>CONTINUE</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>

        <!-- Step 3 -->
        <div v-else-if="step === 3 && !transitioning" key="s3" class="cg-card animate-in">
          <div class="cg-card-header">
            <h2 class="cg-card-title">PERSONAL TARGET</h2>
            <p class="cg-card-desc">Define your starting point. Only you and the coach see this.</p>
          </div>

          <div class="cg-fields">
            <div class="cg-dates-row">
              <div class="cg-field">
                <label>CURRENT WEIGHT (LBS)</label>
                <input v-model="startWeight" type="number" step="0.1" class="cg-input" placeholder="0.0" />
              </div>
              <div class="cg-field">
                <label>GOAL WEIGHT (LBS)</label>
                <input v-model="goalWeight" type="number" step="0.1" class="cg-input" placeholder="0.0" />
              </div>
            </div>

            <Transition name="cg-expand">
              <div v-if="weeklyLoss > 0" class="cg-goal-summary">
                <div class="cg-goal-item">
                  <span class="cg-goal-val cg-val-lime">{{ weeklyLoss }}</span>
                  <span class="cg-goal-lbl">LBS / WEEK</span>
                </div>
                <div class="cg-stat-divider"></div>
                <div class="cg-goal-item">
                  <span class="cg-goal-val cg-val-coral">{{ totalLoss }}</span>
                  <span class="cg-goal-lbl">TOTAL LOSS</span>
                </div>
              </div>
            </Transition>
          </div>

          <div class="cg-btn-row">
            <button class="cg-btn-ghost" @click="prevStep">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              BACK
            </button>
            <button class="cg-btn-launch" @click="handleCreate">
              LAUNCH CHALLENGE
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>

      </Transition>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

/* ── Page ── */
.cg-page {
  background: #0e0e0e;
  min-height: 100vh;
  padding-top: max(24px, calc(12px + env(safe-area-inset-top)));
  padding-bottom: max(120px, calc(100px + env(safe-area-inset-bottom)));
  position: relative;
  overflow-x: hidden;
}

.cg-page::before {
  content: '';
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background:
    radial-gradient(ellipse at 15% 5%, rgba(223, 255, 0, 0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 85% 95%, rgba(179, 153, 255, 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.cg-container {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

/* ── Header ── */
.cg-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 32px;
  padding: 8px 0;
}

.cg-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  color: #adaaaa;
  text-decoration: none;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-top: 2px;
}

.cg-back:active { transform: scale(0.92); }

.cg-header-label {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  color: #DFFF00;
  display: block;
  margin-bottom: 4px;
}

.cg-header-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 2.2rem;
  line-height: 1;
  letter-spacing: -0.04em;
  color: #ffffff;
  text-transform: uppercase;
  font-style: italic;
}

/* ── Stepper ── */
.cg-stepper {
  position: relative;
  margin-bottom: 28px;
  padding: 0 8px;
}

.cg-stepper-track {
  position: absolute;
  left: 32px; right: 32px;
  top: 16px;
  height: 3px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  z-index: 0;
}

.cg-stepper-fill {
  height: 100%;
  border-radius: 4px;
  background: #DFFF00;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.cg-stepper-nodes {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.cg-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cg-node-dot {
  width: 34px; height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1919;
  border: 2px solid rgba(255,255,255,0.08);
  color: #777575;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.cg-node.active .cg-node-dot {
  border-color: #DFFF00;
  color: #DFFF00;
  box-shadow: 0 0 16px rgba(223, 255, 0, 0.2);
  background: rgba(223, 255, 0, 0.06);
}

.cg-node.completed .cg-node-dot {
  background: rgba(223, 255, 0, 0.1);
  border-color: #DFFF00;
  color: #DFFF00;
}

.cg-node-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #52525b;
  transition: color 0.3s;
}

.cg-node.active .cg-node-label { color: #DFFF00; }
.cg-node.completed .cg-node-label { color: #adaaaa; }

/* ── Card ── */
.cg-card {
  background: #1a1919;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 20px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.cg-card-header { display: flex; flex-direction: column; gap: 6px; }

.cg-card-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: -0.01em;
  color: #ffffff;
  text-transform: uppercase;
  font-style: italic;
}

.cg-card-desc {
  font-size: 0.82rem;
  color: #777575;
  line-height: 1.5;
}

/* ── Fields ── */
.cg-fields { display: flex; flex-direction: column; gap: 20px; }

.cg-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }

.cg-field label {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  color: #adaaaa;
  text-transform: uppercase;
}

.cg-input {
  padding: 14px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  color: #fff;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
}

.cg-input:hover { border-color: rgba(255,255,255,0.12); }

.cg-input:focus {
  border-color: #DFFF00;
  background: rgba(255,255,255,0.05);
  box-shadow: 0 0 0 3px rgba(223, 255, 0, 0.08);
}

.cg-input::placeholder { color: #52525b; }

.cg-textarea { resize: vertical; min-height: 100px; line-height: 1.6; }

.cg-dates-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

/* ── Stats Row ── */
.cg-stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 20px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 14px;
}

.cg-stat-box { display: flex; flex-direction: column; align-items: center; gap: 4px; }

.cg-stat-val {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.cg-val-lime { color: #DFFF00; }
.cg-val-coral { color: #ff7043; }

.cg-stat-lbl {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  color: #777575;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cg-stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(255,255,255,0.08);
}

/* ── Goal Summary ── */
.cg-goal-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 24px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 14px;
}

.cg-goal-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }

.cg-goal-val {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1;
}

.cg-goal-lbl {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  color: #777575;
  letter-spacing: 0.12em;
}

/* ── Buttons ── */
.cg-btn-row {
  display: flex;
  gap: 10px;
}

.cg-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  padding: 14px 24px;
  background: #DFFF00;
  color: #0e0e0e;
  border: none;
  border-radius: 12px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 20px rgba(223, 255, 0, 0.2);
}

.cg-btn-primary:active { transform: scale(0.96); }

.cg-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 20px;
  background: transparent;
  color: #777575;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.25s;
}

.cg-btn-ghost:active { transform: scale(0.96); }

.cg-btn-launch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1;
  padding: 15px 28px;
  background: #DFFF00;
  color: #0e0e0e;
  border: none;
  border-radius: 12px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 6px 28px rgba(223, 255, 0, 0.25);
}

.cg-btn-launch:active { transform: scale(0.96); }

/* ── Error ── */
.cg-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255, 112, 67, 0.06);
  border: 1px solid rgba(255, 112, 67, 0.15);
  border-radius: 12px;
  color: #ff7043;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 0.82rem;
  margin-bottom: 8px;
}

/* ── Transitions ── */
.cg-slide-enter-active { transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
.cg-slide-leave-active { transition: all 0.2s ease; }
.cg-slide-enter-from { opacity: 0; transform: translateY(20px); }
.cg-slide-leave-to { opacity: 0; transform: translateY(-12px); }

.cg-expand-enter-active, .cg-expand-leave-active { transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
.cg-expand-enter-from, .cg-expand-leave-to { opacity: 0; transform: translateY(8px); }

.cg-shake-enter-active { animation: cgShake 0.45s ease; }
@keyframes cgShake {
  0% { transform: translateX(-8px); opacity: 0; }
  25% { transform: translateX(6px); }
  50% { transform: translateX(-4px); }
  75% { transform: translateX(2px); }
  100% { transform: translateX(0); opacity: 1; }
}

/* ── Animations ── */
.animate-in { animation: cg-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes cg-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Date input ── */
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.4;
  cursor: pointer;
}
input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 0.7; }

/* ── Responsive ── */
@media (max-width: 480px) {
  .cg-header-title { font-size: 1.8rem; }
  .cg-card { padding: 22px 18px; }
  .cg-dates-row { grid-template-columns: 1fr; }
}
</style>
