<template>
  <a-modal
    :open="open"
    :footer="null"
    :closable="false"
    :mask-closable="true"
    :width="'80vw'"
    wrap-class-name="ai-panel-modal"
    @cancel="close"
  >
    <div class="ai-panel">
      <header class="ai-panel-head">
        <div class="ai-panel-brand">
          <span class="ai-panel-mark"><RobotOutlined /></span>
          <div class="ai-panel-brand-copy">
            <strong>虎绿林 AI 助手</strong>
            <small>{{ contextLabel }}</small>
          </div>
        </div>

        <div class="ai-panel-head-actions">
          <a-dropdown v-if="configured" placement="bottomRight" :trigger="['click']">
            <a-button size="small" :title="`当前使用：${activeAccount.name}（点击切换）`">
              <ApiOutlined />
              <span class="ai-account-name">{{ activeAccount.name }}</span>
              <DownOutlined class="ai-account-caret" />
            </a-button>
            <template #overlay>
              <a-menu
                class="ai-account-menu"
                :selected-keys="[activeAccount.id]"
                @click="handleAccountSwitch"
              >
                <a-menu-item v-for="item in accounts" :key="item.id">
                  <span class="ai-account-menu-item">
                    <span class="ai-account-menu-name">{{ item.name }}</span>
                    <small>{{ item.model }}</small>
                  </span>
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="__manage">
                  <SettingOutlined /> 管理账号池…
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-tag v-if="needsSync" color="orange">未同步</a-tag>
          <a-button size="small" @click="poolOpen = true">
            <SettingOutlined />
            <span class="ai-hide-sm">{{ configured ? '账号池' : '添加账号' }}</span>
          </a-button>
          <a-button size="small" type="text" aria-label="关闭 AI 助手" @click="close">
            <CloseOutlined />
          </a-button>
        </div>
      </header>

      <div v-if="aiConfig.state.loading" class="ai-panel-loading">
        <a-spin size="large" />
        <span>正在读取 AI 配置…</span>
      </div>

      <div v-else-if="!configured" class="ai-panel-empty">
        <a-empty description="还没有可用的 AI 账号">
          <a-button type="primary" @click="poolOpen = true">
            <PlusOutlined /> 添加第一个 AI 账号
          </a-button>
        </a-empty>
        <p class="ai-panel-empty-hint">
          账号配置保存在你的虎绿林账号里，换设备也能直接使用。
        </p>
      </div>

      <div v-else class="ai-panel-body">
        <aside class="ai-panel-side">
          <button
            v-for="item in actions"
            :key="item.key"
            type="button"
            class="ai-action"
            :class="{ 'is-active': action === item.key }"
            @click="selectAction(item.key)"
          >
            <component :is="item.icon" />
            <span>{{ item.label }}</span>
          </button>
        </aside>

        <main class="ai-panel-main">
          <div class="ai-panel-context">
            <template v-if="state.page === 'topic' && state.topic">
              <strong>{{ state.topic.title || '（无标题）' }}</strong>
              <span>
                {{ state.topic.forum || '未知版块' }} · 楼主 {{ state.topic.author || '匿名' }} ·
                {{ state.floors.length }} 层
              </span>
            </template>
            <template v-else-if="state.page === 'home'">
              <strong>论坛首页</strong>
              <span>已读取 {{ state.homeTopics.length }} 条帖子</span>
            </template>
            <template v-else>
              <strong>正在等待页面数据…</strong>
              <span>帖子内容加载完成后即可使用</span>
            </template>
          </div>

          <div class="ai-panel-options">
            <template v-if="action === 'summary' || action === 'translate'">
              <a-checkbox v-model:checked="includeReplies">
                连同楼层回复一起{{ action === 'translate' ? '翻译' : '汇总' }}（默认只看主楼）
              </a-checkbox>
            </template>

            <template v-if="action === 'generate'">
              <div class="ai-field">
                <label>回复风格（可多选）</label>
                <a-checkbox-group v-model:value="replyStyles" :options="styleOptions" />
              </div>
              <div class="ai-field">
                <label>补充要求（可选）</label>
                <a-textarea
                  v-model:value="instruction"
                  :rows="2"
                  :maxlength="200"
                  placeholder="例如：以过来人的身份回应，提到我也遇到过同样的报错"
                />
              </div>
            </template>

            <template v-if="action === 'polish'">
              <div class="ai-field">
                <label>润色方向</label>
                <a-radio-group v-model:value="polishTone" :options="toneOptions" option-type="button" size="small" />
              </div>
              <div class="ai-field">
                <label>当前回复框内容</label>
                <div class="ai-draft-preview">
                  {{ draftText.trim() || '（回复框还是空的，写几个字再来润色）' }}
                </div>
              </div>
            </template>

            <template v-if="action === 'translate'">
              <div class="ai-field">
                <label>翻译成</label>
                <a-radio-group v-model:value="language" :options="languageOptions" option-type="button" size="small" />
              </div>
            </template>
          </div>

          <div class="ai-panel-run">
            <a-button
              type="primary"
              :loading="running"
              :disabled="!canRun"
              @click="run"
            >
              <template #icon><ThunderboltOutlined /></template>
              {{ currentAction.runText }}
            </a-button>
            <a-button v-if="running" @click="cancelRun">取消</a-button>
            <span class="ai-panel-run-hint">{{ runHint }}</span>
          </div>

          <div class="ai-panel-result">
            <a-alert v-if="error" type="error" show-icon :message="error" />

            <template v-else-if="result">
              <div class="ai-result-head">
                <span class="ai-result-title">{{ currentAction.title }}</span>
                <a-space :size="4" wrap>
                  <a-button v-if="markdownResult" size="small" @click="showSource = !showSource">
                    <CodeOutlined /> {{ showSource ? '排版预览' : '原始文本' }}
                  </a-button>
                  <a-button size="small" @click="copyResult">
                    <CopyOutlined /> 复制
                  </a-button>
                  <a-button v-if="resultKind === 'reply'" size="small" @click="insertResult">
                    <EditOutlined /> 插入回复框
                  </a-button>
                  <a-button v-if="resultKind === 'polish'" size="small" @click="applyPolish">
                    <EditOutlined /> 替换回复框内容
                  </a-button>
                  <a-button
                    v-if="resultKind === 'reply'"
                    size="small"
                    type="primary"
                    @click="openSendConfirm"
                  >
                    <SendOutlined /> 发表评论
                  </a-button>
                </a-space>
              </div>

              <div
                v-if="markdownResult && !showSource"
                class="ai-result-markdown"
                v-html="resultHtml"
              />
              <pre v-else class="ai-result-text">{{ result }}</pre>

              <p v-if="usageText" class="ai-result-usage">{{ usageText }}</p>
            </template>

            <a-empty v-else description="选择一个功能，然后点左边的按钮开始" />
          </div>
        </main>
      </div>
    </div>

    <a-modal
      v-model:open="sendConfirmOpen"
      title="确认发表这条评论？"
      :z-index="1100"
      ok-text="确认发表"
      cancel-text="再改改"
      :confirm-loading="sending"
      @ok="confirmSend"
    >
      <a-alert
        class="ai-send-warning"
        type="warning"
        show-icon
        message="发表后就是一条真实的公开回复，请先确认内容。"
      />
      <div class="ai-send-preview">{{ result }}</div>
      <a-button size="small" class="ai-send-edit" @click="insertResult">
        <EditOutlined /> 插入回复框，手动改完再发
      </a-button>
    </a-modal>
  </a-modal>

  <!-- 账号池独立成全屏弹窗，覆盖在助手面板之上；关掉它就回到助手。 -->
  <AiAccountPoolModal v-model:open="poolOpen" />
