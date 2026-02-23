 

# 🌌 My Nav - 现代化、高度可定制的个人导航网站

 基于 **Astro**、**Tailwind CSS** 和 **Keystatic** 构建的现代化静态导航网站项目。 

---

## ✨ 核心特性概览

* 🚀 **极速响应**：基于 Astro 构建，生成纯静态页面，配合 Tailwind CSS 实现极致的首屏加载速度。
* 🎨 **高度可定制的主题系统**：内置可视化主题选择器，支持暗黑/明亮模式、自定义主题色、背景纹理以及 UI 动画开关。
* 📝 **内置可视化 CMS**：集成 Keystatic，支持在本地或部署后通过可视化界面直接管理导航链接、分类、页面和全站设置。
* 🧰 **超级效率工具箱 (Toolbox)**： 支持**链接批量导入**、**失效链接检测**、**GitHub 仓库状态/Star数自动同步**。
* 🔍 **全局极速搜索**：支持全站链接检索，支持拼音、模糊匹配，快速定位所需资源。
* 📱 **全平台响应式**：精心优化的移动端和桌面端 UI，自适应侧边栏与网格布局。
* 📖 **内容扩展**：原生支持 Markdown/MDX，内置「更新日志 (Changelog)」和「使用指南 (Guides)」模块。

---

## 📂 项目结构描述

```text
├── src/
│   ├── assets/          # 静态资源 (SVG, Images 等)
│   ├── components/      # UI 组件和功能组件
│   │   ├── KeystaticAdmin.tsx # Keystatic 后台入口
│   │   ├── SearchModal/ # 全局搜索组件
│   │   ├── Sidebar/     # 侧边栏导航组件
│   │   ├── SiteCard/    # 网址卡片组件
│   │   ├── ThemePicker/ # 主题与外观设置面板
│   │   └── keystatic/   # Keystatic 自定义字段和工具箱组件 (核心工具区)
│   ├── content/         # 数据存储区 (由 Keystatic 管理)
│   │   ├── nav-groups/  # 导航分组及具体链接数据 (JSON)
│   │   ├── nav-pages/   # 侧边栏一级页面配置 (JSON)
│   │   ├── site-settings/ # 网站全局配置 (JSON)
│   │   ├── changelog/   # 更新日志内容 (MDX)
│   │   └── guides/      # 文章/指南内容 (MDX)
│   ├── layouts/         # 页面基础布局模板
│   ├── pages/           # Astro 路由页面 (首页、动态分类页、404、后台入口等)
│   ├── styles/          # 全局样式、动画及 Tailwind 插件样式
│   └── utils/           # 工具函数 (如资源排序等)
├── public/              # 公共静态资源 (图标库、网站 Logo、Favicon 等)
├── astro.config.mjs     # Astro 配置文件 (配置 Keystatic、React、Tailwind 等集成)
├── keystatic.config.tsx # Keystatic 数据架构定义文件 (定义后台长什么样)
├── tailwind.config.mjs  # Tailwind 样式及主题配置文件
└── .github/workflows/   # GitHub Actions 自动部署工作流

```

---

## 🛠️ 功能拆解

### 1. 前端展示层 (Frontend UI)

* **多层级导航结构**：支持 `页面 (Pages)` -> `分组 (Groups)` -> `分类 (Catgeroies)` -> `标签页 (Tab)` 的四级嵌套结构。
* **智能侧边栏 (Sidebar)**：
  * 桌面端常驻，移动端可折叠 (抽屉式交互)。
  * 自动高亮当前所在的导航页面。


* **高级网址卡片 (Site Card)**：
  * 展示内容：网站 Logo、名称、描述。
  * 标签系统：支持展示自定义 Badge（如“开源”、“免费”、“需科学上网”等）。
  * 数据联动：当链接为 GitHub 仓库时，可自动展示 Stars 数量并跳转。


* **全局搜索框 (Search Modal)**：
  * 快捷键唤醒（如 `Ctrl+K` 或点击搜索图标）。
  * 实时搜索 `nav-groups` 中的所有网址标题和描述。


* **动态主题系统 (Theme Picker)**：
  * **外观模式 (Mode)**：自动跟随系统 / 强制浅色 / 强制深色。
  * **主题色调 (Color)**：内置多套预设主题色（通过 CSS 变量和 Tailwind 配合实现全局变色）。
  * **背景纹理 (Background)**：支持切换不同的背景图案（如网格、波浪、极简纯色等）。
  * **动效控制 (Animation)**：允许用户关闭页面元素的过渡动画（Fade-up 缓动入场、Hover 卡片浮动等），照顾晕动症用户。
  * *注：所有用户偏好会自动保存在本地 `localStorage`，下次访问自动恢复。*
  


