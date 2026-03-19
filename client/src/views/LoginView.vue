<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    const redirectPath = route.query.redirect || '/dashboard'
    router.push(redirectPath)
  } catch (e) {
    error.value = e.response?.data?.message || 'Login failed. Check your credentials.'
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container animate-in">
      <div class="auth-header">
        <h1 class="brand-title">FitForge</h1>
        <p class="auth-subtitle">Transform together. Achieve more.</p>
      </div>

      <form class="auth-form glass-card" @submit.prevent="handleLogin">
        <h2 class="form-title">Welcome Back</h2>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" class="form-input"
                 placeholder="your@email.com" required autocomplete="email" />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" class="form-input"
                 placeholder="••••••••" required autocomplete="current-password" />
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="auth.loading">
          {{ auth.loading ? 'Signing in...' : 'Sign In' }}
        </button>

        <p class="auth-footer">
          Don't have an account?
          <router-link :to="{ path: '/register', query: route.query }" class="auth-link">Create one</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-container {
  width: 100%;
  max-width: 440px;
}

.auth-header {
  text-align: center;
  margin-bottom: 40px;
}

.brand-title {
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 12px;
  background: var(--gradient-lime);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.04em;
}

.auth-subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
  font-weight: 500;
}

.auth-form {
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-title {
  text-align: center;
  margin-bottom: 8px;
  font-size: 1.75rem;
}

.w-full { width: 100%; }

.error-msg {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--accent-red);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  text-align: center;
}

.auth-footer {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-top: 8px;
}

.auth-link {
  color: var(--accent-lime);
  text-decoration: none;
  font-weight: 700;
  transition: all 0.3s;
}

.auth-link:hover {
  text-decoration: none;
  opacity: 0.8;
}
</style>
