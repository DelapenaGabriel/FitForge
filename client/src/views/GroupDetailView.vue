<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useGroupStore } from "@/stores/groups";
import ImagePreviewModal from "@/components/ImagePreviewModal.vue";
import MemberLogsModal from "@/components/MemberLogsModal.vue";
import LeaderboardCalendar from "@/components/LeaderboardCalendar.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const groups = useGroupStore();

const groupId = computed(() => Number(route.params.id));
const getMappedTab = (tab) => {
  if (tab === 'logs') return 'progress';
  if (tab === 'members') return 'settings';
  return tab || 'feed';
};

const activeTab = ref(getMappedTab(route.query.tab));

watch(() => route.query.tab, (newTab) => {
  if (newTab) {
    activeTab.value = getMappedTab(newTab);
  }
});

const leaderboardViewMode = ref("calendar");
const loading = ref(true);

// Calendar User Selection
const selectedCalendarUser = ref(null);
const calendarTargets = ref([]);

watch(selectedCalendarUser, async (newUserId) => {
  if (!newUserId || !groupId.value) return;
  if (newUserId === auth.user?.id && groups.targets?.length) {
    calendarTargets.value = groups.targets;
  } else {
    try {
      const targets = await groups.getCalendarTargets(groupId.value, newUserId);
      if (!targets || targets.length === 0) {
        // Fallback: manually construct targets from group member data if API doesn't have them mock-seeded
        const member = groups.members.find(m => m.userId === newUserId);
        if (member && member.startWeight && member.goalWeight && groups.currentGroup?.totalWeeks) {
          const totalWeeks = groups.currentGroup.totalWeeks;
          const start = member.startWeight;
          const end = member.goalWeight;
          const weeklyDrop = (start - end) / totalWeeks;
          
          const fakeTargets = [];
          for (let i = 1; i <= totalWeeks; i++) {
            fakeTargets.push({
              id: 'fake-' + i,
              weekNumber: i,
              targetWeight: Number((start - (weeklyDrop * i)).toFixed(1)),
              actualWeight: null,
              coachOverride: false
            });
          }
          calendarTargets.value = fakeTargets;
        } else {
          calendarTargets.value = [];
        }
      } else {
        calendarTargets.value = targets;
      }
    } catch (err) {
      console.error("Failed to fetch calendar targets:", err);
      calendarTargets.value = [];
    }
  }
}, { immediate: true });

const calendarLogs = computed(() => {
  if (!groups.allLogs) return [];
  return groups.allLogs.filter(log => log.userId === selectedCalendarUser.value);
});

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

const handleGoalWeightUpdated = async ({ userId, newWeight }) => {
  // If we are looking at this user's calendar, refresh it
  if (selectedCalendarUser.value === userId) {
    if (userId === auth.user?.id) {
      calendarTargets.value = groups.targets;
    } else {
      calendarTargets.value = await groups.getCalendarTargets(groupId.value, userId);
    }
  }
  // Refresh data from server to ensure progress rings and stats update correctly
  await Promise.all([
    groups.fetchMembers(groupId.value),
    groups.fetchLeaderboard(groupId.value),
    groups.fetchGroup(groupId.value)
  ]);
};

// Log form
const logWeight = ref("");
const logCalories = ref("");
const logNotes = ref("");
const uploadedPhotos = ref([]);
const uploadedVideos = ref([]);
const logPinned = ref(false);
const isSubmittingLog = ref(false);

const commentText = ref({}); // { 'post-1': '...', 'log-1': '...' }

const fileInputPhoto = ref(null);
const fileInputVideo = ref(null);
const isUploadingPhoto = ref(false);
const isUploadingVideo = ref(false);

const openUploadWidget = (type = 'image') => {
  if (type === 'video') {
    if (isUploadingVideo.value) return;
    fileInputVideo.value?.click();
  } else {
    if (isUploadingPhoto.value) return;
    fileInputPhoto.value?.click();
  }
};

const handleMediaUpload = async (event, type) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const isVideo = type === 'video';
  const currentCount = isVideo ? uploadedVideos.value.length : uploadedPhotos.value.length;
  
  if (currentCount >= 5) {
    alert(`Maximum 5 ${type}s allowed.`);
    return;
  }

  const maxSize = isVideo ? 100000000 : 10000000;
  if (file.size > maxSize) {
    alert(`File size must be less than ${maxSize / 1000000}MB`);
    return;
  }

  if (isVideo) isUploadingVideo.value = true;
  else isUploadingPhoto.value = true;
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'fitforge');

    const endpoint = isVideo 
      ? 'https://api.cloudinary.com/v1_1/dho7jd4k8/video/upload'
      : 'https://api.cloudinary.com/v1_1/dho7jd4k8/image/upload';

    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      throw new Error('Upload failed');
    }
    
    const result = await res.json();
    if (isVideo) {
      uploadedVideos.value.push(result.secure_url);
    } else {
      uploadedPhotos.value.push(result.secure_url);
    }
  } catch (err) {
    console.error('Failed to upload media:', err);
    alert('Failed to upload media. Please try again.');
  } finally {
    if (isVideo) isUploadingVideo.value = false;
    else isUploadingPhoto.value = false;
    event.target.value = '';
  }
};

const removeVideo = (index) => {
  uploadedVideos.value.splice(index, 1);
};

const removePhoto = (index) => {
  uploadedPhotos.value.splice(index, 1);
};

// Coach post form
const postContent = ref("");
const postType = ref("ADVICE");
const isSubmittingPost = ref(false);

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
const editLogPinned = ref(false);

// Post editing
const editingPost = ref(null);
const editPostContent = ref("");
const editPostType = ref("ADVICE");
const editPostPhotos = ref([]);
const editPostVideos = ref([]);

// Delete confirmation
const confirmDelete = ref(null); // { type: 'log'|'post', id: Number }

// Group Objective editing
const editingObjective = ref(false);
const editObjectiveText = ref("");

const startEditObjective = () => {
  editObjectiveText.value = groups.currentGroup?.description || "";
  editingObjective.value = true;
};

const saveObjective = async () => {
  if (!groups.currentGroup) return;
  try {
    await groups.updateGroup(groupId.value, {
      name: groups.currentGroup.name,
      description: editObjectiveText.value,
      startDate: groups.currentGroup.startDate,
      endDate: groups.currentGroup.endDate,
      startWeight: 0, // DTO fields required but not used by this update service really
      goalWeight: 0
    });
    editingObjective.value = false;
  } catch (error) {
    console.error("Failed to update group objective:", error);
    alert(
      error.response?.data?.message ||
        "Failed to update group objective. Please try again."
    );
  }
};

// Refresh data when user returns to the app (replaces polling)
const refreshOnFocus = async () => {
  if (document.visibilityState !== 'visible' || loading.value) return;
  try {
    const notifs = useNotificationStore();
    await Promise.all([
      groups.fetchPosts(groupId.value),
      groups.fetchAllLogs(groupId.value),
      groups.fetchMembers(groupId.value),
      notifs.fetchNotifications()
    ]);
  } catch { /* non-critical on refocus */ }
};

onMounted(async () => {
  try {
    await groups.fetchGroup(groupId.value);
    await Promise.all([
      groups.fetchPosts(groupId.value),
      groups.fetchLeaderboard(groupId.value),
      groups.fetchMembers(groupId.value),
      groups.fetchTargets(groupId.value, auth.user?.id),
      groups.fetchAllLogs(groupId.value),
    ]);
    // Fetch logs separately and update store state
    groups.logs = await groups.fetchLogs(groupId.value, auth.user?.id);
    // Set initial calendar user
    selectedCalendarUser.value = auth.user?.id;
  } finally {
    loading.value = false;
  }

  // Listen for tab/app focus to refresh data
  document.addEventListener('visibilitychange', refreshOnFocus);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', refreshOnFocus);
});

const isCoach = computed(() => groups.currentGroup?.myRole === "COACH");

const handleLog = async () => {
  if (!logWeight.value && !logNotes.value && uploadedPhotos.value.length === 0) return;

  if (logWeight.value) {
    const today = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const localDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const existingLogToday = groups.logs.find(l => l.logDate === localDate && l.weightLbs != null);
    if (existingLogToday) {
      alert("You have already logged a weight for today. Please edit your existing log or wait until tomorrow to log a new weight.");
      return;
    }
  }

  isSubmittingLog.value = true;
  try {
    const payload = {
      weightLbs: logWeight.value ? parseFloat(logWeight.value) : null,
      calories: logCalories.value ? parseInt(logCalories.value) : null,
      notes: logNotes.value || null,
      photoUrls: uploadedPhotos.value,
      pinned: logPinned.value,
    };

    await groups.createLog(groupId.value, payload);
    await groups.fetchLeaderboard(groupId.value);
    
    // Reset form
    logWeight.value = "";
    logCalories.value = "";
    logNotes.value = "";
    uploadedPhotos.value = [];
    logPinned.value = false;
  } catch (error) {
    console.error("Failed to submit log:", error);
    alert("Submission failed. Please check your connection and try again.");
  } finally {
    isSubmittingLog.value = false;
    groups.showLogModal = false;
  }
};

