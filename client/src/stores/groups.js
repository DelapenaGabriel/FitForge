import { defineStore } from 'pinia'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

export const useGroupStore = defineStore('groups', {
  state: () => ({
    groups: [],
    currentGroup: null,
    members: [],
    leaderboard: [],
    posts: [],
    targets: [],
    logs: [],
    allLogs: [],
    loading: false,
    showLogModal: false,
    logModalMode: 'log' // 'log' or 'note'
  }),

  actions: {
    async fetchGroups() {
      this.loading = true
      try {
        const { data } = await api.get('/groups')
        this.groups = data
      } finally {
        this.loading = false
      }
    },

    async fetchGroup(id) {
      const { data } = await api.get(`/groups/${id}`)
      this.currentGroup = data
      return data
    },

    async createGroup(payload) {
      const { data } = await api.post('/groups', payload)
      this.groups.unshift(data)

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '🎉 Group Created',
        message: `Your group "${data.name}" is ready! Invite your friends to join.`
      })

      return data
    },

    async updateGroup(groupId, payload) {
      const { data } = await api.put(`/groups/${groupId}`, payload)
      if (this.currentGroup?.id === groupId) {
        this.currentGroup = data
      }
      const idx = this.groups.findIndex(g => g.id === groupId)
      if (idx !== -1) this.groups[idx] = data
      return data
    },

    async deleteGroup(groupId) {
      await api.delete(`/groups/${groupId}`)
      this.groups = this.groups.filter(g => g.id !== groupId)
      if (this.currentGroup?.id === groupId) {
        this.currentGroup = null
      }

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'info',
        title: '🗑️ Group Deleted',
        message: 'The group has been removed.'
      })
    },

    async leaveGroup(groupId, userId) {
      await api.delete(`/groups/${groupId}/members/${userId}`)
      this.groups = this.groups.filter(g => g.id !== groupId)
      if (this.currentGroup?.id === groupId) {
        this.currentGroup = null
      }

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'info',
        title: '👋 Left Group',
        message: 'You have left the group.'
      })
    },

    async removeMember(groupId, userId) {
      await api.delete(`/groups/${groupId}/members/${userId}`)
      const removed = this.members.find(m => m.userId === userId)
      this.members = this.members.filter(m => m.userId !== userId)

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'warning',
        title: '👤 Member Removed',
        message: `${removed?.displayName || 'A member'} was removed from the group.`
      })
    },

    async fetchMembers(groupId) {
      const { data } = await api.get(`/groups/${groupId}/members`)
      this.members = data
    },

    async updateGoalWeight(groupId, userId, newGoalWeight) {
      await api.put(`/groups/${groupId}/members/${userId}/goal-weight`, { goalWeight: newGoalWeight })
      const member = this.members.find(m => m.userId === userId)
      if (member) member.goalWeight = newGoalWeight

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '🎯 Goal Updated',
        message: `Goal weight set to ${newGoalWeight} lbs. Targets recalculated.`
      })
    },

    async fetchLeaderboard(groupId) {
      const { data } = await api.get(`/groups/${groupId}/leaderboard`)
      this.leaderboard = data
    },

    async fetchPosts(groupId) {
      const { data } = await api.get(`/groups/${groupId}/posts`)
      this.posts = data
    },

    async createPost(groupId, payload) {
      const { data } = await api.post(`/groups/${groupId}/posts`, payload)
      
      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '📝 Post Published',
        message: 'Your post is now visible to the group.'
      })
      
      await this.fetchPosts(groupId)
    },

    async createPostComment(groupId, postId, content) {
      const { data } = await api.post(`/groups/${groupId}/posts/${postId}/comments`, { content })
      const post = this.posts.find(p => p.id === postId)
      if (post) {
        if (!post.comments) post.comments = []
        post.comments.push(data)
      }

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '💬 Comment Added',
        message: 'Your comment was posted.'
      })

      return data
    },

    async deletePostComment(groupId, postId, commentId) {
      await api.delete(`/groups/${groupId}/posts/${postId}/comments/${commentId}`)
      const post = this.posts.find(p => p.id === postId)
      if (post && post.comments) {
        post.comments = post.comments.filter(c => c.id !== commentId)
      }
    },

    async fetchTargets(groupId, userId) {
      const { data } = await api.get(`/groups/${groupId}/targets`, { params: { userId } })
      this.targets = data
    },

    async getCalendarTargets(groupId, userId) {
      const { data } = await api.get(`/groups/${groupId}/targets`, { params: { userId } })
      return data
    },

    async updateTarget(groupId, targetId, targetWeight) {
      const { data } = await api.put(`/groups/${groupId}/targets/${targetId}`, { targetWeight })
      const idx = this.targets.findIndex(t => t.id === targetId)
      if (idx !== -1) this.targets[idx] = data

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '🎯 Target Updated',
        message: `Weekly target adjusted to ${targetWeight} lbs.`
      })
    },

    async fetchLogs(groupId, userId) {
      const { data } = await api.get(`/groups/${groupId}/logs`, { params: { userId } })
      return data
    },

    async fetchAllLogs(groupId) {
      const { data } = await api.get(`/groups/${groupId}/logs`)
      this.allLogs = data
      return data
    },

    async createLog(groupId, payload) {
      const { data } = await api.post(`/groups/${groupId}/logs`, payload)
      
      const notifs = useNotificationStore()
      const isNote = !payload.weightLbs
      if (isNote) {
        notifs.showToast({
          type: 'success',
          title: '📝 Note Posted',
          message: 'Your note was shared with the group.'
        })
      } else {
        notifs.showToast({
          type: 'success',
          title: '⚖️ Weight Logged',
          message: `You logged ${payload.weightLbs} lbs. Keep it up!`
        })
      }
      
      await this.fetchAllLogs(groupId)
      const auth = useAuthStore()
      if (auth.user?.id) {
        this.logs = await this.fetchLogs(groupId, auth.user.id)
      }
      return data
    },

    async updateLog(groupId, logId, payload) {
      const { data } = await api.put(`/groups/${groupId}/logs/${logId}`, payload)
      const idx = this.logs.findIndex(l => l.id === logId)
      if (idx !== -1) this.logs[idx] = data
      const allIdx = this.allLogs.findIndex(l => l.id === logId)
      if (allIdx !== -1) this.allLogs[allIdx] = data
      return data
    },

    async deleteLog(groupId, logId) {
      await api.delete(`/groups/${groupId}/logs/${logId}`)
      this.logs = this.logs.filter(l => l.id !== logId)
      this.allLogs = this.allLogs.filter(l => l.id !== logId)
    },

    async createLogComment(groupId, logId, content) {
      const { data } = await api.post(`/groups/${groupId}/logs/${logId}/comments`, { content })
      // Helper to update comments in logs and allLogs
      const updateList = (list) => {
        const log = list.find(l => l.id === logId)
        if (log) {
          if (!log.comments) log.comments = []
          log.comments.push(data)
        }
      }
      updateList(this.logs)
      updateList(this.allLogs)

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '💬 Comment Added',
        message: 'Your comment was posted.'
      })

      return data
    },

    async deleteLogComment(groupId, logId, commentId) {
      await api.delete(`/groups/${groupId}/logs/${logId}/comments/${commentId}`)
      const updateList = (list) => {
        const log = list.find(l => l.id === logId)
        if (log && log.comments) {
          log.comments = log.comments.filter(c => c.id !== commentId)
        }
      }
      updateList(this.logs)
      updateList(this.allLogs)
    },

    async updatePost(groupId, postId, payload) {
      const { data } = await api.put(`/groups/${groupId}/posts/${postId}`, payload)
      const idx = this.posts.findIndex(p => p.id === postId)
      if (idx !== -1) this.posts[idx] = data

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '✏️ Post Updated',
        message: 'Your changes have been saved.'
      })

      return data
    },

    async deletePost(groupId, postId) {
      await api.delete(`/groups/${groupId}/posts/${postId}`)
      this.posts = this.posts.filter(p => p.id !== postId)
    },

    async createInvite(groupId, email) {
      const { data } = await api.post(`/groups/${groupId}/invites`, { email })

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '📨 Invite Created',
        message: email ? `Invite sent to ${email}!` : 'Invite link is ready to share!'
      })

      return data
    },

    async acceptInvite(token, startWeight, goalWeight) {
      const { data } = await api.post(`/invites/${token}/accept`, { startWeight, goalWeight })

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '🎉 Welcome!',
        message: 'You\'ve joined the challenge! Let\'s crush those goals together.'
      })

      return data
    }
  }
})
