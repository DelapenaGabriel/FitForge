<script setup>
import { computed } from 'vue'
import { useNotificationStore } from '@/stores/notifications'

const notifs = useNotificationStore()

const toasts = computed(() => notifs.toastQueue)

const getTypeColor = (type) => {
  const colors = {
    success: 'toast-success',
    info: 'toast-info',
    warning: 'toast-warning',
    comment: 'toast-info',
    milestone: 'toast-success',
    group: 'toast-warning'
  }
  return colors[type] || 'toast-info'
}

const getTypeIcon = (type) => {
  const icons = {
    success: '🏆',
    info: '📊',
    warning: '⚠️',
    comment: '💬',
    milestone: '🎯',
    group: '👥'
  }
  return icons[type] || '🔔'
}
</script>

<template>
  <div class="toast-stack">
    <TransitionGroup name="toast-slide">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-notification"
        :class="getTypeColor(toast.type)"
        @click="notifs.dismissToast(toast.id)"
      >
        <div class="toast-icon">{{ getTypeIcon(toast.type) }}</div>
        <div class="toast-body">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-dismiss" @click.stop="notifs.dismissToast(toast.id)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="toast-progress">
          <div class="toast-progress-bar"></div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: max(16px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: calc(100% - 32px);
  max-width: 420px;
  pointer-events: none;
}

.toast-notification {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: var(--radius-md);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  cursor: pointer;
  pointer-events: all;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
}

/* Type Variants */
.toast-success {
  background: rgba(16, 30, 8, 0.92);
  border: 1px solid rgba(217, 255, 77, 0.2);
}

.toast-info {
  background: rgba(20, 14, 40, 0.92);
  border: 1px solid rgba(179, 153, 255, 0.2);
}

.toast-warning {
  background: rgba(40, 18, 10, 0.92);
  border: 1px solid rgba(255, 112, 67, 0.2);
}

/* Icon */
.toast-icon {
  width: 38px;
  height: 38px;
  min-width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 1.15rem;
}

.toast-success .toast-icon {
  background: var(--accent-lime-dim);
}

.toast-info .toast-icon {
  background: var(--accent-purple-dim);
}

.toast-warning .toast-icon {
  background: var(--accent-coral-dim);
}

/* Body */
.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.toast-message {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dismiss */
.toast-dismiss {
  width: 28px;
  height: 28px;
  min-width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 2px;
}

.toast-dismiss:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
}

/* Progress bar */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.05);
}

.toast-progress-bar {
  height: 100%;
  border-radius: 0 0 0 var(--radius-md);
  animation: toast-countdown 4s linear forwards;
}

.toast-success .toast-progress-bar {
  background: var(--accent-lime);
  box-shadow: 0 0 8px var(--accent-lime-glow);
}

.toast-info .toast-progress-bar {
  background: var(--accent-purple);
  box-shadow: 0 0 8px var(--accent-purple-glow);
}

.toast-warning .toast-progress-bar {
  background: var(--accent-coral);
  box-shadow: 0 0 8px var(--accent-coral-glow);
}

@keyframes toast-countdown {
  from { width: 100%; }
  to { width: 0%; }
}

/* Slide Animation */
.toast-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.toast-slide-move {
  transition: transform 0.3s ease;
}
</style>
