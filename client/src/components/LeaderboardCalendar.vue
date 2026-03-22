<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  logs: { type: Array, default: () => [] },
  targets: { type: Array, default: () => [] },
  groupStartDate: { type: String, required: true }
});

const currentDate = ref(new Date());

const currentMonth = computed(() => currentDate.value.getMonth());
const currentYear = computed(() => currentDate.value.getFullYear());

const monthName = computed(() => {
  return currentDate.value.toLocaleString('default', { month: 'long' });
});

const prevMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
};

const nextMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
};

const goToToday = () => {
  currentDate.value = new Date();
};

const parseDate = (d) => {
  if (!d) return new Date();
  if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
};

const logMap = computed(() => {
  const map = {};
  props.logs.forEach(log => {
    let d = parseDate(log.logDate);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    // If multiple logs on the same day, take the last one or average? Let's take the first or last
    map[key] = log;
  });
  return map;
});

const targetMap = computed(() => {
  const startDate = parseDate(props.groupStartDate);
  
  return props.targets.map(target => {
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + (target.weekNumber * 7));
    return { ...target, _date: targetDate };
  });
});

const calendarWeeks = computed(() => {
  const weeks = [];
  const firstDay = new Date(currentYear.value, currentMonth.value, 1);
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0);
  
  let currentDay = new Date(firstDay);
  // Rewind to Sunday
  currentDay.setDate(currentDay.getDate() - currentDay.getDay());
  
  while (currentDay <= lastDay || currentDay.getDay() !== 0) {
    if (currentDay.getDay() === 0) {
      weeks.push({ days: [], goal: null, weekStart: new Date(currentDay) });
    }
    
    const week = weeks[weeks.length - 1];
    const dateKey = `${currentDay.getFullYear()}-${currentDay.getMonth() + 1}-${currentDay.getDate()}`;
    const log = logMap.value[dateKey];
    
    week.days.push({
      date: new Date(currentDay),
      isCurrentMonth: currentDay.getMonth() === currentMonth.value,
      isToday: dateKey === `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`,
      log: log
    });
    
    currentDay.setDate(currentDay.getDate() + 1);
  }
  
  // Assign goals to weeks
  weeks.forEach(week => {
    const weekStart = week.weekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    targetMap.value.forEach(t => {
      if (t._date >= weekStart && t._date < weekEnd) {
        week.goal = t;
      }
    });
  });
  
  return weeks;
});

</script>
<template>
  <div class="calendar-container glass-card mb-12">
    <!-- Header -->
    <div class="calendar-header">
      <button class="btn-today" @click="goToToday">Today</button>
      <div class="month-nav">
        <button class="nav-btn" @click="prevMonth">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="nav-btn" @click="nextMonth">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <h2 class="month-title">{{ monthName }} {{ currentYear }}</h2>
      </div>
    </div>
    
    <!-- Grid Wrapper for Mobile Scrolling -->
    <div class="calendar-grid-wrapper">
      <div class="calendar-grid">
        <!-- Weekdays -->
        <div class="weekday-header">SUN</div>
        <div class="weekday-header">MON</div>
        <div class="weekday-header">TUE</div>
        <div class="weekday-header">WED</div>
        <div class="weekday-header">THU</div>
        <div class="weekday-header">FRI</div>
        <div class="weekday-header">SAT</div>
        <div class="weekday-header goal-header">WEEK GOAL</div>
        
        <!-- Days -->
        <template v-for="(week, wIdx) in calendarWeeks" :key="wIdx">
          <div 
            v-for="(day, dIdx) in week.days" 
            :key="dIdx" 
            class="calendar-cell"
            :class="{ 
              'out-of-month': !day.isCurrentMonth,
              'is-today': day.isToday,
              'has-log': day.log
            }"
          >
            <span class="date-num">{{ day.date.getDate() }}</span>
            
            <div v-if="day.log" class="log-content">
              <div class="log-weight">{{ day.log.weightLbs }} <span class="unit">lbs</span></div>
              <div class="log-cals" v-if="day.log.calories">{{ day.log.calories }} cal</div>
            </div>
          </div>
          
          <!-- Goal Cell -->
          <div class="calendar-cell goal-cell">
            <div v-if="week.goal" class="goal-content">
              <div class="goal-label">Week {{ week.goal.weekNumber }} Target</div>
              <div class="goal-weight">{{ week.goal.targetWeight }} <span class="unit">lbs</span></div>
              <div class="goal-actual" v-if="week.goal.actualWeight" :class="week.goal.actualWeight <= week.goal.targetWeight ? 'text-lime' : 'text-coral'">
                 Act: {{ week.goal.actualWeight }}
              </div>
            </div>
            <div v-else class="goal-content empty">
              -
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-container {
  padding: 24px;
  background: rgba(26, 29, 36, 0.4);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  backdrop-filter: blur(12px);
}
.calendar-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}
.btn-today {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-today:hover {
  background: rgba(255,255,255,0.1);
}
.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-btn {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
}
.nav-btn:hover {
  background: rgba(255,255,255,0.1);
}
.month-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 8px;
  min-width: 140px;
}

