<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGroupStore } from '@/stores/groups'
import { useNotificationStore } from '@/stores/notifications'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const groups = useGroupStore()
const notifications = useNotificationStore()
const router = useRouter()
const uploading = ref(false)
const uploadSuccess = ref(false)
const fileInput = ref(null)

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const triggerFileInput = () => {
  if (uploading.value) return
  fileInput.value?.click()
}

const handleFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // Validate size
  if (file.size > 5000000) {
    alert('File size must be less than 5MB')
    return
  }

  uploading.value = true
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'fitforge')

    const res = await fetch('https://api.cloudinary.com/v1_1/dho7jd4k8/image/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!res.ok) {
      throw new Error('Upload failed')
    }
    
    const result = await res.json()
    await auth.updateProfile({ avatarUrl: result.secure_url })
    
    uploadSuccess.value = true
    setTimeout(() => { uploadSuccess.value = false }, 3000)
  } catch (err) {
    console.error('Failed to update avatar:', err)
  } finally {
    uploading.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

const logout = async () => {
  await auth.logout()
  // Clear all cached store data
  groups.$reset()
  notifications.$reset()
  // Replace (not push) so back button won't return to stale authenticated page
  router.replace('/login')
}
</script>

<template>
  <div class="fk-profile-page">
    <!-- Ambient glow effects -->
    <div class="fk-profile-glow"></div>
    <div class="fk-profile-glow-secondary"></div>

    <div class="fk-profile-container">
      <!-- Avatar + Identity cluster -->
      <section class="fk-hero-cluster">
        <input type="file" ref="fileInput" @change="handleFileChange" accept="image/*" style="display: none" />
        <div class="fk-avatar-ring" @click="triggerFileInput" :class="{ uploading }">
          <div class="fk-avatar-display" :style="{ opacity: uploading ? 0.5 : 1, transition: 'opacity 0.3s' }">
            <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt="Profile avatar" class="fk-avatar-img" />
            <div v-else class="fk-avatar-initials">
              {{ getInitials(auth.user?.displayName) }}
            </div>
          </div>
          <div class="fk-avatar-overlay" :style="{ opacity: uploading ? 1 : '' }">
            <svg v-if="!uploading" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="fk-simple-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          </div>
          <!-- Edit badge -->
          <div v-if="!uploading" class="fk-avatar-edit-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0e0e0e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>

        <!-- Success toast -->
        <transition name="fk-fade">
          <div v-if="uploadSuccess" class="fk-upload-toast">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Avatar updated!
          </div>
        </transition>

        <h1 class="fk-profile-name">{{ auth.user?.displayName || 'Athlete' }}</h1>
        <p class="fk-profile-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          Tap avatar to update · 5 MB max
        </p>
      </section>

      <!-- Account Info Card -->
      <section class="fk-profile-card">
        <h3 class="fk-card-heading">ACCOUNT</h3>
        <div class="fk-card-row">
          <div class="fk-card-row-left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Name</span>
          </div>
          <span class="fk-card-row-value">{{ auth.user?.displayName }}</span>
        </div>
        <div class="fk-card-row">
          <div class="fk-card-row-left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <span>Email</span>
          </div>
          <span class="fk-card-row-value fk-card-row-email">{{ auth.user?.email }}</span>
        </div>
      </section>

      <!-- Logout -->
      <section class="fk-system-section">
        <button class="fk-logout-btn" @click="logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          SIGN OUT
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.fk-profile-page {
  background: #0e0e0e;
  position: fixed;
  inset: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

/* Primary ambient glow */
.fk-profile-glow {
  position: absolute;
  top: -20vh;
  left: 50%;
  transform: translateX(-50%);
  width: 140vw;
  height: 60vh;
  background: radial-gradient(ellipse at top, rgba(223, 255, 0, 0.05) 0%, transparent 55%);
  pointer-events: none;
  z-index: 0;
}

/* Secondary subtle accent glow */
.fk-profile-glow-secondary {
  position: absolute;
  bottom: 10vh;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  height: 30vh;
  background: radial-gradient(ellipse at bottom, rgba(223, 255, 0, 0.02) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.fk-profile-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  max-width: 440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 1;
  gap: 16px;
}

/* Hero cluster: avatar + name + hint */
.fk-hero-cluster {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
}

/* Avatar */
.fk-avatar-ring {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 24px;
  cursor: pointer;
  transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  flex-shrink: 0;
}

.fk-avatar-ring:active {
  transform: scale(0.96);
}

.fk-avatar-ring:hover .fk-avatar-overlay {
  opacity: 1;
}

.fk-avatar-display {
  width: 100%;
  height: 100%;
  border-radius: 24px;
  overflow: hidden;
  border: 2.5px solid rgba(223, 255, 0, 0.15);
  position: relative;
  z-index: 1;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.fk-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fk-avatar-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #1a1a1a, #131313);
  color: #DFFF00;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 900;
  font-size: 2rem;
}

.fk-avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 24px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 2;
}

.fk-avatar-edit-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 26px;
  height: 26px;
  background: #DFFF00;
  border-radius: 50%;
  border: 3px solid #0e0e0e;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-shadow: 0 2px 8px rgba(223, 255, 0, 0.2);
}

.fk-simple-spin {
  animation: fk-simple-spin 1s linear infinite;
}

@keyframes fk-simple-spin {
  to { transform: rotate(360deg); }
}

/* Upload toast */
.fk-upload-toast {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 16px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 100px;
  color: #10B981;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
}

.fk-fade-enter-active,
.fk-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.fk-fade-enter-from,
.fk-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Name */
.fk-profile-name {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 2rem;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: #fff;
  margin-top: 14px;
  margin-bottom: 0;
}

/* Hint */
.fk-profile-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.18);
  font-size: 0.72rem;
  margin-top: 6px;
  letter-spacing: 0.01em;
}

