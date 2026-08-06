import { API_BASE_URL, REQUEST_TIMEOUT } from '../config/app'
import { session } from '../stores/session'

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.data = options.data
    this.cause = options.cause
  }
}

function makeUrl(apiPath, publicEndpoint = false) {
  const cleanPath = String(apiPath || '').replace(/^\/+/, '')
  if (publicEndpoint) return `${API_BASE_URL}/q.php/${cleanPath}`

  const token = encodeURIComponent(session.getToken())
  return `${API_BASE_URL}/q.php/${token}/${cleanPath}`
}

function encodeForm(data = {}) {
  const params = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  })
  return params
}

export async function accessPost(apiPath, data = {}, options = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT)

  try {
    const response = await fetch(makeUrl(apiPath, options.publicEndpoint), {
      method: 'POST',
      mode: 'cors',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: encodeForm(data),
      signal: controller.signal,
    })

    const text = await response.text()
    let payload
    try {
      payload = text ? JSON.parse(text) : {}
    } catch (cause) {
      throw new ApiError('服务器返回了无法解析的数据', {
        status: response.status,
        data: text,
        cause,
      })
    }

    if (!response.ok) {
      throw new ApiError(payload?.notice || payload?.message || `请求失败（${response.status}）`, {
        status: response.status,
        data: payload,
      })
    }

    return payload
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error?.name === 'AbortError') throw new ApiError('服务器响应超时，请稍后重试', { cause: error })
    throw new ApiError('无法连接服务器，请检查网络后重试', { cause: error })
  } finally {
    window.clearTimeout(timer)
  }
}

export async function accessMultipart(apiPath, data = {}, options = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT)
  const body = new FormData()

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    body.append(key, value)
  })

  try {
    const response = await fetch(makeUrl(apiPath), {
      method: 'POST',
      mode: 'cors',
      headers: { Accept: 'application/json' },
      body,
      signal: controller.signal,
    })
    const text = await response.text()
    let payload
    try {
      payload = text ? JSON.parse(text) : {}
    } catch (cause) {
      throw new ApiError('服务器返回了无法解析的数据', {
        status: response.status,
        data: text,
        cause,
      })
    }

    if (!response.ok) {
      throw new ApiError(payload?.notice || payload?.message || `请求失败（${response.status}）`, {
        status: response.status,
        data: payload,
      })
    }
    return payload
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error?.name === 'AbortError') throw new ApiError('文件上传超时，请稍后重试', { cause: error })
    throw new ApiError('文件上传失败，请检查网络后重试', { cause: error })
  } finally {
    window.clearTimeout(timer)
  }
}

export function withQuery(path, query = {}) {
  const [pathname, currentQuery = ''] = String(path).split('?')
  const params = new URLSearchParams(currentQuery)

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })

  const queryString = params.toString()
  return queryString ? `${pathname}?${queryString}` : pathname
}
