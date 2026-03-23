<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGroupStore } from '@/stores/groups'
import quotes from '@/stores/quotes'

const auth = useAuthStore()
const groups = useGroupStore()

const dailyQuote = computed(() => {
  // Use days since epoch to change the quote once per day
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  return quotes[dayIndex % quotes.length]
})

const activeFilter = ref('all')

const filteredGroups = computed(() => {
  const now = new Date()
  if (activeFilter.value === 'in-progress') {
    return groups.groups.filter(g => new Date(g.endDate) >= now)
  }
  if (activeFilter.value === 'completed') {
    return groups.groups.filter(g => new Date(g.endDate) < now)
  }
  return groups.groups
})

onMounted(() => {
  groups.fetchGroups()
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
})

const averageProgress = computed(() => {
  const activeGroups = groups.groups.filter(g => new Date(g.endDate) >= new Date())
  if (activeGroups.length === 0) return 0
  const total = activeGroups.reduce((sum, g) => sum + (g.myProgress || 0), 0)
  return Math.max(0, Math.min(100, Math.round(total / activeGroups.length)))
})

const getWeeksRemaining = (endDate) => {
  const now = new Date()
  const end = new Date(endDate)
  const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
  return Math.ceil(days / 7)
}

const getInitials = (name) => {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="page dashboard-page">
    <div class="container pb-32">
      <!-- Top header with Profile style from inspo -->
      <header class="dashboard-header animate-in">
        <div class="user-profile-header">
          <div class="avatar-container">
            <div class="avatar avatar-lg" :class="{ 'avatar-placeholder': !auth.user?.avatarUrl }">
              <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
              <template v-else>{{ getInitials(auth.user?.displayName) }}</template>
            </div>
            <div class="status-indicator"></div>
          </div>
          <div class="user-info">
            <span class="greeting-text">HI {{ auth.user?.displayName?.split(' ')[0].toUpperCase() }}</span>
            <span class="user-rank">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="bolt-icon"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Fitness Enthusiast
            </span>
          </div>
        </div>
      </header>

      <!-- Featured Plan style from inspo -->
      <section class="featured-section animate-in animate-in-delay-1">
        <div class="featured-card flex justify-between items-center px-8 py-8 md:px-10">
          
          <!-- LEFT SIDE: Info + Motivation -->
          <div class="featured-content flex flex-col gap-8 w-full">
            <div class="flex justify-between items-start">
              <div>
                <span class="featured-label">Daily Motivation</span>
                <h2 class="featured-title">Keep Forging Ahead</h2>
                <div class="featured-stats">
                  <span class="stat-item">Active</span>
                  <span class="divider">•</span>
                  <span class="stat-item">{{ groups.groups.length }} Groups</span>
                </div>
              </div>
            </div>
            
            <!-- Motivational Quote -->
            <!-- Motivational Quote -->
            <div class="relative py-2 mt-10 w-full max-w-3xl">
              
              <div class="relative z-10 flex flex-col pt-3 gap-4">
                <p class="text-2xl md:text-3xl lg:text-[2rem] font-serif italic text-black/90 tracking-tight leading-snug">
                  " {{ dailyQuote.quote }} "
                </p>
                <div class="flex items-center gap-3 text-black/70 font-bold uppercase tracking-[0.15em] text-[0.75rem]">
                  <div class="w-8 h-[2px] bg-black/20"></div>
                  - {{ dailyQuote.author }}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      <div class="section-title-bar animate-in animate-in-delay-2">
        <h2>Your groups</h2>
      </div>

      <!-- Filters from inspo -->
      <div class="filters-scroll animate-in animate-in-delay-2">
        <button class="filter-chip" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">All Challenges</button>
        <button class="filter-chip" :class="{ active: activeFilter === 'in-progress' }" @click="activeFilter = 'in-progress'">In Progress</button>
        <button class="filter-chip" :class="{ active: activeFilter === 'completed' }" @click="activeFilter = 'completed'">Completed</button>
      </div>

      <div v-if="groups.loading" class="groups-list">
        <div v-for="i in 3" :key="i" class="glass-card skeleton-card">
           <div class="skeleton-img"></div>
           <div class="p-6">
             <div class="skeleton h-6 w-3/4 mb-4"></div>
             <div class="skeleton h-4 w-1/2"></div>
           </div>
        </div>
      </div>

      <div v-else-if="filteredGroups.length === 0 && groups.groups.length === 0" class="empty-state animate-in animate-in-delay-3">
        <div class="empty-illustration">🏋️‍♂️</div>
        <h3>No challenges active</h3>
        <p>Start your transformation by joining or creating a group.</p>
        <router-link to="/groups/create" class="btn btn-primary mt-4">
          Create Group
        </router-link>
      </div>

      <div v-else-if="filteredGroups.length === 0" class="empty-state animate-in animate-in-delay-3">
        <div class="empty-illustration">{{ activeFilter === 'completed' ? '🏆' : '🔍' }}</div>
        <h3>{{ activeFilter === 'completed' ? 'No completed challenges yet' : 'No challenges in progress' }}</h3>
        <p>{{ activeFilter === 'completed' ? 'Keep pushing — your victories will show up here!' : 'All your challenges have ended. Start a new one!' }}</p>
      </div>

      <div v-else class="groups-list">
        <router-link
          v-for="(group, idx) in filteredGroups"
          :key="group.id"
          :to="`/groups/${group.id}`"
          class="group-card-premium animate-in"
          :class="`animate-in-delay-${Math.min(idx + 1, 4)}`"
          :style="{ '--card-accent': idx % 2 === 0 ? 'var(--accent-purple)' : 'var(--accent-coral)' }"
        >
          <div class="card-bg-decoration"></div>
          <div class="card-content">
            <div class="card-header">
              <h3 class="group-name">{{ group.name }}</h3>
              <div class="duration-badge">
                 <span class="text-xs uppercase font-bold text-white/60">Duration</span>
                 <span class="font-bold text-lg">{{ group.totalWeeks }} Weeks</span>
              </div>
            </div>

            <div class="card-footer">
              <div class="card-category">
                <span class="category-pill">{{ group.myRole }}</span>
                <span class="exercise-count">{{ group.memberCount }} Members</span>
              </div>
              <div class="card-details">
                {{ group.description || 'Join the transformation journey and push your limits.' }}
              </div>
            </div>
          </div>
          <div class="card-progression">
             <div class="progression-label">{{ getWeeksRemaining(group.endDate) }} weeks left</div>
             <div class="progression-bar-container">
                <div class="progression-fill" :style="{ width: Math.min(100, Math.max(0, ((group.totalWeeks - getWeeksRemaining(group.endDate)) / group.totalWeeks) * 100)) + '%' }"></div>
             </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  background: var(--bg-primary);
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32px 0 24px;
}

