<template>
  <a-form class="ai-account-form" layout="vertical" @submit.prevent>
    <a-form-item label="显示名称">
      <a-input v-model:value="form.name" :maxlength="30" placeholder="例如：主力 DeepSeek" />
      <p class="ai-account-hint">用来在切换菜单里区分多个账号，可以随便起。</p>
    </a-form-item>

    <a-form-item label="AI 平台">
      <a-select
        :value="form.provider"
        :options="providerSelectOptions"
        :dropdown-style="DROPDOWN_STYLE"
        show-search
        option-filter-prop="label"
        @change="changeProvider"
      />
      <p v-if="currentProvider.hint" class="ai-account-hint">{{ currentProvider.hint }}</p>
    </a-form-item>

    <a-form-item label="API Key" required>
      <a-input-password
        v-model:value="form.apiKey"
        :placeholder="keyPlaceholder"
        autocomplete="off"
      />
      <p v-if="currentProvider.consoleUrl" class="ai-account-hint">
        <a :href="currentProvider.consoleUrl" target="_blank" rel="noopener noreferrer">
          去 {{ currentProvider.name }} 控制台获取 Key
        </a>
        <span>（Key 会明文保存在服务器上，建议使用独立的、有额度限制的 Key）</span>
      </p>
    </a-form-item>

    <a-collapse v-model:active-key="advancedKeys" :bordered="false" class="ai-account-advanced">
      <a-collapse-panel key="advanced">
        <template #header>
          <span class="ai-account-advanced-title">
            接口地址与模型
            <a-tag v-if="autoFilled" color="green">已自动填充</a-tag>
          </span>
        </template>

        <a-form-item label="接口地址（OpenAI 兼容）" required>
          <a-input v-model:value="form.baseUrl" placeholder="https://api.example.com/v1" />
          <p class="ai-account-hint">只需要填到 /v1 这一层，程序会自动拼上 /chat/completions。</p>
        </a-form-item>

        <a-form-item label="模型名称" required>
          <a-auto-complete
            v-model:value="form.model"
            :options="modelOptions"
            placeholder="例如 deepseek-flash"
            :filter-option="filterModel"
          />
        </a-form-item>

        <a-form-item :label="`回答随机度（temperature）：${form.temperature}`">
          <a-slider v-model:value="form.temperature" :min="0" :max="2" :step="0.1" />
        </a-form-item>

        <a-form-item label="最大输出长度（tokens）">
          <a-input-number v-model:value="form.maxTokens" :min="128" :max="32768" :step="256" />
        </a-form-item>
      </a-collapse-panel>
    </a-collapse>

    <a-alert
      v-if="testResult"
      class="ai-account-result"
      :type="testResult.ok ? 'success' : 'error'"
      show-icon
      :message="testResult.message"
    />

    <div class="ai-account-actions">
      <a-button :loading="testing" @click="runTest">测试连接</a-button>
      <a-space>
        <a-button @click="emit('cancel')">取消</a-button>
        <a-button type="primary" :loading="saving" @click="submit">{{ submitText }}</a-button>
      </a-space>
    </div>
  </a-form>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { CUSTOM_PROVIDER_ID, getProvider, providerOptions } from '../config/aiProviders'
import { testConnection } from '../services/ai'

