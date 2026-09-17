# 虎绿林 PC 版 AI 开发文档

## 目标与约束

- 技术栈：Vue 3、Vite、Ant Design Vue 4、Vue Router 4。
- 页面以 PC 为主，重点适配 1024、1366、1440、1920 及更宽显示器。
- 主要产品与接口参考 `hu60_weixin_nvue`，缺失功能参考 `hu60_app`。
- Vite `base` 固定为 `./`，路由使用 Hash 模式。构建产物可直接放入 `/dist/`、`/forum/` 等二级目录，不依赖 Nginx 的 SPA fallback。
- Ant Design Vue 模板组件统一由 `unplugin-vue-components` 的 `AntDesignVueResolver` 自动按需引入，不在 `main.js` 全局注册组件集合。
- `@ant-design/icons-vue` 图标必须在实际使用它的页面或组件中按名称导入，禁止整库导入或全局注册全部图标。
- API 默认直连 `https://hu60.cn`，头像默认使用 `https://file.hu60.cn`，均可通过 `.env` 覆盖。
- 保持原接口协议：`POST /q.php/{accessToken}/{apiPath}`，表单编码为 `application/x-www-form-urlencoded`。

## 模块进度

| 模块 | 状态 | 参考来源 | 说明 |
| --- | --- | --- | --- |
| PC 全局框架与响应式布局 | 已完成 | `pages.json`、经典首页 | 首页采用经典论坛单列布局，功能页保留左右侧栏；窄屏自动收拢 |
| 二级目录部署支持 | 已完成 | 部署要求 | Vite 相对资源 + Hash Router |
| Ant Design 按需加载 | 已完成 | Vite 插件约束 | 模板组件由 resolver 自动导入；图标按页面或组件命名导入；路由页面异步加载 |
| API 请求层与登录态 | 已完成 | `api/req.js`、`common/gateway.js` | token URL、超时、JSON 解析、localStorage |
| 论坛首页 | 已完成 | `tarbar_index` | 话题列表、刷新、分页加载、搜索入口 |
| 帖子搜索 | 已完成 | `page_topic_search` | 关键词/用户名、帖子/回复模式、分页、URL 查询参数同步 |
| 帖子详情与回复 | 已完成 | `page_topic_show`、经典主题 | 楼层、UBB/Markdown 富文本、折叠、排序、分页、收藏、回复、楼层链接 |
| 登录 | 已完成 | `login` | 全局登录弹窗、路由守卫、用户信息回填、原路返回；无独立登录页 |
| 发布帖子 | 已完成 | `page_create_topic` | 递归版块选择、UBB/Markdown 编辑、预览、上传、token 二步提交 |
| 用户资料 | 已完成 | `page_staff_info`、经典主题 | 资料、帖子/回复、内信、关注、屏蔽、免打扰、小尾巴控制 |
| 聊天室 | 已完成 | `tarbar_chat`、`chathome-page` | 房间列表、消息分页、发言、@、20 秒可选增量刷新 |
| 内信与提醒 | 已完成 | `tarbar_alert`、`message-page` | 收/发件箱、已读筛选、@提醒、会话、用户搜索、发送与已读确认 |
| 个人中心 | 已完成 | `tarbar_my` | 用户信息、提醒计数、帖子、回复、收藏、关系、审核入口、退出 |
| 图片/附件上传 | 已完成 | 经典主题编辑器 | 选择文件和粘贴图片上传，插入服务端返回的 UBB 内容 |
| 表情与 UBB/Markdown 编辑器 | 已完成 | `api.face`、`api.ubb`、UBB 说明 | 光标插入、常用格式、表情、服务端安全预览、Markdown 首行标记 |
| 收藏与关系管理 | 已完成 | 经典主题用户关系页 | 收藏；关注/粉丝/屏蔽/被屏蔽/免打扰列表与关系操作 |
| 帖子与内容管理 | 已完成 | 经典主题管理入口 | 编辑、删除、精华、关闭回复、沉底、移动版块、审核队列与单条/批量审核 |
| 富文本安全 | 已完成 | JSON Page HTML 输出约束 | HTML 白名单清理、安全 URL/CSS、iframe sandbox、站内链接路由化 |
| AI 助手 | 已完成 | 网页插件数据持久化、OpenAI 兼容协议 | 首页与帖子详情页显示可拖动悬浮按钮，点开为全屏弹窗；账号池存 `ai_config` 键（登录用户走插件存储，未登录降级 localStorage）；支持多账号增删改与偏好切换；首次使用走平台预设向导，只需填 API Key |

## API 对照

