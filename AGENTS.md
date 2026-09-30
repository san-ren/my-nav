# AGENTS.md - Agentic Coding Guidelines

This file provides context for AI agents operating in this repository.

> 最后校验：2026-09-30，基于 Astro 7.3.5 / Tailwind 4 / pnpm 12 实际运行验证。

---

## 1. Build & Development Commands

本项目使用 **pnpm**（`packageManager: pnpm@12.8.1`，Node >= 22.12）。仓库里已无 `package-lock.json`。

```bash
pnpm install

pnpm dev          # 开发服务器 http://localhost:4321
                  # 同时挂载 /keystatic 后台（local 模式，直接读写磁盘）
                  # 以及 Toolbox 的 /api/* 服务端路由
pnpm start:dev    # 同上，但不带 --host 0.0.0.0（保留的历史写法）

pnpm check        # astro check 类型校验
pnpm preview      # 预览生产产物

pnpm build:admin && pnpm start
                  # 生产 SSR 服务器：node ./dist/server/entry.mjs
                  # 端口读环境变量 PORT（默认 4321），已监听 0.0.0.0
                  # 本地与线上是同一条命令；npm start / npm run dev 同样可用
```

> **npm 的边界**：`npm run <script>` / `npm start` 都能跑（npm 只是执行 package.json 里的脚本，
> 脚本内的 CLI 走 `node_modules/.bin` 解析，与依赖由谁安装无关，已实测）。
> 但**依赖只能用 pnpm 装**：仓库无 `package-lock.json`（`npm ci` 直接失败），
> `npm install` 会生成扁平 `node_modules` 并忽略 `pnpm-workspace.yaml` 里的 `allowBuilds`
> （esbuild / sharp 的构建放行名单）。

### 构建目标：由 `DEPLOY_TARGET` 环境变量决定（唯一真源）

`astro.config.mjs` 会读取 `process.env.DEPLOY_TARGET`。**不要手工修改配置里的 `base`**，
一律通过下面的脚本切换。

| 命令 | DEPLOY_TARGET | base | 产物 | 用途 |
|---|---|---|---|---|
| `pnpm build` | `github` | `/my-nav` | 纯静态 | **默认**，GitHub Pages（无在线后台） |
| `pnpm build:gh` | `github` | `/my-nav` | 纯静态 | 同上，兼容 `.github/workflows/deploy.yml` |
| `pnpm build:root` | `root` | `/` | 纯静态 | 自有域名根路径部署 |
| `pnpm build:admin` | `admin` | `/` | 静态 + Node SSR | 挂 `@astrojs/node`，只有 `/api/keystatic/*` 走 SSR；部署到 Node 宿主后可用**在线后台** |
| `pnpm serve:admin` | `admin` | `/` | — | 本地构建并运行 admin 产物，用于上线前自检 |

`.github/workflows/deploy.yml` 调用的是 `pnpm run build:root`：本站是 `san-ren.github.io` **用户站点**，
服务在域名根路径；且 Keystatic Cloud 的 OAuth 回调固定写作 `${origin}/keystatic/cloud/oauth/callback`，
不带 base 前缀 —— 若改用 `build:gh`（base=`/my-nav`），在线后台将永远无法登录。

### 在线后台（Keystatic）的两种互斥方案

`src/pages/keystatic/[...params].astro` 是自定义的 SPA 外壳（内含删除二次确认等增强），
所以它不走官方 `keystatic()` 注入的那条同名路由。缺少的只是**后端 API**，故 admin 目标下
只注入 `@keystatic/astro/internal/keystatic-api.js`。数据模式在 `keystatic.config.tsx` 的
`remoteStorage` 里决定，**必须在构建期确定**（会被打进产物，运行时再改无效）：

| KEYSTATIC_STORAGE | 是否需要 Node 宿主 | 说明 |
|---|---|---|
| `cloud`（默认） | ❌ 不需要 | **Keystatic 官方托管**。浏览器直连 `https://api.keystatic.cloud` 走 PKCE 登录，不经自家后端，纯静态部署（GitHub Pages）就能打开在线后台。需要在 Cloud 里把项目 `astro-nav/my-nav` 绑定到 GitHub 仓库 |
| `github` | ✅ 需要 | 自建 GitHub App + `/api/keystatic` SSR，须配 `build:admin` 并部署到 Node 宿主。环境变量见本机 `.env` |

两者**互斥**：cloud 模式下 `@keystatic/core` 会让本地 API 路由全部返回 404，别再搭 SSR；
反之 github 模式必须要有 SSR，纯静态部署一定失败。

切换方式（构建期生效）：

```bash
pnpm build                          # cloud（默认）
KEYSTATIC_STORAGE=github pnpm build:admin   # github + Node 宿主
```

走 `cloud` 时上线流程：Cloud 后台改内容 → commit 到 GitHub → Actions 重建静态站。

### Keystatic Cloud 项目

