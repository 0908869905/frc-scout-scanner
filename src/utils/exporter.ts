/**
 * FRC Scout Scanner - 导出工具
 */

import { TSV_SCHEMA_MATCH, TSV_SCHEMA_PATH, TSV_SCHEMA_PIT_PATH, TSV_SCHEMA_PIT } from '../constants';
import type { ScanHistoryItem, QRType } from '../types';

/**
 * 导出资料为 CSV 格式
 */
export function exportToCSV(
  items: ScanHistoryItem[],
  type: QRType,
  includeHeaders: boolean = true
): string {
  // 根据类型筛选
  const filteredItems = items.filter(item => item.qrType === type);

  if (filteredItems.length === 0) {
    return '';
  }

  // 取得 Schema
  let schema: readonly string[];
  switch (type) {
    case 'match':
      schema = TSV_SCHEMA_MATCH;
      break;
    case 'path':
      schema = TSV_SCHEMA_PATH;
      break;
    case 'pit-path':
      schema = TSV_SCHEMA_PIT_PATH;
      break;
    case 'pit':
    case 'pit-external':
      schema = TSV_SCHEMA_PIT;
      break;
    default:
      schema = Object.keys(filteredItems[0].data);
  }

  // 建立 CSV 内容
  const lines: string[] = [];

  if (includeHeaders) {
    // 加入额外栏位
    const headers = [...schema, 'scanTime', 'uploaded'];
    lines.push(headers.join(','));
  }

  for (const item of filteredItems) {
    const values = [
      ...schema.map(field => escapeCSV(item.data[field] || '')),
      escapeCSV(item.scanTime),
      item.uploaded ? '1' : '0',
    ];
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * 导出资料为 JSON 格式
 */
export function exportToJSON(items: ScanHistoryItem[]): string {
  const exportData = items.map(item => ({
    type: item.qrType,
    data: item.data,
    scanTime: item.scanTime,
    matchKey: item.matchKey,
    uploaded: item.uploaded,
    uploadTime: item.uploadTime,
    validationResult: item.validationResult,
  }));

  return JSON.stringify(exportData, null, 2);
}

/**
 * 导出所有资料为 JSON（含元数据）
 */
export function exportAllToJSON(items: ScanHistoryItem[]): string {
  const exportData = {
    exportTime: new Date().toISOString(),
    version: '1.0',
    totalCount: items.length,
    counts: {
      match: items.filter(i => i.qrType === 'match').length,
      path: items.filter(i => i.qrType === 'path' || i.qrType === 'pit-path').length,
      pit: items.filter(i => i.qrType === 'pit' || i.qrType === 'pit-external').length,
    },
    items: items.map(item => ({
      id: item.id,
      type: item.qrType,
      data: item.data,
      scanTime: item.scanTime,
      matchKey: item.matchKey,
      uploaded: item.uploaded,
      uploadTime: item.uploadTime,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 下载档案
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * CSV 值跳脱处理
 */
function escapeCSV(value: string): string {
  if (!value) return '';

  // 如果包含逗号、引号或换行，需要用引号包裹并跳脱内部引号
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * 取得导出档名
 */
export function getExportFilename(
  type: 'all' | QRType,
  format: 'csv' | 'json'
): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const typeLabel = type === 'all' ? 'all' : type;
  return `scouting-${typeLabel}-${timestamp}.${format}`;
}
