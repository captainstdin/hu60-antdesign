export const PERMISSIONS = {
  editTopic: 'PERMISSION_EDIT_TOPIC',
  reviewPost: 'PERMISSION_REVIEW_POST',
  setBlockPost: 'PERMISSION_SET_BLOCK_POST',
  setEssenceTopic: 'PERMISSION_SET_ESSENCE_TOPIC',
}

export function permissionList(value) {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return value.split(/[\s,]+/).filter(Boolean)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([permission]) => permission)
}

export function hasPermission(value, ...required) {
  const available = new Set(permissionList(value))
  return required.some((permission) => available.has(permission))
}

export function currentPermissions(payload, fallback) {
  return payload?._myself?.permissions || payload?.permissions || fallback?._myself?.permissions || fallback?.permissions || []
}
