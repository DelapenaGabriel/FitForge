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
const stepIcons = ['✨', '📅', '🎯']

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
  <div class="create-group-page">
    <!-- Ambient background orbs -->
    <div class="ambient-bg">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <div class="container">
      <div class="create-wrapper">
        <!-- Header -->
        <div class="create-header animate-in">
          <div class="header-badge">
            <span class="badge-dot"></span>
            New Challenge
          </div>
          <h1 class="page-title">
            Launch Your
            <span class="title-accent">Challenge</span>
          </h1>
          <p class="header-subtitle">Build a community and crush your fitness goals together.</p>
        </div>

        <!-- Premium Stepper -->
        <div class="stepper-container animate-in animate-in-delay-1">
          <div class="stepper-track">
            <div class="stepper-progress" :style="{ width: ((step - 1) / 2) * 100 + '%' }"></div>
          </div>
          <div class="stepper-nodes">
            <div
              v-for="(label, idx) in stepLabels"
              :key="idx"
              class="stepper-node"
              :class="{
                completed: step > idx + 1,
                active: step === idx + 1,
                upcoming: step < idx + 1
              }"
            >
              <div class="node-circle">
                <svg v-if="step > idx + 1" class="check-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span v-else class="node-emoji">{{ stepIcons[idx] }}</span>
              </div>
              <span class="node-label">{{ label }}</span>
            </div>
          </div>
        </div>

        <!-- Error -->
        <Transition name="shake">
          <div v-if="error" class="error-banner">
            <div class="error-icon">!</div>
            <span>{{ error }}</span>
          </div>
        </Transition>

        <!-- Step Cards -->
        <Transition name="slide-fade" mode="out-in">
          <!-- Step 1: Group Info -->
          <div v-if="step === 1 && !transitioning" key="step1" class="step-card">
            <div class="card-glow card-glow-lime"></div>
            <div class="card-inner">
              <div class="card-top">
                
                <div class="card-title-area">
                  <h2>Challenge Identity</h2>
                  <p>Give your challenge a name that inspires commitment.</p>
                </div>
              </div>

              <div class="form-stack">
                <div class="input-group">
                  <label>
                    <span class="label-icon">💬</span>
                    Challenge Name
                  </label>
                  <input
                    v-model="name"
                    class="premium-input"
                    placeholder="e.g., 90 Day Engine"
                  />
                </div>

                <div class="input-group">
                  <label>
                    <span class="label-icon">📝</span>
                    The Vision
                  </label>
                  <textarea
                    v-model="description"
                    class="premium-input premium-textarea"
                    rows="4"
                    placeholder="What are the rules and objectives?"
                  ></textarea>
                </div>
              </div>

              <button class="cta-btn cta-primary" @click="nextStep">
                <span>Continue</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <!-- Step 2: Timeline -->
          <div v-else-if="step === 2 && !transitioning" key="step2" class="step-card">
            <div class="card-glow card-glow-purple"></div>
            <div class="card-inner">
              <div class="card-top">
                <div class="card-icon-wrap purple">
                  <span class="card-icon">📅</span>
                </div>
                <div class="card-title-area">
                  <h2>Set the Timeline</h2>
                  <p>Define when the challenge starts and when victory is won.</p>
                </div>
              </div>

              <div class="form-stack">
                <div class="dates-grid">
                  <div class="input-group">
                    <label>
                      <span class="label-icon">🚀</span>
                      Start Date
                    </label>
                    <input v-model="startDate" type="date" class="premium-input" />
                  </div>
                  <div class="input-group">
                    <label>
                      <span class="label-icon">🏁</span>
                      End Date
                    </label>
                    <input v-model="endDate" type="date" class="premium-input" />
                  </div>
                </div>

                <Transition name="expand">
                  <div v-if="totalWeeks > 0" class="stats-ribbon">
                    <div class="stat-chip">
                      <span class="stat-value purple-text">{{ totalWeeks }}</span>
                      <span class="stat-label">Weeks</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-chip">
                      <span class="stat-value lime-text">{{ totalDays }}</span>
                      <span class="stat-label">Days</span>
                    </div>
                  </div>
                </Transition>
              </div>

              <div class="btn-row">
                <button class="cta-btn cta-ghost" @click="prevStep">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Back</span>
                </button>
                <button class="cta-btn cta-primary" @click="nextStep">
                  <span>Continue</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Step 3: Goals -->
          <div v-else-if="step === 3 && !transitioning" key="step3" class="step-card">
            <div class="card-glow card-glow-coral"></div>
            <div class="card-inner">
              <div class="card-top">
                <div class="card-icon-wrap coral">
                  <span class="card-icon">🎯</span>
                </div>
                <div class="card-title-area">
                  <h2>Personal Target</h2>
                  <p>Define your starting point. Only you and the coach see this.</p>
                </div>
              </div>

              <div class="form-stack">
                <div class="dates-grid">
                  <div class="input-group">
                    <label>
                      <span class="label-icon">⚖️</span>
                      Current Weight (lbs)
                    </label>
                    <input v-model="startWeight" type="number" step="0.1" class="premium-input" placeholder="0.0" />
                  </div>
                  <div class="input-group">
                    <label>
                      <span class="label-icon">🏆</span>
                      Goal Weight (lbs)
                    </label>
                    <input v-model="goalWeight" type="number" step="0.1" class="premium-input" placeholder="0.0" />
                  </div>
                </div>

                <Transition name="expand">
                  <div v-if="weeklyLoss > 0" class="goal-breakdown">
                    <div class="goal-card-row">
                      <div class="goal-metric">
                        <div class="metric-ring lime-ring">
                          <span class="metric-value">{{ weeklyLoss }}</span>
                        </div>
                        <span class="metric-label">lbs/week</span>
                      </div>
                      <div class="goal-metric">
                        <div class="metric-ring coral-ring">
                          <span class="metric-value">{{ totalLoss }}</span>
                        </div>
                        <span class="metric-label">total loss</span>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>

              <div class="btn-row">
                <button class="cta-btn cta-ghost" @click="prevStep">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Back</span>
                </button>
                <button class="cta-btn cta-launch" @click="handleCreate">
                  <span>Launch Challenge</span>
                  <span class="launch-emoji">🚀</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Page ── */
