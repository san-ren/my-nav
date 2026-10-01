// src/components/keystatic/smart-parse.ts
// 智能解析 API 入口（仅开发环境注入 /api/smart-parse）
// 具体实现拆分在 ./parse/ 下：config（配置/缓存）、fetch（抓取）、icons（图标本地化）、handlers（站点处理器）
import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '../Toolbox/api-shared/response';
import { getLocalIcons } from './parse/icons';
import { handleGithub, handleGooglePlay, handleWebPage } from './parse/handlers';

// 强制动态模式
export const prerender = false;

// --- API 入口 ---
export const GET: APIRoute = async ({ request, url }) => {
  try {
    let urlParam = url.searchParams.get('url');
    const mode = url.searchParams.get('mode');

    if (!urlParam && !mode) {
      const rawUrl = new URL(request.url, `http://${request.headers.get('host') || 'localhost'}`);
      urlParam = rawUrl.searchParams.get('url');
    }

    if (mode === 'list_icons') {
      return jsonResponse(getLocalIcons());
    }

    if (!urlParam) {
      return errorResponse('缺少 URL 参数');
    }

    let targetUrlStr = urlParam.trim();
    if (!targetUrlStr.match(/^https?:\/\//i)) {
      targetUrlStr = 'https://' + targetUrlStr;
    }

    let targetUrlObj: URL;
    try {
      targetUrlObj = new URL(targetUrlStr);
    } catch (e) {
      return errorResponse('无效的 URL 格式');
    }

    const isGithub = targetUrlObj.hostname === 'github.com';
    const isGooglePlay = targetUrlObj.hostname === 'play.google.com' && targetUrlObj.pathname.includes('/store/apps/details');

    let result;

    if (isGithub) {
      const match = targetUrlObj.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
      if (match) {
        try {
          result = await handleGithub(match[1], match[2]);
        } catch (e: any) {
          if (e.message === 'Github404') {
            return errorResponse('GitHub 仓库不存在', 404);
          }
          console.warn(`[SmartParse] GitHub API 失败 (${e}), 降级为网页抓取`);
          result = await handleWebPage(targetUrlObj);
        }
      } else {
        result = await handleWebPage(targetUrlObj);
      }
    } else if (isGooglePlay) {
      // 处理 Google Play Store
      const gpResult = await handleGooglePlay(targetUrlObj);
      if (gpResult) {
        result = gpResult;
      } else {
        result = await handleWebPage(targetUrlObj);
      }
    } else {
      result = await handleWebPage(targetUrlObj);
    }

    return jsonResponse(result);

  } catch (error: any) {
    console.error('[SmartParse] Server Error:', error);
    return errorResponse(error.message || '内部处理错误', 500);
  }
};
