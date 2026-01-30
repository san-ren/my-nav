import React from 'react';

// 图标 SVG 字符串映射
const getIcon = (type: string) => {
  const icons: any = {
    note: `<svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`,
    tip: `<svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.214c-.04-.282-.163-.547-.37-.847-.209-.301-.471-.606-.733-.918-.08-.096-.151-.192-.215-.275C2.008 6.504 1.5 5.58 1.5 4.25 1.5 2.01 3.26 0 6.5 0 8.825 0 11 1.253 11 3.25c0 .736-.206 1.343-.532 1.838-.309.47-.733.82-1.077 1.106a23.97 23.97 0 0 1-1.013.79c-.272.203-.545.408-.813.626a.75.75 0 1 1-.95-1.16c.162-.132.32-.26.476-.388.307-.253.6-.5.857-.715.244-.204.498-.456.702-.767.221-.336.35-.742.35-1.23 0-1.28-1.32-2.35-3.5-2.35Z"/><path d="M6.5 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg>`,
    warning: `<svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`,
    danger: `<svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M9.504.43a1.516 1.516 0 0 1 2.437 1.713L10.415 5.5h2.123c1.57 0 2.346 1.909 1.22 3.004l-7.34 7.142a1.249 1.249 0 0 1-2.372-1.59l1.9-5.557H3.823c-1.57 0-2.346-1.909-1.22-3.004L9.503.429Zm1.047 1.074L3.286 8.571A.25.25 0 0 0 3.823 9h3.626a1.25 1.25 0 0 1 1.176 1.638l-1.33 3.89 6.241-6.073a.25.25 0 0 0-.179-.429h-3.64a1.25 1.25 0 0 1-1.163-1.66l1.346-3.843Z"/></svg>`,
    important: `<svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`,
    details: null
  };
  return icons[type] || icons.note;
}

export const ContainerBlock = ({ children, type, title, open }: any) => {
  const normalizedType = type?.toLowerCase() === 'info' ? 'note' : type?.toLowerCase() || 'note';
  
  const styles: any = {
    note: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200',
    tip: 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200',
    danger: 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200',
    important: 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200',
    details: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  };

  const style = styles[normalizedType];
  const displayTitle = title || (normalizedType === 'details' ? 'Details' : normalizedType.toUpperCase());

  if (normalizedType === 'details') {
    return (
      <details className={`group my-4 rounded-lg border px-4 py-3 shadow-sm ${style}`} open={open}>
        <summary className="flex cursor-pointer items-center gap-2 font-bold select-none list-none outline-none">
           <span className="transition-transform duration-200 group-open:rotate-90 text-sm opacity-70">▶</span>
           <span>{displayTitle}</span>
        </summary>
        <div className="mt-2 prose-sm opacity-90 prose-p:my-2 prose-a:font-bold max-w-none">{children}</div>
      </details>
    );
  }

  return (
    <div className={`my-4 rounded-md border-l-4 p-4 shadow-sm ${style}`}>
      <div className="flex items-center gap-2 font-semibold mb-2 select-none text-sm uppercase tracking-wide opacity-90">
         <span className="inline-flex items-center justify-center" dangerouslySetInnerHTML={{__html: getIcon(normalizedType)}} />
         <span>{displayTitle}</span>
      </div>
      <div className="prose-sm opacity-90 prose-p:my-1 prose-a:font-bold max-w-none text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </div>
  );
};