/* Card */
.fk-profile-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 18px;
  padding: 18px 20px;
}

.fk-card-heading {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 8px;
}

.fk-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.fk-card-row + .fk-card-row {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.fk-card-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.82rem;
  font-weight: 600;
}

.fk-card-row-value {
  color: #fff;
  font-weight: 700;
  font-size: 0.82rem;
}

.fk-card-row-email {
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* System / Logout */
.fk-system-section {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.fk-logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 36px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.1);
  border-radius: 14px;
  color: #ef4444;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
  max-width: 260px;
  justify-content: center;
}

.fk-logout-btn:hover {
  background: #ef4444;
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.25);
  transform: translateY(-2px);
}

.fk-logout-btn:active {
  transform: translateY(0) scale(0.98);
}

/* ---- Responsive fine-tuning ---- */

/* Small phones (SE, Mini, etc.) */
@media (max-height: 680px) {
  .fk-avatar-ring {
    width: 80px;
    height: 80px;
    border-radius: 20px;
  }
  .fk-avatar-display {
    border-radius: 20px;
  }
  .fk-avatar-overlay {
    border-radius: 20px;
  }
  .fk-avatar-initials {
    font-size: 1.6rem;
  }
  .fk-profile-name {
    font-size: 1.6rem;
    margin-top: 10px;
  }
  .fk-profile-card {
    padding: 14px 16px;
  }
  .fk-card-row {
    padding: 10px 0;
  }
  .fk-logout-btn {
    padding: 12px 28px;
  }
  .fk-profile-container {
    gap: 12px;
  }
}

/* Tall phones (Pro Max, Ultra, etc.) */
@media (min-height: 800px) {
  .fk-avatar-ring {
    width: 110px;
    height: 110px;
  }
  .fk-profile-name {
    font-size: 2.2rem;
    margin-top: 16px;
  }
  .fk-profile-container {
    gap: 20px;
  }
  .fk-profile-card {
    padding: 22px 24px;
  }
}

/* Very tall phones / tablets */
@media (min-height: 1000px) {
  .fk-avatar-ring {
    width: 120px;
    height: 120px;
  }
  .fk-profile-name {
    font-size: 2.5rem;
  }
  .fk-profile-container {
    gap: 24px;
  }
}
</style>
