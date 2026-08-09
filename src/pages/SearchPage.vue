<template>
  <a-card class="surface-card search-card" :bordered="false">
    <div class="page-heading search-heading">
      <div>
        <h1><SearchOutlined /> 搜索话题</h1>
        <p>按关键词或发帖人筛选社区内容。</p>
      </div>
    </div>

    <a-form class="search-form" layout="vertical" @submit.prevent="submitSearch">
      <div class="search-fields">
        <a-form-item label="关键词">
          <a-input v-model:value="form.keywords" allow-clear placeholder="标题或内容关键词" />
        </a-form-item>
        <a-form-item label="发帖人">
          <a-input v-model:value="form.username" allow-clear placeholder="用户名（可选）" />
        </a-form-item>
        <a-button type="primary" html-type="submit" :loading="loading">搜索</a-button>
      </div>
      <div class="search-options">
        <a-checkbox v-model:checked="form.searchReplies">搜索回复内容</a-checkbox>
      </div>
    </a-form>

    <div v-if="hasSearched && !loading && !error" class="result-caption">
      <span>搜索结果</span>
      <span>{{ topics.length }} 条已加载</span>
    </div>

    <PageState
      :loading="loading"
      :error="error"
      :empty="hasSearched && !loading && !error && topics.length === 0"
      empty-text="没有找到符合条件的话题，换个关键词试试"
      @retry="loadResults(true)"
    >
      <a-empty v-if="!hasSearched" description="输入条件后开始搜索" />
      <template v-else>
        <TopicList :topics="topics" />
        <div v-if="topics.length" class="load-more-row">
          <a-button v-if="hasNextPage" :loading="loadingMore" @click="loadMore">加载更多</a-button>
          <span v-else class="result-end">没有更多结果了</span>
        </div>
      </template>
    </PageState>
  </a-card>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SearchOutlined } from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import TopicList from '../components/TopicList.vue'
import { forumApi } from '../services/forum'

const route = useRoute()
const router = useRouter()
const form = reactive({ keywords: '', username: '', searchReplies: false })
const topics = ref([])
const page = ref(1)
const hasNextPage = ref(false)
const hasSearched = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')

async function loadResults(reset = true) {
  if (!form.keywords.trim() && !form.username.trim()) {
    topics.value = []
    hasSearched.value = false
    return
  }

  if (reset) {
    page.value = 1
    loading.value = true
    error.value = ''
  }
  hasSearched.value = true

  try {
    const result = await forumApi.search({
      keywords: form.keywords,
      username: form.username,
      searchType: form.searchReplies ? 'reply' : '',
      page: page.value,
    })
    const nextTopics = result.topicList || result.replyList || []
    topics.value = reset ? nextTopics : [...topics.value, ...nextTopics]
    page.value = Number(result.currPage || page.value)
    hasNextPage.value = result.hasNextPage === true || page.value < Number(result.maxPage || 0)
  } catch (reason) {
    error.value = reason?.message || '搜索失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function submitSearch() {
  const query = {}
  if (form.keywords.trim()) query.keywords = form.keywords.trim()
  if (form.username.trim()) query.username = form.username.trim()
  if (form.searchReplies) query.searchType = 'reply'

  if (JSON.stringify(query) === JSON.stringify(route.query)) loadResults(true)
  else router.push({ name: 'search', query })
}

async function loadMore() {
  if (loadingMore.value || !hasNextPage.value) return
  loadingMore.value = true
  page.value += 1
  try {
    await loadResults(false)
  } finally {
    loadingMore.value = false
  }
}

watch(
  () => [route.query.keywords, route.query.username, route.query.searchType],
  ([keywords, username, searchType]) => {
    form.keywords = String(keywords || '')
    form.username = String(username || '')
    form.searchReplies = searchType === 'reply'
    loadResults(true)
  },
  { immediate: true },
)
</script>

<style scoped>
.search-card :deep(.ant-card-body) {
  padding: 0;
}

.search-heading {
  margin: 0;
  padding: 25px 25px 4px;
}

.search-heading h1 {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-form {
  padding: 16px 25px 5px;
}

.search-fields {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(180px, 0.8fr) auto;
  align-items: end;
  gap: 14px;
}

.search-fields :deep(.ant-form-item) {
  margin-bottom: 14px;
}

.search-fields > .ant-btn {
  margin-bottom: 14px;
}

.search-options {
  margin-top: -4px;
  padding-bottom: 14px;
}

.result-caption {
  display: flex;
  justify-content: space-between;
  padding: 16px 22px;
  color: var(--text-subtle);
  font-size: 13px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--surface-tint);
}

.result-caption span:last-child,
.result-end {
  color: var(--muted-soft);
  font-size: 12px;
}

@media (max-width: 620px) {
  .search-fields {
    display: block;
  }

  .search-fields > .ant-btn {
    width: 100%;
  }
}
</style>
