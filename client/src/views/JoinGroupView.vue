<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupStore } from '@/stores/groups'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'

const route = useRoute()
const router = useRouter()
const groups = useGroupStore()
const authStore = useAuthStore()

const token = route.params.token
const invite = ref(null)
const startWeight = ref('')
const goalWeight = ref('')
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const { data: inviteData, error: inviteErr } = await supabase
      .from('group_invites')
      .select('*, groups(name)')
      .eq('token', token)
      .single()
      
    if (inviteErr || !inviteData) throw new Error('This invite link is invalid or has expired.')
    
    let alreadyMember = false
    if (authStore.user) {
       const { data: memberData } = await supabase
         .from('group_members')
         .select('*')
         .eq('group_id', inviteData.group_id)
         .eq('user_id', authStore.user.id)
         .single()
       if (memberData) alreadyMember = true
    }

    invite.value = {
       ...inviteData,
       groupId: inviteData.group_id,
       groupName: inviteData.groups?.name,
       alreadyMember
    }
    
    if (inviteData.status !== 'PENDING') {
      error.value = `This invite has already been ${inviteData.status.toLowerCase()}.`
    }
  } catch (e) {
    error.value = e.message || 'This invite link is invalid or has expired.'
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
    error.value = e.message || 'Failed to join group'
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
  <div class="fk-join-page">
    <div class="fk-join-glow"></div>
    <div class="fk-join-container">
      <div class="fk-join-wrapper">
        <!-- Loading -->
        <div v-if="loading" class="fk-join-card fk-join-loading">
          <div class="fk-pulse-box"></div>
          <p>VERIFYING INVITATION...</p>
        </div>

        <!-- Error (no invite) -->
        <div v-else-if="error && !invite" class="fk-join-card fk-join-center">
          <div class="fk-join-error-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          </div>
          <h2>INVALID INVITATION</h2>
          <p class="fk-join-subtext">{{ error }}</p>
          <router-link to="/dashboard" class="fk-join-btn-ghost">
            BACK TO DASHBOARD
          </router-link>
        </div>

        <template v-else>
          <!-- Header -->
          <div class="fk-join-header">
            <span class="fk-join-badge">NEW CHALLENGE</span>
            <h1 class="fk-join-title">YOU'RE <span class="fk-accent">INVITED</span></h1>
            <p v-if="invite" class="fk-join-subtitle">
              Join <strong>{{ invite.groupName }}</strong> and start your journey.
            </p>
          </div>

          <!-- Already member -->
          <div v-if="invite?.alreadyMember" class="fk-join-card fk-join-center">
            <div class="fk-join-icon-circle">👋</div>
            <h2>ALREADY IN THE TEAM</h2>
            <p class="fk-join-subtext">
              You are already a member of <strong>{{ invite.groupName }}</strong>.
            </p>
            <router-link :to="`/groups/${invite.groupId}`" class="fk-join-btn-lime">
              ENTER GROUP
            </router-link>
          </div>

          <!-- Invite expired -->
          <div v-else-if="invite?.status !== 'PENDING'" class="fk-join-card fk-join-center">
            <div class="fk-join-error-icon">🚫</div>
            <h2>INVITE UNAVAILABLE</h2>
            <p class="fk-join-subtext">{{ error }}</p>
            <router-link to="/dashboard" class="fk-join-btn-ghost">
              BACK TO DASHBOARD
            </router-link>
          </div>

          <!-- Join form -->
          <div v-else class="fk-join-card">
            <div class="fk-join-form-header">
              <div class="fk-join-icon-circle">🎯</div>
              <div>
                <h2>SET YOUR MISSION</h2>
                <p class="fk-join-subtext">Define your starting point for this challenge.</p>
                <div v-if="invite?.endDate" class="fk-join-deadline">
                  ⏳ Goal weight needed by: <strong>{{ formatDate(invite.endDate) }}</strong>
                </div>
              </div>
            </div>

            <div v-if="error" class="fk-join-error-inline">{{ error }}</div>

            <div class="fk-join-grid">
              <div class="fk-input-group">
                <label>STARTING WEIGHT (LBS)</label>
                <input v-model="startWeight" type="number" step="0.1" placeholder="0.0" />
              </div>
              <div class="fk-input-group">
                <label>GOAL WEIGHT (LBS)</label>
                <input v-model="goalWeight" type="number" step="0.1" placeholder="0.0" />
              </div>
            </div>

            <button class="fk-join-btn-lime fk-join-btn-full" @click="handleJoin">
              ACCEPT CHALLENGE & JOIN
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fk-join-page {
  background: #0e0e0e;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: max(24px, calc(12px + env(safe-area-inset-top))) 24px max(120px, calc(100px + env(safe-area-inset-bottom))) 24px;
}

.fk-join-glow {
  position: absolute;
  top: -10vh;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(223, 255, 0, 0.05) 0%, transparent 70%);
  pointer-events: none;
}