.user-profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-container {
  position: relative;
}

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  background: var(--accent-lime);
  border: 3px solid var(--bg-primary);
  border-radius: 50%;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.greeting-text {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.4rem;
  letter-spacing: -0.02em;
}

.user-rank {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
}

.bolt-icon {
  color: var(--accent-lime);
}

/* Featured Section */
.featured-section {
  margin-bottom: 32px;
}

.featured-card {
  background: var(--accent-lime);
  border-radius: var(--radius-card);
  padding: 32px;
  color: #000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px var(--accent-lime-dim);
}

.featured-card::before {
  content: '';
  position: absolute;
  top: -20%;
  right: -10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(0,0,0,0.05) 0%, transparent 70%);
  border-radius: 50%;
}

.featured-content {
  position: relative;
  z-index: 1;
}

.featured-label {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.6;
}

.featured-title {
  font-size: 2.25rem;
  font-weight: 900;
  margin: 4px 0 8px;
  letter-spacing: -0.03em;
}

.featured-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 10px;
}

.divider { opacity: 0.4; }

.btn-create-floating {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  text-decoration: none;
  transition: all 0.3s;
}

.btn-create-floating:hover {
  transform: rotate(90deg) scale(1.1);
}

/* Circular Progress */
.circular-progress-container {
  width: 80px;
  height: 80px;
  position: relative;
}

.circular-chart {
  display: block;
  margin: 0 auto;
}

.circle-bg {
  fill: none;
  stroke: rgba(0,0,0,0.1);
  stroke-width: 3;
}

.circle {
  fill: none;
  stroke: #000;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: 800;
  font-size: 0.9rem;
}

/* Section Title & Filters */
.section-title-bar {
  margin-bottom: 20px;
}

.section-title-bar h2 {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.filters-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 24px;
  scrollbar-width: none;
}

.filters-scroll::-webkit-scrollbar { display: none; }

.filter-chip {
  padding: 12px 24px;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-family: var(--font-heading);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-chip.active {
  background: var(--text-primary);
  color: var(--bg-primary);
  border-color: var(--text-primary);
}

/* Groups List */
.groups-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
  gap: 24px;
}

.group-card-premium {
  background: var(--bg-secondary);
  border-radius: var(--radius-card);
  min-height: 200px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-decoration: none;
  color: inherit;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid var(--border-subtle);
}

.group-card-premium:hover {
  transform: scale(1.02);
  border-color: var(--card-accent);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.card-bg-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 100% 0%, var(--card-accent) 0%, transparent 60%);
  opacity: 0.15;
  pointer-events: none;
}

.card-content {
  padding: 32px;
  z-index: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.group-name {
  font-size: 1.75rem;
  font-weight: 900;
  max-width: 60%;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.duration-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  background: rgba(255,255,255,0.05);
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
}

.card-footer {
  margin-top: 12px;
}

.category-pill {
  display: inline-block;
  padding: 6px 14px;
  background: var(--card-accent);
  color: #000;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  margin-right: 12px;
}

.exercise-count {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.card-details {
  margin-top: 16px;
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-progression {
  background: rgba(0,0,0,0.2);
  padding: 20px 32px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.progression-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.progression-bar-container {
  height: 6px;
  background: rgba(255,255,255,0.05);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progression-fill {
  height: 100%;
  background: var(--card-accent);
  border-radius: var(--radius-full);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius-card);
  border: 1px dashed var(--border-glass);
}

.empty-illustration {
  font-size: 4rem;
  margin-bottom: 16px;
}

.pb-32 { padding-bottom: 128px; }

@media (min-width: 1024px) {
  .groups-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .featured-card { padding: 24px; }
  .featured-title { font-size: 1.75rem; }
  .group-name { font-size: 1.5rem; }
  .card-content { padding: 24px; }
}
</style>

