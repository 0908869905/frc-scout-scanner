/**
 * FRC Scout Scanner - 常量导出入口
 */

export * from './schema';
export * from './validation';

// Match Level 对照表
export const MATCH_LEVEL_MAP: Record<string, string> = {
  P: 'Practice',
  QM: 'Quals',
  PO: 'Playoffs',
  X: 'Test',
};

// QR 类型颜色（对应 Scouting App 和设计系统）
export const QR_TYPE_COLORS = {
  match: '#06b6d4',       // cyan-500
  path: '#f59e0b',        // amber-500
  pit: '#8b5cf6',         // violet-500
  'pit-external': '#a855f7', // purple-500
  unknown: '#64748b',     // slate-500
} as const;

// QR 类型标签
export const QR_TYPE_LABELS = {
  match: '比赛资料',
  path: '路径资料',
  pit: 'Pit 资料',
  'pit-external': 'Pit 资料 (外部)',
  unknown: '未知格式',
} as const;

// LocalStorage Keys
export const STORAGE_KEYS = {
  SCAN_HISTORY: 'frc-scanner-history',
  SETTINGS: 'frc-scanner-settings',
  SHEETS_CONFIG: 'frc-scanner-sheets',
} as const;

// 路由路径
export const ROUTES = {
  SCAN: '/',
  HISTORY: '/history',
  PATH_VIEWER: '/path',
  SETTINGS: '/settings',
} as const;

// 联盟颜色
export const ALLIANCE_COLORS = {
  Red: {
    text: '#ef4444',      // red-500
    background: '#7f1d1d', // red-900
  },
  Blue: {
    text: '#3b82f6',      // blue-500
    background: '#1e3a8a', // blue-900
  },
} as const;

// 状态颜色
export const STATUS_COLORS = {
  success: '#10b981',     // emerald-500
  error: '#ef4444',       // red-500
  warning: '#f59e0b',     // amber-500
  info: '#3b82f6',        // blue-500
} as const;