const handlePost = async () => {
  if (!postContent.value.trim() && uploadedPhotos.value.length === 0 && uploadedVideos.value.length === 0) return;
  
  isSubmittingPost.value = true;
  try {
    const payload = {
      content: postContent.value,
      postType: postType.value,
      photoUrls: [...uploadedPhotos.value],
      videoUrls: [...uploadedVideos.value]
    };

    await groups.createPost(groupId.value, payload);
    
    postContent.value = "";
    uploadedPhotos.value = [];
    uploadedVideos.value = [];
    postType.value = "ADVICE";
  } catch (error) {
    console.error("Failed to submit post:", error);
    alert(error.response?.data?.message || "Submission failed. Please check your connection and try again.");
  } finally {
    isSubmittingPost.value = false;
    if (groups.showLogModal) {
      groups.showLogModal = false;
    }
  }
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
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-lime hover:underline font-bold">${url}</a>`;
  });
};

const expandedComments = ref({});

const toggleComments = (type, id) => {
  const key = `${type}-${id}`;
  expandedComments.value[key] = !expandedComments.value[key];
};

const submitComment = async (type, id) => {
  const key = `${type}-${id}`;
  const content = commentText.value[key];
  if (!content?.trim()) return;

  if (type === 'post') {
    await groups.createPostComment(groupId.value, id, content);
  } else {
    await groups.createLogComment(groupId.value, id, content);
  }
  
  commentText.value[key] = "";
  expandedComments.value[key] = true;
};

const editingComment = ref(null);
const editCommentText = ref("");

const startEditComment = (comment) => {
  editingComment.value = comment.id;
  editCommentText.value = comment.content;
};

const cancelEditComment = () => {
  editingComment.value = null;
  editCommentText.value = "";
};

const saveEditComment = async (type, itemId, commentId) => {
  if (!editCommentText.value.trim()) return;
  if (type === 'post') {
    await groups.updatePostComment(groupId.value, itemId, commentId, editCommentText.value);
  } else {
    await groups.updateLogComment(groupId.value, itemId, commentId, editCommentText.value);
  }
  cancelEditComment();
};

