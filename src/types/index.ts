/**
 * FRC Scout Scanner - 类型导出入口
 */

export * from './common';
export * from './match';
export * from './path';
export * from './pit';
export * from './pit-external';

// 扫描历史记录项目
export interface ScanHistoryItem {
  id: string;                 // UUID，唯一识别码
  scanTime: string;           // 扫描时间 (ISO 8601)
  qrType: import('./common').QRType;  // QR 类型
  data: Record<string, string>;
  uploaded: boolean;          // 是否已上传到 Google Sheets
  uploadTime?: string;        // 上传时间
  matchKey: string;           // 配对键
  validationResult?: import('./common').ValidationResult; // 验证结果
}

// 应用设定
export interface AppSettings {
  // Google Sheets 设定
  sheetsApiUrl: string;       // Apps Script URL

  // 导出设定
  defaultExportFormat: 'csv' | 'json';
  includeHeaders: boolean;
  timeFormat: 'iso' | 'locale';

  // 扫描设定
  autoUpload: boolean;        // 扫描成功后自动上传
  playSound: boolean;         // 播放扫描成功音效
  vibrate: boolean;           // 震动回馈
}

// 默认设定
export const DEFAULT_SETTINGS: AppSettings = {
  sheetsApiUrl: '',
  defaultExportFormat: 'csv',
  includeHeaders: true,
  timeFormat: 'iso',
  autoUpload: false,
  playSound: true,
  vibrate: true,
};
