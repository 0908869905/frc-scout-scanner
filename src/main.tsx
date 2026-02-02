/**
 * FRC Scout Scanner - 應用入口
 *
 * 注意：React StrictMode 會導致元件在開發環境下雙重掛載，
 * 這可能會影響 html5-qrcode 的初始化。
 * Scanner.tsx 已經處理了這個問題。
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 掛載應用
const root = document.getElementById('root');
if (root) {
  // 在生產環境下使用 StrictMode，開發環境下可以選擇關閉以便調試
  // 目前保持 StrictMode 開啟，Scanner 元件已經正確處理雙重掛載問題
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
