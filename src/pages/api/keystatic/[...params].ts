import { makeHandler } from '@keystatic/astro/api';
import keystaticConfig from '../../../../keystatic.config';

export const prerender = false;

// 确保使用大写的 ALL
export const ALL = makeHandler({
  config: keystaticConfig,
});

