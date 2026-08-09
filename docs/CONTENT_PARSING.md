# 帖子内容解析说明

本文说明当前项目如何处理帖子正文，重点覆盖 UBB 和 Markdown 的编辑、预览、提交、回显与安全渲染流程。

## 总体结论

这个项目没有在前端实现独立的 UBB 或 Markdown 语法解析器，也没有引入 `marked`、`remark` 一类 Markdown 解析依赖。前端的职责主要是：

- 维护用户编辑的原始正文。
- 通过模式标记区分 UBB 和 Markdown。
- 请求后端把原文转换成 HTML。
- 在页面展示前对后端返回的 HTML 做安全清洗。

也就是说，UBB 和 Markdown 最终都走后端的内容解析能力；前端只做模式管理、编辑辅助和 HTML 安全渲染。

## 核心数据流

```text
发布/回复/编辑:
ContentEditor 原文
  -> forumApi.publishTopic / replyTopic / savePost
  -> 后端保存并解析

帖子详情展示:
forumApi.getTopic(_content=html)
  -> 后端返回 HTML content
  -> RichContent
  -> sanitizeHtml
  -> v-html 渲染

编辑已有帖子:
forumApi.getPostEditor(_content=ubb)
  -> 后端返回可编辑原文 content
  -> ContentEditor 检测 UBB / Markdown 模式

预览:
ContentEditor 原文
  -> forumApi.parseContent
  -> /api.ubb.json, input=ubb, output=html
  -> RichContent 安全展示
```

## 服务层入口

相关 API 都集中在 `src/services/forum.js`：

| 场景 | 方法 | 关键点 |
| --- | --- | --- |
| 帖子详情 | `getTopic(topicId, page, options)` | 请求 `/bbs.topic.{topicId}.{page}.json`，带 `_content=html`，让后端直接返回 HTML 正文 |
| 发布帖子 | `publishTopic(forumId, form)` | 直接提交 `form.content` 原文，不在前端转换 |
| 回复帖子 | `replyTopic(topicId, content, token)` | 直接提交回复原文 |
| 编辑回填 | `getPostEditor(topicId, postId, page)` | 请求 `_content=ubb`，拿回可继续编辑的原文 |
| 保存编辑 | `savePost(topicId, postId, page, form)` | 直接提交编辑后的原文 |
| 预览 | `parseContent(content)` | POST `/api.ubb.json`，提交 `{ input: "ubb", output: "html", values: [content] }` |
| 表情 | `getFaces()` | 从 `/api.face.json` 加载表情数据 |
| 上传附件 | `uploadFile(file)` | 上传后插入后端返回的 UBB 内容，或使用本地 UBB fallback |

详情、审核队列、聊天室、内信等富文本展示入口也都采用相同思路：接口请求 HTML 内容，页面交给 `RichContent` 渲染。

## UBB 处理

UBB 是编辑器的默认模式。`ContentEditor` 在 UBB 模式下不会给正文添加额外前缀，提交的就是用户看到的正文。

常用工具按钮会插入 UBB 语法：

| 功能 | UBB 插入内容 |
| --- | --- |
| 加粗 | `[b]文字[/b]` |
| 斜体 | `[i]文字[/i]` |
| 链接 | `[url=https://]文字[/url]` |
| 图片 | `《图片：https://》` |
| 代码 | `[code]文字[/code]` |
| 无序列表 | `[list]`、`[*]`、`[/list]` |
| 有序列表 | `[list=1]`、`[*]`、`[/list]` |
| 表情 | `{表情名}` |

附件上传也偏 UBB：如果后端返回 `result.content`，编辑器直接插入它；否则图片 fallback 为 `《图片：url，文件名（大小）》`，普通附件 fallback 为 `《链接：url，文件名（大小）》`。

UBB 的转换发生在后端：

- 正式展示时，帖子详情接口带 `_content=html`，返回已经转换好的 HTML。
- 预览时，编辑器调用 `/api.ubb.json`，让后端把当前 UBB 原文转换成 HTML。

## Markdown 处理

Markdown 模式不是前端本地 Markdown parser，而是“带 Markdown 标记的原文”。编辑器用正文开头的标记告诉后端按 Markdown 规则处理：

```text
<!-- markdown -->
```

代码中还兼容旧标记：

