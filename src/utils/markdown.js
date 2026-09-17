import { sanitizeHtml } from './content'

/**
 * 给 AI 回复用的轻量 Markdown 渲染器。
 *
 * 项目约定不引入 marked / markdown-it 一类依赖（见 docs/CONTENT_PARSING.md），
 * 而 AI 输出只会用到一小撮常见语法，所以这里自己实现，只覆盖：
 * 代码块、标题、引用、有序 / 无序列表、表格、分隔线、段落，
 * 以及行内的代码、粗体、斜体、删除线、链接。
 *
 * 输出前先做转义，再交给 sanitizeHtml 清洗，双重保证不会注入脚本。
 */

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

const FENCE = /^```(\w*)\s*$/
const HEADING = /^(#{1,6})\s+(.*)$/
const ULIST = /^\s*[-*+]\s+(.*)$/
const OLIST = /^\s*(\d+)[.)]\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const HR = /^\s*(?:[-*_]\s*){3,}$/
const TABLE_SEP = /^\s*\|?[\s:|-]+\|[\s:|-]*$/

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ESCAPE_MAP[char])
}

/** 只放行 http(s) 链接，其余返回空串，让调用方退回纯文本。 */
function safeHref(url) {
  const value = String(url || '').trim()
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('#') || value.startsWith('/')) return value
  return ''
}

function renderInline(text) {
  let out = escapeHtml(text)

  // 行内代码要先处理，避免内部的 * 和 [ 被当成其他语法。
  const codes = []
  out = out.replace(/`([^`\n]+)`/g, (_, code) => {
    codes.push(code)
    return `\u0000${codes.length - 1}\u0000`
  })

  out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
    const url = safeHref(href)
    // href / label 都取自已转义的 out，这里不要再转义一次。
    // 不放行的链接原样回显，避免只剩半截括号看起来像渲染错位。
    if (!url) return match
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })

  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  out = out.replace(/~~([^~\n]+)~~/g, '<del>$1</del>')

  return out.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${codes[Number(index)]}</code>`)
}

function parseTableRow(row) {
  return String(row)
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isBlockStart(line) {
  return FENCE.test(line)
    || HEADING.test(line)
    || QUOTE.test(line)
    || ULIST.test(line)
    || OLIST.test(line)
    || HR.test(line)
}

export function renderMarkdown(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n')
  if (!text.trim()) return ''

  const lines = text.split('\n')
  const html = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    // 代码块：整段原样保留，只做转义。
    const fence = line.match(FENCE)
    if (fence) {
      const language = fence[1] || ''
      const code = []
      index += 1
      while (index < lines.length && !FENCE.test(lines[index])) {
        code.push(lines[index])
        index += 1
      }
      index += 1 // 跳过结束的 ```
      const className = language ? ` class="language-${escapeHtml(language)}"` : ''
      html.push(`<pre><code${className}>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    if (HR.test(line)) {
      html.push('<hr>')
      index += 1
      continue
    }

    const heading = line.match(HEADING)
    if (heading) {
      const level = Math.min(heading[1].length, 6)
      html.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`)
      index += 1
      continue
    }

    if (QUOTE.test(line)) {
      const buffer = []
      while (index < lines.length && QUOTE.test(lines[index])) {
        buffer.push(lines[index].replace(QUOTE, '$1'))
        index += 1
      }
      html.push(`<blockquote>${buffer.map(renderInline).join('<br>')}</blockquote>`)
      continue
    }

    // 表格：当前行含 | 且下一行是分隔行（|---|）时才当作表格。
    if (line.includes('|') && index + 1 < lines.length && TABLE_SEP.test(lines[index + 1])) {
      const header = parseTableRow(line)
      const rows = []
      index += 2
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(parseTableRow(lines[index]))
        index += 1
      }
      html.push([
        '<table><thead><tr>',
        header.map((cell) => `<th>${renderInline(cell)}</th>`).join(''),
        '</tr></thead><tbody>',
        rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join(''),
        '</tbody></table>',
      ].join(''))
      continue
    }

    if (ULIST.test(line) || OLIST.test(line)) {
      const ordered = OLIST.test(line)
      const items = []
      while (index < lines.length) {
        const unordered = lines[index].match(ULIST)
        const numbered = lines[index].match(OLIST)
        if (ordered && numbered) items.push(numbered[2])
        else if (!ordered && unordered) items.push(unordered[1])
        else break
        index += 1
      }
      const tag = ordered ? 'ol' : 'ul'
      html.push(`<${tag}>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</${tag}>`)
      continue
    }

    // 兜底：连续的非块级行合成一个段落，行内换行保留成 <br>。
    const paragraph = []
    while (
      index < lines.length
      && lines[index].trim()
      && !isBlockStart(lines[index])
      && !(lines[index].includes('|') && TABLE_SEP.test(lines[index + 1] || ''))
    ) {
      paragraph.push(lines[index])
      index += 1
    }
    html.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`)
  }

  return sanitizeHtml(html.join('\n'))
}