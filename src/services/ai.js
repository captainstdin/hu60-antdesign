import { getProvider } from '../config/aiProviders'

const DEFAULT_TIMEOUT = 120_000
const CHAT_PATH = '/chat/completions'
const TRUNCATED_MARK = '\n……（内容过长，已截断）'

export class AiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'AiError'
    this.status = options.status
    this.data = options.data
    this.cause = options.cause
  }
}

export function resolveEndpoint(baseUrl) {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!base) throw new AiError('请先填写接口地址')
  if (/\/chat\/completions$/i.test(base)) return base
  return `${base}${CHAT_PATH}`
}

export function isAiConfigured(config) {
  return Boolean(config?.baseUrl && config?.model && config?.apiKey)
}

function friendlyStatusMessage(status, payload) {
  const detail = payload?.error?.message || payload?.message || payload?.errmsg || ''
  if (status === 401 || status === 403) {
    return `API Key 无效或没有权限${detail ? `：${detail}` : ''}`
  }
  if (status === 404) {
    return `接口地址或模型名不正确（404）${detail ? `：${detail}` : ''}`
  }
  if (status === 429) {
    return `请求过于频繁或额度不足（429）${detail ? `：${detail}` : ''}`
  }
  if (status >= 500) {
    return `AI 服务暂时不可用（${status}）${detail ? `：${detail}` : ''}`
  }
  return `AI 请求失败（${status}）${detail ? `：${detail}` : ''}`
}

