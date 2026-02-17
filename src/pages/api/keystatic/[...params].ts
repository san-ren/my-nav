// src/pages/api/keystatic/[...params].ts
import { makeHandler } from '@keystatic/astro/api';
import keystaticConfig from '../../../../keystatic.config';

export const prerender = false; // 同样，确保 API 不被静态预构建

export const ALL = makeHandler({
  config: keystaticConfig,
});
