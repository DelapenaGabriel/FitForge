<template>
  <div class="page not-found-page text-center">
    <div class="container flex flex-direction-column items-center justify-center min-h-[60vh]">
      <div class="error-emoji animate-bounce">🌌</div>
      <h1 class="gradient-text-purple text-6xl font-black mb-4">404</h1>
      <h2 class="text-3xl font-bold mb-6">Lost in Outer Space?</h2>
      <p class="text-secondary mb-8 max-w-md mx-auto">
        The page you're looking for has drifted out of orbit. Let's get you back to your workout.
      </p>
      <router-link to="/dashboard" class="btn btn-primary px-8 py-3">
        Back to Dashboard
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.error-emoji {
  font-size: 8rem;
  margin-bottom: 2rem;
}

.min-h-\[60vh\] {
  min-height: 60vh;
}

.animate-bounce {
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-30px); }
}
</style>
