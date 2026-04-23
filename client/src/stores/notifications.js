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

    // ── Realtime Subscription ──────────────────────────
    
    subscribeToRealtime() {
      const auth = useAuthStore()
      if (!auth.user || this._channel) return

      this._channel = supabase.channel('user-notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${auth.user.id}` },
          (payload) => {
            const newNotif = payload.new
            this.notifications.unshift(newNotif)
            this.showToast({
              type: newNotif.type,
              title: newNotif.title,
              message: newNotif.message
            })
          }
        )
        .subscribe()
    },

    unsubscribeFromRealtime() {
      if (this._channel) {
        supabase.removeChannel(this._channel)
        this._channel = null
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

    // ── Push Permission & Subscriptions ────────────────
    
    urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4)
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')
      const rawData = window.atob(base64)
      const outputArray = new Uint8Array(rawData.length)
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
      }
      return outputArray
    },

    async requestPushPermission() {
      if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return 'unsupported'
      }
      try {
        const result = await Notification.requestPermission()
        this.pushPermission = result
        if (result === 'granted') {
          await this.subscribeToPush()
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

    async subscribeToPush() {
      const auth = useAuthStore()
      if (!auth.user) return

      try {
        const registration = await navigator.serviceWorker.ready
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
        
        if (!vapidPublicKey) return

        const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey)
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        })

        // Save subscription to database
        const subData = JSON.parse(JSON.stringify(subscription))
        await supabase.from('push_subscriptions').upsert({
          user_id: auth.user.id,
          endpoint: subData.endpoint,
          p256dh: subData.keys.p256dh,
          auth: subData.keys.auth
        }, { onConflict: 'user_id, endpoint' })
        
      } catch (err) {
        console.error('Failed to subscribe to push:', err)
      }
    }
  }
})
