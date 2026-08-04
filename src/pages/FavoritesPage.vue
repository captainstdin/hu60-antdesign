<template>
  <a-card class="surface-card favorites-card" :bordered="false">
    <div class="page-heading">
      <div><h1><StarOutlined /> 我的收藏</h1></div>
      <a-button :loading="loading" @click="loadFavorites"><ReloadOutlined /> 刷新</a-button>
    </div>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && topics.length === 0"
      empty-text="还没有收藏帖子"
      @retry="loadFavorites"
    >
      <TopicList :topics="topics" />
      <div v-if="maxPage > 1" class="favorite-pagination">
        <a-button :disabled="page <= 1" @click="goPage(page - 1)">上一页</a-button>
        <span>{{ page }} / {{ maxPage }}</span>
        <a-button :disabled="page >= maxPage" @click="goPage(page + 1)">下一页</a-button>
      </div>
    </PageState>
  </a-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ReloadOutlined, StarOutlined } from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import TopicList from '../components/TopicList.vue'
import { forumApi } from '../services/forum'

const topics = ref([])
const page = ref(1)
const maxPage = ref(1)
const loading = ref(true)
const error = ref('')

async function loadFavorites() {
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getFavorites(page.value)
    topics.value = result.topicList || result.favoriteTopicList || result.list || []
    page.value = Number(result.currPage || page.value)
    maxPage.value = Number(result.maxPage || page.value)
  } catch (reason) {
    error.value = reason?.message || '收藏列表加载失败'
  } finally {
    loading.value = false
  }
}

function goPage(nextPage) {
  page.value = nextPage
  loadFavorites()
}

onMounted(loadFavorites)
</script>

<style scoped>
.favorites-card :deep(.ant-card-body) {
  padding: 0;
}

.page-heading {
  margin: 0;
  padding: 24px 25px 17px;
  border-bottom: 1px solid #e5ecea;
}

.page-heading h1 {
  display: flex;
  align-items: center;
  gap: 9px;
}

.favorite-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #7c8b88;
  font-size: 12px;
  border-top: 1px solid #e5ecea;
  gap: 10px;
}
</style>
