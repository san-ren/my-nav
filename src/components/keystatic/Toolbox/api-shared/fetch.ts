/**
 * Toolbox API 的安全请求工具（仅服务端路由使用）
 *
 * 收敛了原先三份各自实现的 safeFetch：
 *   - LinkChecker/api/utils.ts（HEAD 探活，返回 { ok, status }）
 *   - GithubChecker/api/utils.ts（GET，返回 Response）
 *   - ToolboxField/smart-parse.ts（GET，返回 Response）
 * 统一为「超时自动中断，失败/超时返回 null 不抛错」。
 */

const DEFAULT_USER_AGENT = 'MyNav-Bot/1.0';

export interface SafeFetchOptions {
  /** 超时毫秒数，默认 15000 */
  timeout?: number;
  /** 请求方法，默认 GET */
  method?: string;
  /** 附加请求头，同名时覆盖默认值（例如自定义 User-Agent） */
  headers?: Record<string, string>;
  /** 重定向策略，默认 follow */
  redirect?: RequestRedirect;
}

/** 发起请求；超时或被中断时返回 null */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response | null> {
  const { timeout = 15000, method = 'GET', headers = {}, redirect = 'follow' } = options;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      method,
      redirect,
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        ...headers,
      },
    });

    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}