| 功能 | API |
| --- | --- |
| 站点信息与页脚 | `/q.php/site.info.json`（公共接口，不拼接 accessToken） |
| 首页 | `/index.index.json?_uinfo=name,avatar&p={page}` |
| 搜索 | `/bbs.search.json?_uinfo=name,avatar&p={page}&keywords=...&username=...` |
| 搜索回复 | `/bbs.search.json?searchType=reply&keywords=...&username=...` |
| 帖子详情 | `/bbs.topic.{topicId}.{page}.json?_content=html&floorReverse=0|1` |
| 回复 | `/bbs.newreply.{topicId}.1.json`（使用详情返回的 token） |
| 登录 | `/user.login.json` |
| 当前用户 | `/user.index.json?_myself=permissions,countReview,newMsg,newAtInfo,newChats` |
| 用户资料 | `/user.info.{uid}.json?_uinfo=name,avatar,signature,contact,isFollow,isBlock,isNoDisturb,hideUserCSS` |
| 版块树 | `/bbs.newtopic.json` |
| 发布 | `/bbs.newtopic.{forumId}.json`（先取 token，再提交） |
| 聊天室 | `/addin.chat.json?_myself=newChats` |
| 聊天室消息/发言 | `/addin.chat.{room}.json` |
| 内信列表 | `/msg.index.{inbox|outbox|@}.{all|yes|no}.json` |
| 内信会话/发送 | `/msg.index.chat.{uid}.json`、`/msg.index.send.{uid}.json` |
| 消息已读 | `/link.ack.msg.{messageId}.json` |
| 收藏列表 | `/bbs.myfavorite.json` |
| 收藏切换 | `/bbs.{setfavoritetopic|unsetfavoritetopic}.{topicId}.json` |
| 关系列表 | `/user.relationship.{follow|block|follow_me|block_me|no_disturb}.json` |
| 关系操作 | `/user.relationship.json`（`action`、`targetUid`） |
| 表情/预览 | `/api.face.json`、`/api.ubb.json` |
| 附件上传 | `/bbs.upload.json`（multipart 字段 `file`） |
| 编辑/删除 | `/bbs.edittopic.{topicId}.{postId}.{page}.json`、`/bbs.deltopic.{topicId}.{postId}.json` |
| 精华/锁定/沉底/移动 | `/bbs.{setessencetopic|unsetessencetopic}.{topicId}.json`、`/bbs.lockreply.{topicId}.json`、`/bbs.sinktopic.{topicId}.json`、`/bbs.movetopic.{topicId}.json` |
| 审核列表/提交 | `/bbs.search.json?onlyReview={state}`、`/bbs.review.{contentId}.0.json` |

### AI 助手

| 功能 | 说明 |
| --- | --- |
| 配置读写 | `/api.webplug-data.json`，键名 `ai_config`；请求必须带 `_origin=*` 才能通过服务端跨域校验（**不能传具体域名**，服务端会过滤掉 `:` `/` 生成非法值），读取用 GET、写入用 POST + `version` 原子更新；未登录时降级到 localStorage |
| 账号池结构 | `{ schema: 2, preferredId, accounts: [{ id, name, provider, baseUrl, model, apiKey, temperature, maxTokens }] }`；v1 的单账号对象会自动迁移成单元素池 |
| AI 调用 | `POST {账号.baseUrl}/chat/completions`（OpenAI 兼容），`Authorization: Bearer {账号.apiKey}`，非流式；每次调用取 `preferredId` 指向的账号，缺失时回退到第一个 |
| 平台预设 | 国内：DeepSeek、阿里百炼、腾讯混元、智谱 GLM、Kimi、硅基流动、火山方舟、百度千帆、讯飞星火、MiniMax、阶跃星辰、零一万物、魔搭；海外：OpenAI、Gemini；本地：Ollama、自定义 |

可用功能：帖子详情页支持「总结帖子」「分析评论」「生成评论」「润色回复」「整帖翻译」「标题建议」，首页支持「帖子速览」；生成类结果支持复制、插入回复框，发表前二次确认。

结果展示：分析类结果（总结 / 分析 / 翻译 / 速览）按 Markdown 排版渲染，右上角可切「原始文本」；生成评论与润色结果保持纯文本，因为要原样插进论坛回复框（论坛用 UBB）。渲染走 `src/utils/markdown.js`，输出前先转义再交给 `sanitizeHtml`。

弹窗形态：助手面板与账号池都占屏幕 80%（`80vw` × `80vh`，`top: 10vh`，圆角 12px），小屏 ≤760px 退回全屏；点遮罩或关闭按钮只是把面板隐藏（组件不销毁），已生成的结果、账号与滚动位置都会保留，切换帖子或页面时才清空结果。账号池顶部固定显示一条说明：账号配置保存在后端插件持久化数据里，不经过任何第三方服务器。

## 目录说明

