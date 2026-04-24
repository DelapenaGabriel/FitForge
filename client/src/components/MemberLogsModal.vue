<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue";
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

const editingGoalWeight = ref(false);
const editGoalWeightValue = ref("");

const isEditable = computed(() => {
  return groups.currentGroup?.myRole === 'COACH' || auth.user?.id === props.member.userId;
});

const startEditGoalWeight = () => {
  editGoalWeightValue.value = props.member.goalWeight;
  editingGoalWeight.value = true;
};

const saveGoalWeight = async () => {
  if (!editGoalWeightValue.value || isNaN(parseFloat(editGoalWeightValue.value))) return;
  try {
    const newWeight = parseFloat(editGoalWeightValue.value);
    await groups.updateGoalWeight(groups.currentGroup.id, props.member.userId, newWeight);
    editingGoalWeight.value = false;
    
    // Update local member object for immediate UI reaction without refresh
    if (props.member) {
      props.member.goalWeight = newWeight;
    }
    
    await groups.fetchTargets(groups.currentGroup.id, props.member.userId);
    emit("goal-weight-updated", { userId: props.member.userId, newWeight });
  } catch (error) {
    console.error("Failed to update goal weight", error);
    alert(error.response?.data?.message || "Failed to update goal weight. Please try again.");
  }
};

const editingStartWeight = ref(false);
const editStartWeightValue = ref("");

const startEditStartWeight = () => {
  editStartWeightValue.value = props.member.startWeight;
  editingStartWeight.value = true;
};

const saveStartWeight = async () => {
  if (!editStartWeightValue.value || isNaN(parseFloat(editStartWeightValue.value))) return;
  try {
    const newWeight = parseFloat(editStartWeightValue.value);
    await groups.updateStartWeight(groups.currentGroup.id, props.member.userId, newWeight);
    editingStartWeight.value = false;
    
    if (props.member) {
      props.member.startWeight = newWeight;
    }
    
    await groups.fetchTargets(groups.currentGroup.id, props.member.userId);
    emit("goal-weight-updated", { userId: props.member.userId, newWeight }); // Reuse event to refresh dashboard
  } catch (error) {
    console.error("Failed to update starting weight", error);
    alert(error.response?.data?.message || "Failed to update starting weight. Please try again.");
  }
};

const editingLogId = ref(null);
const editLogWeightValue = ref("");
const editLogCaloriesValue = ref("");

const startEditLog = (log) => {
  editingLogId.value = log.id;
  editLogWeightValue.value = log.weightLbs;
  editLogCaloriesValue.value = log.calories || "";
};

const saveEditLog = async (log) => {
  try {
    const payload = {
      weightLbs: editLogWeightValue.value ? parseFloat(editLogWeightValue.value) : null,
      calories: editLogCaloriesValue.value ? parseInt(editLogCaloriesValue.value) : null,
      notes: log.notes,
      photoUrls: log.photoUrls,
      pinned: log.pinned
    };
    
    await groups.updateLog(groups.currentGroup.id, log.id, payload);
    editingLogId.value = null;
    
    // Update local log object
    log.weightLbs = payload.weightLbs;
    log.calories = payload.calories;
    
    emit("goal-weight-updated", { userId: props.member.userId }); // Trigger refresh
  } catch (error) {
    console.error("Failed to update log", error);
    alert("Failed to update log. Please try again.");
  }
};

const emit = defineEmits(["close", "preview-photo", "goal-weight-updated"]);

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

