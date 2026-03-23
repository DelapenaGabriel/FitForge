<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'

const router = useRouter()
const notifs = useNotificationStore()

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

const timeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
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
  <transition name="panel-backdrop">
    <div v-if="notifs.panelOpen" class="notif-panel-backdrop" @click="notifs.closePanel()"></div>
  </transition>

  <!-- Panel -->
  <transition name="panel-slide">
    <div v-if="notifs.panelOpen" class="notif-panel">
      <!-- Header -->
      <div class="notif-panel-header">
        <div class="notif-panel-title-row">
          <h2 class="notif-panel-title">Notifications</h2>
          <span v-if="unreadCount > 0" class="notif-panel-badge">{{ unreadCount }}</span>
        </div>
        <div class="notif-panel-actions">
          <button v-if="unreadCount > 0" class="notif-action-btn" @click="notifs.markAllAsRead()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Mark all read
          </button>
          <button class="notif-close-btn" @click="notifs.closePanel()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Notification List -->
      <div class="notif-panel-list">
        <div v-if="sortedNotifications.length === 0" class="notif-empty">
          <div class="notif-empty-icon">🔔</div>
          <h3>All caught up!</h3>
          <p>No notifications yet. We'll let you know when something happens.</p>
        </div>

        <TransitionGroup name="notif-item" tag="div" class="notif-items">
          <button
            v-for="notification in sortedNotifications"
            :key="notification.id"
            class="notif-item"
            :class="{ 'notif-unread': !notification.read }"
            @click="handleNotificationClick(notification)"
          >
            <div class="notif-item-icon" :class="getAccentClass(notification.type)">
              {{ getIcon(notification.type) }}
            </div>
            <div class="notif-item-content">
              <div class="notif-item-title">{{ notification.title }}</div>
              <div class="notif-item-message">{{ notification.message }}</div>
              <div class="notif-item-time">{{ timeAgo(notification.createdAt) }}</div>
            </div>
            <div v-if="!notification.read" class="notif-unread-dot"></div>
            <button class="notif-item-dismiss" @click.stop="notifs.removeNotification(notification.id)" title="Dismiss">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </button>
        </TransitionGroup>
      </div>

      <!-- Footer -->
      <div v-if="sortedNotifications.length > 0" class="notif-panel-footer">
        <button class="notif-clear-btn" @click="notifs.clearAll()">Clear all notifications</button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Backdrop */
.notif-panel-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2000;
}

/* Panel */
.notif-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 100vw;
  background: rgba(14, 14, 16, 0.97);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-left: 1px solid var(--border-glass);
  z-index: 2001;
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.5);
}

/* Header */
.notif-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 20px;
  padding-top: calc(24px + env(safe-area-inset-top));
  border-bottom: 1px solid var(--border-subtle);
}

.notif-panel-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notif-panel-title {
  font-family: var(--font-heading);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.notif-panel-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: var(--gradient-lime);
  color: #000;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 800;
  font-family: var(--font-heading);
}

.notif-panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notif-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-full);
  color: var(--accent-lime);
  font-size: 0.78rem;
  font-weight: 700;
  font-family: var(--font-heading);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.notif-action-btn:hover {
  background: var(--accent-lime-dim);
  border-color: var(--accent-lime);
}

.notif-close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: 50%;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.notif-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

/* List */
.notif-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-glass) transparent;
}

.notif-panel-list::-webkit-scrollbar {
  width: 4px;
}

.notif-panel-list::-webkit-scrollbar-track {
  background: transparent;
}

.notif-panel-list::-webkit-scrollbar-thumb {
  background: var(--border-glass);
  border-radius: var(--radius-full);
}

/* Empty State */
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.notif-empty-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.notif-empty h3 {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.notif-empty p {
  color: var(--text-muted);
  font-size: 0.9rem;
  max-width: 240px;
}

/* Notification Items */
.notif-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.25s;
  text-align: left;
  width: 100%;
  position: relative;
  color: inherit;
  font-family: inherit;
}

.notif-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--border-subtle);
}

.notif-item.notif-unread {
  background: rgba(217, 255, 77, 0.03);
  border-color: rgba(217, 255, 77, 0.08);
}

.notif-item.notif-unread:hover {
  background: rgba(217, 255, 77, 0.06);
}

/* Icon */
.notif-item-icon {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-top: 2px;
}

.notif-item-icon.accent-lime {
  background: var(--accent-lime-dim);
}

.notif-item-icon.accent-purple {
  background: var(--accent-purple-dim);
}

.notif-item-icon.accent-coral {
  background: var(--accent-coral-dim);
}

/* Content */
.notif-item-content {
  flex: 1;
  min-width: 0;
}

.notif-item-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.notif-item-message {
  font-size: 0.83rem;
  color: var(--text-secondary);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-item-time {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Unread Dot */
.notif-unread-dot {
  width: 8px;
  height: 8px;
  min-width: 8px;
  background: var(--accent-lime);
  border-radius: 50%;
  margin-top: 8px;
  box-shadow: 0 0 8px var(--accent-lime-glow);
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

/* Dismiss Button */
.notif-item-dismiss {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.notif-item:hover .notif-item-dismiss {
  opacity: 1;
}

.notif-item-dismiss:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
}

/* Footer */
.notif-panel-footer {
  padding: 16px 24px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-subtle);
}

.notif-clear-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-family: var(--font-heading);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.notif-clear-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--accent-red);
}

/* Animations */
.panel-slide-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}

.panel-backdrop-enter-active {
  transition: opacity 0.3s ease;
}
.panel-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.panel-backdrop-enter-from,
.panel-backdrop-leave-to {
  opacity: 0;
}

.notif-item-enter-active {
  transition: all 0.3s ease;
}
.notif-item-leave-active {
  transition: all 0.2s ease;
}
.notif-item-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.notif-item-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

@media (max-width: 480px) {
  .notif-panel {
    width: 100vw;
  }
}
</style>