</template>

<script setup>
import { computed, markRaw, onBeforeUnmount, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  ApiOutlined,
  BulbOutlined,
  CloseOutlined,
  CodeOutlined,
  CommentOutlined,
  CopyOutlined,
  DownOutlined,
  EditOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  TranslationOutlined,
} from '@ant-design/icons-vue'
import AiAccountPoolModal from './AiAccountPoolModal.vue'
import { renderMarkdown } from '../utils/markdown'
import { aiConfig } from '../services/aiConfig'
import {
  buildCommentMessages,
  buildGenerateReplyMessages,
  buildHomeDigestMessages,
  buildPolishMessages,
  buildSummaryMessages,
  buildTitleMessages,
  buildTranslateMessages,
  chatCompletion,
  POLISH_TONES,
  REPLY_STYLES,
  TRANSLATE_LANGUAGES,
} from '../services/ai'
import { session } from '../stores/session'
import { aiContext } from '../stores/aiContext'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open'])

const TOPIC_ACTIONS = [
  { key: 'summary', label: '总结帖子', title: '帖子总结', runText: '开始总结', icon: markRaw(FileTextOutlined) },
  { key: 'comments', label: '分析评论', title: '评论区分析', runText: '分析评论', icon: markRaw(CommentOutlined) },
  { key: 'generate', label: '生成评论', title: 'AI 生成的回复', runText: '生成一条回复', icon: markRaw(BulbOutlined) },
  { key: 'polish', label: '润色回复', title: '润色后的回复', runText: '润色我的回复', icon: markRaw(EditOutlined) },
  { key: 'translate', label: '整帖翻译', title: '译文', runText: '开始翻译', icon: markRaw(TranslationOutlined) },
  { key: 'title', label: '标题建议', title: '标题建议', runText: '生成标题', icon: markRaw(FontSizeOutlined) },
]

