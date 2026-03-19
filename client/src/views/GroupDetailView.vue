<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useGroupStore } from "@/stores/groups";
import ImagePreviewModal from "@/components/ImagePreviewModal.vue";
import MemberLogsModal from "@/components/MemberLogsModal.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const groups = useGroupStore();

const groupId = computed(() => Number(route.params.id));
const activeTab = ref("feed");
const loading = ref(true);

// Photo Preview
const previewImages = ref([]);
const previewIndex = ref(0);
const showPreviewModal = ref(false);

const openPreview = (urls, index = 0) => {
  previewImages.value = urls;
  previewIndex.value = index;
  showPreviewModal.value = true;
};

// Member Logs
const selectedMember = ref(null);
const memberLogs = ref([]);
const showMemberLogsModal = ref(false);

const viewMemberLogs = async (member) => {
  selectedMember.value = member;
  showMemberLogsModal.value = true;
  memberLogs.value = []; // Reset while loading
  try {
    const data = await groups.fetchLogs(groupId.value, member.userId);
    memberLogs.value = data;
  } catch (error) {
    console.error("Failed to fetch member logs:", error);
  }
};

// Log form
const logWeight = ref("");
const logCalories = ref("");
const logNotes = ref("");
const uploadedPhotos = ref([]);
const showLogModal = ref(false);

const openUploadWidget = () => {
  if (uploadedPhotos.value.length >= 5) {
    alert("Maximum 5 photos allowed.");
    return;
  }

  window.cloudinary.openUploadWidget(
    {
      cloudName: "dilpitidj",
      uploadPreset: "fitforge",
      sources: ["local", "camera"],
      multiple: true,
      maxFiles: 5 - uploadedPhotos.value.length,
      styles: {
        palette: {
          window: "#1A1A1A",
          sourceBg: "#242424",
          windowBorder: "#333333",
          tabIcon: "#2DD4BF",
          inactiveTabIcon: "#94A3B8",
          menuIcons: "#2DD4BF",
          link: "#2DD4BF",
          action: "#2DD4BF",
          inProgress: "#F59E0B",
          complete: "#10B981",
          error: "#EF4444",
          textDark: "#000000",
          textLight: "#F8FAFC",
        },
      },
    },
    (error, result) => {
      if (!error && result && result.event === "success") {
        uploadedPhotos.value.push(result.info.secure_url);
      }
    },
  );
};

const removePhoto = (index) => {
  uploadedPhotos.value.splice(index, 1);
};

// Coach post form
const postContent = ref("");
const postType = ref("ADVICE");

// Invite form
const inviteEmail = ref("");
const inviteResult = ref(null);
const inviteError = ref("");
const inviteLink = computed(() => {
  if (!inviteResult.value) return "";
  return `${window.location.origin}/invite/${inviteResult.value.token}`;
});

const copyInvite = () => {
  if (!inviteLink.value) return;
  navigator.clipboard.writeText(inviteLink.value);
  alert("Link copied to clipboard!");
};

// Target editing
const editingTarget = ref(null);
const editTargetWeight = ref("");

// Log editing
const editingLog = ref(null);
const editLogWeight = ref("");
const editLogCalories = ref("");
const editLogNotes = ref("");

// Post editing
const editingPost = ref(null);
const editPostContent = ref("");
const editPostType = ref("ADVICE");

// Delete confirmation
const confirmDelete = ref(null); // { type: 'log'|'post', id: Number }

onMounted(async () => {
  try {
    await groups.fetchGroup(groupId.value);
    await Promise.all([
      groups.fetchPosts(groupId.value),
      groups.fetchLeaderboard(groupId.value),
      groups.fetchMembers(groupId.value),
      groups.fetchTargets(groupId.value, auth.user?.id),
    ]);
    // Fetch logs separately and update store state
    groups.logs = await groups.fetchLogs(groupId.value, auth.user?.id);
  } finally {
    loading.value = false;
  }
});

const isCoach = computed(() => groups.currentGroup?.myRole === "COACH");

const handleLog = async () => {
  if (!logWeight.value) return;

  const payload = {
    weightLbs: parseFloat(logWeight.value),
    calories: logCalories.value ? parseInt(logCalories.value) : null,
    notes: logNotes.value || null,
    photoUrls: uploadedPhotos.value,
  };

  await groups.createLog(groupId.value, payload);
  await groups.fetchLeaderboard(groupId.value);
  showLogModal.value = false;
  logWeight.value = "";
  logCalories.value = "";
  logNotes.value = "";
  uploadedPhotos.value = [];
};

const handlePost = async () => {
  if (!postContent.value.trim()) return;
  await groups.createPost(groupId.value, postContent.value, postType.value);
  postContent.value = "";
};

const handleInvite = async () => {
  if (!inviteEmail.value) return;
  inviteError.value = "";
  try {
    inviteResult.value = await groups.createInvite(
      groupId.value,
      inviteEmail.value,
    );
    inviteEmail.value = "";
  } catch (e) {
    inviteError.value = e.response?.data?.message || "Failed to create invite";
  }
};

const startEditTarget = (target) => {
  editingTarget.value = target.id;
  editTargetWeight.value = target.targetWeight;
};

const saveTarget = async (targetId) => {
  await groups.updateTarget(
    groupId.value,
    targetId,
    parseFloat(editTargetWeight.value),
  );
  editingTarget.value = null;
};

// ── Log edit/delete ──
const startEditLog = (log) => {
  editingLog.value = log.id
  editLogWeight.value = log.weightLbs
  editLogCalories.value = log.calories || ''
  editLogNotes.value = log.notes || ''
  uploadedPhotos.value = [...(log.photoUrls || [])]
}

const cancelEditLog = () => {
  editingLog.value = null;
  uploadedPhotos.value = []; // Clear photos on cancel
};

const saveEditLog = async (logId) => {
  await groups.updateLog(groupId.value, logId, {
    weightLbs: parseFloat(editLogWeight.value),
    calories: editLogCalories.value ? parseInt(editLogCalories.value) : null,
    notes: editLogNotes.value || null,
    photoUrls: uploadedPhotos.value
  })
  editingLog.value = null
  uploadedPhotos.value = []
}