const handleInvite = async () => {
  inviteError.value = "";
  try {
    inviteResult.value = await groups.createInvite(
      groupId.value,
      inviteEmail.value || "",
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
  editLogPinned.value = log.pinned || false
}

const cancelEditLog = () => {
  editingLog.value = null;
  uploadedPhotos.value = []; // Clear photos on cancel
  editLogPinned.value = false;
};

const saveEditLog = async (logId) => {
  await groups.updateLog(groupId.value, logId, {
    weightLbs: editLogWeight.value ? parseFloat(editLogWeight.value) : null,
    calories: editLogCalories.value ? parseInt(editLogCalories.value) : null,
    notes: editLogNotes.value || null,
    photoUrls: uploadedPhotos.value,
    pinned: editLogPinned.value
  })
  editingLog.value = null
  uploadedPhotos.value = []
  editLogPinned.value = false
}

const togglePin = async (log) => {
  await groups.updateLog(groupId.value, log.id, {
    weightLbs: log.weightLbs,
    calories: log.calories,
    notes: log.notes,
    photoUrls: log.photoUrls,
    pinned: !log.pinned
  });
  groups.logs = await groups.fetchLogs(groupId.value, auth.user?.id);
  await groups.fetchAllLogs(groupId.value);
}

// ── Post edit/delete ──
const startEditPost = (post) => {
  editingPost.value = post.id;
  editPostContent.value = post.content;
  editPostType.value = post.postType;
  editPostPhotos.value = [...(post.photoUrls || [])];
  editPostVideos.value = [...(post.videoUrls || [])];
};

const cancelEditPost = () => {
  editingPost.value = null;
  editPostPhotos.value = [];
  editPostVideos.value = [];
};

const saveEditPost = async (postId) => {
  if (!editPostContent.value.trim()) return;
  try {
    await groups.updatePost(groupId.value, postId, {
      content: editPostContent.value,
      postType: editPostType.value,
      photoUrls: editPostPhotos.value,
      videoUrls: editPostVideos.value,
    });
    editingPost.value = null;
    editPostPhotos.value = [];
    editPostVideos.value = [];
  } catch (error) {
    console.error("Failed to update post:", error);
    alert(
      error.response?.data?.message ||
        "Failed to update post. Please try again.",
    );
  }
};

// ── Delete confirmation ──
const requestDelete = (type, id, parentId = null, commentType = null) => {
  confirmDelete.value = { type, id, parentId, commentType };
};

const cancelDelete = () => {
  confirmDelete.value = null;
};

const executeDelete = async () => {
  if (!confirmDelete.value) return;
  const { type, id, parentId, commentType } = confirmDelete.value;
  if (type === "log") {
    await groups.deleteLog(groupId.value, id);
  } else if (type === "post") {
    await groups.deletePost(groupId.value, id);
  } else if (type === "comment") {
    if (commentType === 'post') {
      await groups.deletePostComment(groupId.value, parentId, id);
    } else {
      await groups.deleteLogComment(groupId.value, parentId, id);
    }
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
  let dateObj;
  if (Array.isArray(d)) {
    dateObj = new Date(d[0], d[1] - 1, d[2] || 1);
  } else if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, day] = d.split('-').map(Number);
    dateObj = new Date(y, m - 1, day);
  } else {
    dateObj = new Date(d);
  }
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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

const groupedFeed = computed(() => {
  const activeUserIds = new Set(groups.members.map(m => m.userId || m.user_id));

  const filterComments = (comments = []) => {
    return comments.filter(c => activeUserIds.has(c.authorId || c.author_id));
  };

  const parseDate = (d) => {
    if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    }
    return new Date(d);
  };

  const combined = [
    ...groups.posts
      .filter(p => activeUserIds.has(p.authorId || p.author_id))
      .map(p => ({ ...p, comments: filterComments(p.postComments), feedType: 'post', sortDate: parseDate(p.createdAt) })),
    ...(groups.allLogs || [])
      .filter(l => activeUserIds.has(l.userId || l.user_id))
      .map(l => ({ ...l, comments: filterComments(l.logComments), feedType: 'log', sortDate: parseDate(l.logDate) }))
  ];

  combined.sort((a, b) => b.sortDate - a.sortDate);

  const grouped = {};
  combined.forEach(item => {
    const d = item.sortDate;
    const dateKey = d.toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  });

  return Object.entries(grouped).map(([date, items]) => ({ date, items }));
});

// Robust local date parser — handles "2025-01-05" strings AND [2025,1,5] arrays from Java
const parseLocalDate = (d) => {
  if (!d) return null;
  if (Array.isArray(d)) {
    return new Date(d[0], d[1] - 1, d[2] || 1);
  }
  if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  const parsed = new Date(d);
  return isNaN(parsed) ? null : parsed;
};

const getTargetDueDate = (weekNumber) => {
  const d = parseLocalDate(groups.currentGroup?.startDate);
  if (!d) return null;
  d.setDate(d.getDate() + weekNumber * 7);
  return d;
};

const getTargetDate = (weekNumber) => {
  const d = getTargetDueDate(weekNumber);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getTargetStatus = (target) => {
  const dueDate = getTargetDueDate(target.weekNumber);
  if (!dueDate) return 'pending';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  // If due date hasn't passed yet, always pending — user still has time
  if (dueDate >= today) return 'pending';
  
  // Due date has passed — now judge the result
  if (target.actualWeight != null) {
    return target.actualWeight <= target.targetWeight ? 'met' : 'missed';
  }
  return 'missed';
};
</script>

<template>
  <div class="page group-detail-page">
    <input type="file" ref="fileInputPhoto" @change="e => handleMediaUpload(e, 'image')" accept="image/*" style="display: none" />
    <input type="file" ref="fileInputVideo" @change="e => handleMediaUpload(e, 'video')" accept="video/*" style="display: none" />
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
          
          <div class="group-overview-panel mt-6 animate-in bg-[#131313] border border-[rgba(255,255,255,0.05)] rounded-xl">
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
            <div class="panel-desc objective-wrapper">
              <div v-if="!editingObjective" class="objective-display">
                <p>{{ groups.currentGroup.description }}</p>
                <button v-if="isCoach" @click="startEditObjective" class="objective-edit-btn" title="Edit Objective">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
              </div>
              <div v-else class="objective-editor-wrap">
                <div class="objective-editor-label">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  Edit Group Objective
                </div>
                <div class="objective-editor-glass">
                  <textarea 
                    v-model="editObjectiveText" 
                    class="objective-textarea"
                    rows="3" 
                    placeholder="Inspire your group... what's the collective goal?"
                  ></textarea>
                  <div class="objective-editor-footer">
                    <button class="objective-btn-cancel" @click="editingObjective = false">
                      Cancel
                    </button>
                    <button class="objective-btn-save" @click="saveObjective">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Save
                    </button>
                  </div>
                </div>
              </div>
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
          <!-- CREATE POST FORM -->
          <div class="create-post-wrapper mb-10">
            <div class="create-post-gradient-border">
              <div class="create-post-inner">
                <div class="create-post-header">
                  <img v-if="auth.user?.avatarUrl" :src="auth.user?.avatarUrl" class="create-post-avatar" />
                  <div v-else class="create-post-avatar create-post-avatar-placeholder">{{ getInitials(auth.user?.displayName) }}</div>
                  <div class="create-post-user">
                    <span class="create-post-name">{{ auth.user?.displayName }}</span>
                    <span class="create-post-hint">Share an update with your team</span>
                  </div>
                </div>

                <div class="create-post-types">
                  <button v-for="type in ['ADVICE', 'MOTIVATION', 'ANNOUNCEMENT', 'MEMBER_POST']" :key="type"
                          class="type-pill" :class="[type.toLowerCase(), { active: postType === type }]"
                          @click="postType = type">
                    <svg v-if="type === 'ADVICE'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <svg v-if="type === 'MOTIVATION'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                    <svg v-if="type === 'ANNOUNCEMENT'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                    <svg v-if="type === 'MEMBER_POST'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {{ type.replace('_', ' ') }}
                  </button>
                </div>

                <div class="create-post-compose">
                  <textarea v-model="postContent" class="create-post-textarea" placeholder="What's on your mind?" rows="3"></textarea>
                </div>

                <!-- Media Previews -->
                <div v-if="uploadedPhotos.length > 0 || uploadedVideos.length > 0" class="create-post-media-preview">
                   <div v-for="(url, idx) in uploadedPhotos" :key="'p'+idx" class="media-thumb">
                      <img :src="url"/>
                      <button class="media-thumb-remove" @click="removePhoto(idx)">×</button>
                   </div>
                   <div v-for="(url, idx) in uploadedVideos" :key="'v'+idx" class="media-thumb media-thumb-video">
                      <video :src="url + '#t=0.001'" preload="metadata" playsinline></video>
                      <div class="media-thumb-play">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="m7 4 12 8-12 8V4z"/></svg>
                      </div>
                      <button class="media-thumb-remove" @click="removeVideo(idx)">×</button>
                   </div>
                </div>

                <!-- Footer: Upload + Send -->
                <div class="create-post-footer">
                  <div class="create-post-actions">
                     <button class="upload-action-btn" @click="openUploadWidget('image')" :disabled="isUploadingPhoto">
                       <svg v-if="!isUploadingPhoto" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                       <svg v-else class="btn-spinner text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18"><circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       <span>Photo</span>
                     </button>
                     <button class="upload-action-btn" @click="openUploadWidget('video')" :disabled="isUploadingVideo">
                       <svg v-if="!isUploadingVideo" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                       <svg v-else class="btn-spinner text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18"><circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       <span>Video</span>
                     </button>
                  </div>
                  <button class="create-post-submit" style="display: flex; align-items: center; justify-content: center; gap: 8px;" @click="handlePost" :disabled="!postContent.trim() && uploadedPhotos.length === 0 && uploadedVideos.length === 0 || isSubmittingPost">
                    <template v-if="!isSubmittingPost">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      Post
                    </template>
                    <template v-else>
                      <svg class="btn-spinner text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </template>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="groupedFeed.length > 0" class="absolute left-[19px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-[#DFFF00]/30 via-[rgba(255,255,255,0.05)] to-transparent pointer-events-none hidden sm:block"></div>
            <div v-if="groupedFeed.length === 0" class="empty-state">
            <p style="font-size:1.1rem;">No activity yet. Be the first to post!</p>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-top:6px;">Share updates, progress photos, or motivate your team.</p>
          </div>
          
          <div v-for="section in groupedFeed" :key="section.date" class="feed-section relative sm:pl-12 mb-10">
            <div class="feed-date-divider">
               <div class="feed-date-line"></div>
               <span class="feed-date-badge">{{ section.date }}</span>
               <div class="feed-date-line"></div>
            </div>

            <div v-for="item in section.items" :key="item.feedType + item.id" class="feed-item mb-10">
              <!-- COACH POSTS -->
              <template v-if="item.feedType === 'post'">
                <template v-if="editingPost === item.id">
                  <!-- EDIT POST — Premium Inline Editor -->
                  <div class="create-post-wrapper">
                    <div class="create-post-gradient-border" style="box-shadow: 0 0 40px rgba(223, 255, 0,0.15); border-left: 2px solid #DFFF00;">
                      <div class="create-post-inner">
                        <div class="create-post-header" style="justify-content: space-between;">
                          <div style="display: flex; gap: 12px; align-items: center;">
                            <img v-if="auth.user?.avatarUrl" :src="auth.user?.avatarUrl" class="create-post-avatar" />
                            <div v-else class="create-post-avatar create-post-avatar-placeholder">{{ getInitials(auth.user?.displayName) }}</div>
                            <div class="create-post-user">
                              <span class="create-post-name">{{ auth.user?.displayName }}</span>
                              <span class="create-post-hint" style="color: #DFFF00; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                Editing Post
                              </span>
                            </div>
                          </div>
                          <button class="action-btn-minimal" @click="cancelEditPost" title="Discard changes">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </div>

                        <div class="create-post-types">
                          <button v-for="type in ['ADVICE', 'MOTIVATION', 'ANNOUNCEMENT', 'MEMBER_POST']" :key="type"
                                  class="type-pill" :class="[type.toLowerCase(), { active: editPostType === type }]"
                                  @click="editPostType = type">
                            <svg v-if="type === 'ADVICE'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                            <svg v-if="type === 'MOTIVATION'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                            <svg v-if="type === 'ANNOUNCEMENT'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                            <svg v-if="type === 'MEMBER_POST'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            {{ type.replace('_', ' ') }}
                          </button>
                        </div>

                        <div class="create-post-compose" style="margin-bottom: 0;">
                          <textarea v-model="editPostContent" class="create-post-textarea" placeholder="What's on your mind?" rows="4"></textarea>
                        </div>

                        <div class="create-post-footer" style="justify-content: flex-end; margin-top: 16px;">
                          <div class="create-post-actions">
                            <button class="edit-post-discard" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); padding: 8px 16px; border-radius: 20px; font-weight: 700; cursor: pointer; transition: all 0.2s;" @click="cancelEditPost(item)" onmouseover="this.style.color='var(--accent-coral)'; this.style.borderColor='rgba(255,112,67,0.3)'; this.style.background='rgba(255,112,67,0.05)';" onmouseout="this.style.color='var(--text-secondary)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.background='transparent';">
                              Discard
                            </button>
                            <button class="create-post-submit" @click="saveEditPost(item.id)" :disabled="!editPostContent.trim()">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="post-card-premium">
                    <div class="feed-post-header">
                      <div class="feed-post-author">
                        <img v-if="item.authorAvatar" :src="item.authorAvatar" class="feed-avatar" />
                        <div v-else class="feed-avatar feed-avatar-placeholder">{{ getInitials(item.authorName) }}</div>
                        <div>
                          <h4 class="feed-author-name">{{ item.authorName }}</h4>
                          <span class="feed-timestamp">{{ formatDate(item.createdAt) }}</span>
                        </div>
                      </div>
                      <div class="feed-post-meta">
                        <span class="feed-type-badge" :class="item.postType.toLowerCase()">{{ item.postType.replace('_', ' ') }}</span>
                        <div v-if="item.authorId === auth.user?.id || isCoach" class="feed-post-actions">
                          <button v-if="item.authorId === auth.user?.id" class="action-btn-minimal" @click="startEditPost(item)" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" class="action-icon" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </button>
                          <button class="action-btn-minimal text-red" @click="requestDelete('post', item.id)" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" class="action-icon-danger" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="feed-post-content">
                      <p v-html="linkify(item.content)" class="feed-post-text"></p>
                      
                      <!-- Photo Gallery -->
                      <div v-if="item.photoUrls?.length > 0" class="feed-photo-grid" :class="{'single': item.photoUrls.length === 1, 'double': item.photoUrls.length === 2}">
                        <div v-for="(url, idx) in item.photoUrls" :key="idx" class="feed-photo-item" @click="openPreview(item.photoUrls, idx)">
                           <img :src="url" loading="lazy"/>
                           <div class="feed-photo-overlay"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
                        </div>
                      </div>
                      <!-- Video Gallery -->
                      <div v-if="item.videoUrls?.length > 0" class="feed-video-grid">
                        <div v-for="(url, idx) in item.videoUrls" :key="idx" class="feed-video-item">
                           <video :src="url + '#t=0.001'" controls preload="metadata" playsinline></video>
                        </div>
                      </div>
                    </div>

                    <!-- Comments -->
                    <div class="feed-comments-section">
                      <button v-if="item.comments?.length > 0" class="feed-comment-count" @click="toggleComments('post', item.id)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {{ expandedComments[`post-${item.id}`] ? 'Hide' : 'View' }} {{ item.comments.length }} comment{{ item.comments.length > 1 ? 's' : '' }}
                      </button>
                      <div v-if="item.comments?.length > 0 && expandedComments[`post-${item.id}`]" class="feed-comments-list">
                        <div v-for="comment in item.comments" :key="comment.id" class="feed-comment group">
                          <img v-if="comment.authorAvatar" :src="comment.authorAvatar" class="feed-comment-avatar" />
                          <div v-else class="feed-comment-avatar feed-avatar-placeholder">{{ getInitials(comment.authorName) }}</div>
                          <div v-if="editingComment === comment.id" class="feed-comment-body w-full">
                             <textarea v-model="editCommentText" class="form-input w-full p-2 text-sm max-h-[100px] mb-2 text-white bg-dark border-white/20" rows="2"></textarea>
                             <div class="flex gap-2 mt-1 justify-end">
                                <button class="btn btn-secondary btn-sm" @click="cancelEditComment">Cancel</button>
                                <button class="btn btn-primary btn-sm" @click="saveEditComment('post', item.id, comment.id)">Save</button>
                             </div>
                          </div>
                          <div v-else class="feed-comment-body">
                            <div class="feed-comment-meta">
                              <span class="feed-comment-name">{{ comment.authorName }}</span>
                              <span class="feed-comment-time">{{ timeAgo(comment.createdAt) }}</span>
                            </div>
                            <p class="feed-comment-text">{{ comment.content }}</p>
                          </div>
                          <div v-if="comment.authorId === auth.user?.id && editingComment !== comment.id" class="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            <button class="action-btn-minimal" @click="startEditComment(comment)" title="Edit comment">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </button>
                            <button class="action-btn-minimal text-red" @click="requestDelete('comment', comment.id, item.id, 'post')" title="Delete comment">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div class="feed-comment-input">
                        <textarea v-model="commentText[`post-${item.id}`]" 
                               placeholder="Write a comment..."
                               rows="1"
                               @input="(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }"></textarea>
                        <button :disabled="!commentText[`post-${item.id}`]?.trim()"
                                @click="submitComment('post', item.id); $event.currentTarget.previousElementSibling.style.height = 'auto'">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                      </div>
                    </div>
                </div>
              </template>


              <!-- MEMBER LOGS -->
              <template v-else>
                <div class="feed-log-card">
                  <div class="feed-log-left-accent"></div>
                  <div class="feed-log-body">
                    <div class="feed-post-header">
                      <div class="feed-post-author">
                        <img v-if="item.avatarUrl" :src="item.avatarUrl" class="feed-avatar" />
                        <div v-else class="feed-avatar feed-avatar-placeholder">{{ getInitials(item.displayName) }}</div>
                        <div>
                          <h4 class="feed-author-name">{{ item.displayName }}</h4>
                          <div class="feed-log-stats">
                            <span v-if="item.weightLbs" class="feed-log-pill weight">⚖️ {{ item.weightLbs }} lbs</span>
                            <span v-if="item.calories" class="feed-log-pill energy">🔥 {{ item.calories }} cal</span>
                          </div>
                        </div>
                      </div>
                      <div class="feed-post-meta">
                        <span class="feed-type-badge log">Daily Log</span>
                        <div v-if="item.userId === auth.user?.id" class="feed-post-actions">
                           <button class="action-btn-minimal" @click="activeTab = 'progress'; startEditLog(item)" title="Edit">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" class="action-icon" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                           </button>
                        </div>
                      </div>
                    </div>
                    
                    <div class="feed-post-content">
                      <div v-if="item.photoUrls?.length > 0" class="feed-photo-grid" :class="{'single': item.photoUrls.length === 1, 'double': item.photoUrls.length === 2}">
                        <div v-for="(url, idx) in item.photoUrls" :key="idx" class="feed-photo-item" @click="openPreview(item.photoUrls, idx)">
                           <img :src="url" loading="lazy"/>
                           <div class="feed-photo-overlay"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
                        </div>
                      </div>
                      
                      <p v-if="item.notes" class="feed-log-note" v-html="linkify(item.notes)"></p>
                    </div>

                    <!-- Log Comments -->
                    <div class="feed-comments-section">
                      <button v-if="item.comments?.length > 0" class="feed-comment-count" @click="toggleComments('log', item.id)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {{ expandedComments[`log-${item.id}`] ? 'Hide' : 'View' }} {{ item.comments.length }} comment{{ item.comments.length > 1 ? 's' : '' }}
                      </button>
                      <div v-if="item.comments?.length > 0 && expandedComments[`log-${item.id}`]" class="feed-comments-list">
                        <div v-for="comment in item.comments" :key="comment.id" class="feed-comment group">
                          <img v-if="comment.authorAvatar" :src="comment.authorAvatar" class="feed-comment-avatar" />
                          <div v-else class="feed-comment-avatar feed-avatar-placeholder">{{ getInitials(comment.authorName) }}</div>
                          <div v-if="editingComment === comment.id" class="feed-comment-body w-full">
                             <textarea v-model="editCommentText" class="form-input w-full p-2 text-sm max-h-[100px] mb-2 text-white bg-dark border-white/20" rows="2"></textarea>
                             <div class="flex gap-2 mt-1 justify-end">
                                <button class="btn btn-secondary btn-sm" @click="cancelEditComment">Cancel</button>
                                <button class="btn btn-primary btn-sm" @click="saveEditComment('log', item.id, comment.id)">Save</button>
                             </div>
                          </div>
                          <div v-else class="feed-comment-body">
                            <div class="feed-comment-meta">
                              <span class="feed-comment-name">{{ comment.authorName }}</span>
                              <span class="feed-comment-time">{{ timeAgo(comment.createdAt) }}</span>
                            </div>
                            <p class="feed-comment-text">{{ comment.content }}</p>
                          </div>
                          <div v-if="comment.authorId === auth.user?.id && editingComment !== comment.id" class="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            <button class="action-btn-minimal" @click="startEditComment(comment)" title="Edit comment">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </button>
                            <button class="action-btn-minimal text-red" @click="requestDelete('comment', comment.id, item.id, 'log')" title="Delete comment">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div class="feed-comment-input">
                        <textarea v-model="commentText[`log-${item.id}`]" 
                               placeholder="Write a comment..."
                               rows="1"
                               @input="(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }"></textarea>
                        <button :disabled="!commentText[`log-${item.id}`]?.trim()"
                                @click="submitComment('log', item.id); $event.currentTarget.previousElementSibling.style.height = 'auto'">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- ═══════════════ LEADERBOARD TAB ═══════════════ -->
        <div v-if="activeTab === 'leaderboard'" class="tab-content animate-in">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold font-heading text-white">My Progress & Rankings</h2>
          </div>

          <div class="leaderboard-list mt-2">
            <div v-for="entry in groups.leaderboard" :key="entry.userId" class="leaderboard-row " :class="{ 'self-row': entry.userId === auth.user?.id }">
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
                      <path class="circle" :style="{ strokeDasharray: Math.min(100, Math.max(0, entry.progressPercent || 0)) + ', 100' }" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    </svg>
                    <span class="lb-progress-val">{{ Math.round(entry.progressPercent || 0) }}%</span>
                 </div>
                 <button v-if="entry.userId !== auth.user?.id" class="btn-profile-peek" @click="viewMemberLogs(entry)">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                 </button>
              </div>
            </div>
          </div>
          
          <div class="mt-10">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-bold font-heading text-white">Activity Calendar</h2>
              
              <div class="calendar-user-select relative">
                <select v-model="selectedCalendarUser" class="form-input bg-dark border-white/10 py-1.5 pl-3 pr-8 rounded-lg text-sm font-bold min-w-[160px] text-white appearance-none cursor-pointer focus:border-lime focus:ring-1 focus:ring-lime/50">
                  <option v-for="member in groups.members" :key="member.userId" :value="member.userId">
                    {{ member.displayName }} {{ member.userId === auth.user?.id ? '(Me)' : '' }}
                  </option>
                </select>
              </div>
            </div>
            
            <LeaderboardCalendar 
              :logs="calendarLogs" 
              :targets="calendarTargets" 
              :groupStartDate="groups.currentGroup.startDate"
            />
          </div>
        </div>

        <!-- ═══════════════ MY PROGRESS TAB ═══════════════ -->
        <div v-if="activeTab === 'progress'" class="tab-content animate-in">
          <div class="progress-section-header">
             <h2>Weekly Targets</h2>
             <span class="text-secondary">{{ groups.targets.length }} milestones</span>
          </div>
          
          <div class="targets-scroll mt-4">
            <div v-for="target in groups.targets" :key="target.id" 
                 class="target-card-premium " 
                 :class="{ 
                   'current-week': target.actualWeight,
                   'target-status-met': getTargetStatus(target) === 'met',
                   'target-status-missed': getTargetStatus(target) === 'missed'
                 }">
              <div class="target-card-top">
                <span class="target-week-badge">Week {{ target.weekNumber }}</span>
                <span v-if="target.coachOverride" class="coach-label">Coach Set</span>
                <span class="target-status-pill" :class="getTargetStatus(target)">
                  <template v-if="getTargetStatus(target) === 'met'">✓ Met</template>
                  <template v-else-if="getTargetStatus(target) === 'missed'">✗ Missed</template>
                  <template v-else>Pending</template>
                </span>
              </div>
              <div class="target-due-date">Due {{ getTargetDate(target.weekNumber) }}</div>
              <div class="target-weight-val">{{ target.targetWeight }} <span>lbs</span></div>
              <div class="target-actual-info" :class="{ 'not-logged': !target.actualWeight }">
                <span v-if="target.actualWeight">Achieved: {{ target.actualWeight }} lbs</span>
                <span v-else>Pending log</span>
              </div>
            </div>
          </div>

          <div class="progress-section-header mt-8">
             <h2>Training Logs</h2>
             <button class="btn btn-primary btn-sm" @click="groups.logModalMode = 'log'; groups.showLogModal = true">+ New Log</button>
          </div>
          
          <div v-if="groups.logs.length === 0" class="empty-state">
            <p>No activity recorded yet.</p>
          </div>
          
          <div v-for="log in groups.logs" :key="log.id" class="training-log-card ">
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
                    <button v-if="uploadedPhotos.length < 5" class="add-photo-block" @click="openUploadWidget()" :disabled="isUploadingPhoto">
                      <span v-if="!isUploadingPhoto">+</span>
                      <svg v-else class="btn-spinner text-current mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18"><circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </button>
                  </div>
                </div>
                <div class="flex items-center gap-2 mt-4">
                  <input type="checkbox" :id="'pinEdit' + log.id" v-model="editLogPinned" class="form-checkbox h-4 w-4 text-lime cursor-pointer bg-dark border-white/20 rounded">
                  <label :for="'pinEdit' + log.id" class="cursor-pointer text-sm text-white select-none">Pin this post</label>
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
                  <span v-if="log.pinned" class="log-pill pinned ml-2 bg-lime/20 text-lime border border-lime/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="mr-1"><path d="M16 11V6a4 4 0 0 0-8 0v5l-3 4v2h7v6l1 1 1-1v-6h7v-2l-3-4z"/></svg> Pinned
                  </span>
                  <div class="log-stats-inline">
                    <span v-if="log.weightLbs" class="log-pill weight"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block mr-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> {{ log.weightLbs }}</span>
                    <span v-if="log.calories" class="log-pill energy"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block mr-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> {{ log.calories }}</span>
                  </div>
                </div>
                <div class="log-actions-menu">
                   <button class="action-btn-minimal" @click="togglePin(log)" :title="log.pinned ? 'Unpin Post' : 'Pin Post'">
                     <svg v-if="log.pinned" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="action-icon text-lime" stroke="currentColor" stroke-width="2"><path d="m3 14 4-1-1 4"/><path d="m14 3 1 4 4-1"/><path d="m10.5 13.5 6-6"/><path d="M22 2l-7 7"/><path d="m7 5 3.5 3.5 5.5-.5 2 2"/><path d="m19 17-2-2-.5-5.5-3.5-3.5"/></svg>
                     <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="action-icon" stroke="currentColor" stroke-width="2"><path d="M16 11V6a4 4 0 0 0-8 0v5l-3 4v2h7v6l1 1 1-1v-6h7v-2l-3-4z"/></svg>
                   </button>
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

          <div class="progress-section-header mt-8">
             <h2>Team Management</h2>
             <span class="text-lime">{{ groups.members.length }} Athletes</span>
          </div>

          <div class="member-manage-list mt-4 grid gap-4">
            <div v-for="member in groups.members" :key="member.userId" class="member-manage-card  flex items-center justify-between p-4">
               <div class="flex items-center gap-4">
                  <img v-if="member.avatarUrl" :src="member.avatarUrl" class="avatar avatar-md object-cover" />
                  <div v-else class="avatar avatar-md avatar-placeholder">{{ getInitials(member.displayName) }}</div>
                  <div>
                     <h4 class="font-bold text-lg leading-tight">{{ member.displayName }}</h4>
                     <div class="text-sm mt-1">
                        <span class="badge" :class="member.role === 'COACH' ? 'badge-amber' : 'badge-teal'">{{ member.role }}</span>
                     </div>
                  </div>
               </div>
               
               <div class="flex items-center gap-4 sm:gap-6">
                 <div class="text-right">
                   <div class="text-xs text-muted uppercase tracking-wider font-bold">Goal</div>
                   <div class="font-heading font-bold text-sm sm:text-lg text-secondary">{{ member.startWeight }} → <span class="text-lime">{{ member.goalWeight }}</span></div>
                 </div>
                 <div class="member-radial-progress relative w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 36 36" class="circular-chart-xs absolute inset-0 w-full h-full drop-shadow-lg">
                       <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                       <path class="circle" :style="{ strokeDasharray: Math.min(100, Math.max(0, groups.leaderboard.find(l => l.userId === member.userId)?.progressPercent || 0)) + ', 100' }" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    </svg>
                    <div class="lb-progress-val" style="z-index: 10;">{{ Math.round(groups.leaderboard.find(l => l.userId === member.userId)?.progressPercent || 0) }}%</div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════ SETTINGS TAB ═══════════════ -->
        <div v-if="activeTab === 'settings'" class="tab-content animate-in">
          <div class="settings-group ">
            <h3>Invite Teammates</h3>
            <p class="text-secondary text-sm mb-4">Grow your squad and boost motivation by generating a shareable link.</p>
            <div>
              <button class="btn btn-primary" @click="handleInvite">Generate Invite Link</button>
            </div>
            
            <div v-if="inviteError" class="error-msg-inline mt-4">{{ inviteError }}</div>
            
            <div v-if="inviteResult" class="invite-success-box mt-4">
              <span class="text-lime block mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="inline-block mr-1 text-lime" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Shareable link generated:</span>
              <div class="flex gap-2">
                <code class="invite-code flex-grow">{{ inviteLink }}</code>
                <button class="btn btn-secondary btn-sm" @click="copyInvite">Copy</button>
              </div>
            </div>
          </div>

          <div class="settings-group  mt-6">
            <h3>Group Members</h3>
            <div class="member-manage-list mt-4 grid gap-3">
              <div v-for="member in groups.members" :key="member.userId" class="member-manage-card flex items-center justify-between p-3 bg-dark/30 rounded-lg">
                 <div class="flex items-center gap-3">
                    <img v-if="member.avatarUrl" :src="member.avatarUrl" class="avatar avatar-sm object-cover" />
                    <div v-else class="avatar avatar-sm avatar-placeholder">{{ getInitials(member.displayName) }}</div>
                    <div>
                       <h4 class="font-bold leading-tight">{{ member.displayName }}</h4>
                       <span class="badge" :class="member.role === 'COACH' ? 'badge-amber' : 'badge-teal'" style="font-size: 0.65rem; padding: 0.1rem 0.4rem;">{{ member.role }}</span>
                    </div>
                 </div>
                 <div v-if="isCoach && member.userId !== auth.user?.id">
                   <button class="btn btn-secondary btn-sm text-coral border-coral/30 hover:bg-coral hover:text-white" @click="groups.removeMember(groupId, member.userId)">Kick</button>
                 </div>
              </div>
            </div>
          </div>

          <div class="settings-group  mt-6">
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
        <div v-if="groups.showLogModal" class="modal-backdrop-blur" @click.self="groups.showLogModal = false">
          <!-- NOTE/POST MODE -->
          <div v-if="groups.logModalMode === 'note'" class="create-post-wrapper animate-scale" style="margin: auto; width: 100%; max-width: 500px; margin-bottom: 0;">
            <div class="create-post-gradient-border">
              <div class="create-post-inner" style="padding: 24px;">
                <div class="create-post-header" style="justify-content: center; margin-bottom: 20px;">
                  <h2 class="modal-headline" style="margin-bottom: 0;">ADD POST</h2>
                </div>

                <!-- Post Type Pills -->
                <div class="create-post-types">
                  <button v-for="type in ['ADVICE', 'MOTIVATION', 'ANNOUNCEMENT', 'MEMBER_POST']" :key="type"
                          class="type-pill" :class="[type.toLowerCase(), { active: postType === type }]"
                          @click="postType = type">
                    <svg v-if="type === 'ADVICE'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <svg v-if="type === 'MOTIVATION'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                    <svg v-if="type === 'ANNOUNCEMENT'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                    <svg v-if="type === 'MEMBER_POST'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {{ type.replace('_', ' ') }}
                  </button>
                </div>

                <!-- Textarea -->
                <div class="create-post-compose">
                  <textarea v-model="postContent" class="create-post-textarea" rows="3" placeholder="What's on your mind?"></textarea>
                </div>

                <!-- Media Previews -->
                <div v-if="uploadedPhotos.length > 0 || uploadedVideos.length > 0" class="create-post-media-preview">
                   <div v-for="(url, idx) in uploadedPhotos" :key="'p'+idx" class="media-thumb">
                      <img :src="url"/>
                      <button class="media-thumb-remove" @click="removePhoto(idx)">×</button>
                   </div>
                   <div v-for="(url, idx) in uploadedVideos" :key="'v'+idx" class="media-thumb media-thumb-video">
                      <video :src="url + '#t=0.001'" preload="metadata" playsinline></video>
                      <div class="media-thumb-play">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="m7 4 12 8-12 8V4z"/></svg>
                      </div>
                      <button class="media-thumb-remove" @click="removeVideo(idx)">×</button>
                   </div>
                </div>


                <!-- Footer -->
                <div class="create-post-footer">
                  <div class="create-post-actions">
                     <button class="upload-action-btn" @click="openUploadWidget('image')" :disabled="isUploadingPhoto">
                       <svg v-if="!isUploadingPhoto" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                       <svg v-else class="btn-spinner text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18"><circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       <span>Photo</span>
                     </button>
                     <button class="upload-action-btn" @click="openUploadWidget('video')" :disabled="isUploadingVideo">
                       <svg v-if="!isUploadingVideo" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                       <svg v-else class="btn-spinner text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18"><circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       <span>Video</span>
                     </button>
                  </div>
                </div>
                <div class="modal-footer-btns" style="margin-top: 16px;">
                  <button class="btn btn-secondary w-full" @click="groups.showLogModal = false">Discard</button>
                  <button class="create-post-submit w-full" style="border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;" @click="handlePost" :disabled="!postContent.trim() && uploadedPhotos.length === 0 && uploadedVideos.length === 0 || isSubmittingPost">
                    <template v-if="!isSubmittingPost">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      Save Post
                    </template>
                    <template v-else>
                      <svg class="btn-spinner text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </template>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- LOG ACTIVITY MODE -->
          <div v-else class="modal-premium  animate-scale">
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
                <button v-if="uploadedPhotos.length < 5" class="p-add-trigger" @click="openUploadWidget()" :disabled="isUploadingPhoto">
                  <svg v-if="!isUploadingPhoto" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                  <svg v-else class="btn-spinner text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="24" height="24"><circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>{{ isUploadingPhoto ? 'Uploading...' : 'Add Photo' }}</span>
                </button>
              </div>
            </div>

            <div class="modal-footer-btns mt-8">
              <button class="btn btn-secondary w-full" @click="groups.showLogModal = false">Discard</button>
              <button class="btn btn-primary w-full" style="display: flex; align-items: center; justify-content: center; gap: 8px;" @click="handleLog" :disabled="!logWeight || isSubmittingLog">
                <template v-if="!isSubmittingLog">
                  Confirm Log
                </template>
                <template v-else>
                  <svg class="btn-spinner text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging...
                </template>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ═══════════════ DELETE CONFIRM MODAL ═══════════════ -->
      <Teleport to="body">
        <div v-if="confirmDelete" class="modal-backdrop-blur" @click.self="cancelDelete">
          <div class="modal-premium  confirm-alert animate-scale">
            <div class="alert-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" class="inline-block text-coral mb-2" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <h3 v-if="confirmDelete.type === 'comment'">DELETE COMMENT?</h3>
            <h3 v-else>REMOVE ENTRY?</h3>
            <p v-if="confirmDelete.type === 'comment'">Are you sure you want to delete this comment? This action is final.</p>
            <p v-else>This action is final and cannot be reverted.</p>
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
          <div class="modal-premium  confirm-alert animate-scale">
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
      <MemberLogsModal v-if="showMemberLogsModal" :member="selectedMember" :logs="memberLogs" @close="showMemberLogsModal = false" @preview-photo="({ urls, index }) => openPreview(urls, index)" @goal-weight-updated="handleGoalWeightUpdated" />
    </div>
  </div>
</template>


<style scoped>
/* ═══════ GROUP DETAIL PAGE — COMPLETE REDESIGN ═══════ */

.group-detail-page {
  background: #0e0e0e;
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
  background: radial-gradient(ellipse at top, rgba(223, 255, 0,0.12) 0%, rgba(179,153,255,0.06) 40%, transparent 70%);
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
  background: rgba(223, 255, 0,0.1);
  border-color: #DFFF00;
  color: #DFFF00;
  transform: translateX(-3px);
}

.page-title {
  font-size: clamp(1.6rem, 5vw, 2.8rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, #fff 30%, #DFFF00);
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
.ov-value { font-size: 1.6rem; font-weight: 900; font-family: \'Space Grotesk\', sans-serif; letter-spacing: -0.02em; }
.text-lime { color: #DFFF00; text-shadow: 0 0 8px rgba(223, 255, 0,0.25); }
.text-coral { color: var(--accent-coral); text-shadow: 0 0 8px rgba(255,112,67,0.25); }

.panel-desc {
  padding: 18px 24px;
  color: var(--text-secondary);
  line-height: 1.7;
  text-align: center;
  font-size: 0.95rem;
}

/* ── OBJECTIVE EDITING ── */
.objective-wrapper {
  position: relative;
}

.objective-display {
  position: relative;
  width: 100%;
}

.objective-edit-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  opacity: 0;
  padding: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.35);
  border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(12px);
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
}

.objective-display:hover .objective-edit-btn {
  opacity: 1;
}

.objective-edit-btn:hover {
  background: rgba(223, 255, 0,0.15);
  color: #DFFF00;
  border-color: rgba(223, 255, 0,0.3);
  box-shadow: 0 0 20px rgba(223, 255, 0,0.15);
  transform: scale(1.1);
}

.objective-editor-wrap {
  width: 100%;
  animation: editorSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes editorSlideIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.objective-editor-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #DFFF00;
  margin-bottom: 12px;
  text-align: left;
}

.objective-editor-glass {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(20px);
  box-shadow:
    0 8px 32px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.04);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.objective-editor-glass:focus-within {
  border-color: rgba(223, 255, 0,0.35);
  box-shadow:
    0 8px 32px rgba(0,0,0,0.4),
    0 0 30px rgba(223, 255, 0,0.08),
    inset 0 1px 0 rgba(255,255,255,0.04);
}

.objective-textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.9);
  resize: none;
  padding: 20px 20px 56px;
  font-size: 0.95rem;
  line-height: 1.7;
  letter-spacing: 0.015em;
  font-family: inherit;
  outline: none;
}

.objective-textarea::placeholder {
  color: rgba(255,255,255,0.2);
  font-style: italic;
}

.objective-editor-footer {
  position: absolute;
  bottom: 12px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.objective-btn-cancel {
  padding: 6px 16px;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.45);
  border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.03em;
}

.objective-btn-cancel:hover {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
  border-color: rgba(255,255,255,0.15);
}

.objective-btn-save {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 20px;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 8px;
  background: #DFFF00;
  color: #111;
  border: none;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.03em;
  box-shadow: 0 4px 18px rgba(223, 255, 0,0.25);
}

.objective-btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(223, 255, 0,0.35);
  filter: brightness(1.05);
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
  font-family: \'Space Grotesk\', sans-serif;
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
  background: linear-gradient(135deg, rgba(223, 255, 0,0.15), rgba(223, 255, 0,0.05));
  color: #DFFF00;
  border-color: rgba(223, 255, 0,0.4);
  box-shadow: 0 0 16px rgba(223, 255, 0,0.1);
}

/* ── TAB CONTENT ── */
.tab-content { display: flex; flex-direction: column; gap: 16px; padding-bottom: 80px; }

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

.feed-item{
  margin-bottom: 16px;
}
.post-card-premium::before {
  content: '';
  position: absolute; top: 0; left: 0;
  width: 3px; height: 0%;
  background: #DFFF00;
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
.post-type-tag.advice { background: rgba(223, 255, 0,0.1); color: #DFFF00; }
.post-type-tag.announcement { background: rgba(179,153,255,0.1); color: var(--accent-purple); }

.post-actions-menu { display: flex; gap: 4px; flex-shrink: 0; }
.post-body { color: var(--text-secondary); line-height: 1.7; font-size: 0.95rem; }

/* ── FEED ENHANCEMENTS ── */
.feed-section { position: relative; }
.date-header-premium {
  display: flex; align-items: center; gap: 16px; position: sticky; top: 0;
  background: #0e0e0e; z-index: 20; padding: 12px 0;
  margin-top: -12px; /* Offset padding to align with flow */
}
.date-text {
  font-family: \'Space Grotesk\', sans-serif; font-weight: 900; font-size: 0.9rem;
  text-transform: uppercase; letter-spacing: 0.15em; color: #DFFF00;
  white-space: nowrap;
}
.date-line { height: 1px; flex-grow: 1; background: linear-gradient(90deg, rgba(223, 255, 0,0.2), transparent); }

.log-author-info { display: flex; align-items: center; gap: 12px; }

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
  border-color: rgba(223, 255, 0,0.3);
  background: linear-gradient(90deg, rgba(223, 255, 0,0.06), transparent);
  box-shadow: 0 0 20px rgba(223, 255, 0,0.08);
}

.lb-rank-col { width: 40px; display: flex; justify-content: center; flex-shrink: 0; }
.lb-medal { font-size: 1.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }
.lb-rank-num { font-size: 1.2rem; font-weight: 900; color: rgba(255,255,255,0.15); font-family: \'Space Grotesk\', sans-serif; }

.lb-member-col { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.lb-member-details { min-width: 0; }
.member-name { font-weight: 700; font-size: 1rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.member-stats-mini { display: flex; gap: 12px; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
.lb-change-text.good { color: #DFFF00; }
.lb-change-text.bad { color: var(--accent-coral); }

.lb-progress-col { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.lb-progress-ring { width: 48px; height: 48px; position: relative; }

.circular-chart-sm { width: 100%; height: 100%; }
.circle-bg { fill: none; stroke: rgba(255,255,255,0.04); stroke-width: 3; }
.circle { fill: none; stroke: #DFFF00; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 0.8s ease-out; }

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
.btn-profile-peek:hover { background: #DFFF00; color: #000; transform: scale(1.08); }

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
  border-color: rgba(223, 255, 0,0.4);
  background: linear-gradient(135deg, rgba(223, 255, 0,0.06), transparent);
  box-shadow: 0 4px 20px rgba(223, 255, 0,0.08);
}

.target-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.target-week-badge { font-size: 0.7rem; font-weight: 800; color: #DFFF00; text-transform: uppercase; letter-spacing: 0.1em; }
.coach-label {
  font-size: 0.6rem; background: var(--accent-purple); color: #000;
  padding: 3px 7px; border-radius: 6px; font-weight: 800; text-transform: uppercase;
}
.target-due-date {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 10px;
  letter-spacing: 0.02em;
}
.target-weight-val { font-size: 2rem; font-weight: 900; font-family: \'Space Grotesk\', sans-serif; color: #fff; letter-spacing: -0.02em; }
.target-weight-val span { font-size: 0.85rem; opacity: 0.4; font-weight: 600; }

.target-actual-info { margin-top: 10px; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
.target-actual-info::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #DFFF00; box-shadow: 0 0 6px #DFFF00; }
.target-actual-info.not-logged::before { background: rgba(255,255,255,0.15); box-shadow: none; }
.target-actual-info.not-logged { color: var(--text-muted); font-style: italic; }

/* ── Target Status Highlighting ── */
.target-card-premium.target-status-met {
  border-color: rgba(34, 197, 94, 0.4);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), transparent);
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.08);
}
.target-card-premium.target-status-missed {
  border-color: rgba(239, 68, 68, 0.4);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), transparent);
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.08);
}

.target-status-pill {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 6px;
  margin-left: auto;
}
.target-status-pill.met {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
}
.target-status-pill.missed {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}
.target-status-pill.pending {
  color: #8b92a5;
  background: rgba(255,255,255,0.05);
}

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
.log-pill.weight { color: #DFFF00; border: 1px solid rgba(223, 255, 0,0.15); }
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
.form-input{
  background:#080808;
}
option{
  font-weight: 700;
}

.calendar-user-select{
  margin-bottom: 10px;
}

/* ── ACTIONS ── */
.action-btn-minimal {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer; padding: 8px; border-radius: 10px;
  transition: all 0.25s ease; color: var(--text-muted);
  display: inline-flex; align-items: center; justify-content: center;
}
.action-btn-minimal:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.15); }
.action-btn-minimal:hover .action-icon { stroke: #DFFF00; }
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
.font-heading { font-family: \'Space Grotesk\', sans-serif; }
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
.add-photo-block:hover { border-color: #DFFF00; color: #DFFF00; }

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
  font-family: \'Space Grotesk\', sans-serif; font-weight: 700;
  color: var(--text-secondary);
}
.custom-radio:hover { background: rgba(255,255,255,0.08); color: #fff; }
.custom-radio.active {
  background: rgba(223, 255, 0,0.08);
  border-color: rgba(223, 255, 0,0.4);
  color: #DFFF00;
  box-shadow: 0 0 12px rgba(223, 255, 0,0.1);
}

.btn-post-send {
  position: absolute; right: 12px; bottom: 12px;
  width: 42px; height: 42px;
  background: var(--gradient-lime); border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #000; border: none; cursor: pointer;
  transition: all 0.25s; box-shadow: 0 4px 12px rgba(223, 255, 0,0.25);
}
.btn-post-send:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(223, 255, 0,0.4); }
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
  background: rgba(223, 255, 0,0.04);
  border: 1px solid rgba(223, 255, 0,0.15);
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
  box-shadow: 0 8px 28px rgba(223, 255, 0,0.35);
  border: none; cursor: pointer; z-index: 100;
  transition: all 0.3s ease;
}
.fab-btn-premium:hover { transform: translateY(-3px) rotate(90deg); box-shadow: 0 12px 36px rgba(223, 255, 0,0.5); }
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
  border: 2px solid #DFFF00; box-shadow: 0 2px 10px rgba(223, 255, 0,0.15);
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
.p-add-trigger:hover { border-color: #DFFF00; color: #DFFF00; background: rgba(223, 255, 0,0.04); }

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

/* ── POST CREATION ── */
.post-create-card { padding: 24px; border: 1px solid rgba(255,255,255,0.08); }
.post-create-card:hover { transform: none; background: rgba(255,255,255,0.04); }

/* ── MULTIMEDIA ── */
.video-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.video-item { aspect-ratio: 16/9; position: relative; }
.video-item video { width: 100%; height: 100%; }

/* ── COMMENTS REFRESH ── */
.feed-comments-section {
  margin-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 16px;
}
.feed-comment-count {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.85rem; font-weight: 700; color: var(--text-muted);
  cursor: pointer; background: transparent; border: none; padding: 6px 12px;
  border-radius: 10px; transition: all 0.2s ease; margin-left: -8px;
}
.feed-comment-count:hover { color: #DFFF00; background: rgba(223, 255, 0,0.08); }

.feed-comments-list {
  display: flex; flex-direction: column; gap: 14px; margin-top: 16px;
}

.feed-comment {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 16px; border-radius: 16px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);
  transition: all 0.3s ease; position: relative;
}
.feed-comment:hover {
  background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08);
}

.feed-comment-avatar {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;
  object-fit: cover;
}

.feed-comment-body {
  flex: 1; min-width: 0;
}

.feed-comment-meta {
  display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap;
}
.feed-comment-name {
  font-size: 0.9rem; font-weight: 800; color: #fff; line-height: 1.2; font-family: \'Space Grotesk\', sans-serif;
}
.feed-comment-time {
  font-size: 0.75rem; color: var(--text-muted); font-weight: 600;
}
.feed-comment-text {
  font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; word-wrap: break-word;
}

.feed-comment-input {
  display: flex; align-items: flex-end; gap: 12px; margin-top: 20px;
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px; padding: 12px 16px; transition: all 0.3s ease;
  box-shadow: inset 0 4px 10px rgba(0,0,0,0.2);
}
.feed-comment-input:focus-within {
  border-color: rgba(223, 255, 0,0.3); background: rgba(0,0,0,0.4);
  box-shadow: inset 0 4px 10px rgba(0,0,0,0.2), 0 0 0 1px rgba(223, 255, 0,0.2);
}
.feed-comment-input textarea {
  flex: 1; background: transparent; border: none; color: #fff; font-size: 0.95rem;
  resize: none; outline: none; line-height: 1.5; max-height: 120px; padding: 4px 0;
}
.feed-comment-input textarea::placeholder { color: var(--text-muted); font-style: italic; }
.feed-comment-input button {
  width: 40px; height: 40px; border-radius: 14px; background: #DFFF00; color: #000;
  display: flex; align-items: center; justify-content: center; border: none; cursor: pointer;
  flex-shrink: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 14px rgba(223, 255, 0,0.25);
}
.feed-comment-input button:disabled { opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); }
.feed-comment-input button:not(:disabled):hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 6px 20px rgba(223, 255, 0,0.4); }

/* Edit comment state inline styling */
.feed-comment .form-input {
  border-radius: 12px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.3); border: 1px solid rgba(223, 255, 0,0.2); background: rgba(0,0,0,0.4);
}
.feed-comment .form-input:focus {
  border-color: #DFFF00; outline: none; box-shadow: inset 0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px rgba(223, 255, 0,0.2);
}

@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(8px); } 
  to { opacity: 1; transform: translateY(0); } 
}
.feed-comment { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

/* ── FEED DATE DIVIDER ── */
.feed-date-divider {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  margin: 32px 0 24px; opacity: 0.9;
}
.feed-date-line {
  flex-grow: 1; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
}
.feed-date-badge {
  font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em;
  color: var(--text-muted); padding: 4px 16px;
  border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.4); backdrop-filter: blur(10px);
}

/* ── CREATE POST COMPOSE CARD ── */
.create-post-wrapper {
  position: relative; border-radius: 24px; margin-bottom: 40px;
}
.create-post-gradient-border {
  padding: 1px; border-radius: 24px;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.05) 100%);
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}
.create-post-inner {
  background: rgba(15, 15, 15, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-radius: 23px; padding: 20px;
}
.create-post-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
}
.create-post-avatar {
  width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
  border: 1px solid rgba(255,255,255,0.1);
}
.create-post-avatar-placeholder {
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-slate); color: #fff; font-weight: 800;
}
.create-post-user { display: flex; flex-direction: column; }
.create-post-name { font-weight: 700; color: #fff; font-size: 1rem; }
.create-post-hint { font-size: 0.8rem; color: var(--text-muted); }

.create-post-types {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.type-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-secondary); cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.type-pill:hover { background: rgba(255,255,255,0.08); color: #fff; }
.type-pill.active { background: white; color: black; border-color: white; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,255,255,0.1); }

/* Theme colors for active type pills */
.type-pill.advice.active { background: #60A5FA; color: black; border-color: #60A5FA; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }
.type-pill.motivation.active { background: var(--accent-coral); color: white; border-color: var(--accent-coral); box-shadow: 0 4px 12px rgba(255, 112, 67, 0.2); }
.type-pill.announcement.active { background: #C084FC; color: white; border-color: #C084FC; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.2); }
.type-pill.member_post.active { background: #DFFF00; color: black; border-color: #DFFF00; box-shadow: 0 4px 12px rgba(223, 255, 0, 0.2); }

.create-post-compose { margin-bottom: 16px; }
.create-post-textarea {
  width: 100%; background: transparent; border: none; color: #fff;
  font-size: 1.1rem; resize: none; line-height: 1.5; padding: 0;
}
.create-post-textarea:focus { outline: none; }
.create-post-textarea::placeholder { color: rgba(255,255,255,0.2); }

.create-post-media-preview {
  display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;
}
.media-thumb {
  position: relative; width: 80px; height: 80px; border-radius: 12px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
}
.media-thumb img, .media-thumb video { width: 100%; height: 100%; object-fit: cover; }
.media-thumb-video { background: #000; }
.media-thumb-play {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.3); pointer-events: none;
}
.media-thumb-remove {
  position: absolute; top: 4px; right: 4px; width: 20px; height: 20px;
  background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%;
  font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(4px); transition: background 0.2s;
}
.media-thumb-remove:hover { background: var(--accent-coral); }

.create-post-footer {
  display: flex; justify-content: space-between; align-items: center;
}
.create-post-actions { display: flex; gap: 12px; }
.upload-action-btn {
  display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600;
  color: var(--text-secondary); background: transparent; border: none; cursor: pointer;
  padding: 8px 12px; border-radius: 12px; transition: all 0.2s;
}
.upload-action-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
.upload-action-btn svg { stroke: #DFFF00; }

.create-post-submit {
  display: flex; align-items: center; gap: 8px;
  background: #DFFF00; color: #000; font-weight: 800; font-size: 0.95rem;
  padding: 10px 24px; border-radius: 24px; border: none; cursor: pointer;
  transition: all 0.3s;
}
.create-post-submit:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(223, 255, 0, 0.3); }
.create-post-submit:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }

/* ── UNIVERSAL FEED CARDS ── */
.feed-item {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px; overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}
.feed-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border-color: rgba(255,255,255,0.08);
}
.feed-post-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 24px 24px 16px;
}
.feed-post-author { display: flex; align-items: center; gap: 14px; }
.feed-avatar {
  width: 48px; height: 48px; border-radius: 50%; object-fit: cover;
  border: 1px solid rgba(255,255,255,0.1);
}
.feed-avatar-placeholder {
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-slate); color: #fff; font-weight: 800; font-size: 1.1rem;
}
.feed-author-name { font-weight: 700; color: #fff; font-size: 1.1rem; letter-spacing: -0.01em; margin-bottom: 2px; }
.feed-timestamp { font-size: 0.8rem; color: var(--text-muted); }

.feed-post-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.feed-type-badge {
  font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
  padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.1); color: #fff;
}
.feed-type-badge.advice { background: rgba(59, 130, 246, 0.15); color: #60A5FA; border: 1px solid rgba(59,130,246,0.3); }
.feed-type-badge.motivation { background: rgba(255, 112, 67, 0.15); color: var(--accent-coral); border: 1px solid rgba(255,112,67,0.3); }
.feed-type-badge.announcement { background: rgba(168, 85, 247, 0.15); color: #C084FC; border: 1px solid rgba(168,85,247,0.3); }
.feed-type-badge.member_post { background: rgba(223, 255, 0, 0.1); color: #DFFF00; border: 1px solid rgba(223, 255, 0,0.2); }
.feed-type-badge.log { background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.1); }

.feed-post-actions { display: flex; gap: 4px; }

.feed-post-content { padding: 0 24px 24px; }
.feed-post-text {
  font-size: 1.05rem; line-height: 1.6; color: rgba(255,255,255,0.9);
  white-space: pre-wrap; word-break: break-word;
}
.feed-log-note {
  font-size: 1rem; line-height: 1.6; color: var(--text-secondary);
  background: rgba(0,0,0,0.2); padding: 16px; border-radius: 12px;
  border-left: 2px solid rgba(255,255,255,0.1); margin-top: 16px;
}

/* ── FEED LOG STATS ── */
.feed-log-stats { display: flex; gap: 8px; margin-top: 6px; }
.feed-log-pill {
  font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 8px;
  background: rgba(0,0,0,0.3); display: inline-flex; align-items: center;
}
.feed-log-pill.weight { color: #DFFF00; border: 1px solid rgba(223, 255, 0,0.1); }
.feed-log-pill.energy { color: var(--accent-coral); border: 1px solid rgba(255,112,67,0.1); }

.feed-log-card { position: relative; }
.feed-log-left-accent {
  position: absolute; left: 0; top: 24px; bottom: 24px; width: 4px;
  background: #DFFF00; border-radius: 0 4px 4px 0; opacity: 0.5;
}

/* ── FEED MEDIA GALLERIES ── */
.feed-photo-grid { margin-top: 16px; display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); border-radius: 16px; overflow: hidden; max-width: 600px; }
.feed-photo-grid.single { grid-template-columns: 1fr; }
.feed-photo-grid.double { grid-template-columns: 1fr 1fr; }
.feed-photo-item { position: relative; aspect-ratio: 1; cursor: pointer; overflow: hidden; }
.feed-photo-grid.single .feed-photo-item { aspect-ratio: 2/1; max-height: 280px; }
.feed-photo-grid.double .feed-photo-item { aspect-ratio: 1; max-height: 200px; }
.feed-photo-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.feed-photo-item:hover img { transform: scale(1.05); }
.feed-photo-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.3s;
}
.feed-photo-item:hover .feed-photo-overlay { opacity: 1; }

.feed-video-grid { margin-top: 16px; display: grid; gap: 12px; grid-template-columns: 1fr; max-width: 600px; }
.feed-video-item { border-radius: 16px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.05); }
.feed-video-item video { width: 100%; outline: none; aspect-ratio: 16/9; max-height: 300px; }

