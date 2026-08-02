<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div class="header-inner">
        <button class="brand" type="button" aria-label="返回论坛首页" @click="router.push('/')">
          <span class="brand-mark"><CrownOutlined /></span>
          <span class="brand-copy">
            <strong>虎绿林</strong>
            <small>HU60 COMMUNITY</small>
          </span>
        </button>

        <a-input-search
          v-model:value="headerSearch"
          class="header-search"
          allow-clear
          placeholder="搜索帖子、用户"
          enter-button="搜索"
          @search="submitHeaderSearch"
        />

        <div class="header-actions">
          <a-button class="publish-button" type="primary" @click="router.push('/publish')">
            <template #icon><EditOutlined /></template>
            发布
          </a-button>

          <a-dropdown v-if="isLoggedIn" placement="bottomRight">
            <button class="account-button" type="button">
              <UserAvatar :avatar="user?._u_avatar" :uid="user?.uid" :size="32" />
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
          <a-button v-else class="login-button" @click="openLogin">登录</a-button>

          <a-button class="mobile-menu-button" type="text" aria-label="打开导航" @click="drawerOpen = true">
            <MenuOutlined />
          </a-button>
        </div>
      </div>
    </a-layout-header>

    <a-layout-content class="shell-content">
      <div class="content-grid">
        <aside class="left-sidebar">
          <nav class="side-nav" aria-label="主导航">
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

        <aside class="right-sidebar">
          <a-card class="welcome-card" :bordered="false">
            <div class="welcome-mark"><CrownOutlined /></div>
            <h2>欢迎来到虎绿林</h2>
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

          <footer class="side-footer">
            <span>虎绿林 PC</span>
            <span>·</span>
            <a href="https://hu60.cn" target="_blank" rel="noopener noreferrer">访问主站</a>
          </footer>
        </aside>
      </div>
    </a-layout-content>

    <a-drawer v-model:open="drawerOpen" placement="right" title="导航" :width="300">
      <a-menu mode="inline" :selected-keys="selectedKeys" :items="menuItems" @click="handleMobileNav" />
    </a-drawer>
  </a-layout>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  BellOutlined,
  BulbOutlined,
  CommentOutlined,
  CrownOutlined,
  DownOutlined,
  EditOutlined,
  HomeOutlined,
  LogoutOutlined,
  MailOutlined,
  MenuOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'

import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { session } from '../stores/session'

const router = useRouter()
const route = useRoute()
const drawerOpen = ref(false)
const headerSearch = ref('')
const isLoggedIn = session.isLoggedIn
const user = computed(() => session.state.user)

const menuItems = [
  { key: 'home', icon: () => h(HomeOutlined), label: '论坛首页' },
  { key: 'chat', icon: () => h(CommentOutlined), label: '聊天室' },
  { key: 'messages', icon: () => h(MailOutlined), label: '内信' },
  { key: 'profile', icon: () => h(UserOutlined), label: '我的' },
]

const navRoutes = {
  home: '/',
  chat: '/chat',
  messages: '/messages',
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

function submitHeaderSearch(value) {
  const keywords = String(value || '').trim()
  if (!keywords) return
  router.push({ name: 'search', query: { keywords } })
}

function openLogin() {
  router.push({ name: 'login', query: { redirect: route.fullPath } })
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
