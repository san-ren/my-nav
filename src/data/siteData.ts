export const siteConfig = {
  title: "我的终极导航",
  description: "基于 Astro 构建的下一代导航站",
  author: "San Ren",
  githubUser: "san-ren",
  githubRepo: "WWW_NAV",
};

// 这里的结构变了：最外层是“页面”，里面包含“分类”
export const navResources = [
  {
    id: "home", // 这一组的路由路径，比如 /home (首页)
    name: "常用推荐", // 侧边栏显示的名称
    icon: "Star", // 侧边栏图标
    categories: [ // 这里面是原来那样的分类列表
      {
        name: "热门工具",
        icon: "Hammer",
        list: [
          { name: "Google", url: "https://google.com", desc: "全球最大搜索" },
          { name: "ChatGPT", url: "https://chat.openai.com", desc: "AI 助手" },
        ]
      },
      {
        name: "每日必看",
        icon: "Flame",
        list: [
          { name: "GitHub", url: "https://github.com", desc: "开源社区" },
          { name: "Bilibili", url: "https://bilibili.com", desc: "视频网站" },
        ]
      }
    ]
  },
  {
    id: "dev", // 访问路径：/dev
    name: "开发专区",
    icon: "Code",
    categories: [
      {
        name: "前端框架",
        icon: "Layout",
        list: [
          { name: "React", url: "https://react.dev", desc: "前端库" },
          { name: "Astro", url: "https://astro.build", desc: "静态站框架" },
          { name: "Tailwind", url: "https://tailwindcss.com", desc: "CSS 框架" },
        ]
      },
      {
        name: "后端服务",
        icon: "Server",
        list: [
          { name: "Vercel", url: "https://vercel.com", desc: "部署平台" },
          { name: "Supabase", url: "https://supabase.com", desc: "开源 Firebase" },
        ]
      }
    ]
  },
  {
    id: "design", // 访问路径：/design
    name: "设计资源",
    icon: "Palette",
    categories: [
      {
        name: "灵感采集",
        icon: "Image",
        list: [
          { name: "Pinterest", url: "https://pinterest.com", desc: "灵感图库" },
          { name: "Dribbble", url: "https://dribbble.com", desc: "设计社区" },
        ]
      }
    ]
  }
];

export const friendLinks = [
  { name: "Astro", url: "https://astro.build", desc: "新一代静态站框架" },
];