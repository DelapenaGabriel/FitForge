import fs from 'fs';

const filePath = 'd:/workspace/FitForge/client/src/views/GroupDetailView.vue';

let content = fs.readFileSync(filePath, 'utf8');

const replacements = {
    '📢': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    '💡 Advice': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Advice',
    '🔥 Motivation': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> Motivation',
    '📢 Announcement': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Announcement',
    '⚡': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" class="inline-block" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    '⚖️': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block mr-1" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    '🔥': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block mr-1" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    '✅': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block mr-1 text-lime" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    '📋': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    '⚠️': '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" class="inline-block text-coral mb-2" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
};

for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(key, 'g'), value);
}

// Enhance buttons
content = content.replace(/class="btn btn-coral flex-grow"/g, 'class="btn btn-coral flex-grow shadow-lg font-bold"');
content = content.replace(/class="btn btn-primary flex-grow"/g, 'class="btn btn-primary flex-grow shadow-lg font-bold"');
content = content.replace(/class="btn btn-secondary flex-grow"/g, 'class="btn btn-secondary flex-grow shadow-lg font-bold"');

const newCss = `
<style scoped>
.group-detail-page {
  background: var(--bg-primary);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.group-detail-page::before {
  content: '';
  position: absolute;
  top: -30vh;
  left: 50%;
  transform: translateX(-50%);
  width: 150vw;
  height: 80vh;
  background: radial-gradient(ellipse at top, var(--accent-lime-dim) 0%, transparent 60%);
  z-index: 0;
  pointer-events: none;
  opacity: 0.8;
}

.container {
  position: relative;
  z-index: 1;
}

.group-page-header {
  padding: 40px 0 32px;
}

.header-back {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-link {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  backdrop-filter: blur(10px);
}

.back-link:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent-lime);
  color: var(--accent-lime);
  transform: translateX(-4px) scale(1.05);
  box-shadow: 0 0 15px var(--accent-lime-dim);
}

.page-title {
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: -0.05em;
  background: linear-gradient(135deg, #fff, #d9ff4d);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 20px rgba(217, 255, 77, 0.3));
}

.group-overview-panel {
  display: flex;
  flex-direction: column;
  background: rgba(10, 10, 12, 0.6);
  border: 1px solid rgba(255,255,255,0.05);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  position: relative;
}

.group-overview-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
}

.panel-stats {
  display: flex;
  justify-content: space-around;
  padding: 32px 24px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.stat-block {
  text-align: center;
  display: flex;
  flex-direction: column;
}

.stat-divider {
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent);
}

.ov-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.ov-value {
  font-size: 2rem;
  font-weight: 900;
  font-family: var(--font-heading);
  letter-spacing: -0.02em;
}

.text-lime { color: var(--accent-lime); text-shadow: 0 0 10px rgba(217, 255, 77, 0.3); }

.panel-desc {
  padding: 24px 32px;
  color: var(--text-secondary);
  line-height: 1.8;
  text-align: center;
  font-size: 1.1rem;
}

/* Tab System */
.group-tabs-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 12px 0 32px;
  scrollbar-width: none;
}

.group-tabs-scroll::-webkit-scrollbar { display: none; }

.group-tab-chip {
  padding: 12px 28px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-family: var(--font-heading);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.group-tab-chip::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: var(--accent-lime);
  transition: width 0.3s ease;
  box-shadow: 0 0 10px var(--accent-lime);
}

.group-tab-chip:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.2);
}

.group-tab-chip.active {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border-color: rgba(255,255,255,0.3);
  box-shadow: 0 0 20px rgba(255,255,255,0.1);
  transform: scale(1.05);
}

.group-tab-chip.active::after {
  width: 40%;
}

/* Feed Cards */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.post-card-premium {
  padding: 32px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
}

.post-card-premium::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 0%;
  background: var(--accent-lime);
  transition: height 0.4s ease;
  box-shadow: 0 0 10px var(--accent-lime);
}

.post-card-premium:hover::before {
  height: 100%;
}

.post-card-premium:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.1);
}

.post-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 16px;
}

.post-author-name {
  font-weight: 800;
  font-size: 1.15rem;
  color: #fff;
}

.post-timestamp {
  font-size: 0.85rem;
  color: var(--text-muted);
  display: block;
}

.post-type-tag {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(255,255,255,0.05);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
}

.post-type-tag.motivation { background: var(--accent-coral-dim); color: var(--accent-coral); box-shadow: inset 0 0 0 1px var(--accent-coral); }
.post-type-tag.advice { background: var(--accent-lime-dim); color: var(--accent-lime); box-shadow: inset 0 0 0 1px var(--accent-lime); }
.post-type-tag.announcement { background: var(--accent-purple-dim); color: var(--accent-purple); box-shadow: inset 0 0 0 1px var(--accent-purple); }

.post-body {
  color: var(--text-secondary);
  line-height: 1.8;
  font-size: 1.1rem;
}

/* Leaderboard */
.leaderboard-row {
  display: flex;
  align-items: center;
  padding: 24px;
  gap: 20px;
  margin-bottom: 16px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  background: rgba(20,20,22, 0.6);
}

.leaderboard-row:hover {
  transform: translateX(8px);
  background: rgba(255,255,255, 0.04);
}

.leaderboard-row.self-row {
  border: 1px solid var(--accent-lime);
  background: linear-gradient(90deg, var(--accent-lime-dim), transparent);
  box-shadow: 0 0 20px rgba(217, 255, 77, 0.15);
  border-left: 4px solid var(--accent-lime);
}

.lb-rank-col {
  width: 50px;
  display: flex;
  justify-content: center;
  font-family: var(--font-heading);
}

.lb-medal { 
  font-size: 1.8rem; 
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
}
.lb-rank-num { font-size: 1.4rem; font-weight: 900; color: rgba(255,255,255,0.2); }

.lb-member-col {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-grow: 1;
}

.member-name { font-weight: 800; font-size: 1.2rem; margin-bottom: 4px;}

.member-stats-mini {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.lb-change-text.good { color: var(--accent-lime); text-shadow: 0 0 10px rgba(217, 255, 77, 0.3); }
.lb-change-text.bad { color: var(--accent-coral); }

.lb-progress-col {
  display: flex;
  align-items: center;
  gap: 24px;
}

.lb-progress-ring {
  width: 56px;
  height: 56px;
  position: relative;
}

.circular-chart-sm { width: 100%; height: 100%; filter: drop-shadow(0 0 10px rgba(217, 255, 77, 0.2)); }
.circle-bg { fill: none; stroke: rgba(255,255,255,0.03); stroke-width: 3; }
.circle { fill: none; stroke: var(--accent-lime); stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 1s ease-out; }

.lb-progress-val {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  font-weight: 900;
  color: #fff;
}

.btn-profile-peek {
  width: 44px;
  height: 44px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-profile-peek:hover {
  background: #fff;
  color: #000;
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 0 15px rgba(255,255,255,0.3);
}

/* Progress Targets */
.progress-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.progress-section-header h2 {
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 12px;
}

.targets-scroll {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 24px;
  scrollbar-width: none;
}

.targets-scroll::-webkit-scrollbar { display: none; }

.target-card-premium {
  min-width: 200px;
  padding: 28px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border-radius: var(--radius-card);
}

.target-card-premium.current-week {
  border-color: var(--accent-lime);
  background: linear-gradient(135deg, rgba(217, 255, 77, 0.05), transparent);
  box-shadow: 0 10px 30px rgba(217, 255, 77, 0.1), inset 0 0 0 1px var(--accent-lime);
  transform: translateY(-4px);
}

.target-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.target-week-badge {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--accent-lime);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.coach-label {
  font-size: 0.65rem;
  background: var(--accent-purple);
  color: #000;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.target-weight-val {
  font-size: 2.5rem;
  font-weight: 900;
  font-family: var(--font-heading);
  color: #fff;
  text-shadow: 0 4px 10px rgba(0,0,0,0.5);
  letter-spacing: -0.02em;
}

.target-weight-val span { font-size: 1rem; opacity: 0.5; font-weight: 600; }

.target-actual-info {
  margin-top: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-actual-info::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-lime);
  box-shadow: 0 0 8px var(--accent-lime);
}

.target-actual-info.not-logged::before {
  background: rgba(255,255,255,0.2);
  box-shadow: none;
}

.target-actual-info.not-logged { color: var(--text-muted); font-style: italic; }

/* Training Logs */
.training-log-card {
  padding: 32px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-card);
}

.log-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.log-date-tag {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
  margin-bottom: 12px;
}

.log-stats-inline {
  display: flex;
  gap: 16px;
}

.log-pill {
  padding: 8px 16px;
  background: rgba(0,0,0,0.5);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
}

.log-pill.weight { color: var(--accent-lime); border: 1px solid rgba(217, 255, 77, 0.2); box-shadow: 0 4px 10px rgba(217, 255, 77, 0.05); }
.log-pill.energy { color: var(--accent-coral); border: 1px solid rgba(255, 112, 67, 0.2); box-shadow: 0 4px 10px rgba(255, 112, 67, 0.05); }

.log-galleria-mt {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  margin: 24px 0;
}

.galleria-item {
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  position: relative;
}

.galleria-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.galleria-item:hover::after { opacity: 1; }

.galleria-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.galleria-item:hover img { transform: scale(1.15); }

.log-story {
  color: var(--text-secondary);
  line-height: 1.8;
  font-size: 1.05rem;
  background: rgba(255,255,255,0.02);
  padding: 20px;
  border-radius: 12px;
  border-left: 3px solid rgba(255,255,255,0.1);
}

/* Coach View */
.coach-post-interface {
  padding: 36px;
  background: linear-gradient(135deg, rgba(255,255,255,0.03), transparent);
  border-radius: var(--radius-card);
  border: 1px solid rgba(255,255,255,0.05);
}

.btn-post-send {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 48px;
  height: 48px;
  background: var(--gradient-lime);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(217, 255, 77, 0.3);
}

.btn-post-send:hover { 
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 25px rgba(217, 255, 77, 0.5);
}

.member-manage-card {
  padding: 28px;
  margin-bottom: 20px;
  border: 1px solid rgba(255,255,255,0.05);
  transition: transform 0.3s;
  border-radius: var(--radius-card);
}

.member-manage-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.1);
}

.circular-chart-xs { width: 44px; height: 44px; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); }

.action-btn-minimal {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  padding: 10px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}
.action-btn-minimal:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  border-color: rgba(255,255,255,0.2);
}
.action-btn-minimal:hover .action-icon {
  stroke: var(--accent-lime);
}
.action-btn-minimal:hover .action-icon-danger {
  stroke: var(--accent-coral);
}
.custom-radio-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.custom-radio {
  padding: 12px 20px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--font-heading);
  font-weight: 700;
  color: var(--text-secondary);
}
.custom-radio:hover {
  background: rgba(255,255,255,0.08);
  transform: translateY(-2px);
  color: #fff;
}
.custom-radio.active {
  background: linear-gradient(135deg, rgba(217, 255, 77, 0.1), transparent);
  border-color: var(--accent-lime);
  color: var(--accent-lime);
  box-shadow: 0 4px 20px rgba(217,255,77,0.15), inset 0 0 0 1px var(--accent-lime);
}

/* Settings */
.settings-group {
  padding: 36px;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: var(--radius-card);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  background: rgba(255,255,255,0.02);
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.03);
}

.info-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.info-val { font-weight: 800; font-size: 1.1rem; color: #fff; }

/* FAB */
.fab-btn-premium {
  position: fixed;
  bottom: 80px;
  right: 32px;
  width: 72px;
  height: 72px;
  background: var(--gradient-lime);
  border-radius: 24px;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16px 40px rgba(217, 255, 77, 0.4), inset 0 2px 4px rgba(255,255,255,0.5);
  border: none;
  cursor: pointer;
  z-index: 100;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.fab-btn-premium:hover {
  transform: translateY(-4px) rotate(90deg) scale(1.1);
  box-shadow: 0 24px 50px rgba(217, 255, 77, 0.6);
}

.fab-btn-premium svg {
  width: 32px;
  height: 32px;
}

/* Modals */
.modal-backdrop-blur {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
  animation: fadeIn 0.3s ease;
}

.modal-premium {
  width: 100%;
  max-width: 580px;
  padding: 56px 48px;
  background: linear-gradient(135deg, rgba(30,30,35,0.95), rgba(15,15,18,0.95));
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 40px 100px rgba(0,0,0,0.8), inset 0 2px 0 rgba(255,255,255,0.05);
  border-radius: 32px;
}

.modal-headline {
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-align: center;
  margin-bottom: 32px;
  color: #fff;
}

.uploader-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

.photo-preview-item {
  aspect-ratio: 1;
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid var(--accent-lime);
  box-shadow: 0 4px 15px rgba(217, 255, 77, 0.2);
}

.p-remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: var(--accent-coral);
  color: #fff;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  transition: transform 0.2s;
}

.p-remove-btn:hover { transform: scale(1.1); }

.p-add-trigger {
  aspect-ratio: 1;
  border: 2px dashed rgba(255,255,255,0.2);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.02);
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 600;
  font-size: 0.9rem;
}

.p-add-trigger:hover {
  border: 2px dashed var(--accent-lime);
  color: var(--accent-lime);
  background: rgba(217, 255, 77, 0.05);
  transform: translateY(-2px);
}

.modal-footer-btns {
  display: flex;
  gap: 20px;
}

.confirm-alert {
  max-width: 440px;
  text-align: center;
  line-height: 1.6;
  padding: 48px;
}

.confirm-alert h3 {
  font-size: 1.8rem;
  margin-bottom: 12px;
}

.confirm-alert p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .group-page-header { padding: 24px 0 20px; }
  .page-title { font-size: 2rem; }
  .group-tabs-scroll { padding-bottom: 20px; }
  .group-tab-chip { padding: 10px 24px; font-size: 0.95rem; }
  .post-card-premium { padding: 24px; }
  .leaderboard-row { padding: 20px; gap: 12px; flex-wrap: wrap; }
  .lb-member-col { width: calc(100% - 70px); }
  .lb-progress-col { width: 100%; justify-content: space-between; margin-top: 12px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  .targets-scroll { gap: 16px; }
  .target-card-premium { min-width: 160px; padding: 20px; }
  .target-weight-val { font-size: 2rem; }
  .training-log-card { padding: 24px; }
  .val { font-size: 1.5rem; }
  .coach-post-interface { padding: 24px; }
  .settings-group { padding: 28px; }
  .info-grid { grid-template-columns: 1fr; gap: 16px; }
  .fab-btn-premium { bottom: 24px; right: 24px; width: 64px; height: 64px; }
  .modal-premium { padding: 32px 24px; border-radius: 24px; }
  .modal-headline { font-size: 1.8rem; }
  .modal-footer-btns { flex-direction: column-reverse; }
}
</style>
`;

content = content.replace(/<style scoped>[\s\S]*?<\/style>/, newCss);

fs.writeFileSync(filePath, content, 'utf8');

console.log("Updated GroupDetailView.vue");
