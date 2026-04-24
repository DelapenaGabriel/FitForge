import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'

const FATSECRET_CLIENT_ID = import.meta.env.VITE_FATSECRET_CLIENT_ID
const FATSECRET_CLIENT_SECRET = import.meta.env.VITE_FATSECRET_CLIENT_SECRET

// OAuth 1.0 Signing Helpers using native Web Crypto API
const rfc3986 = (str) => encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

async function getFatSecretParams(method, params, httpMethod = 'GET') {
  const baseUrl = 'https://platform.fatsecret.com/rest/server.api';
  
  const oauthParams = {
    oauth_consumer_key: FATSECRET_CLIENT_ID,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_version: '1.0'
  };

  const allParams = { ...params, method, format: 'json', ...oauthParams };
  
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(allParams).sort();
  const baseParts = sortedKeys.map(key => `${rfc3986(key)}=${rfc3986(allParams[key])}`);
  const parameterString = baseParts.join('&');
  
  const baseString = `${httpMethod}&${rfc3986(baseUrl)}&${rfc3986(parameterString)}`;
  const signingKey = `${rfc3986(FATSECRET_CLIENT_SECRET)}&`;

  // Sign using SubtleCrypto
  const enc = new TextEncoder();
  const keyData = enc.encode(signingKey);
  const baseData = enc.encode(baseString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, baseData);
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  // Return both the raw params and a pre-encoded query string for the fetch call
  return { 
    ...allParams, 
    oauth_signature: signature,
    queryString: `${parameterString}&oauth_signature=${rfc3986(signature)}`
  };
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

    async updateFoodLogDetails(id, payload) {
      const auth = useAuthStore()
      if (!auth.user) return

      const { data, error } = await supabase
        .from('food_logs')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating food log details:', error)
        throw error
      }

      const logIndex = this.foodLogs.findIndex(l => l.id === id)
      if (logIndex !== -1) {
        this.foodLogs[logIndex] = { ...this.foodLogs[logIndex], ...data }
      }

      return data
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

    // Removed USDA and Custom Foods search

    async searchBarcode(barcode) {
      this.searchLoading = true
      try {
        const params = await getFatSecretParams('food.find_id_for_barcode', {
          barcode: barcode
        });

        const res = await fetch(`/api/fatsecret/rest?${params.queryString}`)
        const json = await res.json()
        
        if (json.error) {
          console.error('FatSecret Barcode Find Error:', json.error);
          return null;
        }

        if (!json.food_id || json.food_id.value === '0') {
          return null
        }

        const foodId = json.food_id.value

        const detailsParams = await getFatSecretParams('food.get.v4', {
          food_id: foodId
        })

        const detailsRes = await fetch(`/api/fatsecret/rest?${detailsParams.queryString}`)
        const detailsJson = await detailsRes.json()

        if (detailsJson.error) {
          console.error('FatSecret Food Details Error:', detailsJson.error);
          return null;
        }

        if (!detailsJson.food) return null

        const f = detailsJson.food
        const rawServings = f.servings?.serving
        const servingsArr = Array.isArray(rawServings) ? rawServings : (rawServings ? [rawServings] : [])

        // Parse ALL servings with full nutrition data
        const allServings = servingsArr.map(s => ({
          serving_id: s.serving_id,
          serving_description: s.serving_description || '',
          metric_serving_amount: parseFloat(s.metric_serving_amount || 0),
          metric_serving_unit: s.metric_serving_unit || 'g',
          number_of_units: parseFloat(s.number_of_units || 1),
          measurement_description: s.measurement_description || '',
          calories: parseFloat(s.calories || 0),
          protein: parseFloat(s.protein || 0),
          fat: parseFloat(s.fat || 0),
          carbohydrate: parseFloat(s.carbohydrate || 0),
          fiber: parseFloat(s.fiber || 0),
          sugar: parseFloat(s.sugar || 0),
          sodium: parseFloat(s.sodium || 0),
          cholesterol: parseFloat(s.cholesterol || 0),
        }))

        const defaultServing = allServings.find(s =>
          s.measurement_description !== 'g' && s.measurement_description !== 'ml'
        ) || allServings[0]

        const ds = defaultServing || {}

        return {
          food_name: f.food_name || 'Unknown Product',
          brand: f.brand_name || null,
          calories: Math.round(ds.calories || 0),
          protein_g: Math.round((ds.protein || 0) * 10) / 10,
          fat_g: Math.round((ds.fat || 0) * 10) / 10,
          carbs_g: Math.round((ds.carbohydrate || 0) * 10) / 10,
          fiber_g: Math.round((ds.fiber || 0) * 10) / 10,
          sugars_g: Math.round((ds.sugar || 0) * 10) / 10,
          sodium_mg: Math.round(ds.sodium || 0),
          cholesterol_mg: Math.round(ds.cholesterol || 0),
          serving_size: ds.serving_description || '1 serving',
          serving_weight_g: ds.metric_serving_amount ? ds.metric_serving_amount : null,
          servings: allServings,
          source: 'fatsecret',
          source_id: String(f.food_id)
        }
      } catch (err) {
        console.error('Barcode lookup error:', err)
        return null
      } finally {
        this.searchLoading = false
      }
    },

    async searchFatSecret(query) {
      if (!query || query.length < 2) {
        this.fatSecretResults = []
        return
      }

      this.searchLoading = true
      try {
        const params = await getFatSecretParams('foods.search', {
          search_expression: query,
          max_results: '20'
        })

        const response = await fetch(`/api/fatsecret/rest?${params.queryString}`)

        if (!response.ok) {
          throw new Error(`FatSecret API Network Error: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (data.error) {
          console.error('FatSecret Search API Error:', data.error);
          this.fatSecretResults = []
          return
        }
        
        if (!data.foods || !data.foods.food) {
          this.fatSecretResults = []
          return
        }

        const foods = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food]

        this.fatSecretResults = foods.map(f => {
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

          let servingSize = '1 serving'
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
      } finally {
        this.searchLoading = false
      }
    },


    async getFoodDetails(foodId) {
      try {
        const detailsParams = await getFatSecretParams('food.get.v4', {
          food_id: String(foodId)
        })

        const res = await fetch(`/api/fatsecret/rest?${detailsParams.queryString}`)
        const json = await res.json()

        if (json.error || !json.food) {
          console.error('FatSecret Food Details Error:', json.error || 'No food data')
          return null
        }

        const f = json.food
        const rawServings = f.servings?.serving
        const servingsArr = Array.isArray(rawServings) ? rawServings : (rawServings ? [rawServings] : [])

        // Parse ALL servings with full nutrition data
        const allServings = servingsArr.map(s => ({
          serving_id: s.serving_id,
          serving_description: s.serving_description || '',
          metric_serving_amount: parseFloat(s.metric_serving_amount || 0),
          metric_serving_unit: s.metric_serving_unit || 'g',
          number_of_units: parseFloat(s.number_of_units || 1),
          measurement_description: s.measurement_description || '',
          calories: parseFloat(s.calories || 0),
          protein: parseFloat(s.protein || 0),
          fat: parseFloat(s.fat || 0),
          carbohydrate: parseFloat(s.carbohydrate || 0),
          fiber: parseFloat(s.fiber || 0),
          sugar: parseFloat(s.sugar || 0),
          sodium: parseFloat(s.sodium || 0),
          cholesterol: parseFloat(s.cholesterol || 0),
        }))

        // Pick a default serving (prefer natural serving over raw 100g)
        const defaultServing = allServings.find(s =>
          s.measurement_description !== 'g' && s.measurement_description !== 'ml'
        ) || allServings[0]

        const ds = defaultServing || {}

        return {
          food_name: f.food_name || 'Unknown Product',
          brand: f.brand_name || null,
          calories: Math.round(ds.calories || 0),
          protein_g: Math.round((ds.protein || 0) * 10) / 10,
          fat_g: Math.round((ds.fat || 0) * 10) / 10,
          carbs_g: Math.round((ds.carbohydrate || 0) * 10) / 10,
          fiber_g: Math.round((ds.fiber || 0) * 10) / 10,
          sugars_g: Math.round((ds.sugar || 0) * 10) / 10,
          sodium_mg: Math.round(ds.sodium || 0),
          cholesterol_mg: Math.round(ds.cholesterol || 0),
          serving_size: ds.serving_description || '1 serving',
          serving_weight_g: ds.metric_serving_amount ? ds.metric_serving_amount : null,
          servings: allServings,
          source: 'fatsecret',
          source_id: String(f.food_id)
        }
      } catch (err) {
        console.error('Food details fetch error:', err)
        return null
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