// ── Post edit/delete ──
const startEditPost = (post) => {
  editingPost.value = post.id;
  editPostContent.value = post.content;
  editPostType.value = post.postType;
};

const cancelEditPost = () => {
  editingPost.value = null;
};

const saveEditPost = async (postId) => {
  if (!editPostContent.value.trim()) return;
  try {
    await groups.updatePost(groupId.value, postId, {
      content: editPostContent.value,
      postType: editPostType.value,
    });
    editingPost.value = null;
  } catch (error) {
    console.error("Failed to update post:", error);
    alert(
      error.response?.data?.message ||
        "Failed to update post. Please try again.",
    );
  }
};

// ── Delete confirmation ──
const requestDelete = (type, id) => {
  confirmDelete.value = { type, id };
};

const cancelDelete = () => {
  confirmDelete.value = null;
};

const executeDelete = async () => {
  if (!confirmDelete.value) return;
  const { type, id } = confirmDelete.value;
  if (type === "log") {
    await groups.deleteLog(groupId.value, id);
  } else if (type === "post") {
    await groups.deletePost(groupId.value, id);
  }
  confirmDelete.value = null;
};

// ── Group Delete / Leave ──
const confirmGroupAction = ref(null);

const requestGroupAction = (action) => {
  confirmGroupAction.value = action;
};

const cancelGroupAction = () => {
  confirmGroupAction.value = null;
};

const executeGroupAction = async () => {
  if (!confirmGroupAction.value) return;
  try {
    if (confirmGroupAction.value === 'delete') {
      await groups.deleteGroup(groupId.value);
    } else if (confirmGroupAction.value === 'leave') {
      await groups.leaveGroup(groupId.value, auth.user?.id);
    }
    router.push('/dashboard');
  } catch (error) {
    console.error("Failed to perform action:", error);
    alert(error.response?.data?.message || "Action failed");
  } finally {
    confirmGroupAction.value = null;
  }
};

const getMedal = (rank) => {
  if (rank === 1) return { icon: "🥇", class: "medal-gold" };
  if (rank === 2) return { icon: "🥈", class: "medal-silver" };
  if (rank === 3) return { icon: "🥉", class: "medal-bronze" };
  return null;
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getWeeksRemaining = (endDate) => {
  const now = new Date();
  const end = new Date(endDate);
  const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  return Math.ceil(days / 7);
};

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};
</script>

