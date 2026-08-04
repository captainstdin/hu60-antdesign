<template>
  <div class="topic-page">
    <PageState :loading="loading" :error="error" :empty="!loading && !error && !topic" @retry="loadTopic">
      <template v-if="topic">
        <a-card class="surface-card thread-card" :bordered="false">
          <header class="topic-summary">
            <a-breadcrumb class="topic-breadcrumb">
              <a-breadcrumb-item><router-link to="/">论坛</router-link></a-breadcrumb-item>
              <a-breadcrumb-item>{{ topicMeta.forum_name || '话题' }}</a-breadcrumb-item>
            </a-breadcrumb>

            <div class="topic-title-row">
              <div class="topic-title-copy">
                <div class="topic-title-line">
                  <div class="topic-tags">
                    <a-tag v-if="Number(topicMeta.essence) === 1" color="red">精华</a-tag>
                    <a-tag v-if="isLocked">已锁定</a-tag>
                    <a-tag v-if="topicMeta.publicity">{{ topicMeta.publicity }}</a-tag>
                  </div>
                  <h1>{{ topicMeta.title || '帖子详情' }}</h1>
                </div>
                <div class="topic-stats">
                  <span><ClockCircleOutlined /> {{ formatTime(topicMeta.ctime) }}</span>
                  <span><EyeOutlined /> {{ topicMeta.read_count || 0 }} 次浏览</span>
                  <span><MessageOutlined /> {{ replyCount }} 条回复</span>
                </div>
              </div>

              <a-space class="topic-primary-actions" :size="4">
                <a-tooltip :title="favorite ? '取消收藏' : '收藏帖子'">
                  <a-button
                    size="small"
                    :type="favorite ? 'primary' : 'default'"
                    :loading="favoriteLoading"
                    :aria-label="favorite ? '取消收藏' : '收藏帖子'"
                    @click="toggleFavorite"
                  >
                    <StarFilled v-if="favorite" />
                    <StarOutlined v-else />
                  </a-button>
                </a-tooltip>
                <a-button size="small" type="primary" :disabled="isLocked" @click="focusReply">
                  <template #icon><MessageOutlined /></template>
                  回复
                </a-button>
                <a-dropdown v-if="canManageTopic" placement="bottomRight">
                  <a-button size="small" aria-label="帖子管理"><MoreOutlined /></a-button>
                  <template #overlay>
                    <a-menu @click="handleTopicMenu">
                      <a-menu-item v-if="canModerate" key="lock">
                        <LockOutlined /> {{ isLocked ? '开放回复' : '关闭回复' }}
                      </a-menu-item>
                      <a-menu-item v-if="canSetEssence" key="essence">
                        <FireOutlined /> {{ Number(topicMeta.essence) === 1 ? '取消精华' : '设为精华' }}
                      </a-menu-item>
                      <a-menu-item v-if="canModerate" key="move"><SwapOutlined /> 移动版块</a-menu-item>
                      <a-menu-item v-if="canModerate" key="sink"><VerticalAlignBottomOutlined /> 沉底帖子</a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </div>
          </header>

          <div class="floor-toolbar">
            <span>共 {{ replyCount }} 条回复</span>
            <a-radio-group v-model:value="floorReverse" size="small" button-style="solid" @change="changeOrder">
              <a-radio-button :value="false">正序</a-radio-button>
              <a-radio-button :value="true">倒序</a-radio-button>
            </a-radio-group>
          </div>

          <a-list class="floors" :data-source="contents" item-layout="vertical" aria-label="帖子楼层">
            <template #renderItem="{ item, index }">
              <a-list-item
                :id="`floor-${floorNumber(item, index)}`"
                :key="item.id || `${item.uid}-${item.ctime}-${index}`"
                class="floor-item"
                :class="{ 'owner-floor': isOwner(item) }"
              >
                <div class="floor-layout">
                  <aside class="floor-user">
                    <button type="button" class="avatar-link" @click="openUser(item.uid)">
                      <UserAvatar :avatar="item._u_avatar" :uid="item.uid" :size="40" />
                    </button>
                    <div class="floor-user-copy">
                      <button type="button" class="floor-author" @click="openUser(item.uid)">
                        {{ authorName(item) }}
                      </button>
                      <a-tag v-if="isOwner(item)" color="cyan">楼主</a-tag>
                    </div>
                  </aside>

                  <div class="floor-main">
                    <header class="floor-header">
                      <div>
                        <strong v-if="Number(floorNumber(item, index)) === 0">主楼</strong>
                        <span>{{ formatTime(item.ctime) }}</span>
                        <span v-if="item.mtime && item.mtime !== item.ctime">编辑于 {{ formatTime(item.mtime) }}</span>
                      </div>
                      <a :href="`#floor-${floorNumber(item, index)}`" class="floor-number">
                        #{{ floorNumber(item, index) }}
                      </a>
                    </header>

                    <RichContent :html="item.content" collapsible />

                    <footer class="floor-actions">
                      <a-button type="text" size="small" @click="quoteUser(item)">@Ta</a-button>
                      <a-tooltip title="复制楼层链接">
                        <a-button type="text" size="small" aria-label="复制楼层链接" @click="copyFloorLink(item, index)">
                          <LinkOutlined />
                        </a-button>
                      </a-tooltip>
                      <template v-if="canEdit(item)">
                        <a-button type="text" size="small" @click="openEditor(item, index)">
                          <EditOutlined /> 编辑
                        </a-button>
                        <a-button danger type="text" size="small" @click="confirmDelete(item, index)">
                          <DeleteOutlined /> 删除
                        </a-button>
                      </template>
                    </footer>
                  </div>
                </div>
              </a-list-item>
            </template>
          </a-list>

          <div v-if="maxPage > 1" class="topic-pagination">
            <a-pagination
              :current="currentPage"
              :page-size="1"
              :total="maxPage"
              :show-size-changer="false"
              show-less-items
              size="small"
              @change="goPage"
            />
          </div>

          <section ref="replyCard" class="reply-panel">
            <div class="reply-title">
              <h2>回复帖子</h2>
              <a-tag v-if="isLocked">帖子已锁定</a-tag>
            </div>

            <a-button v-if="!isLoggedIn" size="small" type="primary" @click="openLogin">登录后回复</a-button>
            <template v-else-if="!isLocked">
              <ContentEditor
                ref="replyEditor"
                v-model="replyContent"
                :disabled="replying"
                :min-rows="4"
                placeholder="写下你的回复……"
              />
              <div class="reply-submit">
                <a-button size="small" type="primary" :loading="replying" @click="submitReply">
                  <template #icon><SendOutlined /></template>
                  发表回复
                </a-button>
              </div>
            </template>
          </section>
        </a-card>
      </template>
    </PageState>

    <a-modal
      v-model:open="editOpen"
      :title="editForm.isMain ? '编辑帖子' : '编辑回复'"
      :confirm-loading="editSaving"
      ok-text="保存修改"
      cancel-text="取消"
      :width="780"
      @ok="saveEdit"
    >
      <a-form layout="vertical">
        <a-form-item v-if="editForm.isMain" label="标题">
          <a-input v-model:value="editForm.title" :maxlength="100" show-count />
        </a-form-item>
        <a-form-item label="内容">
          <ContentEditor v-model="editForm.content" :min-rows="10" />
        </a-form-item>
        <a-form-item label="修改说明">
          <a-input v-model:value="editForm.editReason" :maxlength="120" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="moveOpen"
      title="移动帖子"
      :confirm-loading="moveSubmitting"
      :ok-button-props="{ disabled: !moveForumId }"
      ok-text="确认移动"
      cancel-text="取消"
      @ok="submitMove"
    >
      <a-spin :spinning="moveLoading">
        <a-form layout="vertical">
          <a-form-item label="目标版块" required>
            <a-tree-select
              v-model:value="moveForumId"
              :tree-data="moveForums"
              tree-default-expand-all
              show-search
              tree-node-filter-prop="label"
              placeholder="选择目标版块"
            />
          </a-form-item>
        </a-form>
      </a-spin>
    </a-modal>

    <a-modal
      v-model:open="essenceOpen"
      :title="essenceForm.enabled ? '设为精华' : '取消精华'"
      :confirm-loading="essenceSubmitting"
      :ok-button-props="{ disabled: essenceForm.needReason && !essenceForm.reason.trim() }"
      :ok-text="essenceForm.enabled ? '确认加精' : '确认取消'"
      cancel-text="取消"
      @ok="submitEssence"
    >
      <a-form layout="vertical">
        <a-form-item :label="essenceForm.enabled ? '加精理由' : '取消精华理由'" :required="essenceForm.needReason">
          <a-input
            v-model:value="essenceForm.reason"
            :maxlength="160"
            show-count
            :placeholder="essenceForm.needReason ? '请填写操作理由' : '可选'"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="sinkOpen"
      title="沉底帖子"
      :confirm-loading="sinkSubmitting"
      :ok-button-props="{ danger: true, disabled: sinkForm.needReason && !sinkForm.reason.trim() }"
      ok-text="确认沉底"
      cancel-text="取消"
      @ok="submitSink"
    >
      <a-alert class="manage-warning" type="warning" show-icon message="帖子沉底后不可恢复，请谨慎操作。" />
      <a-form layout="vertical">
        <a-form-item label="下沉理由" :required="sinkForm.needReason">
          <a-input
            v-model:value="sinkForm.reason"
            :maxlength="160"
            show-count
            :placeholder="sinkForm.needReason ? '请填写下沉理由' : '可选'"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="deleteOpen"
      :title="deleteForm.isMain ? '删除帖子' : '删除回复'"
      :confirm-loading="deleteSubmitting"
      :ok-button-props="{ danger: true, disabled: deleteForm.needReason && !deleteForm.reason.trim() }"
      ok-text="确认删除"
      cancel-text="取消"
      @ok="submitDelete"
    >
      <a-alert class="manage-warning" type="warning" show-icon message="删除后无法恢复，请确认要继续。" />
      <a-form layout="vertical">
        <a-form-item label="删除理由" :required="deleteForm.needReason">
          <a-input
            v-model:value="deleteForm.reason"
            :maxlength="160"
            show-count
            :placeholder="deleteForm.needReason ? '请填写删除理由' : '可选'"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FireOutlined,
  LinkOutlined,
  LockOutlined,
  MessageOutlined,
  MoreOutlined,
  SendOutlined,
  StarFilled,
  StarOutlined,
  SwapOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons-vue'