const HOME_ACTIONS = [
  { key: 'digest', label: '帖子速览', title: '帖子列表速览', runText: '生成速览', icon: markRaw(BulbOutlined) },
]

const state = aiContext.state
const poolOpen = ref(false)
const action = ref('summary')
const running = ref(false)
const result = ref('')
const resultKind = ref('text')
const error = ref('')
const usageText = ref('')
const includeReplies = ref(false)
const replyStyles = ref(['friendly'])
const instruction = ref('')
const polishTone = ref('keep')
const language = ref('zh')
const sending = ref(false)
const sendConfirmOpen = ref(false)
const draftText = ref('')
const showSource = ref(false)

let controller = null
let stopDraftWatch = null

const configured = computed(() => aiConfig.configured)
const accounts = computed(() => aiConfig.accounts)
const activeAccount = computed(() => aiConfig.active || { id: '', name: '未配置' })
const needsSync = computed(() => aiConfig.needsSync)
const actions = computed(() => (state.page === 'home' ? HOME_ACTIONS : TOPIC_ACTIONS))
const currentAction = computed(() => actions.value.find((item) => item.key === action.value) || actions.value[0])
// 只有分析类结果做 Markdown 排版；reply / polish 要原样插进论坛回复框，保持纯文本。
const markdownResult = computed(() => resultKind.value === 'text')
const resultHtml = computed(() => (markdownResult.value ? renderMarkdown(result.value) : ''))
const styleOptions = REPLY_STYLES.map((item) => ({ label: item.label, value: item.value }))
const toneOptions = POLISH_TONES.map((item) => ({ label: item.label, value: item.value }))
const languageOptions = TRANSLATE_LANGUAGES.map((item) => ({ label: item.label, value: item.value }))
const contextLabel = computed(() => {
  if (state.page === 'topic' && state.topic) return `帖子 · ${state.topic.title || '无标题'}`
  if (state.page === 'home') return `首页 · ${state.homeTopics.length} 条帖子`
  return '等待页面数据'
})

const hasTopicContent = computed(() => Boolean(state.mainPost?.trim()) || state.floors.length > 0)
const replyFloorCount = computed(() => state.floors.filter((floor) => !floor.isMain).length)
const canRun = computed(() => {
  if (running.value) return true
  if (!state.ready) return false
  if (state.page === 'home') return state.homeTopics.length > 0
  if (!hasTopicContent.value) return false
  if (currentAction.value.key === 'polish') return Boolean(draftText.value.trim())
  if (currentAction.value.key === 'comments') return replyFloorCount.value > 0
  return true
})
const runHint = computed(() => {
  if (!state.ready) return '正在等待页面数据'
  if (state.page === 'home' && !state.homeTopics.length) return '首页还没有帖子'
  if (state.page === 'topic' && !hasTopicContent.value) return '还没有读到帖子内容'
  if (currentAction.value.key === 'polish') {
    return draftText.value.trim() ? '读取回复框里的内容进行润色' : '先在回复框里写点内容'
  }
  if (currentAction.value.key === 'comments') {
    return replyFloorCount.value > 0 ? `${replyFloorCount.value} 条回复会发给 AI` : '这个帖子还没有回复'
  }
  return '内容只会发送给你自己配置的 AI 服务'
})

function syncDraft() {
  stopDraftWatch?.()
  stopDraftWatch = null
  const bridge = aiContext.replyBridge()
  if (!bridge?.draftRef) {
    draftText.value = ''
    return
  }
  stopDraftWatch = watch(bridge.draftRef, (value) => { draftText.value = value || '' }, { immediate: true })
}

