<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'

const router = useRouter()
const notifs = useNotificationStore()

const now = ref(Date.now())
let timer = null

onMounted(() => {
  // Update the time every 10 seconds to ensure the 'time ago' strings stay fresh
  timer = setInterval(() => {
    now.value = Date.now()
  }, 10000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const sortedNotifications = computed(() => notifs.sortedNotifications)
const unreadCount = computed(() => notifs.unreadCount)

const getIcon = (type) => {
  const icons = {
    success: '🏆',
    info: '📊',
    warning: '⚠️',
    comment: '💬',
    milestone: '⚖️',
    milestone_achieved: '🏆',
    milestone_missed: '⚠️',
    group: '👥'
  }
  return icons[type] || '🔔'
}

const getAccentClass = (type) => {
  const classes = {
    success: 'accent-lime',
    info: 'accent-purple',
    warning: 'accent-coral',
    comment: 'accent-purple',
    milestone: 'accent-lime',
    milestone_achieved: 'accent-lime',
    milestone_missed: 'accent-coral',
    group: 'accent-coral'
  }
  return classes[type] || 'accent-purple'
}

const getCategoryLabel = (type) => {
  const labels = {
    success: 'ACHIEVEMENT',
    info: 'PERFORMANCE',
    warning: 'ALERT',
    comment: 'COMMUNITY',
    milestone: 'MILESTONE',
    milestone_achieved: 'MILESTONE',
    milestone_missed: 'ALERT',
    group: 'GROUP CHALLENGE'
  }
  return labels[type] || 'UPDATE'
}

const timeAgo = (timestamp) => {
  if (!timestamp) return ''
  const dateObj = new Date(timestamp)
  if (isNaN(dateObj.getTime())) return ''

  const seconds = Math.floor((now.value - dateObj.getTime()) / 1000)
  const safeSeconds = Math.max(0, seconds)

  if (safeSeconds < 60) return 'Just now'
  const minutes = Math.floor(safeSeconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return dateObj.toLocaleDateString()
}

const handleNotificationClick = (notification) => {
  notifs.markAsRead(notification.id)
  notifs.closePanel()
  if (notification.route) {
    router.push(notification.route)
  }
}
</script>

<template>
  <!-- Backdrop -->
  <transition name="fk-panel-backdrop">
    <div v-if="notifs.panelOpen" class="fk-notif-backdrop" @click="notifs.closePanel()"></div>
  </transition>

  <!-- Panel -->
  <transition name="fk-panel-slide">
    <div v-if="notifs.panelOpen" class="fk-notif-panel">
      <!-- Header -->
      <div class="fk-notif-header">
        <div class="fk-notif-header-top">
          <div class="fk-notif-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/></svg>
            <span>FORGE KINETIC</span>
          </div>
          <button class="fk-notif-bell-icon" @click="notifs.closePanel()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
        </div>
        <h2 class="fk-notif-title">ACTIVITY</h2>
        <div class="fk-notif-actions">
          <button v-if="unreadCount > 0" class="fk-notif-action" @click="notifs.markAllAsRead()">
            MARK ALL AS READ
          </button>
        </div>
      </div>

      <!-- Notification List -->
      <div class="fk-notif-list">
        <div v-if="sortedNotifications.length === 0" class="fk-notif-empty">
          <div class="fk-notif-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <h3>ALL CAUGHT UP</h3>
          <p>No notifications yet. We'll let you know when something happens.</p>
        </div>

        <TransitionGroup name="fk-notif-item" tag="div" class="fk-notif-items">
          <div
            v-for="notification in sortedNotifications"
            :key="notification.id"
            class="fk-notif-card"
            :class="{ 'fk-notif-unread': !notification.is_read }"
            @click="handleNotificationClick(notification)"
          >
            <div class="fk-notif-card-top">
              <div class="fk-notif-icon" :class="getAccentClass(notification.type)">
                {{ getIcon(notification.type) }}
              </div>
              <div class="fk-notif-meta">
                <span class="fk-notif-category" :class="getAccentClass(notification.type)">{{ getCategoryLabel(notification.type) }}</span>
                <span class="fk-notif-time">{{ timeAgo(notification.created_at) }}</span>
              </div>
              <div class="fk-notif-indicators">
                <div v-if="!notification.is_read" class="fk-notif-dot"></div>
                <button class="fk-notif-dismiss" @click.stop="notifs.removeNotification(notification.id)" title="Dismiss">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div class="fk-notif-body">
              <h4 class="fk-notif-card-title">{{ notification.title }}</h4>
              <p class="fk-notif-card-msg">{{ notification.message }}</p>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- Footer -->
      <div v-if="sortedNotifications.length > 0" class="fk-notif-footer">
        <button class="fk-notif-clear" @click="notifs.clearAll()">CLEAR ALL NOTIFICATIONS</button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Backdrop */
.fk-notif-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 2000;
}

/* Panel */
.fk-notif-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 100vw;
  background: #0e0e0e;
  z-index: 2001;
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 80px rgba(0, 0, 0, 0.6);
}

/* Header */
.fk-notif-header {
  padding: 20px 24px 16px;
  padding-top: calc(20px + env(safe-area-inset-top));
}

.fk-notif-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.fk-notif-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #DFFF00;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-style: italic;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
}

.fk-notif-bell-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  transition: color 0.2s;
}

