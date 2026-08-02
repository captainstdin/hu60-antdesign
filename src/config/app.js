const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '')

export const APP_NAME = '虎绿林'
export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || 'https://hu60.cn',
)
export const AVATAR_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_AVATAR_BASE_URL || 'https://file.hu60.cn',
)
export const REQUEST_TIMEOUT = 12_000

export function normalizeAvatar(avatar, uid) {
  if (avatar) {
    if (/^https?:\/\//i.test(avatar)) return avatar
    if (avatar.startsWith('//')) return `https:${avatar}`
    if (avatar.startsWith('/')) return `${API_BASE_URL}${avatar}`
    return `${AVATAR_BASE_URL}/${avatar.replace(/^\/+/, '')}`
  }

  if (uid) return `${AVATAR_BASE_URL}/avatar/${uid}.jpg`
  return `${API_BASE_URL}/upload/default.jpg`
}
