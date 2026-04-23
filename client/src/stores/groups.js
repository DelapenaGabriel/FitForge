import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

function generateWeeklyTargetsPoints(groupId, userId, startDateStr, endDateStr, startWeightStr, goalWeightStr) {
  const startWeight = parseFloat(startWeightStr);
  const goalWeight = parseFloat(goalWeightStr);
  if (!startWeight || !goalWeight) return [];
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.max(1, Math.floor(totalDays / 7));
  
  const totalLoss = startWeight - goalWeight;
  const weeklyLoss = totalLoss / totalWeeks;
  
  const targets = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const wTarget = startWeight - (weeklyLoss * w);
    targets.push({
      group_id: groupId,
      user_id: userId,
      week_number: w,
      target_weight: Number(wTarget.toFixed(2)),
      coach_override: false
    });
  }
  return targets;
}

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
    logModalMode: 'log', // 'log' or 'note'
    dashboardStats: {
      totalLogs: 0,
      currentWeight: null,
      lastLogDate: null,
      avgCalories: null,
      weightTrend: [],
      recentActivity: [],
      upcomingTargets: [],
      weightChange: null
    }
  }),

  actions: {
    async fetchGroups() {
      this.loading = true
      const auth = useAuthStore()
      if (!auth.user) return
      
      try {
        const { data, error } = await supabase
          .from('group_members')
          .select('*, groups!inner(*)')
          .eq('user_id', auth.user.id)
          .eq('groups.status', 'ACTIVE')
          
        if (error) throw error
        const activeGroupIds = data.map(m => m.groups.id)
        let groupCounts = {}
        if (activeGroupIds.length > 0) {
          const { data: countData } = await supabase.from('group_members').select('group_id').in('group_id', activeGroupIds)
          if (countData) {
            countData.forEach(c => {
               groupCounts[c.group_id] = (groupCounts[c.group_id] || 0) + 1
            })
          }
        }

        this.groups = data.map(m => {
          const g = m.groups;
          const end = new Date(g.end_date);
          const start = new Date(g.start_date);
          const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
          const totalWeeks = Math.max(1, Math.floor(days / 7));
          return {
            ...g,
            startDate: g.start_date,
            endDate: g.end_date,
            ownerId: g.owner_id,
            createdAt: g.created_at,
            myRole: m.role,
            totalWeeks,
            memberCount: groupCounts[g.id] || 1,
            myProgress: 0
          }
        }).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      } finally {
        this.loading = false
      }
    },

    async fetchGroup(id) {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single()
        
      if (error) throw error
      
      const end = new Date(data.end_date);
      const start = new Date(data.start_date);
      const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
      
      data.startDate = data.start_date
      data.endDate = data.end_date
      data.ownerId = data.owner_id
      data.createdAt = data.created_at
      data.totalWeeks = Math.max(1, Math.floor(days / 7))
      
      this.currentGroup = data
      return data
    },

    async createGroup(payload) {
      const auth = useAuthStore()
      
      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .insert({ 
          name: payload.name,
          description: payload.description,
          start_date: payload.startDate,
          end_date: payload.endDate,
          owner_id: auth.user.id 
        })
        .select()
        .single()
        
      if (groupErr) throw groupErr

      // Add owner to members
      const { error: memErr } = await supabase
        .from('group_members')
        .insert({ 
          group_id: group.id, 
          user_id: auth.user.id, 
          role: 'COACH',
          start_weight: payload.startWeight,
          goal_weight: payload.goalWeight
        })
        
      if (memErr) throw memErr

      const newTargets = generateWeeklyTargetsPoints(
        group.id, auth.user.id, group.start_date, group.end_date, payload.startWeight, payload.goalWeight
      )
      if (newTargets.length > 0) {
        await supabase.from('weekly_targets').insert(newTargets)
      }

      this.groups.unshift(group)

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '🎉 Group Created',
        message: `Your group "${group.name}" is ready! Invite your friends to join.`
      })

      return group
    },

    async updateGroup(groupId, payload) {
      const updateData = {}
      if (payload.name !== undefined) updateData.name = payload.name
      if (payload.description !== undefined) updateData.description = payload.description
      if (payload.startDate !== undefined) updateData.start_date = payload.startDate
      if (payload.endDate !== undefined) updateData.end_date = payload.endDate
      if (payload.status !== undefined) updateData.status = payload.status

      const { data, error } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', groupId)
        .select()
        .single()
        
      if (error) throw error
      
      data.startDate = data.start_date
      data.endDate = data.end_date
      data.ownerId = data.owner_id
      data.createdAt = data.created_at

      if (this.currentGroup?.id === groupId) {
        Object.assign(this.currentGroup, data)
      }
      const idx = this.groups.findIndex(g => g.id === groupId)
      if (idx !== -1) this.groups[idx] = { ...this.groups[idx], ...data }
      return data
    },

    async deleteGroup(groupId) {
      const { error } = await supabase.from('groups').update({ status: 'ARCHIVED' }).eq('id', groupId)
      if (error) throw error
      
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
      await this.removeMember(groupId, userId)
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
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        
      if (error) throw error
      
      const removed = this.members.find(m => m.user_id === userId || m.userId === userId)
      this.members = this.members.filter(m => m.user_id !== userId && m.userId !== userId)

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'warning',
        title: '👤 Member Removed',
        message: `${removed?.users?.display_name || removed?.displayName || 'A member'} was removed from the group.`
      })
    },

    async fetchMembers(groupId) {
      const { data, error } = await supabase
        .from('group_members')
        .select('*, users(*)')
        .eq('group_id', groupId)
        
      if (error) throw error
      // Flatten users properties for compatibility
      this.members = data.map(m => ({ 
        ...m, 
        userId: m.user_id, 
        displayName: m.users?.display_name, 
        avatarUrl: m.users?.avatar_url,
        email: m.users?.email
      }))

      const auth = useAuthStore()
      if (auth.user && this.currentGroup && this.currentGroup.id === groupId) {
        const me = this.members.find(m => m.userId === auth.user.id)
        if (me) {
           this.currentGroup.myRole = me.role
        }
      }
    },

    async updateGoalWeight(groupId, userId, newGoalWeight) {
      const { error } = await supabase
        .from('group_members')
        .update({ goal_weight: newGoalWeight })
        .eq('group_id', groupId)
        .eq('user_id', userId)
        
      if (error) throw error
      
      const member = this.members.find(m => m.userId === userId)
      if (member) member.goalWeight = newGoalWeight

      const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single()
      const { data: existingTargets } = await supabase.from('weekly_targets').select('*').eq('group_id', groupId).eq('user_id', userId)
      
      const startWeight = member?.startWeight || member?.start_weight
      if (group && startWeight) {
         const newTargets = generateWeeklyTargetsPoints(groupId, userId, group.start_date, group.end_date, startWeight, newGoalWeight)
         for (const t of newTargets) {
           const existing = existingTargets?.find(ext => ext.week_number === t.week_number)
           if (existing) {
             if (!existing.coach_override) {
               await supabase.from('weekly_targets').update({ target_weight: t.target_weight }).eq('id', existing.id)
             }
           } else {
             await supabase.from('weekly_targets').insert(t)
           }
         }
      }

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '🎯 Goal Updated',
        message: `Goal weight set to ${newGoalWeight} lbs. Targets recalculated.`
      })
    },

    async fetchLeaderboard(groupId) {
      try {
        const { data: members, error: memErr } = await supabase
          .from('group_members')
          .select('*, users(display_name, avatar_url)')
          .eq('group_id', groupId)
          
        if (memErr) throw memErr

        const { data: logs, error: logErr } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('group_id', groupId)
          .order('log_date', { ascending: true })

        if (logErr) throw logErr

        const logsByUser = {}
        if (logs) {
           logs.forEach(l => {
              if (!logsByUser[l.user_id]) logsByUser[l.user_id] = []
              logsByUser[l.user_id].push(l)
           })
        }
        
        this.leaderboard = members.map(m => {
            const userLogs = logsByUser[m.user_id] || []
            const latestWeight = userLogs.length > 0 && userLogs[userLogs.length - 1].weight_lbs ? userLogs[userLogs.length - 1].weight_lbs : m.start_weight
            
            const startWeight = m.start_weight || 0;
            const goalWeight = m.goal_weight || 0;
            const currentWeight = latestWeight || 0;
            
            let progressPercent = 0;
            if (startWeight > goalWeight && startWeight > 0) {
               progressPercent = Math.max(0, Math.min(100, ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100));
            } else if (goalWeight > startWeight && startWeight > 0) {
               progressPercent = Math.max(0, Math.min(100, ((currentWeight - startWeight) / (goalWeight - startWeight)) * 100));
            }

            return {
                id: m.users?.id || m.user_id,
                userId: m.user_id,
                displayName: m.users?.display_name,
                avatarUrl: m.users?.avatar_url,
                latestWeight,
                currentWeight,
                startWeight: m.start_weight,
                goalWeight: m.goal_weight,
                progressPercent,
                weightLost: m.start_weight && userLogs.length > 0 && latestWeight ? m.start_weight - latestWeight : 0
            }
        }).sort((a,b) => b.weightLost - a.weightLost).map((item, index) => {
            item.rank = index + 1;
            return item;
        });
      } catch (err) {
        console.error("Leaderboard fetch error:", err)
      }
    },

    async fetchPosts(groupId) {
      const { data, error } = await supabase
        .from('coach_posts')
        .select('*, users(*), post_comments(*, users(*)), post_media(*)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        
      if (error) throw error
      this.posts = data.map(p => ({
        ...p,
        createdAt: p.created_at,
        postType: p.post_type,
        authorId: p.author_id,
        authorName: p.users?.display_name,
        authorAvatar: p.users?.avatar_url,
        photoUrls: (p.post_media || []).filter(m => m.media_type === 'IMAGE').map(m => m.media_url),
        videoUrls: (p.post_media || []).filter(m => m.media_type === 'VIDEO').map(m => m.media_url),
        postComments: p.post_comments?.map(c => ({
           ...c,
           createdAt: c.created_at,
           authorId: c.author_id,
           authorName: c.users?.display_name
        })) || []
      }))
    },

    async createPost(groupId, payload) {
      const auth = useAuthStore()
      
      const d = new Date()
      const pad = (n) => n.toString().padStart(2, '0')
      const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const localTimestamp = `${localDate}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

      const { data: post, error } = await supabase
        .from('coach_posts')
        .insert({ 
          content: payload.content, 
          post_type: payload.postType || 'ADVICE',
          created_at: localTimestamp,
          group_id: groupId, 
          author_id: auth.user.id 
        })
        .select()
        .single()
        
      if (error) throw error

      // Insert media into post_media table
      const mediaInserts = []
      if (payload.photoUrls?.length) {
        payload.photoUrls.forEach(url => {
          mediaInserts.push({ post_id: post.id, media_url: url, media_type: 'IMAGE' })
        })
      }
      if (payload.videoUrls?.length) {
        payload.videoUrls.forEach(url => {
          mediaInserts.push({ post_id: post.id, media_url: url, media_type: 'VIDEO' })
        })
      }
      if (mediaInserts.length > 0) {
        await supabase.from('post_media').insert(mediaInserts)
      }
      
      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '📝 Post Published',
        message: 'Your post is now visible to the group.'
      })
      
      await this.fetchPosts(groupId)
    },

    async createPostComment(groupId, postId, content) {
      const auth = useAuthStore()
      
      const d = new Date()
      const pad = (n) => n.toString().padStart(2, '0')
      const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const localTimestamp = `${localDate}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, author_id: auth.user.id, content, created_at: localTimestamp })
        .select('*, users(*)')
        .single()
        
      if (error) throw error
      
      const post = this.posts.find(p => p.id === postId)
      if (post) {
        if (!post.post_comments) post.post_comments = []
        post.post_comments.push(data)
        if (!post.postComments) post.postComments = []
        post.postComments.push({
          ...data,
          createdAt: data.created_at,
          authorId: data.author_id,
          authorName: data.users?.display_name,
          authorAvatar: data.users?.avatar_url
        })
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
      const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
      if (error) throw error
      
      const post = this.posts.find(p => p.id === postId)
      if (post) {
        if (post.post_comments) {
          post.post_comments = post.post_comments.filter(c => c.id !== commentId)
        }
        if (post.postComments) {
          post.postComments = post.postComments.filter(c => c.id !== commentId)
        }
      }
    },

    async fetchTargets(groupId, userId) {
      const { data, error } = await supabase
        .from('weekly_targets')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .order('week_number', { ascending: true })
        
      if (error) throw error
      this.targets = data.map(t => ({
        ...t,
        weekNumber: t.week_number,
        targetWeight: t.target_weight,
        actualWeight: t.actual_weight,
        coachOverride: t.coach_override
      }))
    },

    async getCalendarTargets(groupId, userId) {
      const { data, error } = await supabase
        .from('weekly_targets')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .order('week_number', { ascending: true })
        
      if (error) throw error
      return data.map(t => ({
        ...t,
        weekNumber: t.week_number,
        targetWeight: t.target_weight,
        actualWeight: t.actual_weight,
        coachOverride: t.coach_override
      }))
    },

    async updateTarget(groupId, targetId, targetWeight) {
      const { data, error } = await supabase
        .from('weekly_targets')
        .update({ target_weight: targetWeight })
        .eq('id', targetId)
        .select()
        .single()
        
      if (error) throw error
      
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
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*, users(*), log_comments(*, users(*)), log_photos(*)')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .order('pinned', { ascending: false })
        .order('log_date', { ascending: false })
        
      if (error) throw error
      return data.map(l => ({
        ...l,
        logDate: l.log_date,
        weightLbs: l.weight_lbs,
        photoUrls: l.log_photos?.map(p => p.photo_url) || [],
        userId: l.user_id,
        displayName: l.users?.display_name,
        avatarUrl: l.users?.avatar_url,
        logComments: l.log_comments?.map(c => ({
          ...c, createdAt: c.created_at, authorId: c.author_id, authorName: c.users?.display_name, authorAvatar: c.users?.avatar_url
        })) || []
      }))
    },

    async fetchAllLogs(groupId) {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*, users(*), log_comments(*, users(*)), log_photos(*)')
        .eq('group_id', groupId)
        .order('pinned', { ascending: false })
        .order('log_date', { ascending: false })
        
      if (error) throw error
      this.allLogs = data.map(l => ({
        ...l,
        logDate: l.log_date,
        weightLbs: l.weight_lbs,
        photoUrls: l.log_photos?.map(p => p.photo_url) || [],
        userId: l.user_id,
        displayName: l.users?.display_name,
        avatarUrl: l.users?.avatar_url,
        logComments: l.log_comments?.map(c => ({
          ...c, createdAt: c.created_at, authorId: c.author_id, authorName: c.users?.display_name, authorAvatar: c.users?.avatar_url
        })) || []
      }))
      return this.allLogs
    },

    async createLog(groupId, payload) {
      const auth = useAuthStore()
      
      const d = new Date()
      const pad = (n) => n.toString().padStart(2, '0')
      const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const localTimestamp = `${localDate}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

      const { data, error } = await supabase
        .from('daily_logs')
        .insert({ 
          weight_lbs: payload.weightLbs ?? payload.weight_lbs ?? null,
          calories: payload.calories ?? null,
          notes: payload.notes ?? null,
          pinned: payload.pinned ?? false,
          log_date: localDate,
          created_at: localTimestamp,
          group_id: groupId, 
          user_id: auth.user.id 
        })
        .select()
        .single()
        
      if (error) throw error

      // Insert photos into log_photos table
      if (payload.photoUrls?.length) {
        const photoInserts = payload.photoUrls.map(url => ({
          log_id: data.id,
          photo_url: url
        }))
        await supabase.from('log_photos').insert(photoInserts)
      }
      
      const notifs = useNotificationStore()
      const isNote = !payload.weight_lbs && !payload.weightLbs
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
          message: `You logged ${payload.weightLbs || payload.weight_lbs} lbs. Keep it up!`
        })
      }
      
      await this.fetchAllLogs(groupId)
      if (auth.user?.id) {
        this.logs = await this.fetchLogs(groupId, auth.user.id)
      }
      return data
    },

    async updateLog(groupId, logId, payload) {
      const { data, error } = await supabase
        .from('daily_logs')
        .update({ 
          weight_lbs: payload.weightLbs ?? payload.weight_lbs ?? null,
          calories: payload.calories ?? null,
          notes: payload.notes ?? null,
          pinned: payload.pinned ?? false
        })
        .eq('id', logId)
        .select()
        .single()
        
      if (error) throw error

      // Replace photos: delete old, insert new
      if (payload.photoUrls) {
        await supabase.from('log_photos').delete().eq('log_id', logId)
        if (payload.photoUrls.length > 0) {
          const photoInserts = payload.photoUrls.map(url => ({
            log_id: logId,
            photo_url: url
          }))
          await supabase.from('log_photos').insert(photoInserts)
        }
      }
      
      const auth = useAuthStore()
      await this.fetchAllLogs(groupId)
      if (auth.user?.id) {
        this.logs = await this.fetchLogs(groupId, auth.user.id)
      }
      
      return data
    },

    async deleteLog(groupId, logId) {
      const { error } = await supabase.from('daily_logs').delete().eq('id', logId)
      if (error) throw error
      
      this.logs = this.logs.filter(l => l.id !== logId)
      this.allLogs = this.allLogs.filter(l => l.id !== logId)
    },

    async createLogComment(groupId, logId, content) {
      const auth = useAuthStore()
      
      const d = new Date()
      const pad = (n) => n.toString().padStart(2, '0')
      const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const localTimestamp = `${localDate}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

      const { data, error } = await supabase
        .from('log_comments')
        .insert({ log_id: logId, author_id: auth.user.id, content, created_at: localTimestamp })
        .select('*, users(*)')
        .single()
        
      if (error) throw error

      const updateList = (list) => {
        const log = list.find(l => l.id === logId)
        if (log) {
          if (!log.log_comments) log.log_comments = []
          log.log_comments.push(data)
          if (!log.logComments) log.logComments = []
          log.logComments.push({
            ...data,
            createdAt: data.created_at,
            authorId: data.author_id,
            authorName: data.users?.display_name,
            authorAvatar: data.users?.avatar_url
          })
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
      const { error } = await supabase.from('log_comments').delete().eq('id', commentId)
      if (error) throw error
      
      const updateList = (list) => {
        const log = list.find(l => l.id === logId)
        if (log) {
          if (log.log_comments) {
            log.log_comments = log.log_comments.filter(c => c.id !== commentId)
          }
          if (log.logComments) {
            log.logComments = log.logComments.filter(c => c.id !== commentId)
          }
        }
      }
      updateList(this.logs)
      updateList(this.allLogs)
    },

    async updateLogComment(groupId, logId, commentId, content) {
      const { data, error } = await supabase
        .from('log_comments')
        .update({ content })
        .eq('id', commentId)
        .select('*, users(*)')
        .single()
        
      if (error) throw error
      
      const updateList = (list) => {
        const log = list.find(l => l.id === logId)
        if (log) {
          if (log.log_comments) {
            const idx = log.log_comments.findIndex(c => c.id === commentId)
            if (idx !== -1) log.log_comments[idx] = data
          }
          if (log.logComments) {
            const idx = log.logComments.findIndex(c => c.id === commentId)
            if (idx !== -1) log.logComments[idx] = {
              ...data,
              createdAt: data.created_at,
              authorId: data.author_id,
              authorName: data.users?.display_name,
              authorAvatar: data.users?.avatar_url
            }
          }
        }
      }
      updateList(this.logs)
      updateList(this.allLogs)
      
      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '✏️ Comment Updated',
        message: 'Your comment was modified.'
      })
      
      return data
    },

    async updatePostComment(groupId, postId, commentId, content) {
      const { data, error } = await supabase
        .from('post_comments')
        .update({ content })
        .eq('id', commentId)
        .select('*, users(*)')
        .single()
        
      if (error) throw error
      
      const post = this.posts.find(p => p.id === postId)
      if (post) {
        if (post.post_comments) {
          const idx = post.post_comments.findIndex(c => c.id === commentId)
          if (idx !== -1) post.post_comments[idx] = data
        }
        if (post.postComments) {
          const idx = post.postComments.findIndex(c => c.id === commentId)
          if (idx !== -1) post.postComments[idx] = {
            ...data,
            createdAt: data.created_at,
            authorId: data.author_id,
            authorName: data.users?.display_name,
            authorAvatar: data.users?.avatar_url
          }
        }
      }
      
      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '✏️ Comment Updated',
        message: 'Your comment was modified.'
      })
      
      return data
    },

    async updatePost(groupId, postId, payload) {
      const { data, error } = await supabase
        .from('coach_posts')
        .update({ content: payload.content, post_type: payload.postType || 'ADVICE' })
        .eq('id', postId)
        .select()
        .single()
        
      if (error) throw error

      // Replace post media: delete old, insert new
      await supabase.from('post_media').delete().eq('post_id', postId)
      const mediaInserts = []
      if (payload.photoUrls?.length) {
        payload.photoUrls.forEach(url => {
          mediaInserts.push({ post_id: postId, media_url: url, media_type: 'IMAGE' })
        })
      }
      if (payload.videoUrls?.length) {
        payload.videoUrls.forEach(url => {
          mediaInserts.push({ post_id: postId, media_url: url, media_type: 'VIDEO' })
        })
      }
      if (mediaInserts.length > 0) {
        await supabase.from('post_media').insert(mediaInserts)
      }
      
      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '✏️ Post Updated',
        message: 'Your changes have been saved.'
      })

      await this.fetchPosts(groupId)
      return data
    },

    async deletePost(groupId, postId) {
      const { error } = await supabase.from('coach_posts').delete().eq('id', postId)
      if (error) throw error
      this.posts = this.posts.filter(p => p.id !== postId)
    },

    async createInvite(groupId, email) {
      const token = Math.random().toString(36).substring(2, 15) // simple mock token
      const { data, error } = await supabase
        .from('group_invites')
        .insert({ group_id: groupId, invite_email: email, token, expires_at: new Date(Date.now() + 86400000).toISOString() })
        .select()
        .single()
        
      if (error) throw error

      const notifs = useNotificationStore()
      notifs.showToast({
        type: 'success',
        title: '📨 Invite Created',
        message: email ? `Invite sent to ${email}!` : 'Invite link is ready to share!'
      })

      return data
    },

    async fetchDashboardStats() {
      const auth = useAuthStore()
      if (!auth.user) return

      try {
        // 1. Total log count
        const { count: logCount } = await supabase
          .from('daily_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.user.id)
        this.dashboardStats.totalLogs = logCount || 0

        // 2. Latest weight
        const { data: latestLog } = await supabase
          .from('daily_logs')
          .select('weight_lbs, log_date')
          .eq('user_id', auth.user.id)
          .not('weight_lbs', 'is', null)
          .order('log_date', { ascending: false })
          .limit(1)
          .single()
        this.dashboardStats.currentWeight = latestLog?.weight_lbs || null
        this.dashboardStats.lastLogDate = latestLog?.log_date || null

        // 3. Average calories (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const { data: calLogs } = await supabase
          .from('daily_logs')
          .select('calories')
          .eq('user_id', auth.user.id)
          .not('calories', 'is', null)
          .gte('log_date', sevenDaysAgo.toISOString().split('T')[0])
        if (calLogs && calLogs.length > 0) {
          const total = calLogs.reduce((sum, l) => sum + (l.calories || 0), 0)
          this.dashboardStats.avgCalories = Math.round(total / calLogs.length)
        } else {
          this.dashboardStats.avgCalories = null
        }

        // 4. Weight trend (last 14 entries with weight)
        const { data: trendLogs } = await supabase
          .from('daily_logs')
          .select('weight_lbs, log_date')
          .eq('user_id', auth.user.id)
          .not('weight_lbs', 'is', null)
          .order('log_date', { ascending: false })
          .limit(14)
        this.dashboardStats.weightTrend = (trendLogs || []).reverse()

        // 5. Recent activity (last 5 logs)
        let recentLogs = []
        const activeGroupIds = this.groups.map(g => g.id)
        
        if (activeGroupIds.length > 0) {
          const { data, error: recentError } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', auth.user.id)
            .in('group_id', activeGroupIds)
            .order('log_date', { ascending: false })
            .limit(5)
            
          recentLogs = data || []
          if (recentError) {
            console.error('Error fetching recent logs:', recentError)
          }
        }

        this.dashboardStats.recentActivity = recentLogs.map(l => {
          const group = this.groups.find(g => g.id === l.group_id)
          return {
            id: l.id,
            logDate: l.log_date,
            weightLbs: l.weight_lbs,
            calories: l.calories,
            notes: l.notes,
            groupName: group?.name || 'Unknown Group',
            groupId: l.group_id
          }
        })

        // 6. Upcoming targets (current week across all groups)
        const now = new Date()
        const groupIds = this.groups.map(g => g.id)
        if (groupIds.length > 0) {
          // Figure out which week we're in for each group
          const allTargets = []
          for (const group of this.groups) {
            const start = new Date(group.startDate)
            const daysSinceStart = Math.floor((now - start) / (1000 * 60 * 60 * 24))
            const currentWeek = Math.max(1, Math.ceil(daysSinceStart / 7))

            const { data: targets } = await supabase
              .from('weekly_targets')
              .select('*')
              .eq('group_id', group.id)
              .eq('user_id', auth.user.id)
              .eq('week_number', currentWeek)
              .limit(1)

            if (targets && targets.length > 0) {
              allTargets.push({
                ...targets[0],
                groupName: group.name,
                groupId: group.id,
                currentWeek
              })
            }
          }
          this.dashboardStats.upcomingTargets = allTargets
        }

        // 7. Weight change (first log vs latest)
        if (this.dashboardStats.weightTrend.length >= 2) {
          const first = this.dashboardStats.weightTrend[0].weight_lbs
          const last = this.dashboardStats.weightTrend[this.dashboardStats.weightTrend.length - 1].weight_lbs
          this.dashboardStats.weightChange = Number((last - first).toFixed(1))
        } else {
          this.dashboardStats.weightChange = null
        }

      } catch (err) {
        console.error('Dashboard stats fetch error:', err)
      }
    },

    async acceptInvite(token, startWeight, goalWeight) {
      const auth = useAuthStore()
      if (!auth.user) throw new Error("Must be logged in to accept invite.")
      
      // Look up invite
      const { data: invite, error: inviteErr } = await supabase
        .from('group_invites')
        .select('*')
        .eq('token', token)
        .eq('status', 'PENDING')
        .single()
        
      if (inviteErr) throw new Error("Invalid or expired invite")
      
      // Update invite status
      await supabase.from('group_invites').update({ status: 'ACCEPTED' }).eq('id', invite.id)
      
      // Add member
      const { data, error } = await supabase
        .from('group_members')
        .insert({ 
          group_id: invite.group_id, 
          user_id: auth.user.id,
          start_weight: startWeight,
          goal_weight: goalWeight,
          role: 'MEMBER'
        })
        .select()
        .single()
        
      if (error) throw error

      const { data: group } = await supabase.from('groups').select('*').eq('id', invite.group_id).single()
      if (group) {
        const newTargets = generateWeeklyTargetsPoints(group.id, auth.user.id, group.start_date, group.end_date, startWeight, goalWeight)
        if (newTargets.length > 0) {
          await supabase.from('weekly_targets').insert(newTargets)
        }
      }

      const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', invite.group_id)
      if (members) {
        const notifInserts = members.filter(m => m.user_id !== auth.user.id).map(m => ({
          user_id: m.user_id,
          group_id: invite.group_id,
          type: 'MEMBER_JOINED',
          title: 'New Member',
          message: `👥 ${auth.user.displayName || 'Someone'} joined the group!`,
          route: `/groups/${invite.group_id}?tab=members`
        }))
        if (notifInserts.length > 0) {
          await supabase.from('notifications').insert(notifInserts)
        }
      }

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