<template>
  <div class="page group-detail-page pb-32">
    <div class="container">
      <div v-if="loading" class="loading-state">
        <div class="skeleton h-12 w-1/2 mb-8"></div>
        <div class="skeleton h-64 w-full"></div>
      </div>

      <template v-else-if="groups.currentGroup">
        <!-- Group Header (Daily Report style) -->
        <header class="group-page-header animate-in">
          <div class="header-back">
            <router-link to="/dashboard" class="back-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </router-link>
            <h1 class="page-title">{{ groups.currentGroup.name }}</h1>
          </div>
          
          <div class="group-overview-panel glass-card mt-6 animate-in">
            <div class="panel-stats">
              <div class="stat-block">
                <span class="ov-label">WEEKS LEFT</span>
                <span class="ov-value text-lime">{{ getWeeksRemaining(groups.currentGroup.endDate) }} / {{ groups.currentGroup.totalWeeks }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-block">
                <span class="ov-label">MEMBERS</span>
                <span class="ov-value">{{ groups.currentGroup.memberCount }} Active</span>
              </div>
            </div>
            <div class="panel-desc">
              <p>{{ groups.currentGroup.description }}</p>
            </div>
          </div>
        </header>

        <!-- Tab System (Daily Report sub-tabs) -->
        <div class="group-tabs-scroll animate-in animate-in-delay-1">
          <button class="group-tab-chip" :class="{ active: activeTab === 'feed' }" @click="activeTab = 'feed'">Feed</button>
          <button class="group-tab-chip" :class="{ active: activeTab === 'leaderboard' }" @click="activeTab = 'leaderboard'">Leaderboard</button>
          <button class="group-tab-chip" :class="{ active: activeTab === 'progress' }" @click="activeTab = 'progress'">My Progress</button>
          <button v-if="isCoach" class="group-tab-chip" :class="{ active: activeTab === 'coach' }" @click="activeTab = 'coach'">Coach</button>
          <button class="group-tab-chip" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">Manage</button>
        </div>

        <!-- ═══════════════ FEED TAB ═══════════════ -->
        <div v-if="activeTab === 'feed'" class="tab-content animate-in">
          <div v-if="groups.posts.length === 0" class="empty-state">
            <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
            <p>No posts yet. Keep training hard!</p>
          </div>
          
          <div v-for="post in groups.posts" :key="post.id" class="post-card-premium glass-card">
            <!-- Feed layout from inspo 5 (Daily Report cards) -->
            <template v-if="editingPost === post.id">
              <div class="edit-ui-container">
                <div class="form-group">
                  <select v-model="editPostType" class="form-input">
                    <option value="ADVICE"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Advice</option>
                    <option value="MOTIVATION"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> Motivation</option>
                    <option value="ANNOUNCEMENT"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Announcement</option>
                  </select>
                </div>
                <textarea v-model="editPostContent" class="form-input" rows="3"></textarea>
                <div class="flex justify-end gap-3 mt-4">
                  <button class="btn btn-secondary btn-sm" @click="cancelEditPost">Cancel</button>
                  <button class="btn btn-primary btn-sm" @click="saveEditPost(post.id)" :disabled="!editPostContent.trim()">Update</button>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="post-header-top">
                <div class="post-author">
                  <div class="avatar avatar-sm avatar-placeholder">{{ getInitials(post.authorName) }}</div>
                  <div>
                    <h4 class="post-author-name">{{ post.authorName }}</h4>
                    <span class="post-timestamp">{{ formatDate(post.createdAt) }}</span>
                  </div>
                </div>
                <span class="post-type-tag" :class="post.postType.toLowerCase()">{{ post.postType }}</span>
                
                <div v-if="post.authorId === auth.user?.id" class="post-actions-menu">
                  <button class="action-btn-minimal" @click="startEditPost(post)" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="action-icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                  <button class="action-btn-minimal text-red" @click="requestDelete('post', post.id)" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="action-icon-danger" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>
              <div class="post-body">
                <p>{{ post.content }}</p>
              </div>
            </template>
          </div>
        </div>

        <!-- ═══════════════ LEADERBOARD TAB ═══════════════ -->
        <div v-if="activeTab === 'leaderboard'" class="tab-content animate-in">
          <div class="leaderboard-list mt-2">
            <div v-for="entry in groups.leaderboard" :key="entry.userId" class="leaderboard-row glass-card" :class="{ 'self-row': entry.userId === auth.user?.id }">
              <div class="lb-rank-col">
                 <span v-if="getMedal(entry.rank)" class="lb-medal">{{ getMedal(entry.rank).icon }}</span>
                 <span v-else class="lb-rank-num">{{ entry.rank }}</span>
              </div>
              
              <div class="lb-member-col">
                <img v-if="entry.avatarUrl" :src="entry.avatarUrl" class="avatar avatar-md" alt="Avatar" />
                <div v-else class="avatar avatar-md avatar-placeholder">{{ getInitials(entry.displayName) }}</div>
                <div class="lb-member-details">
                  <h4 class="member-name">{{ entry.displayName }}</h4>
                  <div class="member-stats-mini">
                    <span>Cur: {{ entry.currentWeight }} lbs</span>
                    <span class="lb-change-text" :class="entry.weeklyChange < 0 ? 'good' : 'bad'">
                      {{ entry.weeklyChange > 0 ? '+' : '' }}{{ entry.weeklyChange }} lbs
                    </span>
                  </div>
                  <div class="member-stats-mini mt-1 text-xs opacity-75">
                    <span>Start: {{ entry.startWeight }}</span> • 
                    <span>Goal: {{ entry.currentWeekGoal || entry.goalWeight }}</span>
                  </div>
                  <div v-if="entry.currentWeekGoal && entry.currentWeight > entry.currentWeekGoal" class="text-xs text-coral font-bold mt-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Pick up the slack! Behind goal.
                  </div>
                </div>
              </div>
              
              <div class="lb-progress-col">
                 <div class="lb-progress-ring">
                    <svg viewBox="0 0 36 36" class="circular-chart-sm">
                      <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                      <path class="circle" :style="{ strokeDasharray: Math.min(100, Math.max(0, entry.progressPercent)) + ', 100' }" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    </svg>
                    <span class="lb-progress-val">{{ Math.round(entry.progressPercent) }}%</span>
                 </div>
                 <button v-if="entry.userId !== auth.user?.id" class="btn-profile-peek" @click="viewMemberLogs(entry)">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                 </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════ MY PROGRESS TAB ═══════════════ -->
        <div v-if="activeTab === 'progress'" class="tab-content animate-in">
          <div class="progress-section-header">
             <h2>Weekly Targets</h2>
             <span class="text-secondary">{{ groups.targets.length }} milestones</span>
          </div>
          
          <div class="targets-scroll mt-4">
            <div v-for="target in groups.targets" :key="target.id" class="target-card-premium glass-card" :class="{ 'current-week': target.actualWeight }">
              <div class="target-card-top">
                <span class="target-week-badge">Week {{ target.weekNumber }}</span>
                <span v-if="target.coachOverride" class="coach-label">Coach Set</span>
              </div>
              <div class="target-weight-val">{{ target.targetWeight }} <span>lbs</span></div>
              <div class="target-actual-info" :class="{ 'not-logged': !target.actualWeight }">
                <span v-if="target.actualWeight">Achieved: {{ target.actualWeight }} lbs</span>
                <span v-else>Pending log</span>
              </div>
            </div>
          </div>

          <div class="progress-section-header mt-8">
             <h2>Training Logs</h2>
             <button class="btn btn-primary btn-sm" @click="showLogModal = true">+ New Log</button>
          </div>
          
          <div v-if="groups.logs.length === 0" class="empty-state">
            <p>No activity recorded yet.</p>
          </div>
          
          <div v-for="log in groups.logs" :key="log.id" class="training-log-card glass-card">
            <template v-if="editingLog === log.id">
              <div class="edit-ui-container">
                <div class="grid grid-cols-2 gap-4">
                  <div class="form-group">
                    <label>Weight</label>
                    <input v-model="editLogWeight" type="number" step="0.1" class="form-input"/>
                  </div>
                  <div class="form-group">
                    <label>Calories</label>
                    <input v-model="editLogCalories" type="number" class="form-input"/>
                  </div>
                </div>
                <div class="form-group mt-3">
                  <label>Notes</label>
                  <textarea v-model="editLogNotes" class="form-input" rows="2"></textarea>
                </div>
                <!-- Photos Uploader inside edit -->
                <div class="form-group mt-3">
                  <label>Update Photos</label>
                  <div class="log-photos-edit mt-2">
                    <div v-for="(url, idx) in uploadedPhotos" :key="idx" class="photo-preview-box">
                      <img :src="url" />
                      <button class="remove-photo-over" @click="removePhoto(idx)">×</button>
                    </div>
                    <button v-if="uploadedPhotos.length < 5" class="add-photo-block" @click="openUploadWidget">+</button>
                  </div>
                </div>
                <div class="flex justify-end gap-3 mt-4">
                  <button class="btn btn-secondary btn-sm" @click="cancelEditLog">Cancel</button>
                  <button class="btn btn-primary btn-sm" @click="saveEditLog(log.id)">Save Changes</button>
                </div>
              </div>
            </template>
            
            <template v-else>
              <div class="log-card-top">
                <div class="log-meta">
                  <span class="log-date-tag">{{ formatDate(log.logDate) }}</span>
                  <div class="log-stats-inline">
                    <span v-if="log.weightLbs" class="log-pill weight"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block mr-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> {{ log.weightLbs }}</span>
                    <span v-if="log.calories" class="log-pill energy"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block mr-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> {{ log.calories }}</span>
                  </div>
                </div>
                <div class="log-actions-menu">
                   <button class="action-btn-minimal" @click="startEditLog(log)" title="Edit">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="action-icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                   </button>
                   <button class="action-btn-minimal text-red" @click="requestDelete('log', log.id)" title="Delete">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="action-icon-danger" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                   </button>
                </div>
              </div>
              
              <div v-if="log.photoUrls?.length > 0" class="log-galleria-mt">
                <div v-for="(url, idx) in log.photoUrls" :key="idx" class="galleria-item" @click="openPreview(log.photoUrls, idx)">
                   <img :src="url" loading="lazy"/>
                </div>
              </div>
              
              <p v-if="log.notes" class="log-story">{{ log.notes }}</p>
            </template>
          </div>
        </div>

        <!-- ═══════════════ COACH TAB ═══════════════ -->
        <div v-if="activeTab === 'coach' && isCoach" class="tab-content animate-in">
          <div class="coach-post-interface glass-card">
            <h3 class="flex items-center gap-2 mb-4"><span class="text-lime"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" class="inline-block" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></span> Broadcast to Team</h3>
            <div class="form-group mb-4">
              <label>Message Type</label>
              <div class="custom-radio-group mt-1">
                <label class="custom-radio" :class="{active: postType === 'ADVICE'}">
                  <input type="radio" v-model="postType" value="ADVICE" class="hidden"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Advice
                </label>
                <label class="custom-radio" :class="{active: postType === 'MOTIVATION'}">
                  <input type="radio" v-model="postType" value="MOTIVATION" class="hidden"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> Motivation
                </label>
                <label class="custom-radio" :class="{active: postType === 'ANNOUNCEMENT'}">
                  <input type="radio" v-model="postType" value="ANNOUNCEMENT" class="hidden"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Announcement
                </label>
              </div>
            </div>
            <div class="relative">
              <textarea v-model="postContent" class="form-input h-32 w-full pr-16" placeholder="Share your wisdom..."></textarea>
              <button class="btn-post-send" @click="handlePost" :disabled="!postContent.trim()">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>

          <div class="progress-section-header mt-8">
             <h2>Team Management</h2>
             <span class="text-lime">{{ groups.members.length }} Athletes</span>
          </div>

          <div class="member-manage-list mt-4 grid gap-4">
            <div v-for="member in groups.members" :key="member.userId" class="member-manage-card glass-card flex items-center justify-between p-4">
               <div class="flex items-center gap-4">
                  <div class="avatar avatar-md avatar-placeholder">{{ getInitials(member.displayName) }}</div>
                  <div>
                     <h4 class="font-bold text-lg leading-tight">{{ member.displayName }}</h4>
                     <div class="text-sm mt-1">
                        <span class="badge" :class="member.role === 'COACH' ? 'badge-amber' : 'badge-teal'">{{ member.role }}</span>
                     </div>
                  </div>
               </div>
               
               <div class="flex items-center gap-6">
                 <div class="text-right hidden sm:block">
                   <div class="text-xs text-muted uppercase tracking-wider font-bold">Goal</div>
                   <div class="font-heading font-bold text-lg text-secondary">{{ member.startWeight }} → <span class="text-lime">{{ member.goalWeight }}</span></div>
                 </div>
                 <div class="member-radial-progress text-center relative w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 36 36" class="circular-chart-xs w-full h-full drop-shadow-lg">
                       <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                       <path class="circle" :style="{ strokeDasharray: Math.min(100, Math.max(0, member.progressPercent)) + ', 100' }" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{{ Math.round(member.progressPercent) }}%</div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════ SETTINGS TAB ═══════════════ -->
        <div v-if="activeTab === 'settings'" class="tab-content animate-in">
          <div class="settings-group glass-card">
            <h3>Invite Teammates</h3>
            <p class="text-secondary text-sm mb-4">Grow your squad and boost motivation.</p>
            <div class="flex gap-3">
              <input v-model="inviteEmail" class="form-input" placeholder="teammate@email.com" />
              <button class="btn btn-primary" @click="handleInvite">Send</button>
            </div>
            
            <div v-if="inviteError" class="error-msg-inline mt-4">{{ inviteError }}</div>
            
            <div v-if="inviteResult" class="invite-success-box mt-4">
              <span class="text-lime block mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block mr-1 text-lime" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Link ready for {{ inviteResult.inviteEmail || 'them' }}:</span>
              <div class="flex gap-2">
                <code class="invite-code flex-grow">{{ inviteLink }}</code>
                <button class="btn btn-secondary btn-sm" @click="copyInvite">Copy</button>
              </div>
            </div>
          </div>

          <div class="settings-group glass-card mt-6">
            <h3>Squad Info</h3>
            <div class="info-grid mt-4">
               <div class="info-item">
                  <span class="info-label">Timeline</span>
                  <span class="info-val">{{ formatDate(groups.currentGroup.startDate) }} - {{ formatDate(groups.currentGroup.endDate) }}</span>
               </div>
               <div class="info-item">
                  <span class="info-label">Program Type</span>
                  <span class="info-val">Weight Loss Transformation</span>
               </div>
            </div>
            
            <div class="mt-8 pt-6 border-t border-white/10 flex justify-end">
              <button v-if="isCoach" class="btn btn-coral" @click="requestGroupAction('delete')">Delete Group</button>
              <button v-else class="btn btn-coral" @click="requestGroupAction('leave')">Leave Group</button>
            </div>
          </div>
        </div>

      </template>

      <!-- ═══════════════ LOG MODAL ═══════════════ -->
      <Teleport to="body">
        <div v-if="showLogModal" class="modal-backdrop-blur" @click.self="showLogModal = false">
          <div class="modal-premium glass-card animate-scale">
            <h2 class="modal-headline">LOG ACTIVITY</h2>
            
            <div class="grid grid-cols-2 gap-6 mt-6">
              <div class="form-group">
                <label>WEIGHT (LBS)</label>
                <input v-model="logWeight" type="number" step="0.1" class="form-input" placeholder="000.0"/>
              </div>
              <div class="form-group">
                <label>CALORIES</label>
                <input v-model="logCalories" type="number" class="form-input" placeholder="0000"/>
              </div>
            </div>

            <div class="form-group mt-6">
              <label>DAILY REPORT NOTES</label>
              <textarea v-model="logNotes" class="form-input" rows="3" placeholder="How did you perform today?"></textarea>
            </div>

            <div class="form-group mt-6">
              <label>SESSION PHOTOS (Optional)</label>
              <div class="uploader-gallery-grid mt-2">
                <div v-for="(url, idx) in uploadedPhotos" :key="idx" class="photo-preview-item">
                  <img :src="url" />
                  <button class="p-remove-btn" @click="removePhoto(idx)">×</button>
                </div>
                <button v-if="uploadedPhotos.length < 5" class="p-add-trigger" @click="openUploadWidget">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                  <span>Add Photo</span>
                </button>
              </div>
            </div>

            <div class="modal-footer-btns mt-8">
              <button class="btn btn-secondary w-full" @click="showLogModal = false">Discard</button>
              <button class="btn btn-primary w-full" @click="handleLog" :disabled="!logWeight">Confirm Log</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ═══════════════ DELETE CONFIRM MODAL ═══════════════ -->
      <Teleport to="body">
        <div v-if="confirmDelete" class="modal-backdrop-blur" @click.self="cancelDelete">
          <div class="modal-premium glass-card confirm-alert animate-scale">
            <div class="alert-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" class="inline-block text-coral mb-2" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <h3>REMOVE ENTRY?</h3>
            <p>This action is final and cannot be reverted.</p>
            <div class="flex gap-4 mt-8 w-full">
              <button class="btn btn-secondary flex-grow shadow-lg font-bold" @click="cancelDelete">Cancel</button>
              <button class="btn btn-coral flex-grow shadow-lg font-bold" @click="executeDelete">Delete</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ═══════════════ GROUP ACTION CONFIRM MODAL ═══════════════ -->
      <Teleport to="body">
        <div v-if="confirmGroupAction" class="modal-backdrop-blur" @click.self="cancelGroupAction">
          <div class="modal-premium glass-card confirm-alert animate-scale">
            <div class="alert-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" class="inline-block text-coral mb-2" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <h3 v-if="confirmGroupAction === 'delete'">DELETE GROUP?</h3>
            <h3 v-else>LEAVE GROUP?</h3>
            <p v-if="confirmGroupAction === 'delete'">This will permanently delete the group and all its data. This cannot be undone.</p>
            <p v-else>Are you sure you want to leave this group? You will lose access to all posts and logs.</p>
            <div class="flex gap-4 mt-8 w-full">
              <button class="btn btn-secondary flex-grow shadow-lg font-bold" @click="cancelGroupAction">Cancel</button>
              <button class="btn btn-coral flex-grow shadow-lg font-bold" @click="executeGroupAction">{{ confirmGroupAction === 'delete' ? 'Delete' : 'Leave' }}</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modals -->
      <ImagePreviewModal v-if="showPreviewModal" :images="previewImages" v-model="previewIndex" @close="showPreviewModal = false" />
      <MemberLogsModal v-if="showMemberLogsModal" :member="selectedMember" :logs="memberLogs" @close="showMemberLogsModal = false" @preview-photo="({ urls, index }) => openPreview(urls, index)" />
    </div>
  </div>
</template>


<style scoped>
/* ═══════ GROUP DETAIL PAGE — COMPLETE REDESIGN ═══════ */

.group-detail-page {
  background: var(--bg-primary);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  z-index: 1;
  padding-bottom: 120px;
}

.group-detail-page::before {
  content: '';
  position: absolute;
  top: -20vh;
  left: 50%;
  transform: translateX(-50%);
  width: 140vw;
  height: 60vh;
  background: radial-gradient(ellipse at top, rgba(217,255,77,0.12) 0%, rgba(179,153,255,0.06) 40%, transparent 70%);
  z-index: -1;
  pointer-events: none;
}

.container { position: relative; z-index: 10; }

/* ── HEADER ── */
.group-page-header { padding: 32px 0 24px; }

.header-back {
  display: flex;
  align-items: center;
  gap: 14px;
}

.back-link {
  width: 42px; height: 42px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  flex-shrink: 0;
}
.back-link:hover {
  background: rgba(217,255,77,0.1);
  border-color: var(--accent-lime);
  color: var(--accent-lime);
  transform: translateX(-3px);
}

.page-title {
  font-size: clamp(1.6rem, 5vw, 2.8rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, #fff 30%, var(--accent-lime));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.15;
}

/* Overview Panel */
.group-overview-panel {
  display: grid;
  grid-template-columns: 1fr;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.group-overview-panel:hover {
  transform: none;
  background: rgba(255,255,255,0.04);
}

.panel-stats {
  display: flex;
  justify-content: space-evenly;
  padding: 24px 20px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.stat-block { text-align: center; display: flex; flex-direction: column; gap: 4px; }
.stat-divider { width: 1px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent); }
.ov-label { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.12em; }
.ov-value { font-size: 1.6rem; font-weight: 900; font-family: var(--font-heading); letter-spacing: -0.02em; }
.text-lime { color: var(--accent-lime); text-shadow: 0 0 8px rgba(217,255,77,0.25); }
.text-coral { color: var(--accent-coral); text-shadow: 0 0 8px rgba(255,112,67,0.25); }

.panel-desc {
  padding: 18px 24px;
  color: var(--text-secondary);
  line-height: 1.7;
  text-align: center;
  font-size: 0.95rem;
}

/* ── TABS ── */
.group-tabs-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0 24px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.group-tabs-scroll::-webkit-scrollbar { display: none; }

.group-tab-chip {
  padding: 10px 22px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  color: var(--text-secondary);
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
}
.group-tab-chip::after { display: none; }
.group-tab-chip:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
  border-color: rgba(255,255,255,0.15);
}
.group-tab-chip.active {
  background: linear-gradient(135deg, rgba(217,255,77,0.15), rgba(217,255,77,0.05));
  color: var(--accent-lime);
  border-color: rgba(217,255,77,0.4);
  box-shadow: 0 0 16px rgba(217,255,77,0.1);
}

/* ── TAB CONTENT ── */
.tab-content { display: flex; flex-direction: column; gap: 16px; }

/* ── FEED ── */
.post-card-premium {
  padding: 24px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  backdrop-filter: blur(10px);
  position: relative;
  transition: all 0.3s ease;
}
.post-card-premium::before {
  content: '';
  position: absolute; top: 0; left: 0;
  width: 3px; height: 0%;
  background: var(--accent-lime);
  transition: height 0.3s ease;
  border-radius: 0 0 3px 0;
}
.post-card-premium:hover { background: rgba(255,255,255,0.05); transform: none; }
.post-card-premium:hover::before { height: 100%; }

.post-header-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
}
.post-author { display: flex; align-items: center; gap: 12px; min-width: 0; }
.post-author-name { font-weight: 700; font-size: 1rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.post-timestamp { font-size: 0.8rem; color: var(--text-muted); display: block; }

.post-type-tag {
  padding: 4px 12px; border-radius: 8px;
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  flex-shrink: 0;
  background: rgba(255,255,255,0.05);
}
.post-type-tag.motivation { background: rgba(255,112,67,0.12); color: var(--accent-coral); }
.post-type-tag.advice { background: rgba(217,255,77,0.1); color: var(--accent-lime); }
.post-type-tag.announcement { background: rgba(179,153,255,0.1); color: var(--accent-purple); }

.post-actions-menu { display: flex; gap: 4px; flex-shrink: 0; }
.post-body { color: var(--text-secondary); line-height: 1.7; font-size: 0.95rem; }

/* ── LEADERBOARD ── */
.leaderboard-list { display: flex; flex-direction: column; gap: 10px; }

.leaderboard-row {
  display: flex; align-items: center; padding: 18px 20px; gap: 14px;
  background: rgba(255,255,255,0.025);
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.25s ease;
}
.leaderboard-row:hover { background: rgba(255,255,255,0.06); transform: translateX(4px); }
.leaderboard-row.self-row {
  border-color: rgba(217,255,77,0.3);
  background: linear-gradient(90deg, rgba(217,255,77,0.06), transparent);
  box-shadow: 0 0 20px rgba(217,255,77,0.08);
}

.lb-rank-col { width: 40px; display: flex; justify-content: center; flex-shrink: 0; }
.lb-medal { font-size: 1.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }
.lb-rank-num { font-size: 1.2rem; font-weight: 900; color: rgba(255,255,255,0.15); font-family: var(--font-heading); }

.lb-member-col { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.lb-member-details { min-width: 0; }
.member-name { font-weight: 700; font-size: 1rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.member-stats-mini { display: flex; gap: 12px; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
.lb-change-text.good { color: var(--accent-lime); }
.lb-change-text.bad { color: var(--accent-coral); }

.lb-progress-col { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.lb-progress-ring { width: 48px; height: 48px; position: relative; }

.circular-chart-sm { width: 100%; height: 100%; }
.circle-bg { fill: none; stroke: rgba(255,255,255,0.04); stroke-width: 3; }
.circle { fill: none; stroke: var(--accent-lime); stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 0.8s ease-out; }

.lb-progress-val {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  font-size: 0.65rem; font-weight: 800; color: #fff;
}

.btn-profile-peek {
  width: 38px; height: 38px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.25s;
}
.btn-profile-peek:hover { background: var(--accent-lime); color: #000; transform: scale(1.08); }

/* ── PROGRESS ── */
.progress-section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.progress-section-header h2 {
  font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em;
  display: flex; align-items: center; gap: 10px;
}

.targets-scroll {
  display: flex; gap: 12px; overflow-x: auto;
  padding-bottom: 16px; scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.targets-scroll::-webkit-scrollbar { display: none; }

.target-card-premium {
  min-width: 160px; padding: 22px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  flex-shrink: 0;
  transition: all 0.25s ease;
}
.target-card-premium:hover { transform: none; background: rgba(255,255,255,0.04); }
.target-card-premium.current-week {
  border-color: rgba(217,255,77,0.4);
  background: linear-gradient(135deg, rgba(217,255,77,0.06), transparent);
  box-shadow: 0 4px 20px rgba(217,255,77,0.08);
}

.target-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.target-week-badge { font-size: 0.7rem; font-weight: 800; color: var(--accent-lime); text-transform: uppercase; letter-spacing: 0.1em; }
.coach-label {
  font-size: 0.6rem; background: var(--accent-purple); color: #000;
  padding: 3px 7px; border-radius: 6px; font-weight: 800; text-transform: uppercase;
}
.target-weight-val { font-size: 2rem; font-weight: 900; font-family: var(--font-heading); color: #fff; letter-spacing: -0.02em; }
.target-weight-val span { font-size: 0.85rem; opacity: 0.4; font-weight: 600; }

.target-actual-info { margin-top: 10px; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
.target-actual-info::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-lime); box-shadow: 0 0 6px var(--accent-lime); }
.target-actual-info.not-logged::before { background: rgba(255,255,255,0.15); box-shadow: none; }
.target-actual-info.not-logged { color: var(--text-muted); font-style: italic; }

/* ── TRAINING LOGS ── */
.training-log-card {
  padding: 24px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  transition: all 0.25s ease;
}
.training-log-card:hover { transform: none; background: rgba(255,255,255,0.04); }

.log-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 12px; }
.log-meta { min-width: 0; flex: 1; }
.log-date-tag { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px; }
.log-stats-inline { display: flex; gap: 10px; flex-wrap: wrap; }
.log-pill {
  padding: 6px 12px; background: rgba(0,0,0,0.4); border-radius: 8px;
  font-weight: 700; font-size: 0.85rem; display: flex; align-items: center;
}
.log-pill.weight { color: var(--accent-lime); border: 1px solid rgba(217,255,77,0.15); }
.log-pill.energy { color: var(--accent-coral); border: 1px solid rgba(255,112,67,0.15); }

.log-actions-menu { display: flex; gap: 4px; flex-shrink: 0; }

.log-galleria-mt {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px; margin: 16px 0;
}
.galleria-item {
  aspect-ratio: 1; border-radius: 12px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08); cursor: pointer;
}
.galleria-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.galleria-item:hover img { transform: scale(1.1); }

.log-story {
  color: var(--text-secondary); line-height: 1.7; font-size: 0.9rem;
  background: rgba(255,255,255,0.02); padding: 16px; border-radius: 12px;
  border-left: 3px solid rgba(255,255,255,0.08);
}

/* ── ACTIONS ── */
.action-btn-minimal {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer; padding: 8px; border-radius: 10px;
  transition: all 0.25s ease; color: var(--text-muted);
  display: inline-flex; align-items: center; justify-content: center;
}
.action-btn-minimal:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.15); }
.action-btn-minimal:hover .action-icon { stroke: var(--accent-lime); }
.action-btn-minimal:hover .action-icon-danger { stroke: var(--accent-coral); }

/* ── EDIT UI ── */
.edit-ui-container { padding: 4px 0; }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: 1fr 1fr; }
.gap-4 { gap: 16px; }
.gap-3 { gap: 12px; }
.gap-6 { gap: 24px; }
.gap-2 { gap: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mt-8 { margin-top: 32px; }
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }
.pt-6 { padding-top: 24px; }
.p-4 { padding: 16px; }
.pr-16 { padding-right: 64px; }
.w-full { width: 100%; }
.h-32 { height: 128px; }
.flex { display: flex; }
.flex-grow { flex-grow: 1; }
.flex-shrink-0 { flex-shrink: 0; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-sm { font-size: 0.875rem; }
.text-xs { font-size: 0.75rem; }
.text-lg { font-size: 1.125rem; }
.font-bold { font-weight: 700; }
.font-heading { font-family: var(--font-heading); }
.leading-tight { line-height: 1.2; }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: var(--text-muted); }
.text-red { color: var(--accent-coral); }
.uppercase { text-transform: uppercase; }
.tracking-wider { letter-spacing: 0.05em; }
.inline-block { display: inline-block; }
.mr-1 { margin-right: 4px; }
.hidden { display: none; }
.relative { position: relative; }
.absolute { position: absolute; }
.inset-0 { inset: 0; }
.border-t { border-top: 1px solid; }
.border-white\/10 { border-color: rgba(255,255,255,0.1); }
.shadow-lg { box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
.drop-shadow-lg { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }

.log-photos-edit { display: flex; gap: 10px; flex-wrap: wrap; }
.photo-preview-box { width: 72px; height: 72px; border-radius: 10px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.1); }
.photo-preview-box img { width: 100%; height: 100%; object-fit: cover; }
.remove-photo-over {
  position: absolute; top: 4px; right: 4px; width: 22px; height: 22px;
  background: var(--accent-coral); color: #fff; border: none; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  font-size: 0.9rem;
}
.add-photo-block {
  width: 72px; height: 72px;
  border: 1px dashed rgba(255,255,255,0.15); border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); background: transparent; cursor: pointer;
  font-size: 1.5rem; transition: all 0.2s;
}
.add-photo-block:hover { border-color: var(--accent-lime); color: var(--accent-lime); }

/* ── COACH TAB ── */
.coach-post-interface {
  padding: 28px;
  background: rgba(255,255,255,0.03);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.06);
}
.coach-post-interface:hover { transform: none; }

.custom-radio-group { display: flex; gap: 10px; flex-wrap: wrap; }
.custom-radio {
  padding: 10px 16px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  font-size: 0.85rem; cursor: pointer;
  transition: all 0.25s ease;
  font-family: var(--font-heading); font-weight: 700;
  color: var(--text-secondary);
}
.custom-radio:hover { background: rgba(255,255,255,0.08); color: #fff; }
.custom-radio.active {
  background: rgba(217,255,77,0.08);
  border-color: rgba(217,255,77,0.4);
  color: var(--accent-lime);
  box-shadow: 0 0 12px rgba(217,255,77,0.1);
}

.btn-post-send {
  position: absolute; right: 12px; bottom: 12px;
  width: 42px; height: 42px;
  background: var(--gradient-lime); border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #000; border: none; cursor: pointer;
  transition: all 0.25s; box-shadow: 0 4px 12px rgba(217,255,77,0.25);
}
.btn-post-send:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(217,255,77,0.4); }
.btn-post-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }

