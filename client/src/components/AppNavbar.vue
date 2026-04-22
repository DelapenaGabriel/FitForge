<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGroupStore } from '@/stores/groups'
import { useNotificationStore } from '@/stores/notifications'
import { useRoute, useRouter } from 'vue-router'

const auth = useAuthStore()
const groups = useGroupStore()
const notifs = useNotificationStore()
const route = useRoute()
const router = useRouter()

const showPlusMenu = ref(false)
const unreadCount = computed(() => notifs.unreadCount)

const comingSoonTab = ref('')
const showComingSoon = (tab) => {
  comingSoonTab.value = tab
  setTimeout(() => { comingSoonTab.value = '' }, 2500)
}

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
  <!-- ═══ Desktop Header ═══ -->
  <nav class="fk-navbar-desktop" v-if="auth.user">
    <div class="fk-navbar-inner">
      <div class="fk-navbar-left">
        <router-link to="/dashboard" class="fk-brand">
          <svg class="fk-brand-icon" width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
          </svg>
          <span class="fk-brand-text">FORGE KINETIC</span>
        </router-link>
        
        <div class="fk-desktop-links">
          <router-link to="/dashboard" class="fk-desktop-link" :class="{'fk-desktop-active': route.path === '/dashboard'}">HOME</router-link>
          <router-link to="/groups" class="fk-desktop-link" :class="{'fk-desktop-active': route.path === '/groups'}">GROUPS</router-link>
        </div>
      </div>

      <div class="fk-navbar-actions">
        <router-link to="/groups/create" class="fk-nav-btn-create">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          NEW GROUP
        </router-link>

        <!-- Notification Bell -->
        <button class="fk-bell-btn" @click="notifs.togglePanel()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span v-if="unreadCount > 0" class="fk-bell-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>

        <!-- User Avatar -->
        <router-link to="/profile" class="fk-nav-avatar-link">
          <img v-if="auth.user.avatarUrl" :src="auth.user.avatarUrl" alt="Avatar" class="fk-nav-avatar" />
          <div v-else class="fk-nav-avatar fk-nav-avatar-placeholder">
            {{ getInitials(auth.user.displayName) }}
          </div>
        </router-link>
      </div>
    </div>
  </nav>

  <!-- Floating FAB (Mobile & Desktop if needed, but mainly mobile) -->
  <div class="fk-floating-fab-wrap" v-if="auth.user">
    <!-- Backdrop -->
    <div v-if="showPlusMenu" class="fk-fab-overlay" @click="showPlusMenu = false"></div>

    <!-- Action Menu -->
    <transition name="fk-menu-rise">
      <div v-if="showPlusMenu" class="fk-action-menu fk-floating-action-menu">
        <div class="fk-action-menu-header">
          <span class="fk-action-title">ACTION</span>
          <span class="fk-action-title fk-action-title-accent">SELECT</span>
          <div class="fk-action-bar"></div>
        </div>
        <button class="fk-action-item" @click="handlePlusAction('add_log')">
          <div class="fk-action-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20v-6M9 17l3 3 3-3M21 12H3"/></svg>
          </div>
          <div class="fk-action-text">
            <span class="fk-action-label">LOG BODYWEIGHT</span>
            <span class="fk-action-desc">TRACK VITAL DATA</span>
          </div>
          <svg class="fk-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="fk-action-item" @click="handlePlusAction('add_note')">
          <div class="fk-action-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div class="fk-action-text">
            <span class="fk-action-label">POST TO FEED</span>
            <span class="fk-action-desc">INSPIRE THE TRIBE</span>
          </div>
          <svg class="fk-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="fk-action-item" @click="handlePlusAction('create_group')">
          <div class="fk-action-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="fk-action-text">
            <span class="fk-action-label">CREATE GROUP</span>
            <span class="fk-action-desc">FORGE A NEW SQUAD</span>
          </div>
          <svg class="fk-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </transition>

    <!-- FAB Button -->
    <button v-if="route.name === 'GroupDetail'" class="fk-fab" @click="showPlusMenu = !showPlusMenu" :class="{ 'fk-fab-active': showPlusMenu }">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  </div>

  <!-- ═══ Mobile Bottom Nav ═══ -->
  <nav class="fk-mobile-nav" v-if="auth.user">
    <div class="fk-mobile-nav-bar">
      <!-- HOME -->
      <router-link to="/dashboard" class="fk-tab" :class="{'fk-tab-active': route.path === '/dashboard'}">
        <div class="fk-tab-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>HOME</span>
        </div>
      </router-link>

      <!-- GROUPS -->
      <router-link to="/groups" class="fk-tab" :class="{'fk-tab-active': route.path === '/groups' || (route.path.startsWith('/groups/') && route.name !== 'CreateGroup')}">
        <div class="fk-tab-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>GROUPS</span>
        </div>
      </router-link>

      <!-- WORKOUT -->
      <button class="fk-tab" @click="showComingSoon('Workout')">
        <div class="fk-tab-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 11.5-6-6-6 6"/><path d="m18 18.5-6-6-6 6"/></svg>
          <span>WORKOUT</span>
        </div>
      </button>

      <!-- NUTRITION -->
      <button class="fk-tab" @click="showComingSoon('Nutrition')">
        <div class="fk-tab-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          <span>NUTRITION</span>
        </div>
      </button>

      <!-- PROFILE -->
      <router-link to="/profile" class="fk-tab" active-class="fk-tab-active">
        <div class="fk-tab-inner">
          <img v-if="auth.user.avatarUrl" :src="auth.user.avatarUrl" alt="Avatar" class="fk-mobile-tab-avatar" />
          <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>PROFILE</span>
        </div>
      </router-link>
    </div>
  </nav>

  <!-- Coming Soon Toast -->
  <transition name="fk-toast-slide">
    <div v-if="comingSoonTab" class="fk-coming-soon-toast">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      <span>{{ comingSoonTab }} is coming soon!</span>
    </div>
  </transition>
