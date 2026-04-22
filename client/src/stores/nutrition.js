import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'

const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY'
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'
const OPENFOODFACTS_BASE = 'https://world.openfoodfacts.org/api/v2'

export const useNutritionStore = defineStore('nutrition', {
  state: () => ({
    settings: {
      daily_calories: 2130,
      protein_g: 190,
      fat_g: 70,
      carbs_g: 185
    },
    foodLogs: [],
    selectedDate: new Date(),
    loading: false,
    searchLoading: false,
    searchResults: [],
    recentFoods: [],
    customFoods: [],
    settingsLoaded: false
  }),

  getters: {
    dailyTotals(state) {
      const totals = { calories: 0, protein: 0, fat: 0, carbs: 0 }
      state.foodLogs.forEach(log => {
        totals.calories += Number(log.calories) || 0
        totals.protein += Number(log.protein_g) || 0
        totals.fat += Number(log.fat_g) || 0
        totals.carbs += Number(log.carbs_g) || 0
      })
      return {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        fat: Math.round(totals.fat),
        carbs: Math.round(totals.carbs)
      }
    },

    macroProgress(state) {
      const t = this.dailyTotals
      const s = state.settings
      return {
        calories: s.daily_calories ? Math.min((t.calories / s.daily_calories) * 100, 100) : 0,
        protein: s.protein_g ? Math.min((t.protein / s.protein_g) * 100, 100) : 0,
        fat: s.fat_g ? Math.min((t.fat / s.fat_g) * 100, 100) : 0,
        carbs: s.carbs_g ? Math.min((t.carbs / s.carbs_g) * 100, 100) : 0
      }
    },

    logsByHour(state) {
      const grouped = {}
      for (let h = 0; h < 24; h++) {
        grouped[h] = []
      }
      state.foodLogs.forEach(log => {
        const dt = new Date(log.logged_at)
        const hour = dt.getHours()
        grouped[hour].push(log)
      })
      return grouped
    },

    // Get the sum of macros for a given hour
    hourMacros() {
      return (hour) => {
        const logs = this.logsByHour[hour] || []
        const totals = { calories: 0, protein: 0, fat: 0, carbs: 0 }
        logs.forEach(log => {
          totals.calories += Number(log.calories) || 0
          totals.protein += Number(log.protein_g) || 0
          totals.fat += Number(log.fat_g) || 0
          totals.carbs += Number(log.carbs_g) || 0
        })
        return {
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein),
          fat: Math.round(totals.fat),
          carbs: Math.round(totals.carbs)
        }
      }
    }
  },

  actions: {
    async fetchSettings() {
      const auth = useAuthStore()
      if (!auth.user) return

      const { data, error } = await supabase
        .from('nutrition_settings')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching nutrition settings:', error)
        return
      }

      if (data) {
        this.settings = {
          id: data.id,
          daily_calories: data.daily_calories,
          protein_g: data.protein_g,
          fat_g: data.fat_g,
          carbs_g: data.carbs_g
        }
      }
      this.settingsLoaded = true
    },

    async saveSettings(newSettings) {
      const auth = useAuthStore()
      if (!auth.user) return

      const payload = {
        user_id: auth.user.id,
        daily_calories: newSettings.daily_calories,
        protein_g: newSettings.protein_g,
        fat_g: newSettings.fat_g,
        carbs_g: newSettings.carbs_g,
        updated_at: new Date().toISOString()
      }

      // Upsert — insert if not exists, update if exists
      const { data, error } = await supabase
        .from('nutrition_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        console.error('Error saving nutrition settings:', error)
        throw error
      }

      this.settings = {
        id: data.id,
        daily_calories: data.daily_calories,
        protein_g: data.protein_g,
        fat_g: data.fat_g,
        carbs_g: data.carbs_g
      }

      return data
    },

    async fetchLogs(date) {
      const auth = useAuthStore()
      if (!auth.user) return

      this.loading = true
      try {
        // Get start and end of the selected day
        const d = new Date(date)
        const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
        const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

        const { data, error } = await supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', auth.user.id)
          .gte('logged_at', startOfDay.toISOString())
          .lte('logged_at', endOfDay.toISOString())
          .order('logged_at', { ascending: true })

        if (error) {
          console.error('Error fetching food logs:', error)
          return
        }

        this.foodLogs = data || []
      } finally {
        this.loading = false
      }
    },

    async addFoodLog(food, loggedAt) {
      const auth = useAuthStore()
      if (!auth.user) return

      const payload = {
        user_id: auth.user.id,
        food_name: food.food_name || food.name,
        brand: food.brand || null,
        calories: Math.round(Number(food.calories) || 0),
        protein_g: Number(food.protein_g) || 0,
        fat_g: Number(food.fat_g) || 0,
        carbs_g: Number(food.carbs_g) || 0,
        serving_size: food.serving_size || null,
        serving_qty: food.serving_qty || 1,
        logged_at: loggedAt.toISOString(),
        source: food.source || 'manual',
        source_id: food.source_id || null
      }

      const { data, error } = await supabase
        .from('food_logs')
        .insert(payload)
        .select()
        .single()

      if (error) {
        console.error('Error adding food log:', error)
        throw error
      }

      // Add to local state if same day
      const logDate = new Date(loggedAt)
      const selDate = new Date(this.selectedDate)
      if (
        logDate.getFullYear() === selDate.getFullYear() &&
        logDate.getMonth() === selDate.getMonth() &&
        logDate.getDate() === selDate.getDate()
      ) {
        this.foodLogs.push(data)
        this.foodLogs.sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
      }

      return data
    },

    async deleteFoodLog(id) {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting food log:', error)
        throw error
      }

      this.foodLogs = this.foodLogs.filter(l => l.id !== id)
    },

    async searchUSDA(query) {
      if (!query || query.length < 2) {
        this.searchResults = []
        return
      }

      this.searchLoading = true
      try {
        const res = await fetch(
          `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=20&dataType=Branded,SR%20Legacy,Foundation&api_key=${USDA_API_KEY}`
        )
        const json = await res.json()

        if (!json.foods) {
          this.searchResults = []
          return
        }

        this.searchResults = json.foods.map(f => {
          const nutrients = {}
          ;(f.foodNutrients || []).forEach(n => {
            // Energy (kcal)
            if (n.nutrientId === 1008 || n.nutrientName === 'Energy') {
              nutrients.calories = Math.round(n.value || 0)
            }
            // Protein
            if (n.nutrientId === 1003 || n.nutrientName === 'Protein') {
              nutrients.protein_g = Math.round(n.value || 0)
            }
            // Total Fat
            if (n.nutrientId === 1004 || n.nutrientName === 'Total lipid (fat)') {
              nutrients.fat_g = Math.round(n.value || 0)
            }
            // Carbs
            if (n.nutrientId === 1005 || n.nutrientName === 'Carbohydrate, by difference') {
              nutrients.carbs_g = Math.round(n.value || 0)
            }
          })

          return {
            food_name: f.description || f.lowercaseDescription || 'Unknown',
            brand: f.brandName || f.brandOwner || null,
            calories: nutrients.calories || 0,
            protein_g: nutrients.protein_g || 0,
            fat_g: nutrients.fat_g || 0,
            carbs_g: nutrients.carbs_g || 0,
            serving_size: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || 'g'}` : (f.householdServingFullText || '100g'),
            source: 'usda',
            source_id: String(f.fdcId)
          }
        })
      } catch (err) {
        console.error('USDA search error:', err)
        this.searchResults = []
      } finally {
        this.searchLoading = false
      }
    },

    async searchCustomFoods(query) {
      if (!query || query.length < 2) {
        this.customFoods = []
        return
      }

      try {
        const { data, error } = await supabase
          .from('custom_foods')
          .select('*')
          .ilike('food_name', `%${query}%`)
          .limit(20)

        if (error) {
          console.error('Error searching custom foods:', error)
          return
        }

        this.customFoods = (data || []).map(f => ({
          ...f,
          source: 'custom',
          source_id: f.id
        }))
      } catch (err) {
        console.error('Custom food search error:', err)
      }
    },

    async searchBarcode(barcode) {
      this.searchLoading = true
      try {
        const res = await fetch(
          `${OPENFOODFACTS_BASE}/product/${barcode}?fields=product_name,brands,nutriments,serving_size`
        )
        const json = await res.json()

        if (json.status === 'success' && json.product) {
          const p = json.product
          const n = p.nutriments || {}
          return {
            food_name: p.product_name || 'Unknown Product',
            brand: p.brands || null,
            calories: Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0),
            protein_g: Math.round(n.proteins_serving || n.proteins_100g || 0),
            fat_g: Math.round(n.fat_serving || n.fat_100g || 0),
            carbs_g: Math.round(n.carbohydrates_serving || n.carbohydrates_100g || 0),
            serving_size: p.serving_size || '100g',
            source: 'barcode',
            source_id: barcode
          }
        }
        return null
      } catch (err) {
        console.error('Barcode lookup error:', err)
        return null
      } finally {
        this.searchLoading = false
      }
    },

    async fetchRecentFoods() {
      const auth = useAuthStore()
      if (!auth.user) return

      try {
        const { data, error } = await supabase
          .from('food_logs')
          .select('food_name, brand, calories, protein_g, fat_g, carbs_g, serving_size')
          .eq('user_id', auth.user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.error('Error fetching recent foods:', error)
          return
        }

        // Deduplicate by food_name
        const seen = new Set()
        this.recentFoods = (data || []).filter(f => {
          const key = f.food_name.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }).slice(0, 10).map(f => ({
          ...f,
          source: 'recent'
        }))
      } catch (err) {
        console.error('Recent foods error:', err)
      }
    },

    setSelectedDate(date) {
      this.selectedDate = new Date(date)
      this.fetchLogs(this.selectedDate)
    }
  }
})
