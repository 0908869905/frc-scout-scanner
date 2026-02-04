/**
 * FRC Scout Scanner - 路徑可視化頁面
 * 功能：查詢/手動輸入路徑、場地圖疊圖、匯出、動畫播放
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { queryMatchPaths, queryTeamPaths } from '../utils/sheets';
import { loadSettings } from '../utils/storage';

// === Types ===

type PathAlliance = 'red' | 'blue' | 'unknown';

type PathSource = 'scouting' | 'pit' | '';

interface PathData {
  id: string;
  name: string;
  coords: string;
  color: string;
  alliance: PathAlliance;
  visible: boolean;
  flipped: boolean;
  source: PathSource;
  queryKey?: string; // 用於重複偵測（查詢結果才有）
}

// activeAnims: pathId → current step（在 map 裡的路徑 = 正在播放）
type ActiveAnims = Record<string, number>;

// === Constants ===

const STORAGE_KEY = 'frc-scanner-viewer-paths';

const PATH_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4',
];

const RED_COLORS = ['#ef4444', '#f97316', '#f59e0b'];
const BLUE_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6'];

const MATCH_LEVEL_CODE: Record<string, string> = {
  'P': 'P', 'QM': 'Q', 'PO': 'M', 'X': 'X',
};

const MATCH_LEVELS = [
  { value: 'P', labelKey: 'practice' as const },
  { value: 'QM', labelKey: 'quals' as const },
  { value: 'PO', labelKey: 'playoff' as const },
  { value: 'X', labelKey: 'other' as const },
];

// === Utilities ===

function parsePathString(pathStr: string): { x: number; y: number }[] {
  if (!pathStr || pathStr === 'None' || pathStr.trim() === '') return [];
  return pathStr.split('|').map(point => {
    const [x, y] = point.split(',').map(Number);
    return { x: x || 0, y: y || 0 };
  }).filter(p => !isNaN(p.x) && !isNaN(p.y));
}

function calculatePathDistance(coords: string, flipped: boolean): number {
  const raw = parsePathString(coords);
  if (raw.length < 2) return 0;
  const pts = flipped ? raw.map(p => ({ x: 100 - p.x, y: 100 - p.y })) : raw;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

// === Component ===

export function PathViewerPage() {
  const { t } = useI18n();

  // --- Path State (初始化從 localStorage 載入) ---
  const [paths, setPaths] = useState<PathData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [];
  });

  // --- Manual Input State ---
  const [inputValue, setInputValue] = useState('');
  const [pathName, setPathName] = useState('');
  const [pathAlliance, setPathAlliance] = useState<PathAlliance>('unknown');
  const [showManualAdd, setShowManualAdd] = useState(false);

  // --- Query State ---
  const [queryMode, setQueryMode] = useState<'match' | 'team'>('match');
  const [queryEventCode, setQueryEventCode] = useState('');
  const [queryMatchLevel, setQueryMatchLevel] = useState('QM');
  const [queryMatchNumber, setQueryMatchNumber] = useState('');
  const [queryTeamNumber, setQueryTeamNumber] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryMessage, setQueryMessage] = useState('');

  // --- View State ---
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'red' | 'blue'>('all');

  // --- Animation State（多路徑同時播放）---
  const [activeAnims, setActiveAnims] = useState<ActiveAnims>({});

  // --- Refs ---
  const fieldRef = useRef<HTMLDivElement>(null);

  // === Effects ===

  // 儲存路徑到 localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(paths)); } catch { /* ignore */ }
  }, [paths]);

  // 動畫計時器（同時推進所有播放中的路徑）
  useEffect(() => {
    const ids = Object.keys(activeAnims);
    if (ids.length === 0) return;
    const timer = setTimeout(() => {
      setActiveAnims(prev => {
        const next: ActiveAnims = {};
        for (const id of Object.keys(prev)) {
          const path = paths.find(p => p.id === id);
          if (!path) continue;
          const pts = parsePathString(path.coords);
          const nextStep = prev[id] + 1;
          if (nextStep < pts.length) next[id] = nextStep;
          // 播完的路徑不加入 next，自動移除
        }
        return next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [activeAnims, paths]);

  // === Path Handlers ===

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
      source: '',
    };
    setPaths(prev => [...prev, newPath]);
    setInputValue('');
    setPathName('');
  }, [inputValue, pathName, paths.length, pathAlliance]);

  // 將查詢結果疊加到現有路徑（含重複偵測）
  const appendQueryResults = useCallback((
    queryResults: Array<{ teamNumber: string; alliance: string; autoPath: string; matchLevel: string; matchNumber: string; source?: string }>,
  ) => {
    let redCount = 0;
    let blueCount = 0;
    let pitCount = 0;

    const newPaths: PathData[] = queryResults.map((p) => {
      const isPit = p.source === 'pit';
      const isRed = p.alliance.startsWith('R');
      const isBlue = p.alliance.startsWith('B');
      const alliance: PathAlliance = isRed ? 'red' : isBlue ? 'blue' : 'unknown';
      let color: string;
      if (isPit) { color = PATH_COLORS[(pitCount++) % PATH_COLORS.length]; }
      else if (isRed) { color = RED_COLORS[redCount % RED_COLORS.length]; redCount++; }
      else if (isBlue) { color = BLUE_COLORS[blueCount % BLUE_COLORS.length]; blueCount++; }
      else { color = PATH_COLORS[(redCount + blueCount) % PATH_COLORS.length]; }

      const source: PathSource = isPit ? 'pit' : 'scouting';
      let name: string;
      let queryKey: string;
      if (isPit) {
        name = `${p.teamNumber} Pit`;
        queryKey = `${p.teamNumber}_pit_${pitCount}`;
      } else {
        const levelCode = MATCH_LEVEL_CODE[p.matchLevel] || p.matchLevel || '';
        name = `${p.teamNumber} ${levelCode}${p.matchNumber}`.trim();
        queryKey = `${p.teamNumber}_${p.matchLevel}_${p.matchNumber}`;
      }

      return {
        id: Date.now().toString() + '_' + p.teamNumber + '_' + (isPit ? 'pit' + pitCount : p.matchLevel + p.matchNumber),
        name, coords: p.autoPath, color, alliance, visible: true, flipped: false, source, queryKey,
      };
    });

    setPaths(prev => {
      const existingKeys = new Set(prev.filter(p => p.queryKey).map(p => p.queryKey));
      const unique = newPaths.filter(p => !p.queryKey || !existingKeys.has(p.queryKey));
      return [...prev, ...unique];
    });
  }, []);

  // 查詢後端路徑
  const handleQuery = useCallback(async () => {
    if (!queryEventCode.trim()) return;
    const settings = loadSettings();
    if (!settings.sheetsApiUrl) { setQueryMessage(t.pathQuery.noApiUrl); return; }

    if (queryMode === 'match' && !queryMatchNumber.trim()) return;
    if (queryMode === 'team' && !queryTeamNumber.trim()) return;

    setQueryLoading(true);
    setQueryMessage('');

    try {
      let result: { success: boolean; paths: Array<{ teamNumber: string; alliance: string; autoPath: string; matchLevel: string; matchNumber: string }>; message: string };
      if (queryMode === 'match') {
        result = await queryMatchPaths({ eventCode: queryEventCode.trim(), matchLevel: queryMatchLevel, matchNumber: queryMatchNumber.trim() });
      } else {
        result = await queryTeamPaths({ eventCode: queryEventCode.trim(), teamNumber: queryTeamNumber.trim() });
      }

      if (result.success && result.paths.length > 0) {
        appendQueryResults(result.paths);
        setQueryMessage(t.pathQuery.resultCount.replace('{count}', String(result.paths.length)));
      } else {
        setQueryMessage(result.paths.length === 0 ? t.pathQuery.noResults : result.message);
      }
    } catch { setQueryMessage(t.pathQuery.noResults); }
    finally { setQueryLoading(false); }
  }, [queryMode, queryEventCode, queryMatchLevel, queryMatchNumber, queryTeamNumber, t, appendQueryResults]);

  const togglePathVisibility = useCallback((id: string) => {
    setPaths(prev => prev.map(p => p.id === id ? { ...p, visible: !p.visible } : p));
  }, []);

  const togglePathFlip = useCallback((id: string) => {
    setPaths(prev => prev.map(p => {
      if (p.id !== id) return p;
      const newFlipped = !p.flipped;
      let newAlliance: PathAlliance = p.alliance;
      let newColor = p.color;
      if (p.alliance === 'red') {
        newAlliance = 'blue';
        const idx = RED_COLORS.indexOf(p.color);
        if (idx >= 0) newColor = BLUE_COLORS[idx % BLUE_COLORS.length];
      } else if (p.alliance === 'blue') {
        newAlliance = 'red';
        const idx = BLUE_COLORS.indexOf(p.color);
        if (idx >= 0) newColor = RED_COLORS[idx % RED_COLORS.length];
      }
      return { ...p, flipped: newFlipped, alliance: newAlliance, color: newColor };
    }));
  }, []);

  const updatePathColor = useCallback((id: string, color: string) => {
    setPaths(prev => prev.map(p => p.id === id ? { ...p, color } : p));
  }, []);

  const removePath = useCallback((id: string) => {
    setPaths(prev => prev.filter(p => p.id !== id));
    setActiveAnims(prev => {
      if (!(id in prev)) return prev;
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

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

  // === Animation Handler ===

  const toggleAnimation = useCallback((pathId: string) => {
    setActiveAnims(prev => {
      if (pathId in prev) {
        const { [pathId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [pathId]: 0 };
    });
  }, []);

  const playAllAnimation = useCallback(() => {
    const anyPlaying = Object.keys(activeAnims).length > 0;
    if (anyPlaying) {
      setActiveAnims({});
    } else {
      const visible = paths.filter(p => p.visible && (visibilityFilter === 'all' || p.alliance === visibilityFilter));
      const anims: ActiveAnims = {};
      visible.forEach(p => { if (parsePathString(p.coords).length >= 2) anims[p.id] = 0; });
      setActiveAnims(anims);
    }
  }, [activeAnims, paths, visibilityFilter]);

  // === Export Handler ===

  const handleExport = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 載入場地圖
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/field-2026.png';
    await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
    ctx.drawImage(img, 0, 0, 2000, 1000);

    // 繪製可見路徑
    const visiblePaths = paths.filter(p => p.visible && (visibilityFilter === 'all' || p.alliance === visibilityFilter));
    visiblePaths.forEach(path => {
      const rawPts = parsePathString(path.coords);
      if (rawPts.length < 2) return;
      const pts = path.flipped ? rawPts.map(p => ({ x: 100 - p.x, y: 100 - p.y })) : rawPts;

      const toX = (x: number) => (x / 100) * 2000;
      const toY = (y: number) => (y / 100) * 1000;

      // 路徑線
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.9;
      pts.forEach((p, i) => { i === 0 ? ctx.moveTo(toX(p.x), toY(p.y)) : ctx.lineTo(toX(p.x), toY(p.y)); });
      ctx.stroke();

      // 起點
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.fillStyle = path.color;
      ctx.arc(toX(pts[0].x), toY(pts[0].y), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 終點
      ctx.beginPath();
      ctx.fillStyle = 'white';
      ctx.arc(toX(pts[pts.length - 1].x), toY(pts[pts.length - 1].y), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = path.color;
      ctx.stroke();

      // 中間點
      ctx.globalAlpha = 0.7;
      pts.slice(1, -1).forEach(p => {
        ctx.beginPath();
        ctx.fillStyle = path.color;
        ctx.arc(toX(p.x), toY(p.y), 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // 路徑名稱標籤
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = path.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 4;
      ctx.strokeText(path.name, toX(pts[0].x) + 12, toY(pts[0].y) - 8);
      ctx.fillText(path.name, toX(pts[0].x) + 12, toY(pts[0].y) - 8);
    });

    // 下載
    const link = document.createElement('a');
    link.download = `path-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [paths, visibilityFilter]);

  // === Computed ===

  const visibleCount = paths.filter(p => p.visible && (visibilityFilter === 'all' || p.alliance === visibilityFilter)).length;

  // === JSX ===

  return (
    <div className="space-y-4">
      {/* 標題 */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">Path Viewer</h1>
        <p className="text-sm text-slate-400">
          {paths.length > 0 && <span className="text-brand-400">{paths.length} </span>}
          {paths.length > 0 ? t.pathViewer.saved : '路徑可視化工具'}
        </p>
      </div>

      {/* 查詢區 */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.pathQuery.title}</h3>
        <div className="space-y-3">
          {/* 查詢模式切換 */}
          <div className="flex gap-2">
            <button
              onClick={() => setQueryMode('match')}
              className={`flex-1 py-1.5 text-sm rounded-lg border transition-all ${
                queryMode === 'match' ? 'bg-brand-500/20 text-brand-400 border-brand-500' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >{t.pathQuery.queryByMatch}</button>
            <button
              onClick={() => setQueryMode('team')}
              className={`flex-1 py-1.5 text-sm rounded-lg border transition-all ${
                queryMode === 'team' ? 'bg-brand-500/20 text-brand-400 border-brand-500' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >{t.pathQuery.queryByTeam}</button>
          </div>

          {/* 按場次查詢 */}
          {queryMode === 'match' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t.pathQuery.eventCode}</label>
                  <input type="text" value={queryEventCode} onChange={(e) => setQueryEventCode(e.target.value)}
                    placeholder="e.g. 2026twsc" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t.pathQuery.matchLevel}</label>
                  <select value={queryMatchLevel} onChange={(e) => setQueryMatchLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-brand-500 text-sm">
                    {MATCH_LEVELS.map(ml => (
                      <option key={ml.value} value={ml.value}>{t.pathQuery[ml.labelKey]} ({ml.value})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">{t.pathQuery.matchNumber}</label>
                  <input type="number" value={queryMatchNumber} onChange={(e) => setQueryMatchNumber(e.target.value)}
                    placeholder="1" min="1" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm" />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleQuery} disabled={queryLoading || !queryEventCode.trim() || !queryMatchNumber.trim()}>
                    {queryLoading ? t.pathQuery.querying : t.pathQuery.query}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* 按隊伍查詢 */}
          {queryMode === 'team' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t.pathQuery.eventCode}</label>
                  <input type="text" value={queryEventCode} onChange={(e) => setQueryEventCode(e.target.value)}
                    placeholder="e.g. 2026twsc" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t.pathQuery.teamNumber}</label>
                  <input type="text" value={queryTeamNumber} onChange={(e) => setQueryTeamNumber(e.target.value)}
                    placeholder="e.g. 6998" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleQuery} disabled={queryLoading || !queryEventCode.trim() || !queryTeamNumber.trim()}>
                  {queryLoading ? t.pathQuery.querying : t.pathQuery.query}
                </Button>
              </div>
            </>
          )}

          {queryMessage && <p className="text-xs text-slate-400">{queryMessage}</p>}
        </div>
      </Card>

      {/* 手動輸入區（可折疊） */}
      <Card>
        <button onClick={() => setShowManualAdd(!showManualAdd)}
          className="w-full flex items-center justify-between text-sm font-semibold text-slate-300">
          <span>{t.pathQuery.manualAdd}</span>
          <svg className={`w-4 h-4 transition-transform ${showManualAdd ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showManualAdd && (
          <div className="space-y-3 mt-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">路徑名稱（選填）</label>
              <input type="text" value={pathName} onChange={(e) => setPathName(e.target.value)}
                placeholder="例如：Team 6998 Match 1"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">座標字串</label>
              <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                placeholder="格式：x1,y1|x2,y2|x3,y3|..." rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">聯盟</label>
              <div className="flex gap-2">
                {(['red', 'blue', 'unknown'] as const).map(a => (
                  <button key={a} onClick={() => setPathAlliance(a)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                      pathAlliance === a
                        ? a === 'red' ? 'bg-red-500/20 border-red-500 text-red-400'
                          : a === 'blue' ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-slate-700/50 border-slate-500 text-slate-300'
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}>{a === 'red' ? 'Red' : a === 'blue' ? 'Blue' : '—'}</button>
                ))}
              </div>
            </div>
            <Button onClick={handleAddPath} disabled={!inputValue.trim()} fullWidth>新增路徑</Button>
          </div>
        )}
      </Card>

      {/* 場地圖 + 路徑疊圖 */}
      <Card className="p-0 overflow-hidden">
        <div
          ref={fieldRef}
          className="relative w-full select-none"
          style={{ aspectRatio: '2/1' }}
        >
          {/* 場地底圖 */}
          <img src="/field-2026.png" alt="FRC 2026 Field" className="absolute inset-0 w-full h-full object-fill" draggable={false} />

          {/* SVG 路徑疊圖 */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
            {paths.filter(p => p.visible && (visibilityFilter === 'all' || p.alliance === visibilityFilter)).map(path => {
              const rawPoints = parsePathString(path.coords);
              if (rawPoints.length < 2) return null;
              const points = path.flipped ? rawPoints.map(p => ({ x: 100 - p.x, y: 100 - p.y })) : rawPoints;

              const fullPathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 2} ${p.y}`).join(' ');
              const isAnim = path.id in activeAnims;
              const animStep = isAnim ? Math.min(activeAnims[path.id], points.length - 1) : points.length - 1;

              return (
                <g key={path.id}>
                  {/* 完整路徑（動畫時變暗） */}
                  <path d={fullPathD} fill="none" stroke={path.color} strokeWidth={1.5}
                    strokeLinecap="round" strokeLinejoin="round" opacity={isAnim ? 0.25 : 0.9} />

                  {/* 動畫已走過的部分 */}
                  {isAnim && animStep > 0 && (
                    <path
                      d={points.slice(0, animStep + 1).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 2} ${p.y}`).join(' ')}
                      fill="none" stroke={path.color} strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                  )}

                  {/* 起點 */}
                  <circle cx={points[0].x * 2} cy={points[0].y} r={2}
                    fill={path.color} stroke="white" strokeWidth={0.5} />
                  {/* 終點 */}
                  <circle cx={points[points.length - 1].x * 2} cy={points[points.length - 1].y} r={2}
                    fill="white" stroke={path.color} strokeWidth={0.5} />
                  {/* 中間點 */}
                  {points.length > 2 && points.slice(1, -1).map((p, i) => (
                    <circle key={i} cx={p.x * 2} cy={p.y} r={1} fill={path.color} opacity="0.7" />
                  ))}

                  {/* 動畫游標 */}
                  {isAnim && (
                    <circle cx={points[animStep].x * 2} cy={points[animStep].y} r={3.5}
                      fill="#fbbf24" stroke="white" strokeWidth={0.8}>
                      <animate attributeName="r" values="3;4.5;3" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* 場地疊圖按鈕 */}
          {paths.length > 0 && (
            <div className="absolute top-2 left-2 right-2 flex justify-between pointer-events-none">
              {/* 全部播放（左上角） */}
              <button onClick={playAllAnimation}
                className={`pointer-events-auto rounded-lg p-1.5 ${
                  Object.keys(activeAnims).length > 0
                    ? 'bg-yellow-500/80 hover:bg-yellow-500 text-black'
                    : 'bg-black/50 hover:bg-black/70 text-white'
                }`} title={Object.keys(activeAnims).length > 0 ? 'Stop All' : 'Play All'}>
                {Object.keys(activeAnims).length > 0 ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.5 4.232a1 1 0 011.52-.852l11.96 7.768a1 1 0 010 1.704L7.02 20.62a1 1 0 01-1.52-.852V4.232z" />
                  </svg>
                )}
              </button>
              {/* 匯出（右上角） */}
              <button onClick={handleExport}
                className="pointer-events-auto bg-black/50 hover:bg-black/70 rounded-lg p-1.5 text-white" title={t.pathViewer.export}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* 路徑列表 */}
      {paths.length > 0 && (
        <Card>
          {/* 列表頭部：標題 + 聯盟篩選 + 清除 */}
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-400 flex-1">
              {t.pathViewer.pathList}
              <span className="ml-1 text-xs font-normal">({visibleCount}/{paths.length})</span>
            </h3>

            {/* 聯盟篩選 */}
            <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
              {(['all', 'red', 'blue'] as const).map(f => (
                <button key={f} onClick={() => setVisibilityFilter(f)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    visibilityFilter === f
                      ? f === 'red' ? 'bg-red-500/30 text-red-400'
                        : f === 'blue' ? 'bg-blue-500/30 text-blue-400'
                        : 'bg-slate-700 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  {f === 'all' ? t.pathViewer.showAll : f === 'red' ? t.pathViewer.redOnly : t.pathViewer.blueOnly}
                </button>
              ))}
            </div>

            {/* 全部顯示/隱藏 */}
            <button onClick={() => {
              const allVisible = paths.every(p => p.visible);
              setPaths(prev => prev.map(p => ({ ...p, visible: !allVisible })));
            }}
              className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-700">
              {paths.every(p => p.visible) ? t.pathViewer.hideAll : t.pathViewer.showAllPaths}
            </button>

            {/* 清除全部 */}
            <button onClick={() => setPaths([])}
              className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-500/10">
              {t.pathViewer.clearAll}
            </button>
          </div>

          {/* 路徑項目 */}
          <div className="space-y-2">
            {paths.map((path, idx) => {
              const points = parsePathString(path.coords);
              const dist = calculatePathDistance(path.coords, path.flipped);
              const isPathAnim = path.id in activeAnims;
              const isFiltered = visibilityFilter !== 'all' && path.alliance !== visibilityFilter;

              return (
                <div key={path.id}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-opacity ${
                    isFiltered ? 'opacity-30' : path.visible ? 'bg-slate-800' : 'bg-slate-900 opacity-50'
                  }`}>
                  {/* 顏色選擇器 */}
                  <input type="color" value={path.color} onChange={(e) => updatePathColor(path.id, e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0" />

                  {/* 聯盟標籤 */}
                  {path.alliance !== 'unknown' && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      path.alliance === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>{path.alliance === 'red' ? 'R' : 'B'}</span>
                  )}

                  {/* 來源標籤 */}
                  {path.source && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      path.source === 'pit' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>{path.source === 'pit' ? 'Pit' : 'SP'}</span>
                  )}

                  {/* 路徑資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{path.name}</div>
                    <div className="text-xs text-slate-500">
                      {points.length} pts · {t.pathViewer.distance}: {dist.toFixed(1)}
                      {path.flipped ? ' · 翻轉' : ''}
                    </div>
                  </div>

                  {/* 圖層排序 */}
                  <div className="flex flex-col shrink-0">
                    <button onClick={() => movePathUp(path.id)} disabled={idx === paths.length - 1}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button onClick={() => movePathDown(path.id)} disabled={idx === 0}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* 播放動畫 */}
                  <button onClick={() => toggleAnimation(path.id)}
                    className={`p-1.5 rounded ${
                      isPathAnim ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-slate-500 hover:bg-slate-700'
                    }`} title={isPathAnim ? 'Pause' : 'Play'}>
                    {isPathAnim ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    )}
                  </button>

                  {/* 翻轉 */}
                  <button onClick={() => togglePathFlip(path.id)}
                    className={`p-1.5 rounded ${path.flipped ? 'text-amber-400 hover:bg-amber-500/20' : 'text-slate-500 hover:bg-slate-700'}`}
                    title={path.flipped ? '還原方向' : '翻轉 180°'}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </button>

                  {/* 顯示/隱藏 */}
                  <button onClick={() => togglePathVisibility(path.id)}
                    className={`p-1.5 rounded ${path.visible ? 'text-brand-400 hover:bg-brand-500/20' : 'text-slate-500 hover:bg-slate-700'}`}
                    title={path.visible ? '隱藏' : '顯示'}>
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

                  {/* 刪除 */}
                  <button onClick={() => removePath(path.id)}
                    className="p-1.5 rounded text-red-400 hover:bg-red-500/20" title="刪除">
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
          <li>• 色圓 = 起點，白圓 = 終點，黃圓 = 動畫游標</li>
          <li>• 翻轉 180° 自動交換紅藍方</li>
          <li>• 路徑自動儲存，重新整理不會消失</li>
        </ul>
      </Card>
    </div>
  );
}