import ContentEditor from '../components/ContentEditor.vue'
import PageState from '../components/PageState.vue'
import RichContent from '../components/RichContent.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { forumApi } from '../services/forum'
import { authDialog } from '../stores/authDialog'
import { session } from '../stores/session'
import { formatTime } from '../utils/date'
import { mapForumTree } from '../utils/forums'
import { currentPermissions, hasPermission, PERMISSIONS } from '../utils/permissions'

const props = defineProps({ id: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const topic = ref(null)
const contents = ref([])
const currentPage = ref(1)
const maxPage = ref(1)
const floorReverse = ref(route.query.order === 'desc')
const loading = ref(true)
const error = ref('')
const replyContent = ref('')
const replying = ref(false)
const replyCard = ref()
const favorite = ref(false)
const favoriteLoading = ref(false)
const editOpen = ref(false)
const editSaving = ref(false)
const editForm = reactive({ postId: '', page: 1, title: '', content: '', editReason: '', token: '', isMain: false })
const moveOpen = ref(false)
const moveLoading = ref(false)
const moveSubmitting = ref(false)
const moveForums = ref([])
const moveForumId = ref()
const essenceOpen = ref(false)
const essenceSubmitting = ref(false)
const essenceForm = reactive({ enabled: true, token: '', reason: '', needReason: false })
const sinkOpen = ref(false)
const sinkSubmitting = ref(false)
const sinkForm = reactive({ token: '', reason: '', needReason: false })
const deleteOpen = ref(false)
const deleteSubmitting = ref(false)
const deleteForm = reactive({ postId: '', token: '', reason: '', needReason: false, isMain: false })
const isLoggedIn = session.isLoggedIn

const topicMeta = computed(() => topic.value?.tMeta || {})
const isLocked = computed(() => Number(topicMeta.value.locked ?? topicMeta.value.lock) === 1)
const replyCount = computed(() => Math.max(0, Number(topic.value?.floorCount || 1) - 1))
const permissions = computed(() => currentPermissions(topic.value, session.state.user))
const canModerate = computed(() => (
  Boolean(session.state.user?.siteAdmin) || hasPermission(permissions.value, PERMISSIONS.editTopic)
))
const canSetEssence = computed(() => (
  Boolean(session.state.user?.siteAdmin) || hasPermission(permissions.value, PERMISSIONS.setEssenceTopic)
))
const canManageTopic = computed(() => canModerate.value || canSetEssence.value)

function authorName(item) {
  return item.uinfo?.name || item._u_name || `UID ${item.uid || '--'}`
}

function isOwner(item) {
  return String(item.uid) === String(topicMeta.value.uid)
}

function floorNumber(item, index) {
  if (item.floor !== undefined) return item.floor
  if (item.floor_num !== undefined) return item.floor_num
  return (currentPage.value - 1) * 30 + index
}

function postId(item) {
  return item.id || item.content_id || item.floor_id
}

function canEdit(item) {
  if (!isLoggedIn.value || !postId(item)) return false
  return String(item.uid) === String(session.state.user?.uid) || canModerate.value
}

function openUser(uid) {
  if (uid) router.push({ name: 'user', params: { uid } })
}

async function loadTopic() {
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getTopic(props.id, currentPage.value, { floorReverse: floorReverse.value })
    if (result?.error) throw new Error(result.errInfo?.message || result.notice || '帖子不存在或无法访问')
    topic.value = result
    contents.value = result.tContents || result.contents || []
    currentPage.value = Number(result.currPage || currentPage.value)
    maxPage.value = Number(result.maxPage || currentPage.value)
    favorite.value = Boolean(result.isFavoriteTopic ?? result.tMeta?.isFavoriteTopic)
    nextTick(scrollToHash)
  } catch (reason) {
    error.value = reason?.message || '帖子加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function scrollToHash() {
  const floor = String(route.hash || '').replace(/^#(?:floor-)?/, '')
  if (floor) document.getElementById(`floor-${floor}`)?.scrollIntoView({ block: 'center' })
}

function goPage(page) {
  if (page < 1 || page > maxPage.value || page === currentPage.value) return
  currentPage.value = page
  loadTopic()
}

function changeOrder() {
  currentPage.value = 1
  router.replace({ query: { ...route.query, order: floorReverse.value ? 'desc' : undefined } })
  loadTopic()
}

function openLogin() {
  authDialog.show(route.fullPath)
}

function focusReply() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  const target = replyCard.value?.$el || replyCard.value
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function quoteUser(item) {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  replyContent.value += `${replyContent.value ? '\n' : ''}@${authorName(item)} `
  focusReply()
}

async function copyFloorLink(item, index) {
  const floor = floorNumber(item, index)
  const url = `${window.location.origin}${window.location.pathname}${window.location.search}#/topic/${props.id}#floor-${floor}`
  try {
    await navigator.clipboard.writeText(url)
    message.success('楼层链接已复制')
  } catch {
    message.warning('浏览器未允许复制，请从地址栏复制')
  }
}

async function toggleFavorite() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  favoriteLoading.value = true
  try {
    const next = !favorite.value
    const result = await forumApi.setFavorite(props.id, next)
    if (result.success === false) throw new Error(result.notice || '收藏操作失败')
    favorite.value = next
    message.success(next ? '已加入收藏' : '已取消收藏')
  } catch (reason) {
    message.error(reason?.message || '收藏操作失败')
  } finally {
    favoriteLoading.value = false
  }
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
    currentPage.value = floorReverse.value ? 1 : maxPage.value
    await loadTopic()
  } catch (reason) {
    message.error(reason?.message || '回复失败，请稍后重试')
  } finally {
    replying.value = false
  }
}

async function openEditor(item, index) {
  const id = postId(item)
  if (!id) return
  try {
    const result = await forumApi.getPostEditor(props.id, id, currentPage.value)
    Object.assign(editForm, {
      postId: id,
      page: currentPage.value,
      title: result.title ?? (Number(floorNumber(item, index)) === 0 ? topicMeta.value.title : ''),
      content: result.content ?? '',
      editReason: '',
      token: result.token || '',
      isMain: Number(floorNumber(item, index)) === 0,
    })
    editOpen.value = true
  } catch (reason) {
    message.error(reason?.message || '无法加载编辑内容')
  }
}

async function saveEdit() {
  if (!editForm.content.trim() || (editForm.isMain && !editForm.title.trim())) {
    message.warning('标题和内容不能为空')
    return
  }
  editSaving.value = true
  try {
    const result = await forumApi.savePost(props.id, editForm.postId, editForm.page, {
      title: editForm.isMain ? editForm.title.trim() : undefined,
      content: editForm.content,
      editReason: editForm.editReason.trim(),
      token: editForm.token,
    })
    if (result.success === false) throw new Error(result.notice || '保存失败')
    editOpen.value = false
    message.success('修改已保存')
    await loadTopic()
  } catch (reason) {
    message.error(reason?.message || '保存修改失败')
  } finally {
    editSaving.value = false
  }
}

async function openMoveDialog() {
  moveOpen.value = true
  moveLoading.value = true
  moveForumId.value = topicMeta.value.fid ? String(topicMeta.value.fid) : undefined
  try {
    const result = await forumApi.getMoveTopic(props.id)
    moveForums.value = mapForumTree(result.forums || result.forumList || [])
    if (!moveForums.value.length) throw new Error(result.notice || '没有可移动到的版块')
  } catch (reason) {
    moveOpen.value = false
    message.error(reason?.message || '版块列表加载失败')
  } finally {
    moveLoading.value = false
  }
}

async function submitMove() {
  if (!moveForumId.value) return
  moveSubmitting.value = true
  try {
    const result = await forumApi.moveTopic(props.id, moveForumId.value)
    if (result.success === false) throw new Error(result.notice || '移动帖子失败')
    moveOpen.value = false
    message.success('帖子已移动')
    await loadTopic()
  } catch (reason) {
    message.error(reason?.message || '移动帖子失败')
  } finally {
    moveSubmitting.value = false
  }
}

async function openEssenceDialog() {
  const enabled = Number(topicMeta.value.essence) !== 1
  try {
    const result = await forumApi.getTopicEssenceForm(props.id, enabled)
    if (result.success === false) throw new Error(result.notice || '无法取得操作凭证')
    Object.assign(essenceForm, {
      enabled,
      token: result.token || '',
      reason: '',
      needReason: Boolean(result.needReason),
    })
    if (!essenceForm.token) throw new Error(result.notice || '无法取得操作凭证')
    essenceOpen.value = true
  } catch (reason) {
    message.error(reason?.message || '精华操作加载失败')
  }
}

async function submitEssence() {
  if (essenceForm.needReason && !essenceForm.reason.trim()) return
  essenceSubmitting.value = true
  try {
    const result = await forumApi.setTopicEssence(props.id, essenceForm.enabled, essenceForm)
    if (result.success === false) throw new Error(result.notice || '精华操作失败')
    essenceOpen.value = false
    message.success(essenceForm.enabled ? '帖子已设为精华' : '已取消精华')
    await loadTopic()
  } catch (reason) {
    message.error(reason?.message || '精华操作失败')
  } finally {
    essenceSubmitting.value = false
  }
}

async function confirmDelete(item, index) {
  const id = postId(item)
  if (!id) return
  try {
    const access = await forumApi.getDeletePost(props.id, id)
    if (!access.token) throw new Error(access.notice || '未能取得删除凭证')
    Object.assign(deleteForm, {
      postId: id,
      token: access.token,
      reason: '',
      needReason: Boolean(access.needReason),
      isMain: Number(floorNumber(item, index)) === 0,
    })
    deleteOpen.value = true
  } catch (reason) {
    message.error(reason?.message || '删除操作加载失败')
  }
}

async function submitDelete() {
  if (deleteForm.needReason && !deleteForm.reason.trim()) return
  deleteSubmitting.value = true
  try {
    const result = await forumApi.deletePost(
      props.id,
      deleteForm.postId,
      deleteForm.token,
      deleteForm.reason.trim(),
    )
    if (result.success === false) throw new Error(result.notice || '删除失败')
    deleteOpen.value = false
    message.success(deleteForm.isMain ? '帖子已删除' : '回复已删除')
    if (deleteForm.isMain) router.replace('/')
    else await loadTopic()
  } catch (reason) {
    message.error(reason?.message || '删除失败')
  } finally {
    deleteSubmitting.value = false
  }
}

async function openSinkDialog() {
  try {
    const result = await forumApi.getSinkTopic(props.id)
    if (!result.token) throw new Error(result.notice || '无法取得下沉凭证')
    Object.assign(sinkForm, {
      token: result.token,
      reason: '',
      needReason: Boolean(result.needReason),
    })
    sinkOpen.value = true
  } catch (reason) {
    message.error(reason?.message || '沉底操作加载失败')
  }
}

async function submitSink() {
  if (sinkForm.needReason && !sinkForm.reason.trim()) return
  sinkSubmitting.value = true
  try {
    const result = await forumApi.sinkTopic(props.id, sinkForm)
    if (result.success === false) throw new Error(result.notice || '沉底失败')
    sinkOpen.value = false
    message.success('帖子已沉底')
    await loadTopic()
  } catch (reason) {
    message.error(reason?.message || '沉底失败')
  } finally {
    sinkSubmitting.value = false
  }
}

async function handleTopicMenu({ key }) {
  try {
    if (key === 'lock') {
      const result = await forumApi.setTopicLocked(props.id, !isLocked.value)
      if (result.success === false) throw new Error(result.notice || '操作失败')
      message.success(isLocked.value ? '已开放回复' : '已关闭回复')
    } else if (key === 'sink') {
      await openSinkDialog()
      return
    } else if (key === 'move') {
      await openMoveDialog()
      return
    } else if (key === 'essence') {
      await openEssenceDialog()
      return
    }
    await loadTopic()
  } catch (reason) {
    message.error(reason?.message || '管理操作失败')
  }
}

watch(() => props.id, () => {
  topic.value = null
  contents.value = []
  currentPage.value = 1
  maxPage.value = 1
  loadTopic()
}, { immediate: true })
</script>

<style scoped>
.topic-page {
  min-width: 0;
}

.thread-card {
  overflow: hidden;
}

.thread-card :deep(.ant-card-body) {
  padding: 0;
}

.topic-summary {
  padding: 12px 16px 11px;
}

.topic-breadcrumb {
  margin-bottom: 7px;
  font-size: 12px;
}

.topic-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.topic-title-copy {
  flex: 1 1 auto;
  min-width: 0;
}

.topic-title-line {
  display: flex;
  align-items: center;
  min-width: 0;
  flex-wrap: wrap;
  gap: 4px 7px;
}

.topic-title-line h1 {
  margin: 0;
  color: #263d39;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.topic-tags {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.topic-tags:empty {
  display: none;
}

.topic-tags :deep(.ant-tag) {
  margin: 0;
}

.topic-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 5px;
  color: #7d8c89;
  font-size: 11px;
  gap: 4px 14px;
}

