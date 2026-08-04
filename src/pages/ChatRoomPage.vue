<template>
  <div class="chat-room-page">
    <header class="chat-header">
      <div>
        <a-button type="text" aria-label="返回聊天室列表" @click="router.push('/chat')"><LeftOutlined /></a-button>
        <h1>{{ props.room }}</h1>
      </div>
      <div class="chat-header-actions">
        <span>自动刷新</span>
        <a-switch v-model:checked="autoRefresh" size="small" />
        <a-tooltip title="刷新消息">
          <a-button aria-label="刷新消息" :loading="loading" @click="loadRoom"><ReloadOutlined /></a-button>
        </a-tooltip>
      </div>
    </header>

    <PageState
      :loading="loading && !messages.length"
      :error="error"
      :empty="!loading && !error && messages.length === 0"
      empty-text="聊天室里还没有消息"
      @retry="loadRoom"
    >
      <section class="chat-stream" aria-live="polite">
        <article v-for="(item, index) in messages" :key="messageId(item, index)" class="chat-message">
          <button class="chat-avatar" type="button" @click="openUser(item.uid)">
            <UserAvatar :avatar="item._u_avatar" :uid="item.uid" :size="38" />
          </button>
          <div class="chat-bubble">
            <header>
              <button type="button" @click="openUser(item.uid)">{{ authorName(item) }}</button>
              <span>#{{ floorNumber(item, index) }}</span>
              <time>{{ formatTime(item.ctime || item.ztime) }}</time>
            </header>
            <RichContent :html="messageContent(item)" collapsible />
            <button class="chat-at" type="button" @click="quoteUser(item)">@Ta</button>
          </div>
        </article>
      </section>

      <div v-if="maxPage > 1" class="chat-pagination">
        <a-button :disabled="page <= 1" @click="goPage(page - 1)"><LeftOutlined /> 上一页</a-button>
        <span>{{ page }} / {{ maxPage }}</span>
        <a-button :disabled="page >= maxPage" @click="goPage(page + 1)">下一页 <RightOutlined /></a-button>
      </div>
    </PageState>

    <section class="chat-composer">
      <ContentEditor v-model="content" :disabled="sending" :min-rows="4" placeholder="发送消息……" />
      <div>
        <a-button type="primary" :loading="sending" @click="sendMessage">
          <SendOutlined /> 发送
        </a-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { LeftOutlined, ReloadOutlined, RightOutlined, SendOutlined } from '@ant-design/icons-vue'
import ContentEditor from '../components/ContentEditor.vue'
import PageState from '../components/PageState.vue'
import RichContent from '../components/RichContent.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { formatTime } from '../utils/date'

const props = defineProps({ room: { type: String, required: true } })
const router = useRouter()
const messages = ref([])
const page = ref(1)
const maxPage = ref(1)
const token = ref('')
const content = ref('')
const loading = ref(true)
const sending = ref(false)
const error = ref('')
const autoRefresh = ref(true)
let refreshTimer

function normalizeMessages(result) {
  return result.chatList || result.chatContents || result.tContents || result.contents || result.messages || result.list || []
}

function authorName(item) {
  return item.uinfo?.name || item._u_name || item.name || `UID ${item.uid || '--'}`
}

function messageContent(item) {
  return typeof item.content === 'string' ? item.content : typeof item.msg === 'string' ? item.msg : ''
}

function floorNumber(item, index) {
  return item.floor ?? item.floor_num ?? (page.value - 1) * 30 + index + 1
}

function messageId(item, index) {
  return item.id || item.chat_id || `${item.uid}-${item.ctime}-${index}`
}

function openUser(uid) {
  if (uid) router.push({ name: 'user', params: { uid } })
}

async function loadRoom(silent = false) {
  if (!silent) loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getChatRoom(props.room, page.value)
    messages.value = normalizeMessages(result)
    token.value = result.token || token.value
    page.value = Number(result.currPage || page.value)
    maxPage.value = Number(result.maxPage || page.value)
  } catch (reason) {
    if (!silent) error.value = reason?.message || '聊天室消息加载失败'
  } finally {
    loading.value = false
  }
}

function goPage(nextPage) {
  page.value = nextPage
  loadRoom()
}

function quoteUser(item) {
  content.value += `${content.value ? '\n' : ''}@${authorName(item)} `
}

async function sendMessage() {
  if (!content.value.trim()) {
    message.warning('请输入消息内容')
    return
  }
  sending.value = true
  try {
    const result = await forumApi.sendChatMessage(props.room, content.value, token.value)
    if (result.success === false) throw new Error(result.notice || '消息发送失败')
    content.value = ''
    message.success('消息已发送')
    page.value = 1
    await loadRoom(true)
  } catch (reason) {
    message.error(reason?.message || '消息发送失败')
  } finally {
    sending.value = false
  }
}

function restartTimer() {
  window.clearInterval(refreshTimer)
  if (autoRefresh.value) refreshTimer = window.setInterval(() => loadRoom(true), 20_000)
}

watch(() => props.room, () => {
  page.value = 1
  messages.value = []
  loadRoom()
}, { immediate: true })
watch(autoRefresh, restartTimer, { immediate: true })
onUnmounted(() => window.clearInterval(refreshTimer))
</script>

<style scoped>
.chat-room-page {
  overflow: hidden;
  border: 1px solid #dfe7e5;
  border-radius: 6px;
  background: #fff;
  box-shadow: var(--shadow);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 62px;
  padding: 9px 16px;
  border-bottom: 1px solid #e5ebe9;
  background: #f7faf9;
}

.chat-header > div,
.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.chat-header h1 {
  margin: 0;
  color: #29423d;
  font-size: 18px;
}

.chat-header-actions span {
  color: #7c8b88;
  font-size: 12px;
}

.chat-stream {
  display: flex;
  min-height: 360px;
  max-height: 66vh;
  overflow-y: auto;
  flex-direction: column;
  padding: 18px;
  gap: 16px;
}

.chat-message {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
}

.chat-avatar,
.chat-bubble header button,
.chat-at {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.chat-bubble {
  min-width: 0;
  padding: 10px 13px 7px;
  border: 1px solid #e2e9e7;
  border-radius: 6px;
  background: #fbfdfc;
}

.chat-bubble header {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  color: #94a09d;
  font-size: 11px;
  gap: 8px;
}

.chat-bubble header button {
  color: #28796e;
  font-size: 12px;
  font-weight: 650;
}

.chat-at {
  display: block;
  margin-left: auto;
  color: #65807b;
  font-size: 11px;
}

.chat-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  color: #7d8b88;
  font-size: 12px;
  border-top: 1px solid #e8eeec;
  gap: 10px;
}

.chat-composer {
  padding: 14px 16px 16px;
  border-top: 1px solid #dfe7e5;
  background: #f8faf9;
}

.chat-composer > div:last-child {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

@media (max-width: 620px) {
  .chat-header {
    align-items: flex-start;
  }

  .chat-header-actions > span,
  .chat-header-actions > .ant-switch {
    display: none;
  }

  .chat-stream {
    padding: 13px 10px;
  }
}
</style>
