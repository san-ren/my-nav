import { makePage } from '@keystatic/astro/ui';
import config from '../../../keystatic.config'; // 👈 确保这里的路径能找到你根目录下的配置文件

export const Keystatic = makePage(config);