`keystatic.config.tsx` 中 `cloud: { project: 'astro-nav/my-nav' }`，即 team `astro-nav` /
project `my-nav`。免费额度 3 人/team（本人够用）。首次使用需在
<https://keystatic.cloud> 上把该项目与 GitHub 仓库绑定一次。

### ⚠️ 内容集合缓存陷阱（踩过）

`src/content/` 下的所有内容通过 astro Content Layer 同步到 `.astro/`。
**当 `content.config.ts` 的位置或内容发生变更（例如 `src/content/config.ts` → `src/content.config.ts` 的迁移）后，
旧的 `.astro/` 会失效，导致 `getCollection()` 全部返回空数组**，表现是首页显示
“暂无内容，请在后台配置分组并关联到此页面”，且 `[id].astro` 不生成任何路由 → 所有分类页 404。

排错顺序：

```bash
rm -rf .astro          # 清缓存（.astro 已在 .gitignore 中）
pnpm astro sync        # 重新同步；正常应无任何 Invalid content reference 报错
pnpm dev               # 重启 dev server（旧的常驻进程会一直吃着坏缓存）
```

判定依据：`pnpm astro sync` 若打印 `Invalid content reference: ... references "home" ... does not exist`，
说明 entry id 与 JSON 里的 `pageName` 对不上；正常情况下 `nav-pages` 的 id 是 `home`/`sub1`（不带扩展名），
`nav-groups` 的 id 是 `home-01--` 这类（不带 `.json`）。注意 `type: 'content'` 的 `guides`/`changelog`
id **保留** `.mdx` 后缀，因此服务端渲染时必须用 `entry.slug` 而非 `entry.id`。

---

## 2. Project Structure

```
src/
├── components/          # UI 组件（Astro + React）
│   ├── SiteCard/        # 网址卡片：index.astro / Renderers.tsx / client.js / site-card.css / utils.js
│   ├── Sidebar/         # 侧边栏：index.astro / interactive.js / sidebar.css
│   ├── ThemePicker/     # 主题面板：index.astro / theme-logic.js / sections/(Color|Bg|Backup)
│   ├── keystatic/
│   │   ├── Toolbox/     # 后台工具箱：BatchAdder / GithubChecker / LinkChecker /
│   │   │                #   ResourceEditor / ResourceMover（各带 api/ 服务端路由，仅 dev 注入）
│   │   ├── ToolboxField/# 自定义字段：IconPicker / AutoFiller / smart-parse
│   │   └── BadgeField.tsx
│   ├── SearchModal.jsx        # ⌘K 全局搜索（Fuse.js）
│   ├── ShareExportModal.jsx   # 区块分享导出（html2canvas + jspdf）
│   ├── ResourceFilter.astro   # 失效资源筛选
│   ├── UpdateStatsCard.astro  # 最近更新统计
│   ├── KeystaticAdmin.tsx     # 后台 SPA 外壳（makePage(config)）
│   └── Toast.astro
├── content/             # 数据源，全部由 Keystatic 管理
│   ├── nav-pages/       # 5 个一级页面：home / sub1..sub4
│   ├── nav-groups/      # 15 个分组 JSON
│   ├── guides/          # 3 篇 MDX
│   ├── changelog/       # 16 篇 MDX
│   └── site-settings/config.json
├── layouts/Layout.astro
├── pages/               # index / [id] / changelog / toolbox / 404 / guide/[...slug] / keystatic/[...params]
├── scripts/             # ui-layout.js（16K，全局 UI 逻辑）+ init-animations.js
├── styles/              # global / theme / animations / mdx / changelog / toolbox / share-export
├── utils/               # resourceSort.ts（按 status 排序置底）+ guideMatcher.ts（自动关联教程）
└── content.config.ts    # 集合定义（注意：不在 content/ 里）
```

---

## 3. Code Style Guidelines

- `tsconfig.json` extends `astro/tsconfigs/strict`，但 **`strict: false` 且 `noImplicitAny: false`**，
  类型注解可选，复杂逻辑仍建议显式标注。
- 样式：**Tailwind CSS v4**，通过 `@tailwindcss/vite` 插件 + `postcss.config.mjs` 接入，
  入口是 `src/styles/global.css` 里的 `@import "tailwindcss"`。不要再写 `tailwind.config` 的 `content` 配置。
- 类合并统一用局部实现的 `cn()`（`clsx` + `tailwind-merge`），见 `SiteCard/index.astro`。
- 命名：Astro/React 组件 `PascalCase`，工具函数 `camelCase`，CSS `kebab-case`。
- 组件克制使用 `client:*`：能在服务端渲染的一律不 hydrate（如 `SiteCard`），
  只有 `SearchModal`、`ShareExportModal` 用了 `client:idle`，`KeystaticAdmin` 用 `client:only="react"`。

---

## 4. Key Patterns & Conventions

### 内容层级（四级）

`Page(nav-pages)` → `Group(nav-groups)` → `Category` → `Tab`，每层都可以直接挂 `resources`。
`Group` 通过 `reference('nav-pages')` 归属到页面；过滤时 id 可能是对象也可能是字符串，
务必兼容两种形态（`index.astro` 与 `[id].astro` 中的写法）：