/* ── FEED COMMENTS ── */
.feed-comments-section {
  background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);
  padding: 20px 24px;
}
button.feed-comment-count {
  background: none; border: none; padding: 0; cursor: pointer;
  font-size: 0.85rem; font-weight: 700; color: var(--text-muted);
  display: flex; align-items: center; gap: 6px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;
  transition: color 0.2s;
}
button.feed-comment-count:hover {
  color: #fff;
}
.feed-comments-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
.feed-comment { display: flex; gap: 12px; }
.feed-comment-avatar {
  width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
}
.feed-comment-body {
  flex-grow: 1; background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 0 16px 16px 16px;
}
.feed-comment-meta { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px; }
.feed-comment-name { font-size: 0.9rem; font-weight: 700; color: #fff; }
.feed-comment-time { font-size: 0.75rem; color: var(--text-muted); }
.feed-comment-text { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.feed-comment-delete {
  opacity: 0; padding: 6px; color: var(--text-muted); background: transparent; border: none; cursor: pointer;
  transition: opacity 0.2s, color 0.2s; align-self: flex-start; margin-top: 6px;
}
.feed-comment:hover .feed-comment-delete { opacity: 1; }
.feed-comment-delete:hover { color: var(--accent-coral); }

.feed-comment-input {
  display: flex; gap: 12px; align-items: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px; padding: 6px 6px 6px 16px;
  transition: border-color 0.3s, background 0.3s;
}
.feed-comment-input:focus-within {
  border-color: rgba(223, 255, 0,0.3); background: rgba(255,255,255,0.06);
}
.feed-comment-input textarea {
  flex-grow: 1; background: transparent; border: none; color: #fff;
  font-size: 0.95rem; outline: none; resize: none; overflow-y: hidden;
  padding: 8px 0; font-family: inherit; line-height: 1.5; max-height: 120px;
}
.feed-comment-input textarea::placeholder { color: var(--text-muted); }
.feed-comment-input button {
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: #DFFF00; color: #000; border: none; cursor: pointer; transition: transform 0.2s, opacity 0.2s;
}
.feed-comment-input button:not(:disabled):hover { transform: scale(1.05); }
.feed-comment-input button:disabled { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); cursor: not-allowed; }

/* Responsive adjustments */
@media (max-width: 768px) {
  .create-post-inner { padding: 16px; }
  .feed-post-header, .feed-post-content, .feed-comments-section { padding-left: 16px; padding-right: 16px; }
  .feed-post-actions { position: absolute; top: 16px; right: 16px; }
  .feed-post-header { flex-direction: column; position: relative; gap: 12px; }
  .feed-post-meta { align-items: flex-start; }
}

.w-full { width: 100%; }
.text-current { color: currentColor; }

/* Spinner Animation */
.btn-spinner {
  height: 20px;
  width: 20px;
  animation: spinner-spin 1s linear infinite;
  filter: drop-shadow(0 0 5px currentColor);
}
@keyframes spinner-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