.fk-join-container {
  position: relative;
  z-index: 1;
}

.fk-join-wrapper {
  max-width: 520px;
  margin: 0 auto;
  padding-top: 40px;
}

.fk-join-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 40px;
}

.fk-pulse-box {
  width: 40px;
  height: 40px;
  background: #DFFF00;
  border-radius: 12px;
  margin-bottom: 24px;
  animation: fk-pulse 2s infinite;
}

@keyframes fk-pulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

.fk-join-loading p {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.4);
}

.fk-join-card {
  background: #131313;
  border-radius: 24px;
  padding: 40px;
}

.fk-join-center {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fk-join-center h2 {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.3rem;
  letter-spacing: 0.04em;
  color: #fff;
  margin-bottom: 8px;
}

.fk-join-error-icon {
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: rgba(255,255,255,0.3);
}

.fk-join-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(255,255,255,0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 16px;
}

/* Header */
.fk-join-header {
  text-align: center;
  margin-bottom: 32px;
}

.fk-join-badge {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(179, 153, 255, 0.1);
  color: #b399ff;
  border-radius: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}

.fk-join-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-style: italic;
  font-size: 2.8rem;
  letter-spacing: -0.02em;
  color: #fff;
  margin-bottom: 12px;
  line-height: 1.05;
}

.fk-accent {
  color: #DFFF00;
}

.fk-join-subtitle {
  color: rgba(255, 255, 255, 0.45);
  font-size: 1.1rem;
}

.fk-join-subtext {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.95rem;
  margin-bottom: 24px;
}

/* Form */
.fk-join-form-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
}

.fk-join-form-header .fk-join-icon-circle {
  margin-bottom: 0;
  flex-shrink: 0;
}

.fk-join-form-header h2 {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: 0.04em;
  color: #fff;
  margin-bottom: 4px;
}

.fk-join-deadline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 14px;
  background: rgba(223, 255, 0, 0.05);
  border-radius: 100px;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.5);
}

.fk-join-deadline strong {
  color: #DFFF00;
}

.fk-join-error-inline {
  padding: 12px 16px;
  background: rgba(255, 112, 67, 0.08);
  border-left: 3px solid #ff7043;
  border-radius: 8px;
  margin-bottom: 24px;
  color: #ff7043;
  font-weight: 600;
  font-size: 0.85rem;
}

.fk-join-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
}

.fk-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fk-input-group label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
}

.fk-input-group input {
  padding: 16px 18px;
  background: rgba(255,255,255,0.03);
  border: none;
  border-bottom: 2px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  transition: all 0.3s;
  outline: none;
  -webkit-appearance: none;
}

.fk-input-group input:focus {
  border-bottom-color: #DFFF00;
  background: rgba(255,255,255,0.05);
}

.fk-input-group input::placeholder {
  color: rgba(255,255,255,0.15);
}

/* Buttons */
.fk-join-btn-lime {
  display: inline-block;
  padding: 16px 32px;
  background: #DFFF00;
  color: #0e0e0e;
  border: none;
  border-radius: 14px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.fk-join-btn-lime:hover {
  background: #f6ffc0;
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(223, 255, 0, 0.25);
}

.fk-join-btn-full {
  width: 100%;
}

.fk-join-btn-ghost {
  display: inline-block;
  padding: 14px 28px;
  background: rgba(255,255,255,0.04);
  color: #fff;
  border-radius: 14px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-decoration: none;
  transition: all 0.3s;
}

.fk-join-btn-ghost:hover {
  background: rgba(255,255,255,0.08);
}

@media (max-width: 640px) {
  .fk-join-card { padding: 28px 22px; }
  .fk-join-grid { grid-template-columns: 1fr; }
  .fk-join-title { font-size: 2.2rem; }
  .fk-join-form-header { flex-direction: column; }
}
</style>
