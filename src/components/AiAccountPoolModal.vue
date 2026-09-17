<template>
  <a-modal
    :open="open"
    :footer="null"
    :closable="false"
    :mask-closable="true"
    :width="'80vw'"
    :z-index="1100"
    wrap-class-name="ai-pool-modal"
    @cancel="close"
  >
    <div class="ai-pool">
      <header class="ai-pool-head">
        <div class="ai-pool-brand">
          <span class="ai-pool-mark"><ApiOutlined /></span>
          <div class="ai-pool-brand-copy">
            <strong>AI 账号池</strong>
            <small>{{ headHint }}</small>
          </div>
        </div>

        <a-button size="small" type="text" aria-label="返回 AI 助手" @click="close">
          <CloseOutlined />
        </a-button>
      </header>

      <div class="ai-pool-notice">
        <SafetyOutlined />
        <span>储存内容保存在后端的插件持久化数据中，不存在任何第三方服务器。</span>
      </div>

      <div class="ai-pool-body">
        <AiAccountManager />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'
import { ApiOutlined, CloseOutlined, SafetyOutlined } from '@ant-design/icons-vue'
import AiAccountManager from './AiAccountManager.vue'
import { aiConfig } from '../services/aiConfig'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open'])

const headHint = computed(() => {
  const count = aiConfig.accounts.length
  if (!count) return '先添加一个账号，才能开始使用 AI 功能'
  return `${count} 个账号 · ${aiConfig.sourceLabel}`
})

function close() {
  emit('update:open', false)
}
</script>

<style scoped>
.ai-pool {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--surface);
}

.ai-pool-head {
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

.ai-pool-brand {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.ai-pool-mark {
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

.ai-pool-brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.ai-pool-brand-copy strong {
  font-size: 14px;
  line-height: 1.3;
}

.ai-pool-brand-copy small {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 与 AI 助手面板保持一致的 80% 浮层形态。 */
.ai-pool-notice {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  padding: 9px 16px;
  color: var(--brand);
  font-size: 12px;
  line-height: 1.6;
  border-bottom: 1px solid var(--line);
  background: var(--brand-soft);
  gap: 8px;
}

.ai-pool-notice :deep(.anticon) {
  flex: 0 0 auto;
  font-size: 14px;
}

.ai-pool-body {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 18px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

:global(.ai-pool-modal .ant-modal) {
  top: 10vh;
  width: 80vw !important;
  max-width: 80vw;
  margin: 0 auto;
  padding-bottom: 0;
}

:global(.ai-pool-modal .ant-modal-content) {
  display: flex;
  height: 80vh;
  height: 80dvh;
  flex-direction: column;
  padding: 0;
  border-radius: 12px;
  overflow: hidden;
}

:global(.ai-pool-modal .ant-modal-body) {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  padding: 0;
}

@media (max-width: 760px) {
  /* 小屏没有足够空间放浮层，退回全屏铺满。 */
  :global(.ai-pool-modal .ant-modal) {
    top: 0;
    width: 100vw !important;
    max-width: 100vw;
  }

  :global(.ai-pool-modal .ant-modal-content) {
    height: 100vh;
    height: 100dvh;
    border-radius: 0;
  }

  .ai-pool-notice {
    padding: 8px 12px;
    font-size: 11px;
  }

  .ai-pool-body {
    padding: 14px 12px;
  }
}
</style>