.create-group-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding-bottom: calc(120px + env(safe-area-inset-bottom));
}

/* ── Ambient Background ── */
.ambient-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.35;
  animation: orbFloat 16s ease-in-out infinite;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: var(--accent-lime);
  top: -10%;
  right: -10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: var(--accent-purple);
  bottom: 10%;
  left: -8%;
  animation-delay: -5s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: var(--accent-coral);
  top: 60%;
  right: 20%;
  animation-delay: -10s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -40px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* ── Wrapper ── */
.create-wrapper {
  max-width: 600px;
  margin: 0 auto;
  padding-top: max(48px, calc(16px + env(safe-area-inset-top)));
  position: relative;
  z-index: 1;
}

/* ── Header ── */
.create-header {
  text-align: center;
  margin-bottom: 48px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  background: rgba(217, 255, 77, 0.08);
  border: 1px solid rgba(217, 255, 77, 0.2);
  color: var(--accent-lime);
  font-size: 0.8rem;
  font-weight: 700;
  font-family: var(--font-heading);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-lime);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}

.page-title {
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.1;
  margin-bottom: 12px;
}

.title-accent {
  background: linear-gradient(135deg, var(--accent-lime), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
  max-width: 380px;
  margin: 0 auto;
}

/* ── Stepper ── */
.stepper-container {
  margin-bottom: 40px;
  padding: 0 20px;
}

.stepper-track {
  position: absolute;
  left: 20px;
  right: 20px;
  top: 24px;
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  z-index: 0;
}

.stepper-progress {
  height: 100%;
  border-radius: 4px;
  background: var(--gradient-lime);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 12px var(--accent-lime-glow);
}

.stepper-nodes {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.stepper-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.node-circle {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.stepper-node.upcoming .node-circle {
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
}

.stepper-node.active .node-circle {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid var(--accent-lime);
  box-shadow: 0 0 24px var(--accent-lime-glow), inset 0 0 12px rgba(217, 255, 77, 0.08);
  transform: scale(1.1);
}

.stepper-node.completed .node-circle {
  background: var(--accent-lime-dim);
  border: 2px solid var(--accent-lime);
  color: var(--accent-lime);
}

.check-svg {
  width: 20px;
  height: 20px;
}

.node-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  transition: color 0.3s;
}

.stepper-node.active .node-label {
  color: var(--accent-lime);
}

.stepper-node.completed .node-label {
  color: var(--text-secondary);
}

/* ── Step Card ── */
.step-card {
  position: relative;
  border-radius: var(--radius-card);
  overflow: hidden;
}

.card-glow {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-card);
  opacity: 0.5;
  z-index: 0;
  transition: opacity 0.5s;
}

.card-glow-lime {
  box-shadow: inset 0 1px 0 rgba(217, 255, 77, 0.15), 0 0 80px -20px rgba(217, 255, 77, 0.12);
}

.card-glow-purple {
  box-shadow: inset 0 1px 0 rgba(179, 153, 255, 0.15), 0 0 80px -20px rgba(179, 153, 255, 0.12);
}

.card-glow-coral {
  box-shadow: inset 0 1px 0 rgba(255, 112, 67, 0.15), 0 0 80px -20px rgba(255, 112, 67, 0.12);
}

.card-inner {
  position: relative;
  z-index: 1;
  background: rgba(16, 16, 18, 0.75);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--radius-card);
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.card-top {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.card-icon-wrap {
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(217, 255, 77, 0.12), rgba(217, 255, 77, 0.04));
  border: 1px solid rgba(217, 255, 77, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.card-icon-wrap.purple {
  background: linear-gradient(135deg, rgba(179, 153, 255, 0.12), rgba(179, 153, 255, 0.04));
  border-color: rgba(179, 153, 255, 0.15);
}

.card-icon-wrap.coral {
  background: linear-gradient(135deg, rgba(255, 112, 67, 0.12), rgba(255, 112, 67, 0.04));
  border-color: rgba(255, 112, 67, 0.15);
}

.card-title-area h2 {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.card-title-area p {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
}

/* ── Forms ── */
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.input-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: var(--font-heading);
}

.label-icon {
  font-size: 0.9rem;
}

.premium-input {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 1rem;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
}

.premium-input:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
}

.premium-input:focus {
  border-color: var(--accent-lime);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 4px var(--accent-lime-dim), 0 0 20px rgba(217, 255, 77, 0.08);
}

.premium-input::placeholder {
  color: var(--text-muted);
}

.premium-textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.6;
}

.dates-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* ── Stats Ribbon ── */
.stats-ribbon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(179, 153, 255, 0.06), rgba(217, 255, 77, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 2.25rem;
  font-weight: 900;
  font-family: var(--font-heading);
  line-height: 1;
}

.stat-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.08);
}