const props = defineProps({
  account: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['submit', 'cancel'])

// 自定义平台在选项里排第一位，新建账号时默认选中它，并把「接口地址与模型」展开，
// 让用户直接看到需要手动填写的内容。用户也可以改成预设平台，改完会自动填好地址与模型。
const customProvider = getProvider(CUSTOM_PROVIDER_ID)

const advancedKeys = ref(['advanced'])
const autoFilled = ref(false)
const testing = ref(false)
const testResult = ref(null)

const form = reactive({
  name: customProvider.name,
  provider: CUSTOM_PROVIDER_ID,
  baseUrl: '',
  model: '',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2048,
})

// 平台下拉的弹层是挂在 body 上的，z-index 固定为 antd 的 1050，
// 会被账号池 / 编辑弹窗盖住，必须显式抬高。
const DROPDOWN_STYLE = { zIndex: 1300 }

const submitText = computed(() => (props.account ? '保存修改' : '添加账号'))
const currentProvider = computed(() => getProvider(form.provider))
const providerSelectOptions = computed(() => providerOptions())
const modelOptions = computed(() => (
  currentProvider.value.models || []
).map((model) => ({ value: model })))
const keyPlaceholder = computed(() => (
  form.provider === 'ollama' ? '本地模型不校验，填 ollama 即可' : '粘贴你的 API Key'
))

watch(
  () => props.account,
  (value) => {
    if (!value) return
    Object.assign(form, {
      name: value.name || '',
      provider: value.provider || CUSTOM_PROVIDER_ID,
      baseUrl: value.baseUrl || '',
      model: value.model || '',
      apiKey: value.apiKey || '',
      temperature: value.temperature ?? 0.7,
      maxTokens: value.maxTokens ?? 2048,
    })
    const provider = getProvider(form.provider)
    autoFilled.value = Boolean(provider.defaultModel)
    // 自定义平台（预设里唯一没有默认模型的）展开高级项，让用户手填地址与模型。
    advancedKeys.value = (!form.provider || form.provider === CUSTOM_PROVIDER_ID || !provider.defaultModel)
      ? ['advanced']
      : []
  },
  { immediate: true },
)

function changeProvider(id) {
  const previous = getProvider(form.provider)
  const provider = getProvider(id)
  form.provider = id
  testResult.value = null

  // 名称还是自动生成的话就跟着平台一起换，用户自己改过则保留。
  if (!form.name.trim() || form.name.trim() === previous.name) {
    form.name = provider.name
  }

  if (id === CUSTOM_PROVIDER_ID) {
    autoFilled.value = false
    advancedKeys.value = ['advanced']
    return
  }

  form.baseUrl = provider.baseUrl || ''
  form.model = provider.defaultModel || ''
  autoFilled.value = Boolean(provider.baseUrl || provider.defaultModel)
  // 有默认模型的平台收起高级项；没有的（目前只有自定义）保持展开，因为模型必须手填。
  advancedKeys.value = provider.defaultModel ? [] : ['advanced']
}

function filterModel(input, option) {
  return String(option?.value || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function currentAccount() {
  return {
    name: form.name.trim() || currentProvider.value.name,
    provider: form.provider,
    baseUrl: form.baseUrl.trim(),
    model: form.model.trim(),
    apiKey: form.apiKey.trim(),
    temperature: form.temperature,
    maxTokens: form.maxTokens,
  }
}

function validate() {
  if (!form.baseUrl.trim()) return '请填写接口地址'
  if (!form.model.trim()) return '请填写模型名称'
  if (!form.apiKey.trim()) return '请填写 API Key'
  return ''
}

async function runTest() {
  const error = validate()
  if (error) {
    testResult.value = { ok: false, message: error }
    return
  }

  testing.value = true
  testResult.value = null
  try {
    const reply = await testConnection(currentAccount())
    testResult.value = { ok: true, message: `连接成功，模型回复：${reply.slice(0, 40)}` }
  } catch (reason) {
    testResult.value = { ok: false, message: reason?.message || '连接失败' }
  } finally {
    testing.value = false
  }
}

function submit() {
  const error = validate()
  if (error) {
    testResult.value = { ok: false, message: error }
    return
  }
  emit('submit', currentAccount())
}
</script>

<style scoped>
.ai-account-hint {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.ai-account-hint a {
  margin-right: 4px;
}

.ai-account-advanced {
  margin-bottom: 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-soft);
}

.ai-account-advanced :deep(.ant-collapse-header) {
  padding: 10px 14px !important;
}

.ai-account-advanced :deep(.ant-collapse-content-box) {
  padding: 4px 14px 2px !important;
}

.ai-account-advanced-title {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  gap: 8px;
}

.ai-account-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-top: 18px;
  gap: 10px;
}

.ai-account-result {
  margin-top: 14px;
}
</style>
