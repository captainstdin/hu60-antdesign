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
| PC 全局框架与响应式布局 | 已完成 | `pages.json`、四个 tab 页面 | 左导航 + 内容区 + 右信息栏；窄屏自动收拢 |
| 二级目录部署支持 | 已完成 | 部署要求 | Vite 相对资源 + Hash Router |
| API 请求层与登录态 | 已完成 | `api/req.js`、`common/gateway.js` | token URL、超时、JSON 解析、localStorage |
| 论坛首页 | 已完成 | `tarbar_index` | 话题列表、刷新、分页加载、搜索入口 |
| 帖子搜索 | 已完成 | `page_topic_search` | 关键词/用户名、分页、URL 查询参数同步 |
| 帖子详情与回复 | 已完成 | `page_topic_show` | 楼层、富文本、统计、分页、文字回复 |
| 登录 | 已完成 | `login` | 站点信息、登录、用户信息回填、原路返回 |
| 发布帖子 | 已完成（基础版） | `page_create_topic` | 递归版块选择、标题正文、token 二步提交 |
| 用户资料 | 已完成（基础版） | `page_staff_info` | 基本资料、签名、联系方式 |
| 聊天室入口 | 已完成（列表版） | `tarbar_chat` | 房间列表；房间消息页待开发 |
| 内信 | 已完成（入口版） | `tarbar_alert` | 未读概览；信件列表/会话待开发 |
| 个人中心 | 已完成（入口版） | `tarbar_my` | 用户信息、提醒计数、退出；子模块待开发 |
| 图片/附件上传 | 待开发 | `com-upload-image`、`cap-editor` | 对接 `api.upload-form.json` / 七牛接口 |
| 表情与 UBB 编辑器 | 待开发 | `com-emoji`、`hu60-ubb-parse` | 先完成常用表情和插入光标能力 |
| 收藏、关注、黑名单 | 待开发 | `hu60_app/pages/user` | 独立列表和关系操作 |
| 聊天室消息页 | 待开发 | `chathome-page` | 拉取、发消息、增量刷新 |
| 内信会话 | 待开发 | `message-page` | 收件箱、会话详情、发送内信 |
| 管理操作 | 待开发 | `index-topic` | 编辑、删除、加精、下沉、审核 |

## API 对照

| 功能 | API |
| --- | --- |
| 首页 | `/index.index.json?_uinfo=name,avatar&p={page}` |
| 搜索 | `/bbs.search.json?_uinfo=name,avatar&p={page}&keywords=...&username=...` |
| 帖子详情 | `/bbs.topic.{topicId}.{page}.json?_content=html&_uinfo=name,avatar,sign,contact` |
| 回复 | `/bbs.newreply.{topicId}.1.json`（使用详情返回的 token） |
| 登录 | `/user.login.json` |
| 当前用户 | `/user.index.json?_uinfo=name,avatar,sign,contact&_myself=newMsg,newAtInfo` |
| 用户资料 | `/user.info.{uid}.json?_uinfo=name,avatar,sign,contact` |
| 版块树 | `/bbs.newtopic.json` |
| 发布 | `/bbs.newtopic.{forumId}.json`（先取 token，再提交） |
| 聊天室 | `/addin.chat.json?_myself=newChats` |
| 内信概览 | `/msg.index.send.json?_myself=newMsg,newAtInfo` |

## 目录说明

- `src/services/http.js`：底层请求、token 拼接、错误归一化。
- `src/services/forum.js`：页面使用的接口函数。
- `src/stores/session.js`：轻量登录态与用户信息，不引入额外状态库。
- `src/layouts/AppShell.vue`：PC 公共布局。
- `src/pages`：路由页面。
- `src/components`：话题列表、头像、状态展示等复用组件。

## 后续开发顺序

1. 图片/附件上传与 UBB/表情编辑器。
2. 内信列表、会话详情和发送内信。
3. 聊天室消息页与增量刷新策略。
4. 收藏、关注、黑名单、我的帖子。
5. 帖子编辑与管理能力。
6. 补充接口 mock、单元测试、浏览器兼容性回归与构建部署检查。

## 维护规则

- 每完成一个模块，同时更新本文件的“模块进度”和 API 对照。
- 新 API 统一写入 `src/services/forum.js`，页面不要自行拼接 `q.php`。
- 静态资源不要以 `/assets/...` 这种站点根路径引用；使用 import 或 `import.meta.env.BASE_URL`。
- 新增路由继续使用 Hash Router，不要改成 History Router，除非部署服务器已确认提供 fallback。