.lime-text { color: var(--accent-lime); }
.purple-text { color: var(--accent-purple); }

/* ── Goal Breakdown ── */
.goal-breakdown {
  padding: 28px;
  background: linear-gradient(135deg, rgba(217, 255, 77, 0.05), rgba(255, 112, 67, 0.05));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 22px;
}

.goal-card-row {
  display: flex;
  justify-content: space-around;
  gap: 24px;
}

.goal-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.metric-ring {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.lime-ring {
  background: radial-gradient(circle, rgba(217, 255, 77, 0.1), transparent 70%);
  border: 2px solid rgba(217, 255, 77, 0.25);
  box-shadow: 0 0 30px rgba(217, 255, 77, 0.1);
}

.coral-ring {
  background: radial-gradient(circle, rgba(255, 112, 67, 0.1), transparent 70%);
  border: 2px solid rgba(255, 112, 67, 0.25);
  box-shadow: 0 0 30px rgba(255, 112, 67, 0.1);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 900;
  font-family: var(--font-heading);
}

.lime-ring .metric-value { color: var(--accent-lime); }
.coral-ring .metric-value { color: var(--accent-coral); }

.metric-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Buttons ── */
.btn-row {
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px 28px;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.01em;
}

.cta-primary {
  background: var(--gradient-lime);
  color: #080808;
  box-shadow: 0 4px 24px var(--accent-lime-glow);
  flex: 1;
}

.cta-primary:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 40px var(--accent-lime-glow);
}

.cta-primary:active {
  transform: translateY(0) scale(0.98);
}

.cta-ghost {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.cta-ghost:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.cta-launch {
  background: linear-gradient(135deg, var(--accent-lime), #a8cf2b, var(--accent-lime));
  background-size: 200% 200%;
  color: #080808;
  flex: 1;
  font-size: 1rem;
  padding: 16px 32px;
  box-shadow: 0 4px 24px var(--accent-lime-glow);
  animation: shimmerGradient 3s ease-in-out infinite;
}

.cta-launch:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 12px 48px var(--accent-lime-glow);
}

.cta-launch:active {
  transform: translateY(0) scale(0.98);
}

.launch-emoji {
  font-size: 1.2rem;
  display: inline-block;
  animation: rocketBounce 2s ease-in-out infinite;
}

@keyframes rocketBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes shimmerGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ── Error Banner ── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(255, 112, 67, 0.06);
  border: 1px solid rgba(255, 112, 67, 0.2);
  border-radius: 16px;
  color: var(--accent-coral);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.error-icon {
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 8px;
  background: var(--accent-coral);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 0.75rem;
}

/* ── Transitions ── */
.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.97);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-16px) scale(0.97);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.shake-enter-active {
  animation: shakeIn 0.5s ease;
}

@keyframes shakeIn {
  0% { transform: translateX(-10px); opacity: 0; }
  25% { transform: translateX(8px); }
  50% { transform: translateX(-5px); }
  75% { transform: translateX(3px); }
  100% { transform: translateX(0); opacity: 1; }
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .create-wrapper {
    padding-top: 24px;
  }

  .page-title {
    font-size: 2.25rem;
  }

  .card-inner {
    padding: 32px 24px;
    width: 100%;
    box-sizing: border-box;
  }

  .card-top {
    flex-direction: column;
    gap: 12px;
  }

  .dates-grid {
    grid-template-columns: 1fr;
    width: 100%;
    box-sizing: border-box;
  }
  
  .premium-input {
    padding: 14px 16px;
    font-size: 0.95rem;
  }

  .node-circle {
    width: 40px;
    height: 40px;
    border-radius: 13px;
    font-size: 1rem;
  }

  .stepper-track {
    top: 20px;
  }

  .goal-card-row {
    flex-direction: row;
    gap: 16px;
  }

  .metric-ring {
    width: 72px;
    height: 72px;
  }

  .orb-1 { width: 300px; height: 300px; }
  .orb-2 { width: 250px; height: 250px; }
  .orb-3 { width: 200px; height: 200px; }
}

/* Date input styling for dark theme */
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.5;
  cursor: pointer;
}

input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 0.8;
}
</style>
