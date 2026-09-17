import { reactive, readonly } from 'vue'
import { CUSTOM_PROVIDER_ID, providerName } from '../config/aiProviders'
import { session } from '../stores/session'
import { storage } from './storage'
import { webplugStorage } from './webplugStorage'

// 登录用户存到网页插件数据持久化里（随账号多设备同步）；
// 未登录时降级到本机 localStorage，登录后可在设置里同步到账号。
const BACKEND_KEY = 'ai_config'
const LOCAL_KEY = 'aiConfig'
const SCHEMA_VERSION = 2

const state = reactive({
  loaded: false,
  loading: false,
  saving: false,
  // 账号池：{ schema, preferredId, accounts: [{ id, name, provider, baseUrl, model, apiKey, ... }] }
  pool: null,
  source: 'none',
  version: null,
  error: '',
})

function numberIn(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function createAccountId() {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/** 校验并补齐单个 AI 账号；缺少地址、模型或 Key 的一律丢弃。 */
function normalizeAccount(raw) {
  if (!raw || typeof raw !== 'object') return null

  const baseUrl = String(raw.baseUrl || '').trim()
  const model = String(raw.model || '').trim()
  const apiKey = String(raw.apiKey || '').trim()
  if (!baseUrl || !model || !apiKey) return null

  const provider = String(raw.provider || CUSTOM_PROVIDER_ID)

  return {
    id: String(raw.id || '').trim() || createAccountId(),
    name: String(raw.name || '').trim() || providerName(provider),
    provider,
    baseUrl,
    model,
    apiKey,
    temperature: numberIn(raw.temperature, 0.7, 0, 2),
    maxTokens: Math.round(numberIn(raw.maxTokens, 2048, 128, 32_768)),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
  }
}

function buildPool(accounts, preferredId) {
  const preferred = accounts.some((item) => item.id === preferredId)
    ? preferredId
    : accounts[0]?.id ?? ''
  return { schema: SCHEMA_VERSION, preferredId: preferred, accounts, updatedAt: Date.now() }
}

/**
 * 兼容两种历史数据：
 * - v2：{ schema, preferredId, accounts: [...] }
 * - v1：单个账号对象（baseUrl / model / apiKey 直接挂在顶层），迁移成只有一个账号的池。
 */
function normalizePool(raw) {
  if (!raw || typeof raw !== 'object') return null

  const accounts = (Array.isArray(raw.accounts) ? raw.accounts : [raw])
    .map(normalizeAccount)
    .filter(Boolean)
  if (!accounts.length) return null

  return buildPool(accounts, raw.preferredId)
}

function toError(reason, fallback) {
  if (reason instanceof Error) return reason
  return new Error(reason ? String(reason) : fallback)
}

export const aiConfig = {
  state: readonly(state),

  get accounts() {
    return state.pool?.accounts || []
  },

  get active() {
    const accounts = state.pool?.accounts || []
    if (!accounts.length) return null
    return accounts.find((item) => item.id === state.pool.preferredId) || accounts[0]
  },

  get configured() {
    return this.accounts.length > 0
  },

  /** 已登录，但当前账号池还没同步到服务端。 */
  get needsSync() {
    return this.configured && session.isLoggedIn.value && state.source !== 'backend'
  },

  get sourceLabel() {
    if (!this.configured) return '未配置'
    return state.source === 'backend' ? '已同步到账号' : '仅保存在本机'
  },

  /**
   * 读取账号池：优先账号上的，其次本机缓存的。
   * 网络异常时保留本地可用账号，只做提示。
   */
  async load({ force = false } = {}) {
    if (state.loaded && !force) return state.pool
    state.loading = true
    state.error = ''

    const local = normalizePool(storage.get(LOCAL_KEY, null))
    let remote = null
    let remoteVersion = null

    if (session.isLoggedIn.value) {
      try {
        const result = await webplugStorage.getJson(BACKEND_KEY)
        remote = normalizePool(result.value)
        remoteVersion = result.version ?? null
      } catch (reason) {
        state.error = toError(reason, '读取账号上的 AI 配置失败').message
      }
    }

    if (remote) {
      state.pool = remote
      state.version = remoteVersion
      state.source = 'backend'
      storage.set(LOCAL_KEY, remote)
    } else {
      state.pool = local
      state.version = null
      state.source = local ? 'local' : 'none'
      if (local && state.error) {
        state.error = `${state.error}（当前显示的是本机缓存的账号）`
      }
    }

    state.loaded = true
    state.loading = false
    return state.pool
  },

  /** 写入本机，并在已登录时同步到服务端。不抛异常，通过返回值告知同步结果。 */
  async persist() {
    if (!state.pool) return { source: 'none', error: null }

    const payload = { ...state.pool, schema: SCHEMA_VERSION, updatedAt: Date.now() }
    state.pool = payload
    state.loaded = true
    state.saving = true
    state.error = ''
    storage.set(LOCAL_KEY, payload)

    let error = null
    try {
      if (session.isLoggedIn.value) {
        const result = await webplugStorage.setJson(BACKEND_KEY, payload, state.version ?? undefined)
        state.version = result.version ?? null
        state.source = 'backend'
      } else {
        state.version = null
        state.source = 'local'
      }
    } catch (reason) {
      error = toError(reason, '同步到账号失败')
      state.source = 'local'
      state.error = error.message
    } finally {
      state.saving = false
    }

    return { source: state.source, error }
  },

  async addAccount(rawAccount) {
    const account = normalizeAccount(rawAccount)
    if (!account) throw new Error('账号信息不完整，请填写接口地址、模型和 API Key')

    state.pool = buildPool([...this.accounts, account], account.id)
    return this.persist()
  },

  async updateAccount(id, rawAccount) {
    const current = this.accounts.find((item) => item.id === id)
    if (!current) throw new Error('要修改的账号不存在')

    const account = normalizeAccount({
      ...rawAccount,
      id,
      createdAt: current.createdAt,
      updatedAt: Date.now(),
    })
    if (!account) throw new Error('账号信息不完整，请填写接口地址、模型和 API Key')

    state.pool = buildPool(
      this.accounts.map((item) => (item.id === id ? account : item)),
      state.pool.preferredId,
    )
    return this.persist()
  },

  async removeAccount(id) {
    const rest = this.accounts.filter((item) => item.id !== id)
    if (!rest.length) return this.clearAll()

    state.pool = buildPool(rest, state.pool.preferredId)
    return this.persist()
  },

  /** 切换默认使用的账号，切换结果同样写回插件存储。 */
  async setPreferred(id) {
    if (!this.accounts.some((item) => item.id === id)) return { source: state.source, error: null }
    if (state.pool.preferredId === id) return { source: state.source, error: null }

    state.pool = buildPool(this.accounts, id)
    return this.persist()
  },

  /** 把本机账号池整体上传到账号（用于未登录时配置、之后登录的场景）。 */
  syncToAccount() {
    return this.persist()
  },

  async clearAll() {
    state.saving = true
    state.error = ''
    try {
      storage.remove(LOCAL_KEY)
      if (session.isLoggedIn.value) {
        await webplugStorage.set(BACKEND_KEY, '', state.version ?? undefined)
      }
      state.pool = null
      state.version = null
      state.source = 'none'
      state.loaded = true
      return { source: 'none', error: null }
    } catch (reason) {
      const error = toError(reason, '清除 AI 账号失败')
      state.error = error.message
      return { source: 'none', error }
    } finally {
      state.saving = false
    }
  },
}
