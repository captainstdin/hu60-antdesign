# AGENTS.md — 项目 Agent 约束

面向 AI / 代理的最低约束。详细规范、模块进度、API 对照见 `docs/AI_DEVELOPMENT.md`；
细节以该文档为准，但本文的「禁止」条款优先。

## 禁止事项

- 未经用户明确允许，不执行 `npm run dev` / `npm run build` / `npm run preview`，不启动本地服务，不做运行时调试（含浏览器自动化抓取页面）。
- 不构建 Go 产物；部署脚本不得引入 python 依赖（换台电脑就部署不了）。
- 提交可按用户指令执行；**推送一律由用户自己执行**，除非用户明确要求 Agent 推送。不做 `force` / `reset --hard` / 跳过 hook；提交前先核对 diff，只包含预期改动。
- 不引入 `marked` / `markdown-it`；AI 结果渲染统一走 `src/utils/markdown.js` 的 `renderMarkdown()`。
- 不整库导入 `@ant-design/icons-vue`，不在 `main.js` 恢复全量组件注册。
- 静态资源不用站点根路径 `/assets/...`，走 import 或 `import.meta.env.BASE_URL`。

## 路由页面（踩过的坑，必看）

- 每个 `src/pages/*.vue` 的模板根必须是**单个真实元素**（`<div>` / `<section>`）。
- 禁止把 `<PageState>`、`<slot>` 或多根模板直接当页面根。`AppShell.vue` 用 `<transition mode="out-in">` 包路由组件，
  过渡子节点一旦是 Fragment，`afterLeave` 永不触发，`isLeaving` 卡死为 true，
  之后每次渲染只返回空占位注释 —— 表现为 **hash 已变、旧页面消失、新页面空白、不发任何请求，且后续所有跳转全部失效**，
  控制台仅一条 `[Vue warn]: Component inside <Transition> renders non-element root node that cannot be animated.`
- 使用 `<PageState>` 时先套一层 `div`，参考 `ProfilePage.vue`（`.profile-page`）、`UserPage.vue`（`.user-page`）。
- 不要在 `AppShell.vue` 给 transition 加 keyed 包裹层兜底：多插一层 DOM 且强制重新挂载，副作用大于收益。

## 接口与路由

- 新接口统一写进 `src/services/forum.js`，页面不自行拼 `q.php`。
- 新增路由页面用 `() => import(...)` 异步加载，保持 Hash Router。
