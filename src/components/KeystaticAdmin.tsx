import React from 'react';
// 1. 抓取所有导出内容
import * as KeystaticUI from '@keystatic/astro/ui';

export default function KeystaticAdmin() {
  // 2. 暴力兼容：无论它是具名导出、默认导出还是混合导出，都尝试获取
  // 使用 (KeystaticUI as any) 绕过 TypeScript 检查
  const Component = (KeystaticUI as any).Keystatic || (KeystaticUI as any).default || KeystaticUI;

  // 3. 渲染找到的组件
  return <Component />;
}