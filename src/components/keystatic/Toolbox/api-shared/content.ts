/**
 * nav-groups 内容目录读写（仅服务端路由使用）
 *
 * 原先 4 个工具的 api/utils 里各自重复「path.join(process.cwd(), CONFIG.contentDir)
 * → readdirSync → readFileSync → JSON.parse」样板，统一收敛到这里。
 * ⚠️ 本模块含 node:fs，禁止被客户端组件（index.tsx / styles.ts）引用。
 */
import fs from 'node:fs';
import path from 'node:path';

/** 内容目录（相对仓库根） */
export const CONTENT_DIR = 'src/content/nav-groups';

/** 内容目录绝对路径 */
export function contentDirPath(): string {
  return path.join(process.cwd(), CONTENT_DIR);
}

/** 内容文件绝对路径 */
export function contentFilePath(file: string): string {
  return path.join(contentDirPath(), file);
}

/** 内容文件是否存在 */
export function contentFileExists(file: string): boolean {
  return fs.existsSync(contentFilePath(file));
}

export interface ContentFile<T = any> {
  /** 文件名（含 .json） */
  file: string;
  /** 解析后的 JSON */
  data: T;
}

/**
 * 遍历内容目录下所有 JSON 文件并解析。
 * - 目录不存在 → 返回空数组（与原各实现的提前返回一致）
 * - 单个文件解析失败 → 跳过并打日志
 */
export function readContentFiles<T = any>(logPrefix = '[Toolbox]'): ContentFile<T>[] {
  const dir = contentDirPath();
  if (!fs.existsSync(dir)) return [];

  const result: ContentFile<T>[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')) as T;
      result.push({ file, data });
    } catch (e) {
      console.error(`${logPrefix} 解析文件失败: ${file}`, e);
    }
  }
  return result;
}

/** 读取单个内容 JSON；读取或解析失败时抛错，由调用方的 try/catch 处理（保持原有报错语义） */
export function readContentFile<T = any>(file: string): T {
  return JSON.parse(fs.readFileSync(contentFilePath(file), 'utf-8')) as T;
}

/** 写回内容 JSON（2 空格缩进，与 Keystatic 的落盘格式一致） */
export function writeContentFile(file: string, data: unknown): void {
  fs.writeFileSync(contentFilePath(file), JSON.stringify(data, null, 2), 'utf-8');
}
