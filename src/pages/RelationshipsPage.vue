<template>
  <a-card class="surface-card relationships-card" :bordered="false">
    <div class="page-heading">
      <div>
        <h1><TeamOutlined /> 关系管理</h1>
        <p>查看关注、屏蔽和免打扰用户。</p>
      </div>
      <a-tooltip title="刷新列表">
        <a-button aria-label="刷新列表" :loading="loading" @click="loadRelationships">
          <ReloadOutlined />
        </a-button>
      </a-tooltip>
    </div>

    <a-tabs v-model:active-key="activeType" class="relationship-tabs" @change="changeType">
      <a-tab-pane v-for="item in typeOptions" :key="item.value" :tab="item.label" />
    </a-tabs>

    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && users.length === 0"
      empty-text="当前列表中还没有用户"
      @retry="loadRelationships"
    >
      <a-list class="relationship-list" :data-source="users">
        <template #renderItem="{ item }">
          <a-list-item class="relationship-row">
            <a-list-item-meta :description="signature(item)">
              <template #avatar>
                <button class="avatar-button" type="button" @click="openUser(item)">
                  <UserAvatar :avatar="item._u_avatar || item.avatar || item.user?.avatar" :uid="userId(item)" :size="46" />
                </button>
              </template>
              <template #title>
                <button class="user-name" type="button" @click="openUser(item)">
                  {{ userName(item) }}
                </button>
                <span>UID {{ userId(item) }}</span>
              </template>
            </a-list-item-meta>

            <template #actions>
              <a-button
                v-if="actionFor(item)"
                :danger="actionFor(item).danger"
                :loading="actingUid === String(userId(item))"
                @click="changeRelationship(item)"
              >
                {{ actionFor(item).label }}
              </a-button>
              <a-button @click="openUser(item)">查看资料</a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>

      <div v-if="maxPage > 1" class="relationship-pagination">
        <a-button :disabled="page <= 1" @click="goPage(page - 1)"><LeftOutlined /> 上一页</a-button>
        <span>{{ page }} / {{ maxPage }}</span>
        <a-button :disabled="page >= maxPage" @click="goPage(page + 1)">下一页 <RightOutlined /></a-button>
      </div>
    </PageState>
  </a-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { LeftOutlined, ReloadOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'

const TYPE_VALUES = ['follow', 'block', 'follow_me', 'block_me', 'no_disturb']
const typeOptions = [
  { value: 'follow', label: '我关注的' },
  { value: 'block', label: '我屏蔽的' },
  { value: 'follow_me', label: '关注我的' },
  { value: 'block_me', label: '屏蔽我的' },
  { value: 'no_disturb', label: '免打扰' },
]

const route = useRoute()
const router = useRouter()
const activeType = ref(TYPE_VALUES.includes(route.params.type) ? route.params.type : 'follow')
const users = ref([])
const page = ref(1)
const maxPage = ref(1)
const loading = ref(true)
const error = ref('')
const actingUid = ref('')
const actions = ref({})
const inverseActions = ref({})
const inverseRelationship = ref({})

function normalizeUsers(result) {
  const candidates = [
    result.userList,
    result.relationshipList,
    result.users,
    result.list,
    result.resultList,
  ]
  return candidates.find(Array.isArray) || []
}

function userId(item) {
  return item.targetUid || item.target_uid || item.uid || item.user?.uid
}

function userName(item) {
  return item._u_name || item.name || item.uinfo?.name || item.user?.name || `UID ${userId(item) || '--'}`
}

function signature(item) {
  return item._u_signature || item.signature || item.uinfo?.signature || '暂无签名'
}

function state(item, name) {
  return Boolean(item[`_u_${name}`] ?? item[name] ?? item.uinfo?.[name])
}

function actionFor(item) {
  const uid = userId(item)
  const useInverse = Boolean(inverseRelationship.value?.[uid])
  const serverActions = useInverse ? inverseActions.value : actions.value
  const serverAction = Object.entries(serverActions || {})[0]
  if (serverAction) {
    return {
      action: serverAction[0],
      label: serverAction[1],
      danger: serverAction[0] === 'block',
    }
  }

  if (activeType.value === 'follow') return { action: 'unfollow', label: '取消关注' }
  if (activeType.value === 'block') return { action: 'unblock', label: '取消屏蔽' }
  if (activeType.value === 'no_disturb') return { action: 'no_disturb', label: '取消免打扰' }
  if (activeType.value === 'follow_me') {
    return state(item, 'isFollow')
      ? { action: 'unfollow', label: '取消关注' }
      : { action: 'follow', label: '也关注 TA' }
  }
  if (activeType.value === 'block_me') {
    return state(item, 'isBlock')
      ? { action: 'unblock', label: '取消互相屏蔽' }
      : { action: 'block', label: '屏蔽对方', danger: true }
  }
  return null
}

async function loadRelationships() {
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getRelationships(activeType.value, page.value)
    if (result?.error) throw new Error(result.errInfo?.message || result.notice || '关系列表加载失败')
    users.value = normalizeUsers(result)
    actions.value = result.actions || {}
    inverseActions.value = result.inverseActions || {}
    inverseRelationship.value = result.inverseRelationship || {}
    page.value = Number(result.currPage || result.page || page.value)
    maxPage.value = Number(result.maxPage || page.value)
  } catch (reason) {
    error.value = reason?.message || '关系列表加载失败'
  } finally {
    loading.value = false
  }
}

