<template>
  <a-card class="surface-card messages-card" :bordered="false">
    <div class="page-heading">
      <div><h1><MailOutlined /> 内信</h1></div>
      <a-space>
        <a-tooltip title="刷新消息">
          <a-button aria-label="刷新消息" :loading="loading" @click="loadMessages"><ReloadOutlined /></a-button>
        </a-tooltip>
        <a-button type="primary" @click="openComposer()"><EditOutlined /> 写内信</a-button>
      </a-space>
    </div>

    <a-tabs v-model:active-key="box" class="message-tabs" @change="changeFilter">
      <a-tab-pane key="inbox" tab="收件箱" />
      <a-tab-pane key="outbox" tab="发件箱" />
      <a-tab-pane key="@">
        <template #tab>
          <a-badge :count="overview.newAtInfo || 0" :offset="[7, -2]">@提醒</a-badge>
        </template>
      </a-tab-pane>
    </a-tabs>

    <div class="message-filter">
      <a-radio-group v-model:value="readState" size="small" button-style="solid" @change="changeFilter">
        <a-radio-button value="all">全部</a-radio-button>
        <a-radio-button value="no">未读</a-radio-button>
        <a-radio-button value="yes">已读</a-radio-button>
      </a-radio-group>
      <span v-if="box === 'inbox'">{{ overview.newMsg || 0 }} 封未读</span>
    </div>

    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && items.length === 0"
      empty-text="当前没有消息"
      @retry="loadMessages"
    >
      <a-list class="message-list" :data-source="items">
        <template #renderItem="{ item, index }">
          <a-list-item
            class="message-row"
            role="button"
            tabindex="0"
            @click="openMessage(item)"
            @keydown.enter.self="openMessage(item)"
          >
            <a-list-item-meta>
              <template #avatar>
                <a-badge dot :status="isUnread(item) ? 'processing' : 'default'">
                  <UserAvatar :avatar="item._u_avatar" :uid="messageUid(item)" :size="42" />
                </a-badge>
              </template>
              <template #title>
                <span>{{ messageTitle(item) }}</span>
              </template>
              <template #description>
                <p>{{ messageSummary(item) }}</p>
              </template>
            </a-list-item-meta>
            <time>{{ formatTime(item.ctime || item.time || item.ztime) }}</time>
            <RightOutlined />
          </a-list-item>
        </template>
      </a-list>

      <div v-if="maxPage > 1" class="message-pagination">
        <a-button :disabled="page <= 1" @click="goPage(page - 1)"><LeftOutlined /> 上一页</a-button>
        <span>{{ page }} / {{ maxPage }}</span>
        <a-button :disabled="page >= maxPage" @click="goPage(page + 1)">下一页 <RightOutlined /></a-button>
      </div>
    </PageState>

    <a-modal
      v-model:open="composerOpen"
      title="写内信"
      :width="720"
      :confirm-loading="sending"
      ok-text="发送"
      cancel-text="取消"
      @ok="sendMessage"
    >
      <a-form layout="vertical">
        <a-form-item label="收件人" required>
          <a-auto-complete
            v-model:value="compose.name"
            :options="userOptions"
            :disabled="Boolean(compose.uid)"
            placeholder="输入用户名"
            @search="searchUsers"
            @select="selectUser"
          />
        </a-form-item>
        <a-form-item label="内容" required>
          <ContentEditor v-model="compose.content" :disabled="sending" :min-rows="8" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  EditOutlined,
  LeftOutlined,
  MailOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import ContentEditor from '../components/ContentEditor.vue'
import PageState from '../components/PageState.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { htmlToText } from '../utils/content'
import { formatTime } from '../utils/date'

const route = useRoute()
const router = useRouter()
const box = ref(['inbox', 'outbox', '@'].includes(route.query.box) ? route.query.box : 'inbox')
const readState = ref(['all', 'yes', 'no'].includes(route.query.state) ? route.query.state : 'all')
const items = ref([])
const overview = reactive({ newMsg: 0, newAtInfo: 0 })
const page = ref(1)
const maxPage = ref(1)
const loading = ref(true)
const error = ref('')
const composerOpen = ref(false)
const sending = ref(false)
const compose = reactive({ uid: '', name: '', content: '' })
const userOptions = ref([])
let searchTimer

function normalizeItems(result) {
  return result.msgList || result.messageList || result.messages || result.atMsgList || result.list || []
}

function messageUid(item) {
  if (box.value === 'outbox') return item.to_uid || item.tuid || item.uid
  return item.from_uid || item.fuid || item.uid
}

function messageName(item) {
  return item.uinfo?.name || item._u_name || item.from_name || item.to_name || item.name || `UID ${messageUid(item) || '--'}`
}

