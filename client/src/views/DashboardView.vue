<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGroupStore } from '@/stores/groups'
import { useNotificationStore } from '@/stores/notifications'
import { useNutritionStore } from '@/stores/nutrition'
import quotes from '@/stores/quotes'

const auth = useAuthStore()
const groups = useGroupStore()
const notifs = useNotificationStore()
const nutrition = useNutritionStore()

const showPushBanner = ref(false)
const pushBannerDismissed = ref(false)

const dailyQuote = computed(() => {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  return quotes[dayIndex % quotes.length]
})

onMounted(async () => {
  await Promise.all([
    groups.fetchGroups(),
    groups.fetchDashboardStats(),
    nutrition.fetchSettings(),
    nutrition.fetchLogs(new Date())
  ])
  
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    setTimeout(() => {
      showPushBanner.value = true
    }, 2000)
  }
})

const handleEnablePush = async () => {
  await notifs.requestPushPermission()
  showPushBanner.value = false
}

const dismissPushBanner = () => {
  showPushBanner.value = false
  pushBannerDismissed.value = true
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
})

const getInitials = (name) => {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  let d;
  if (Array.isArray(dateString)) {
    d = new Date(dateString[0], dateString[1] - 1, dateString[2] || 1);
  } else if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, day] = dateString.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(dateString);
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const getWeeksRemaining = (endDate) => {
  const now = new Date()
  const end = new Date(endDate)
  const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
  return Math.ceil(days / 7)
}

const hoveredLog = ref(null)

const chartPoints = computed(() => {
  const trend = groups.dashboardStats?.weightTrend
  if (!trend || trend.length < 2) return []

  const min = Math.min(...trend.map(a => a.weight_lbs))
  const max = Math.max(...trend.map(a => a.weight_lbs))
  const range = max - min || 1

  return trend.map((log, i) => {
    const x = (i / (trend.length - 1)) * 100
    // Keep 10% padding on top and bottom (y from 10 to 90)
    const y = 100 - (((log.weight_lbs - min) / range) * 80 + 10)
    return {
      ...log,
      x,
      y
    }
  })
})
</script>

