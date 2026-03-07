import { config, fields, collection, singleton } from '@keystatic/core';
import { wrapper } from '@keystatic/core/content-components';
import React from 'react';
import { toolboxField, iconPickerField, toolboxLinkField } from './src/components/keystatic/ToolboxField'; 
import { badgeListField } from './src/components/keystatic/BadgeField';

const VISUAL_TAGS = [
  { label: '🏠 首页/概览', value: '🏠' },
  { label: '🛠️ 系统/工具', value: '🛠️' },
  { label: '🎨 设计/美化', value: '🎨' },
  { label: '📺 影音/娱乐', value: '📺' },
  { label: '📚 文档/阅读', value: '📚' },
  { label: '⚡ 效率/生产力', value: '⚡' },
  { label: '☁️ 网络/云端', value: '☁️' },
  { label: '🤖 开发/AI (Dev)', value: '🤖' },
  { label: '⚪ 无标签', value: ' ' }
];

// --- Block Components ---
// 移植自 wj-markdown-editor
// 
// GitHub Alert (5种): Note, Tip, Important, Warning, Caution - 简洁边框样式
// 自定义容器 (6种): Info, Tip, Important, Warning, Danger, Details - 彩色背景样式

// ========== GitHub Alert Schema (5种) ==========
const gitHubAlertSchema = {
  type: fields.select({
    label: 'Alert 类型',
    options: [
      { label: '📘 Note (笔记)', value: 'note' },
      { label: '💡 Tip (技巧)', value: 'tip' },
      { label: '💬 Important (重要)', value: 'important' },
      { label: '⚠️ Warning (警告)', value: 'warning' },
      { label: '🔴 Caution (注意)', value: 'caution' },
    ],
    defaultValue: 'note',
  }),
  title: fields.text({ label: '标题 (可选)' }),
  content: fields.child({ kind: 'block', placeholder: '在此输入内容...' }),
};

// ========== 自定义容器 Schema (6种) ==========
const containerSchema = {
  type: fields.select({
    label: '容器类型',
    options: [
      { label: 'ℹ️ Info (信息)', value: 'info' },
      { label: '💡 Tip (技巧)', value: 'tip' },
      { label: '💬 Important (重要)', value: 'important' },
      { label: '⚠️ Warning (警告)', value: 'warning' },
      { label: '🔥 Danger (危险)', value: 'danger' },
      { label: '🔽 Details (详情/折叠)', value: 'details' },
    ],
    defaultValue: 'info',
  }),
  title: fields.text({ label: '标题 (可选)' }),
  open: fields.checkbox({ label: '默认展开 (仅 Details 有效)', defaultValue: false }),
  content: fields.child({ kind: 'block', placeholder: '在此输入内容...' }),
};

// ========== GitHub Alert 样式配置 ==========
const gitHubAlertStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  note: { bg: '#f8fafc', border: '#0969da', text: '#0969da', icon: '📘' },
  tip: { bg: '#f8fafc', border: '#1a7f37', text: '#1a7f37', icon: '💡' },
  important: { bg: '#f8fafc', border: '#8250df', text: '#8250df', icon: '💬' },
  warning: { bg: '#f8fafc', border: '#9a6700', text: '#9a6700', icon: '⚠️' },
  caution: { bg: '#f8fafc', border: '#cf222e', text: '#cf222e', icon: '🔴' },
};

// ========== 自定义容器样式配置 ==========
const containerStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  info: { bg: 'rgb(239, 240, 243)', border: '#656869', text: '#656869', icon: 'ℹ️' },
  tip: { bg: 'rgb(221, 245, 237)', border: '#18794e', text: '#18794e', icon: '💡' },
  important: { bg: 'rgb(241, 236, 252)', border: '#6f42c1', text: '#6f42c1', icon: '💬' },
  warning: { bg: 'rgb(252, 244, 220)', border: '#915930', text: '#915930', icon: '⚠️' },
  danger: { bg: 'rgb(254, 228, 232)', border: '#b8272c', text: '#b8272c', icon: '🔥' },
  details: { bg: 'rgb(239, 240, 243)', border: '#656869', text: '#656869', icon: '▶' },
};

