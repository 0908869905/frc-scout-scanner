/**
 * FRC Scout Scanner - 整体布局组件
 */

import { Outlet } from 'react-router-dom';
import { Navbar, TabBar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* 顶部导航 */}
      <Navbar />

      {/* 主内容区域 */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* 底部导航（手机版） */}
      <TabBar />
    </div>
  );
}
