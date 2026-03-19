<script setup>
import { onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppNavbar from '@/components/AppNavbar.vue'

const auth = useAuthStore()
const router = useRouter()

onMounted(async () => {
  if (auth.token) {
    await auth.fetchMe()
  }
})
</script>

<template>
  <div id="fitforge-app">
    <AppNavbar v-if="auth.isAuthenticated" />
    <RouterView />
  </div>
</template>

<style scoped>
#fitforge-app {
  min-height: 100vh;
}
</style>