</template>

<style scoped>
/* ═══════════════════════════════════════
   FORGE KINETIC — Desktop Navigation
   ═══════════════════════════════════════ */
.fk-navbar-desktop {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(14, 14, 14, 0.82);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: env(safe-area-inset-top) 0 0 0;
}

.fk-navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
}

.fk-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #DFFF00;
}

.fk-navbar-left {
  display: flex;
  align-items: center;
  gap: 40px;
}

.fk-desktop-links {
  display: flex;
  gap: 24px;
}

.fk-desktop-link {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.15em;
  color: #777575;
  text-decoration: none;
  transition: color 0.2s;
}

.fk-desktop-link:hover {
  color: #ffffff;
}

.fk-desktop-active {
  color: #DFFF00;
}

.fk-brand-icon {
  color: #DFFF00;
}

.fk-brand-text {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-style: italic;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.fk-navbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.fk-nav-btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: #DFFF00;
  color: #0e0e0e;
  border: none;
  border-radius: 10px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-decoration: none;
  transition: all 0.3s;
}

.fk-nav-btn-create:hover {
  background: #f6ffc0;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(223, 255, 0, 0.25);
}

.fk-bell-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: none;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s;
}

.fk-bell-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #DFFF00;
}

.fk-bell-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #DFFF00;
  color: #0e0e0e;
  border-radius: 100px;
  font-size: 0.6rem;
  font-weight: 800;
  font-family: 'Space Grotesk', sans-serif;
  border: 2px solid #0e0e0e;
  animation: fk-badge-pulse 2s ease-in-out infinite;
}

@keyframes fk-badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.fk-nav-avatar-link {
  text-decoration: none;
  transition: transform 0.3s;
}

.fk-nav-avatar-link:hover {
  transform: scale(1.05);
}

.fk-nav-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  object-fit: cover;
  border: 2px solid rgba(223, 255, 0, 0.3);
}

.fk-nav-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(223, 255, 0, 0.1);
  color: #DFFF00;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 800;
  font-size: 0.8rem;
}

/* ═══════════════════════════════════════
   FORGE KINETIC — Mobile Bottom Nav
   ═══════════════════════════════════════ */
.fk-mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0 0 env(safe-area-inset-bottom) 0;
  background: rgba(14, 14, 14, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.fk-mobile-nav-bar {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  padding: 6px 8px 8px;
  max-width: 500px;
  margin: 0 auto;
}

.fk-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  color: rgba(255, 255, 255, 0.35);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  position: relative;
}