// ========== GitHub Alert ContentView ==========
const GitHubAlertContentView = (props: any) => {
  const type = props.value?.type || 'note';
  const title = props.value?.title || type.charAt(0).toUpperCase() + type.slice(1);
  const style = gitHubAlertStyles[type] || gitHubAlertStyles.note;

  return (
    <div style={{ padding: '8px 16px', background: style.bg, borderLeft: `4px solid ${style.border}`, borderRadius: '6px', margin: '1em 0' }}>
      <div style={{ fontWeight: '500', color: style.text, display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <span>{style.icon}</span>
        {title}
      </div>
      <div>{props.children}</div>
    </div>
  );
};

// ========== 自定义容器 ContentView ==========
const ContainerContentView = (props: any) => {
  const type = props.value?.type || 'info';
  const title = props.value?.title || (type === 'details' ? 'Details' : type.charAt(0).toUpperCase() + type.slice(1));
  const open = props.value?.open || false;
  const style = containerStyles[type] || containerStyles.info;

  // Details 折叠容器
  if (type === 'details') {
    return (
      <div style={{ padding: '10px', background: style.bg, border: `1px solid ${style.border}`, borderRadius: '6px', margin: '1em 0' }}>
        <div style={{ fontWeight: '500', display: 'flex', gap: '8px', color: style.text, alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '0.2s', fontSize: '0.8em' }}>▶</span>
          {title}
        </div>
        <div style={{ marginTop: '8px', paddingLeft: '18px' }}>{props.children}</div>
      </div>
    );
  }

  // 普通容器
  return (
    <div style={{ padding: '12px 16px', background: style.bg, borderRadius: '8px', margin: '1em 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontWeight: '500', color: style.text, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>{style.icon}</span>
        {title}
      </div>
      <div>{props.children}</div>
    </div>
  );
};

// ========== 注册组件 ==========
const documentBlocks = {
  GitHubAlert: wrapper({
    label: '📢 GitHub Alert',
    schema: gitHubAlertSchema,
    ContentView: GitHubAlertContentView,
  }),
  Container: wrapper({
    label: '📦 容器',
    schema: containerSchema,
    ContentView: ContainerContentView,
  }),
};

const mdxBlocks: any = {
  GitHubAlert: wrapper({
    label: '📢 GitHub Alert',
    schema: gitHubAlertSchema,
    ContentView: GitHubAlertContentView,
    icon: <span style={{fontSize: '20px'}}>📢</span>, 
  } as any),
  Container: wrapper({
    label: '📦 容器',
    schema: containerSchema,
    ContentView: ContainerContentView,
    icon: <span style={{fontSize: '20px'}}>📦</span>, 
  } as any),
};

const commonMdxOptions = {
  bold: true,
  italic: true,
  strikethrough: true,
  code: true,
  heading: [2, 3, 4, 5, 6] as const,
};

// 资源状态 Emoji 映射
const getStatusEmoji = (status: string | undefined): string => {
  switch (status) {
    case '官网失效': return '❌ ';
    case '网站失效': return '❌ ';
    case 'stale': return '⚠️ ';
    default: return '';
  }
};

// --- Reusable Fields ---
const resourceFields = {
  toolbox: toolboxField as any,
  toolboxLink: toolboxLinkField as any, 
  name: fields.text({ label: '名称' }),
  url: fields.url({
    label: '项目链接',
    description: 'GitHub地址或下载直链',
    validation: { isRequired: false }
  }),
  official_site: fields.url({
    label: '官网地址',
    validation: { isRequired: false }
  }),
  desc: fields.text({
    label: '简短描述',
    multiline: true
  }),
  detail: fields.text({
    label: '详细介绍',
    multiline: true,
    description: '支持标准 Markdown 语法',
  }),
  icon: iconPickerField,
  hide_badges: badgeListField({
    label: '隐藏徽章 (勾选则隐藏)',
    description: '根据上方项目地址自动生成可用的徽章选项',
    defaultValue: []
  }),
  guide_id: fields.text({ label: '关联教程ID' }),
  status: fields.select({
    label: '资源状态',
    description: '失效资源将自动沉底并显示降级样式',
    options: [
      { label: '✅ 正常', value: 'ok' },
      { label: '⚠️ 长期未更新', value: 'stale' },
      { label: '📦 github已归档', value: 'github已归档' },
      { label: '❌ github仓库已失效', value: 'github仓库已失效' },
      { label: '❌ 网站失效', value: '网站失效' },
      { label: '⏱️ 网站超时', value: '网站超时' },
      { label: '❌ 官网失效', value: '官网失效' },
    ],
    defaultValue: 'ok',
  }),
};

// 1. 定义环境判断变量
const isDev = import.meta.env.DEV;

export default config({
  storage: isDev
    ? { kind: 'local' }
    : {
        kind: 'github',
        repo: { owner: 'san-ren', name: 'my-nav' },
      },
  cloud: { project: 'astro-nav/my-nav' },
  ui: {
    brand: { name: 'MyNav 管理后台' },
    navigation: {
      '核心数据': ['groups', 'pages'], 
      '内容创作': ['guides', 'changelog'],
      '全局设置': ['siteSettings'],
    },
  },
  singletons: {
    siteSettings: singleton({
      label: '⚙️ 网站配置',
      path: 'src/content/site-settings/config',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: '网站标题' }),
        description: fields.text({ label: '网站描述', multiline: true }),
        author: fields.text({ label: '页脚作者' }),
        githubUser: fields.text({ label: 'GitHub 用户名' }),
        githubRepo: fields.text({ label: 'GitHub 仓库名' }),
      },
    }),
  },
  collections: {
    pages: collection({
      label: '页面元数据',
      slugField: 'id',
      path: 'src/content/nav-pages/*',
      format: { data: 'json' },
      columns: ['name', 'sortOrder'],
      schema: {
        name: fields.text({ label: '页面名称' }),
        id: fields.text({ label: '页面ID', validation: { length: { min: 1 } } }),
        icon: fields.text({ label: '图标' }),
        sortOrder: fields.integer({ label: '权重', defaultValue: 10 }),
      },
    }),
    groups: collection({
      label: '内容分组',
      slugField: 'id',
      path: 'src/content/nav-groups/*',
      format: { data: 'json' },
      columns: ['visualTag', 'name', 'pageName'],
      schema: {
        pageName: fields.relationship({ 
          label: '📄 所属页面', 
          collection: 'pages', 
          validation: { isRequired: true },
          description: '选择该分组归属于哪个页面'
        }),
        visualTag: fields.select({
          label: '👀 视觉标记',
          description: '用于在后台列表中快速区分属于不同大类的分组',
          options: VISUAL_TAGS,
          defaultValue: ' ',
        }),
        name: fields.text({ label: '📝 分组名称', validation: { isRequired: true } }),
        pageConfig: fields.object(
          {
            sortPrefix: fields.select({
              label: '🔢 排序权重', 
              options: ['01','02','03','04','05','06','07','08','09','10','11','12'].map(v => ({ label: v, value: v })),
              defaultValue: '10',
            }),
          },
          { label: '⚙️ 分组配置', description: '设置分组在页面内的排序顺序' }
        ),
        id: fields.text({ label: '🆔 系统ID', validation: { length: { min: 1 } } }),
        resources: fields.array(
          fields.object(resourceFields),
          { label: '📚 分组直属资源', itemLabel: (props) => getStatusEmoji(props.fields.status.value) + (props.fields.name.value || '未命名资源') }
        ),
        categories: fields.array(
          fields.object({
            name: fields.text({ label: '分类名称' }),
            resources: fields.array(
              fields.object(resourceFields),
              { label: '📚 直属资源列表', itemLabel: (props) => getStatusEmoji(props.fields.status.value) + (props.fields.name.value || '未命名资源') }
            ),
            tabs: fields.array(
              fields.object({
                tabName: fields.text({ label: '标签页名称' }),
                list: fields.array(
                  fields.object(resourceFields),
                  { label: '资源列表', itemLabel: (props) => getStatusEmoji(props.fields.status.value) + (props.fields.name.value || '资源') }
                )
              }),
              { label: '🗂️ 标签页', itemLabel: (props) => props.fields.tabName.value || '标签页' }
            )
          }),
          { label: '📑 分类列表', itemLabel: (props) => props.fields.name.value || '未命名分类' }
        ),
      },
    }),
    guides: collection({
      label: '教程文章',
      slugField: 'title',
      path: 'src/content/guides/*',
      format: { contentField: 'body' },
      columns: ['title', 'status', 'date'],
      schema: {
        title: fields.text({ label: '标题' }),
        status: fields.select({
          label: '状态',
          options: [{ label: '已发布', value: 'published' }, { label: '草稿', value: 'draft' }],
          defaultValue: 'draft'
        }),
        date: fields.date({ label: '日期', defaultValue: { kind: 'today' } }),
        cover: fields.image({ label: '封面', directory: 'public/images/guides/covers', publicPath: '/images/guides/covers/' }),
        body: fields.mdx({
          label: '正文 (MDX)',
          options: { ...commonMdxOptions, image: { directory: 'public/images/guides', publicPath: '/images/guides/' } },
          components: mdxBlocks, 
        })
      }
    }),
    changelog: collection({
      label: '更新记录',
      slugField: 'version',
      path: 'src/content/changelog/*',
      format: { contentField: 'content' },
      columns: ['version', 'type','status', 'date'],
      schema: {
        version: fields.text({ label: '版本号', validation: { length: { min: 1 } } }),
        type: fields.select({
          label: '更新类型',
          options: [
            { label: '🚀 功能更新', value: 'function' },
            { label: '📚 内容更新', value: 'content' },
          ],
          defaultValue: 'function', 
        }),
        date: fields.date({ label: '发布日期', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        status: fields.select({
          label: '发布状态',
          options: [
            { label: '✅ 已发布', value: 'published' },
            { label: '📝 草稿 (不显示)', value: 'draft' }
          ],
          defaultValue: 'published'
        }),
        content: fields.mdx({
          label: '更新详情 (MDX源码)',
          options: { ...commonMdxOptions, image: { directory: 'public/images/changelog', publicPath: '/images/changelog/' } },
          components: mdxBlocks,
        }),
      },
    }),
  },
});
