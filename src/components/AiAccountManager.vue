<template>
  <div class="ai-manager">
    <a-alert
      v-if="firstTime"
      class="ai-manager-banner"
      type="info"
      show-icon
      message="第一次使用，先添加一个 AI 账号"
      description="选择一个平台后会自动填好接口地址和模型名，你只需要粘贴一个 API Key。只要兼容 OpenAI 格式的服务都可以用。"
    />
    <a-alert
      v-else-if="!isLogin"
      class="ai-manager-banner"
      type="warning"
      show-icon
      message="当前未登录，账号只保存在本机浏览器。登录后可以点「同步到账号」。"
    />
    <a-alert
      v-if="state.error"
      class="ai-manager-banner"
      type="warning"
      show-icon
      :message="state.error"
    />

    <div class="ai-manager-head">
      <div class="ai-manager-head-copy">
        <strong>AI 账号</strong>
        <span>{{ accounts.length }} 个 · {{ sourceLabel }}</span>
      </div>
      <a-space size="small" wrap>
        <a-button v-if="needsSync" size="small" :loading="saving" @click="sync">
          <SyncOutlined /> 同步到账号
        </a-button>
        <a-button size="small" type="primary" @click="startAdd">
          <PlusOutlined /> {{ accounts.length ? '添加账号' : '添加第一个账号' }}
        </a-button>
      </a-space>
    </div>

    <a-list v-if="accounts.length" class="ai-account-list" :data-source="accounts">
      <template #renderItem="{ item }">
        <a-list-item class="ai-account-item">
          <div class="ai-account-main">
            <div class="ai-account-title">
              <strong>{{ item.name }}</strong>
              <a-tag v-if="item.id === preferredId" color="green">当前使用</a-tag>
            </div>
            <div class="ai-account-meta">
              <span>{{ providerName(item.provider) }}</span>
              <span>{{ item.model }}</span>
              <span>{{ maskedKey(item.apiKey) }}</span>
            </div>
          </div>

          <template #actions>
            <a-button
              v-if="item.id !== preferredId"
              type="link"
              size="small"
              @click="useAccount(item)"
            >
              设为当前
            </a-button>
            <a-button type="link" size="small" @click="startEdit(item)">编辑</a-button>
            <a-popconfirm
              title="删除这个 AI 账号？"
              ok-text="删除"
              cancel-text="取消"
              @confirm="remove(item)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </template>
        </a-list-item>
      </template>
    </a-list>

    <a-empty v-else class="ai-manager-empty" description="还没有任何 AI 账号" />

    <div v-if="accounts.length" class="ai-manager-foot">
      <a-popconfirm
        title="清除全部 AI 账号？服务端保存的配置也会一起删除。"
        ok-text="清除"
        cancel-text="取消"
        @confirm="clearAll"
      >
        <a-button type="text" size="small" danger>清除全部账号</a-button>
      </a-popconfirm>
    </div>

    <a-modal
      v-model:open="editorOpen"
      :title="editing ? '编辑 AI 账号' : '添加 AI 账号'"
      :footer="null"
      :width="640"
      :z-index="1200"
      destroy-on-close
    >
      <AiAccountForm :account="editing" :saving="saving" @submit="saveAccount" @cancel="editorOpen = false" />
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, SyncOutlined } from '@ant-design/icons-vue'
import AiAccountForm from './AiAccountForm.vue'
import { providerName } from '../config/aiProviders'
import { aiConfig } from '../services/aiConfig'
import { session } from '../stores/session'

defineProps({
  firstTime: { type: Boolean, default: false },
})

const state = aiConfig.state
const isLogin = session.isLoggedIn
const editorOpen = ref(false)
const editing = ref(null)

const accounts = computed(() => aiConfig.accounts)
const preferredId = computed(() => state.pool?.preferredId || '')
const saving = computed(() => state.saving)
const sourceLabel = computed(() => aiConfig.sourceLabel)
const needsSync = computed(() => aiConfig.needsSync)

function maskedKey(key) {
  const value = String(key || '')
  if (value.length <= 12) return '••••••'
  return `${value.slice(0, 6)}••••${value.slice(-4)}`
}

function notify(result, okMessage) {
  if (result?.error) {
    message.warning(`${okMessage}，但同步到账号失败：${result.error.message}`)
    return
  }
  message.success(okMessage)
}

function startAdd() {
  editing.value = null
  editorOpen.value = true
}

function startEdit(item) {
  editing.value = { ...item }
  editorOpen.value = true
}

async function saveAccount(payload) {
  const isEdit = Boolean(editing.value)
  try {
    const result = isEdit
      ? await aiConfig.updateAccount(editing.value.id, payload)
      : await aiConfig.addAccount(payload)
    editorOpen.value = false
    editing.value = null
    notify(result, isEdit ? '账号已更新' : '账号已添加')
  } catch (reason) {
    message.error(reason?.message || '保存失败')
  }
}

async function useAccount(item) {
  notify(await aiConfig.setPreferred(item.id), `已切换到「${item.name}」`)
}

async function remove(item) {
  notify(await aiConfig.removeAccount(item.id), `已删除「${item.name}」`)
}

async function clearAll() {
  notify(await aiConfig.clearAll(), '已清除全部账号')
}

async function sync() {
  notify(await aiConfig.syncToAccount(), '已同步到账号')
}
</script>

<style scoped>
.ai-manager {
  padding-bottom: 20px;
}

.ai-manager-banner {
  margin-bottom: 14px;
}

.ai-manager-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 12px;
  gap: 10px;
}

.ai-manager-head-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ai-manager-head-copy strong {
  color: var(--text-heading);
  font-size: 15px;
}

.ai-manager-head-copy span {
  color: var(--muted);
  font-size: 12px;
}

.ai-account-list :deep(.ant-list-item) {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-soft);
}

.ai-account-list :deep(.ant-list-items) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-account-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.ai-account-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-account-title strong {
  color: var(--text-heading);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.ai-account-meta {
  display: flex;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
  gap: 4px 14px;
}

.ai-manager-empty {
  margin: 24px 0;
}

.ai-manager-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