```text
<!md>
```

`ContentEditor` 的关键规则如下：

- `MARKDOWN_PATTERN` 检测正文开头是否存在 `<!-- markdown -->` 或 `<!md>`。
- 如果检测到标记，编辑器模式切到 Markdown。
- 编辑区显示时会隐藏这个标记，只显示正文主体。
- 提交、回复、保存和预览时会把 `<!-- markdown -->\n` 重新拼回正文开头。
- 从 UBB 切换到 Markdown 只会添加 Markdown 标记，不会自动把已有 UBB 语法转换成 Markdown。
- 从 Markdown 切回 UBB 会移除 Markdown 标记，也不会自动改写正文语法。

Markdown 模式下，工具按钮插入 Markdown 语法：

| 功能 | Markdown 插入内容 |
| --- | --- |
| 加粗 | `**文字**` |
| 斜体 | `*文字*` |
| 链接 | `[文字](https://)` |
| 图片 | `![图片](https://)` |
| 代码块 | fenced code block |
| 无序列表 | `- ` |
| 有序列表 | `1. ` |

需要注意：表情和附件上传没有按 Markdown 单独分支。表情仍插入 `{表情名}`，上传仍优先插入后端返回的内容或 UBB fallback。因此 Markdown 帖子里的表情、附件兼容性依赖后端统一解析能力。

## 展示与安全清洗

页面不会直接信任 HTML 字符串。所有帖子正文通过 `RichContent` 展示，而 `RichContent` 会先调用 `sanitizeHtml`：

```text
props.html
  -> sanitizeHtml(props.html)
  -> safeHtml
  -> v-html
```

`sanitizeHtml` 位于 `src/utils/content.js`，主要做这些处理：

- 使用 `DOMParser` 把 HTML 字符串解析成 DOM。
- 删除高风险标签：`script`、`object`、`embed`、`link`、`meta`、`form`、`base`、`style`、`template`、`svg foreignObject`。
- 删除事件属性和危险属性：`on*`、`srcdoc`、`srcset`、`xlink:href`。
- 过滤 `style`，只保留白名单 CSS 属性，并拒绝 `url()`、`expression()`、`javascript:`、`@import`。
- 过滤 `src` 和 `href`，只允许安全 URL。图片允许指定格式的 base64 data image，链接允许 `http`、`https` 和 `mailto`。
- 给链接统一加 `target="_blank"` 和 `rel="noopener noreferrer"`。
- 给 `iframe` 添加 `sandbox`、`loading="lazy"`、`referrerpolicy="no-referrer"`。

`RichContent` 还会处理站内链接：如果点击的是同源的 `bbs.topic.{id}` 或 `user.info.{uid}` 链接，会拦截默认跳转并改用 Vue Router 打开帖子页或用户页。

## 各页面如何使用

- `TopicPage.vue`：加载帖子详情时调用 `getTopic(..., _content=html)`，楼层正文用 `RichContent :html="item.content"` 展示；回复和编辑都使用 `ContentEditor`。
- `PublishPage.vue`：发布表单使用 `ContentEditor`，提交前先取 token，再把 `form.content` 原样提交给 `publishTopic`。
- `ReviewPage.vue`：审核列表请求 `_content=html`，审核项正文用 `RichContent` 展示。
- `ChatRoomPage.vue`、`MessageChatPage.vue`：聊天和内信同样使用 `ContentEditor` 编辑、`RichContent` 展示，富文本链路与帖子一致。

## 维护注意事项

- 不要在页面里直接 `v-html` 后端内容，必须走 `RichContent` 或复用 `sanitizeHtml`。
- 如果新增帖子相关列表，需要确认接口是否带 `_content=html`；否则可能拿到 UBB 原文，不能直接当 HTML 渲染。
- 如果新增编辑入口，应使用 `_content=ubb` 取回原文，避免从 HTML 反推 UBB 或 Markdown。
- Markdown 标记必须位于正文开头；前面如果有空格、标题或其他字符，编辑器不会识别为 Markdown 模式。
- `parseContent` 虽然参数名是 `input: "ubb"`，但 Markdown 模式会把 Markdown 标记一起提交，后端据此识别 Markdown。
- 预览依赖后端接口，离线或接口失败时前端不会自行降级解析。