### 2. 内容扩展页 (Content Pages)

* **更新日志 (Changelog)**：支持 MDX 语法，提供专属页面展示网站或工具的历史版本迭代记录。
* **使用指南 (Guides)**：独立的文章阅读页面，可用于撰写具体软件的使用教程或导航站的使用说明。
* **最近更新统计 (UpdateStatsCard)**：首页可配置展示近期新增或修改的链接数量，让网站看起来充满活力。

### 3. Keystatic 可视化管理后台

项目拒绝了繁琐的手写 JSON/Markdown，集成了 Keystatic，访问 `/keystatic` 即可进入图形化后台（本地运行无需部署数据库）。

* **全局设置 (Site Settings)**：修改网站标题、SEO 描述、Favicon、站长信息等。
* **分类管理**：可视化增删改查左侧菜单栏和主内容区的分组。
* **链接管理**：表单化输入网址、标题、描述、图标，支持上传本地图片作为 Logo。
* **自定义表单组件**：开发了特殊的 `IconPicker` (图标选择器) 和 `BadgeField` (徽章配置器)，提升后台录入体验。

### 4. 🚀 工具箱 (Admin Toolbox)

这是本项目最硬核的部分，位于后台面板中，极大解决了长期维护导航站的痛点：

* **批量添加器 (Batch Adder)**：
    * **智能解析 (Smart Parse)**：支持将乱七八糟的文本、Markdown 列表、HTML `<a>` 标签、或纯 URL 列表直接粘贴进去。系统会自动提取出标题、链接和描述。
    * **快速归类**：解析后可在页面上直接微调，并一键分配到指定的分组中。


* **GitHub 监控检查 (Github Checker)**：
    * 自动扫描全站所有属于 `github.com` 的链接。
    * 调用 GitHub API，批量获取仓库的最新 Star 数量和 Repository Description。
    * 一键将最新数据同步覆盖到本地配置文件中。


* **死链检测 (Link Checker)**：
    * 一键遍历检查所有的导航链接。
    * 自动检测 HTTP 状态码，标红 404 失效链接、重定向链接或超时链接。
    * 方便站长定期清理失效书签，保证导航站质量。



---

## 🚀 快速开始

### 环境要求

* Node.js (建议 v18 或以上版本)
* npm / pnpm / yarn

### 1. 安装依赖

```bash
# 克隆项目
git clone https://github.com/你的用户名/my-nav.git
cd my-nav

# 安装依赖
npm install

```

### 2. 本地开发与运行

```bash
npm run dev

```

运行后，将开启两个核心服务：

* **前台网站**: `http://localhost:4321` (默认)
* **Keystatic 管理后台**: `http://localhost:4321/keystatic`

### 3. 数据管理

1. 访问 `http://localhost:4321/keystatic` 进入后台。
2. 在左侧面板，你可以：
* 在 **Site Settings** 修改站点名称。
* 在 **Nav Pages** 创建你的左侧菜单项。
* 在 **Nav Groups** 创建具体的网址区块并添加书签。


3. 所有在后台的修改，都会自动实时保存回你的项目源码目录 (`src/content/`) 中的 JSON 或 MDX 文件。

---

## ☁️ 部署指南

本项目原生支持部署到 **GitHub Pages**，并且自带了配置文件。

1. 修改 `astro.config.mjs` 中的 `site` 和 `base`（如果使用自定义域名则通常不需要 base）。
2. 在你的 GitHub Repository 的 `Settings` -> `Pages` 中，将来源设置为 **GitHub Actions**。
3. 推送代码到 GitHub 的默认分支，项目根目录下的 `.github/workflows/deploy.yml` 会自动触发构建，并将生成的静态文件部署到 GitHub Pages 上。

*提示：由于本项目采用了本地存储的 Keystatic（Local Mode），建议在本地运行 `npm run dev` 并在本地的 `/keystatic` 界面添加好数据，然后将生成的 json 文件 Git commit 推送到仓库即可完成全站更新。*

---

## 🎨 自定义开发说明

* **修改预设主题色**：请打开 `src/styles/theme.css` 和 `tailwind.config.mjs`，添加或修改对应的 CSS 变量和 Tailwind 扩展颜色。
* **添加背景模式**：编辑 `src/components/ThemePicker/sections/BgSection.astro` 添加选项，并在 css 中实现对应的样式。
* **内置图标管理**：将 svg 图片放置于 `public/images/logos` 下，由于做了代码结构优化，它们能在后台直接被读取。