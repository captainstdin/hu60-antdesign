<template>
  <div class="review-page">
    <section class="review-header">
      <div>
        <h1><AuditOutlined /> 内容审核</h1>
        <p>处理待审核帖子和回复，并查看其他管理状态。</p>
      </div>
      <div class="review-header-actions">
        <a-badge :count="pendingCount" :overflow-count="999" />
        <a-tooltip title="刷新审核列表">
          <a-button aria-label="刷新审核列表" :loading="loading" @click="loadReviews">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </div>
    </section>

    <div class="review-toolbar">
      <a-select v-model:value="activeState" :options="stateOptions" @change="changeState" />
      <a-button
        v-if="activeState === '1' && items.length"
        type="primary"
        :loading="batchSubmitting"
        @click="submitAll"
      >
        <CheckOutlined /> 批量提交审核
      </a-button>
    </div>

    <a-alert
      v-if="!canReview && !loading && !error"
      type="warning"
      show-icon
      message="当前账号未返回内容审核权限"
    />

    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && items.length === 0"
      empty-text="当前筛选条件下没有内容"
      @retry="loadReviews"
    >
      <section class="review-list" aria-label="审核内容列表">
        <article v-for="(item, index) in items" :key="itemKey(item, index)" class="review-item">
          <header>
            <div>
              <button type="button" class="review-author" @click="openUser(item)">
                <UserAvatar :avatar="item._u_avatar" :uid="item.uid" :size="34" />
                <span>{{ authorName(item) }}</span>
              </button>
              <span>{{ formatTime(item.mtime || item.ctime || item.ztime) }}</span>
            </div>
            <a-button type="link" size="small" @click="openTopic(item)">
              {{ topicLabel(item) }} <RightOutlined />
            </a-button>
          </header>

          <RichContent :html="reviewContent(item)" collapsible />

          <a-alert
            v-if="reviewNote(item)"
            class="review-note"
            type="info"
            :message="reviewNote(item)"
            show-icon
          />

          <div v-if="activeState === '1' && reviewId(item)" class="review-decision">
            <a-radio-group v-model:value="decisions[reviewId(item)].pass" button-style="solid">
              <a-radio-button :value="true"><CheckOutlined /> 审核通过</a-radio-button>
              <a-radio-button :value="false"><CloseOutlined /> 审核未通过</a-radio-button>
            </a-radio-group>
            <a-input
              v-if="decisions[reviewId(item)].pass === false"
              v-model:value="decisions[reviewId(item)].comment"
              :maxlength="160"
              show-count
              placeholder="填写未通过理由"
            />
            <a-button
              type="primary"
              :loading="submittingId === String(reviewId(item))"
              @click="submitOne(item)"
            >
              提交
            </a-button>
          </div>
        </article>
      </section>

      <div v-if="maxPage > 1" class="review-pagination">
        <a-button :disabled="page <= 1" @click="goPage(page - 1)"><LeftOutlined /> 上一页</a-button>
        <span>{{ page }} / {{ maxPage }}</span>
        <a-button :disabled="page >= maxPage" @click="goPage(page + 1)">下一页 <RightOutlined /></a-button>
      </div>
    </PageState>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  AuditOutlined,
  CheckOutlined,
  CloseOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import RichContent from '../components/RichContent.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { session } from '../stores/session'
import { formatTime } from '../utils/date'
import { currentPermissions, hasPermission, PERMISSIONS } from '../utils/permissions'

const STATES = ['1', '-1', '3', '2', '-2', '-3']
const stateOptions = [
  { value: '1', label: '待审核' },
  { value: '-1', label: '我审核的内容' },
  { value: '3', label: '审核未通过' },
  { value: '2', label: '被站长屏蔽' },
  { value: '-2', label: '被锁定' },
  { value: '-3', label: '被下沉' },
]

const route = useRoute()
const router = useRouter()
const activeState = ref(STATES.includes(String(route.query.state)) ? String(route.query.state) : '1')
const items = ref([])
const page = ref(1)
const maxPage = ref(1)
const pendingCount = ref(0)
const permissions = ref([])
const loading = ref(true)
const error = ref('')
const submittingId = ref('')
const batchSubmitting = ref(false)
const decisions = reactive({})
const canReview = computed(() => (
  Boolean(session.state.user?.siteAdmin) || hasPermission(permissions.value, PERMISSIONS.reviewPost)
))

function normalizeItems(result) {
  return result.topicList || result.replyList || result.reviewList || result.resultList || result.list || []
}

function reviewId(item) {
  return item.content_id || item.floor_id || item.id
}

function topicId(item) {
  return item.topic_id || item.topicId || item.tid || item.tMeta?.id
}

function itemKey(item, index) {
  return reviewId(item) || `${topicId(item)}-${item.floor || index}`
}

function authorName(item) {
  return item.uinfo?.name || item._u_name || item.name || `UID ${item.uid || '--'}`
}

function topicLabel(item) {
  const floor = item.floor ?? item.floor_num
  if (floor !== undefined && Number(floor) > 0) return `${floor} 楼回复`
  return item.title || item.topic?.title || item.tMeta?.title || '查看帖子'
}

