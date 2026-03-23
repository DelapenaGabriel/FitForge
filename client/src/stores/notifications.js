import { defineStore } from 'pinia'
import api from '@/api' // using the standard api axios instance

let nextId = 1

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: [], // { id, title, message, route, time, read }
    toastQueue: [],
    panelOpen: false,
    pushPermission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
  }),

  getters: {
    unreadCount(state) {
      return state.notifications.filter(n => !n.read).length
    },
    sortedNotifications(state) {
      return [...state.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  },

  actions: {
    // ── Database API Sync ──────────────────────────────
    
    async fetchNotifications() {
      try {
        const res = await api.get('/notifications')
        this.notifications = res.data
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
      }
    },
    
    async markAsRead(id) {
      try {
        await api.put(`/notifications/${id}/read`)
        const n = this.notifications.find(x => x.id === id)
        if (n) n.read = true
      } catch (err) {
        console.error('Failed to mark read:', err)
      }
    },

    async markAllAsRead() {
      try {
        await api.put('/notifications/read-all')
        this.notifications.forEach(n => { n.read = true })
      } catch (err) {
        console.error('Failed to mark all read:', err)
      }
    },

    clearAll() {
      this.markAllAsRead() // No delete endpoint yet, so just mark all read
    },

    removeNotification(id) {
      // Just local remove for now to hide it
      this.notifications = this.notifications.filter(x => x.id !== id)
    },

    // ── Local Panel & Toasts ───────────────────────────
    
    togglePanel() {
      if (!this.panelOpen) {
        this.fetchNotifications()
      }
      this.panelOpen = !this.panelOpen
    },

    closePanel() {
      this.panelOpen = false
    },

    showToast({ type = 'info', title, message }) {
      const toast = {
        id: nextId++,
        type,
        title,
        message,
        timestamp: Date.now()
      }
      this.toastQueue.push(toast)

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        this.dismissToast(toast.id)
      }, 4000)
    },

    dismissToast(id) {
      this.toastQueue = this.toastQueue.filter(t => t.id !== id)
    },

    // ── Push Permission ────────────────────────────────
    
    async requestPushPermission() {
      if (typeof Notification === 'undefined') return 'unsupported'
      try {
        const result = await Notification.requestPermission()
        this.pushPermission = result
        if (result === 'granted') {
          this.showToast({
            type: 'success',
            title: '🔔 Notifications Enabled',
            message: 'You\'ll now receive push notifications for important updates.'
          })
        }
        return result
      } catch {
        return 'denied'
      }
    },

    _showNativePush(title, body) {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: `FitForge: ${title}`,
            body,
            icon: '/fitforge_lime.png'
          })
        } else {
          new Notification(`FitForge: ${title}`, {
            body,
            icon: '/fitforge_lime.png',
            badge: '/fitforge_lime.png'
          })
        }
      } catch {
        // Silently fail if native notifications aren't available
      }
    }
  }
})
