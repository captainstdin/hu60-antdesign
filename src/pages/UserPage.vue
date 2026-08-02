<template>
  <PageState :loading="loading" :error="error" :empty="!loading && !error && !user" @retry="loadUser">
    <a-card v-if="user" class="surface-card user-card" :bordered="false">
      <div class="user-cover">
        <UserAvatar :avatar="user._u_avatar" :uid="user.uid || props.uid" :size="88" shape="square" />
      </div>
      <div class="user-info">
        <a-tag color="cyan">社区成员</a-tag>
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

        <a-space class="user-actions">
          <a-button @click="searchUser"><SearchOutlined /> 查看 TA 的帖子</a-button>
          <a-button disabled><MailOutlined /> 发送内信（待开发）</a-button>
        </a-space>
      </div>
    </a-card>
  </PageState>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { MailOutlined, SearchOutlined } from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { formatTime } from '../utils/date'

const props = defineProps({ uid: { type: String, required: true } })
const router = useRouter()
const user = ref(null)
const loading = ref(true)
const error = ref('')

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
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.4), transparent 12rem),
    linear-gradient(135deg, #bfe7df, #64b8a9);
}

.user-cover :deep(.ant-avatar) {
  transform: translateY(32px);
  border: 5px solid #fff;
  box-shadow: 0 10px 24px rgba(25, 71, 63, 0.16);
}

.user-info {
  padding: 48px 34px 34px;
  text-align: center;
}

.user-info h1 {
  margin: 8px 0 0;
  color: #273e39;
  font-size: 25px;
}

.user-info .uid {
  margin: 4px 0 24px;
  color: #82908d;
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
