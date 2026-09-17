import { accessGet, accessPost, withQuery } from './http'

const ENDPOINT = '/api.webplug-data.json'

// 插件数据持久化接口在服务端做了跨域校验：请求必须带上 _origin，否则响应里
// 不会返回 Access-Control-Allow-Origin，浏览器会直接拦掉。
//
// 这个参数只能传 '*'。传具体域名时服务端会把主机名之外的字符全部过滤掉
// （例如 http://test.hu60.cn 会变成 httptest.hu60.cn），浏览器判定为非法值照样拦截。
// 请求不带 Cookie、鉴权靠 URL 里的 accessToken，所以 '*' 没有额外风险。
// forum.js 用的是同一套约定，保持一致。
const ORIGIN_QUERY = { _origin: '*' }

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
      await accessGet(ENDPOINT, { key, ...ORIGIN_QUERY }),
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
      await accessPost(withQuery(ENDPOINT, ORIGIN_QUERY), data),
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
