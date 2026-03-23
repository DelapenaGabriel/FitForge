<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGroupStore } from '@/stores/groups'
import { useRoute, useRouter } from 'vue-router'

const auth = useAuthStore()
const groups = useGroupStore()
const route = useRoute()
const router = useRouter()

const showPlusMenu = ref(false)

const handlePlusAction = (action) => {
  showPlusMenu.value = false;
  if(action === 'create_group') {
    router.push('/groups/create');
  } else if(action === 'add_log') {
    if(route.name === 'GroupDetail') {
      groups.logModalMode = 'log';
      groups.showLogModal = true;
    } else {
      alert("Please open a group to log an activity.");
      router.push('/dashboard');
    }
  } else if(action === 'add_note') {
    if(route.name === 'GroupDetail') {
      groups.logModalMode = 'note';
      groups.showLogModal = true;
    } else {
      alert("Please open a group to add a note.");
      router.push('/dashboard');
    }
  }
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
        <img src="/fitforge_lime.png" alt="FitForge Logo" class="logo-img" />
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
      <!-- Mobile Plus Button and Popup -->
      <div class="mobile-nav-item relative">
        <!-- Backdrop for click-outside -->
        <div v-if="showPlusMenu" class="plus-menu-overlay" @click="showPlusMenu = false"></div>

        <!-- The Popup Menu -->
        <transition name="fade-up">
          <div v-if="showPlusMenu" class="plus-popup-menu">
            <button class="popup-item" @click="handlePlusAction('add_log')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-6M9 17l3 3 3-3M21 12H3"/></svg>
              <span>Add Log</span>
            </button>
            <button class="popup-item" @click="handlePlusAction('add_note')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Add Post</span>
            </button>
            <button class="popup-item" @click="handlePlusAction('create_group')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Create Group</span>
            </button>
          </div>
        </transition>

        <!-- The Plus Button -->
        <button class="nav-plus-circle" @click="showPlusMenu = !showPlusMenu" :class="{ 'is-active': showPlusMenu }">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
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

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-img {
  height: 40px;
  width: auto;
  border-radius: 10px;
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
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  box-shadow: 0 4px 15px var(--accent-lime-glow);
  transform: translateY(-4px);
  transition: all 0.3s ease;
  cursor: pointer;
}

.nav-plus-circle.is-active {
  transform: translateY(-4px) rotate(45deg);
  background: rgba(20, 20, 22, 0.95);
  color: var(--accent-lime);
  border: 1px solid var(--accent-lime);
  box-shadow: 0 0 20px rgba(217, 255, 77, 0.2);
}

.plus-popup-menu {
  position: absolute;
  bottom: calc(100% + 20px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 32, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1010;
}

.plus-popup-menu::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  margin-left: -6px;
  width: 12px;
  height: 12px;
  background: rgba(30, 30, 32, 0.95);
  border-bottom: 1px solid var(--border-glass);
  border-right: 1px solid var(--border-glass);
  transform: rotate(45deg);
}

.popup-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.popup-item:hover, .popup-item:active {
  background: rgba(255, 255, 255, 0.1);
}

.popup-item svg {
  color: var(--accent-lime);
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 15px) scale(0.9);
}

.plus-menu-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1005;
  left: 50%;
  transform: translateX(-50%);
}

@media (max-width: 768px) {
  .navbar-desktop { display: none; }
  .mobile-nav { display: block; }
}
</style>

