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

            <button class="btn-premium btn-lime btn-lg w-full mt-32" @click="handleJoin">
              Accept Challenge & Join
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
</style>