function reviewContent(item) {
  const content = item.content ?? item.summary ?? item.msg ?? ''
  return typeof content === 'string' ? content : ''
}

function reviewNote(item) {
  return item.reviewComment || item.review_comment || item.reviewReason || item.notice || ''
}

function ensureDecisions(nextItems) {
  nextItems.forEach((item) => {
    const id = reviewId(item)
    if (id && !decisions[id]) decisions[id] = { pass: true, comment: '' }
  })
}

async function loadReviews() {
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getReviewQueue({ state: activeState.value, page: page.value })
    if (result?.error) throw new Error(result.errInfo?.message || result.notice || '审核列表加载失败')
    items.value = normalizeItems(result)
    ensureDecisions(items.value)
    page.value = Number(result.currPage || page.value)
    maxPage.value = Number(result.maxPage || page.value)
    pendingCount.value = Number(result._myself?.countReview || 0)
    permissions.value = currentPermissions(result, session.state.user)
  } catch (reason) {
    error.value = reason?.message || '审核列表加载失败'
  } finally {
    loading.value = false
  }
}

function changeState() {
  page.value = 1
  router.replace({ name: 'reviews', query: { state: activeState.value } })
}

function goPage(nextPage) {
  page.value = nextPage
  loadReviews()
}

function openUser(item) {
  if (item.uid) router.push({ name: 'user', params: { uid: item.uid } })
}

function openTopic(item) {
  const id = topicId(item)
  if (!id) return
  const floor = item.floor ?? item.floor_num
  router.push({
    name: 'topic',
    params: { id },
    hash: floor !== undefined ? `#floor-${floor}` : '',
  })
}

async function sendDecision(item) {
  const id = reviewId(item)
  const decision = decisions[id]
  if (!id || !decision) return false
  if (decision.pass === false && !decision.comment.trim()) {
    throw new Error('审核未通过时必须填写理由')
  }
  const result = await forumApi.reviewPost(id, {
    pass: decision.pass,
    comment: decision.comment.trim(),
  })
  if (result.success === false) throw new Error(result.message || result.notice || '审核提交失败')
  return true
}

async function submitOne(item) {
  submittingId.value = String(reviewId(item) || '')
  try {
    await sendDecision(item)
    message.success('审核结果已提交')
    await loadReviews()
  } catch (reason) {
    message.error(reason?.message || '审核提交失败')
  } finally {
    submittingId.value = ''
  }
}

async function submitAll() {
  const invalid = items.value.find((item) => {
    const decision = decisions[reviewId(item)]
    return decision?.pass === false && !decision.comment.trim()
  })
  if (invalid) {
    message.warning('审核未通过的内容必须填写理由')
    return
  }

  batchSubmitting.value = true
  try {
    await Promise.all(items.value.map(sendDecision))
    message.success('本页审核结果已提交')
    await loadReviews()
  } catch (reason) {
    message.error(reason?.message || '批量审核提交失败')
  } finally {
    batchSubmitting.value = false
  }
}

watch(
  () => route.query.state,
  (state) => {
    activeState.value = STATES.includes(String(state)) ? String(state) : '1'
    page.value = 1
    loadReviews()
  },
  { immediate: true },
)
</script>

<style scoped>
.review-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-header,
.review-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px;
  border: 1px solid #dfe7e5;
  border-radius: 6px;
  background: #fff;
  box-shadow: var(--shadow);
  gap: 14px;
}

.review-header h1 {
  margin: 0;
  color: #29413d;
  font-size: 22px;
}

.review-header p {
  margin: 5px 0 0;
  color: #81908d;
  font-size: 13px;
}

.review-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-toolbar {
  padding: 10px 14px;
  box-shadow: none;
}

.review-toolbar :deep(.ant-select) {
  width: min(260px, 54vw);
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-item {
  padding: 18px 20px;
  border: 1px solid #dfe7e5;
  border-radius: 6px;
  background: #fff;
  box-shadow: var(--shadow);
}

.review-item > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  color: #929e9b;
  font-size: 11px;
  border-bottom: 1px dashed #e2e9e7;
  gap: 12px;
}

.review-item > header > div,
.review-author {
  display: flex;
  align-items: center;
  gap: 9px;
}

.review-author {
  padding: 0;
  color: #287b70;
  font-weight: 650;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.review-note {
  margin-top: 12px;
}

.review-decision {
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) auto;
  align-items: center;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #edf1f0;
  gap: 10px;
}

.review-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  color: #798885;
  font-size: 12px;
  gap: 12px;
}

@media (max-width: 700px) {
  .review-header {
    align-items: flex-start;
    padding: 17px 16px;
  }

  .review-header p {
    display: none;
  }

  .review-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .review-toolbar :deep(.ant-select) {
    width: 100%;
  }

  .review-item {
    padding: 15px 14px;
  }

  .review-decision {
    grid-template-columns: 1fr;
  }

  .review-decision :deep(.ant-radio-group) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .review-decision :deep(.ant-radio-button-wrapper) {
    text-align: center;
  }
}
</style>
