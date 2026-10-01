// GithubChecker 类型定义

export const CONFIG = {
  timeout: 15000,
  githubToken: typeof import.meta !== 'undefined' ? (import.meta.env.GITHUB_TOKEN || '') : '',
};

export interface GitHubRepoInfo {
  url: string;
  owner: string;
  repo: string;
  source: string;
  path: string[];
}

export interface CheckResult {
  url: string;
  owner: string;
  repo: string;
  exists: boolean;
  archived: boolean;
  pushedAt: string | null;
  staleYears: number | null;
  status: 'ok' | 'stale' | 'github已归档' | 'github仓库已失效';
  error?: string;
}

export interface ScanResult {
  total: number;
  unique: number;
  repos: GitHubRepoInfo[];
}

// 状态更新结构由服务端公共库统一定义（纯类型，无运行时依赖）
export type { StatusUpdate } from '../api-shared/types';
