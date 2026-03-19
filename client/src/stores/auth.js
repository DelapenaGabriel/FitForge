import { defineStore } from 'pinia'
import api from '@/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('fitforge_token') || null,
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user
  },

  actions: {
    async register(email, password, displayName) {
      this.loading = true
      try {
        const { data } = await api.post('/auth/register', { email, password, displayName })
        this.token = data.token
        this.user = data.user
        localStorage.setItem('fitforge_token', data.token)
        return data
      } finally {
        this.loading = false
      }
    },

    async login(email, password) {
      this.loading = true
      try {
        const { data } = await api.post('/auth/login', { email, password })
        this.token = data.token
        this.user = data.user
        localStorage.setItem('fitforge_token', data.token)
        return data
      } finally {
        this.loading = false
      }
    },

    async fetchMe() {
      if (!this.token) return
      try {
        const { data } = await api.get('/auth/me')
        this.user = data
      } catch {
        this.logout()
      }
    },

    async updateProfile({ displayName, avatarUrl } = {}) {
      const currentName = displayName !== undefined ? displayName : this.user?.displayName
      const currentAvatar = avatarUrl !== undefined ? avatarUrl : this.user?.avatarUrl

      const params = new URLSearchParams()
      if (currentName) params.append('displayName', currentName)
      if (currentAvatar) params.append('avatarUrl', currentAvatar)
      
      const { data } = await api.put(`/auth/me?${params.toString()}`)
      this.user = data
      return data
    },

    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('fitforge_token')
    }
  }
})
