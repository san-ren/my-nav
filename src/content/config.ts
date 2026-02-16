import { defineCollection, reference, z } from 'astro:content';

// 资源结构
const resourceItemSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  official_site: z.string().optional(),
  desc: z.string().optional(),
  icon: z.string().optional(),
  guide_id: z.string().optional(),
  badge_list: z.array(z.string()).optional(),
  // Keystatic fields.document 生成的是 JSON 结构，这里使用 z.any() 是安全的
  detail: z.any().optional(),
  // 资源状态: ok(正常) | stale(长期未更新) | failed(已失效)
  status: z.enum(['ok', 'stale', 'failed']).default('ok'),
});

// 1. 页面
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
    
    // ✅ 对应 Keystatic 的 fields.relationship
    pageName: reference('nav-pages'),
    
    // ✅ 对应 Keystatic 的 fields.object
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

// 3. 教程文章
const guides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(),
    date: z.date().optional().default(() => new Date()),
    status: z.enum(['draft', 'published']).default('published'),
    // ✅ 关键点：由于 Keystatic 设置了 publicPath，它会存储字符串路径。
    // 如果这里使用 Astro 的 image() 验证器，会因为找不到相对路径下的文件而报错。
    // 所以此处必须保持 z.string()。
    cover: z.string().optional(),
    relatedResource: reference('nav-groups').optional(),
  }),
});

// 4. 网站设置
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

// 5. 更新日志
const changelog = defineCollection({
  type: 'content',
  schema: z.object({
    version: z.union([z.string(), z.number()]).optional().transform((v) => v ? String(v) : undefined),
    type: z.enum(['function', 'content']).default('content'),
    status: z.enum(['published', 'draft']).optional().default('published'),
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
