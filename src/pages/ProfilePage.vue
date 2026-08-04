<template>
  <div class="profile-page">
    <PageState :loading="loading" :error="error" :empty="!loading && !error && !user" @retry="loadProfile">
      <template v-if="user">
        <a-card class="surface-card profile-hero" :bordered="false">
          <div class="profile-main">
            <UserAvatar :avatar="user._u_avatar" :uid="user.uid" :size="76" shape="square" />
            <div>
              <h1>{{ user.name }}</h1>
              <p>UID {{ user.uid }}<span v-if="user.signature"> · {{ user.signature }}</span></p>
              <a-space wrap>
                <a-tag v-if="user.siteAdmin" color="red">站点管理员</a-tag>
                <a-tag v-if="user.hasRegPhone" color="green">已绑定手机</a-tag>
                <a-tag color="cyan">虎绿林用户</a-tag>
              </a-space>
            </div>
          </div>
          <a-button @click="loadProfile"><ReloadOutlined /> 刷新资料</a-button>
        </a-card>

        <div class="profile-grid">
          <a-card class="surface-card profile-panel" title="消息与内容" :bordered="false">
            <a-list :split="false">
              <a-list-item class="profile-link" @click="router.push('/messages')">
                <a-list-item-meta title="提醒消息" description="与我相关的回复和通知">
                  <template #avatar><BellOutlined /></template>
                </a-list-item-meta>
                <a-badge :count="user._myself?.newAtInfo || 0" />
                <RightOutlined />
              </a-list-item>
              <a-list-item class="profile-link" @click="openMyTopics">
                <a-list-item-meta title="我的帖子" description="我发布过的内容">
                  <template #avatar><FileTextOutlined /></template>
                </a-list-item-meta>
                <RightOutlined />
              </a-list-item>
              <a-list-item class="profile-link" @click="router.push('/favorites')">
                <a-list-item-meta title="我的收藏" description="稍后继续阅读">
                  <template #avatar><StarOutlined /></template>
                </a-list-item-meta>
                <RightOutlined />
              </a-list-item>
              <a-list-item class="profile-link" @click="openMyReplies">
                <a-list-item-meta title="我的回复" description="我参与过的讨论">
                  <template #avatar><CommentOutlined /></template>
                </a-list-item-meta>
                <RightOutlined />
              </a-list-item>
              <a-list-item v-if="canReview" class="profile-link" @click="router.push('/reviews')">
                <a-list-item-meta title="内容审核" description="处理待审核帖子与回复">
                  <template #avatar><AuditOutlined /></template>
                </a-list-item-meta>
                <a-badge :count="user._myself?.countReview || 0" />
                <RightOutlined />
              </a-list-item>
            </a-list>
          </a-card>

          <a-card class="surface-card profile-panel" title="关系与账号" :bordered="false">
            <a-list :split="false">
              <a-list-item class="profile-link" @click="openRelationships('follow')">
                <a-list-item-meta title="我的关注" description="关注的社区用户">
                  <template #avatar><TeamOutlined /></template>
                </a-list-item-meta>
                <RightOutlined />
              </a-list-item>
              <a-list-item class="profile-link" @click="openRelationships('block')">
                <a-list-item-meta title="黑名单" description="管理屏蔽用户">
                  <template #avatar><StopOutlined /></template>
                </a-list-item-meta>
                <RightOutlined />
              </a-list-item>
              <a-list-item class="profile-link danger-link" @click="confirmLogout">
                <a-list-item-meta title="退出账号" description="清除本机登录凭证">
                  <template #avatar><LogoutOutlined /></template>
                </a-list-item-meta>
                <RightOutlined />
              </a-list-item>
            </a-list>
          </a-card>
        </div>
      </template>
    </PageState>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  AuditOutlined,
  BellOutlined,
  CommentOutlined,
  FileTextOutlined,
  LogoutOutlined,
  ReloadOutlined,
  RightOutlined,
  StarOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { session } from '../stores/session'
import { currentPermissions, hasPermission, PERMISSIONS } from '../utils/permissions'

const router = useRouter()
const user = ref(session.state.user)
const loading = ref(true)
const error = ref('')
const canReview = computed(() => (
  Boolean(user.value?.siteAdmin)
  || hasPermission(currentPermissions(user.value), PERMISSIONS.reviewPost)
))

async function loadProfile() {
  loading.value = true
  error.value = ''
  try {
    user.value = await forumApi.getCurrentUser()
    session.setUser(user.value)
  } catch (reason) {
    error.value = reason?.message || '个人资料加载失败'
  } finally {
    loading.value = false
  }
}

function openMyTopics() {
  if (user.value?.name) router.push({ name: 'search', query: { username: user.value.name } })
}

function openMyReplies() {
  if (user.value?.name) {
    router.push({ name: 'search', query: { username: user.value.name, searchType: 'reply' } })
  }
}

function openRelationships(type) {
  router.push({ name: 'relationships', params: { type } })
}

function confirmLogout() {
  Modal.confirm({
    title: '确认退出账号吗？',
    content: '退出后将清除本机保存的登录凭证。',
    okText: '退出登录',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await forumApi.logout()
      } catch {
        // 服务端失败不阻断本机退出。
      }
      session.clear()
      message.success('已退出登录')
      router.replace('/')
    },
  })
}

onMounted(loadProfile)
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-hero :deep(.ant-card-body) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px;
  gap: 20px;
  background: linear-gradient(130deg, #fff 50%, #eef9f6 100%);
}

.profile-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 18px;
}

.profile-main h1 {
  margin: 0;
  color: #263e39;
  font-size: 24px;
}

.profile-main p {
  margin: 5px 0 10px;
  color: #71807d;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.profile-panel :deep(.ant-card-body) {
  padding: 6px 12px 12px;
}

.profile-link {
  padding: 14px 10px !important;
  border-radius: 9px;
  cursor: pointer;
}

.profile-link:hover {
  background: #f5faf8;
}

.profile-link :deep(.ant-list-item-meta-avatar) {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: #178f80;
  font-size: 17px;
  border-radius: 10px;
  background: #e8f5f2;
}

.danger-link :deep(.ant-list-item-meta-avatar),
.danger-link :deep(.ant-list-item-meta-title) {
  color: #d54c4c;
}

.profile-link > .anticon-right {
  margin-left: 10px;
  color: #b3bfbc;
  font-size: 11px;
}

@media (max-width: 700px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-hero :deep(.ant-card-body) {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
