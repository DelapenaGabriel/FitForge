<script setup>
import { onMounted, onUnmounted } from 'vue';

const props = defineProps({
  images: {
    type: Array,
    required: true
  },
  modelValue: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

const close = () => {
  emit('close');
};

const next = () => {
  if (props.modelValue < props.images.length - 1) {
    emit('update:modelValue', props.modelValue + 1);
  } else {
    emit('update:modelValue', 0);
  }
};

const prev = () => {
  if (props.modelValue > 0) {
    emit('update:modelValue', props.modelValue - 1);
  } else {
    emit('update:modelValue', props.images.length - 1);
  }
};

const handleKeydown = (e) => {
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'hidden';
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div class="lightbox-overlay" @click.self="close">
      <button class="close-btn" @click="close">×</button>
      
      <div class="lightbox-content">
        <button v-if="images.length > 1" class="nav-btn prev" @click="prev">‹</button>
        
        <div class="image-wrapper">
          <img :src="images[modelValue]" alt="Preview" class="preview-image" />
          <div v-if="images.length > 1" class="image-counter">
            {{ modelValue + 1 }} / {{ images.length }}
          </div>
        </div>
        
        <button v-if="images.length > 1" class="nav-btn next" @click="next">›</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  padding-top: max(40px, env(safe-area-inset-top));
  padding-bottom: max(40px, env(safe-area-inset-bottom));
}

.close-btn {
  position: absolute;
  top: max(32px, env(safe-area-inset-top));
  right: 32px;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  color: white;
  font-size: 32px;
  cursor: pointer;
  z-index: 10001;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all 0.3s;
}

.close-btn:hover {
  background: var(--bg-glass-hover);
  transform: rotate(90deg);
}

.lightbox-content {
  display: flex;
  align-items: center;
  gap: 32px;
  max-width: 100%;
  max-height: 100%;
}

.image-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-image {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 24px;
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
  border: 1px solid var(--border-glass);
}

.nav-btn {
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  color: white;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.nav-btn:hover {
  background: var(--bg-glass-hover);
  transform: scale(1.1);
  color: var(--accent-lime);
}

.image-counter {
  margin-top: 24px;
  color: var(--text-secondary);
  font-family: var(--font-heading);
  font-weight: 800;
  background: var(--bg-glass);
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  border: 1px solid var(--border-glass);
}

@media (max-width: 768px) {
  .lightbox-overlay {
    padding: 20px;
    padding-top: max(20px, env(safe-area-inset-top));
    padding-bottom: max(20px, env(safe-area-inset-bottom));
  }
  
  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10002;
  }
  
  .nav-btn.prev { left: 10px; }
  .nav-btn.next { right: 10px; }
  
  .preview-image {
    max-width: 100%;
    max-height: 100%;
  }
}
</style>
