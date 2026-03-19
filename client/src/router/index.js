import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { auth: true }
    },
    {
      path: '/groups/create',
      name: 'CreateGroup',
      component: () => import('@/views/CreateGroupView.vue'),
      meta: { auth: true }
    },
    {
      path: '/groups/:id',
      name: 'GroupDetail',
      component: () => import('@/views/GroupDetailView.vue'),
      meta: { auth: true }
    },
    {
      path: '/invite/:token',
      name: 'JoinGroup',
      component: () => import('@/views/JoinGroupView.vue'),
      meta: { auth: true }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { auth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFoundView.vue')
    }
  ]
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && auth.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