.topic-primary-actions {
  flex: 0 0 auto;
}

.floor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  padding: 4px 12px 4px 16px;
  color: #566965;
  font-size: 12px;
  border-top: 1px solid #dce8e6;
  border-bottom: 1px solid #dce8e6;
  background: #f3f8f7;
}

.owner-floor {
  box-shadow: inset 3px 0 rgba(22, 139, 124, 0.55);
}

.floor-item {
  padding: 0 !important;
}

.floor-layout {
  display: grid;
  width: 100%;
  grid-template-columns: 112px minmax(0, 1fr);
  min-height: 112px;
}

.floor-user {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 12px 8px 10px;
  border-right: 1px solid #e8eeec;
  background: #f7faf9;
}

.floor-user-copy {
  display: flex;
  align-items: center;
  min-width: 0;
  flex-direction: column;
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
  margin: 5px 0 3px;
  color: #31514b;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.floor-user :deep(.ant-tag) {
  margin: 0;
  font-size: 11px;
  line-height: 18px;
}

.floor-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 9px 14px 5px;
}

.floor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 6px;
  color: #8a9895;
  font-size: 11px;
  border-bottom: 1px dashed #e3eae8;
}

.floor-header > div {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.floor-header strong {
  color: var(--brand);
}

.floor-number {
  color: #7e918d;
}

.floor-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 4px;
}