/* Mobile responsive container wrapper */
.calendar-grid-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: 8px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  padding-bottom: 8px;
}
.calendar-grid-wrapper::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(80px, 1fr)) minmax(110px, 1.2fr);
  gap: 2px;
  background: rgba(255,255,255,0.05); /* grid lines */
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  overflow: hidden;
  min-width: 768px; /* Force scroll on small screens while maintaining 8 column grid accurately */
}

@media (min-width: 1024px) {
  .calendar-grid {
    min-width: 100%;
  }
}

.weekday-header {
  background: rgba(45, 50, 62, 0.4);
  padding: 12px 0;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #8b92a5;
  letter-spacing: 0.05em;
}
.goal-header {
  color: var(--accent-lime);
}
.calendar-cell {
  background: rgba(26, 29, 36, 0.6);
  min-height: 100px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: background 0.2s;
}
.calendar-cell:hover {
  background: rgba(35, 39, 48, 0.6);
}
.calendar-cell.out-of-month {
  background: rgba(20, 22, 26, 0.4);
}
.calendar-cell.out-of-month .date-num {
  color: #4a4f5c;
}
.calendar-cell.has-log {
  background: rgba(217,255,77,0.04);
}
.calendar-cell.has-log::after {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 2px;
  background: var(--accent-lime);
}
.date-num {
  font-size: 0.85rem;
  font-weight: 600;
  color: #8b92a5;
  align-self: flex-end;
  margin-bottom: 8px;
  z-index: 2;
}
.is-today .date-num {
  color: #000;
  background: var(--accent-lime);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-top: -4px;
  margin-right: -4px;
}
.log-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.log-weight {
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;
  font-family: var(--font-heading);
}
.log-cals {
  font-size: 0.75rem;
  color: #8b92a5;
  margin-top: 4px;
}
.unit {
  font-size: 0.7rem;
  font-weight: 600;
  color: #8b92a5;
}
.goal-cell {
  background: rgba(20, 22, 26, 0.4);
  border-left: 2px solid rgba(217,255,77,0.1);
}
.goal-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
}
.goal-content.empty {
  color: #4a4f5c;
}
.goal-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--accent-lime);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.goal-weight {
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
  font-family: var(--font-heading);
}
.goal-actual {
  font-size: 0.75rem;
  font-weight: 700;
  margin-top: 4px;
}
.text-lime { color: var(--accent-lime); }
.text-coral { color: var(--accent-coral); }

@media (max-width: 768px) {
  .calendar-container { padding: 16px 8px; }
  .calendar-header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding-left: 8px; }
  .month-title { min-width: auto; }
  .calendar-cell { min-height: 85px; padding: 8px; }
  .log-weight { font-size: 1.1rem; }
  .goal-weight { font-size: 1.1rem; }
}
</style>
