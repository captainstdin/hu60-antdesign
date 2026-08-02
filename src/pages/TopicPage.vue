<template>
  <div class="topic-page">
    <PageState :loading="loading" :error="error" :empty="!loading && !error && !topic" @retry="loadTopic(true)">
      <template v-if="topic">
        <a-card class="surface-card topic-summary" :bordered="false">
          <a-breadcrumb class="topic-breadcrumb">
            <a-breadcrumb-item><router-link to="/">论坛</router-link></a-breadcrumb-item>
            <a-breadcrumb-item>{{ topic.tMeta?.forum_name || '话题' }}</a-breadcrumb-item>
          </a-breadcrumb>

          <div class="topic-title-row">
            <div>
              <div class="topic-tags">
                <a-tag v-if="Number(topic.tMeta?.essence) === 1" color="red">精华</a-tag>
                <a-tag v-if="Number(topic.tMeta?.locked) === 1">已锁定</a-tag>
              </div>
              <h1>{{ topic.tMeta?.title || '帖子详情' }}</h1>
            </div>
            <a-button type="primary" @click="focusReply">
              <template #icon><MessageOutlined /></template>
              回复帖子
            </a-button>
          </div>

          <div class="topic-stats">
            <span><ClockCircleOutlined /> {{ formatTime(topic.tMeta?.ctime) }}</span>
            <span><EyeOutlined /> {{ topic.tMeta?.read_count || 0 }} 次浏览</span>
            <span><MessageOutlined /> {{ Math.max(0, Number(topic.floorCount || 1) - 1) }} 条回复</span>
          </div>
        </a-card>

        <section class="floors" aria-label="帖子楼层">
          <article v-for="(item, index) in contents" :key="item.id || `${item.uid}-${item.ctime}-${index}`">
            <a-card class="surface-card floor-card" :class="{ 'owner-floor': isOwner(item) }" :bordered="false">
              <div class="floor-layout">
                <aside class="floor-user">
                  <button type="button" class="avatar-link" @click="openUser(item.uid)">
                    <UserAvatar :avatar="item._u_avatar" :uid="item.uid" :size="52" />
                  </button>
                  <button type="button" class="floor-author" @click="openUser(item.uid)">
                    {{ item.uinfo?.name || item._u_name || `UID ${item.uid}` }}
                  </button>
                  <a-tag v-if="isOwner(item)" color="cyan">楼主</a-tag>
                  <small v-if="item.uinfo?.sign || item._u_signature">
                    {{ item.uinfo?.sign || item._u_signature }}
                  </small>
                </aside>

                <div class="floor-main">
                  <header class="floor-header">
                    <div>
                      <strong v-if="index === 0">主楼</strong>
                      <span>{{ formatTime(item.ctime) }}</span>
                    </div>
                    <span class="floor-number">#{{ floorNumber(item, index) }}</span>
                  </header>

                  <div class="rich-content" v-html="safeContent(item.content)" />

                  <footer class="floor-actions">
                    <a-button type="link" size="small" @click="quoteUser(item)">@Ta</a-button>
                  </footer>
                </div>
              </div>
            </a-card>
          </article>
        </section>

        <div v-if="contents.length" class="topic-load-row">
          <a-button v-if="hasNextPage" :loading="loadingMore" @click="loadMore">继续加载回复</a-button>
          <span v-else>全部回复已加载</span>
        </div>

        <a-card ref="replyCard" class="surface-card reply-card" :bordered="false">
          <div class="reply-title">
            <div>
              <h2>回复帖子</h2>
              <p v-if="isLoggedIn">友善交流，让讨论更有价值。</p>
              <p v-else>登录后才可以参与回复。</p>
            </div>
            <a-tag v-if="Number(topic.tMeta?.locked) === 1" color="default">帖子已锁定</a-tag>
          </div>

          <template v-if="!isLoggedIn">
            <a-button type="primary" @click="openLogin">登录后回复</a-button>
          </template>
          <template v-else-if="Number(topic.tMeta?.locked) !== 1">
            <a-textarea
              ref="replyInput"
              v-model:value="replyContent"
              :auto-size="{ minRows: 5, maxRows: 14 }"
              placeholder="写下你的回复……"
            />
            <div class="reply-submit">
              <span>{{ replyContent.length }} 字</span>
              <a-button type="primary" :loading="replying" @click="submitReply">
                <template #icon><SendOutlined /></template>
                发表回复
              </a-button>
            </div>
          </template>
        </a-card>
      </template>
    </PageState>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  SendOutlined,
} from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { session } from '../stores/session'
import { sanitizeHtml } from '../utils/content'
import { formatTime } from '../utils/date'

