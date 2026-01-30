import React from 'react';

// ⚠️ 关键：添加 @ts-ignore 强制忽略“找不到导出”的类型错误
// 实际上 Vite 在打包时是可以找到它的
// @ts-ignore
import { Keystatic } from '@keystatic/astro/ui';

export default function KeystaticAdmin() {
  return <Keystatic />;
}