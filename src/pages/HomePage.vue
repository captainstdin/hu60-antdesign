<template>
  <a-card class="surface-card home-card" :bordered="false">
    <div class="home-hero">
      <div>
        <a-tag color="cyan">HU60</a-tag>
        <h1>发现社区里的新鲜事</h1>
        <p>和小老虎们一起分享见闻、交流想法。</p>
      </div>
      <div class="home-hero-actions">
        <a-button :loading="refreshing" @click="loadTopics(true)">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button type="primary" @click="router.push('/publish')">
          <template #icon><EditOutlined /></template>
          发布帖子
        </a-button>
      </div>
    </div>

    <div class="home-filter">
      <a-input-search
        v-model:value="keywords"
        allow-clear
        size="large"
        placeholder="搜索感兴趣的帖子"
        enter-button="搜索"
        @search="search"
      />
    </div>

    <div class="section-bar">
      <div>
        <FireOutlined />
        <strong>最新话题</strong>
      </div>
      <span v-if="topics.length">已加载 {{ topics.length }} 条</span>
    </div>

    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && topics.length === 0"
      empty-text="暂时还没有新话题"
      @retry="loadTopics(true)"
    >
      <TopicList :topics="topics" />
      <div v-if="topics.length" class="load-more-row">
        <a-button v-if="hasNextPage" :loading="loadingMore" @click="loadMore">加载更多</a-button>
        <span v-else class="list-end">已经到底啦</span>
      </div>
    </PageState>
  </a-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EditOutlined, FireOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import PageState from '../components/PageState.vue'
import TopicList from '../components/TopicList.vue'
import { forumApi } from '../services/forum'

const router = useRouter()
const topics = ref([])
const page = ref(1)
const hasNextPage = ref(false)
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const error = ref('')
const keywords = ref('')

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

function search(value) {
  const query = String(value || '').trim()
  if (!query) return
  router.push({ name: 'search', query: { keywords: query } })
}

onMounted(() => loadTopics())
</script>

<style scoped>
.home-card :deep(.ant-card-body) {
  padding: 0;
}

.home-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 26px 22px;
  gap: 20px;
  background:
    radial-gradient(circle at 92% 20%, rgba(23, 143, 128, 0.14), transparent 11rem),
    linear-gradient(140deg, #fff 45%, #f0faf7 100%);
}

.home-hero h1 {
  margin: 11px 0 5px;
  color: #203a35;
  font-size: 25px;
}

.home-hero p {
  margin: 0;
  color: #71807d;
}

.home-hero-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
}

.home-filter {
  padding: 0 26px 22px;
  background: linear-gradient(140deg, #fff 45%, #f0faf7 100%);
}

.section-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: 0 22px;
  color: #354b47;
  border-top: 1px solid #e5eeeb;
  border-bottom: 1px solid #e5eeeb;
}

.section-bar > div {
  display: flex;
  align-items: center;
  color: #da7e35;
  gap: 9px;
}

.section-bar strong {
  color: #354b47;
}

.section-bar > span,
.list-end {
  color: #96a29f;
  font-size: 12px;
}

@media (max-width: 620px) {
  .home-hero {
    align-items: flex-start;
    padding: 20px 18px;
  }

  .home-hero h1 {
    font-size: 21px;
  }

  .home-hero-actions .ant-btn:first-child {
    display: none;
  }

  .home-filter {
    padding: 0 18px 18px;
  }
}
</style>