const props = defineProps({ id: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const topic = ref(null)
const contents = ref([])
const currentPage = ref(1)
const maxPage = ref(1)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const replyContent = ref('')
const replying = ref(false)
const replyInput = ref()
const replyCard = ref()
const isLoggedIn = session.isLoggedIn
const hasNextPage = computed(() => currentPage.value < maxPage.value)

function safeContent(content) {
  return sanitizeHtml(content)
}

function isOwner(item) {
  return String(item.uid) === String(topic.value?.tMeta?.uid)
}

function floorNumber(item, index) {
  if (item.floor !== undefined) return item.floor
  if (item.floor_num !== undefined) return item.floor_num
  return index
}

function openUser(uid) {
  if (uid) router.push({ name: 'user', params: { uid } })
}

async function loadTopic(reset = false) {
  if (reset) {
    currentPage.value = 1
    loading.value = true
  }
  error.value = ''

  try {
    const result = await forumApi.getTopic(props.id, currentPage.value)
    if (result?.error) throw new Error(result.errInfo?.message || result.notice || '帖子不存在或无法访问')

    topic.value = currentPage.value === 1
      ? result
      : { ...topic.value, ...result, tMeta: topic.value?.tMeta || result.tMeta }
    contents.value = currentPage.value === 1
      ? result.tContents || []
      : [...contents.value, ...(result.tContents || [])]
    currentPage.value = Number(result.currPage || currentPage.value)
    maxPage.value = Number(result.maxPage || currentPage.value)
  } catch (reason) {
    error.value = reason?.message || '帖子加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasNextPage.value) return
  loadingMore.value = true
  currentPage.value += 1
  try {
    await loadTopic(false)
  } finally {
    loadingMore.value = false
  }
}

function openLogin() {
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

function focusReply() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  replyCard.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  nextTick(() => replyInput.value?.focus())
}

function quoteUser(item) {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  const name = item.uinfo?.name || item._u_name
  replyContent.value += `${replyContent.value ? '\n' : ''}@${name || `UID${item.uid}`} `
  focusReply()
}

async function submitReply() {
  const content = replyContent.value.trim()
  if (!content) {
    message.warning('请先写下回复内容')
    return
  }

  replying.value = true
  try {
    const result = await forumApi.replyTopic(props.id, content, topic.value?.token)
    if (result?.success === false) throw new Error(result.notice || '回复失败')
    replyContent.value = ''
    message.success('回复成功')
    await loadTopic(true)
  } catch (reason) {
    message.error(reason?.message || '回复失败，请稍后重试')
  } finally {
    replying.value = false
  }
}

watch(
  () => props.id,
  () => {
    topic.value = null
    contents.value = []
    currentPage.value = 1
    maxPage.value = 1
    loadTopic(true)
  },
  { immediate: true },
)
</script>

<style scoped>
.topic-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.topic-summary :deep(.ant-card-body) {
  padding: 25px 28px;
}

.topic-breadcrumb {
  margin-bottom: 17px;
}

.topic-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.topic-title-row h1 {
  margin: 6px 0 0;
  color: #243b37;
  font-size: 25px;
  line-height: 1.45;
}

.topic-tags:empty {
  display: none;
}

.topic-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 17px;
  color: #7d8c89;
  font-size: 12px;
  gap: 12px 22px;
}

.floors {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.floor-card :deep(.ant-card-body) {
  padding: 0;
}

.owner-floor {
  border-top: 3px solid rgba(23, 143, 128, 0.5);
}

.floor-layout {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  min-height: 160px;
}

.floor-user {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 24px 16px;
  border-right: 1px solid #e8eeec;
  background: #f8fbfa;
}

.avatar-link,
.floor-author {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.floor-author {
  overflow: hidden;
  max-width: 100%;
  margin: 9px 0 6px;
  color: #31514b;
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.floor-user small {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 9px;
  color: #91a09d;
  font-size: 10px;
  line-height: 1.45;
  text-align: center;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.floor-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 20px 24px 12px;
}

.floor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  color: #8a9895;
  font-size: 12px;
  border-bottom: 1px dashed #e3eae8;
}

.floor-header > div {
  display: flex;
  gap: 10px;
}

.floor-header strong {
  color: var(--brand);
}

.floor-number {
  color: #9aa6a3;
}

.rich-content {
  min-height: 70px;
  padding: 20px 0;
  color: #2f403d;
  font-size: 14px;
  line-height: 1.85;
  overflow-wrap: anywhere;
}

.rich-content :deep(img),
.rich-content :deep(video) {
  max-width: 100% !important;
  height: auto !important;
  border-radius: 10px;
}

.rich-content :deep(pre) {
  max-width: 100%;
  padding: 14px;
  overflow: auto;
  border-radius: 8px;
  background: #f2f5f4;
}

.rich-content :deep(.hu60_face) {
  width: 28px !important;
  height: 28px !important;
  vertical-align: middle;
}

.rich-content :deep(.userat),
.rich-content :deep(.userinfo) {
  color: var(--brand);
  border-radius: 4px;
  background: #e9f5f2;
}

.floor-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  border-top: 1px solid #f0f3f2;
}

.topic-load-row {
  display: flex;
  justify-content: center;
  padding: 4px 0;
  color: #96a29f;
  font-size: 12px;
}

.reply-card :deep(.ant-card-body) {
  padding: 24px 28px;
}

.reply-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 17px;
}

.reply-title h2 {
  margin: 0;
  color: #2b403c;
  font-size: 18px;
}

.reply-title p {
  margin: 4px 0 0;
  color: #84928f;
  font-size: 12px;
}

.reply-submit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 13px;
}

.reply-submit span {
  color: #98a3a0;
  font-size: 11px;
}

@media (max-width: 700px) {
  .topic-title-row h1 {
    font-size: 21px;
  }

  .topic-title-row > .ant-btn {
    display: none;
  }

  .floor-layout {
    display: block;
  }

  .floor-user {
    align-items: center;
    flex-direction: row;
    padding: 14px 18px;
    border-right: 0;
    border-bottom: 1px solid #e8eeec;
    gap: 8px;
  }

  .floor-author {
    margin: 0;
  }

  .floor-user small {
    display: none;
  }

  .floor-main {
    padding: 17px 18px 10px;
  }
}
</style>
