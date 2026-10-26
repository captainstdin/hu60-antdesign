<template>
  <a-modal
    v-model:open="open"
    :width="420"
    :footer="null"
    centered
    destroy-on-close
    title="用户资料"
    wrap-class-name="user-info-modal"
    @cancel="close"
  >
    <a-spin :spinning="loading">
      <a-alert
        v-if="error"
        type="error"
        show-icon
        :message="error"
        class="user-modal-alert"
      >
        <template #action>
          <a-button size="small" danger @click="loadUser(uid)">重试</a-button>
        </template>
      </a-alert>

      <template v-else-if="user">
        <div class="user-modal-head">
          <UserAvatar :avatar="user._u_avatar" :uid="user.uid || uid" :size="56" />
          <div class="user-modal-ident">
            <strong>{{ displayName }}</strong>
            <span>UID {{ user.uid || uid }}</span>
          </div>
        </div>

        <a-space class="user-modal-tags" wrap>
          <a-tag color="cyan">社区成员</a-tag>
          <a-tag v-if="relationState('blockPostStat')" color="red">发言受限</a-tag>
        </a-space>

        <a-descriptions :column="1" size="small" class="user-modal-desc">
          <a-descriptions-item label="个性签名">
            {{ user.signature || user._u_signature || '这个人很低调，还没有留下签名。' }}
          </a-descriptions-item>
          <a-descriptions-item label="联系方式">
            {{ user.contact || user._u_contact || '未公开' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="user.regtime || user._u_regtime" label="注册时间">
            {{ formatTime(user.regtime || user._u_regtime) }}
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-spin>

    <div v-if="user" class="user-modal-footer">
      <a-button type="link" size="small" class="user-modal-view" @click="goUser">
        查看
        <RightOutlined />
      </a-button>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { RightOutlined } from '@ant-design/icons-vue'
import UserAvatar from './UserAvatar.vue'
import { forumApi } from '../services/forum'
import { formatTime } from '../utils/date'

const router = useRouter()
const open = ref(false)
const loading = ref(false)
const error = ref('')
const user = ref(null)
const uid = ref('')
let requestId = 0

const displayName = computed(() => (
  user.value?.name || user.value?._u_name || `UID ${uid.value || '--'}`
))

function relationState(name) {
  return Boolean(user.value?.[`_u_${name}`] ?? user.value?.[name] ?? user.value?.uinfo?.[name])
}

async function loadUser(targetUid) {
  if (!targetUid) return
  const current = ++requestId
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getUser(targetUid)
    if (current !== requestId) return
    if (result?.error) throw new Error(result.errInfo?.message || result.notice || '用户不存在')
    user.value = result
  } catch (reason) {
    if (current !== requestId) return
    user.value = null
    error.value = reason?.message || '用户资料加载失败'
  } finally {
    if (current === requestId) loading.value = false
  }
}

/** 打开指定用户的资料弹窗；重复点击同一用户会复用已有数据。 */
function show(targetUid) {
  if (!targetUid) return
  open.value = true
  if (String(targetUid) === String(uid.value) && user.value) return
  uid.value = targetUid
  user.value = null
  loadUser(targetUid)
}

function close() {
  open.value = false
}

function goUser() {
  const targetUid = user.value?.uid || uid.value
  if (!targetUid) return
  open.value = false
  router.push({ name: 'user', params: { uid: targetUid } })
}

defineExpose({ show, close })
</script>

<style scoped>
.user-modal-head {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
}

.user-modal-ident {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.user-modal-ident strong {
  overflow: hidden;
  color: var(--text-heading);
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-modal-ident span {
  color: var(--muted);
  font-size: 12px;
}

.user-modal-tags :deep(.ant-tag) {
  margin: 0;
}

.user-modal-desc {
  margin-top: 10px;
}

.user-modal-desc :deep(.ant-descriptions-item-label) {
  width: 76px;
  color: var(--muted);
}

.user-modal-alert {
  margin-bottom: 8px;
}

.user-modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--line-soft);
}

.user-modal-view {
  padding-inline: 0;
  font-size: 13px;
}
</style>
