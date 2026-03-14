/**
 * ShareExportModal.jsx
 * 分享导出模态框 - 选择卡片并导出为精美图片/PDF
 * 
 * 使用方式：
 * 1. 在页面中挂载 <ShareExportModal client:idle />
 * 2. 通过 window.dispatchEvent(new CustomEvent('open-share-modal', { detail: { cards, title } })) 触发
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Image, FileText, Share2, CheckSquare, Square, Layers, ChevronRight, Copy } from 'lucide-react';
import { marked } from 'marked';

// ============================================
// 主模态框组件
// ============================================
export default function ShareExportModal() {
  // 模态框状态
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  // 卡片数据及选择状态
  const [treeData, setTreeData] = useState([]);
  const [flatCards, setFlatCards] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set()); // now stores _flatIndex
  // 导出状态
  const [exporting, setExporting] = useState(false);
  // 复制成功提示状态
  const [copySuccess, setCopySuccess] = useState(false);

  // 预览容器引用 - 用于 html2canvas 截图
  const renderRef = useRef(null);

  // 获取 base URL（与项目一致）
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL || '/').replace(/\/$/, '');

  // ---- 打开/关闭模态框 ----
  const openModal = useCallback((treeParams, shareTitle, activeId) => {
    let currentIndex = 0;
    const cards = [];

    // Process tree and mutate to inject _flatIndex
    const traverse = (nodes, parentLabels) => {
      const allIndices = [];
      nodes.forEach(node => {
        if (node.type === 'card') {
          node.data._flatIndex = currentIndex++;
          node.data._groupLabel = parentLabels.join(' · ');
          // 存储分组路径数组，用于后续计算最长公共前缀
          node.data._groupLabelParts = [...parentLabels];
          cards.push(node.data);
          node._descendantIndices = [node.data._flatIndex];
          allIndices.push(node.data._flatIndex);
        } else {
          const childIndices = traverse(node.children || [], [...parentLabels, node.name]);
          node._descendantIndices = childIndices;
          allIndices.push(...childIndices);
        }
      });
      return allIndices;
    };
    traverse(treeParams || [], []);

    setTreeData(treeParams || []);
    setFlatCards(cards);
    setTitle(shareTitle || '资源推荐');
    setSelectedIds(new Set(cards.map(c => c._flatIndex))); // 默认全选
    setIsOpen(true);
    setTimeout(() => setIsVisible(true), 10);

    // Auto scroll left panel and expand to activeId
    const activePath = new Set();
    const findPath = (nodes, targetId, currentPath) => {
      for (const node of nodes) {
        if (node.id === targetId) {
          currentPath.forEach(id => activePath.add(id));
          activePath.add(targetId);
          return true;
        }
        if (node.children) {
          if (findPath(node.children, targetId, [...currentPath, node.id])) {
            return true;
          }
        }
      }
      return false;
    };
    if (activeId) {
      findPath(treeParams || [], activeId, []);
    }
    // 根节点最好默认展开，增加些默认体验
    (treeParams || []).forEach(n => activePath.add(n.id));
    setExpandedNodes(activePath);

    if (activeId) {
      setTimeout(() => {
        const el = document.getElementById(`share-tree-node-${activeId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setIsOpen(false);
      setTreeData([]);
      setFlatCards([]);
      setSelectedIds(new Set());
      setExpandedNodes(new Set());
    }, 400);
  }, []);

  // ---- 监听 open-share-modal 自定义事件 ----
  useEffect(() => {
    const handleOpen = (e) => {
      // 兼容老的数据结构（如果直接传 cards）或者新的 data
      const { cards: singleCards, tree, title: t, activeId } = e.detail || {};

      let finalTree = tree;
      if (!finalTree && singleCards) {
        // 兼容单卡分享
        finalTree = [{
          id: 'single-group',
          type: 'group',
          name: t || '资源推荐',
          children: singleCards.map(c => ({ type: 'card', data: c }))
        }];
      }
      openModal(finalTree, t, activeId);
    };
    window.addEventListener('open-share-modal', handleOpen);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-share-modal', handleOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, openModal, closeModal]);

  // 打开时禁止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // ---- 卡片选择操作 ----
  const toggleNode = (node) => {
    const indices = node._descendantIndices || (node.type === 'card' ? [node.data._flatIndex] : []);
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = indices.every(i => next.has(i));
      if (allSelected) {
        indices.forEach(i => next.delete(i));
      } else {
        indices.forEach(i => next.add(i));
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(flatCards.map(c => c._flatIndex)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const isAllSelected = flatCards.length > 0 && selectedIds.size === flatCards.length;

  // 获取选中的卡片数据
  const selectedCards = flatCards.filter(c => selectedIds.has(c._flatIndex));

  // ---- 计算图标的完整路径 ----
  const getIconSrc = (card) => {
    const icon = card.icon;
    if (icon && icon.includes('/images/')) {
      return `${base}${icon}`;
    }
    return `${base}/favicon.svg`;
  };

  // ---- 解析 Markdown 为 HTML ----
  const parseMarkdown = (text) => {
    if (!text || !text.trim()) return '';
    return marked.parse(text);
  };

  // ---- 复制 Title:URL 到剪贴板 ----
  const copyTitleUrl = async () => {
    if (selectedCards.length === 0) return;
    // 格式化每张卡片：标题、项目地址(url)、官网地址(official_site) 各占一行，缺失跳过
    const text = selectedCards.map(card => {
      const lines = [];
      lines.push(card.name || card.title || '未命名');
      if (card.url) lines.push(card.url);
      if (card.official_site) lines.push(card.official_site);
      return lines.join('\n');
    }).join('\n\n'); // 卡片之间空行隔离
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请重试');
    }
  };

  // ---- 导出为图片 (PNG) ----
  const exportAsImage = async () => {
    if (selectedCards.length === 0 || !renderRef.current) return;
    setExporting(true);
    try {
      // 动态引入 html2canvas（按需加载减少首屏体积）
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(renderRef.current, {
        scale: 2, // 高分辨率
        backgroundColor: null, // 保留渐变背景
        useCORS: true, // 允许跨域图片
        logging: false,
      });
      // 生成下载链接
      const link = document.createElement('a');
      link.download = `${title}-资源推荐.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('导出图片失败:', err);
      alert('导出图片时出现错误，请重试');
    } finally {
      setExporting(false);
    }
  };

  // ---- 生成打印用 HTML（用于原生 PDF 导出） ----
  const generatePrintHTML = () => {
    // 获取当前主题色 RGB 值
    const brandRgb = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-brand-rgb').trim() || '79 70 229';
    const brandColor = `rgb(${brandRgb})`;
    const brandColorLight = `rgba(${brandRgb}, 0.08)`;

    // 使用简化后的标题和分组数据（由于在组件内部，可以直接访问 topTitle 和 groupedCards）
    // 但为了确保在打印时数据是最新的，我们可以在这里重新获取一次，或者直接使用外层的
    const { topTitle: printTopTitle, groupedCards: printGroupedCards } = computeTitleHierarchy();

    // 按分组生成 HTML
    const cardsHtml = Object.entries(printGroupedCards).map(([label, cards]) => {
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
  <title>${printTopTitle} - 资源推荐</title>
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
    <h1>${printTopTitle}</h1>
    <div class="subtitle">共 ${selectedCards.length} 项</div>
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
  };

  // ---- 导出为原生 PDF（通过浏览器打印，生成可选文字+可点击链接的原生 PDF） ----
  const exportAsPDF = () => {
    if (selectedCards.length === 0) return;
    setExporting(true);
    try {
      const htmlContent = generatePrintHTML();
      // 在新窗口中打开打印页面
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        alert('浏览器阻止了弹窗，请允许此页面的弹窗权限后重试');
        return;
      }
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // 打印完成或取消后恢复状态
      printWindow.onafterprint = () => { setExporting(false); };
      // 兜底：3秒后恢复状态（部分浏览器不触发 onafterprint）
      setTimeout(() => setExporting(false), 3000);
    } catch (err) {
      console.error('导出PDF失败:', err);
      alert('导出PDF时出现错误，请重试');
      setExporting(false);
    }
  };

  // ---- 左侧树形渲染 ----
  const toggleExpand = (e, nodeId) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const renderTreeNode = (node, depth = 0) => {
    if (node.type === 'card') {
      const idx = node.data._flatIndex;
      const isSelected = selectedIds.has(idx);
      return (
        <div key={`card-${idx}`} className={`share-tree-item card-level ${isSelected ? 'selected' : ''}`} style={{ paddingLeft: `${depth * 20 + 24}px` }} onClick={() => toggleNode(node)}>
          <div className={`share-checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && <Check size={12} color="white" strokeWidth={3} />}
          </div>
          <div className="share-card-info">
            <div className="card-name">{node.data.name || node.data.title || '未命名'}</div>
            {node.data.desc && <div className="card-desc">{node.data.desc}</div>}
          </div>
        </div>
      );
    }

    // Structural node
    const indices = node._descendantIndices || [];
    if (indices.length === 0) return null; // Hide empty empty nodes
    const selectedCount = indices.filter(i => selectedIds.has(i)).length;
    const isAllSelected = selectedCount === indices.length;
    const isPartial = selectedCount > 0 && selectedCount < indices.length;
    const isExpanded = expandedNodes.has(node.id) || !node.id;

    return (
      <div key={node.id} id={`share-tree-node-${node.id}`} className="share-tree-group">
        <div className={`share-tree-node depth-${depth} ${isAllSelected ? 'selected' : isPartial ? 'partial' : ''}`} style={{ paddingLeft: `${depth * 20 + 12}px` }} onClick={() => toggleNode(node)}>
          <div className={`share-tree-expand ${isExpanded ? 'expanded' : ''}`} onClick={(e) => toggleExpand(e, node.id)}>
            <ChevronRight size={16} />
          </div>

          <div className={`share-checkbox ${isAllSelected ? 'checked' : isPartial ? 'partial-check' : ''}`}>
            {isAllSelected && <Check size={12} color="white" strokeWidth={3} />}
            {isPartial && <div className="partial-mark" />}
          </div>
          <div className="share-node-name">{node.name}</div>
          <div className="share-node-count">{selectedCount}/{indices.length}</div>
        </div>
        {isExpanded && (
          <div className="share-tree-children">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ---- 不渲染时返回 null ----
  if (!isOpen) return null;

  // ---- 计算选中卡片的最长公共路径前缀（LCP），用于简化标题层级 ----
  const computeTitleHierarchy = () => {
    if (selectedCards.length === 0) return { topTitle: title, groupedCards: {} };

    // 收集所有选中卡片的分组路径数组
    const allParts = selectedCards.map(c => c._groupLabelParts || []);

    // 计算最长公共前缀
    let lcpLength = 0;
    if (allParts.length > 0 && allParts[0].length > 0) {
      const first = allParts[0];
      for (let i = 0; i < first.length; i++) {
        if (allParts.every(parts => parts.length > i && parts[i] === first[i])) {
          lcpLength = i + 1;
        } else {
          break;
        }
      }
    }

    // 顶部标题 = 公共前缀部分的最后一项 (只显示当前级，不叠加上级)
    const lcpParts = allParts[0] ? allParts[0].slice(0, lcpLength) : [];
    const topTitle = lcpParts.length > 0 ? lcpParts[lcpParts.length - 1] : title;

    // 按去除公共前缀后的下一级子路径分组
    const grouped = selectedCards.reduce((acc, card) => {
      const parts = card._groupLabelParts || [];
      const remaining = parts.slice(lcpLength);
      // 分组标签仅显示当前层级名称
      const label = remaining.length > 0 ? remaining[0] : '';
      if (!acc[label]) acc[label] = [];
      acc[label].push(card);
      return acc;
    }, {});

    return { topTitle, groupedCards: grouped };
  };

  const { topTitle, groupedCards } = computeTitleHierarchy();

  return (
    <>
      {/* 背景遮罩层 */}
      <div
        className={`share-overlay ${isVisible ? 'visible' : 'hidden-anim'}`}
        onClick={closeModal}
      />

      {/* 模态框主体 */}
      <div
        className={`share-modal ${isVisible ? 'visible' : 'hidden-anim'}`}
        onClick={closeModal}
      >
        <div className="share-panel" onClick={(e) => e.stopPropagation()}>

          {/* ---- 标题栏 ---- */}
          <div className="share-header">
            <h2>
              <Share2 size={18} style={{ color: `rgb(var(--color-brand-rgb))` }} />
              分享导出
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginLeft: '4px' }}>
                {title}
              </span>
            </h2>
            <button
              onClick={closeModal}
              style={{
                padding: '6px', borderRadius: '8px', color: '#94a3b8',
                background: 'transparent', border: 'none', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(148,163,184,0.1)'; e.target.style.color = '#64748b'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#94a3b8'; }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ---- 内容区域（左右两栏） ---- */}
          <div className="share-body">

            {/* 左栏 - 卡片选择列表 */}
            <div className="share-select-panel">
              {/* 全选/取消全选 工具栏 */}
              <div className="share-select-toolbar">
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  已选 <span style={{ color: `rgb(var(--color-brand-rgb))`, fontWeight: 800 }}>{selectedIds.size}</span> / {flatCards.length}
                </span>
                <button
                  onClick={isAllSelected ? deselectAll : selectAll}
                  style={{
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    color: `rgb(var(--color-brand-rgb))`,
                    background: `rgba(var(--color-brand-rgb), 0.08)`,
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {isAllSelected ? <Square size={12} /> : <CheckSquare size={12} />}
                  {isAllSelected ? '取消全选' : '全选'}
                </button>
              </div>

              {/* 卡片树形列表 */}
              <div className="share-tree-list">
                {treeData.map(node => renderTreeNode(node, 0))}
              </div>
            </div>

            {/* 右栏 - 预览区域 */}
            <div className="share-preview-panel">
              <div className="share-preview-scroll">
                {selectedCards.length > 0 ? (
                  /* 用于 html2canvas 截图的渲染容器 */
                  <div ref={renderRef} className="share-render-container">
                    {/* 标题 */}
                    <div className="share-render-title" style={{ display: 'table', marginBottom: '4px' }}>
                      <div style={{ display: 'table-cell', verticalAlign: 'middle', width: '24px', height: '24px', paddingRight: '8px', color: 'rgb(var(--color-brand-rgb))' }}>
                        <Layers size={20} />
                      </div>
                      <div style={{ display: 'table-cell', verticalAlign: 'middle', fontSize: '20px', fontWeight: 900, color: '#1e293b', lineHeight: '24px' }}>
                        {topTitle}
                      </div>
                    </div>
                    <div className="share-render-subtitle" style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                      共 {selectedCards.length} 项
                    </div>

                    {/* 按简化后的分组渲染选中的卡片 */}
                    {Object.entries(groupedCards).map(([label, cards], groupIdx) => (
                      <div key={`group-${groupIdx}`} style={{ marginBottom: '24px' }}>
                        {/* 分组标题 - 仅当有下级名称时显示 */}
                        {label && (
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'rgb(var(--color-brand-rgb))',
                            marginBottom: '12px',
                            paddingLeft: '8px',
                            borderLeft: '3px solid rgb(var(--color-brand-rgb))',
                            display: 'table',
                            lineHeight: '18px',
                            minHeight: '18px'
                          }}>
                            <span style={{ display: 'table-cell', verticalAlign: 'middle', height: '18px' }}>{label}</span>
                          </div>
                        )}

                        {/* 分组内的卡片 */}
                        {cards.map((card, idx) => {
                          const detailHtml = parseMarkdown(card.detail);
                          return (
                            <div key={`card-${idx}`} style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              background: '#fff',
                              border: '1px solid rgba(226, 232, 240, 0.5)',
                              borderRadius: '12px',
                              padding: '20px',
                              marginBottom: '12px',
                              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)'
                            }}>
                              {/* 卡片头部：图标 + 名称 - 使用 inline-block 修复对齐 */}
                              <div style={{ width: '100%', marginBottom: '0', display: 'table' }}>
                                <div style={{ display: 'table-cell', verticalAlign: 'middle', width: '36px', height: '36px', paddingRight: '12px' }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: '#f1f5f9',
                                    border: '1px solid rgba(226, 232, 240, 0.5)',
                                    boxSizing: 'border-box'
                                  }}>
                                    <img
                                      src={getIconSrc(card)}
                                      alt={card.name || ''}
                                      style={{ width: '24px', height: '24px', objectFit: 'contain', display: 'block' }}
                                      onError={(e) => { e.target.src = `${base}/favicon.svg`; }}
                                    />
                                  </div>
                                </div>
                                <div style={{
                                  display: 'table-cell',
                                  verticalAlign: 'middle',
                                  fontSize: '16px',
                                  fontWeight: 800,
                                  color: '#1e293b',
                                  lineHeight: '24px'
                                }}>
                                  {card.name || card.title || '未命名'}
                                </div>
                              </div>

                              {/* 描述 - 居中放置修复 */}
                              {card.desc && (
                                <div style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  fontSize: '13px',
                                  color: '#64748b',
                                  marginTop: '10px', /* 调整间距使其看起来更居中 */
                                  marginBottom: '0',
                                  lineHeight: 1.5,
                                  wordBreak: 'break-word'
                                }}>
                                  {card.desc}
                                </div>
                              )}

                              {/* 详情（Markdown 渲染） */}
                              {detailHtml && (
                                <div
                                  className="share-render-card-detail"
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    fontSize: '12px',
                                    color: '#475569',
                                    lineHeight: 1.6,
                                    padding: '12px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(226, 232, 240, 0.5)',
                                    marginTop: '12px'
                                  }}
                                  dangerouslySetInnerHTML={{ __html: detailHtml }}
                                />
                              )}

                              {/* 链接 */}
                              {card.url && (
                                <div style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  fontSize: '11px',
                                  marginTop: '12px',
                                  wordBreak: 'break-all'
                                }}>
                                  <span style={{ marginRight: '4px' }}>🔗</span>
                                  <span style={{ color: 'rgb(var(--color-brand-rgb))', textDecoration: 'underline' }}>{card.url}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* 底部水印 - 加上日期 */}
                    <div className="share-render-footer" style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
                      Generated by my-nav · {new Date().toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                ) : (
                  /* 空状态提示 */
                  <div className="share-empty-state">
                    <Layers size={48} />
                    <p>请从左侧选择要导出的卡片</p>
                  </div>
                )}
              </div>

              {/* 底部操作栏 */}
              <div className="share-footer">
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  选中 {selectedCards.length} 项资源
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* 复制 Title:URL 按钮 */}
                  <button
                    className={`share-export-btn secondary`}
                    onClick={copyTitleUrl}
                    disabled={selectedCards.length === 0}
                    style={{ position: 'relative' }}
                  >
                    {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                    {copySuccess ? '已复制' : '复制资源'}
                  </button>
                  {/* 导出为图片按钮 */}
                  <button
                    className={`share-export-btn secondary ${exporting ? 'share-exporting' : ''}`}
                    onClick={exportAsImage}
                    disabled={selectedCards.length === 0 || exporting}
                  >
                    <Image size={14} />
                    {exporting ? '导出中...' : '导出图片'}
                  </button>
                  {/* 导出为 PDF 按钮 */}
                  <button
                    className={`share-export-btn primary ${exporting ? 'share-exporting' : ''}`}
                    onClick={exportAsPDF}
                    disabled={selectedCards.length === 0 || exporting}
                  >
                    <FileText size={14} />
                    {exporting ? '准备中...' : '打印 / 存为 PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