```js
const groupPageId = typeof g.data.pageName === 'object' ? g.data.pageName.id : g.data.pageName;
```

### 资源状态

`status` 枚举：`ok` / `stale` / `github已归档` / `github仓库已失效` / `网站失效` / `网站超时` / `官网失效`。
非 `ok` 的会被 `sortResourcesByStatus()` 沉底，并套用置灰/删除线样式。

### 交互与状态

- `<ClientRouter />` 已在 `Layout.astro` 中启用，所有全局脚本必须同时监听
  `astro:page-load`（首屏 + 切换）与 `astro:after-swap`，否则 View Transitions 后会失效。
- 用户偏好（主题色、布局、字体、动效、背景）统一存 `localStorage`，
  由 `Layout.astro` 头部的 `is:inline` 脚本在首屏阻塞式恢复，避免闪白。
- 错误处理：异步操作 try-catch，用户提示统一走 toast：
  ```js
  window.toast.success('操作成功'); window.toast.error('操作失败，请重试');
  ```

---

## 5. Testing & Verification

没有接入 Vitest/Jest。提交前请依次执行：

1. `pnpm check` — 类型校验
2. `pnpm build` — GitHub Pages 静态构建必须成功
3. 若改过 `astro.config.mjs` 的部署分支，`pnpm build:admin` 也要跑通
4. `pnpm dev` 手测：`/`、`/sub1`、`/changelog`、`/keystatic`

验证 SSR 后台是否真的通的快捷方式（`build:admin` 后）：

```bash
node ./dist/server/entry.mjs &   # 默认 PORT 3000/4321，可用 PORT 环境变量覆盖
curl -i 'http://127.0.0.1:3000/api/keystatic/github/login/'
# 期望：307 且 Location 指向 https://github.com/login/oauth/authorize?client_id=...
# 若是 404 + body "Not Found"，说明 keystatic.config 落到了 cloud 模式（该模式会禁用本地 API）
```

### 常见坑

- **改了集合定义却忘了 `astro sync`** → 见第 1 节的缓存陷阱。
- **dev server 运行期间不要跑 `pnpm check` / `pnpm build`**（两个都会踩）：
  `astro check` 会用另一套入口集重跑 Vite 依赖预打包并覆写 `node_modules/.vite/deps`，
  运行中的 dev server 仍按旧 hash 发模块地址，浏览器拿到 `504 Outdated Optimize Dep`，
  而 504 发生在 `client:only` 岛屿的动态 `import()` 里、不会触发 Vite 的自动重载兜底，
  表现是**岛屿静默白屏**（典型：`/toolbox` 一片空白，控制台报 `Failed to fetch dynamically imported module`）。
  恢复：`rm -rf node_modules/.vite` + 重启 dev server。
  而 `pnpm build`（github 静态目标）会清空并覆写 `dist/`，之前构建的 `dist/server/entry.mjs` 会消失。
- **岛屿依赖已显式列进 `astro.config.mjs` 的 `optimizeDeps.include`**（`lucide-react` / `fuse.js` / `marked`）。
  新增 `client:only` 岛屿用到新的裸依赖时，必须同步补进去，否则会退回"运行时发现依赖"的不稳定路径。
- **`keystatic.config.tsx` 会被打进浏览器 bundle**（`KeystaticAdmin.tsx` 里 `makePage(config)`），
  所以那里**绝不能出现裸 `process.env.*`**：浏览器没有 `process` 全局，会抛
  `ReferenceError: process is not defined`，表现为 `/keystatic` 静默白屏（dev 与线上同样中招）。
  现有两道防线：`astro.config.mjs` 的 `define`（注入 `process.env.KEYSTATIC_STORAGE` 与
  `__KEYSTATIC_STORAGE__`，构建期替换为字面量）+ 源码里的 `typeof` 兜底（dev 下 Vite 不替换项目源码，靠它保命）。
  以后新增环境变量请照抄这个模式，不要直接写 `process.env.X`。
- **Toolbox 里"通知父组件"的 effect 不能用会变的回调身份做依赖**：
  `ResourceMover` 曾把父组件每次渲染新建的 `onDataStatusChange` 写进依赖数组，effect 里又 `setState` 新对象，
  形成无限更新循环 → React 抛 `Maximum update depth exceeded` 并卸载整棵树 → `/toolbox` 白屏。
  正确写法（其他组件已是范例）：回调存 `useRef`，依赖数组只放真正会变的状态；`setState` 时值没变就 `return prev`。
- ToolBox 的 `/api/*` 依赖本地文件系统读写，只有 dev 能用，**不要期望在生产里跑**。
- `guide/[...slug].astro` 用 `entry.slug` 而不是 `entry.id`（后者带 `.mdx`）。

---

## 6. External Resources

- [Astro Docs](https://docs.astro.build) · [Keystatic Docs](https://keystatic.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com) · [Lucide Icons](https://lucide.dev)
- 在线后台相关：Keystatic Cloud 与 GitHub mode 的取舍见本文第 1 节
