import { config, fields, collection, singleton, component } from '@keystatic/core';
import React from 'react';


 

const VISUAL_TAGS = [
  { label: '🏠 首页/概览 (Home)', value: '🏠' },
  { label: '🛠️ 系统/工具 (Tools)', value: '🛠️' },
  { label: '🎨 设计/美化 (Design)', value: '🎨' },
  { label: '📺 影音/娱乐 (Media)', value: '📺' },
  { label: '📚 文档/阅读 (Docs)', value: '📚' },
  { label: '⚡ 效率/生产力 (Productivity)', value: '⚡' },
  { label: '☁️ 网络/云端 (Net)', value: '☁️' },
  { label: '🤖 开发/AI (Dev)', value: '🤖' },
  { label: '⚪ 无标签', value: ' ' }
];

// --- Block Components ---
const containerSchema = {
  type: fields.select({
    label: '容器类型',
    options: [
      { label: 'ℹ️ Note', value: 'note' },
      { label: '💡 Tip', value: 'tip' },
      { label: '💬 Important', value: 'important' },
      { label: '⚠️ Warning', value: 'warning' },
      { label: '🔥 Danger', value: 'danger' },
      { label: '🔽 Details', value: 'details' },
    ],
    defaultValue: 'note',
  }),
  title: fields.text({ label: '标题 (可选)' }),
  open: fields.checkbox({ label: '默认展开', defaultValue: false }),
  content: fields.child({ kind: 'block', placeholder: '在此输入内容...' }),
};