<template>
  <div class="athl-page">
    <div class="athl-container">

      <!-- Push Notification Banner -->
      <transition name="athl-banner-slide">
        <div v-if="showPushBanner && !pushBannerDismissed" class="athl-push-banner">
          <div class="athl-push-banner-glow"></div>
          <div class="athl-push-content">
            <div class="athl-push-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C10.9 2 10 2.9 10 4C10 4.07 10.003 4.14 10.01 4.21C7.41 5.09 5.5 7.57 5.5 10.5V16L4 17.5V18.5H20V17.5L18.5 16V10.5C18.5 7.57 16.59 5.09 13.99 4.21C13.997 4.14 14 4.07 14 4C14 2.9 13.1 2 12 2ZM12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z" fill="currentColor"/>
              </svg>
            </div>
            <div class="athl-push-text">
              <span class="athl-push-title">STAY IN THE LOOP</span>
              <span class="athl-push-desc">Enable push notifications to never miss an update.</span>
            </div>
          </div>
          <div class="athl-push-actions">
            <button class="athl-push-enable" @click="handleEnablePush">ENABLE</button>
            <button class="athl-push-dismiss" @click="dismissPushBanner">NOT NOW</button>
          </div>
        </div>
      </transition>

      <!-- Hero Header -->
      <header class="athl-hero animate-in">
        <div class="athl-hero-top">
          <div class="athl-hero-info">
            <span class="athl-hero-label">{{ greeting }}</span>
            <h1 class="athl-hero-name">
              {{ auth.user?.displayName?.split(' ')[0]?.toUpperCase() || 'ATHLETE' }}
            </h1>
          </div>
          <div class="athl-hero-actions">
            <!-- Notification Bell -->
            <button class="athl-bell-btn" @click="notifs.togglePanel()" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <div v-if="notifs.unreadCount > 0" class="athl-bell-badge">{{ notifs.unreadCount }}</div>
            </button>
            <router-link to="/profile">
              <div class="athl-hero-avatar">
                <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt="Avatar" />
                <span v-else class="athl-avatar-initials">{{ getInitials(auth.user?.displayName) }}</span>
                <div class="athl-avatar-status"></div>
              </div>
            </router-link>
          </div>
        </div>
      </header>

      <!-- Daily Motivation Card -->
      <section class="athl-motivation animate-in" style="animation-delay: 0.1s">
        <div class="athl-motivation-card">
          <div class="athl-motivation-glow"></div>
          <div class="athl-motivation-inner">
            <span class="athl-motivation-label">DAILY FUEL</span>
            <p class="athl-motivation-quote">
              "{{ dailyQuote.quote }}"
            </p>
            <div class="athl-motivation-author">
              <div class="athl-motivation-line"></div>
              <span>{{ dailyQuote.author }}</span>
            </div>
          </div>
        </div>
      </section>

      <div v-if="groups.loading" class="athl-skeleton-block">
        <div class="athl-skeleton-top"></div>
        <div class="athl-skeleton-body">
            <div class="athl-skeleton-line" style="width: 80%"></div>
            <div class="athl-skeleton-line" style="width: 60%"></div>
            <div class="athl-skeleton-line" style="width: 70%"></div>
        </div>
      </div>
      <div v-else>
        <!-- Quick Stats -->
        <section class="dash-section animate-in" style="animation-delay: 0.15s">
          <div class="dash-stats-grid">
            <div class="dash-stat-box">
              <span class="dash-stat-label">GROUPS</span>
              <span class="dash-stat-value">{{ groups.groups.length }}</span>
            </div>
            <div class="dash-stat-box">
              <span class="dash-stat-label">TOTAL LOGS</span>
              <span class="dash-stat-value">{{ groups.dashboardStats.totalLogs }}</span>
            </div>
            <div class="dash-stat-box">
              <span class="dash-stat-label">CURRENT LBS</span>
              <span class="dash-stat-value">{{ groups.dashboardStats.currentWeight || '--' }}</span>
              <span class="dash-stat-trend" v-if="groups.dashboardStats.weightChange != null" :class="groups.dashboardStats.weightChange <= 0 ? 'trend-good' : 'trend-bad'">
                {{ groups.dashboardStats.weightChange > 0 ? '+' : '' }}{{ groups.dashboardStats.weightChange }}
              </span>
            </div>
            <div class="dash-stat-box">
              <span class="dash-stat-label">AVG CALS (7D)</span>
              <span class="dash-stat-value">{{ groups.dashboardStats.avgCalories || '--' }}</span>
            </div>
          </div>
        </section>

        <!-- Today's Fuel (Nutrition) -->
        <section class="dash-section animate-in" style="animation-delay: 0.18s">
          <div class="dash-header">
            <h2 class="dash-title">TODAY'S FUEL</h2>
            <router-link to="/nutrition" class="dash-view-all">LOG FOOD <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></router-link>
          </div>
          
          <div class="dash-nutrition-card">
            <div class="macro-overview">
               <div class="macro-circle">
                 <span class="macro-val">{{ nutrition.dailyTotals.calories }}</span>
                 <span class="macro-lbl">KCAL</span>
               </div>
               <div class="macro-bars">
                 <div class="macro-bar-row">
                    <div class="macro-label">PROTEIN <span class="macro-num">{{ nutrition.dailyTotals.protein }}g / {{ nutrition.settings.protein_g }}g</span></div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill protein-fill" :style="{ width: nutrition.macroProgress.protein + '%' }"></div></div>
                 </div>
                 <div class="macro-bar-row">
                    <div class="macro-label">CARBS <span class="macro-num">{{ nutrition.dailyTotals.carbs }}g / {{ nutrition.settings.carbs_g }}g</span></div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill carbs-fill" :style="{ width: nutrition.macroProgress.carbs + '%' }"></div></div>
                 </div>
                 <div class="macro-bar-row">
                    <div class="macro-label">FAT <span class="macro-num">{{ nutrition.dailyTotals.fat }}g / {{ nutrition.settings.fat_g }}g</span></div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill fat-fill" :style="{ width: nutrition.macroProgress.fat + '%' }"></div></div>
                 </div>
               </div>
            </div>
          </div>
        </section>

        <!-- Weight Trend Sparkline -->
        <section v-if="chartPoints.length > 1" class="dash-section animate-in" style="animation-delay: 0.2s">
          <div class="dash-header">
            <h2 class="dash-title">WEIGHT TREND</h2>
            <span class="dash-subtitle">LAST {{ chartPoints.length }} LOGS</span>
          </div>
          <div class="dash-chart-card">
            <div class="sparkline-container" @mouseleave="hoveredLog = null">
               <!-- The Line -->
               <svg class="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#DFFF00"
                    stroke-width="2"
                    vector-effect="non-scaling-stroke"
                    :points="chartPoints.map(p => `${p.x},${p.y}`).join(' ')"
                  />
               </svg>
               
               <!-- The Dots & Touch Targets -->
               <div v-for="p in chartPoints" :key="p.log_date" 
                    class="chart-dot-wrapper"
                    :style="{ left: `${p.x}%`, top: `${p.y}%` }"
                    @mouseover="hoveredLog = p"
                    @touchstart.passive="hoveredLog = p">
                 <div class="chart-dot" :class="{ 'is-active': hoveredLog === p }"></div>
               </div>
               
               <!-- Tooltip -->
               <transition name="tooltip-fade">
                 <div v-if="hoveredLog" class="chart-tooltip" :style="{ left: `${hoveredLog.x}%`, top: `${hoveredLog.y}%` }">
                   <div class="tooltip-content">
                     <div class="tooltip-val">{{ hoveredLog.weight_lbs }} <small>lbs</small></div>
                     <div class="tooltip-date">{{ formatDate(hoveredLog.log_date) }}</div>
                   </div>
                 </div>
               </transition>
            </div>
            <div class="chart-labels">
               <span>{{ formatDate(chartPoints[0].log_date) }}</span>
               <span>{{ formatDate(chartPoints[chartPoints.length-1].log_date) }}</span>
            </div>
          </div>
        </section>

        <!-- Groups At A Glance -->
        <section class="dash-section animate-in" style="animation-delay: 0.25s">
          <div class="dash-header">
            <h2 class="dash-title">ACTIVE GROUPS</h2>
            <router-link to="/groups" class="dash-view-all">VIEW ALL <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></router-link>
          </div>
          
          <div v-if="groups.groups.length === 0" class="dash-empty-box">
             <span class="empty-icon">🛡️</span>
             <p>No active groups.</p>
             <router-link to="/groups/create" class="dash-cta-btn">CREATE ONE</router-link>
          </div>
          <div v-else class="dash-groups-scroll">
            <router-link v-for="group in groups.groups.filter(g => new Date(g.endDate) >= new Date()).slice(0, 4)" :key="group.id" :to="`/groups/${group.id}`" class="dash-mini-group-card">
              <div class="mini-group-top">
                <span class="mini-badge">{{ group.myRole }}</span>
                <span class="mini-members"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/></svg> {{ group.memberCount }}</span>
              </div>
              <h3 class="mini-group-name">{{ group.name }}</h3>
              <div class="mini-group-progress">
                 <div class="progress-bar-bg">
                    <div class="progress-bar-fill" :style="{ width: Math.min(100, Math.max(0, ((group.totalWeeks - getWeeksRemaining(group.endDate)) / group.totalWeeks) * 100)) + '%' }"></div>
                 </div>
              </div>
            </router-link>
          </div>
        </section>

        <!-- Upcoming Targets -->
        <section v-if="groups.dashboardStats.upcomingTargets && groups.dashboardStats.upcomingTargets.length > 0" class="dash-section animate-in" style="animation-delay: 0.3s">
          <div class="dash-header">
            <h2 class="dash-title">THIS WEEK'S TARGETS</h2>
          </div>
          <div class="dash-list">
             <router-link v-for="target in groups.dashboardStats.upcomingTargets" :key="target.id" :to="`/groups/${target.groupId}`" class="dash-list-item">
               <div class="target-info">
                 <span class="target-weight">{{ target.target_weight }}<small>lbs</small></span>
                 <span class="target-group">{{ target.groupName }} (Wk {{ target.currentWeek }})</span>
               </div>
               <div class="target-status" :class="target.actual_weight ? 'status-done' : 'status-pending'">
                 {{ target.actual_weight ? 'LOGGED' : 'PENDING' }}
               </div>
             </router-link>
          </div>
        </section>

        <!-- Recent Activity Feed -->
        <section class="dash-section animate-in" style="animation-delay: 0.35s">
          <div class="dash-header">
            <h2 class="dash-title">RECENT LOGS</h2>
          </div>
          <div v-if="groups.dashboardStats.recentActivity && groups.dashboardStats.recentActivity.length > 0" class="dash-activity-feed">
             <div v-for="log in groups.dashboardStats.recentActivity" :key="log.id" class="activity-card">
               <div class="activity-left">
                  <div class="activity-icon">⚖️</div>
                  <div class="activity-details">
                    <span class="activity-desc">
                      Logged <strong v-if="log.weightLbs">{{ log.weightLbs }} lbs</strong>
                      <span v-if="log.weightLbs && log.calories"> / </span>
                      <strong v-if="log.calories">{{ log.calories }} kcal</strong>
                    </span>
                    <span class="activity-group">{{ log.groupName }}</span>
                    <p v-if="log.notes" class="activity-note">"{{ log.notes }}"</p>
                  </div>
               </div>
               <span class="activity-date">{{ formatDate(log.logDate) }}</span>
             </div>
          </div>
          <div v-else class="dash-empty-box">
             <span class="empty-icon">📝</span>
             <p>No recent activity. Log your first weight!</p>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

