import { createRouter, createWebHashHistory } from 'vue-router'
import { authDialog } from '../stores/authDialog'
import { session } from '../stores/session'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: { title: '论坛', nav: 'home' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../pages/SearchPage.vue'),
    meta: { title: '搜索', nav: 'home' },
  },
  {
    path: '/topic/:id',
    name: 'topic',
    component: () => import('../pages/TopicPage.vue'),
    props: true,
    meta: { title: '帖子详情', nav: 'home' },
  },
  {
    path: '/publish',
    name: 'publish',
    component: () => import('../pages/PublishPage.vue'),
    meta: { title: '发布帖子', nav: 'home', requiresAuth: true },
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('../pages/ChatPage.vue'),
    meta: { title: '聊天室', nav: 'chat', requiresAuth: true },
  },
  {
    path: '/chat/:room',
    name: 'chat-room',
    component: () => import('../pages/ChatRoomPage.vue'),
    props: true,
    meta: { title: '聊天室', nav: 'chat', requiresAuth: true },
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('../pages/MessagesPage.vue'),
    meta: { title: '内信', nav: 'messages', requiresAuth: true },
  },
  {
    path: '/messages/chat/:uid',
    name: 'message-chat',
    component: () => import('../pages/MessageChatPage.vue'),
    props: true,
    meta: { title: '内信会话', nav: 'messages', requiresAuth: true },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('../pages/FavoritesPage.vue'),
    meta: { title: '我的收藏', nav: 'favorites', requiresAuth: true },
  },
  {
    path: '/relationships/:type?',
    name: 'relationships',
    component: () => import('../pages/RelationshipsPage.vue'),
    props: true,
    meta: { title: '关系管理', nav: 'profile', requiresAuth: true },
  },
  {
    path: '/reviews',
    name: 'reviews',
    component: () => import('../pages/ReviewPage.vue'),
    meta: { title: '内容审核', nav: 'reviews', requiresAuth: true },
  },
  {
    path: '/me',
    name: 'profile',
    component: () => import('../pages/ProfilePage.vue'),
    meta: { title: '我的', nav: 'profile', requiresAuth: true },
  },
  {
    path: '/user/:uid',
    name: 'user',
    component: () => import('../pages/UserPage.vue'),
    props: true,
    meta: { title: '用户资料' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/HomePage.vue'),
    beforeEnter(to) {
      if (session.isLoggedIn.value) return { name: 'home' }
      authDialog.show(to.query.redirect)
      return { name: 'home' }
    },
    meta: { title: '登录' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/NotFoundPage.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  // Hash 路由无需静态服务器配置 fallback，并能保留当前二级目录。
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
    return undefined
  },
})

router.beforeEach((to) => {
  if (!to.meta.requiresAuth || session.isLoggedIn.value) return true
  authDialog.show(to.fullPath)
  return false
})

router.afterEach((to) => {
  document.title = `${to.meta.title || '社区'} - 虎绿林`
})

export default router
