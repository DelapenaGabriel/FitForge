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
  if (auth.token) {
    await auth.fetchMe()
    await notifs.fetchNotifications()
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
  </div>
</template>

<style scoped>
#fitforge-app {
  min-height: 100vh;
}
</style>