watch(
  () => props.open,
  async (value) => {
    if (!value) {
      cancelRun()
      sendConfirmOpen.value = false
      poolOpen.value = false
      return
    }
    // 关闭时组件不销毁，重新打开时保留上一次的结果，只刷新账号和草稿。
    syncDraft()
    await aiConfig.load()
    // 一个账号都没有时，直接把账号池推出来，省得用户找不到入口。
    if (!configured.value) poolOpen.value = true
  },
)

watch(
  () => session.isLoggedIn.value,
  () => {
    // 登录后拉取账号上的账号池，退出后回到本机缓存。
    aiConfig.load({ force: true })
  },
)

// 页面类型或具体帖子变化时清空上一次的结果。
// 只有「关掉再打开」才保留结果，换帖子继续显示上一篇的总结是会误导人的。
watch(
  () => [state.page, state.topic?.id].join('|'),
  () => {
    action.value = state.page === 'home' ? 'digest' : 'summary'
    resetResult()
    syncDraft()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopDraftWatch?.()
  cancelRun()
})

function selectAction(key) {
  if (action.value === key) return
  action.value = key
  resetResult()
  syncDraft()
}

function resetResult() {
  result.value = ''
  error.value = ''
  usageText.value = ''
  resultKind.value = 'text'
  showSource.value = false
}

function close() {
  // 只是把面板藏起来，不打断正在进行的请求，也不清结果：
  // 再次打开时能看到上一次的输出，继续跑完的请求也会照常显示。
  emit('update:open', false)
}

function cancelRun() {
  controller?.abort()
  controller = null
  running.value = false
}

async function request(messages, kind) {
  const account = aiConfig.active
  if (!account) {
    error.value = '还没有可用的 AI 账号，请点右上角「设置」添加'
    return
  }

  cancelRun()
  controller = new AbortController()
  running.value = true
  resetResult()

  try {
    const response = await chatCompletion({
      config: account,
      messages,
      signal: controller.signal,
    })
    result.value = response.text
    resultKind.value = kind
    const usage = response.usage
    usageText.value = usage
      ? `${account.name} · ${response.model} · 输入 ${usage.prompt_tokens ?? '--'} / 输出 ${usage.completion_tokens ?? '--'} tokens`
      : `${account.name} · 模型：${response.model}`
  } catch (reason) {
    error.value = reason?.message || 'AI 请求失败'
  } finally {
    running.value = false
    controller = null
  }
}

async function run() {
  if (!canRun.value) return
  const key = currentAction.value.key
  const topic = state.topic

  if (key === 'summary') {
    await request(buildSummaryMessages({
      topic,
      mainPost: state.mainPost,
      floors: state.floors,
      includeReplies: includeReplies.value,
    }), 'text')
    return
  }

  if (key === 'comments') {
    await request(buildCommentMessages({ topic, floors: state.floors }), 'text')
    return
  }

  if (key === 'generate') {
    await request(buildGenerateReplyMessages({
      topic,
      mainPost: state.mainPost,
      floors: state.floors,
      styles: replyStyles.value,
      instruction: instruction.value.trim(),
    }), 'reply')
    return
  }

  if (key === 'polish') {
    await request(buildPolishMessages({
      topic,
      draft: draftText.value,
      tone: polishTone.value,
    }), 'polish')
    return
  }

  if (key === 'translate') {
    await request(buildTranslateMessages({
      topic,
      mainPost: state.mainPost,
      floors: state.floors,
      includeReplies: includeReplies.value,
      language: language.value,
    }), 'text')
    return
  }

  if (key === 'title') {
    await request(buildTitleMessages({ topic, mainPost: state.mainPost }), 'text')
    return
  }

  if (key === 'digest') {
    await request(buildHomeDigestMessages({ topics: state.homeTopics }), 'text')
  }
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(result.value)
    message.success('已复制到剪贴板')
  } catch {
    message.warning('浏览器未允许复制，请手动选中文本')
  }
}

function insertResult() {
  const bridge = aiContext.replyBridge()
  if (!bridge) {
    message.warning('当前页面没有可用的回复框')
    return
  }
  bridge.setDraft(result.value)
  sendConfirmOpen.value = false
  message.success('已插入到回复框')
  close()
}

function applyPolish() {
  const bridge = aiContext.replyBridge()
  if (!bridge) {
    message.warning('当前页面没有可用的回复框')
    return
  }
  bridge.setDraft(result.value)
  message.success('已替换回复框内容')
  close()
}

function openSendConfirm() {
  const bridge = aiContext.replyBridge()
  if (!bridge?.canSend()) {
    message.warning(session.isLoggedIn.value ? '当前帖子无法回复' : '请先登录后再发表评论')
    return
  }
  sendConfirmOpen.value = true
}

