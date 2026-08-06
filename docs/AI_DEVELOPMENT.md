# 虎绿林 PC 版 AI 开发文档

## 目标与约束

- 技术栈：Vue 3、Vite、Ant Design Vue 4、Vue Router 4。
- 页面以 PC 为主，重点适配 1024、1366、1440、1920 及更宽显示器。
- 主要产品与接口参考 `hu60_weixin_nvue`，缺失功能参考 `hu60_app`。
- Vite `base` 固定为 `./`，路由使用 Hash 模式。构建产物可直接放入 `/dist/`、`/forum/` 等二级目录，不依赖 Nginx 的 SPA fallback。
- API 默认直连 `https://hu60.cn`，头像默认使用 `https://file.hu60.cn`，均可通过 `.env` 覆盖。
- 保持原接口协议：`POST /q.php/{accessToken}/{apiPath}`，表单编码为 `application/x-www-form-urlencoded`。

## 模块进度

| 模块 | 状态 | 参考来源 | 说明 |
| --- | --- | --- | --- |
| PC 全局框架与响应式布局 | 已完成 | `pages.json`、经典首页 | 首页采用经典论坛单列布局，功能页保留左右侧栏；窄屏自动收拢 |
| 二级目录部署支持 | 已完成 | 部署要求 | Vite 相对资源 + Hash Router |
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

## 目录说明

- `src/services/http.js`：底层请求、token 拼接、错误归一化。
- `src/services/forum.js`：页面使用的接口函数。
- `src/stores/session.js`：轻量登录态与用户信息，不引入额外状态库。
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
