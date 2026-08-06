<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div class="header-inner">
        <button class="brand" type="button" aria-label="返回论坛首页" @click="router.push('/')">
          <img
            v-show="brandLogoReady"
            class="brand-logo"
            :src="brandLogoUrl"
            width="423"
            height="180"
            alt=""
            @load="brandLogoReady = true"
            @error="brandLogoReady = false"
          />
          <span v-show="!brandLogoReady" class="brand-fallback" aria-hidden="true">
            <span class="brand-mark">
              <i class="tree-top"></i>
              <i class="tree-middle"></i>
              <i class="tree-trunk"></i>
            </span>
            <span class="brand-copy">
              <strong>虎绿林</strong>
              <small>HULVLIN</small>
            </span>
          </span>
        </button>

        <nav class="top-nav" aria-label="主导航">
          <RouterLink to="/">帖子</RouterLink>
          <RouterLink to="/favorites">收藏</RouterLink>
          <RouterLink to="/chat">聊天</RouterLink>
          <RouterLink to="/messages">内信</RouterLink>
          <RouterLink to="/me">我的</RouterLink>
        </nav>

        <div class="header-actions">
          <a-dropdown v-if="isLoggedIn" placement="bottomRight">
            <button class="account-button" type="button">
              <UserAvatar :avatar="user?._u_avatar" :uid="user?.uid" :size="34" />
              <span>{{ user?.name || '我的账号' }}</span>
              <DownOutlined class="account-arrow" />
            </button>
            <template #overlay>
              <a-menu @click="handleAccountMenu">
                <a-menu-item key="profile"><UserOutlined /> 个人中心</a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout"><LogoutOutlined /> 退出登录</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <button v-else class="header-login" type="button" @click="openLogin">登录</button>

          <a-button
            class="mobile-menu-button"
            type="text"
            aria-label="打开导航"
            @click="drawerOpen = true"
          >
            <MenuOutlined />
          </a-button>
        </div>
      </div>
    </a-layout-header>

    <a-layout-content class="shell-content">
      <div class="content-grid" :class="{ 'home-grid': isHome }">
        <aside v-if="!isHome" class="left-sidebar">
          <nav class="side-nav" aria-label="页面导航">
            <a-menu mode="inline" :selected-keys="selectedKeys" :items="menuItems" @click="handleNav" />
          </nav>

          <div class="side-quick-card">
            <span class="quick-icon"><BulbOutlined /></span>
            <strong>分享你的新发现</strong>
            <p>和小老虎们聊聊今天的新鲜事。</p>
            <a-button block type="primary" ghost @click="router.push('/publish')">写一篇帖子</a-button>
          </div>
        </aside>

        <main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="page-fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>

        <aside v-if="!isHome" class="right-sidebar">
          <a-card class="welcome-card" :bordered="false">
            <h2>虎绿林</h2>
            <p>一个轻松、友善、有温度的中文社区。</p>
            <a-space v-if="!isLoggedIn" class="welcome-actions">
              <a-button type="primary" @click="openLogin">立即登录</a-button>
              <a-button @click="router.push('/search')">浏览话题</a-button>
            </a-space>
            <div v-else class="welcome-user">
              <UserAvatar :avatar="user?._u_avatar" :uid="user?.uid" :size="42" />
              <div>
                <strong>{{ user?.name || '小老虎' }}</strong>
                <span>UID {{ user?.uid || '--' }}</span>
              </div>
            </div>
          </a-card>

          <a-card class="rules-card" title="社区小贴士" :bordered="false">
            <ul>
              <li><span>01</span>友好交流，尊重不同观点</li>
              <li><span>02</span>选择合适的版块发布内容</li>
              <li><span>03</span>保护隐私，不公开敏感信息</li>
            </ul>
          </a-card>
        </aside>
      </div>

      <SiteFooter />
    </a-layout-content>

    <a-drawer v-model:open="drawerOpen" placement="right" title="导航" :width="300">
      <a-menu
        class="mobile-drawer-nav"
        mode="inline"
        :selected-keys="selectedKeys"
        :items="menuItems"
        @click="handleMobileNav"
      />
    </a-drawer>

    <LoginModal />
  </a-layout>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  AuditOutlined,
  BulbOutlined,
  CommentOutlined,
  DownOutlined,
  HomeOutlined,
  LogoutOutlined,
  MailOutlined,
  MenuOutlined,
  StarOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'

import LoginModal from '../components/LoginModal.vue'
import SiteFooter from '../components/SiteFooter.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { authDialog } from '../stores/authDialog'
import { session } from '../stores/session'
import { currentPermissions, hasPermission, PERMISSIONS } from '../utils/permissions'

const router = useRouter()
const route = useRoute()
const drawerOpen = ref(false)
const brandLogoUrl = `${import.meta.env.BASE_URL}logo.png`
const brandLogoReady = ref(false)
const isLoggedIn = session.isLoggedIn
const user = computed(() => session.state.user)
const isHome = computed(() => route.name === 'home')

const canReview = computed(() => (
  Boolean(user.value?.siteAdmin)
  || hasPermission(currentPermissions(user.value), PERMISSIONS.reviewPost)
))
const menuItems = computed(() => [
  { key: 'home', icon: () => h(HomeOutlined), label: '论坛首页' },
  { key: 'favorites', icon: () => h(StarOutlined), label: '我的收藏' },
  { key: 'chat', icon: () => h(CommentOutlined), label: '聊天室' },
  { key: 'messages', icon: () => h(MailOutlined), label: '内信' },
  ...(canReview.value ? [{ key: 'reviews', icon: () => h(AuditOutlined), label: '内容审核' }] : []),
  { key: 'profile', icon: () => h(UserOutlined), label: '我的' },
])

const navRoutes = {
  home: '/',
  favorites: '/favorites',
  chat: '/chat',
  messages: '/messages',
  reviews: '/reviews',
  profile: '/me',
}

const selectedKeys = computed(() => [route.meta.nav || ''])

function handleNav({ key }) {
  router.push(navRoutes[key])
}

function handleMobileNav(event) {
  drawerOpen.value = false
  handleNav(event)
}

function openLogin() {
  authDialog.show(route.fullPath)
}

async function handleAccountMenu({ key }) {
  if (key === 'profile') {
    router.push('/me')
    return
  }

  if (key !== 'logout') return
  try {
    await forumApi.logout()
  } catch {
    // 服务端退出失败也清理本机凭证，避免旧 token 继续使用。
  } finally {
    session.clear()
    message.success('已退出登录')
    router.push('/')
  }
}
</script>