- `src/services/http.js`：底层请求、token 拼接、错误归一化。
- `src/services/forum.js`：页面使用的接口函数。
- `src/services/webplugStorage.js`：网页插件数据持久化封装。
- `src/services/aiConfig.js`：AI 账号池读写（插件存储 + 本地降级 + 登录后同步 + 偏好切换 + 旧结构迁移）。
- `src/services/ai.js`：OpenAI 兼容调用、错误归一化与各功能的提示词模板。
- `src/config/aiProviders.js`：AI 平台预设（地址、默认模型、控制台链接），按国内 / 海外 / 本地分组。
- `src/utils/markdown.js`：AI 回复专用的轻量 Markdown 渲染器（不引入 marked / markdown-it 依赖）。
- `src/stores/session.js`：轻量登录态与用户信息，不引入额外状态库。
- `src/stores/aiContext.js`：页面把帖子正文/楼层/首页列表喂给 AI 助手，并注册回复框桥接。
- `src/components/AiAssistant.vue`：悬浮按钮与 AI 面板的挂载点（仅 home/topic 路由启用）。
- `src/components/AiFloatingButton.vue`：可拖动悬浮按钮，位置存 localStorage。
- `src/components/AiPanel.vue`：AI 助手弹窗（按需加载，80% 尺寸），含功能面板与账号切换菜单；无账号时显示空状态并自动弹出账号池。
- `src/components/AiAccountPoolModal.vue`：账号池弹窗（80% 尺寸，z-index 1100），顶部有「不经过第三方服务器」的说明条，内嵌账号列表。
- `src/components/AiAccountManager.vue`：账号列表，添加 / 编辑 / 删除 / 设为当前 / 同步到账号；添加按钮始终可见（无账号时文案为「添加第一个账号」）。
- `src/components/AiAccountForm.vue`：单个账号的表单，平台预设自动填充，支持测试连接。
- `src/layouts/AppShell.vue`：PC 公共布局。
- `src/pages`：路由页面。
- `src/components`：话题列表、头像、状态展示等复用组件。

## 验收说明

- 当前页面与接口工作流已经覆盖项目规划中的功能模块。
- 仓库要求不执行程序，当前变更仅完成静态代码检查和 `git diff --check`；未启动 Vite、未构建、未运行测试。
- 后续在完整服务资源环境中应补做登录态、跨域 Cookie 代偿、上传、管理权限和多端响应式回归。

## 维护规则

- 每完成一个模块，同时更新本文件的“模块进度”和 API 对照。
- 新 API 统一写入 `src/services/forum.js`，页面不要自行拼接 `q.php`。
- 静态资源不要以 `/assets/...` 这种站点根路径引用；使用 import 或 `import.meta.env.BASE_URL`。
- 新增路由继续使用 Hash Router，不要改成 History Router，除非部署服务器已确认提供 fallback。
- 新增路由页面继续使用 `() => import(...)` 异步加载，不要在路由入口静态导入全部页面。
- AI 平台新增或调整只需改 `src/config/aiProviders.js`；提示词改 `src/services/ai.js`。AI 请求由浏览器直连用户配置的服务，少数平台不允许跨域，这种情况只能由用户自建反代，前端不做规避。
- 弹窗 z-index 分层固定为：助手主面板 1000 → 账号池 1100 → 账号编辑弹窗 / 发表确认 1200 → 表单内下拉弹层 1300。
  注意 antd 的 Select / 下拉弹层挂在 body 上、z-index 固定为 `zIndexPopupBase(1000) + 50 = 1050`（见 `select/style/index.js`），
  只要它所在的弹窗层级 ≥ 1050 就会被盖住。所以 `AiAccountForm.vue` 给平台下拉显式传了 `dropdownStyle: { zIndex: 1300 }`，新增同类下拉时要照做。
- 平台下拉的选项由 `providerOptions()` 生成：**自定义平台单独置顶**（不放进分组），其余按国内 / 海外 / 本地部署分组。新增账号时默认选中「自定义」并展开「接口地址与模型」，因为手填地址+模型的场景最多；选预设平台则自动填好地址与模型并收起高级项。
- AI 结果要 Markdown 排版时统一走 `src/utils/markdown.js` 的 `renderMarkdown()`，它内部已经调用 `sanitizeHtml`，**不要**再自己拼 `v-html`。项目依然不引入 `marked` / `markdown-it`（见 `docs/CONTENT_PARSING.md`）。需要原样插入论坛回复框的结果（生成评论、润色）必须保持纯文本，不要渲染成 HTML。
- 提示词里的排版开关集中在 `src/services/ai.js` 的 `BASE_SYSTEM`（默认允许有限的 Markdown）。凡是要把输出直接发到论坛的功能，都要在自己的 system 提示里显式覆盖为「只输出纯文本」，避免把 `###`、`**` 带进 UBB 正文。
- Ant Design Vue 模板组件依赖自动按需引入；不要在 `main.js` 中恢复 `app.use(...)` 组件列表。`message`、`Modal` 等脚本 API 仍应在使用处显式导入。
- 图标只允许从 `@ant-design/icons-vue` 按名称导入；禁止 `import * as Icons`、批量遍历注册或建立包含全部图标的公共入口。
- 禁止为 `ant-design-vue`、`@ant-design/icons-vue`、`@ant-design/colors`、`@ctrl/tinycolor` 添加细粒度 `manualChunks`，避免跨 chunk 循环初始化；由 Vite/Rollup 自动决定这些依赖的分包。
- 未经用户明确允许，不执行 `npm run dev`、`npm run build`、`npm run preview`，不启动服务，也不进行运行时调试。
