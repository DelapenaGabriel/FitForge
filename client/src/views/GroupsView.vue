<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGroupStore } from '@/stores/groups'

const auth = useAuthStore()
const groups = useGroupStore()

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

const getWeeksRemaining = (endDate) => {
  const now = new Date()
  const end = new Date(endDate)
  const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
  return Math.ceil(days / 7)
}

onMounted(() => {
  groups.fetchGroups()
})
</script>

<template>
  <div class="gv-page">
    <div class="gv-container">

      <!-- Page Header -->
      <header class="gv-header animate-in">
        <div class="gv-header-top">
          <div>
            <span class="gv-header-label">MANAGE</span>
            <h1 class="gv-header-title">YOUR GROUPS</h1>
          </div>
          <router-link to="/groups/create" class="gv-create-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>CREATE</span>
          </router-link>
        </div>
        <p class="gv-header-subtitle">{{ groups.groups.length }} group{{ groups.groups.length !== 1 ? 's' : '' }} active</p>
      </header>

      <!-- Filter Chips -->
      <div class="gv-filters animate-in" style="animation-delay: 0.1s">
        <button
          class="gv-filter-chip"
          :class="{ 'gv-filter-active': activeFilter === 'all' }"
          @click="activeFilter = 'all'"
        >All <span class="gv-chip-count">{{ groups.groups.length }}</span></button>
        <button
          class="gv-filter-chip"
          :class="{ 'gv-filter-active': activeFilter === 'in-progress' }"
          @click="activeFilter = 'in-progress'"
        >In Progress</button>
        <button
          class="gv-filter-chip"
          :class="{ 'gv-filter-active': activeFilter === 'completed' }"
          @click="activeFilter = 'completed'"
        >Completed</button>
      </div>

      <!-- Loading Skeletons -->
      <div v-if="groups.loading" class="gv-grid">
        <div v-for="i in 3" :key="i" class="gv-skeleton-card">
          <div class="gv-skeleton-top"></div>
          <div class="gv-skeleton-body">
            <div class="gv-skeleton-line gv-skeleton-w75"></div>
            <div class="gv-skeleton-line gv-skeleton-w50"></div>
            <div class="gv-skeleton-line gv-skeleton-w60"></div>
          </div>
        </div>
      </div>

      <!-- No Groups -->
      <div v-else-if="filteredGroups.length === 0 && groups.groups.length === 0" class="gv-empty animate-in" style="animation-delay: 0.15s">
        <div class="gv-empty-visual">
          <div class="gv-empty-icon-ring">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
        </div>
        <h3 class="gv-empty-title">NO GROUPS YET</h3>
        <p class="gv-empty-desc">Start your transformation by creating or joining a group challenge.</p>
        <div class="gv-empty-actions">
          <router-link to="/groups/create" class="gv-cta-primary">CREATE GROUP</router-link>
        </div>
      </div>

      <!-- Filtered Empty -->
      <div v-else-if="filteredGroups.length === 0" class="gv-empty animate-in" style="animation-delay: 0.15s">
        <div class="gv-empty-visual">
          <span class="gv-empty-emoji">{{ activeFilter === 'completed' ? '🏆' : '🔍' }}</span>
        </div>
        <h3 class="gv-empty-title">{{ activeFilter === 'completed' ? 'NO COMPLETED CHALLENGES' : 'NO ACTIVE CHALLENGES' }}</h3>
        <p class="gv-empty-desc">{{ activeFilter === 'completed' ? 'Keep pushing — your victories will appear here!' : 'All your challenges have ended. Create a new one!' }}</p>
      </div>

      <!-- Groups Grid -->
      <div v-else class="gv-grid">
        <router-link
          v-for="(group, idx) in filteredGroups"
          :key="group.id"
          :to="`/groups/${group.id}`"
          class="gv-card animate-in"
          :class="[`animate-in-delay-${Math.min(idx + 1, 6)}`]"
        >
          <!-- Card accent -->
          <div class="gv-card-accent" :class="idx % 3 === 0 ? 'accent-lime' : idx % 3 === 1 ? 'accent-purple' : 'accent-coral'"></div>

          <div class="gv-card-body">
            <!-- Top row: badges -->
            <div class="gv-card-top">
              <div class="gv-card-badges">
                <span class="gv-badge" :class="group.myRole === 'coach' || group.myRole === 'COACH' ? 'gv-badge-coach' : 'gv-badge-member'">{{ group.myRole }}</span>
                <span v-if="new Date(group.endDate) < new Date()" class="gv-badge gv-badge-completed">COMPLETED</span>
                <span v-else class="gv-badge gv-badge-live">
                  <span class="gv-live-dot"></span>ACTIVE
                </span>
              </div>
              <div class="gv-card-member-count">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>{{ group.memberCount }}</span>
              </div>
            </div>

            <!-- Group name -->
            <h3 class="gv-card-name">{{ group.name }}</h3>
            <p class="gv-card-desc">{{ group.description || 'Push your limits with the group.' }}</p>

            <!-- Meta -->
            <div class="gv-card-meta">
              <div class="gv-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>{{ group.totalWeeks }}w total</span>
              </div>
              <div class="gv-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>{{ getWeeksRemaining(group.endDate) }}w left</span>
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="gv-card-progress">
            <div class="gv-progress-info">
              <span>PROGRESS</span>
              <span>{{ Math.min(100, Math.max(0, Math.round(((group.totalWeeks - getWeeksRemaining(group.endDate)) / group.totalWeeks) * 100))) }}%</span>
            </div>
            <div class="gv-progress-track">
              <div
                class="gv-progress-fill"
                :class="idx % 3 === 0 ? 'fill-lime' : idx % 3 === 1 ? 'fill-purple' : 'fill-coral'"
                :style="{ width: Math.min(100, Math.max(0, ((group.totalWeeks - getWeeksRemaining(group.endDate)) / group.totalWeeks) * 100)) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Card arrow -->
          <div class="gv-card-arrow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </router-link>
      </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