const ContainerPreview = (props: any) => {
  const type = props.fields.type.value;
  const title = props.fields.title.value || (type === 'details' ? 'Details' : type.toUpperCase());
  const styles: any = {
    note: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' },
    tip: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', icon: '💡' },
    important: { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8', icon: '💬' },
    warning: { bg: '#fefce8', border: '#eab308', text: '#854d0e', icon: '⚠️' },
    danger: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '🔥' },
    details: { bg: '#f8fafc', border: '#cbd5e1', text: '#334155', icon: '▶' },
  };
  const style = styles[type] || styles.note;

  if (type === 'details') {
    return (
      <div style={{ padding: '10px', background: style.bg, border: `1px solid ${style.border}`, borderRadius: '6px', margin: '1em 0' }}>
         <div style={{ fontWeight: 'bold', display: 'flex', gap: '8px', color: style.text, alignItems: 'center' }}>
            <span style={{ transform: props.fields.open.value ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>▶</span> 
            {title}
         </div>
         <div style={{ marginTop: '8px', paddingLeft: '18px' }}>{props.fields.content.element}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', background: style.bg, borderLeft: `4px solid ${style.border}`, borderRadius: '4px', margin: '1em 0' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: style.text, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>{style.icon}</span>
        {title}
      </div>
      <div>{props.fields.content.element}</div>
    </div>
  );
};

const documentBlocks = {
  container: component({
    label: '🧰 通用容器 / 提示框',
    schema: containerSchema,
    preview: ContainerPreview,
  }),
};

const mdxBlocks: any = {
  container: component({
    label: '🧰 通用容器 / 提示框',
    schema: containerSchema,
    preview: ContainerPreview,
    icon: <span style={{fontSize: '20px'}}>🧰</span>, 
  } as any),
};

const commonMdxOptions = {
  bold: true,
  italic: true,
  strikethrough: true,
  code: true,
  heading: [2, 3, 4, 5, 6] as const,
};

// --- Reusable Fields ---
const resourceFields = {
  name: fields.text({ label: '名称' }),
  url: fields.url({ label: '项目链接', validation: { isRequired: false } }),
  official_site: fields.url({ label: '官网地址', validation: { isRequired: false } }),
  desc: fields.text({ label: '描述', multiline: true }),
  guide_id: fields.text({ label: '关联教程ID' }),
  badge_list: fields.multiselect({
    label: '徽章',
    options: [
      { label: 'Stars', value: 'stars' },
      { label: 'Version', value: 'version' },
      { label: 'Last Commit', value: 'last_commit' },
      { label: 'License', value: 'license' },
      { label: 'Forks', value: 'forks' },
    ],
  }),
  icon: fields.text({ label: '图标' }),
  
  detail: fields.document({
    label: '详细介绍',
    formatting: true,
    dividers: true,
    links: true,
    images: true,
    tables: true,
    layouts: [[1, 1], [1, 2]],
    componentBlocks: documentBlocks, 
  }),
};

 

export default config({
  // 2. 根据环境切换 storage 模式
  // 本地开发 (Dev) -> 使用 'local' (本地文件系统)
  // 线上生产 (Prod) -> 使用 'cloud' 或 'github'
  // ✅ 强制写死：无论本地还是线上，都先用 GitHub 模式测试
  // 这样能确保绝对不会去请求 /api 接口，彻底根除 405 错误
  storage: {
    kind: 'github',
    repo: 'san-ren/my-nav', // 你的 GitHub 仓库
  },

  cloud: {
    project: 'astro-nav/my-nav', // 你的 Keystatic Cloud 项目名 (保持截图里的一致)
  },
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
      label: '页面元数据 (Pages)',
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
      label: '内容分组 (Groups)',
      slugField: 'id',
      path: 'src/content/nav-groups/*',
      format: { data: 'json' },
      columns: ['visualTag', 'name', 'pageName'],
      
      schema: {
        visualTag: fields.select({
          label: '👀 视觉标记',
          description: '用于在后台列表中快速区分属于不同大类的分组',
          options: VISUAL_TAGS,
          defaultValue: ' ',
        }),
        
        name: fields.text({ 
          label: '📝 分组名称',
          validation: { isRequired: true }
        }),
        
        // 2. 顶层关联字段：pageName
        pageName: fields.relationship({ 
          label: '📄 所属页面', 
          collection: 'pages', 
          validation: { isRequired: true },
          description: '选择该分组归属于哪个页面'
        }),

        // 3. 配置对象：pageConfig
        pageConfig: fields.object(
          {
            sortPrefix: fields.select({
              label: '🔢 排序权重', 
              options: ['01','02','03','04','05','06','07','08','09','10','11','12']
                .map(v => ({ label: v, value: v })),
              defaultValue: '10',
            }),
          },
          { 
            label: '⚙️ 分组配置',
            description: '设置分组在页面内的排序顺序' 
          }
        ),
        
        resources: fields.array(
          fields.object(resourceFields),
          { 
            label: '📚 分组直属资源', 
            itemLabel: (props) => props.fields.name.value || '未命名资源' 
          }
        ),

        categories: fields.array(
          fields.object({
            name: fields.text({ label: '分类名称' }),
            resources: fields.array(
              fields.object(resourceFields),
              { label: '📚 直属资源列表', itemLabel: (props) => props.fields.name.value || '未命名资源' }
            ),
            tabs: fields.array(
              fields.object({
                tabName: fields.text({ label: '标签页名称' }),
                list: fields.array(
                  fields.object(resourceFields),
                  { label: '资源列表', itemLabel: (props) => props.fields.name.value || '资源' }
                )
              }),
              { label: '🗂️ 标签页 (Tabs)', itemLabel: (props) => props.fields.tabName.value || '标签页' }
            )
          }),
          { label: '📑 分类列表 (Categories)', itemLabel: (props) => props.fields.name.value || '未命名分类' }
        ),

        id: fields.text({ 
          label: '🆔 系统ID', 
          validation: { length: { min: 1 } }
        }),
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
            // 🔥 注意：这里设置了 Public Path，Keystatic 会在 Markdown 中仅存储文件名
            // 对应的 Astro Content Config 必须使用 z.string() 而非 z.image()
            cover: fields.image({ label: '封面', directory: 'public/images/guides/covers', publicPath: '/images/guides/covers/' }),
            
            body: fields.mdx({
                label: '正文 (MDX)',
                options: {
                    ...commonMdxOptions, 
                    image: {
                        directory: 'public/images/guides',
                        publicPath: '/images/guides/',
                    },
                }, 
                components: mdxBlocks, 
            })
        }
    }),

    changelog: collection({
      label: '更新记录',
      slugField: 'version',
      path: 'src/content/changelog/*',
      format: { contentField: 'content' },
      columns: ['version', 'type', 'date'],
      schema: {
        version: fields.text({ 
          label: '记录名称', 
          validation: { length: { min: 1 } } 
        }),
        type: fields.select({
          label: '更新类型',
          options: [
            { label: '🚀 功能更新', value: 'function' },
            { label: '📚 内容更新', value: 'content' },
          ],
          defaultValue: 'content', 
        }),
        date: fields.date({ 
          label: '发布日期', 
          defaultValue: { kind: 'today' },
          validation: { isRequired: true }
        }),
        
        content: fields.mdx({
          label: '更新详情 (MDX源码)',
          options: {
            ...commonMdxOptions, 
            image: { 
                directory: 'public/images/changelog',
                publicPath: '/images/changelog/',
            },
          },
          components: mdxBlocks,
        }),
      },
    }),
  },
});