const timeAgo = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "Just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
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
    <div class="mlm-overlay" @click.self="close">
      <div class="mlm-modal animate-in">

        <!-- ── Close Button ── -->
        <button class="mlm-close" @click="close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <!-- ── Hero Header ── -->
        <div class="mlm-hero">
          <div class="mlm-hero-glow"></div>
          <div class="mlm-avatar-ring">
            <div class="avatar avatar-placeholder mlm-avatar">
              {{ member.displayName?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) }}
            </div>
          </div>
          <h2 class="mlm-name">{{ member.displayName }}</h2>
          <p class="mlm-subtitle">Progress Journal</p>
        </div>

        <!-- ── Weight Stats Cards ── -->
        <div class="mlm-stats-row">
          <!-- Start Weight Card -->
          <div class="mlm-stat-card">
            <div class="mlm-stat-icon start">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </div>
            <span class="mlm-stat-label">Start</span>
            <template v-if="!editingStartWeight">
              <span class="mlm-stat-value">{{ member.startWeight ?? '—' }}</span>
              <span class="mlm-stat-unit">lbs</span>
              <button v-if="isEditable" @click="startEditStartWeight" class="mlm-edit-btn" title="Edit Start Weight">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
            </template>
            <div v-else class="mlm-inline-edit">
              <input type="number" v-model="editStartWeightValue" class="mlm-edit-input" step="0.1" placeholder="lbs" />
              <button @click="saveStartWeight" class="mlm-save-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button @click="editingStartWeight = false" class="mlm-cancel-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <!-- Arrow Divider -->
          <div class="mlm-stat-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>

          <!-- Goal Weight Card -->
          <div class="mlm-stat-card goal">
            <div class="mlm-stat-icon goal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <span class="mlm-stat-label">Goal</span>
            <template v-if="!editingGoalWeight">
              <span class="mlm-stat-value goal">{{ member.goalWeight ?? '—' }}</span>
              <span class="mlm-stat-unit">lbs</span>
              <button v-if="isEditable" @click="startEditGoalWeight" class="mlm-edit-btn" title="Edit Goal Weight">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
            </template>
            <div v-else class="mlm-inline-edit">
              <input type="number" v-model="editGoalWeightValue" class="mlm-edit-input" step="0.1" placeholder="lbs" />
              <button @click="saveGoalWeight" class="mlm-save-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button @click="editingGoalWeight = false" class="mlm-cancel-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Logs Body ── -->
        <div class="mlm-body custom-scrollbar">
          <div v-if="logs.length === 0" class="mlm-empty">
            <div class="mlm-empty-icon">📋</div>
            <p>No progress logs shared yet.</p>
          </div>
          
          <div v-else class="mlm-logs">
            <div v-for="log in logs" :key="log.id" class="mlm-log-card">
              <div class="mlm-log-header">
                <span class="mlm-log-date">{{ formatDate(log.logDate) }}</span>
                <div class="mlm-log-stats">
                  <template v-if="editingLogId !== log.id">
                    <span v-if="log.weightLbs" class="mlm-log-pill">
                      <span class="mlm-pill-icon">⚖️</span> {{ log.weightLbs }} <span class="mlm-pill-unit">lbs</span>
                    </span>
                    <span v-if="log.calories" class="mlm-log-pill cal">
                      <span class="mlm-pill-icon">🔥</span> {{ log.calories }} <span class="mlm-pill-unit">cal</span>
                    </span>
                    <button v-if="isEditable" @click="startEditLog(log)" class="mlm-edit-btn" title="Edit Log">
                       <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                  </template>
                  <template v-else>
                    <div class="mlm-log-edit-row">
                      <div class="mlm-edit-field">
                        <span>⚖️</span>
                        <input type="number" v-model="editLogWeightValue" step="0.1" class="mlm-edit-input sm" />
                      </div>
                      <div class="mlm-edit-field">
                        <span>🔥</span>
                        <input type="number" v-model="editLogCaloriesValue" class="mlm-edit-input sm" />
                      </div>
                      <button @click="saveEditLog(log)" class="mlm-save-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button @click="editingLogId = null" class="mlm-cancel-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </template>
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

              <p v-if="log.notes" class="mlm-log-notes" v-html="linkify(log.notes)"></p>

              <!-- Modal Comments Section -->
              <div class="feed-comments-section">
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
                        <span class="feed-comment-time">{{ timeAgo(comment.createdAt) }}</span>
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
                  <textarea v-model="commentText[log.id]" 
                         placeholder="Add a comment..."
                         rows="1"
                         @input="(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }"></textarea>
                  <button :disabled="!commentText[log.id]?.trim()"
                          @click="submitComment(log.id); $event.currentTarget.previousElementSibling.style.height = 'auto'">
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
/* ══════════════════════════════════════════════
   MEMBER LOGS MODAL — Forge Kinetic Design
   ══════════════════════════════════════════════ */

.mlm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  padding-top: max(20px, env(safe-area-inset-top));
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}

.mlm-modal {
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* ── Close Button ── */
.mlm-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.mlm-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  transform: rotate(90deg) scale(1.05);
}

/* ── Hero Header ── */
.mlm-hero {
  position: relative;
  padding: 40px 24px 32px;
  text-align: center;
  background: linear-gradient(180deg, rgba(217, 255, 77, 0.03) 0%, rgba(0, 0, 0, 0) 100%);
  border-bottom: 1px solid var(--border-glass);
}
.mlm-hero-glow {
  position: absolute;
  top: -50%;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(217, 255, 77, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
  filter: blur(20px);
  pointer-events: none;
}
.mlm-avatar-ring {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, var(--accent-lime), rgba(217, 255, 77, 0.2));
  margin: 0 auto 16px;
}
.mlm-avatar {
  width: 100% !important;
  height: 100% !important;
  font-size: 1.2rem;
  background: var(--bg-card) !important;
  color: #fff !important;
  border: 2px solid var(--bg-card);
}
.mlm-name {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
  margin-bottom: 4px;
}
.mlm-subtitle {
  font-size: 0.95rem;
  color: var(--accent-lime);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Stats Row ── */
.mlm-stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 0 24px;
  margin-top: -24px;
  position: relative;
  z-index: 2;
}
.mlm-stat-card {
  flex: 1;
  background: rgba(35, 39, 48, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  position: relative;
  transition: transform 0.2s;
}
.mlm-stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.15);
}
.mlm-stat-card.goal {
  background: rgba(217, 255, 77, 0.03);
  border-color: rgba(217, 255, 77, 0.2);
}
.mlm-stat-card.goal:hover {
  border-color: rgba(217, 255, 77, 0.4);
}
.mlm-stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.mlm-stat-icon.start {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}
.mlm-stat-icon.goal {
  background: rgba(217, 255, 77, 0.1);
  color: var(--accent-lime);
}
.mlm-stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.mlm-stat-value {
  font-family: var(--font-heading);
  font-size: 1.8rem;
  font-weight: 900;
  color: #fff;
  line-height: 1;
}
.mlm-stat-value.goal {
  color: var(--accent-lime);
}
.mlm-stat-unit {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-top: 2px;
}
.mlm-stat-arrow {
  color: var(--text-muted);
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── Inline Editing ── */
.mlm-edit-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mlm-edit-btn:hover {
  background: rgba(255,255,255,0.1);
  color: var(--accent-lime);
}

.mlm-inline-edit {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  background: rgba(0,0,0,0.3);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border-glass);
}
.mlm-edit-input {
  width: 60px;
  background: transparent;
  border: none;
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.1rem;
  text-align: center;
  outline: none;
  padding: 2px 0;
}
.mlm-edit-input.sm {
  font-size: 1rem;
  width: 50px;
}
.mlm-edit-input::placeholder {
  color: rgba(255,255,255,0.2);
  font-weight: 400;
}
.mlm-save-btn, .mlm-cancel-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.mlm-save-btn {
  background: rgba(217, 255, 77, 0.15);
  color: var(--accent-lime);
}
.mlm-save-btn:hover {
  background: var(--accent-lime);
  color: #000;
}
.mlm-cancel-btn {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
}
.mlm-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

