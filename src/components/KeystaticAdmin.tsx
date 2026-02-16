import React from 'react';
import { makePage } from '@keystatic/astro/ui';
import config from '../../keystatic.config';

const KeystaticPage = makePage(config);

export default function KeystaticAdmin() {
  React.useEffect(() => {
    // 恢复重定向前的 URL
    const savedPath = sessionStorage.getItem('keystatic_spa_path');
    if (savedPath) {
      sessionStorage.removeItem('keystatic_spa_path');
      window.history.replaceState(null, '', savedPath);
    }
  }, []);

  return <KeystaticPage />;
}
