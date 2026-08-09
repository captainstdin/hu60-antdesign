import { accessPost } from './http'

const ENDPOINT = '/api.webplug-data.json'

function ensureSuccess(payload, fallbackMessage) {
  if (payload?.success === false) {
    const error = new Error(payload.errmsg || payload.notice || payload.message || fallbackMessage)
    error.payload = payload
    throw error
  }
  return payload
}

function parseStoredJson(value) {
  if (value === null || value === undefined || value === '') return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export const webplugStorage = {
  async get(key) {
    const result = ensureSuccess(
      await accessPost(ENDPOINT, { key }),
      '插件存储读取失败',
    )
    return {
      value: result.data ?? null,
      version: result.version ?? null,
      isLogin: result.islogin,
    }
  },

  async getJson(key) {
    const result = await this.get(key)
    return {
      ...result,
      value: parseStoredJson(result.value),
    }
  },

  async set(key, value, version) {
    const data = { key, value }
    if (version !== undefined && version !== null) data.version = version
    const result = ensureSuccess(
      await accessPost(ENDPOINT, data),
      '插件存储写入失败',
    )
    return {
      version: result.version ?? null,
      isLogin: result.islogin,
    }
  },

  setJson(key, value, version) {
    return this.set(key, JSON.stringify(value), version)
  },
}
