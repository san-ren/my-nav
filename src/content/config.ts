import { defineCollection, z } from 'astro:content';

const guidesCollection = defineCollection({
  type: 'content', // 这是一个基于文件的集合
  schema: z.object({
    title: z.string(),
    date: z.date().optional(),
    // 你可以在这里加更多字段，比如 coverImage
  }),
});

export const collections = {
  'guides': guidesCollection,
};