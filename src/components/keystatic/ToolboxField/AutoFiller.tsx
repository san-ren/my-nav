// src/components/keystatic/ToolboxField/AutoFiller.tsx
import React, { useState, useEffect } from 'react';
// 假设 utils.ts 也在当前文件夹下，如果在上一级请改为 '../utils'
import { setNativeValue, stopBubble } from './utils'; 

export function AutoFillerComponent(props: any) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    
    // 移除 useRef，因为不再需要防抖计时器
  
    const handleSmartFill = async (targetUrl: string) => {
      if (!targetUrl) return;
      setLoading(true);
      setStatus('🔍 自动分析中...');
  
      try {
        const res = await fetch(`/api/smart-parse?url=${encodeURIComponent(targetUrl)}`);
        
        // 错误处理逻辑 (保持之前的优化)
        if (!res.ok) {
            let errorMsg = res.statusText;
            try {
                const json = await res.json();
                if (json.error) errorMsg = json.error;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        
        const data = await res.json();
        console.log('Smart Data:', data);
  
        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
        let filledCount = 0;
        
        const descContent = data.desc || '';
        const isLongDesc = descContent.length > 15; 
  
        inputs.forEach((input: any) => {
          const container = input.closest('div[data-layout-span]') || input.closest('label') || input.parentElement?.parentElement;
          const labelText = (container?.textContent || '').toLowerCase();
          
          const isIconInput = input.getAttribute('data-id') === 'icon-input-field';

          if (!input.value || isIconInput) {
              if (labelText.includes('名称') || labelText.includes('name')) {
                  setNativeValue(input, data.title); filledCount++;
              }
              if ((labelText.includes('链接') || labelText.includes('url')) && !labelText.includes('官网') && !labelText.includes('official')) {
                  if (data.isGithub || data.originalUrl) {
                      setNativeValue(input, data.originalUrl || targetUrl); 
                      filledCount++;
                  }
              }
              if (labelText.includes('官网') || labelText.includes('official')) {
                   if (data.homepage) { setNativeValue(input, data.homepage); filledCount++; }
              }
              if (labelText.includes('简短') || labelText.includes('desc')) {
                  if (!isLongDesc) { setNativeValue(input, descContent); filledCount++; }
              }
              if (labelText.includes('详细') || labelText.includes('detail')) {
                  if (isLongDesc) { setNativeValue(input, descContent); filledCount++; }
              }
              if (isIconInput || labelText.includes('图标') || labelText.includes('icon')) {
                  if (data.icon) { setNativeValue(input, data.icon); filledCount++; }
              }
          }
        });
  
        setStatus(`✅ 已填 ${filledCount} 项`);
        setTimeout(() => setStatus(''), 4000);
      } catch (e: any) {
        console.error(e);
        const rawMsg = e.message || '解析失败';
        const displayMsg = rawMsg.replace('Error:', '').trim().substring(0, 15);
        setStatus(`❌ ${displayMsg}`);
      } finally {
        setLoading(false);
      }
    };

    // 逻辑修改 1: 仅当 url 变为空时清除状态 (不再监听 url 变化进行自动请求)
    useEffect(() => {
        if (!url) {
            setStatus(''); 
        }
    }, [url]);

    // 逻辑修改 2: 新增粘贴处理函数
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        // 获取粘贴板的文本
        const pastedText = e.clipboardData.getData('text').trim();
        
        // 简单正则判断是否是 URL
        const isUrl = /^https?:\/\/.{3,}/.test(pastedText);

        if (isUrl) {
            // 如果是链接，直接触发解析
            // 注意：因为 onChange 还没执行，state 中的 url 是旧的，所以必须传入 pastedText
            handleSmartFill(pastedText);
        }
    };
  
    return (
      <div 
        style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', padding: '12px', border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '8px', position: 'relative' }} 
        onClick={stopBubble}
      >
        <div style={{ fontSize: '20px' }}>🛠️</div>
        <input 
          value={url}
          onChange={e => setUrl(e.target.value)}
          onPaste={handlePaste} // 🔥 绑定粘贴事件
          placeholder="粘贴链接自动解析，手输请按回车..."
          style={{ flex: 1, padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); e.stopPropagation();
                handleSmartFill(url);
            }
          }}
        />
        <button 
          type="button"
          onClick={() => handleSmartFill(url)}
          disabled={loading || !url}
          style={{ padding: '8px 16px', fontSize: '14px', color: 'white', background: '#2563eb', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: (loading || !url) ? 0.7 : 1, transition: 'opacity 0.2s' }}
        >
          {loading ? '⏳' : '填充'}
        </button>
        {status && (
          <span style={{ position: 'absolute', bottom: '-22px', right: '4px', fontSize: '12px', color: status.includes('❌') ? '#ef4444' : '#64748b', fontWeight: 'bold' }}>{status}</span>
        )}
      </div>
    );
}