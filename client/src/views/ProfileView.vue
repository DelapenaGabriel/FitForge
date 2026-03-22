<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const uploading = ref(false)
const uploadSuccess = ref(false)

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const openAvatarUpload = () => {
  uploading.value = true
  window.cloudinary.openUploadWidget(
    {
      cloudName: 'dilpitidj',
      uploadPreset: 'fitforge',
      sources: ['local', 'camera'],
      multiple: false,
      maxFiles: 1,
      cropping: true,
      croppingAspectRatio: 1,
      croppingShowDimensions: true,
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      maxFileSize: 5000000,
      showSkipCropButton: false,
      singleUploadAutoClose: false,
      styles: {
        palette: {
          window: '#1A1A1A',
          sourceBg: '#242424',
          windowBorder: '#333333',
          tabIcon: '#2DD4BF',
          inactiveTabIcon: '#94A3B8',
          menuIcons: '#2DD4BF',
          link: '#2DD4BF',
          action: '#2DD4BF',
          inProgress: '#F59E0B',
          complete: '#10B981',
          error: '#EF4444',
          textDark: '#000000',
          textLight: '#F8FAFC',
        },
      },
    },
    async (error, result) => {
      if (error) {
        uploading.value = false
        return
      }
      if (result.event === 'close') {
        uploading.value = false
        return
      }
      if (result.event === 'success') {
        try {
          await auth.updateProfile({ avatarUrl: result.info.secure_url })
          uploadSuccess.value = true
          setTimeout(() => { uploadSuccess.value = false }, 3000)
        } catch (err) {
          console.error('Failed to update avatar:', err)
        } finally {
          uploading.value = false
        }
      }
    },
  )
}
const logout = () => {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="page profile-page">
    <div class="container">
      <header class="profile-header animate-in">
        <router-link to="/dashboard" class="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </router-link>
        <h1 class="page-title">Profile</h1>
      </header>

      <!-- Avatar Section -->
      <section class="avatar-section animate-in animate-in-delay-1">
        <div class="avatar-upload-ring" @click="openAvatarUpload" :class="{ uploading }">
          <div class="avatar-display">
            <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt="Profile avatar" class="avatar-image" />
            <div v-else class="avatar-initials">
              {{ getInitials(auth.user?.displayName) }}
            </div>
          </div>
          <div class="avatar-overlay">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>Change Photo</span>
          </div>
          <!-- Spinner ring -->
          <svg v-if="uploading" class="spinner-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="56" />
          </svg>
        </div>

        <!-- Success flash -->
        <transition name="fade">
          <div v-if="uploadSuccess" class="upload-success-toast">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Avatar updated!
          </div>
        </transition>
      </section>

      <!-- User Info Card -->
      <section class="user-info-card glass-card animate-in animate-in-delay-2">
        <div class="info-row">
          <span class="info-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Display Name
          </span>
          <span class="info-value">{{ auth.user?.displayName }}</span>
        </div>
        <div class="info-divider"></div>
        <div class="info-row">
          <span class="info-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Email
          </span>
          <span class="info-value">{{ auth.user?.email }}</span>
        </div>
      </section>

      <!-- Tip -->
      <p class="upload-hint animate-in animate-in-delay-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        Tap the avatar to upload a new photo. Max 5 MB.
      </p>

      <!-- Logout Button -->
      <div class="logout-section animate-in animate-in-delay-4">
        <button class="btn-logout" @click="logout">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  background: var(--bg-primary);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.profile-page::before {
  content: '';
  position: absolute;
  top: -30vh;
  left: 50%;
  transform: translateX(-50%);
  width: 150vw;
  height: 80vh;
  background: radial-gradient(ellipse at top, var(--accent-lime-glow) 0%, transparent 60%);
  z-index: 0;
  pointer-events: none;
  opacity: 0.6;
}

.container {
  position: relative;
  z-index: 10;
  padding-bottom: 120px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 40px 0 24px;
}

.back-link {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  text-decoration: none;
  transition: all 0.3s;
  flex-shrink: 0;
}

.back-link:hover {
  background: var(--accent-lime);
  color: #000;
  border-color: var(--accent-lime);
}

.page-title {
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 2rem;
  letter-spacing: -0.03em;
}

/* Avatar Section */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0 24px;
}

.avatar-upload-ring {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.avatar-upload-ring:hover {
  transform: scale(1.05);
}

.avatar-upload-ring:hover .avatar-overlay {
  opacity: 1;
}

.avatar-display {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--border-glass);
  position: relative;
  z-index: 1;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(163, 230, 53, 0.1);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(163, 230, 53, 0.2), rgba(163, 230, 53, 0.05));
  color: var(--accent-lime);
  font-family: var(--font-heading);
  font-weight: 900;
  font-size: 3rem;
  letter-spacing: -0.02em;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 2;
}

.avatar-upload-ring.uploading .avatar-overlay {
  opacity: 0;
}

/* Spinner Ring */
.spinner-ring {
  position: absolute;
  inset: -6px;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
  z-index: 3;
  animation: spin 1.2s linear infinite;
}

.spinner-ring circle {
  fill: none;
  stroke: var(--accent-lime);
  stroke-width: 3;
  stroke-dasharray: 100 250;
  stroke-linecap: round;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Success Toast */
.upload-success-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 20px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-full);
  color: #10B981;
  font-weight: 700;
  font-size: 0.85rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* User Info Card */
.user-info-card {
  padding: 0;
  overflow: hidden;
  margin-top: 16px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-value {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
}

.info-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 0 24px;
}

/* Hint */
.upload-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.logout-section {
  margin-top: 48px;
  display: flex;
  justify-content: center;
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-xl);
  color: #ef4444;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  max-width: 300px;
  justify-content: center;
}

.btn-logout:hover {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
  transform: translateY(-2px);
}

.btn-logout:active {
  transform: translateY(0);
}

@media (max-width: 640px) {
  .avatar-upload-ring {
    width: 120px;
    height: 120px;
  }

  .avatar-initials {
    font-size: 2.5rem;
  }

  .page-title {
    font-size: 1.5rem;
  }
}
</style>
