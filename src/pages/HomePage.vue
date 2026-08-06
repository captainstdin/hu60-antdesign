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
        <a-button v-if="hasNextPage" class="load-more-btn" :loading="loadingMore" @click="loadMore">
          加载更多
          <template #icon><DownOutlined /></template>
        </a-button>
        <span v-else>没有更多帖子了</span>
      </div>
    </PageState>

    <section v-if="forumGroups.length" class="home-widget forum-widget" aria-labelledby="forum-directory-title">
      <div id="forum-directory-title" class="home-widget-bar">版块</div>
      <div class="forum-list">
        <div v-for="group in forumGroups" :key="group.key" class="forum-list-line">
          <div class="forum-list-parent">
            <a :href="group.href">{{ group.name }}</a>
          </div>
          <div v-if="group.children.length" class="forum-list-child">
            <a v-for="child in group.children" :key="child.key" :href="child.href">
              {{ child.name }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <section v-if="friendLinkItems.length" class="home-widget friend-widget" aria-labelledby="friend-links-title">
      <div id="friend-links-title" class="home-widget-bar">虎友网站展示</div>
      <div class="friend-links">
        <a
          v-for="link in friendLinkItems"
          :key="link.key"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ link.name }}
        </a>
      </div>
    </section>

    <section class="home-widget community-widget" aria-labelledby="community-directory-title">
      <div id="community-directory-title" class="home-widget-bar">社区入口</div>
      <nav class="community-links" aria-label="社区入口">
        <button type="button" @click="router.push('/chat')">聊天室</button>
        <button type="button" @click="router.push('/search')">帖子搜索</button>
        <button type="button" @click="router.push('/publish')">发布帖子</button>
        <button type="button" @click="router.push('/messages')">内信</button>
        <button type="button" @click="router.push('/me')">个人中心</button>
      </nav>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import PageState from '../components/PageState.vue'
import TopicList from '../components/TopicList.vue'
import { API_BASE_URL } from '../config/app'
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
const forumGroups = ref([])
const friendLinkItems = ref([])
const canReview = computed(() => (
  Boolean(session.state.user?.siteAdmin) || hasPermission(permissions.value, PERMISSIONS.reviewPost)
))

function asArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return []
}

function linkValue(item) {
  if (typeof item === 'string') return item
  return item?.url || item?.href || item?.link || item?.address || ''
}

function displayName(item) {
  if (typeof item === 'string') return item
  return item?.name || item?.title || item?.label || item?.text || ''
}

function normalizeLink(value, fallbackId = '') {
  const raw = String(linkValue(value) || '').trim()
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return raw
  if (fallbackId) return `${API_BASE_URL}/q.php/bbs.forum.${encodeURIComponent(fallbackId)}.html`
  return ''
}

function normalizeForumGroups(value) {
  return asArray(value).map((item, index) => {
    if (!item || typeof item !== 'object') return null
    const id = item.id ?? item.forum_id ?? item.fid ?? item.value ?? ''
    const children = asArray(item.child || item.children || item.items)
      .map((child, childIndex) => {
        if (!child || typeof child !== 'object') return null
        const childId = child.id ?? child.forum_id ?? child.fid ?? child.value ?? ''
        const name = displayName(child)
        if (!name) return null
        return {
          key: `child-${childId || `${index}-${childIndex}`}`,
          name,
          href: normalizeLink(child, childId),
        }
      })
      .filter(Boolean)
    const name = displayName(item)
    if (!name) return null
    return {
      key: `forum-${id || index}`,
      name,
      href: normalizeLink(item, id),
      children,
    }
  }).filter(Boolean)
}

function normalizeFriendLinks(value) {
  return asArray(value).map((item, index) => {
    const name = displayName(item)
    const href = normalizeLink(item)
    if (!name || !href) return null
    return { key: `friend-${index}-${name}`, name, href }
  }).filter(Boolean)
}

function looksLikeForumGroups(value) {
  return asArray(value).some((item) => item && typeof item === 'object'
    && (item.child || item.children || item.items || item.forum_id || item.fid
      || (item.id && !linkValue(item))))
}

function applyHomeDirectories(result) {
  const forumSource = result.forumList ?? result.forums ?? result.forumTree
  if (forumSource !== undefined) {
    const groups = normalizeForumGroups(forumSource)
    if (groups.length || !forumGroups.value.length) forumGroups.value = groups
  }

  const friendSource = result.friendLinks ?? []
  friendLinkItems.value = normalizeFriendLinks(friendSource)
  if (!forumGroups.value.length && looksLikeForumGroups(friendSource)) {
    forumGroups.value = normalizeForumGroups(friendSource)
    friendLinkItems.value = []
  }
}

async function loadForums() {
  if (forumGroups.value.length) return
  try {
    const result = await forumApi.getForums()
    forumGroups.value = normalizeForumGroups(result?.forumList || result?.forums || result)
  } catch {
    // 首页版块是辅助信息，请求失败时不阻断帖子列表。
  }
}

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
    applyHomeDirectories(result)
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

onMounted(() => {
  loadTopics()
  loadForums()
})
</script>

<style scoped>
.home-page {
  min-height: calc(100vh - 68px);
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

.load-more-btn {
  min-width: 200px;
}

.home-widget {
  border-top: 1px solid #eee;
  background: #fff;
}

.home-widget-bar {
  padding: 7px 18px;
  color: #333;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  background: #e6f3ff;
}

.forum-list {
  padding: 9px 18px 14px 40px;
}

.forum-list-line {
  display: flex;
  min-height: 35px;
  align-items: flex-start;
}

.forum-list-parent,
.forum-list-child {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}

.forum-list-parent > a,
.forum-list-child > a {
  display: inline-block;
  margin: 3px;
  padding: 5px;
  color: #999;
  font-size: 12px;
  line-height: 1.25;
  border-radius: 5px;
  background: #eee;
  text-decoration: none;
}

.forum-list-parent > a {
  font-weight: 700;
}

.forum-list-parent > a:hover,
.forum-list-parent > a:focus-visible,
.forum-list-child > a:hover,
.forum-list-child > a:focus-visible,
.friend-links a:hover,
.friend-links a:focus-visible {
  color: #08c;
  outline: none;
  text-decoration: underline;
}

.friend-links {
  display: flex;
  flex-wrap: wrap;
  padding: 9px 18px 14px;
  gap: 4px 18px;
}

.friend-links a {
  padding: 3px 0;
  color: #08c;
  font-size: 13px;
  text-decoration: none;
}

.community-links {
  display: flex;
  flex-wrap: wrap;
  padding: 12px 18px 18px;
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

  .forum-list {
    padding-left: 10px;
  }

  .forum-list-line {
    display: block;
  }

  .toolbar-status > span {
    display: none;
  }
}
</style>