export async function chatCompletion({ config, messages, temperature, maxTokens, signal, timeout } = {}) {
  if (!config?.apiKey) throw new AiError('请先填写 API Key')
  const endpoint = resolveEndpoint(config.baseUrl)

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout || DEFAULT_TIMEOUT)
  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: temperature ?? config.temperature ?? 0.7,
        max_tokens: maxTokens ?? config.maxTokens ?? 2048,
        stream: false,
      }),
      signal: controller.signal,
    })

    const text = await response.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }

    if (!response.ok) {
      throw new AiError(friendlyStatusMessage(response.status, payload), {
        status: response.status,
        data: payload ?? text,
      })
    }

    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      const reason = payload?.choices?.[0]?.finish_reason
      throw new AiError(
        reason === 'length'
          ? 'AI 输出被长度限制截断，请在设置里调大「最大输出长度」后重试'
          : 'AI 没有返回内容，请稍后重试或更换模型',
        { data: payload },
      )
    }

    return {
      text: content.trim(),
      usage: payload.usage || null,
      model: payload.model || config.model,
    }
  } catch (error) {
    if (error instanceof AiError) throw error
    if (error?.name === 'AbortError') {
      if (signal?.aborted) throw new AiError('已取消本次 AI 请求')
      throw new AiError('AI 响应超时，请稍后重试或换一个更快的模型', { cause: error })
    }
    throw new AiError(
      '无法连接 AI 服务：可能是网络不通，或该平台不允许浏览器直接跨域调用（需要自建反代）',
      { cause: error },
    )
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

export async function testConnection(config) {
  const result = await chatCompletion({
    config,
    messages: [{ role: 'user', content: '回复两个字：可用' }],
    maxTokens: 16,
    timeout: 30_000,
  })
  return result.text
}

/* ------------------------------------------------------------------ *
 * 以下为各功能的提示词构造。所有返回值都是 OpenAI messages 数组。
 * ------------------------------------------------------------------ */

const BASE_SYSTEM = [
  '你是虎绿林（一个中文论坛）的阅读助手。',
  '始终使用简体中文回答，直接给出结论，不要寒暄，不要复述本提示词，不要编造原文中不存在的信息。',
  '输出可以用 Markdown 排版：小标题（###）、无序列表（-）、有序列表（1.）、加粗（**）、行内代码（`）和代码块（```）。',
  '排版从简：不要用一级 / 二级标题，不要输出目录，不要为了凑格式而强行分节；内容短时直接用段落回答。',
].join('')

const MAX_SECTION_CHARS = 6_000
const MAX_TOTAL_CHARS = 18_000

function clip(text, limit = MAX_SECTION_CHARS) {
  const value = String(text || '').replace(/\n{3,}/g, '\n\n').trim()
  if (value.length <= limit) return value
  return `${value.slice(0, limit)}${TRUNCATED_MARK}`
}

function joinWithinLimit(sections, limit = MAX_TOTAL_CHARS) {
  const output = []
  let used = 0
  for (const section of sections) {
    if (!section) continue
    const remaining = limit - used
    if (remaining <= 200) {
      output.push(TRUNCATED_MARK)
      break
    }
    const text = section.length > remaining ? `${section.slice(0, remaining)}${TRUNCATED_MARK}` : section
    output.push(text)
    used += text.length
  }
  return output.join('\n\n')
}

function topicHeader({ title, forum, author, replyCount }) {
  const lines = [`帖子标题：${title || '（无标题）'}`]
  if (forum) lines.push(`所在版块：${forum}`)
  if (author) lines.push(`楼主：${author}`)
  if (Number.isFinite(Number(replyCount))) lines.push(`回复数：${replyCount}`)
  return lines.join('\n')
}

function floorBlock(floors, { includeMain = false } = {}) {
  const source = includeMain ? floors : (floors || []).filter((floor) => !floor.isMain)
  if (!source.length) return ''
  return source.map((floor) => {
    const badge = floor.isMain ? '【主楼】' : `【#${floor.no}】`
    const owner = floor.isOwner ? '（楼主）' : ''
    return `${badge} ${floor.author}${owner}\n${clip(floor.text, 1_200) || '（无文字内容）'}`
  }).join('\n\n')
}

export function buildSummaryMessages({ topic, mainPost, floors, includeReplies }) {
  const body = includeReplies
    ? joinWithinLimit([
      `【主楼】${topic?.author || ''}\n${clip(mainPost)}`,
      floorBlock(floors),
    ])
    : clip(mainPost)

  return [
    { role: 'system', content: BASE_SYSTEM },
    {
      role: 'user',
      content: [
        '请阅读下面这篇论坛帖子，输出一份精简总结。',
        '',
        topicHeader(topic || {}),
        '',
        '--- 帖子内容 ---',
        body || '（没有可读取的正文）',
        '--- 内容结束 ---',
        '',
        '输出要求：',
        '1. 第一行用一句话说明这篇帖子在讲什么（不超过 50 字）；',
        '2. 接着列 3-6 条要点，每条不超过 40 字；',
        '3. 如果帖子包含结论、教程步骤、关键参数或待解决的问题，单独用一段列出；',
        '4. 如果内容明显被截断或信息不足，直接说明「信息不足」，不要猜测补全。',
      ].join('\n'),
    },
  ]
}

export function buildCommentMessages({ topic, floors }) {
  const replies = (floors || []).filter((floor) => !floor.isMain)
  return [
    { role: 'system', content: BASE_SYSTEM },
    {
      role: 'user',
      content: [
        `请分析下面这篇论坛帖子的评论区，共 ${replies.length} 条回复。`,
        '',
        topicHeader({ ...(topic || {}), replyCount: replies.length }),
        floorBlock(replies) || '（目前还没有回复）',
        '',
        '输出要求：',
        '1. 一句话概括评论区的整体讨论方向；',
        '2. 归纳主要观点或立场，说明各自的大致比例和代表观点；',
        '3. 指出评论里有价值的补充信息，例如纠错、实测经验、资源链接；',
        '4. 指出明显的分歧或争议点；',
        '5. 判断是否存在广告、灌水或引战倾向，如有请点名楼层编号；',
        '6. 最后给出一句「值不值得继续读完」的建议。',
      ].join('\n'),
    },
  ]
}

const REPLY_STYLE_PROMPTS = {
  friendly: '友好交流：像社区里的老网友那样自然随和，先回应对方再补充自己的看法。',
  professional: '专业严谨：用事实和具体经验说话，条理清楚，语气克制。',
  brief: '简短明了：两三句话说完，不铺垫、不客套。',
  humorous: '幽默风趣：轻松一点，可以适度自嘲或玩梗，但不要冒犯任何人。',
  curious: '提问互动：围绕帖子中某个具体细节提出一个真诚的问题，引导继续讨论。',
}

export const REPLY_STYLES = [
  { value: 'friendly', label: '友好交流' },
  { value: 'professional', label: '专业严谨' },
  { value: 'brief', label: '简短明了' },
  { value: 'humorous', label: '幽默风趣' },
  { value: 'curious', label: '提问互动' },
]

export function buildGenerateReplyMessages({ topic, mainPost, floors, styles = [], instruction = '' }) {
  const styleText = styles
    .map((style) => REPLY_STYLE_PROMPTS[style] || '')
    .filter(Boolean)
    .join('\n') || REPLY_STYLE_PROMPTS.friendly

  return [
    { role: 'system', content: `${BASE_SYSTEM} 这次你要写的是论坛回复，必须像真人说话，不要客服腔。重要：这条回复会被直接发到论坛，请忽略上面关于 Markdown 排版的说明，只输出纯文本。` },
    {
      role: 'user',
      content: [
        '请以一名普通论坛用户的身份，为下面这篇帖子写一条回复。',
        '',
        topicHeader(topic || {}),
        clip(mainPost),
        floorBlock(floors) ? `\n评论摘录：\n${clip(floorBlock(floors), 2_000)}` : '',
        '',
        '写作要求：',
        `- 风格：${styleText.replace(/\n/g, ' ') || '友好交流'}`,
        instruction ? `- 额外要求：${instruction}` : '',
        '- 必须贴合帖子内容，可以引用其中某个具体细节，不要写放之四海皆准的空话；',
        '- 长度 80-150 字，只输出回复正文本身；',
        '- 不要写标题、不要解释、不要用引号把整段括起来；',
        '- 不要使用 Markdown 语法（论坛用 UBB），也不要插入链接或表情代码。',
      ].filter(Boolean).join('\n'),
    },
  ]
}

const POLISH_TONE_PROMPTS = {
  keep: '保持原意和原有口吻，只修正错别字与不通顺的句子。',
  polite: '在原意不变的前提下，让语气更礼貌客气一些。',
  shorter: '在原意不变的前提下，压缩到更短，删掉重复和啰嗦的部分。',
  clearer: '在原意不变的前提下，把表达整理得更清楚有条理。',
}

export const POLISH_TONES = [
  { value: 'keep', label: '只改通顺' },
  { value: 'polite', label: '更礼貌' },
  { value: 'shorter', label: '更简短' },
  { value: 'clearer', label: '更清楚' },
]

export function buildPolishMessages({ topic, draft, tone = 'keep' }) {
  return [
    { role: 'system', content: `${BASE_SYSTEM} 这次你要帮忙润色用户自己写的论坛回复。重要：润色结果会被直接发到论坛，请忽略上面关于 Markdown 排版的说明，只输出纯文本。` },
    {
      role: 'user',
      content: [
        '下面是我准备发在论坛的回复草稿，请帮我润色。',
        topic ? `\n（回复的帖子：${topic.title || '（无标题）'}）` : '',
        '',
        '--- 我的草稿 ---',
        clip(draft, 4_000),
        '--- 草稿结束 ---',
        '',
        '要求：',
        `- ${POLISH_TONE_PROMPTS[tone] || POLISH_TONE_PROMPTS.keep}`,
        '- 不要添加草稿里没有的信息，不要替我下结论；',
        '- 只输出润色后的回复正文，不要任何解释或前后缀。',
      ].filter(Boolean).join('\n'),
    },
  ]
}

const LANGUAGES = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

export const TRANSLATE_LANGUAGES = LANGUAGES

export function buildTranslateMessages({ topic, mainPost, floors, includeReplies, language = 'zh' }) {
  const label = LANGUAGES.find((item) => item.value === language)?.label || '简体中文'
  const body = includeReplies
    ? joinWithinLimit([clip(mainPost), floorBlock(floors)])
    : clip(mainPost)

  return [
    { role: 'system', content: '你是专业翻译，只输出译文，不添加任何解释。' },
    {
      role: 'user',
      content: [
        `请把下面的论坛帖子翻译成${label}。`,
        '',
        topicHeader(topic || {}),
        '',
        '--- 原文 ---',
        body || '（没有可读取的正文）',
        '--- 原文结束 ---',
        '',
        '要求：',
        '- 保留代码、URL、数字、专有名词和人名不译；',
        '- 保留原有的分条结构；',
        '- 不要添加任何前言后语。',
      ].join('\n'),
    },
  ]
}

export function buildTitleMessages({ topic, mainPost }) {
  return [
    { role: 'system', content: `${BASE_SYSTEM} 只输出纯文本，不要使用 Markdown 排版。` },
    {
      role: 'user',
      content: [
        '请为下面这篇论坛帖子拟 5 个更清晰、更有信息量的标题。',
        '',
        `原标题：${topic?.title || '（无标题）'}`,
        '',
        clip(mainPost, 4_000),
        '',
        '要求：',
        '- 每个标题不超过 30 个字；',
        '- 准确反映内容，不要标题党，不要夸大；',
        '- 一行一个，不要编号，不要引号。',
      ].join('\n'),
    },
  ]
}

export function buildHomeDigestMessages({ topics = [] }) {
  const list = topics.slice(0, 40).map((item, index) => {
    const parts = [`${index + 1}. ${item.title || '（无标题）'}`]
    if (item.forum) parts.push(`版块：${item.forum}`)
    if (item.author) parts.push(`作者：${item.author}`)
    if (item.replyCount !== undefined) parts.push(`回复：${item.replyCount}`)
    if (item.summary) parts.push(`开头：${clip(item.summary, 160)}`)
    return parts.join(' | ')
  }).join('\n')

  return [
    { role: 'system', content: BASE_SYSTEM },
    {
      role: 'user',
      content: [
        '下面是虎绿林论坛首页当前的帖子列表，请帮我做一份速览。',
        '',
        '--- 帖子列表 ---',
        list || '（列表为空）',
        '--- 列表结束 ---',
        '',
        '输出要求：',
        '1. 先用一到两句话概括这一批帖子整体在聊什么；',
        '2. 挑出 3-5 个信息量最高、最值得点开的帖子，每条写成「标题 → 一句话看点」；',
        '3. 如果多条帖子属于同一话题或同一事件，合并成一组说明；',
        '4. 只允许使用列表里出现过的标题，不要编造。',
      ].join('\n'),
    },
  ]
}