/* Member management - Coach */
.member-manage-list { display: flex; flex-direction: column; gap: 12px; }

.member-manage-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px; border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.025);
  transition: all 0.25s ease; gap: 16px;
}
.member-manage-card:hover { background: rgba(255,255,255,0.04); transform: none; }

.member-radial-progress { width: 44px; height: 44px; position: relative; flex-shrink: 0; }
.circular-chart-xs { width: 100%; height: 100%; }
.w-12 { width: 48px; } .h-12 { height: 48px; }

/* ── SETTINGS ── */
.settings-group {
  padding: 28px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  background: rgba(255,255,255,0.025);
}
.settings-group:hover { transform: none; }
.settings-group h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 4px; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-item {
  display: flex; flex-direction: column; gap: 6px;
  padding: 18px; background: rgba(255,255,255,0.025);
  border-radius: 14px; border: 1px solid rgba(255,255,255,0.04);
}
.info-label { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
.info-val { font-weight: 700; font-size: 1rem; color: #fff; }

.error-msg-inline { color: var(--accent-coral); font-size: 0.85rem; font-weight: 600; }

.invite-success-box {
  padding: 16px 20px;
  background: rgba(217,255,77,0.04);
  border: 1px solid rgba(217,255,77,0.15);
  border-radius: 14px;
}
.invite-code {
  display: block; padding: 10px 14px;
  background: rgba(0,0,0,0.4); border-radius: 8px;
  color: var(--text-secondary); font-size: 0.8rem;
  word-break: break-all; font-family: monospace;
}

/* ── FAB ── */
.fab-btn-premium {
  position: fixed; bottom: 100px; right: 24px;
  width: 60px; height: 60px;
  background: var(--gradient-lime);
  border-radius: 18px; color: #000;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 28px rgba(217,255,77,0.35);
  border: none; cursor: pointer; z-index: 100;
  transition: all 0.3s ease;
}
.fab-btn-premium:hover { transform: translateY(-3px) rotate(90deg); box-shadow: 0 12px 36px rgba(217,255,77,0.5); }
.fab-btn-premium svg { width: 28px; height: 28px; }

/* ── MODALS ── */
.modal-backdrop-blur {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; padding: 16px;
  animation: fadeIn 0.2s ease;
}

.modal-premium {
  width: 100%; max-width: 520px;
  padding: 36px 28px;
  background: linear-gradient(135deg, rgba(28,28,32,0.97), rgba(14,14,16,0.97));
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 32px 80px rgba(0,0,0,0.7);
  border-radius: 24px;
}
.modal-premium:hover { transform: none; }

.modal-headline {
  font-size: 1.6rem; font-weight: 900; letter-spacing: -0.03em;
  text-align: center; margin-bottom: 24px; color: #fff;
}

.uploader-gallery-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px;
}

.photo-preview-item {
  aspect-ratio: 1; position: relative; border-radius: 12px; overflow: hidden;
  border: 2px solid var(--accent-lime); box-shadow: 0 2px 10px rgba(217,255,77,0.15);
}
.photo-preview-item img { width: 100%; height: 100%; object-fit: cover; }

.p-remove-btn {
  position: absolute; top: 6px; right: 6px;
  width: 24px; height: 24px;
  background: var(--accent-coral); color: #fff; border: none; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 1rem;
}

.p-add-trigger {
  aspect-ratio: 1; border: 2px dashed rgba(255,255,255,0.15);
  border-radius: 12px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 6px;
  color: var(--text-secondary); background: transparent;
  cursor: pointer; transition: all 0.25s; font-weight: 600; font-size: 0.8rem;
}
.p-add-trigger:hover { border-color: var(--accent-lime); color: var(--accent-lime); background: rgba(217,255,77,0.04); }

.modal-footer-btns { display: flex; gap: 12px; }

.confirm-alert { max-width: 400px; text-align: center; padding: 36px; }
.confirm-alert:hover { transform: none; }
.confirm-alert h3 { font-size: 1.5rem; margin-bottom: 10px; }
.confirm-alert p { color: var(--text-secondary); font-size: 0.95rem; }
.alert-icon { margin-bottom: 8px; }

/* ── EMPTY STATE ── */
.empty-state { text-align: center; padding: 48px 20px; color: var(--text-muted); }
.empty-icon { margin-bottom: 12px; opacity: 0.4; }
.loading-state { padding: 60px 0; }

@keyframes animate-scale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-scale { animation: animate-scale 0.25s ease; }

/* ═══════ RESPONSIVE ═══════ */
@media (max-width: 640px) {
  .group-page-header { padding: 20px 0 16px; }
  .page-title { font-size: 1.5rem; }
  .panel-stats { padding: 18px 14px; }
  .ov-value { font-size: 1.3rem; }
  .panel-desc { padding: 14px 18px; font-size: 0.85rem; }
  .group-tabs-scroll { gap: 6px; padding: 6px 0 18px; }
  .group-tab-chip { padding: 8px 16px; font-size: 0.8rem; }
  .tab-content { gap: 12px; }
  .post-card-premium { padding: 18px; }
  .leaderboard-row { padding: 14px 16px; gap: 10px; flex-wrap: wrap; }
  .lb-member-col { flex: 1 1 calc(100% - 54px); }
  .lb-progress-col {
    width: 100%; justify-content: space-between;
    margin-top: 10px; padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .lb-progress-ring { width: 42px; height: 42px; }
  .targets-scroll { gap: 10px; }
  .target-card-premium { min-width: 140px; padding: 18px; }
  .target-weight-val { font-size: 1.7rem; }
  .training-log-card { padding: 18px; }
  .log-stats-inline { gap: 8px; }
  .log-pill { padding: 5px 10px; font-size: 0.8rem; }
  .log-galleria-mt { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; }
  .coach-post-interface { padding: 20px; }
  .settings-group { padding: 20px; }
  .info-grid { grid-template-columns: 1fr; gap: 10px; }
  .info-item { padding: 14px; }
  .member-manage-card { padding: 16px; flex-wrap: wrap; }
  .fab-btn-premium { bottom: 88px; right: 16px; width: 54px; height: 54px; border-radius: 16px; }
  .fab-btn-premium svg { width: 24px; height: 24px; }
  .modal-premium { padding: 28px 20px; border-radius: 20px; }
  .modal-headline { font-size: 1.4rem; }
  .modal-footer-btns { flex-direction: column-reverse; }
  .grid-cols-2 { grid-template-columns: 1fr; }
  .confirm-alert { padding: 28px 20px; }
  .progress-section-header h2 { font-size: 1.2rem; }
  .progress-section-header { flex-wrap: wrap; gap: 8px; }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .page-title { font-size: 2.2rem; }
  .ov-value { font-size: 1.5rem; }
  .leaderboard-row { padding: 18px; }
}

@media (min-width: 641px) {
  .sm\:block { display: block !important; }
}
@media (max-width: 640px) {
  .hidden.sm\:block { display: none !important; }
}

</style>