.fk-tab-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.fk-tab-inner span {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fk-tab-active {
  color: #DFFF00;
}

.fk-tab-active .fk-tab-inner {
  background: rgba(223, 255, 0, 0.12);
  padding: 8px 14px;
  border-radius: 14px;
}

/* ─── FAB Button ─── */
.fk-tab-fab-wrap {
  flex: none;
  width: 56px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fk-fab {
  width: 52px;
  height: 52px;
  background: #DFFF00;
  border: none;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0e0e0e;
  box-shadow: 0 4px 20px rgba(223, 255, 0, 0.3);
  transform: translateY(-8px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.fk-fab:hover {
  transform: translateY(-10px) scale(1.05);
  box-shadow: 0 8px 30px rgba(223, 255, 0, 0.4);
}

.fk-fab-active {
  transform: translateY(-8px) rotate(45deg);
  background: #0e0e0e;
  color: #DFFF00;
  border: 2px solid #DFFF00;
  box-shadow: 0 0 24px rgba(223, 255, 0, 0.2);
}

.fk-fab-active:hover {
  transform: translateY(-8px) rotate(45deg) scale(1.05);
}

/* ─── Action Menu ─── */
.fk-fab-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 1005;
}

.fk-action-menu {
  position: fixed;
  bottom: calc(100px + env(safe-area-inset-bottom));
  left: 24px;
  right: 24px;
  max-width: 400px;
  margin: 0 auto;
  z-index: 1010;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fk-action-menu-header {
  padding: 0 4px 8px;
}

.fk-action-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-style: italic;
  font-size: 2.2rem;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

.fk-action-title-accent {
  color: #DFFF00;
  margin-left: 10px;
}

.fk-action-bar {
  width: 48px;
  height: 4px;
  background: #DFFF00;
  border-radius: 2px;
  margin-top: 8px;
}

.fk-action-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: rgba(32, 31, 31, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: none;
  border-radius: 20px;
  color: #fff;
  cursor: pointer;
  transition: all 0.25s;
  width: 100%;
  text-align: left;
}

.fk-action-item:hover,
.fk-action-item:active {
  background: rgba(50, 49, 49, 0.9);
  transform: translateX(4px);
}

.fk-action-icon {
  width: 48px;
  height: 48px;
  min-width: 48px;
  background: rgba(223, 255, 0, 0.12);
  border: 1px solid rgba(223, 255, 0, 0.2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #DFFF00;
}

.fk-action-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fk-action-label {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.fk-action-desc {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.fk-action-arrow {
  color: rgba(255, 255, 255, 0.2);
}

/* ─── Mobile Bell Badge ─── */
.fk-bell-mobile-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fk-mobile-bell-badge {
  position: absolute;
  top: -5px;
  right: -8px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #DFFF00;
  color: #0e0e0e;
  border-radius: 100px;
  font-size: 0.5rem;
  font-weight: 800;
  font-family: 'Space Grotesk', sans-serif;
  border: 2px solid rgba(14, 14, 14, 0.92);
  animation: fk-badge-pulse 2s ease-in-out infinite;
}

.fk-mobile-tab-avatar {
  width: 22px;
  height: 22px;
  border-radius: 8px;
  object-fit: cover;
  border: 1.5px solid rgba(223, 255, 0, 0.25);
}

/* ─── Menu Transition ─── */
.fk-menu-rise-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.fk-menu-rise-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}
.fk-menu-rise-enter-from,
.fk-menu-rise-leave-to {
  opacity: 0;
  transform: translateY(40px) scale(0.95);
}

/* ─── Floating FAB Positioning ─── */
.fk-floating-fab-wrap {
  position: fixed;
  bottom: calc(90px + env(safe-area-inset-bottom));
  right: 20px;
  z-index: 1001;
}

/* ─── Coming Soon Toast ─── */
.fk-coming-soon-toast {
  position: fixed;
  bottom: calc(100px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(223, 255, 0, 0.2);
  border-radius: 100px;
  color: #DFFF00;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  white-space: nowrap;
  z-index: 2000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(223, 255, 0, 0.1);
}

.fk-toast-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.fk-toast-slide-leave-active {
  transition: all 0.25s ease;
}
.fk-toast-slide-enter-from,
.fk-toast-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px) scale(0.95);
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .fk-navbar-desktop { display: none; }
  .fk-mobile-nav { display: block; }
}

@media (min-width: 769px) {
  .fk-floating-fab-wrap { display: none; }
}
</style>
