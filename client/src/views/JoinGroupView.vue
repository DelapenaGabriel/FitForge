<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupStore } from '@/stores/groups'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const groups = useGroupStore()

const token = route.params.token
const invite = ref(null)
const startWeight = ref('')
const goalWeight = ref('')
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get(`/invites/${token}`)
    invite.value = data
    if (data.status !== 'PENDING') {
      error.value = `This invite has already been ${data.status.toLowerCase()}.`
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'This invite link is invalid or has expired.'
  } finally {
    loading.value = false
  }
})

const handleJoin = async () => {
  if (!startWeight.value || !goalWeight.value) {
    error.value = 'Please enter both weights'
    return
  }
  try {
    const group = await groups.acceptInvite(token, parseFloat(startWeight.value), parseFloat(goalWeight.value))
    router.push(`/groups/${group.id}`)
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to join group'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  // Handle potentially different date formats from Spring Boot
  const d = new Date(Array.isArray(dateString) ? `${dateString[0]}-${String(dateString[1]).padStart(2, '0')}-${String(dateString[2]).padStart(2, '0')}T00:00:00` : dateString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="join-group-page">
    <div class="container">
      <div class="join-wrapper animate-in">
        <div v-if="loading" class="glass-card loading-box">
          <div class="pulse-loader"></div>
          <p>Verifying Invitation...</p>
        </div>

        <div v-else-if="error && !invite" class="glass-card shadow-premium error-box">
          <span class="error-emoji">😔</span>
          <h2>Invalid Invitation</h2>
          <p class="error-text">{{ error }}</p>
          <router-link to="/dashboard" class="btn-premium btn-glass mt-24">
            Back to Dashboard
          </router-link>
        </div>

        <template v-else>
          <div class="invite-header-premium">
            <div class="celebrate-badge">NEW CHALLENGE</div>
            <h1 class="page-title">You're <span class="gradient-text-purple">Invited!</span></h1>
            <p v-if="invite" class="invite-detail">
              Join <strong>{{ invite.groupName }}</strong> and start your journey.
            </p>
          </div>

          <div v-if="invite?.alreadyMember" class="glass-card shadow-premium info-box">
            <span class="info-emoji">👋</span>
            <h2>Already in the Team!</h2>
            <p class="info-text">
              You are already a member of <strong>{{ invite.groupName }}</strong>.
            </p>
            <router-link :to="`/groups/${invite.groupId}`" class="btn-premium btn-lime mt-24">
              Enter Group
            </router-link>
          </div>

          <div v-else-if="invite?.status !== 'PENDING'" class="glass-card shadow-premium error-box">
            <span class="error-emoji">🚫</span>
            <h2>Invite Unavailable</h2>
            <p class="error-text">{{ error }}</p>
            <router-link to="/dashboard" class="btn-premium btn-glass mt-24">
              Back to Dashboard
            </router-link>
          </div>

          <div v-else class="glass-card shadow-premium join-form-premium">
            <div class="form-header">
              <span class="icon-circle">🎯</span>
              <div class="header-text">
                <h2>Set Your Mission</h2>
                <p>Define your starting point for this challenge.</p>
                <div v-if="invite?.endDate" class="deadline-badge animate-in animate-in-delay-2">
                  <span class="deadline-icon">⏳</span>
                  <span>Goal weight needed by: <strong class="gradient-text">{{ formatDate(invite.endDate) }}</strong></span>
                </div>
              </div>
            </div>

            <div v-if="error" class="error-banner-inline">{{ error }}</div>

            <div class="form-grid">
              <div class="form-group-premium">
                <label>Starting Weight (lbs)</label>
                <input v-model="startWeight" type="number" step="0.1" class="form-input" placeholder="0.0" />
              </div>
              <div class="form-group-premium">
                <label>Goal Weight (lbs)</label>
                <input v-model="goalWeight" type="number" step="0.1" class="form-input" placeholder="0.0" />
              </div>
            </div>

            <button class="btn btn-primary btn-lg w-full mt-32 btn-gorgeous" @click="handleJoin">
              <span class="btn-text">Accept Challenge & Join</span>
              <span class="btn-shine"></span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.join-group-page {
  background: var(--bg-primary);
  min-height: 100vh;
}

.join-wrapper {
  max-width: 520px;
  margin: 0 auto;
  padding-top: 60px;
}

.loading-box, .error-box, .info-box {
  padding: 60px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pulse-loader {
  width: 40px;
  height: 40px;
  background: var(--accent-lime);
  border-radius: 12px;
  margin-bottom: 24px;
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

.error-emoji, .info-emoji { font-size: 3.5rem; margin-bottom: 20px; display: block; }

.error-text, .info-text {
  color: var(--text-secondary);
  margin-top: 12px;
  font-size: 1.1rem;
}

.invite-header-premium {
  text-align: center;
  margin-bottom: 40px;
}

.celebrate-badge {
  display: inline-block;
  padding: 4px 12px;
  background: var(--accent-purple-dim);
  color: var(--accent-purple);
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}

.page-title {
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  margin-bottom: 12px;
}

.invite-detail {
  color: var(--text-secondary);
  font-size: 1.15rem;
}

.join-form-premium {
  padding: 48px;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 40px;
}

.icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.header-text h2 {
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.header-text p {
  color: var(--text-secondary);
  font-size: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group-premium {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group-premium label {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.error-banner-inline {
  padding: 12px 16px;
  background: var(--accent-coral-dim);
  color: var(--accent-coral);
  border-radius: 12px;
  margin-bottom: 24px;
  font-weight: 600;
  font-size: 0.9rem;
  border-left: 4px solid var(--accent-coral);
}

.mt-24 { margin-top: 24px; }
.mt-32 { margin-top: 32px; }
.w-full { width: 100%; }

@media (max-width: 640px) {
  .join-wrapper { padding-top: 40px; }
  .join-form-premium { padding: 32px 24px; }
  .form-grid { grid-template-columns: 1fr; }
  .page-title { font-size: 2.25rem; }
  .form-header { margin-bottom: 32px; flex-direction: column; text-align: center; }
}

/* ── Deadline Badge ── */
.deadline-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 16px;
  background: rgba(217, 255, 77, 0.05);
  border: 1px solid rgba(217, 255, 77, 0.1);
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.deadline-icon {
  font-size: 1.1rem;
}

/* ── Gorgeous Button ── */
.btn-gorgeous {
  position: relative;
  overflow: hidden;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #d9ff4d 0%, #a8cf2b 50%, #d9ff4d 100%);
  background-size: 200% auto;
  color: #080808;
  border: none;
  box-shadow: 0 8px 32px rgba(217, 255, 77, 0.25), 
              inset 0 2px 0 rgba(255, 255, 255, 0.5), 
              inset 0 -2px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.btn-gorgeous:hover {
  transform: translateY(-4px) scale(1.02);
  background-position: right center;
  box-shadow: 0 12px 40px rgba(217, 255, 77, 0.4), 
              inset 0 2px 0 rgba(255, 255, 255, 0.5), 
              inset 0 -2px 0 rgba(0, 0, 0, 0.1);
}

.btn-gorgeous:active {
  transform: translateY(0) scale(0.98);
}

.btn-gorgeous .btn-text {
  position: relative;
  z-index: 2;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
  transform: skewX(-25deg);
  animation: shine 3s infinite;
  z-index: 1;
}

@keyframes shine {
  0% { left: -100%; }
  20% { left: 200%; }
  100% { left: 200%; }
}
</style>