/* ── Page ── */
.gv-page {
  background: #0e0e0e;
  min-height: 100vh;
  padding-top: max(24px, calc(12px + env(safe-area-inset-top)));
  padding-bottom: max(120px, calc(100px + env(safe-area-inset-bottom)));
  position: relative;
  overflow-x: hidden;
}

.gv-page::before {
  content: '';
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background:
    radial-gradient(ellipse at 20% 10%, rgba(179, 153, 255, 0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 90%, rgba(223, 255, 0, 0.04) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.gv-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

/* ── Header ── */
.gv-header {
  margin-bottom: 28px;
  padding: 8px 0;
}

.gv-header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.gv-header-label {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #b399ff;
  display: block;
  margin-bottom: 4px;
}

.gv-header-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 2.4rem;
  line-height: 1;
  letter-spacing: -0.04em;
  color: #ffffff;
  text-transform: uppercase;
  font-style: italic;
}

.gv-header-subtitle {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.82rem;
  color: #777575;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.gv-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #DFFF00;
  color: #0e0e0e;
  border: none;
  border-radius: 12px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-decoration: none;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(223, 255, 0, 0.2);
}

.gv-create-btn:active {
  transform: scale(0.95);
}

/* ── Filters ── */
.gv-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 4px;
}

.gv-filters::-webkit-scrollbar { display: none; }

.gv-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 100px;
  color: #777575;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.gv-filter-chip:active { transform: scale(0.95); }

.gv-filter-active {
  background: #ffffff;
  color: #0e0e0e;
  border-color: #ffffff;
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.1);
}

.gv-chip-count {
  background: rgba(0, 0, 0, 0.15);
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 700;
}

.gv-filter-active .gv-chip-count {
  background: rgba(0, 0, 0, 0.12);
}

/* ── Grid ── */
.gv-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Card ── */
.gv-card {
  position: relative;
  background: #1a1919;
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
}

.gv-card:active { transform: scale(0.98); }

.gv-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}

.gv-card-accent {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0.06;
  pointer-events: none;
  transition: opacity 0.4s;
}

.gv-card:hover .gv-card-accent { opacity: 0.12; }

