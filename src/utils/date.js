const relativeFormatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
const absoluteFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatTime(timestamp) {
  if (!timestamp) return '时间未知'
  const date = new Date(Number(timestamp) * (Number(timestamp) < 1e12 ? 1000 : 1))
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const absoluteSeconds = Math.abs(diffSeconds)

  if (absoluteSeconds < 60) return relativeFormatter.format(diffSeconds, 'second')
  if (absoluteSeconds < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), 'minute')
  if (absoluteSeconds < 86400) return relativeFormatter.format(Math.round(diffSeconds / 3600), 'hour')
  if (absoluteSeconds < 604800) return relativeFormatter.format(Math.round(diffSeconds / 86400), 'day')
  return absoluteFormatter.format(date).replaceAll('/', '-')
}