function messageTitle(item) {
  if (box.value === '@') return item.pos || item.title || `${messageName(item)} 提到了你`
  return box.value === 'outbox' ? `发给 ${messageName(item)}` : `来自 ${messageName(item)}`
}

function messageSummary(item) {
  const content = item.content ?? item.msg ?? item.summary ?? item.title ?? ''
  return htmlToText(typeof content === 'string' ? content : JSON.stringify(content)).slice(0, 180) || '无正文'
}

function isUnread(item) {
  return item.isread === false || Number(item.isread ?? item.read ?? item.hasread ?? 1) === 0
}

async function loadMessages() {
  loading.value = true
  error.value = ''
  try {
    const [result, status] = await Promise.all([
      forumApi.getMessages({ box: box.value, state: readState.value, page: page.value }),
      forumApi.getMessageOverview(),
    ])
    items.value = normalizeItems(result)
    page.value = Number(result.currPage || page.value)
    maxPage.value = Number(result.maxPage || page.value)
    Object.assign(overview, status._myself || status)
  } catch (reason) {
    error.value = reason?.message || '消息加载失败'
  } finally {
    loading.value = false
  }
}

function changeFilter() {
  page.value = 1
  router.replace({ query: { box: box.value, state: readState.value } })
  loadMessages()
}

function goPage(nextPage) {
  page.value = nextPage
  loadMessages()
}

async function openMessage(item) {
  const id = item.id || item.msg_id || item.message_id
  if (id && isUnread(item)) {
    try {
      await forumApi.acknowledgeMessage(id)
    } catch {
      // 详情页仍可继续打开，服务端也可能在读取详情时更新状态。
    }
  }
  if (box.value === '@') {
    const url = String(item.url || item.href || '')
    const topic = url.match(/bbs\.topic\.(\d+)/)
    if (topic) {
      const floor = url.match(/#(\d+)/)?.[1]
      router.push({ name: 'topic', params: { id: topic[1] }, hash: floor ? `#floor-${floor}` : '' })
      return
    }
  }
  const uid = messageUid(item)
  if (uid) router.push({ name: 'message-chat', params: { uid }, query: { name: messageName(item) } })
}

function openComposer(user = {}) {
  Object.assign(compose, { uid: String(user.uid || ''), name: user.name || '', content: '' })
  composerOpen.value = true
}

function searchUsers(value) {
  window.clearTimeout(searchTimer)
  userOptions.value = []
  const keyword = String(value || '').trim()
  if (!keyword) return
  searchTimer = window.setTimeout(async () => {
    try {
      const result = await forumApi.searchUsers(`*${keyword}*`)
      const users = result.userList || result.users || result.list || []
      userOptions.value = users.map((user) => ({
        value: user.name || user._u_name,
        label: `${user.name || user._u_name}（UID ${user.uid}）`,
        uid: user.uid,
      }))
    } catch {
      userOptions.value = []
    }
  }, 250)
}

function selectUser(value, option) {
  compose.uid = String(option.uid || '')
  compose.name = value
}

async function sendMessage() {
  if (!compose.name.trim() || !compose.content.trim()) {
    message.warning('请填写收件人和正文')
    return
  }
  sending.value = true
  try {
    const result = await forumApi.sendMessage(compose)
    if (result.success === false) throw new Error(result.notice || '内信发送失败')
    composerOpen.value = false
    message.success('内信已发送')
    if (compose.uid) router.push({ name: 'message-chat', params: { uid: compose.uid }, query: { name: compose.name } })
    else loadMessages()
  } catch (reason) {
    message.error(reason?.message || '内信发送失败')
  } finally {
    sending.value = false
  }
}

onMounted(loadMessages)
watch(() => [route.query.composeUid, route.query.composeName], ([uid, name]) => {
  if (uid || name) openComposer({ uid, name })
}, { immediate: true })
</script>

<style scoped>
.messages-card :deep(.ant-card-body) {
  padding: 25px;
}

.page-heading h1 {
  display: flex;
  align-items: center;
  gap: 9px;
}

.message-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 12px;
}

.message-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  color: #82908d;
  font-size: 12px;
}

.message-list {
  overflow: hidden;
  border: 1px solid #e3eae8;
  border-radius: 6px;
}

.message-row {
  padding: 14px 16px !important;
  cursor: pointer;
}

.message-row:hover,
.message-row:focus-visible {
  background: #f6fbfa;
  outline: none;
}

.message-row p {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-row > time {
  flex: 0 0 auto;
  margin: 0 14px;
  color: #8e9b98;
  font-size: 11px;
}

.message-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 16px;
  color: #7f8d8a;
  font-size: 12px;
  gap: 10px;
}

@media (max-width: 620px) {
  .messages-card :deep(.ant-card-body) {
    padding: 18px 14px;
  }

  .message-row > time {
    display: none;
  }
}
</style>
