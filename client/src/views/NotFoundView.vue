<template>
  <div class="fk-404-page">
    <div class="fk-404-glow"></div>
    <div class="fk-404-container">
      <div class="fk-404-bolt">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/></svg>
      </div>
      <h1 class="fk-404-code">404</h1>
      <h2 class="fk-404-heading">LOST IN<br/>THE VOID</h2>
      <p class="fk-404-text">
        The page you're looking for has drifted out of orbit. Let's get you back to training.
      </p>
      <router-link to="/dashboard" class="fk-404-btn">
        BACK TO BASE
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.fk-404-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0e0e0e;
  position: relative;
  overflow: hidden;
  padding: 24px;
}

.fk-404-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(223, 255, 0, 0.04) 0%, transparent 70%);
  pointer-events: none;
}

.fk-404-container {
  text-align: center;
  position: relative;
  z-index: 1;
}

.fk-404-bolt {
  width: 72px;
  height: 72px;
  background: rgba(223, 255, 0, 0.08);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #DFFF00;
  margin: 0 auto 32px;
  animation: fk-float 3s ease-in-out infinite;
}

@keyframes fk-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.fk-404-code {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-style: italic;
  font-size: 7rem;
  letter-spacing: -0.04em;
  line-height: 1;
  color: #DFFF00;
  margin-bottom: 16px;
}

.fk-404-heading {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 2rem;
  letter-spacing: 0.04em;
  color: #fff;
  margin-bottom: 16px;
  line-height: 1.2;
}

.fk-404-text {
  color: rgba(255, 255, 255, 0.35);
  font-size: 1rem;
  max-width: 320px;
  margin: 0 auto 40px;
  line-height: 1.6;
}

.fk-404-btn {
  display: inline-block;
  padding: 16px 40px;
  background: #DFFF00;
  color: #0e0e0e;
  border-radius: 14px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-decoration: none;
  transition: all 0.3s;
}

.fk-404-btn:hover {
  background: #f6ffc0;
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(223, 255, 0, 0.25);
}
</style>
