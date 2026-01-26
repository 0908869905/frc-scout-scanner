/**
 * FRC Scout Scanner - 主应用组件
 */

import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { ToastContainer } from './components/ui/Toast';
import { ScanPage, HistoryPage, SettingsPage } from './pages';
import { loadHistory, saveHistory, generateId } from './utils/storage';
import { ROUTES } from './constants';
import { I18nProvider } from './i18n';
import type { ScanHistoryItem } from './types';

// Toast 类型
interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export default function App() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 载入历史记录
  useEffect(() => {
    const saved = loadHistory();
    setHistory(saved);
  }, []);

  // 储存历史记录
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // 添加历史记录
  const handleAddHistory = useCallback((item: ScanHistoryItem) => {
    setHistory((prev) => [item, ...prev]);
  }, []);

  // 更新历史记录
  const handleUpdateHistory = useCallback((items: ScanHistoryItem[]) => {
    setHistory(items);
  }, []);

  // 清除历史记录
  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // 显示 Toast
  const showToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string
  ) => {
    const toast: ToastItem = {
      id: generateId(),
      type,
      message,
    };
    setToasts((prev) => [...prev, toast]);
  }, []);

  // 移除 Toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path={ROUTES.SCAN}
              element={
                <ScanPage
                  history={history}
                  onAddHistory={handleAddHistory}
                  onUpdateHistory={handleUpdateHistory}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path={ROUTES.HISTORY}
              element={
                <HistoryPage
                  history={history}
                  onUpdateHistory={handleUpdateHistory}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path={ROUTES.SETTINGS}
              element={
                <SettingsPage
                  historyCount={history.length}
                  onClearHistory={handleClearHistory}
                  onShowToast={showToast}
                />
              }
            />
          </Route>
        </Routes>

        {/* Toast 通知 */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </BrowserRouter>
    </I18nProvider>
  );
}
