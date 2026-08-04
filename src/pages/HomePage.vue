<template>
  <section class="home-page">
    <div class="forum-toolbar">
      <nav class="forum-links" aria-label="论坛快捷入口">
        <strong>绿虎论坛：</strong>
        <button class="active" type="button" @click="loadTopics(true)">新帖</button>
        <span>|</span>
        <button type="button" @click="router.push('/search')">搜索</button>
        <span>|</span>
        <button type="button" @click="router.push('/publish')">发帖</button>
        <span>|</span>
        <button type="button" @click="router.push('/chat')">聊天</button>
        <template v-if="canReview">
          <span>|</span>
          <button type="button" @click="router.push('/reviews')">
            审核<span v-if="reviewCount">（{{ reviewCount }}）</span>
          </button>
        </template>
      </nav>

      <div class="toolbar-status">
        <span v-if="topics.length">{{ topics.length }} 条</span>
        <a-tooltip title="刷新帖子">
          <a-button
            type="text"
            shape="circle"
            aria-label="刷新帖子"
            :loading="refreshing"
            @click="loadTopics(true)"
          >
            <template #icon><ReloadOutlined /></template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && topics.length === 0"
      empty-text="暂时还没有新话题"
      @retry="loadTopics(true)"
    >
      <TopicList :topics="topics" />
      <div v-if="topics.length" class="home-pagination">
        <a-button v-if="hasNextPage" :loading="loadingMore" @click="loadMore">
          下一页
          <template #icon><RightOutlined /></template>
        </a-button>
        <span v-else>没有更多帖子了</span>
      </div>
    </PageState>

    <div class="directory-bar">社区入口</div>
    <nav class="community-links" aria-label="社区入口">
      <button type="button" @click="router.push('/chat')">聊天室</button>
      <button type="button" @click="router.push('/search')">帖子搜索</button>
      <button type="button" @click="router.push('/publish')">发布帖子</button>
      <button type="button" @click="router.push('/messages')">内信</button>
      <button type="button" @click="router.push('/me')">个人中心</button>
    </nav>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ReloadOutlined, RightOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import PageState from '../components/PageState.vue'
import TopicList from '../components/TopicList.vue'
import { forumApi } from '../services/forum'
import { session } from '../stores/session'
import { hasPermission, PERMISSIONS } from '../utils/permissions'

const router = useRouter()
const topics = ref([])
const page = ref(1)
const hasNextPage = ref(false)
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const error = ref('')
const reviewCount = ref(0)
const permissions = ref([])
const canReview = computed(() => (
  Boolean(session.state.user?.siteAdmin) || hasPermission(permissions.value, PERMISSIONS.reviewPost)
))

function getErrorMessage(reason) {
  return reason?.message || '话题加载失败，请稍后重试'
}

async function loadTopics(reset = false) {
  if (reset) {
    refreshing.value = topics.value.length > 0
    page.value = 1
  } else if (!topics.value.length) {
    loading.value = true
  }
  error.value = ''

  try {
    const result = await forumApi.getHome(page.value)
    topics.value = reset || page.value === 1
      ? result.newTopicList || []
      : [...topics.value, ...(result.newTopicList || [])]
    page.value = Number(result.currPage || page.value)
    hasNextPage.value = result.hasNextPage === true || page.value < Number(result.maxPage || 0)
    reviewCount.value = Number(result._myself?.countReview || 0)
    permissions.value = result._myself?.permissions || []
    if (reset && refreshing.value) message.success('已获取最新话题')
  } catch (reason) {
    error.value = getErrorMessage(reason)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasNextPage.value) return
  loadingMore.value = true
  page.value += 1
  try {
    await loadTopics(false)
  } finally {
    loadingMore.value = false
  }
}

onMounted(() => loadTopics())
</script>

<style scoped>
.home-page {
  min-height: calc(100vh - 80px);
  border-right: 1px solid #e3e7e6;
  border-left: 1px solid #e3e7e6;
  background: #fff;
  box-shadow: 0 7px 18px rgba(35, 67, 62, 0.08);
}

.forum-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 0 12px 0 18px;
  color: #237f9f;
  border-bottom: 1px solid #e2eef2;
  background: #e7f4fb;
}

.forum-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
}

.forum-links strong {
  font-weight: 600;
}

.forum-links button,
.community-links button {
  padding: 0;
  color: #237f9f;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.forum-links button:hover,
.forum-links button:focus-visible,
.community-links button:hover,
.community-links button:focus-visible {
  color: #0f665d;
  text-decoration: underline;
  outline: none;
}

.forum-links .active {
  color: #176d8e;
  font-weight: 650;
}

.toolbar-status {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  color: #7e999f;
  font-size: 12px;
  gap: 4px;
}

.toolbar-status :deep(.ant-btn) {
  color: #237f9f;
}

.home-pagination {
  display: flex;
  justify-content: center;
  padding: 18px;
  color: #9aa5a3;
  font-size: 12px;
  border-top: 1px solid #edf0ef;
}

.directory-bar {
  padding: 9px 18px;
  color: #637b77;
  font-size: 13px;
  font-weight: 650;
  border-top: 1px solid #dce7e5;
  border-bottom: 1px solid #dce7e5;
  background: #f2f7f6;
}

.community-links {
  display: flex;
  flex-wrap: wrap;
  padding: 15px 18px 24px;
  gap: 10px 26px;
  font-size: 13px;
}

@media (max-width: 620px) {
  .home-page {
    min-height: calc(100vh - 62px);
    border-right: 0;
    border-left: 0;
    box-shadow: none;
  }

  .forum-toolbar {
    padding-left: 12px;
  }

  .forum-links {
    gap: 5px;
    font-size: 13px;
  }

  .toolbar-status > span {
    display: none;
  }
}
</style>
