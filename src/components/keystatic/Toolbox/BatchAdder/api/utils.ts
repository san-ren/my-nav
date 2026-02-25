// BatchAdder API 工具函数
// 职责：仅实现批量操作，调用 smart-parse API 获取基础解析结果
import type { ParsedResource } from '../types';

// 基础 URL（开发环境）
const getBaseUrl = () => {
  // 在服务端，直接使用 localhost
  return 'http://localhost:4321';
};

// 调用 smart-parse API 解析单个 URL
export async function parseUrl(urlStr: string): Promise<{ success: boolean; data?: ParsedResource; error?: string }> {
  try {
    const baseUrl = getBaseUrl();
    const encodedUrl = encodeURIComponent(urlStr);
    const apiUrl = `${baseUrl}/api/smart-parse?url=${encodedUrl}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      // 尝试解析错误信息
      try {
        const errorData = await res.json();
        return { success: false, error: errorData.error || `HTTP ${res.status}` };
      } catch {
        return { success: false, error: `HTTP ${res.status}` };
      }
    }
    
    const data = await res.json();
    
    // smart-parse 返回的数据格式
    return {
      success: true,
      data: {
        title: data.title || '',
        desc: data.desc || '',
        homepage: data.homepage || urlStr,
        icon: data.icon || '',
        isGithub: data.isGithub || false,
        originalUrl: urlStr,
        url: data.homepage || urlStr,
      },
    };
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { success: false, error: '请求超时' };
    }
    return { success: false, error: e.message || '解析失败' };
  }
}

// 批量解析 URL（并行调用 smart-parse API）
export async function parseUrls(urls: string[], concurrency: number = 10): Promise<Array<{ success: boolean; data?: ParsedResource; error?: string }>> {
  const results: Array<{ success: boolean; data?: ParsedResource; error?: string }> = [];
  
  // 分批并行处理
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(url => parseUrl(url))
    );
    
    for (const settled of batchResults) {
      if (settled.status === 'fulfilled') {
        results.push(settled.value);
      } else {
        results.push({ success: false, error: settled.reason?.message || '解析失败' });
      }
    }
  }
  
  return results;
}
