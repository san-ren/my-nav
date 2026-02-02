import React from 'react';
import { makePage } from '@keystatic/astro/ui';
// 请确保 ../../../keystatic.config 指向正确的文件
import config from '../../keystatic.config';

// ✅ 使用默认导出，这是最不容易出错的方式
export default makePage(config);