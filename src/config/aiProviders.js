// AI 平台预设。所有平台都走 OpenAI 兼容的 POST {baseUrl}/chat/completions 协议。
// 预设只提供默认值：选中平台后自动填充接口地址和模型名，用户通常只需要填 API Key。
// 模型名会随各平台迭代变化，界面上始终可以手动修改。

export const CUSTOM_PROVIDER_ID = 'custom'

export const AI_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek 深度求索',
    region: 'cn',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    hint: '价格便宜、中文稳定，适合总结和润色。',
  },
  {
    id: 'dashscope',
    name: '阿里云百炼（通义千问）',
    region: 'cn',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
    defaultModel: 'qwen-turbo',
    consoleUrl: 'https://bailian.console.aliyun.com/',
    hint: '百炼平台的 OpenAI 兼容模式，新账号有较大免费额度。',
  },
  {
    id: 'hunyuan',
    name: '腾讯混元',
    region: 'cn',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    models: ['hunyuan-lite', 'hunyuan-turbos-latest'],
    defaultModel: 'hunyuan-lite',
    consoleUrl: 'https://console.cloud.tencent.com/hunyuan/api-key',
    hint: 'hunyuan-lite 有免费额度，需要腾讯云账号。',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    region: 'cn',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus'],
    defaultModel: 'glm-4-flash',
    consoleUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    hint: 'glm-4-flash 有免费额度。',
  },
  {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    region: 'cn',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k2.5', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultModel: 'kimi-k2.5',
    consoleUrl: 'https://platform.moonshot.cn/console/api-keys',
    hint: '长文本阅读能力强。模型名如已失效，直接改成控制台里的名称即可。',
  },
  {
    id: 'siliconflow',
    name: '硅基流动 SiliconFlow',
    region: 'cn',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'deepseek-ai/DeepSeek-V3',
      'THUDM/glm-4-9b-chat',
    ],
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    consoleUrl: 'https://cloud.siliconflow.cn/account/ak',
    hint: '聚合平台，国内直连，新用户有赠送额度，小模型很便宜。',
  },
  {
    id: 'ark',
    name: '火山方舟（字节豆包）',
    region: 'cn',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [],
    defaultModel: '',
    consoleUrl: 'https://console.volcengine.com/ark',
    hint: '模型名要填控制台「在线推理」里创建的接入点 ID（形如 ep-xxxxxxxx）。',
  },
  {
    id: 'qianfan',
    name: '百度千帆（文心一言）',
    region: 'cn',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    models: ['ernie-speed-8k', 'ernie-4.0-turbo-8k', 'ernie-4.5-turbo-128k'],
    defaultModel: 'ernie-speed-8k',
    consoleUrl: 'https://console.bce.baidu.com/iam/#/iam/apikey/list',
    hint: 'ernie-speed / ernie-lite 系列长期免费，需实名认证。',
  },
  {
    id: 'spark',
    name: '科大讯飞 星火',
    region: 'cn',
    baseUrl: 'https://spark-api-open.xf-yun.com/v1',
    models: ['lite', 'generalv3.5', 'max-32k', '4.0Ultra'],
    defaultModel: 'generalv3.5',
    consoleUrl: 'https://console.xfyun.cn/services/cbm',
    hint: 'Spark Lite 永久免费。',
  },
  {
    id: 'minimax',
    name: 'MiniMax（海螺 AI）',
    region: 'cn',
    baseUrl: 'https://api.minimaxi.com/v1',
    models: ['MiniMax-Text-01', 'abab6.5s-chat'],
    defaultModel: 'MiniMax-Text-01',
    consoleUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    hint: '国内站地址是 api.minimaxi.com，海外站是 api.minimax.io。',
  },
  {
    id: 'stepfun',
    name: '阶跃星辰 StepFun',
    region: 'cn',
    baseUrl: 'https://api.stepfun.com/v1',
    models: ['step-1-8k', 'step-1-flash', 'step-2-16k'],
    defaultModel: 'step-1-8k',
    consoleUrl: 'https://platform.stepfun.com/interface-key',
    hint: 'step-1-flash / step-1-8k 有低价或免费额度。',
  },
  {
    id: 'yi',
    name: '零一万物 01.AI',
    region: 'cn',
    baseUrl: 'https://api.lingyiwanwu.com/v1',
    models: ['yi-lightning', 'yi-large', 'yi-medium'],
    defaultModel: 'yi-lightning',
    consoleUrl: 'https://platform.lingyiwanwu.com/apikeys',
    hint: 'yi-lightning 速度较快。',
  },
  {
    id: 'modelscope',
    name: '魔搭 ModelScope',
    region: 'cn',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V3'],
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    consoleUrl: 'https://modelscope.cn/my/myaccesstoken',
    hint: '阿里魔搭的推理服务，有免费调用额度。',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    region: 'global',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    defaultModel: 'gpt-4o-mini',
    consoleUrl: 'https://platform.openai.com/api-keys',
    hint: '国内直连通常不可用，需要自备网络环境。',
  },
  {
    id: 'gemini',
    name: 'Google Gemini（兼容模式）',
    region: 'global',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
    consoleUrl: 'https://aistudio.google.com/apikey',
    hint: '国内直连通常不可用。',
  },
  {
    id: 'ollama',
    name: 'Ollama（本机部署）',
    region: 'local',
    baseUrl: 'http://localhost:11434/v1',
    models: ['qwen2.5:7b', 'llama3.2', 'deepseek-r1:7b'],
    defaultModel: 'qwen2.5:7b',
    consoleUrl: '',
    hint: '本地模型不校验 Key，随便填一个即可（如 ollama）。',
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
