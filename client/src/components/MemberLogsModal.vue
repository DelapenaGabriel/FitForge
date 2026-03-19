<script setup>
import { onMounted, onUnmounted } from "vue";

const props = defineProps({
  member: {
    type: Object,
    required: true,
  },
  logs: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["close", "preview-photo"]);

const close = () => {
  emit("close");
};

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const onPhotoClick = (photoUrls, index) => {
    emit('preview-photo', { urls: photoUrls, index });
};

onMounted(() => {
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="close">
      <div class="modal glass-card animate-in">
        <div class="modal-header">
          <div class="member-info">
            <div class="avatar avatar-placeholder" style="width: 48px; height: 48px">
              {{ member.displayName?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) }}
            </div>
            <div>
              <h2>{{ member.displayName }}'s Progress</h2>
              <p class="subtitle">Member logs for this group challenge</p>
            </div>
          </div>
          <button class="close-x" @click="close">×</button>
        </div>

        <div class="modal-body custom-scrollbar">
          <div v-if="logs.length === 0" class="empty-state">
            <p>No progress logs shared yet.</p>
          </div>
          
          <div v-else class="logs-list">
            <div v-for="log in logs" :key="log.id" class="log-item glass-card">
              <div class="log-item-header">
                <span class="log-date">{{ formatDate(log.logDate) }}</span>
                <div class="log-stats">
                  <span v-if="log.weightLbs" class="log-stat">⚖️ {{ log.weightLbs }} lbs</span>
                  <span v-if="log.calories" class="log-stat">🔥 {{ log.calories }} cal</span>
                </div>
              </div>
              
              <div v-if="log.photoUrls && log.photoUrls.length > 0" class="photos-grid">
                <div 
                  v-for="(url, idx) in log.photoUrls" 
                  :key="idx" 
                  class="photo-thumb"
                  @click="onPhotoClick(log.photoUrls, idx)"
                >
                  <img :src="url" alt="Progress Photo" loading="lazy" />
                  <div class="photo-overlay">🔍</div>
                </div>
              </div>

              <p v-if="log.notes" class="log-notes">{{ log.notes }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border-glass);
}

.modal-header {
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-glass);
  background: rgba(255, 255, 255, 0.01);
}

.member-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.member-info h2 {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.close-x {
  width: 44px;
  height: 44px;
  font-size: 28px;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all 0.3s;
}

.close-x:hover {
  background: var(--bg-glass-hover);
  color: white;
  transform: rotate(90deg);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.log-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
}

.log-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.log-date {
  font-family: var(--font-heading);
  font-weight: 900;
  color: var(--accent-lime);
  font-size: 1.1rem;
}

.log-stats {
  display: flex;
  gap: 12px;
}

.log-stat {
  font-size: 0.9rem;
  font-weight: 500;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  margin: 12px 0;
}

.photo-thumb {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.photo-thumb:hover img {
  transform: scale(1.1);
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 1.2rem;
}

.photo-thumb:hover .photo-overlay {
  opacity: 1;
}

.log-notes {
  font-size: 0.95rem;
  color: var(--text-secondary);
  border-left: 2px solid var(--border-glass);
  padding-left: 12px;
  margin-top: 12px;
}

/* Custom scrollbar to match theme */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-glass);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--accent-lime-dim);
}
</style>