/* ── Logs Body ── */
.mlm-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.mlm-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 40px 20px;
  text-align: center;
}
.mlm-empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
  filter: grayscale(1);
}
.mlm-logs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.mlm-log-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
  padding: 16px;
  transition: background 0.2s;
}
.mlm-log-card:hover {
  background: rgba(255, 255, 255, 0.035);
}
.mlm-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}
.mlm-log-date {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-secondary);
}
.mlm-log-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mlm-log-pill {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 800;
  font-size: 0.9rem;
  color: #fff;
}
.mlm-log-pill.cal {
  background: rgba(255, 107, 107, 0.1);
  color: #ff8787;
}
.mlm-pill-icon {
  margin-right: 6px;
  font-size: 0.8rem;
}
.mlm-pill-unit {
  font-weight: 600;
  font-size: 0.75rem;
  opacity: 0.6;
  margin-left: 4px;
}
.mlm-log-edit-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.2);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--border-glass);
}
.mlm-edit-field {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.03);
  padding: 4px 8px;
  border-radius: 6px;
}
.mlm-log-notes {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px 16px;
  border-radius: 12px;
  border-left: 3px solid var(--border-glass);
  margin-top: 12px;
}

/* ── Photos Grid ── */
.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  margin: 12px 0;
}
.photo-thumb {
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  border: 1px solid var(--border-glass);
}
.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.photo-thumb:hover img { transform: scale(1.05); }
.photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 1.2rem;
}
.photo-thumb:hover .photo-overlay { opacity: 1; }

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-glass); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

/* ── Comments Section ── */
.feed-comments-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
button.feed-comment-count {
  background: none; border: none; padding: 0; cursor: pointer;
  font-size: 0.8rem; font-weight: 700; color: var(--text-muted);
  display: flex; align-items: center; gap: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;
  transition: color 0.2s;
}
button.feed-comment-count:hover { color: #fff; }
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
.feed-comment-text { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
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
.feed-comment-input textarea {
  flex-grow: 1; background: transparent; border: none; color: #fff;
  font-size: 0.85rem; outline: none; resize: none; overflow-y: hidden;
  padding: 6px 0; font-family: inherit; line-height: 1.4; max-height: 120px;
}
.feed-comment-input textarea::placeholder { color: var(--text-muted); }
.feed-comment-input button {
  width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--accent-lime); color: #000; border: none; cursor: pointer; transition: transform 0.2s;
}
.feed-comment-input button:not(:disabled):hover { transform: scale(1.05); }
.feed-comment-input button:disabled { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); margin:0 }

/* ── Mobile Optimization ── */
@media (max-width: 600px) {
  .mlm-stats-row {
    flex-direction: column;
    gap: 12px;
    margin-top: -16px;
  }
  .mlm-stat-card {
    width: 100%;
    flex-direction: row;
    padding: 12px 16px;
    justify-content: space-between;
  }
  .mlm-stat-icon {
    margin-bottom: 0;
    margin-right: 12px;
  }
  .mlm-stat-label {
    margin-bottom: 0;
    flex-grow: 1;
  }
  .mlm-stat-arrow {
    display: none;
  }
  .mlm-stat-value {
    font-size: 1.5rem;
  }
  .mlm-stat-unit {
    margin-left: 4px;
    margin-top: 0;
    align-self: flex-end;
    padding-bottom: 4px;
  }
  .mlm-inline-edit {
    margin-top: 0;
  }
  .mlm-edit-btn {
    position: static;
    margin-left: 12px;
  }
}
</style>
