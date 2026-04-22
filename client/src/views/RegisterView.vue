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
    error.value = e.message || 'Registration failed'
  }
}
</script>

<template>
  <div class="fk-auth-page">
    <div class="fk-auth-glow"></div>

    <div class="fk-auth-container">
      <div class="fk-auth-brand">
        <h1 class="fk-auth-title">FIT FORGE</h1>
        <p class="fk-auth-tagline">START YOUR TRANSFORMATION</p>
      </div>

      <form class="fk-auth-form" @submit.prevent="handleRegister">
        <h2 class="fk-form-heading">CREATE ACCOUNT</h2>

        <div v-if="error" class="fk-error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {{ error }}
        </div>

        <div class="fk-input-group">
          <label for="name">DISPLAY NAME</label>
          <input id="name" v-model="displayName" type="text"
                 placeholder="Enter Your Display Name" required />
        </div>

        <div class="fk-input-group">
          <label for="email">EMAIL</label>
          <input id="email" v-model="email" type="email"
                 placeholder="Enter Your Email" required />
        </div>

        <div class="fk-input-group">
          <label for="password">PASSWORD</label>
          <input id="password" v-model="password" type="password"
                 placeholder="••••••••" required />
        </div>

        <div class="fk-input-group">
          <label for="confirmPw">CONFIRM PASSWORD</label>
          <input id="confirmPw" v-model="confirmPassword" type="password"
                 placeholder="••••••••" required />
        </div>

        <button type="submit" class="fk-auth-btn" :disabled="auth.loading">
          {{ auth.loading ? 'CREATING...' : 'JOIN THE FORGE' }}
        </button>

        <p class="fk-auth-footer">
          Already have an account?
          <router-link :to="{ path: '/login', query: route.query }" class="fk-auth-link">Sign in</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.fk-auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(24px, calc(12px + env(safe-area-inset-top))) 24px max(24px, calc(12px + env(safe-area-inset-bottom)));
  background: #0e0e0e;
  position: relative;
  overflow-x: hidden;
}

.fk-auth-glow {
  position: absolute;
  top: -20vh;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(223, 255, 0, 0.06) 0%, transparent 70%);
  pointer-events: none;
}

.fk-auth-container {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
}

.fk-auth-brand {
  text-align: center;
  margin-bottom: 40px;
}

.fk-auth-logo {
  width: 56px;
  height: 56px;
  background: #DFFF00;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0e0e0e;
  margin: 0 auto 24px;
}

.fk-auth-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-style: italic;
  font-size: 2.5rem;
  letter-spacing: -0.02em;
  line-height: 1;
  color: #fff;
  margin-bottom: 12px;
}

.fk-auth-tagline {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.3);
}

.fk-auth-form {
  background: #131313;
  border-radius: 24px;
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fk-form-heading {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: 0.06em;
  color: #fff;
  text-align: center;
  margin-bottom: 4px;
}

.fk-error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 12px;
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 600;
}

.fk-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fk-input-group label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.4);
}

.fk-input-group input {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.06);
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
  background: rgba(255, 255, 255, 0.05);
}

.fk-input-group input::placeholder {
  color: rgba(255, 255, 255, 0.15);
}

.fk-auth-btn {
  padding: 18px;
  background: #DFFF00;
  color: #0e0e0e;
  border: none;
  border-radius: 14px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 8px;
}

.fk-auth-btn:hover {
  background: #f6ffc0;
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(223, 255, 0, 0.25);
}

.fk-auth-btn:active {
  transform: translateY(0);
}

.fk-auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.fk-auth-footer {
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.9rem;
}

.fk-auth-link {
  color: #DFFF00;
  text-decoration: none;
  font-weight: 700;
  transition: opacity 0.2s;
}

.fk-auth-link:hover {
  opacity: 0.7;
}

@media (max-width: 480px) {
  .fk-auth-form {
    padding: 32px 24px;
  }
  .fk-auth-title {
    font-size: 2rem;
  }
}
</style>
