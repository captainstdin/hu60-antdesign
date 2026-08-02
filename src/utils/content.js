import { API_BASE_URL } from '../config/app'

function absoluteUrl(value) {
  if (!value || /^(https?:|data:|blob:|#)/i.test(value)) return value
  try {
    return new URL(value, `${API_BASE_URL}/`).toString()
  } catch {
    return value
  }
}

export function sanitizeHtml(html = '') {
  if (!html || typeof DOMParser === 'undefined') return ''

  const document = new DOMParser().parseFromString(String(html), 'text/html')
  document.querySelectorAll('script, iframe, object, embed, link, meta, form').forEach((node) => node.remove())

  document.body.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && /^javascript:/i.test(value))) {
        element.removeAttribute(attribute.name)
      }
    })

    if (element.hasAttribute('src')) element.setAttribute('src', absoluteUrl(element.getAttribute('src')))
    if (element.tagName === 'A') {
      element.setAttribute('href', absoluteUrl(element.getAttribute('href')))
      element.setAttribute('target', '_blank')
      element.setAttribute('rel', 'noopener noreferrer')
    }
  })

  return document.body.innerHTML
}
