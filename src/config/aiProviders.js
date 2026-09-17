// AI 平台预设。所有平台都走 OpenAI 兼容的 POST {baseUrl}/chat/completions 协议。
// 预设只提供默认值：选中平台后自动填充接口地址和模型名，用户通常只需要填 API Key。
// 模型名会随各平台迭代变化，界面上始终可以手动修改。
//
// 只收录最常用的平台，其余小众或已停服的平台不再内置：
// 火山方舟（模型名是接入点 ID，必须手填，等同于自定义）、百度千帆、讯飞星火、MiniMax、
// 阶跃星辰、魔搭 ModelScope、零一万物（开放平台已于 2026-09-03 停止 API 服务）。
// 这些平台走「自定义」填地址与模型名即可，不必占一个预设位。

export const CUSTOM_PROVIDER_ID = 'custom'

export const AI_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek 深度求索',
    region: 'cn',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-flash', 'deepseek-v4-flash', 'deepseek-v4-pro'],
    defaultModel: 'deepseek-flash',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    hint: '价格便宜、中文稳定，适合总结和润色。deepseek-flash（V4.1-Flash）是当前默认型号；deepseek-v4-flash / deepseek-v4-pro 只是过渡别名，旧名 deepseek-chat / deepseek-reasoner 已于 2026-07-24 停用。',
  },
  {
    id: 'dashscope',
    name: '阿里云百炼（通义千问）',
    region: 'cn',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen3.8-flash', 'qwen3.7-plus', 'qwen3.8-max', 'qwen-long'],
    defaultModel: 'qwen3.8-flash',
    consoleUrl: 'https://bailian.console.aliyun.com/',
    hint: '百炼平台的 OpenAI 兼容模式，新账号有较大免费额度。qwen3.8-flash 便宜且支持 100 万上下文；qwen-turbo / qwen-plus / qwen-max 等旧名已不推荐。',
  },
  {
    id: 'hunyuan',
    name: '腾讯混元',
    region: 'cn',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    models: ['hy3', 'hy4-preview'],
    defaultModel: 'hy3',
    consoleUrl: 'https://console.cloud.tencent.com/hunyuan/api-key',
    hint: '模型与 Key 都在腾讯云 TokenHub 创建。hy3 效果与价格较均衡；hy4-preview 是新旗舰，按量计费偏贵。hunyuan-lite 等旧型号已下线。',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    region: 'cn',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.7-flash', 'glm-5.3-flash', 'glm-5.3'],
    defaultModel: 'glm-4.7-flash',
    consoleUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    hint: 'glm-4.7-flash 免费、通用能力够用；glm-5.3-flash / glm-5.3 更强但按量计费。glm-4-flash 已下线并自动路由到 glm-4.7-flash。',
  },
  {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    region: 'cn',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2.6'],
    defaultModel: 'kimi-k3',
    consoleUrl: 'https://platform.moonshot.cn/console/api-keys',
    hint: '长文本阅读能力强。kimi-k2.5 与 moonshot-v1 系列已于 2026-08-31 下线，请使用 kimi-k3。',
  },
  {
    id: 'siliconflow',
    name: '硅基流动 SiliconFlow',
    region: 'cn',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      'Qwen/Qwen3.5-4B',
      'deepseek-ai/DeepSeek-V4-Flash',
      'moonshotai/Kimi-K2.6',
    ],
    defaultModel: 'Qwen/Qwen3.5-4B',
    consoleUrl: 'https://cloud.siliconflow.cn/account/ak',
    hint: '聚合平台，国内直连，新用户有赠送额度。Qwen/Qwen3.5-4B 免费；模型 ID 必须带厂商前缀，请从模型广场复制。',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    region: 'global',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-6-astra'],
    defaultModel: 'gpt-5.6-luna',
    consoleUrl: 'https://platform.openai.com/api-keys',
    hint: '国内直连通常不可用，需要自备网络环境。gpt-5.6-luna 最便宜；gpt-4o / gpt-4.1 系列已于 2026 年退役。',
  },
  {
    id: 'gemini',
    name: 'Google Gemini（兼容模式）',
    region: 'global',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-pro-preview'],
    defaultModel: 'gemini-3.8-flash',
    consoleUrl: 'https://aistudio.google.com/apikey',
    hint: '国内直连通常不可用。gemini-3.8-flash 是最新的快速模型；gemini-2.0 / 1.5 系列已被取代。',
  },
  {
    id: 'ollama',
    name: 'Ollama（本机部署）',
    region: 'local',
    baseUrl: 'http://localhost:11434/v1',
    models: ['qwen3.5:4b', 'qwen3.5:9b', 'gemma4:e4b', 'llama3.2:3b'],
    defaultModel: 'qwen3.5:4b',
    consoleUrl: '',
    hint: '本地模型不校验 Key，随便填一个即可（如 ollama）。需先 ollama pull 对应模型，并保证 Ollama 已允许跨域访问。',
  },
  {
    id: CUSTOM_PROVIDER_ID,
    name: '自定义（任意 OpenAI 兼容服务）',
    region: 'local',
    baseUrl: '',
    models: [],
    defaultModel: '',
    consoleUrl: '',
    hint: '填入自建反代、LiteLLM、OneAPI、New API 等服务的地址与模型名。',
  },
]

const REGION_LABELS = {
  cn: '国内平台',
  global: '海外平台',
  local: '本地部署',
}

export function getProvider(id) {
  return AI_PROVIDERS.find((provider) => provider.id === id)
    || AI_PROVIDERS[AI_PROVIDERS.length - 1]
}

export function providerName(id) {
  const provider = AI_PROVIDERS.find((item) => item.id === id)
  if (provider) return provider.name
  return id ? `自定义（${id}）` : '未配置'
}

/**
 * 下拉选项：自定义平台单独置顶，其余按地区分组（国内平台排前面）。
 * 自定义放第一位是有意的——不用预设、要手填地址和模型的场景最多。
 */
export function providerOptions() {
  const custom = AI_PROVIDERS.find((provider) => provider.id === CUSTOM_PROVIDER_ID)
  const groups = ['cn', 'global', 'local']
    .map((region) => ({
      label: REGION_LABELS[region],
      options: AI_PROVIDERS
        .filter((provider) => provider.region === region && provider.id !== CUSTOM_PROVIDER_ID)
        .map((provider) => ({ label: provider.name, value: provider.id })),
    }))
    .filter((group) => group.options.length)

  return custom
    ? [{ label: custom.name, value: custom.id }, ...groups]
    : groups
}