async function confirmSend() {
  const bridge = aiContext.replyBridge()
  if (!bridge) return

  sending.value = true
  try {
    await bridge.send(result.value)
    sendConfirmOpen.value = false
    message.success('评论已发表')
    close()
  } catch (reason) {
    message.error(reason?.message || '发表失败')
  } finally {
    sending.value = false
  }
}

async function handleAccountSwitch({ key }) {
  if (key === '__manage') {
    poolOpen.value = true
    return
  }

  const result = await aiConfig.setPreferred(key)
  if (result?.error) {
    // 本机已经切换成功，只是偏好没同步到账号，提示一下即可。
    message.warning(`已切换，但偏好同步到账号失败：${result.error.message}`)
  }
}
</script>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--surface);
}

.ai-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  padding: 10px 14px;
  color: var(--text-heading);
  border-bottom: 1px solid var(--line);
  background: var(--surface-accent);
  gap: 12px;
}

.ai-panel-brand {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.ai-panel-mark {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--on-brand);
  border-radius: 9px;
  background: linear-gradient(135deg, var(--brand), var(--brand-deep));
  font-size: 17px;
}

.ai-panel-brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.ai-panel-brand-copy strong {
  font-size: 14px;
  line-height: 1.3;
}

.ai-panel-brand-copy small {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-panel-head-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
}

.ai-account-name {
  display: inline-block;
  overflow: hidden;
  max-width: 160px;
  vertical-align: bottom;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-account-caret {
  font-size: 10px;
  opacity: 0.7;
}

.ai-account-menu-item {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.ai-account-menu-name {
  color: var(--text-heading);
}

.ai-account-menu-item small {
  color: var(--muted-soft);
  font-size: 11px;
}

.ai-panel-loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--muted);
  font-size: 13px;
  gap: 14px;
}

.ai-panel-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
  -webkit-overflow-scrolling: touch;
}

.ai-panel-empty {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 32px 18px;
  gap: 6px;
}

.ai-panel-empty-hint {
  margin: 0;
  color: var(--muted-soft);
  font-size: 12px;
  text-align: center;
}

.ai-panel-body {
  display: grid;
  flex: 1 1 auto;
  min-height: 0;
  grid-template-columns: 176px minmax(0, 1fr);
}

.ai-panel-side {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 12px 8px;
  overflow-y: auto;
  border-right: 1px solid var(--line);
  background: var(--surface-soft);
  gap: 3px;
}

