const fs = require('fs');

function updateNavbar() {
  const file = 'src/components/AppNavbar.vue';
  let content = fs.readFileSync(file, 'utf8');

  const oldNavStart = content.indexOf('<!-- ═══ Mobile Bottom Nav ═══ -->');
  const oldNavEnd = content.indexOf('</template>');
  const oldNav = content.substring(oldNavStart, oldNavEnd);

  const newNav = `<!-- Floating FAB (Mobile & Desktop if needed, but mainly mobile) -->
  <div class="fk-floating-fab-wrap" v-if="auth.user">
    <!-- Backdrop -->
    <div v-if="showPlusMenu" class="fk-fab-overlay" @click="showPlusMenu = false"></div>

    <!-- Action Menu -->
    <transition name="fk-menu-rise">
      <div v-if="showPlusMenu" class="fk-action-menu fk-floating-action-menu">
        <div class="fk-action-menu-header">
          <span class="fk-action-title">ACTION</span>
          <span class="fk-action-title fk-action-title-accent">SELECT</span>
          <div class="fk-action-bar"></div>
        </div>
        <button class="fk-action-item" @click="handlePlusAction('add_log')">
          <div class="fk-action-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20v-6M9 17l3 3 3-3M21 12H3"/></svg>
          </div>
          <div class="fk-action-text">
            <span class="fk-action-label">LOG BODYWEIGHT</span>
            <span class="fk-action-desc">TRACK VITAL DATA</span>
          </div>
          <svg class="fk-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="fk-action-item" @click="handlePlusAction('add_note')">
          <div class="fk-action-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div class="fk-action-text">
            <span class="fk-action-label">POST TO FEED</span>
            <span class="fk-action-desc">INSPIRE THE TRIBE</span>
          </div>
          <svg class="fk-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="fk-action-item" @click="handlePlusAction('create_group')">
          <div class="fk-action-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="fk-action-text">
            <span class="fk-action-label">CREATE GROUP</span>
            <span class="fk-action-desc">FORGE A NEW SQUAD</span>
          </div>
          <svg class="fk-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </transition>

    <!-- FAB Button -->
    <button class="fk-fab" @click="showPlusMenu = !showPlusMenu" :class="{ 'fk-fab-active': showPlusMenu }">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  </div>

  <!-- ═══ Mobile Bottom Nav ═══ -->
  <nav class="fk-mobile-nav" v-if="auth.user">
    <div class="fk-mobile-nav-bar">
      <!-- HOME -->
      <router-link to="/dashboard" class="fk-tab" active-class="fk-tab-active">
        <div class="fk-tab-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>HOME</span>
        </div>
      </router-link>

      <!-- GROUPS -->
      <router-link to="/dashboard" class="fk-tab" active-class="fk-tab-active" :class="{'fk-tab-active': route.path.includes('/group')}">
        <div class="fk-tab-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>GROUPS</span>
        </div>
      </router-link>

      <!-- WORKOUT -->
      <router-link to="/dashboard" class="fk-tab" active-class="fk-tab-active">
        <div class="fk-tab-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 11.5-6-6-6 6"/><path d="m18 18.5-6-6-6 6"/></svg>
          <span>WORKOUT</span>
        </div>
      </router-link>

      <!-- NUTRITION -->
      <router-link to="/dashboard" class="fk-tab" active-class="fk-tab-active">
        <div class="fk-tab-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          <span>NUTRITION</span>
        </div>
      </router-link>

      <!-- PROFILE -->
      <router-link to="/profile" class="fk-tab" active-class="fk-tab-active">
        <div class="fk-tab-inner">
          <img v-if="auth.user.avatarUrl" :src="auth.user.avatarUrl" alt="Avatar" class="fk-mobile-tab-avatar" />
          <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>PROFILE</span>
        </div>
      </router-link>
    </div>
  </nav>
`;

  content = content.replace(oldNav, newNav);
  
  // Also we need to add the updated CSS for fk-floating-fab-wrap
  const newStyle = `
.fk-floating-fab-wrap {
  position: fixed;
  bottom: calc(100px + env(safe-area-inset-bottom));
  right: 24px;
  z-index: 1000;
  display: block; /* Show on desktop and mobile if we want, but nav is usually mobile */
}

@media (min-width: 769px) {
  .fk-floating-fab-wrap {
    display: none; /* Hide on desktop since create group is in top nav */
  }
}

.fk-action-menu.fk-floating-action-menu {
  bottom: 80px;
  right: 0;
  left: auto;
  transform-origin: bottom right;
}
`;

  if(!content.includes('fk-floating-fab-wrap')) {
    content = content.replace('</style>', newStyle + '\n</style>');
  }

  fs.writeFileSync(file, content);
  console.log('AppNavbar modified');
}

updateNavbar();
