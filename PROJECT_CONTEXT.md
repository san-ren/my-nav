# 项目开发指南 & 上下文说明 (LLM Context)

本文档旨在帮助大语言模型（LLM）快速理解本项目 `my-nav` 的架构、技术栈、核心功能及实现细节，
以便在后续对话中提供准确的代码建议和修改。

> 最后校验：2026-09-30，基于实际运行验证（Astro 7.3.5 / Tailwind 4 / pnpm 12）。
> 与 AGENTS.md 有重叠时，本文侧重「为什么这么设计」，AGENTS.md 侧重「命令与规范」。

---

## 1. 项目概览

**项目名称**: my-nav
**项目类型**: 个人导航网站 / 资源聚合平台（15 个分组、数百条网址）
**部署**: GitHub Pages `https://san-ren.github.io/my-nav/`
**核心目标**: 美观、响应式、易管理的资源导航界面，支持四级分类、搜索、暗色模式及移动端适配。

---

## 2. 技术栈

| 领域 | 选型 | 备注 |
|---|---|---|
| 框架 | **Astro 7.3.5** | `output: 'static'`，走 Content Layer 静态生成 |
| 交互 | **React 19.2** | 仅用于搜索框、分享导出、Keystatic 后台等重交互部分 |
| 样式 | **Tailwind CSS v4** | `@tailwindcss/vite` 插件 + `postcss.config.mjs`，入口为 `src/styles/global.css` |
| 图标 | **Lucide React 1.14** | 界面图标；网址 Logo 走本地 `public/images/logos/`（397 个 webp + 376 个 png） |
| 内容管理 | **Keystatic** (`@keystatic/core` 0.5.50 + `@keystatic/astro` 5.0.6) | 本地模式 + 线上 GitHub/Cloud 模式 |
| 搜索 | **Fuse.js 7.3** | 前端模糊搜索 |
| Markdown | MDX + Markdoc + astro-expressive-code | 代码块 dracula / github-light 双主题 |
| 包管理 | **pnpm 12.8.1** | Node >= 22.12 |

---

## 3. 构建与部署目标（重要）

`DEPLOY_TARGET` 环境变量是唯一真源，`astro.config.mjs` 依据它决定 `base`、是否挂 Node 适配器、
以及是否注入 Keystatic 的 SSR API 路由。**不要手工改配置里的 base。**

| 命令 | target | base | 产物 | 说明 |
|---|---|---|---|---|
| `pnpm build` | `github` | `/my-nav` | 纯静态 | 默认，GitHub Pages |
| `pnpm build:gh` | `github` | `/my-nav` | 纯静态 | 供 `.github/workflows/deploy.yml` 调用 |
| `pnpm build:root` | `root` | `/` | 纯静态 | 自有域名根路径 |
| `pnpm build:admin` | `admin` | `/` | 静态 + Node SSR | 在线后台用，需 Node 宿主 |

### 为什么在线后台一直做不成（历史原因 + 解法）

`@keystatic/astro` 的 `keystatic()` 会注入两条 `prerender: false` 的路由：
`/keystatic/[...params]` 和 `/api/keystatic/[...params]`。生产必须跑 Node。
而本项目有两个阻碍：

1. 旧配置**只在 `dev` 命令下**挂载 `keystatic()`，生产构建里根本没有 `/api/keystatic`，
   只有 `src/pages/keystatic/[...params].astro` 这个空壳静态页 → 打开后台所有请求都 404。
2. GitHub Pages 是纯静态托管，**跑不了 SSR**，所以就算注入了也无处安放。

现在的解法：admin 目标下新增 `keystatic-admin-api` 集成，只补 `/api/keystatic` 这一个 SSR 路由
（刻意不注册全量 `keystatic()`，否则会和自有的 `/keystatic/[...params].astro` 路由冲突），
并保留 `virtual:keystatic-config` 的 Vite 解析钩子（`internal/keystatic-api.js` 依赖它取配置）。

### 两种线上模式二选一

`keystatic.config.tsx` 的 `remoteStorage` 决定，**构建期生效、写进产物**：

| 模式 | 需要的宿主 | 鉴权 |
|---|---|---|
| `cloud`（默认） | 纯静态即可（GitHub Pages 就行），**但必须部署在根路径** | Keystatic Cloud 项目 `astro-nav/my-nav`，浏览器走 PKCE 直连 `https://api.keystatic.cloud`，零环境变量、零服务器 |
| `github` | Node（Vercel / Railway / 自建） | 自建 GitHub App，需 `KEYSTATIC_GITHUB_CLIENT_ID` / `KEYSTATIC_GITHUB_CLIENT_SECRET` / `KEYSTATIC_SECRET`（已在 `.env`） |