.ai-action {
  display: flex;
  align-items: center;
  padding: 9px 10px;
  color: var(--text-subtle);
  font-size: 13px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  gap: 9px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.ai-action:hover,
.ai-action:focus-visible {
  color: var(--brand);
  background: var(--surface-hover);
  outline: none;
}

.ai-action.is-active {
  color: var(--brand);
  background: var(--brand-soft);
  font-weight: 600;
}

.ai-panel-main {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 16px 20px 22px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.ai-panel-context {
  display: flex;
  flex-direction: column;
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--brand);
  border-radius: 6px;
  background: var(--surface-tint);
  gap: 3px;
}

.ai-panel-context strong {
  color: var(--text-heading);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.ai-panel-context span {
  color: var(--muted);
  font-size: 12px;
}

.ai-panel-options {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  gap: 14px;
}

.ai-panel-options:empty {
  display: none;
}

.ai-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.ai-field > label {
  color: var(--text-subtle);
  font-size: 12px;
  font-weight: 600;
}

.ai-draft-preview {
  max-height: 120px;
  overflow-y: auto;
  padding: 9px 11px;
  color: var(--text-subtle);
  font-size: 12px;
  line-height: 1.7;
  border: 1px dashed var(--line-strong);
  border-radius: 6px;
  background: var(--surface-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ai-panel-run {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 18px;
  gap: 10px;
}

.ai-panel-run-hint {
  color: var(--muted-soft);
  font-size: 12px;
}

.ai-panel-result {
  flex: 1 1 auto;
  min-height: 160px;
}

.ai-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 10px;
  gap: 8px;
}

.ai-result-title {
  color: var(--text-heading);
  font-size: 14px;
  font-weight: 600;
}

.ai-result-text {
  margin: 0;
  padding: 14px 16px;
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.85;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* Markdown 预览：外层沿用结果卡片的容器样式，内部元素只做排版。 */
.ai-result-markdown {
  padding: 14px 18px;
  color: var(--text);
  font-size: 14px;
  line-height: 1.85;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-soft);
  overflow-wrap: anywhere;
}

.ai-result-markdown :deep(> :first-child) {
  margin-top: 0;
}

.ai-result-markdown :deep(> :last-child) {
  margin-bottom: 0;
}

.ai-result-markdown :deep(p) {
  margin: 0 0 10px;
}

.ai-result-markdown :deep(h3),
.ai-result-markdown :deep(h4),
.ai-result-markdown :deep(h5),
.ai-result-markdown :deep(h6) {
  margin: 18px 0 8px;
  color: var(--text-heading);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
}

.ai-result-markdown :deep(h3) {
  font-size: 16px;
}

.ai-result-markdown :deep(ul),
.ai-result-markdown :deep(ol) {
  margin: 0 0 10px;
  padding-left: 22px;
}

.ai-result-markdown :deep(li) {
  margin: 3px 0;
}

.ai-result-markdown :deep(li > ul),
.ai-result-markdown :deep(li > ol) {
  margin: 3px 0;
}

.ai-result-markdown :deep(strong) {
  color: var(--text-heading);
  font-weight: 600;
}

.ai-result-markdown :deep(code) {
  padding: 2px 5px;
  border-radius: 3px;
  background: var(--surface-code-inline);
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}

.ai-result-markdown :deep(pre) {
  margin: 0 0 12px;
  padding: 12px 14px;
  overflow-x: auto;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--surface-code);
}

.ai-result-markdown :deep(pre code) {
  padding: 0;
  background: transparent;
  font-size: 13px;
  line-height: 1.7;
}

.ai-result-markdown :deep(blockquote) {
  margin: 0 0 12px;
  padding: 8px 14px;
  color: var(--text-subtle);
  border-left: 3px solid var(--quote-border);
  background: var(--surface-quote);
}

.ai-result-markdown :deep(blockquote p) {
  margin: 0;
}

.ai-result-markdown :deep(hr) {
  margin: 16px 0;
  border: 0;
  border-top: 1px solid var(--line);
}

.ai-result-markdown :deep(table) {
  display: block;
  width: 100%;
  margin: 0 0 12px;
  overflow-x: auto;
  border-collapse: collapse;
}

.ai-result-markdown :deep(th),
.ai-result-markdown :deep(td) {
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid var(--line-strong);
  text-align: left;
}

.ai-result-markdown :deep(th) {
  color: var(--text-heading);
  background: var(--surface-tint);
  font-weight: 600;
}

.ai-result-markdown :deep(a) {
  color: var(--link);
}

.ai-result-usage {
  margin: 8px 0 0;
  color: var(--muted-soft);
  font-size: 11px;
}

.ai-send-warning {
  margin-bottom: 12px;
}

.ai-send-preview {
  max-height: 260px;
  overflow-y: auto;
  padding: 10px 12px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.8;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ai-send-edit {
  margin-top: 10px;
}

/* 面板占屏幕 80%，四角圆角；高度用视口百分比，避免内容少时高度塌陷。 */
:global(.ai-panel-modal .ant-modal) {
  top: 10vh;
  width: 80vw !important;
  max-width: 80vw;
  margin: 0 auto;
  padding-bottom: 0;
}

:global(.ai-panel-modal .ant-modal-content) {
  display: flex;
  height: 80vh;
  height: 80dvh;
  flex-direction: column;
  padding: 0;
  border-radius: 12px;
  overflow: hidden;
}

:global(.ai-panel-modal .ant-modal-body) {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  padding: 0;
}

@media (max-width: 760px) {
  /* 小屏没有足够空间放浮层，退回全屏铺满。 */
  :global(.ai-panel-modal .ant-modal) {
    top: 0;
    width: 100vw !important;
    max-width: 100vw;
  }

  :global(.ai-panel-modal .ant-modal-content) {
    height: 100vh;
    height: 100dvh;
    border-radius: 0;
  }

  .ai-hide-sm {
    display: none;
  }

  .ai-account-name {
    max-width: 84px;
  }

  .ai-panel-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .ai-panel-side {
    flex-direction: row;
    padding: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    gap: 6px;
  }

  .ai-action {
    flex: 0 0 auto;
    padding: 7px 12px;
    border: 1px solid var(--line);
    background: var(--surface);
  }

  .ai-panel-main {
    padding: 12px 12px 20px;
  }

  .ai-result-text {
    padding: 12px;
    font-size: 13px;
  }
}
</style>
