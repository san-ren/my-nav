/**
 * Toolbox API 的 JSON 响应工具（仅服务端路由使用）
 *
 * 原先 4 个工具的每个 API 分支都手写一遍
 * `new Response(JSON.stringify(x), { status: 200, headers: { 'Content-Type': 'application/json' } })`，
 * 全部收敛到这里。
 */

/** 构造 JSON 响应 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 构造错误响应（固定为 { error: message } 结构，与各工具前端的解析逻辑保持一致） */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
