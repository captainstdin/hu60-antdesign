<template>
  <PageState :loading="loading" :error="error" :empty="!loading && !error && !user" @retry="loadUser">
    <a-card v-if="user" class="surface-card user-card" :bordered="false">
      <div class="user-cover">
        <UserAvatar :avatar="user._u_avatar" :uid="user.uid || props.uid" :size="88" shape="square" />
      </div>
      <div class="user-info">
        <a-space wrap>
          <a-tag color="cyan">社区成员</a-tag>
          <a-tag v-if="relationState('blockPostStat')" color="red">发言受限</a-tag>
        </a-space>
        <h1>{{ user.name || user._u_name || `UID ${props.uid}` }}</h1>
        <p class="uid">UID {{ user.uid || props.uid }}</p>

        <a-descriptions class="user-descriptions" bordered :column="1">
          <a-descriptions-item label="个性签名">
            {{ user.signature || user.sign || user._u_signature || '这个人很低调，还没有留下签名。' }}
          </a-descriptions-item>
          <a-descriptions-item label="联系方式">
            {{ user.contact || user._u_contact || '未公开' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="user.regtime" label="注册时间">
            {{ formatTime(user.regtime) }}
          </a-descriptions-item>
        </a-descriptions>

        <a-space class="user-actions" wrap>
          <a-button @click="searchUser"><SearchOutlined /> 查看 TA 的帖子</a-button>
          <a-button @click="searchUserReplies"><CommentOutlined /> 查看 TA 的回复</a-button>
          <a-button type="primary" @click="sendMessage"><MailOutlined /> 发送内信</a-button>
          <template v-if="!isSelf">
            <a-button
              :type="relationState('isFollow') ? 'default' : 'primary'"
              :loading="relationLoading === 'follow'"
              @click="toggleFollow"
            >
              <UserDeleteOutlined v-if="relationState('isFollow')" />
              <UserAddOutlined v-else />
              {{ relationState('isFollow') ? '取消关注' : '关注 TA' }}
            </a-button>

            <a-dropdown placement="bottomRight">
              <a-button :loading="Boolean(relationLoading) && relationLoading !== 'follow'">
                更多 <DownOutlined />
              </a-button>
              <template #overlay>
                <a-menu @click="handleRelationshipMenu">
                  <a-menu-item key="block" :danger="!relationState('isBlock')">
                    <StopOutlined /> {{ relationState('isBlock') ? '取消屏蔽' : '屏蔽用户' }}
                  </a-menu-item>
                  <a-menu-item key="no_disturb">
                    <BellOutlined /> {{ relationState('isNoDisturb') ? '取消免打扰' : '设为免打扰' }}
                  </a-menu-item>
                  <a-menu-item key="hideUserCSS">
                    <EyeInvisibleOutlined /> {{ relationState('hideUserCSS') ? '显示小尾巴' : '屏蔽小尾巴' }}
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </a-space>
      </div>
    </a-card>
  </PageState>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  BellOutlined,
  CommentOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  MailOutlined,
  SearchOutlined,
  StopOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { authDialog } from '../stores/authDialog'
import { session } from '../stores/session'
import { formatTime } from '../utils/date'

const props = defineProps({ uid: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const user = ref(null)
const loading = ref(true)
const error = ref('')
const relationLoading = ref('')
const isSelf = computed(() => String(props.uid) === String(session.state.user?.uid))

async function loadUser() {
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getUser(props.uid)
    if (result?.error) throw new Error(result.errInfo?.message || '用户不存在')
    user.value = result
  } catch (reason) {
    error.value = reason?.message || '用户资料加载失败'
  } finally {
    loading.value = false
  }
}

function searchUser() {
  const username = user.value?.name || user.value?._u_name
  router.push({ name: 'search', query: { username } })
}

function searchUserReplies() {
  const username = user.value?.name || user.value?._u_name
  router.push({ name: 'search', query: { username, searchType: 'reply' } })
}

function sendMessage() {
  router.push({
    name: 'messages',
    query: {
      composeUid: user.value?.uid || props.uid,
      composeName: user.value?.name || user.value?._u_name || '',
    },
  })
}

function relationState(name) {
  return Boolean(user.value?.[`_u_${name}`] ?? user.value?.[name] ?? user.value?.uinfo?.[name])
}

function requireLogin() {
  if (session.isLoggedIn.value) return true
  authDialog.show(route.fullPath)
  return false
}

async function setRelationship(action, loadingKey, successText) {
  if (!requireLogin()) return
  relationLoading.value = loadingKey
  try {
    const result = await forumApi.setRelationship(user.value?.uid || props.uid, action)
    if (result.success === false) throw new Error(result.message || result.notice || '关系操作失败')
    message.success(successText)
    await loadUser()
  } catch (reason) {
    message.error(reason?.message || '关系操作失败')
  } finally {
    relationLoading.value = ''
  }
}

function toggleFollow() {
  const following = relationState('isFollow')
  setRelationship(following ? 'unfollow' : 'follow', 'follow', following ? '已取消关注' : '已关注')
}

function handleRelationshipMenu({ key }) {
  if (key === 'block') {
    const blocked = relationState('isBlock')
    setRelationship(blocked ? 'unblock' : 'block', key, blocked ? '已取消屏蔽' : '已屏蔽该用户')
  } else if (key === 'no_disturb') {
    setRelationship('no_disturb', key, relationState('isNoDisturb') ? '已取消免打扰' : '已设为免打扰')
  } else if (key === 'hideUserCSS') {
    setRelationship('hideUserCSS', key, relationState('hideUserCSS') ? '已显示该用户小尾巴' : '已屏蔽该用户小尾巴')
  }
}

watch(() => props.uid, loadUser, { immediate: true })
</script>

<style scoped>
.user-card {
  overflow: hidden;
}

.user-card :deep(.ant-card-body) {
  padding: 0;
}

.user-cover {
  display: flex;
  justify-content: center;
  padding: 44px 20px 0;
  background: var(--user-cover-bg);
}

.user-cover :deep(.ant-avatar) {
  transform: translateY(32px);
  border: 5px solid var(--avatar-ring);
  box-shadow: var(--shadow-soft);
}

:global(html[data-theme="cyberpunk"]) .user-cover {
  background-position: -1px -1px, -1px -1px, center;
  background-size: 48px 48px, 48px 48px, auto;
}

.user-info {
  padding: 48px 34px 34px;
  text-align: center;
}

.user-info h1 {
  margin: 8px 0 0;
  color: var(--text-heading);
  font-size: 25px;
}

.user-info .uid {
  margin: 4px 0 24px;
  color: var(--muted);
  font-size: 12px;
}

.user-descriptions {
  max-width: 620px;
  margin: 0 auto;
  text-align: left;
}

.user-actions {
  margin-top: 24px;
}
</style>
