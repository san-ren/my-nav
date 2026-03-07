# 项目开发指南 & 上下文说明 (LLM Context)

本文档旨在帮助大语言模型（LLM）快速理解本项目 `my-nav` 的架构、技术栈、核心功能及实现细节，以便在后续对话中提供准确的代码建议和修改。

---

## 1. 项目概览

**项目名称**: my-nav  
**项目类型**: 个人导航网站 / 资源聚合平台  
**核心目标**: 提供一个美观、响应式、易于管理的资源导航界面，支持分类、搜索、暗色模式及移动端适配。

## 2. 技术栈

*   **框架**: [Astro v5](https://astro.build/) (采用其强大的静态生成能力和组件化架构)
*   **UI 库**: [React 19](https://react.dev/) (用于交互性较强的组件，如搜索框、管理后台)
*   **样式**: [TailwindCSS v3](https://tailwindcss.com/) (原子化 CSS) + 自定义 CSS 动画
*   **图标**: [Lucide React](https://lucide.dev/) (SVG 图标库)
*   **内容管理**: [Keystatic](https://keystatic.com/) (用于管理 Markdown/JSON 内容)
*   **搜索**: [Fuse.js](https://fusejs.io/) (前端模糊搜索)
*   **构建工具**: Vite (Astro 内置)

## 3. 目录结构

```
my-nav/
├── public/                 # 静态资源
│   ├── images/logos/       # 网站图标 (本地化存储)
│   └── favicon.svg         # 默认图标
├── src/
│   ├── components/         # 组件库
│   │   ├── SiteCard/       # 核心组件：资源卡片
│   │   │   ├── index.astro # 卡片结构与逻辑
│   │   │   ├── client.js   # 卡片交互脚本
│   │   │   └── site-card.css # 卡片专用样式
│   │   ├── SearchModal.jsx # 全局搜索框 (React 组件)
│   │   ├── Sidebar/        # 侧边栏导航
│   │   └── ThemePicker/    # 主题切换器
│   ├── content/            # 数据源
│   │   ├── nav-groups/     # 导航数据 (JSON 格式)
│   │   └── changelog/      # 更新日志 (MDX 格式)
│   ├── layouts/            # 页面布局 (Layout.astro)
│   ├── pages/              # 路由页面
│   │   ├── index.astro     # 首页
│   │   ├── [id].astro      # 分类页 (动态路由)
│   │   └── guide/          # 教程页
│   ├── scripts/            # 全局脚本
│   │   ├── ui-layout.js    # 核心 UI 逻辑 (侧边栏、Tab、滚动、设备检测)
│   │   └── init-animations.js # 动画初始化
│   └── styles/             # 全局样式
│       ├── global.css      # 全局 CSS 变量与重置
│       └── theme.css       # 主题色配置
├── astro.config.mjs        # Astro 配置
└── package.json            # 依赖管理
```

## 4. 核心功能与实现细节

### 4.1 资源卡片 (SiteCard)
*   **位置**: `src/components/SiteCard/`
*   **功能**: 展示资源图标、标题、描述。
*   **交互**:
    *   **Desktop**: 鼠标悬停显示 "详情" 和 "教程" 按钮（如果有），卡片有光影效果。
    *   **Mobile**: 按钮组始终显示，且纵向排列（详情在上，教程在下）。
*   **状态**: 支持 `ok`, `stale` (长期未更新), `failed` (已失效) 三种状态。
    *   `failed` 状态会有删除线，且在筛选中可隐藏。
*   **详情弹窗**: 点击 "详情" 按钮显示 Markdown 格式的详细介绍和徽章 (Badges)。

### 4.2 全局搜索 (SearchModal)
*   **位置**: `src/components/SearchModal.jsx`
*   **实现**: React 组件，使用 `createPortal` 挂载到 `document.body` 以避免层叠上下文 (`z-index`) 问题。
*   **特性**:
    *   快捷键 `Cmd/Ctrl + K` 呼出。
    *   基于 `Fuse.js` 进行本地模糊搜索。
    *   **动画**: 使用 `setTimeout` 延迟触发 CSS `transition`，实现柔和的缩放和位移入场动画。
    *   **关闭策略**: 点击遮罩层、点击空白处、按 ESC 键均可关闭。
    *   **跳转**: 支持页内平滑滚动跳转和跨页面跳转。

### 4.3 响应式布局与设备检测
*   **实现**: `src/scripts/ui-layout.js`
*   **逻辑**:
    *   `detectDeviceType()` 函数检测 UserAgent。
    *   在 `<html>` 标签添加 `mobile-device` 或 `desktop-device` 类。
    *   CSS 基于此类名应用不同的交互样式（如 SiteCard 的按钮显示逻辑）。
*   **侧边栏**: Mobile 端为抽屉式，Desktop 端为固定式。

### 4.4 资源筛选
*   **位置**: `src/components/ResourceFilter.astro` & `src/scripts/ui-layout.js`
*   **功能**: 可筛选 "长期未更新" 和 "已失效" 资源。
*   **实现**: 通过 JS 监听 Checkbox 变化，切换卡片的 `hidden` 类和 `style.display` 属性。

### 4.5 数据结构 (Nav Groups)
*   **位置**: `src/content/nav-groups/*.json`
*   **层级**:
    1.  **Group** (分组，对应 JSON 文件)
    2.  **Category** (分类)
    3.  **Tab** (选项卡，可选)
    4.  **Resource** (资源项)
*   **字段**: `name`, `url`, `icon`, `desc`, `detail` (Markdown), `status` 等。

## 5. 最近修改记录 (Important)

1.  **SearchModal 修复**:
    *   解决了遮罩层无法覆盖顶栏的问题（使用 `React Portal` + `z-index: 100/110`）。
    *   优化了入场动画（`scale-95` -> `scale-100`, `opacity-0` -> `opacity-100`，时长 500ms）。
    *   实现了点击空白处关闭功能。

2.  **移动端适配优化**:
    *   引入了 JS 精准设备检测 (`mobile-device` class)。
    *   SiteCard 在移动端强制显示详情按钮，且按钮组改为纵向排列。

3.  **筛选功能修复**:
    *   修复了 "已失效" 资源无法隐藏的 Bug（强制使用 `style.display = 'none'`）。

## 6. 开发规范

*   **样式**: 优先使用 Tailwind Utility Classes。复杂动画或组件特定样式写在对应的 CSS 文件中。
*   **图标**: 尽量使用本地图标 (`/public/images/logos/`)，减少外部依赖。
*   **代码风格**: 保持组件化，逻辑与视图分离。React 组件用于复杂交互，Astro 组件用于静态页面构建。
*   **文件操作**: 修改代码时，请先 `Read` 相关文件，确保上下文准确。

---
**提示**: 开始新任务时，请先查阅此文档确认当前的架构设计和实现方式。