.fk-notif-bell-icon:hover {
  color: #DFFF00;
}

.fk-notif-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-style: italic;
  font-size: 2.8rem;
  letter-spacing: -0.02em;
  color: #fff;
  line-height: 1;
  margin-bottom: 16px;
}

.fk-notif-actions {
  display: flex;
  gap: 12px;
}

.fk-notif-action {
  padding: 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.fk-notif-action:hover {
  color: #DFFF00;
}

/* List */
.fk-notif-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.06) transparent;
}

.fk-notif-list::-webkit-scrollbar {
  width: 4px;
}

.fk-notif-list::-webkit-scrollbar-track {
  background: transparent;
}

.fk-notif-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.06);
  border-radius: 100px;
}

/* Empty State */
.fk-notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.fk-notif-empty-icon {
  color: rgba(255, 255, 255, 0.15);
  margin-bottom: 20px;
}

.fk-notif-empty h3 {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.fk-notif-empty p {
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.85rem;
  max-width: 240px;
}

/* Notification Cards */
.fk-notif-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fk-notif-card {
  padding: 20px;
  background: #131313;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
}

.fk-notif-card:hover {
  background: #1a1a1a;
}

.fk-notif-card.fk-notif-unread {
  background: rgba(223, 255, 0, 0.03);
  border-left: 3px solid #DFFF00;
}

.fk-notif-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.fk-notif-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.fk-notif-icon.accent-lime {
  background: rgba(223, 255, 0, 0.1);
}

.fk-notif-icon.accent-purple {
  background: rgba(179, 153, 255, 0.1);
}

.fk-notif-icon.accent-coral {
  background: rgba(255, 112, 67, 0.1);
}

.fk-notif-meta {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.fk-notif-category {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fk-notif-category.accent-lime { color: #DFFF00; }
.fk-notif-category.accent-purple { color: #b399ff; }
.fk-notif-category.accent-coral { color: #ff7043; }

.fk-notif-time {
  font-size: 0.68rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 0.03em;
}

.fk-notif-indicators {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fk-notif-dot {
  width: 8px;
  height: 8px;
  background: #DFFF00;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(223, 255, 0, 0.4);
  animation: fk-dot-pulse 2s infinite;
}

@keyframes fk-dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.fk-notif-dismiss {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.fk-notif-card:hover .fk-notif-dismiss {
  opacity: 1;
}

.fk-notif-dismiss:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.fk-notif-body {}

.fk-notif-card-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: #fff;
  margin-bottom: 4px;
  line-height: 1.3;
}

.fk-notif-card-msg {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Footer */
.fk-notif-footer {
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.fk-notif-clear {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: none;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.2s;
}

.fk-notif-clear:hover {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}

/* Animations */
.fk-panel-slide-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.fk-panel-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}
.fk-panel-slide-enter-from,
.fk-panel-slide-leave-to {
  transform: translateX(100%);
}

.fk-panel-backdrop-enter-active {
  transition: opacity 0.3s ease;
}
.fk-panel-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.fk-panel-backdrop-enter-from,
.fk-panel-backdrop-leave-to {
  opacity: 0;
}

.fk-notif-item-enter-active {
  transition: all 0.3s ease;
}
.fk-notif-item-leave-active {
  transition: all 0.2s ease;
}
.fk-notif-item-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.fk-notif-item-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

@media (max-width: 480px) {
  .fk-notif-panel {
    width: 100vw;
  }
}
</style>
