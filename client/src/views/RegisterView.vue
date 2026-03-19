<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')

const handleRegister = async () => {
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }
  try {
    await auth.register(email.value, password.value, displayName.value)
    const redirectPath = route.query.redirect || '/dashboard'
    router.push(redirectPath)
  } catch (e) {
    error.value = e.response?.data?.message || 'Registration failed'
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container animate-in">
      <div class="auth-header">
        <h1 class="brand-title">FitForge</h1>
        <p class="auth-subtitle">Start your transformation journey</p>
      </div>

      <form class="auth-form glass-card" @submit.prevent="handleRegister">
        <h2 class="form-title">Create Account</h2>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <div class="form-group">
          <label for="name">Display Name</label>
          <input id="name" v-model="displayName" type="text" class="form-input"
                 placeholder="John Doe" required />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" class="form-input"
                 placeholder="your@email.com" required />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" class="form-input"
                 placeholder="••••••••" required />
        </div>

        <div class="form-group">
          <label for="confirmPw">Confirm Password</label>
          <input id="confirmPw" v-model="confirmPassword" type="password" class="form-input"
                 placeholder="••••••••" required />
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="auth.loading">
          {{ auth.loading ? 'Creating...' : 'Create Account' }}
        </button>

        <p class="auth-footer">
          Already have an account?
          <router-link :to="{ path: '/login', query: route.query }" class="auth-link">Sign in</router-link>
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
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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

@media (max-width: 480px) {
  .auth-form {
    padding: 32px 24px;
  }
}
</style>

