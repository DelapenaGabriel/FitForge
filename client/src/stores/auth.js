import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // this will be the public.users record
    supabaseUser: null, // this will be the auth.users record
    token: null, // no longer strictly needed by our app directly but kept for legacy compat
    loading: false,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    currentUser: (state) => state.user
  },

  actions: {
    async initialize() {
      if (this.initialized) return
      await this.fetchMe()
      this.initialized = true
    },

    async register(email, password, displayName) {
      this.loading = true
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName }
          }
        })
        if (error) throw error
        
        // After signup, the trigger creates public.users. Let's fetch it.
        // It might take a split second.
        await this.fetchMe(data.session)
        return this.user
      } finally {
        this.loading = false
      }
    },

    async login(email, password) {
      this.loading = true
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        await this.fetchMe(data.session)
        return this.user
      } finally {
        this.loading = false
      }
    },

    async fetchMe(session = null) {
      this.loading = true
      try {
        let activeSession = session
        if (!activeSession) {
          const { data, error } = await supabase.auth.getSession()
          if (error) throw error
          activeSession = data.session
        }
        
        if (!activeSession) {
          this.user = null
          this.supabaseUser = null
          return
        }

        this.supabaseUser = activeSession.user
        this.token = activeSession.access_token

        // Fetch the corresponding public.users record
        const { data: publicUser, error: pubError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', this.supabaseUser.id)
          .single()

        if (pubError && pubError.code !== 'PGRST116') throw pubError
        
        // Map snake_case to camelCase
        if (publicUser) {
          this.user = {
            id: publicUser.id,
            email: publicUser.email,
            displayName: publicUser.display_name,
            avatarUrl: publicUser.avatar_url,
            createdAt: publicUser.created_at
          }
        } else {
          this.user = null
        }
      } catch (err) {
        console.error('Error fetching user:', err)
        this.user = null
      } finally {
        this.loading = false
      }
    },

    async updateProfile({ displayName, avatarUrl } = {}) {
      if (!this.user) return

      const updates = {}
      if (displayName !== undefined) updates.display_name = displayName
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', this.user.id)
        .select()
        .single()
        
      if (error) throw error

      this.user = {
        ...this.user,
        displayName: data.display_name,
        avatarUrl: data.avatar_url
      }
      return this.user
    },

    async logout() {
      const { error } = await supabase.auth.signOut()
      if (error) console.error('Error signing out:', error)
      this.user = null
      this.supabaseUser = null
      this.token = null
      this.initialized = false
    }
  }
})
