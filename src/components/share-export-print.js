/**
 * 「打印 / 存为 PDF」用的独立 HTML 文档生成器
 *
 * 原来内联在 ShareExportModal.jsx 里（约 215 行模板字符串），抽出来便于单独维护。
 * 打印窗口访问不到原页面的 CSS，所以样式必须全部内联；主题色从当前页面 CSS 变量读取。
 */
export function buildPrintHTML({ topTitle, groupedCards, cardCount, parseMarkdown, getIconSrc }) {
  // 获取当前主题色 RGB 值
  const brandRgb = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-brand-rgb').trim() || '79 70 229';
  const brandColor = `rgb(${brandRgb})`;
  const brandColorLight = `rgba(${brandRgb}, 0.08)`;

  // 按分组生成 HTML
  const cardsHtml = Object.entries(groupedCards).map(([label, cards]) => {
    const groupHeaderHtml = label ? `<div class="group-title">${label}</div>` : '';
    const cardsInGroupHtml = cards.map(card => {
      const detailHtml = parseMarkdown(card.detail);
      const iconSrc = getIconSrc(card);
      return `
          <div class="card">
            <div class="card-header">
              <img class="card-icon" src="${iconSrc}" alt="" onerror="this.style.display='none'" />
              <span class="card-name">${card.name || card.title || '未命名'}</span>
            </div>
            ${card.desc ? `<div class="card-desc">${card.desc}</div>` : ''}
            ${detailHtml ? `<div class="card-detail">${detailHtml}</div>` : ''}
            ${card.url ? `<div class="card-url"><a href="${card.url}" target="_blank">🔗 ${card.url}</a></div>` : ''}
          </div>
        `;
    }).join('');

    return `
        <div class="card-group">
          ${groupHeaderHtml}
          ${cardsInGroupHtml}
        </div>
      `;
  }).join('');

  // 完整 HTML 文档，内联所有样式（打印窗口无法访问原网站 CSS）
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${topTitle} - 资源推荐</title>
  <style>
    /* 基础重置 */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #fff;
      padding: 40px;
      line-height: 1.6;
    }

    /* 标题区域 */
    .header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid ${brandColorLight};
    }
    .header h1 {
      font-size: 22px;
      font-weight: 900;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header h1::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 22px;
      background: ${brandColor};
      border-radius: 2px;
      flex-shrink: 0;
    }
    .header .subtitle {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
      padding-left: 12px;
    }

    /* 卡片样式 */
    .card-group {
      margin-bottom: 24px;
    }
    .group-title {
      font-size: 14px;
      font-weight: 700;
      color: ${brandColor};
      margin-bottom: 12px;
      padding-left: 8px;
      border-left: 3px solid ${brandColor};
      display: flex;
      align-items: center;
    }
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-header {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      object-fit: contain;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 4px;
      flex-shrink: 0;
    }
    .card-name {
      font-size: 16px;
      font-weight: 800;
      color: #1e293b;
      line-height: 32px;
    }
    .card-desc {
      font-size: 13px;
      color: #64748b;
      margin: 8px 0;
      line-height: 1.5;
    }
    .card-detail {
      font-size: 12px;
      color: #475569;
      line-height: 1.7;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-top: 8px;
    }
    .card-detail p { margin-bottom: 6px; }
    .card-detail p:last-child { margin-bottom: 0; }
    .card-detail ul {
      list-style-type: disc;
      list-style-position: outside;
      padding-left: 1.5em;
      margin: 4px 0 6px;
    }
    .card-detail ol {
      list-style-type: decimal;
      list-style-position: outside;
      padding-left: 1.5em;
      margin: 4px 0 6px;
    }
    .card-detail li {
      margin-bottom: 3px;
      padding-left: 4px;
    }
    .card-detail a {
      color: ${brandColor};
      text-decoration: underline;
    }
    .card-url {
      margin-top: 8px;
      font-size: 11px;
    }
    .card-url a {
      color: ${brandColor};
      text-decoration: none;
      word-break: break-all;
    }
    .card-url a:hover { text-decoration: underline; }

    /* 底部水印 */
    .footer {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    /* 打印优化 */
    @media print {
      body { padding: 20px; }
      .card { box-shadow: none; border: 1px solid #ddd; }
      a { color: ${brandColor} !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${topTitle}</h1>
    <div class="subtitle">共 ${cardCount} 项</div>
  </div>
  ${cardsHtml}
  <div class="footer">Generated by my-nav · ${new Date().toLocaleDateString('zh-CN')}</div>
  <script>
    // 图片加载完毕后自动触发打印
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}
