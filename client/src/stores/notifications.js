import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'

let nextId = 1

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: [], // { id, title, message, route, created_at, is_read }
    toastQueue: [],
    panelOpen: false,
    pushPermission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
  }),

  getters: {
    unreadCount(state) {
      return state.notifications.filter(n => !n.is_read).length
    },
    sortedNotifications(state) {
      return [...state.notifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
  },

  actions: {
    // ── Database API Sync ──────────────────────────────
    
    async fetchNotifications() {
      const auth = useAuthStore()
      if (!auth.user) return
      
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', auth.user.id)
          .order('created_at', { ascending: false })
          
        if (error) throw error
        this.notifications = data
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
      }
    },
    
    async markAsRead(id) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id)
          
        if (error) throw error
        const n = this.notifications.find(x => x.id === id)
        if (n) n.is_read = true
      } catch (err) {
        console.error('Failed to mark read:', err)
      }
    },

    async markAllAsRead() {
      const auth = useAuthStore()
      if (!auth.user) return

      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', auth.user.id)
          .eq('is_read', false)
          
        if (error) throw error
        this.notifications.forEach(n => { n.is_read = true })
      } catch (err) {
        console.error('Failed to mark all read:', err)
      }
    },

    async clearAll() {
      const auth = useAuthStore()
      if (!auth.user) return

      try {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', auth.user.id)
          
        if (error) throw error
        this.notifications = []
      } catch (err) {
        console.error('Failed to clear all notifications:', err)
      }
    },

    async removeNotification(id) {
      try {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', id)
          
        if (error) throw error
        this.notifications = this.notifications.filter(x => x.id !== id)
      } catch (err) {
        console.error('Failed to delete notification:', err)
      }
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
        // Silently fail
      }
    }
  }
})
