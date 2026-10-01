/**
 * 批量写回资源状态（仅服务端路由使用）
 *
 * LinkChecker 与 GithubChecker 的 POST 处理原先各有一份逐字相同的实现，现合并到这里。
 */
import { readContentFile, writeContentFile } from './content';
import type { StatusUpdate } from './types';

export type { StatusUpdate };

/**
 * 按文件分组后逐个「读 → 改 → 写」。
 *
 * path 的最后一段是字段名（如 url / official_site），其父对象才是要改 status 的目标。
 * 返回成功 / 失败的更新条数。
 */
export function applyStatusUpdates(
  updates: StatusUpdate[],
  logPrefix = '[Toolbox]'
): { success: number; failed: number } {
  const fileUpdates = new Map<string, StatusUpdate[]>();

  for (const update of updates) {
    if (!fileUpdates.has(update.source)) {
      fileUpdates.set(update.source, []);
    }
    fileUpdates.get(update.source)!.push(update);
  }

  let success = 0;
  let failed = 0;

  for (const [file, fileUpdateList] of fileUpdates) {
    try {
      const json = readContentFile<any>(file);

      for (const update of fileUpdateList) {
        let target: any = json;
        for (let i = 0; i < update.path.length - 1; i++) {
          const key = update.path[i];
          if (key.startsWith('[') && key.endsWith(']')) {
            target = target[parseInt(key.slice(1, -1))];
          } else {
            target = target[key];
          }
        }
        if (target && typeof target === 'object') {
          target.status = update.status;
          success++;
        }
      }

      writeContentFile(file, json);
    } catch (e) {
      console.error(`${logPrefix} 更新文件失败: ${file}`, e);
      failed++;
    }
  }

  return { success, failed };
}
