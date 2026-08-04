<template>
  <div class="message-chat-page">
    <header class="conversation-header">
      <a-button type="text" aria-label="返回内信列表" @click="router.push('/messages')"><LeftOutlined /></a-button>
      <div>
        <h1>{{ peerName }}</h1>
        <span>UID {{ props.uid }}</span>
      </div>
      <a-button :loading="loading" @click="loadConversation"><ReloadOutlined /> 刷新</a-button>
    </header>

    <PageState
      :loading="loading && !items.length"
      :error="error"
      :empty="!loading && !error && items.length === 0"
      empty-text="还没有内信记录"
      @retry="loadConversation"
    >
      <section class="conversation-stream">
        <article v-for="(item, index) in items" :key="item.id || item.msg_id || index" :class="{ mine: isMine(item) }">
          <UserAvatar :avatar="item._u_avatar" :uid="senderUid(item)" :size="34" />
          <div>
            <header>
              <span>{{ senderName(item) }}</span>
              <time>{{ formatTime(item.ctime || item.time) }}</time>
            </header>
            <RichContent :html="messageContent(item)" />
          </div>
        </article>
      </section>
      <div v-if="maxPage > 1" class="conversation-pagination">
        <a-button :disabled="page <= 1" @click="goPage(page - 1)">上一页</a-button>
        <span>{{ page }} / {{ maxPage }}</span>
        <a-button :disabled="page >= maxPage" @click="goPage(page + 1)">下一页</a-button>
      </div>
    </PageState>

    <section class="conversation-composer">
      <ContentEditor v-model="content" :disabled="sending" :min-rows="5" placeholder="回复内信……" />
      <a-button type="primary" :loading="sending" @click="send"><SendOutlined /> 发送</a-button>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { LeftOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons-vue'
import ContentEditor from '../components/ContentEditor.vue'
import PageState from '../components/PageState.vue'
import RichContent from '../components/RichContent.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { session } from '../stores/session'
import { formatTime } from '../utils/date'

const props = defineProps({ uid: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const items = ref([])
const page = ref(1)
const maxPage = ref(1)
const content = ref('')
const loading = ref(true)
const sending = ref(false)
const error = ref('')
const peerName = computed(() => String(route.query.name || items.value.find((item) => !isMine(item))?.uinfo?.name || `UID ${props.uid}`))

function normalizeItems(result) {
  return result.msgList || result.messageList || result.messages || result.chatList || result.list || []
}

function senderUid(item) {
  return item.from_uid || item.fuid || item.uid
}

function isMine(item) {
  return String(senderUid(item)) === String(session.state.user?.uid)
}

function senderName(item) {
  return isMine(item) ? '我' : item.uinfo?.name || item._u_name || peerName.value
}

function messageContent(item) {
  return typeof item.content === 'string' ? item.content : typeof item.msg === 'string' ? item.msg : ''
}

async function loadConversation() {
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getMessageChat(props.uid, page.value)
    items.value = normalizeItems(result)
    page.value = Number(result.currPage || page.value)
    maxPage.value = Number(result.maxPage || page.value)
  } catch (reason) {
    error.value = reason?.message || '内信会话加载失败'
  } finally {
    loading.value = false
  }
}

function goPage(nextPage) {
  page.value = nextPage
  loadConversation()
}

async function send() {
  if (!content.value.trim()) {
    message.warning('请输入内信内容')
    return
  }
  sending.value = true
  try {
    const result = await forumApi.sendMessage({ uid: props.uid, content: content.value })
    if (result.success === false) throw new Error(result.notice || '内信发送失败')
    content.value = ''
    message.success('内信已发送')
    page.value = 1
    await loadConversation()
  } catch (reason) {
    message.error(reason?.message || '内信发送失败')
  } finally {
    sending.value = false
  }
}

watch(() => props.uid, () => {
  page.value = 1
  items.value = []
  loadConversation()
}, { immediate: true })
</script>

<style scoped>
.message-chat-page {
  overflow: hidden;
  border: 1px solid #dfe7e5;
  border-radius: 6px;
  background: #fff;
  box-shadow: var(--shadow);
}

.conversation-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-height: 64px;
  padding: 8px 14px;
  border-bottom: 1px solid #e4ebe9;
  background: #f7faf9;
  gap: 8px;
}

.conversation-header h1 {
  margin: 0;
  color: #2e4641;
  font-size: 17px;
}

.conversation-header span {
  color: #8b9996;
  font-size: 10px;
}

.conversation-stream {
  display: flex;
  min-height: 360px;
  max-height: 65vh;
  overflow-y: auto;
  flex-direction: column;
  padding: 18px;
  gap: 15px;
}

.conversation-stream article {
  display: grid;
  grid-template-columns: 34px minmax(0, 76%);
  align-items: start;
  gap: 8px;
}

.conversation-stream article.mine {
  grid-template-columns: minmax(0, 76%) 34px;
  justify-content: end;
}

.conversation-stream article.mine > .ant-avatar {
  grid-column: 2;
}

.conversation-stream article.mine > div {
  grid-row: 1;
  grid-column: 1;
  background: #eaf6f3;
}

.conversation-stream article > div {
  min-width: 0;
  padding: 9px 12px;
  border: 1px solid #e1e8e6;
  border-radius: 6px;
  background: #fafcfc;
}

.conversation-stream header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  color: #7b8b87;
  font-size: 10px;
  gap: 12px;
}

.conversation-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  color: #82908d;
  font-size: 12px;
  border-top: 1px solid #e6ecea;
  gap: 9px;
}

.conversation-composer {
  padding: 14px 16px 16px;
  border-top: 1px solid #dfe7e5;
  background: #f8faf9;
}

.conversation-composer > .ant-btn {
  display: block;
  margin: 10px 0 0 auto;
}
</style>
