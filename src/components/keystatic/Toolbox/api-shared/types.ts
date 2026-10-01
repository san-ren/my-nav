/**
 * Toolbox 服务端 API 公共类型
 *
 * 纯类型定义，无任何运行时依赖（不 import node:fs 等），
 * 所以可以被客户端组件所在的模块图安全引用（类型会被 esbuild 完全擦除）。
 */

/** 单条资源状态更新：source = nav-groups 下的文件名，path = 指向资源对象的路径 */
export interface StatusUpdate {
  source: string;
  path: string[];
  status: string;
}
