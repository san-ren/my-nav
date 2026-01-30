import { defineCollection, reference, z } from 'astro:content';

// 资源结构（保持不变）
const resourceItemSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  official_site: z.string().optional(),
  desc: z.string().optional(),
  icon: z.string().optional(),
  guide_id: z.string().optional(),
  badge_list: z.array(z.string()).optional(),
  detail: z.any().optional(),
});

// 1. 页面 (保持不变)
const pages = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    id: z.string(),
    icon: z.string().optional(),
    sortOrder: z.number().default(10),
  }),
});

// 2. 分组 - 适配新的扁平化结构 + 配置对象
const groups = defineCollection({
  type: 'data',
  schema: z.object({
    visualTag: z.string().optional(),
    name: z.string(),
    
    // ✅ 修改 1：pageName 现在是直接引用（字符串），对应 JSON 中的顶层字段
    pageName: reference('nav-pages'),
    
    // ✅ 修改 2：新增 pageConfig 对象，用于存放排序等配置
    pageConfig: z.object({
      sortPrefix: z.string().default('10'), 
    }).optional(),
    
    resources: z.array(resourceItemSchema).default([]),
    
    // 嵌套结构
    categories: z.array(
      z.object({
        name: z.string(),
        resources: z.array(resourceItemSchema).default([]),
        
        tabs: z.array(
          z.object({
            tabName: z.string(),
            list: z.array(resourceItemSchema).default([]) 
          })
        ).optional().default([])
      })
    ).default([]),
    
    // id 是 slugField
    id: z.string().optional(),
  }),
});

// 3. 教程文章 (保持不变)
const guides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(),
    date: z.date().optional().default(() => new Date()),
    status: z.enum(['draft', 'published']).default('published'),
    cover: z.string().optional(),
    relatedResource: reference('nav-groups').optional(),
  }),
});

// 4. 网站设置 (保持不变)
const siteSettings = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    author: z.string().optional(),
    githubUser: z.string().optional(),
    githubRepo: z.string().optional(),
  }),
});

// 5. 更新日志 (保持不变)
const changelog = defineCollection({
  type: 'content',
  schema: z.object({
    version: z.union([z.string(), z.number()]).optional().transform((v) => v ? String(v) : undefined),
    type: z.enum(['function', 'content']).default('content'),
    date: z.date().or(z.string().transform((str) => new Date(str))),
  }),
});

export const collections = {
  'nav-pages': pages,
  'nav-groups': groups,
  'guides': guides,
  'site-settings': siteSettings,
  'changelog': changelog,
};