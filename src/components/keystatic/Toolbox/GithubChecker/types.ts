// GithubChecker 类型定义

export const CONFIG = {
  timeout: 15000,
  contentDir: 'src/content/nav-groups',
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
  status: 'ok' | 'stale' | 'archived' | 'failed';
  error?: string;
}

export interface ScanResult {
  total: number;
  unique: number;
  repos: GitHubRepoInfo[];
}

export interface StatusUpdate {
  source: string;
  path: string[];
  status: string;
}