#### ⚠️ Cloud 模式只能部署在根路径（实测确认）

`@keystatic/core` 把 OAuth 回调写死成：

```js
url.searchParams.set('redirect_uri', `${window.location.origin}/keystatic/cloud/oauth/callback`);
```

它只拼 `origin`，**完全无视 Astro 的 `base`**。所以：

- 项目站点 `https://san-ren.github.io/my-nav/`（base=`/my-nav`）→ 回调被打到
  `https://san-ren.github.io/keystatic/cloud/oauth/callback`，那里什么都没有 → **GitHub 裸 404 / Not Found**。
- 用户站点 `https://san-ren.github.io/`（base=`/`，仓库必须叫 `san-ren.github.io`）→ 回调落在站内，正常。

回调路径**必须走 404.html 兜底，不能落地真实文件**（这点踩过两次）：

| 做法 | 结果 |
|---|---|
| 该路径无文件 → 走 `404.astro` 兜底 | ✅ 正确 |
| 预渲染成静态目录（`callback/index.html`） | ❌ GitHub Pages 会 301 补尾部斜杠变成 `/keystatic/cloud/oauth/callback/`，应用路由匹配不上，直接显示 `Not found` |

所以 `404.astro` 的兜底脚本必须保存 **路径 + 查询串**：

```js
sessionStorage.setItem('keystatic_spa_path', path + window.location.search);
```

漏掉 `window.location.search` 的话，`?code=&state=` 会在 `location.replace()` 跳转中丢失，
应用报 `Missing code or state`，登录照样完不成。

因此换部署目标时务必确认：**Cloud 模式下必须用 `pnpm build:root`**（`pnpm build` 的 base=`/my-nav` 会让后台不可用）。

**当前推荐且默认的就是 cloud** —— 站长没有自托管服务器，官方免费额度（3 人/team）足够个人用。
内容改动由 Keystatic Cloud 直接 commit 到 GitHub 仓库 → Actions 重建前台静态站，闭环完整。

两者互斥：cloud 模式下 `@keystatic/core` 会把本地 API 路由硬编码返回
`{ status: 404, body: 'Not Found' }`（见 `dist/keystatic-core-api-generic.js`），
所以一旦用 cloud 就不需要、也不应该再搭 SSR；反之 github 模式必须有 SSR，纯静态部署必然失败。

上线后必须把生产回调地址加进 GitHub App：
`https://<your-domain>/api/keystatic/github/oauth/callback`

---

## 4. 数据模型

`src/content.config.ts`（注意：位于 `src/` 下，不在 `src/content/` 内）定义 5 个集合：

| 集合 | type | 条目 | 说明 |
|---|---|---|---|
| `nav-pages` | data | 5 | `home` / `sub1..sub4`，带 `sortOrder` |
| `nav-groups` | data | 15 | `reference('nav-pages')` 归属，`pageConfig.sortPrefix` 排序 |
| `guides` | content | 3 | MDX |
| `changelog` | content | 16 | MDX |
| `site-settings` | data | 1 | 直接 JSON import |

### 四级嵌套

```
Page → Group → Category → Tab → resources
```

每层都能直接挂 `resources`（资源数组），实际数据里 Group 基本都用 Category/Tab 承载。

### 资源字段

`name` / `url` / `official_site` / `desc` / `icon` / `badge_list` / `detail`(Markdown) /
`guide_id` / `status`。`status` 支持 `ok` / `stale` / `github已归档` / `github仓库已失效` /
`网站失效` / `网站超时` / `官网失效` —— 非 `ok` 会被 `sortResourcesByStatus()` 排到末尾并套降级样式。

### id 规则（踩过坑）

- data 集合（JSON）的 entry id **不带扩展名**：`home`、`home-01--`
- content 集合（MDX）的 entry id **带扩展名**：`Claude Code.mdx`，页面里要用 `entry.slug`

---

## 5. 组件与页面

```
src/pages/
├── index.astro              首页，硬编码 currentId = 'home'
├── [id].astro               其余分类页，getStaticPaths 从 nav-pages 生成
├── changelog.astro          更新日志（函数更新 / 内容更新 两栏）
├── toolbox.astro            工具箱入口
├── guide/[...slug].astro    MDX 教程，按 entry.slug 生成
├── keystatic/[...params].astro  自定义后台 SPA 外壳
└── 404.astro
```

核心组件职责：

* **`SiteCard/`** — 卡片主体 + `Renderers.tsx`(Markdown 详情) + `client.js`(hover/详情弹窗)。
  完全服务端渲染，**没有** `client:*`，靠页面级脚本在 `astro:page-load` 时初始化。