function changeType(type) {
  page.value = 1
  router.replace({ name: 'relationships', params: { type } })
}

function goPage(nextPage) {
  page.value = nextPage
  loadRelationships()
}

function openUser(item) {
  const uid = userId(item)
  if (uid) router.push({ name: 'user', params: { uid } })
}

async function changeRelationship(item) {
  const action = actionFor(item)
  const uid = userId(item)
  if (!action || !uid) return
  actingUid.value = String(uid)
  try {
    const result = await forumApi.setRelationship(uid, action.action)
    if (result.success === false) throw new Error(result.message || result.notice || '关系操作失败')
    message.success(`${action.label}成功`)
    await loadRelationships()
  } catch (reason) {
    message.error(reason?.message || '关系操作失败')
  } finally {
    actingUid.value = ''
  }
}

watch(
  () => route.params.type,
  (type) => {
    activeType.value = TYPE_VALUES.includes(type) ? type : 'follow'
    page.value = 1
    loadRelationships()
  },
  { immediate: true },
)
</script>

<style scoped>
.relationships-card :deep(.ant-card-body) {
  padding: 0;
}

.relationships-card .page-heading {
  margin: 0;
  padding: 24px 24px 8px;
}

.relationship-tabs {
  padding: 0 24px;
}

.relationship-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.relationship-row {
  padding: 16px 24px !important;
}

.relationship-row :deep(.ant-list-item-meta-title) {
  display: flex;
  align-items: baseline;
  gap: 9px;
}

.relationship-row :deep(.ant-list-item-meta-title span) {
  color: #96a19f;
  font-size: 11px;
  font-weight: 400;
}

.avatar-button,
.user-name {
  padding: 0;
  color: #26796e;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.user-name {
  font-weight: 650;
}

.relationship-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #778783;
  font-size: 12px;
  border-top: 1px solid #e8eeec;
  gap: 12px;
}

@media (max-width: 620px) {
  .relationship-tabs {
    padding: 0 14px;
  }

  .relationship-tabs :deep(.ant-tabs-nav-wrap) {
    overflow-x: auto;
  }

  .relationship-row {
    align-items: flex-start;
    padding: 14px 16px !important;
  }

  .relationship-row :deep(.ant-list-item-action) {
    margin-left: 8px;
  }

  .relationship-row :deep(.ant-list-item-action > li:last-child) {
    display: none;
  }
}
</style>