.accent-lime { background: radial-gradient(circle at 100% 0%, #DFFF00 0%, transparent 60%); }
.accent-purple { background: radial-gradient(circle at 100% 0%, #b399ff 0%, transparent 60%); }
.accent-coral { background: radial-gradient(circle at 100% 0%, #ff7043 0%, transparent 60%); }

.gv-card-body {
  position: relative;
  z-index: 1;
  padding: 24px;
}

.gv-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.gv-card-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.gv-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.58rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.gv-badge-coach { background: #DFFF00; color: #0e0e0e; }
.gv-badge-member { background: rgba(255, 255, 255, 0.08); color: #adaaaa; }
.gv-badge-completed { background: rgba(179, 153, 255, 0.12); color: #b399ff; }

.gv-badge-live {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.gv-live-dot {
  width: 6px; height: 6px;
  background: #22c55e;
  border-radius: 50%;
  animation: gv-pulse 2s ease-in-out infinite;
}

@keyframes gv-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.gv-card-member-count {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #777575;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 0.8rem;
}

.gv-card-name {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: -0.03em;
  color: #ffffff;
  text-transform: uppercase;
  font-style: italic;
  margin-bottom: 6px;
  line-height: 1.15;
}

.gv-card-desc {
  font-size: 0.82rem;
  color: #777575;
  line-height: 1.5;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gv-card-meta {
  display: flex;
  gap: 20px;
}

.gv-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #adaaaa;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
}

.gv-meta-item svg { color: #DFFF00; }

/* Progress */
.gv-card-progress {
  padding: 14px 24px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

.gv-progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #777575;
}

.gv-progress-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 100px;
  overflow: hidden;
}

.gv-progress-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.fill-lime {
  background: linear-gradient(90deg, #DFFF00, #c8e600);
  box-shadow: 0 0 12px rgba(223, 255, 0, 0.3);
}

.fill-purple {
  background: linear-gradient(90deg, #b399ff, #8b5cf6);
  box-shadow: 0 0 12px rgba(179, 153, 255, 0.3);
}

.fill-coral {
  background: linear-gradient(90deg, #ff7043, #ff5722);
  box-shadow: 0 0 12px rgba(255, 112, 67, 0.3);
}

/* Arrow */
.gv-card-arrow {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.12);
  transition: all 0.3s;
}

.gv-card:hover .gv-card-arrow {
  color: #DFFF00;
  transform: translateY(-50%) translateX(4px);
}

/* ── Empty State ── */
.gv-empty {
  text-align: center;
  padding: 60px 24px;
  background: #1a1919;
  border-radius: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
}

.gv-empty-visual {
  margin-bottom: 24px;
}

.gv-empty-icon-ring {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: rgba(179, 153, 255, 0.08);
  border: 1px solid rgba(179, 153, 255, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #b399ff;
}

.gv-empty-emoji {
  font-size: 3rem;
}

.gv-empty-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.06em;
  color: #ffffff;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.gv-empty-desc {
  color: #777575;
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 28px;
  max-width: 340px;
  margin-left: auto;
  margin-right: auto;
}

.gv-empty-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.gv-cta-primary {
  display: inline-block;
  padding: 14px 36px;
  background: #DFFF00;
  color: #0e0e0e;
  border: none;
  border-radius: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 10px 30px rgba(223, 255, 0, 0.2);
}

.gv-cta-primary:active { transform: scale(0.95); }

/* ── Skeleton ── */
.gv-skeleton-card {
  background: #1a1919;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.gv-skeleton-top {
  height: 6px;
  background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%);
  background-size: 200% 100%;
  animation: gv-shimmer 1.5s infinite;
}

.gv-skeleton-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gv-skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: gv-shimmer 1.5s infinite;
  border-radius: 6px;
}

.gv-skeleton-w75 { width: 75%; }
.gv-skeleton-w50 { width: 50%; }
.gv-skeleton-w60 { width: 60%; }

@keyframes gv-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Animations ── */
.animate-in {
  animation: gv-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.animate-in-delay-1 { animation-delay: 0.08s; }
.animate-in-delay-2 { animation-delay: 0.12s; }
.animate-in-delay-3 { animation-delay: 0.16s; }
.animate-in-delay-4 { animation-delay: 0.2s; }
.animate-in-delay-5 { animation-delay: 0.24s; }
.animate-in-delay-6 { animation-delay: 0.28s; }

@keyframes gv-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ── */
@media (max-width: 480px) {
  .gv-header-title { font-size: 1.9rem; }
  .gv-card-name { font-size: 1.3rem; }
}

@media (min-width: 768px) {
  .gv-header-title { font-size: 3rem; }

  .gv-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
</style>