* **`SearchModal.jsx`** — `client:idle`，⌘K 唤起，Fuse.js 搜全部 `nav-groups`，用 Portal 挂 body 避开层级问题。
* **`Sidebar/index.astro`** — 桌面常驻、移动抽屉；自动展开当前页面的分组树。
* **`ThemePicker/`** — 外观模式 / 主题色 / 背景 / 字体 / 动效开关，全部持久化到 localStorage，
  由 `Layout.astro` 头部的 `is:inline` 脚本阻塞式恢复（避免首屏闪白）。
* **`ResourceFilter.astro`** — 隐藏失效资源，强制用 `style.display = 'none'`。
* **`ShareExportModal.jsx`** — 选中当前区块导出图片/PDF。
* **`keystatic/Toolbox/`** — BatchAdder(智能解析批量导入) / GithubChecker(Star 同步) /
  LinkChecker(死链检测) / ResourceEditor / ResourceMover。它们的 `api/` 走本地文件系统，
  **仅 dev 注入，生产不可用**。

---

## 6. 关键约定

1. **所有全局 JS 必须同时监听 `astro:page-load` 与 `astro:after-swap`**，`<ClientRouter />` 已全局启用。
2. 错误提示统一走 `window.toast.success/error/info/warning`。
3. 网址 Logo 优先本地化到 `public/images/logos/`，减少外链。
4. Astro 组件用于静态结构，React 组件用于复杂交互。
5. 修改代码前先 Read 目标文件确认上下文；改数据结构后务必跑 `pnpm astro sync`。

---

## 7. 排错备忘

**症状**：首页显示“暂无内容，请在后台配置分组并关联到此页面”，所有分类页 404。

**根因**：`.astro/` 内容缓存过期（集合配置迁移到 `src/content.config.ts` 之后旧缓存失效），
`getCollection()` 全部返回空数组。

**解决**：

```bash
rm -rf .astro && pnpm astro sync && pnpm dev
```

同步时若出现 `Invalid content reference: ... references "home" ... does not exist`，
说明 entry id 与 JSON 里的 `pageName` 对不上，通常是 id 带了/没带扩展名。

---

### 详情浮窗（`.tooltip-source` → `#global-detail-tooltip`）

`SiteCard/client.js` 用一个全局单例浮窗复用展示所有卡片的详情。这里有三个必须知道的约束：

1. **同一张卡片内移动光标不能重播动画。** `mouseover` 会在卡片的每个子元素之间反复冒泡，
   `showTooltip()` 里已加早退：只要浮窗还属于同一张卡片（哪怕正在淡出），只恢复显示态，
   不重建 innerHTML、不重启动画 —— 否则就是肉眼可见的闪烁。
2. **缩放原点维持仓库原值**：`transformOrigin = isTop ? 'bottom center' : 'top center'`。
   曾尝试改成锚在箭头 x 上（想消除"箭头随生长横向漂移"），但那会改变入场时"从哪里长出来"的观感，
   属于改动画，站长明确要求保持原样 —— **不要再动这一行**。
3. **入场动效属禁区。** `src/styles/animations.css` 里 `.portal-popup` 的
   `cubic-bezier(0.34, 1.56, 0.64, 1)`（带过冲的 Q 弹手感）和时间参数与仓库逐字节一致，
   别为了"顺手感"或"几何更稳"私自改它，真要动先问站长。

### Tailwind v4 的两个隐性坑（都已修复，勿回退）

1. **`rotate-*` 不要再写在有内联 `transform` 的元素上。** v4 的 `.rotate-45` 输出的是
   独立的 CSS `rotate` 属性，会与内联 `transform: rotate(45deg)` **叠加成 90°** —— 详情浮窗的
   菱形箭头就是这样变成正方块的。现在箭头的旋转统一由 `client.js` 里的内联 transform 独占控制。
2. **永远不要用 `define:vars` 搭配 `is:inline`**，变量会注入失败（`src/pages/404.astro` 踩过）。
   需要给内联脚本传值时改用 `data-*` 属性 + `getAttribute`。

---

## 8. 曾经踩过的坑（留给未来的自己）

1. `@astrojs/node` 适配器**必须写在 `defineConfig({ adapter })` 里**，塞进 `integrations` 数组
   Astro 识别不到，构建会报 `NoAdapterInstalled`。
2. `keystatic()` 全量集成与 `src/pages/keystatic/[...params].astro` 路由冲突，二者只能选其一。
3. `storage.kind: 'cloud'` 时 `@keystatic/core` 会让本地 API 路由全部返回 `{404, 'Not Found'}`，
   这是源码里写死的行为，不是配置错误。
4. `storage` 的选择在构建期固化，运行时的环境变量改不了它。

---

**提示**：开始新任务时，请先查阅此文档确认当前的架构设计和实现方式。