.floor-actions :deep(.ant-btn-sm) {
  height: 24px;
  padding-inline: 6px;
  font-size: 12px;
}

.topic-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 9px 12px;
  border-top: 1px solid #edf1f0;
}

.reply-panel {
  padding: 11px 16px 13px;
  border-top: 1px solid #dce8e6;
  background: #fbfcfc;
}

.manage-warning {
  margin-bottom: 18px;
}

.reply-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.reply-title h2 {
  margin: 0;
  color: #2b403c;
  font-size: 15px;
  font-weight: 600;
}

.reply-submit {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

@media (max-width: 700px) {
  .topic-summary {
    padding: 10px 12px;
  }

  .topic-title-row {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 7px 10px;
  }

  .topic-title-copy {
    flex: 1 1 260px;
  }

  .topic-title-line h1 {
    font-size: 17px;
  }

  .floor-layout {
    grid-template-columns: 92px minmax(0, 1fr);
  }

  .floor-user {
    padding-inline: 7px;
  }

  .floor-main {
    padding: 8px 10px 4px;
  }

  .reply-panel {
    padding: 10px 12px 12px;
  }
}

@media (max-width: 520px) {
  .floor-layout {
    display: block;
    min-height: 0;
  }

  .floor-user {
    align-items: center;
    flex-direction: row;
    padding: 7px 10px;
    border-right: 0;
    border-bottom: 1px solid #e8eeec;
    gap: 8px;
  }

  .floor-user-copy {
    align-items: center;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px 6px;
  }

  .floor-author {
    margin: 0;
  }

  .floor-main {
    padding: 8px 10px 4px;
  }

  .floor-toolbar {
    padding-left: 10px;
  }

  .topic-stats {
    gap-inline: 9px;
  }
}
</style>
