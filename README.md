# 虎绿林 PC 版

基于 Vue 3、Vite、Ant Design Vue 的虎绿林 PC 客户端。页面和 API 对接参考：

- `hu60_weixin_nvue/`：主要页面、导航和 API 契约。
- `hu60_app/`：扩展页面与后续模块参考。

## 本地启动

```bash
npm install
npm run dev
```

如需覆盖 API 或头像服务地址，复制环境变量示例：

```bash
cp .env.example .env.local
```

## 构建与二级目录部署

```bash
npm run build
```

将生成的 `dist/` 整体放到静态服务器的任意目录，例如：

- `https://example.com/dist/`
- `https://example.com/forum/`
- `https://example.com/apps/hu60/`

工程使用相对资源路径和 Hash 路由，不需要为前端路由额外配置服务器 rewrite。

## 开发进度

模块状态、API 对照和后续顺序见 [docs/AI_DEVELOPMENT.md](docs/AI_DEVELOPMENT.md)。

帖子正文的 UBB、Markdown 解析和安全渲染链路见 [docs/CONTENT_PARSING.md](docs/CONTENT_PARSING.md)。
