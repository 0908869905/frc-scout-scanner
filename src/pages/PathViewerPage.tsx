/**
 * FRC Scout Scanner - 路徑可視化頁面
 * 輸入座標字串，在場地圖上顯示路徑
 */

import { useState, useCallback } from 'react';
import { useI18n } from '../i18n';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

type PathAlliance = 'red' | 'blue' | 'unknown';

interface PathData {
  id: string;
  name: string;
  coords: string;
  color: string;
  alliance: PathAlliance;
  visible: boolean;
  flipped: boolean;
}

// Starting zone configuration (must match scouting app constants.ts)
const STARTING_ZONE_WIDTH = 3.5;
const RED_STARTING_ZONE_OFFSET = 25;
const BLUE_STARTING_ZONE_OFFSET = 68;

// 預設路徑顏色
const PATH_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#06b6d4', // cyan
];

// 解析座標字串
function parsePathString(pathStr: string): { x: number; y: number }[] {
  if (!pathStr || pathStr === 'None' || pathStr.trim() === '') {
    return [];
  }

  return pathStr.split('|').map(point => {
    const [x, y] = point.split(',').map(Number);
    return { x: x || 0, y: y || 0 };
  }).filter(p => !isNaN(p.x) && !isNaN(p.y));
}

export function PathViewerPage() {
  const { t } = useI18n();
  const [paths, setPaths] = useState<PathData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [pathName, setPathName] = useState('');
  const [pathAlliance, setPathAlliance] = useState<PathAlliance>('unknown');

  // 新增路徑
  const handleAddPath = useCallback(() => {
    if (!inputValue.trim()) return;

    const newPath: PathData = {
      id: Date.now().toString(),
      name: pathName.trim() || `Path ${paths.length + 1}`,
      coords: inputValue.trim(),
      color: PATH_COLORS[paths.length % PATH_COLORS.length],
      alliance: pathAlliance,
      visible: true,
      flipped: false,
    };

    setPaths(prev => [...prev, newPath]);
    setInputValue('');
    setPathName('');
  }, [inputValue, pathName, paths.length, pathAlliance]);

  // 切換路徑顯示
  const togglePathVisibility = useCallback((id: string) => {
    setPaths(prev => prev.map(p =>
      p.id === id ? { ...p, visible: !p.visible } : p
    ));
  }, []);

  // 翻轉路徑 180°
  const togglePathFlip = useCallback((id: string) => {
    setPaths(prev => prev.map(p =>
      p.id === id ? { ...p, flipped: !p.flipped } : p
    ));
  }, []);

  // 更新路徑顏色
  const updatePathColor = useCallback((id: string, color: string) => {
    setPaths(prev => prev.map(p =>
      p.id === id ? { ...p, color } : p
    ));
  }, []);

  // 刪除路徑
  const removePath = useCallback((id: string) => {
    setPaths(prev => prev.filter(p => p.id !== id));
  }, []);

  // 路徑上移（在陣列中往後 = SVG 上層）
  const movePathUp = useCallback((id: string) => {
    setPaths(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx < prev.length - 1) {
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      }
      return prev;
    });
  }, []);

  // 路徑下移（在陣列中往前 = SVG 下層）
  const movePathDown = useCallback((id: string) => {
    setPaths(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx > 0) {
        const next = [...prev];
        [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
        return next;
      }
      return prev;
    });
  }, []);


  return (
    <div className="space-y-4">
      {/* 標題 */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">Path Viewer</h1>
        <p className="text-sm text-slate-400">路徑可視化工具</p>
      </div>

      {/* 輸入區 */}
      <Card>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">路徑名稱（選填）</label>
            <input
              type="text"
              value={pathName}
              onChange={(e) => setPathName(e.target.value)}
              placeholder="例如：Team 6998 Match 1"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">座標字串</label>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="格式：x1,y1|x2,y2|x3,y3|..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono text-sm"
            />
          </div>

          {/* 聯盟選擇 */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">聯盟</label>
            <div className="flex gap-2">
              {(['red', 'blue', 'unknown'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => setPathAlliance(a)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                    pathAlliance === a
                      ? a === 'red' ? 'bg-red-500/20 border-red-500 text-red-400'
                        : a === 'blue' ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'bg-slate-700/50 border-slate-500 text-slate-300'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}
                >
                  {a === 'red' ? 'Red' : a === 'blue' ? 'Blue' : '—'}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleAddPath} disabled={!inputValue.trim()} fullWidth>
            新增路徑
          </Button>
        </div>
      </Card>

      {/* 場地圖 + 路徑疊圖 */}
      <Card className="p-0 overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: '2/1' }}>
          {/* 場地底圖 - object-fill 拉伸填滿，與 Scouting App 一致 */}
          <img
            src="/field-2026.png"
            alt="FRC 2026 Field"
            className="absolute inset-0 w-full h-full object-fill"
          />

          {/* SVG 路徑疊圖 - viewBox 2:1 匹配容器比例，避免圓點變形 */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 200 100"
          >
            {/* Starting zones */}
            <rect
              x={RED_STARTING_ZONE_OFFSET * 2}
              y={0}
              width={STARTING_ZONE_WIDTH * 2}
              height={100}
              fill="rgba(239, 68, 68, 0.15)"
              stroke="rgba(239, 68, 68, 0.4)"
              strokeWidth="0.5"
              strokeDasharray="3 2"
            />
            <rect
              x={BLUE_STARTING_ZONE_OFFSET * 2}
              y={0}
              width={STARTING_ZONE_WIDTH * 2}
              height={100}
              fill="rgba(59, 130, 246, 0.15)"
              stroke="rgba(59, 130, 246, 0.4)"
              strokeWidth="0.5"
              strokeDasharray="3 2"
            />
            {paths.filter(p => p.visible).map(path => {
              const rawPoints = parsePathString(path.coords);
              if (rawPoints.length < 2) return null;

              const points = path.flipped
                ? rawPoints.map(p => ({ x: 100 - p.x, y: 100 - p.y }))
                : rawPoints;

              // x 座標 * 2 映射到 0-200 viewBox，y 保持 0-100
              const pathD = points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 2} ${p.y}`)
                .join(' ');

              return (
                <g key={path.id}>
                  {/* 路徑線 */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={path.color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                  {/* 起點 */}
                  <circle
                    cx={points[0].x * 2}
                    cy={points[0].y}
                    r="2"
                    fill={path.color}
                    stroke="white"
                    strokeWidth="0.5"
                  />
                  {/* 終點 */}
                  <circle
                    cx={points[points.length - 1].x * 2}
                    cy={points[points.length - 1].y}
                    r="2"
                    fill="white"
                    stroke={path.color}
                    strokeWidth="0.5"
                  />
                  {/* 中間點 */}
                  {points.length > 2 && points.slice(1, -1).map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x * 2}
                      cy={p.y}
                      r="1"
                      fill={path.color}
                      opacity="0.7"
                    />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      {/* 路徑列表 */}
      {paths.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-400 mb-2">路徑列表</h3>
          <div className="space-y-2">
            {paths.map((path, idx) => {
              const points = parsePathString(path.coords);
              return (
                <div
                  key={path.id}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    path.visible ? 'bg-slate-800' : 'bg-slate-900 opacity-50'
                  }`}
                >
                  {/* 顏色選擇器 */}
                  <input
                    type="color"
                    value={path.color}
                    onChange={(e) => updatePathColor(path.id, e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0"
                    title="自訂顏色"
                  />

                  {/* 聯盟標籤 */}
                  {path.alliance !== 'unknown' && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      path.alliance === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {path.alliance === 'red' ? 'R' : 'B'}
                    </span>
                  )}

                  {/* 路徑資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {path.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {points.length} 個點{path.flipped ? ' · 已翻轉' : ''}
                    </div>
                  </div>

                  {/* 圖層排序 */}
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => movePathUp(path.id)}
                      disabled={idx === paths.length - 1}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20"
                      title="上移（前景）"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => movePathDown(path.id)}
                      disabled={idx === 0}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20"
                      title="下移（背景）"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* 操作按鈕 */}
                  <button
                    onClick={() => togglePathFlip(path.id)}
                    className={`p-1.5 rounded ${
                      path.flipped
                        ? 'text-amber-400 hover:bg-amber-500/20'
                        : 'text-slate-500 hover:bg-slate-700'
                    }`}
                    title={path.flipped ? '還原方向' : '翻轉 180°'}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </button>

                  <button
                    onClick={() => togglePathVisibility(path.id)}
                    className={`p-1.5 rounded ${
                      path.visible
                        ? 'text-brand-400 hover:bg-brand-500/20'
                        : 'text-slate-500 hover:bg-slate-700'
                    }`}
                    title={path.visible ? '隱藏' : '顯示'}
                  >
                    {path.visible ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => removePath(path.id)}
                    className="p-1.5 rounded text-red-400 hover:bg-red-500/20"
                    title="刪除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 使用說明 */}
      <Card className="bg-slate-900/50">
        <h3 className="text-sm font-semibold text-slate-400 mb-2">使用說明</h3>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• 座標格式：<code className="text-brand-400">x1,y1|x2,y2|x3,y3|...</code></li>
          <li>• 座標範圍：0-100（百分比，相對於場地圖）</li>
          <li>• 綠色圓點 = 起點，白色圓點 = 終點</li>
          <li>• 可同時顯示多條路徑進行比較</li>
        </ul>
      </Card>
    </div>
  );
}
