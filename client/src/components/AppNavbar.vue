<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const logout = () => {
  auth.logout()
  router.push('/login')
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <!-- Desktop Header -->
  <nav class="navbar-desktop" v-if="auth.user">
    <div class="container navbar-inner">
      <router-link to="/dashboard" class="navbar-brand">
        <span class="brand-text">FitForge</span>
      </router-link>

      <div class="navbar-actions">
        <router-link to="/groups/create" class="btn btn-primary btn-sm">
          + New Group
        </router-link>

        <div class="user-menu">
          <router-link to="/profile" class="user-profile-link">
            <img v-if="auth.user.avatarUrl" :src="auth.user.avatarUrl" alt="Avatar" class="nav-avatar-img" />
            <div v-else class="avatar avatar-placeholder" style="width:36px;height:36px;font-size:0.8rem;">
              {{ getInitials(auth.user.displayName) }}
            </div>
            <span class="user-name">{{ auth.user.displayName }}</span>
          </router-link>
          <button class="logout-btn" @click="logout" title="Logout">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </div>
  </nav>

  <!-- Mobile Bottom Nav -->
  <nav class="mobile-nav" v-if="auth.user">
    <div class="mobile-nav-inner">
      <router-link to="/dashboard" class="mobile-nav-item" active-class="active">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Home</span>
      </router-link>
      <router-link to="/groups/create" class="mobile-nav-item" active-class="active">
        <div class="nav-plus-circle">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
      </router-link>
      <router-link to="/profile" class="mobile-nav-item" active-class="active">
        <img v-if="auth.user.avatarUrl" :src="auth.user.avatarUrl" alt="Avatar" class="mobile-nav-avatar" />
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Profile</span>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
/* Desktop Styles */
.navbar-desktop {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(8, 8, 8, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-subtle);
  height: 72px;
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.navbar-brand {
  text-decoration: none;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: -0.02em;
  background: var(--gradient-lime);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-glass);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.logout-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  transition: color 0.3s;
}

.logout-btn:hover {
  color: var(--accent-red);
}

.user-profile-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.3s;
}

.user-profile-link:hover {
  opacity: 0.8;
}

.nav-avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-glass);
}

.mobile-nav-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--border-glass);
}

/* Mobile Nav Styles */
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: calc(100% - 48px);
  max-width: 400px;
}

.mobile-nav-inner {
  background: rgba(20, 20, 22, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-full);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  text-decoration: none;
  background: none;
  border: none;
  padding: 10px;
  flex: 1;
  transition: all 0.3s;
}

.mobile-nav-item span {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mobile-nav-item.active {
  color: var(--accent-lime);
}

.nav-plus-circle {
  width: 48px;
  height: 48px;
  background: var(--gradient-lime);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  box-shadow: 0 4px 15px var(--accent-lime-glow);
  transform: translateY(-4px);
}

@media (max-width: 768px) {
  .navbar-desktop { display: none; }
  .mobile-nav { display: block; }
}
</style>

