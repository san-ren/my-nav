/**
 * smart-parse 的抓取请求
 * 超时中断逻辑复用 Toolbox/api-shared/fetch，这里只补本模块特有的随机 UA 与 HTML Accept（反爬）
 */
import { safeFetch as sharedSafeFetch } from '../../Toolbox/api-shared/fetch';
import { CONFIG, getRandomUA } from './config';

export function safeFetch(url: string, options: { headers?: Record<string, string> } = {}): Promise<Response | null> {
  return sharedSafeFetch(url, {
    timeout: CONFIG.timeout,
    headers: {
      'User-Agent': getRandomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      ...options.headers,
    },
  });
}
