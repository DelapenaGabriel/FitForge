import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'

const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY'
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'
const OPENFOODFACTS_BASE = 'https://world.openfoodfacts.org/api/v2'

const FATSECRET_CLIENT_ID = import.meta.env.VITE_FATSECRET_CLIENT_ID
const FATSECRET_CLIENT_SECRET = import.meta.env.VITE_FATSECRET_CLIENT_SECRET

let fatSecretToken = null
let fatSecretTokenExpires = 0

function parseServingGrams(str) {
  if (!str) return null
  const match = str.match(/([\d.]+)\s*g/i)
  return match ? parseFloat(match[1]) : null
}

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
    offResults: [],
    fatSecretResults: [],
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
        fiber_g: Number(food.fiber_g) || 0,
        sugars_g: Number(food.sugars_g) || 0,
        serving_size: food.serving_size || null,
        serving_weight_g: food.serving_weight_g ? Number(food.serving_weight_g) : null,
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

    async updateFoodLogTime(id, newHour) {
      const auth = useAuthStore()
      if (!auth.user) return

      const log = this.foodLogs.find(l => l.id === id)
      if (!log) return

      const newDate = new Date(log.logged_at)
      newDate.setHours(newHour)

      const { data, error } = await supabase
        .from('food_logs')
        .update({ logged_at: newDate.toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating food log time:', error)
        throw error
      }

      log.logged_at = data.logged_at
      this.foodLogs = [...this.foodLogs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
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
          `${OPENFOODFACTS_BASE}/product/${barcode}?fields=product_name,brands,nutriments,serving_size,serving_quantity`
        )
        const json = await res.json()

        if (json.status === 'success' && json.product) {
          const p = json.product
          const n = p.nutriments || {}
          const servingG = p.serving_quantity || parseServingGrams(p.serving_size) || 100
          return {
            food_name: p.product_name || 'Unknown Product',
            brand: p.brands || null,
            calories: Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0),
            protein_g: Math.round(n.proteins_serving || n.proteins_100g || 0),
            fat_g: Math.round(n.fat_serving || n.fat_100g || 0),
            carbs_g: Math.round(n.carbohydrates_serving || n.carbohydrates_100g || 0),
            fiber_g: Math.round((n.fiber_serving || n.fiber_100g || 0) * 10) / 10,
            sugars_g: Math.round((n.sugars_serving || n.sugars_100g || 0) * 10) / 10,
            sodium_mg: Math.round((n.sodium_serving || n.sodium_100g || 0) * 1000),
            cholesterol_mg: Math.round((n['cholesterol_serving'] || n['cholesterol_100g'] || 0) * 1000),
            serving_size: p.serving_size || '100g',
            serving_weight_g: servingG,
            source: 'openfoodfacts',
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

    async searchOpenFoodFacts(query) {
      if (!query || query.length < 2) {
        this.offResults = []
        return
      }
      try {
        const res = await fetch(
          `${OPENFOODFACTS_BASE}/search?search_terms=${encodeURIComponent(query)}&fields=code,product_name,brands,nutriments,serving_size,serving_quantity&page_size=25&sort_by=unique_scans_n`
        )
        const json = await res.json()
        if (!json.products) { this.offResults = []; return }

        this.offResults = json.products
          .filter(p => p.product_name)
          .map(p => {
            const n = p.nutriments || {}
            const servingG = p.serving_quantity || parseServingGrams(p.serving_size) || 100
            return {
              food_name: p.product_name,
              brand: p.brands || null,
              calories: Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0),
              protein_g: Math.round(n.proteins_serving || n.proteins_100g || 0),
              fat_g: Math.round(n.fat_serving || n.fat_100g || 0),
              carbs_g: Math.round(n.carbohydrates_serving || n.carbohydrates_100g || 0),
              fiber_g: Math.round((n.fiber_serving || n.fiber_100g || 0) * 10) / 10,
              sugars_g: Math.round((n.sugars_serving || n.sugars_100g || 0) * 10) / 10,
              sodium_mg: Math.round((n.sodium_serving || n.sodium_100g || 0) * 1000),
              cholesterol_mg: Math.round((n['cholesterol_serving'] || n['cholesterol_100g'] || 0) * 1000),
              serving_size: p.serving_size || '100g',
              serving_weight_g: servingG,
              source: 'openfoodfacts',
              source_id: p.code
            }
          })
      } catch (err) {
        console.error('Open Food Facts search error:', err)
        this.offResults = []
      }
    },

    async getFatSecretToken() {
      if (fatSecretToken && Date.now() < fatSecretTokenExpires) {
        return fatSecretToken
      }

      if (!FATSECRET_CLIENT_ID || !FATSECRET_CLIENT_SECRET) {
        console.warn('FatSecret API keys missing')
        return null
      }

      try {
        const credentials = btoa(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`)
        const response = await fetch('/api/fatsecret/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'basic'
          })
        })

        if (!response.ok) {
          throw new Error(`FatSecret Token Error: ${response.statusText}`)
        }

        const data = await response.json()
        fatSecretToken = data.access_token
        // Set expiry 5 minutes before actual expiry to be safe
        fatSecretTokenExpires = Date.now() + (data.expires_in - 300) * 1000
        return fatSecretToken
      } catch (err) {
        console.error('Error fetching FatSecret token:', err)
        return null
      }
    },

    async searchFatSecret(query) {
      if (!query || query.length < 2) {
        this.fatSecretResults = []
        return
      }

      const token = await this.getFatSecretToken()
      if (!token) {
        this.fatSecretResults = []
        return
      }

      try {
        const params = new URLSearchParams({
          method: 'foods.search',
          search_expression: query,
          format: 'json',
          max_results: '20'
        })

        const response = await fetch(`/api/fatsecret/rest?${params.toString()}`, {
          method: 'POST', // FatSecret accepts POST for REST endpoints to keep query secure
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error(`FatSecret API Error: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.foods || !data.foods.food) {
          this.fatSecretResults = []
          return
        }

        const foods = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food]

        this.fatSecretResults = foods.map(f => {
          // FatSecret returns a description like "Per 100g - Calories: 250kcal | Fat: 10.00g | Carbs: 30.00g | Protein: 5.00g"
          let cal = 0, p = 0, f_val = 0, c = 0
          const desc = f.food_description || ''
          
          const calMatch = desc.match(/Calories:\s*([\d.]+)/i)
          if (calMatch) cal = Math.round(parseFloat(calMatch[1]))
          
          const pMatch = desc.match(/Protein:\s*([\d.]+)/i)
          if (pMatch) p = Math.round(parseFloat(pMatch[1]))
          
          const fMatch = desc.match(/Fat:\s*([\d.]+)/i)
          if (fMatch) f_val = Math.round(parseFloat(fMatch[1]))
          
          const cMatch = desc.match(/Carbs:\s*([\d.]+)/i)
          if (cMatch) c = Math.round(parseFloat(cMatch[1]))

          // Parse serving size from the start of description (e.g. "Per 100g - ...")
          let servingSize = '100g'
          const servingMatch = desc.match(/^Per\s+([^-]+)\s*-/i)
          if (servingMatch) {
            servingSize = servingMatch[1].trim()
          }

          return {
            food_name: f.food_name || 'Unknown',
            brand: f.brand_name || null,
            calories: cal,
            protein_g: p,
            fat_g: f_val,
            carbs_g: c,
            serving_size: servingSize,
            source: 'fatsecret',
            source_id: String(f.food_id)
          }
        })
      } catch (err) {
        console.error('FatSecret search error:', err)
        this.fatSecretResults = []
      }
    },


    async fetchRecentFoods() {
      const auth = useAuthStore()
      if (!auth.user) return

      try {
        let query = supabase
          .from('food_logs')
          .select('food_name, brand, calories, protein_g, fat_g, carbs_g, fiber_g, sugars_g, serving_size, serving_weight_g')
          .eq('user_id', auth.user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        const clearedAt = localStorage.getItem(`fitforge_recent_cleared_${auth.user.id}`)
        if (clearedAt) {
          query = query.gt('created_at', clearedAt)
        }

        const { data, error } = await query

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

    clearRecentFoods() {
      const auth = useAuthStore()
      if (auth.user) {
        localStorage.setItem(`fitforge_recent_cleared_${auth.user.id}`, new Date().toISOString())
      }
      this.recentFoods = []
    },

    setSelectedDate(date) {
      this.selectedDate = new Date(date)
      this.fetchLogs(this.selectedDate)
    },

    async createCustomFood(payload) {
      const auth = useAuthStore()
      if (!auth.user) return null

      try {
        const { data, error } = await supabase
          .from('custom_foods')
          .insert(payload)
          .select()
          .single()

        if (error) {
          console.error('Error creating custom food:', error)
          return null
        }
        
        // Return the created food with source properties so it works directly with selectFood
        return {
          ...data,
          source: 'custom',
          source_id: data.id
        }
      } catch (err) {
        console.error('Error creating custom food:', err)
        return null
      }
    }
  }
})