/* ── Page ── */
.athl-page {
  background: #0e0e0e;
  min-height: 100vh;
  padding-top: max(24px, calc(12px + env(safe-area-inset-top)));
  padding-bottom: max(120px, calc(100px + env(safe-area-inset-bottom)));
  position: relative;
  overflow-x: hidden;
}

.athl-page::before {
  content: '';
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background:
    radial-gradient(ellipse at 10% 0%, rgba(223, 255, 0, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 100%, rgba(179, 153, 255, 0.04) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.athl-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

/* ── Push Banner ── */
.athl-push-banner {
  position: relative;
  background: rgba(223, 255, 0, 0.04);
  border: 1px solid rgba(223, 255, 0, 0.12);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 28px;
  overflow: hidden;
}
.athl-push-banner-glow {
  position: absolute; top: -40%; right: -20%; width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(223, 255, 0, 0.08) 0%, transparent 70%);
  border-radius: 50%; pointer-events: none;
}
.athl-push-content { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; position: relative; z-index: 1; }
.athl-push-icon {
  width: 40px; height: 40px; background: rgba(223, 255, 0, 0.1); border-radius: 12px;
  display: flex; align-items: center; justify-content: center; color: #DFFF00; flex-shrink: 0;
  animation: athl-bell-pulse 2s ease-in-out infinite;
}
@keyframes athl-bell-pulse {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.05) rotate(8deg); }
  50% { transform: scale(1) rotate(-5deg); }
  75% { transform: scale(1.02) rotate(3deg); }
}
.athl-push-text { display: flex; flex-direction: column; gap: 4px; }
.athl-push-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.15em; color: #DFFF00; }
.athl-push-desc { font-size: 0.82rem; color: #adaaaa; line-height: 1.4; }
.athl-push-actions { display: flex; gap: 10px; position: relative; z-index: 1; }
.athl-push-enable {
  padding: 10px 28px; background: #DFFF00; color: #0e0e0e; border: none; border-radius: 6px;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.75rem; letter-spacing: 0.15em; cursor: pointer; transition: all 0.2s;
}
.athl-push-enable:active { transform: scale(0.95); }
.athl-push-dismiss {
  padding: 10px 20px; background: transparent; color: #777575; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;
  font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 0.75rem; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s;
}

.athl-banner-slide-enter-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.athl-banner-slide-leave-active { transition: all 0.3s ease; }
.athl-banner-slide-enter-from, .athl-banner-slide-leave-to { opacity: 0; transform: translateY(-12px); max-height: 0; padding: 0 20px; margin-bottom: 0; }

/* ── Hero ── */
.athl-hero { margin-bottom: 32px; padding: 8px 0; }
.athl-hero-top { display: flex; justify-content: space-between; align-items: flex-start; }
.athl-hero-info { display: flex; flex-direction: column; gap: 4px; }
.athl-hero-label { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: #DFFF00; }
.athl-hero-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 2.8rem; line-height: 1; letter-spacing: -0.04em; color: #ffffff; text-transform: uppercase; font-style: italic; }
.athl-hero-actions { display: flex; align-items: center; gap: 14px; }
.athl-bell-btn {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.athl-bell-btn:active {
  transform: scale(0.92);
  background: rgba(255, 255, 255, 0.1);
}
.athl-bell-btn svg { transition: transform 0.3s ease; }
.athl-bell-btn:hover svg { transform: rotate(10deg); }
.athl-bell-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #DFFF00;
  color: #0e0e0e;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.65rem;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #0e0e0e;
  box-shadow: 0 0 10px rgba(223, 255, 0, 0.4);
  animation: athl-badge-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes athl-badge-pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
.athl-hero-avatar { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
.athl-hero-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; border: 2px solid rgba(223, 255, 0, 0.25); }
.athl-avatar-initials { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, #262626, #1a1919); color: #DFFF00; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1rem; border-radius: 50%; border: 2px solid rgba(223, 255, 0, 0.25); }
.athl-avatar-status { position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; background: #DFFF00; border: 2px solid #0e0e0e; border-radius: 50%; z-index: 2; }

/* ── Motivation ── */
.athl-motivation { margin-bottom: 28px; }
.athl-motivation-card {
  position: relative; background: linear-gradient(135deg, #DFFF00 0%, #c8e600 50%, #b8d400 100%);
  border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(223, 255, 0, 0.15), 0 4px 20px rgba(223, 255, 0, 0.1);
}
.athl-motivation-glow {
  position: absolute; top: -30%; right: -15%; width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(0, 0, 0, 0.06) 0%, transparent 70%); border-radius: 50%; pointer-events: none;
}
.athl-motivation-inner { position: relative; z-index: 1; padding: 32px 28px; }
.athl-motivation-label { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.65rem; letter-spacing: 0.25em; text-transform: uppercase; color: rgba(0, 0, 0, 0.5); display: block; margin-bottom: 16px; }
.athl-motivation-quote { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.45rem; line-height: 1.35; color: #0e0e0e; letter-spacing: -0.02em; font-style: italic; margin-bottom: 20px; }
.athl-motivation-author { display: flex; align-items: center; gap: 12px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(0, 0, 0, 0.55); }
.athl-motivation-line { width: 28px; height: 2px; background: rgba(0, 0, 0, 0.2); }

/* ── Dash Sections ── */
.dash-section { margin-bottom: 32px; }
.dash-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
.dash-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.2rem; letter-spacing: -0.02em; color: #ffffff; text-transform: uppercase; font-style: italic; }
.dash-subtitle { font-family: 'Space Grotesk', sans-serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; color: #777575; }
.dash-view-all { display: inline-flex; align-items: center; gap: 4px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.7rem; color: #DFFF00; text-decoration: none; letter-spacing: 0.1em; transition: opacity 0.2s;}
.dash-view-all:hover { opacity: 0.8; }

/* Stats Grid */
.dash-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.dash-stat-box {
  background: #1a1919; border: 1px solid rgba(255,255,255,0.04); border-radius: 16px; padding: 20px;
  display: flex; flex-direction: column; gap: 6px; position: relative;
}
.dash-stat-label { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 0.6rem; letter-spacing: 0.15em; color: #adaaaa; text-transform: uppercase; }
.dash-stat-value { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.8rem; color: #fff; line-height: 1; letter-spacing: -0.02em; }
.dash-stat-trend { position: absolute; top: 20px; right: 20px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; }
.trend-good { background: rgba(223,255,0,0.15); color: #DFFF00; }
.trend-bad { background: rgba(255,112,67,0.15); color: #ff7043; }

/* Chart */
.dash-chart-card { background: #1a1919; border: 1px solid rgba(255,255,255,0.04); border-radius: 16px; padding: 24px; }
.sparkline-container { width: 100%; height: 120px; position: relative; margin-bottom: 12px; margin-top: 10px; }
.sparkline { width: 100%; height: 100%; overflow: visible; position: absolute; top: 0; left: 0; }

/* Chart Dots */
.chart-dot-wrapper {
  position: absolute;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  -webkit-tap-highlight-color: transparent;
}
.chart-dot {
  width: 6px;
  height: 6px;
  background: #1a1919;
  border: 1.5px solid #DFFF00;
  border-radius: 50%;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.chart-dot.is-active {
  width: 12px;
  height: 12px;
  background: #DFFF00;
  box-shadow: 0 0 12px rgba(223, 255, 0, 0.5);
}

/* Tooltip */
.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  margin-top: -14px;
  z-index: 10;
  pointer-events: none;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
}
.tooltip-content {
  background: #2a2a2a;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}
.tooltip-content::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: #2a2a2a;
  border-right: 1px solid rgba(255,255,255,0.1);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.tooltip-val {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  color: #fff;
  font-size: 0.9rem;
}
.tooltip-val small {
  color: #adaaaa;
  font-size: 0.65rem;
  font-weight: 500;
}
.tooltip-date {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.65rem;
  color: #DFFF00;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tooltip-fade-enter-active, .tooltip-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.tooltip-fade-enter-from, .tooltip-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -90%);
}

.chart-labels { display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.65rem; color: #777575; font-family: 'Space Grotesk', sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

/* Groups Scroll */
.dash-groups-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
.dash-groups-scroll::-webkit-scrollbar { display: none; }
.dash-mini-group-card {
  min-width: 200px; background: #1a1919; border: 1px solid rgba(255,255,255,0.04); border-radius: 16px; padding: 16px;
  text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s;
}
.dash-mini-group-card:active { transform: scale(0.98); }
.mini-group-top { display: flex; justify-content: space-between; align-items: center; }
.mini-badge { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.55rem; padding: 3px 8px; background: rgba(255,255,255,0.08); border-radius: 4px; color: #adaaaa; letter-spacing: 0.1em; }
.mini-members { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #777575; font-family: 'Space Grotesk', sans-serif; font-weight: 600; }
.mini-group-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.1rem; color: #fff; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-group-progress { width: 100%; }
.progress-bar-bg { height: 4px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: #DFFF00; border-radius: 4px; transition: width 0.4s ease; }

/* Nutrition Dash Card */
.dash-nutrition-card {
  background: #1a1919; border: 1px solid rgba(255,255,255,0.04); border-radius: 16px; padding: 20px;
}
.macro-overview {
  display: flex; align-items: center; gap: 24px;
}
.macro-circle {
  width: 90px; height: 90px; border-radius: 50%; border: 4px solid #DFFF00; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 15px rgba(223,255,0,0.1);
}
.macro-val { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.4rem; color: #fff; line-height: 1; }
.macro-lbl { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 0.6rem; color: #adaaaa; letter-spacing: 0.1em; margin-top: 2px; }
.macro-bars { flex-grow: 1; display: flex; flex-direction: column; gap: 12px; }
.macro-bar-row { display: flex; flex-direction: column; gap: 6px; }
.macro-label { display: flex; justify-content: space-between; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.65rem; color: #fff; letter-spacing: 0.05em; }
.macro-num { color: #adaaaa; font-weight: 600; }
.protein-fill { background: #b399ff; }
.carbs-fill { background: #DFFF00; }
.fat-fill { background: #ff7043; }
@media (max-width: 400px) {
  .macro-overview { flex-direction: column; align-items: flex-start; gap: 16px; }
  .macro-circle { width: 100%; height: auto; border: none; border-radius: 0; border-left: 4px solid #DFFF00; padding: 0 0 0 12px; align-items: flex-start; box-shadow: none; }
  .macro-val { font-size: 2rem; }
  .macro-bars { width: 100%; }
}

/* Lists (Targets & Activity) */
.dash-list { display: flex; flex-direction: column; gap: 8px; }
.dash-list-item {
  display: flex; justify-content: space-between; align-items: center; background: #1a1919; border: 1px solid rgba(255,255,255,0.04);
  padding: 16px; border-radius: 12px; text-decoration: none; transition: transform 0.2s;
}
.dash-list-item:active { transform: scale(0.98); }
.target-info { display: flex; flex-direction: column; gap: 4px; }
.target-weight { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.2rem; color: #fff; }
.target-weight small { font-size: 0.7rem; color: #adaaaa; margin-left: 2px; }
.target-group { font-size: 0.75rem; color: #777575; font-weight: 500; }
.target-status { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.65rem; padding: 4px 10px; border-radius: 100px; letter-spacing: 0.1em; }
.status-done { background: rgba(223,255,0,0.1); color: #DFFF00; }
.status-pending { background: rgba(255,255,255,0.05); color: #adaaaa; }

.dash-activity-feed { display: flex; flex-direction: column; gap: 8px; }
.activity-card {
  display: flex; justify-content: space-between; align-items: flex-start; background: #1a1919; border: 1px solid rgba(255,255,255,0.04);
  padding: 16px; border-radius: 12px;
}
.activity-left { display: flex; gap: 12px; align-items: flex-start; }
.activity-icon { width: 36px; height: 36px; background: rgba(255,255,255,0.03); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.activity-details { display: flex; flex-direction: column; gap: 2px; }
.activity-desc { font-size: 0.85rem; color: #fff; }
.activity-desc strong { color: #DFFF00; font-weight: 600; }
.activity-group { font-size: 0.7rem; color: #777575; }
.activity-note { font-size: 0.8rem; color: #adaaaa; margin-top: 4px; font-style: italic; }
.activity-date { font-size: 0.7rem; color: #777575; font-weight: 500; }

/* Empty States */
.dash-empty-box {
  background: #1a1919; border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px; padding: 30px 20px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px;
}
.empty-icon { font-size: 2rem; }
.dash-empty-box p { color: #777575; font-size: 0.85rem; }
.dash-cta-btn {
  padding: 8px 20px; background: #DFFF00; color: #0e0e0e; border-radius: 6px; font-family: 'Space Grotesk', sans-serif;
  font-weight: 700; font-size: 0.7rem; text-decoration: none; letter-spacing: 0.1em; margin-top: 8px;
}

/* ── Skeleton ── */
.athl-skeleton-block { margin-top: 20px; background: #1a1919; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.04); overflow: hidden; }
.athl-skeleton-top { height: 6px; background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.athl-skeleton-body { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
.athl-skeleton-line { height: 14px; background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Animations ── */
.animate-in { animation: athl-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes athl-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ── */
@media (min-width: 768px) {
  .athl-hero-name { font-size: 3.5rem; }
  .athl-motivation-quote { font-size: 1.65rem; }
  .dash-stats-grid { grid-template-columns: repeat(4, 1fr); }
}
</style>
