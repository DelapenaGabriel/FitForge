<script setup>
import { onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import AppNavbar from '@/components/AppNavbar.vue'
import NotificationPanel from '@/components/NotificationPanel.vue'
import NotificationToast from '@/components/NotificationToast.vue'

const auth = useAuthStore()
const notifs = useNotificationStore()
const router = useRouter()

onMounted(async () => {
  if (auth.isAuthenticated) {
    await notifs.fetchNotifications()
    notifs.subscribeToRealtime()

    // Auto-register push if permission was previously granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      notifs.subscribeToPush()
    }
  }

  // Fetch notifications implicitly when user returns to the tab (free "polling")
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && auth.isAuthenticated) {
      notifs.fetchNotifications()
    }
  })
})
</script>

<template>
  <div id="fitforge-app">
    <AppNavbar v-if="auth.isAuthenticated" />
    <RouterView />
    <!-- Global Notification Components -->
    <NotificationPanel v-if="auth.isAuthenticated" />
    <NotificationToast />

    <!-- Landscape Lock Overlay -->
    <div id="landscape-lock">
      <div class="lock-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent-lime)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="rotate-icon">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12.01" y2="18"></line>
        </svg>
        <h2>Please Rotate Device</h2>
        <p>FitForge is optimized for portrait mode.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
#fitforge-app {
  min-height: 100vh;
}

#landscape-lock {
  display: none;
  position: fixed;
  inset: 0;
  background: var(--bg-primary);
  z-index: 99999;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
}

.lock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.rotate-icon {
  animation: rotatePhone 2s ease-in-out infinite;
}

@keyframes rotatePhone {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(-90deg); }
  100% { transform: rotate(0deg); }
}

.lock-content h2 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0;
}

.lock-content p {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0;
}

/* Show only on mobile devices in landscape */
@media screen and (max-width: 950px) and (max-height: 500px) and (orientation: landscape) {
  #landscape-lock {
    display: flex;
  }
}
</style>
