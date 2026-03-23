<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useGroupStore } from "@/stores/groups";
import { useAuthStore } from "@/stores/auth";

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

const groups = useGroupStore();
const auth = useAuthStore();
const commentText = ref({}); // { 'log-1': '...' }

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
    hour: "2-digit",
    minute: "2-digit"
  });
};

const linkify = (text) => {
  if (!text) return "";
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  return text.replace(urlRegex, (url) => {
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      return `<div class="youtube-embed" style="margin-top: 12px; border-radius: 12px; overflow: hidden; max-width: 600px;"><iframe width="100%" height="315" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #D1FF4D; font-weight: 700; text-decoration: underline;">${url}</a>`;
  });
};

const expandedComments = ref({});

const toggleComments = (logId) => {
  expandedComments.value[logId] = !expandedComments.value[logId];
};

const submitComment = async (logId) => {
  const content = commentText.value[logId];
  if (!content?.trim()) return;
  await groups.createLogComment(groups.currentGroup.id, logId, content);
  commentText.value[logId] = "";
  expandedComments.value[logId] = true;
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

              <p v-if="log.notes" class="log-notes" v-html="linkify(log.notes)"></p>

              <!-- Modal Comments Section -->
              <div class="feed-comments-section mt-6">
                <button v-if="log.comments?.length > 0" class="feed-comment-count" @click="toggleComments(log.id)">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                   {{ expandedComments[log.id] ? 'Hide' : 'View' }} {{ log.comments.length }} comment{{ log.comments.length > 1 ? 's' : '' }}
                </button>
                <div v-if="log.comments?.length > 0 && expandedComments[log.id]" class="feed-comments-list">
                  <div v-for="comment in log.comments" :key="comment.id" class="feed-comment group">
                    <img v-if="comment.authorAvatar" :src="comment.authorAvatar" class="feed-comment-avatar" />
                    <div v-else class="feed-comment-avatar feed-avatar-placeholder">{{ comment.authorName[0] }}</div>
                    <div class="feed-comment-body">
                      <div class="feed-comment-meta">
                        <span class="feed-comment-name">{{ comment.authorName }}</span>
                        <span class="feed-comment-time">{{ formatDate(comment.createdAt) }}</span>
                      </div>
                      <p class="feed-comment-text">{{ comment.content }}</p>
                    </div>
                    <button v-if="comment.authorId === auth.user?.id" 
                            class="feed-comment-delete"
                            @click="groups.deleteLogComment(groups.currentGroup.id, log.id, comment.id)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>

                <div class="feed-comment-input">
                  <input v-model="commentText[log.id]" 
                         type="text" 
                         placeholder="Add a comment..."
                         @keyup.enter="submitComment(log.id)"/>
                  <button :disabled="!commentText[log.id]?.trim()"
                          @click="submitComment(log.id)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </div>
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
  white-space: pre-wrap;
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

/* ── SHARED FEED STYLES (MATCHES GroupDetailView.vue) ── */
.feed-comments-section {
  background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);
  padding: 16px; border-radius: 0 0 16px 16px; margin: 0 -16px -16px -16px;
}
button.feed-comment-count {
  background: none; border: none; padding: 0; cursor: pointer;
  font-size: 0.8rem; font-weight: 700; color: var(--text-muted);
  display: flex; align-items: center; gap: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;
  transition: color 0.2s;
}
button.feed-comment-count:hover {
  color: #fff;
}
.feed-comments-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.feed-comment { display: flex; gap: 10px; }
.feed-comment-avatar {
  width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
}
.feed-avatar-placeholder {
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-slate); color: #fff; font-weight: 800; font-size: 0.8rem;
}
.feed-comment-body {
  flex-grow: 1; background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 0 12px 12px 12px;
}
.feed-comment-meta { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 2px; }
.feed-comment-name { font-size: 0.85rem; font-weight: 700; color: #fff; }
.feed-comment-time { font-size: 0.7rem; color: var(--text-muted); }
.feed-comment-text { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; }
.feed-comment-delete {
  opacity: 0; padding: 4px; color: var(--text-muted); background: transparent; border: none; cursor: pointer;
  transition: opacity 0.2s, color 0.2s; align-self: flex-start; margin-top: 4px;
}
.feed-comment:hover .feed-comment-delete { opacity: 1; }
.feed-comment-delete:hover { color: var(--accent-coral); }

.feed-comment-input {
  display: flex; gap: 10px; align-items: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; padding: 4px 4px 4px 12px;
  transition: border-color 0.3s, background 0.3s;
}
.feed-comment-input:focus-within {
  border-color: rgba(217,255,77,0.3); background: rgba(255,255,255,0.06);
}
.feed-comment-input input {
  flex-grow: 1; background: transparent; border: none; color: #fff;
  font-size: 0.85rem; outline: none;
}
.feed-comment-input input::placeholder { color: var(--text-muted); }
.feed-comment-input button {
  width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--accent-lime); color: #000; border: none; cursor: pointer; transition: transform 0.2s;
}
.feed-comment-input button:not(:disabled):hover { transform: scale(1.05); }
.feed-comment-input button:disabled { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); margin:0 }
</style>
