import { API_BASE_URL } from '../config/app'

const SAFE_STYLE_PROPERTIES = new Set([
  'background',
  'background-color',
  'border',
  'border-color',
  'border-radius',
  'border-style',
  'border-width',
  'color',
  'display',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-height',
  'max-width',
  'overflow',
  'overflow-x',
  'overflow-y',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration',
  'white-space',
  'width',
])

function absoluteUrl(value) {
  if (!value || /^(https?:|data:|blob:|#)/i.test(value)) return value
  try {
    return new URL(value, `${API_BASE_URL}/`).toString()
  } catch {
    return value
  }
}

function safeResourceUrl(value, tagName, attributeName) {
  const url = String(value || '').trim()
  if (!url) return ''
  if (url.startsWith('#')) return url
  if (/^data:image\/(?:gif|jpe?g|png|webp);base64,/i.test(url) && tagName === 'IMG') return url

  const absolute = absoluteUrl(url)
  try {
    const protocol = new URL(absolute).protocol.toLowerCase()
    if (protocol === 'http:' || protocol === 'https:') return absolute
    if (protocol === 'mailto:' && attributeName === 'href') return absolute
  } catch {
    return ''
  }
  return ''
}

function sanitizeStyle(value) {
  return String(value || '')
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(':')
      if (separator < 1) return ''
      const property = declaration.slice(0, separator).trim().toLowerCase()
      const styleValue = declaration.slice(separator + 1).trim()
      if (!SAFE_STYLE_PROPERTIES.has(property)) return ''
      if (/url\s*\(|expression\s*\(|javascript:|@import/i.test(styleValue)) return ''
      return `${property}: ${styleValue}`
    })
    .filter(Boolean)
    .join('; ')
}

export function sanitizeHtml(html = '') {
  if (!html || typeof DOMParser === 'undefined') return ''

  const document = new DOMParser().parseFromString(String(html), 'text/html')
  document
    .querySelectorAll('script, object, embed, link, meta, form, base, style, template, svg foreignObject')
    .forEach((node) => node.remove())

  document.body.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on') || name === 'srcdoc' || name === 'srcset' || name === 'xlink:href') {
        element.removeAttribute(attribute.name)
      }
    })

    if (element.hasAttribute('style')) {
      const style = sanitizeStyle(element.getAttribute('style'))
      if (style) element.setAttribute('style', style)
      else element.removeAttribute('style')
    }

    if (element.hasAttribute('src')) {
      const src = safeResourceUrl(element.getAttribute('src'), element.tagName, 'src')
      if (src) element.setAttribute('src', src)
      else element.removeAttribute('src')
    }

    if (element.tagName === 'A') {
      const href = safeResourceUrl(element.getAttribute('href'), element.tagName, 'href')
      if (href) element.setAttribute('href', href)
      else element.removeAttribute('href')
      element.setAttribute('target', '_blank')
      element.setAttribute('rel', 'noopener noreferrer')
    }

    if (element.tagName === 'IFRAME') {
      element.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups')
      element.setAttribute('loading', 'lazy')
      element.setAttribute('referrerpolicy', 'no-referrer')
    }
  })

  return document.body.innerHTML
}

export function htmlToText(html = '') {
  if (!html || typeof DOMParser === 'undefined') return String(html || '')
  const document = new DOMParser().parseFromString(sanitizeHtml(html), 'text/html')
  return String(document.body.textContent || '').replace(/\s+/g, ' ').trim()
}
