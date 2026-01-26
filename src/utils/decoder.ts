/**
 * FRC Scout Scanner - QR 解码工具
 */

import LZString from 'lz-string';
import { TSV_SCHEMA_MATCH, TSV_SCHEMA_PATH, TSV_SCHEMA_PIT } from '../constants';
import type { QRType, DecodeResult, PathPoint } from '../types';

/**
 * 根据栏位数量判断 QR 类型
 */
export function detectQRType(values: string[]): QRType {
  const length = values.length;

  if (length === TSV_SCHEMA_MATCH.length) return 'match';
  if (length === TSV_SCHEMA_PATH.length) return 'path';
  if (length === TSV_SCHEMA_PIT.length) return 'pit';

  return 'unknown';
}

/**
 * 解码 QR Code 内容
 * @param qrContent - QR Code 扫描到的原始内容（LZ-String Base64 压缩）
 * @returns 解码结果
 */
export function decodeQR(qrContent: string): DecodeResult {
  // 解压缩
  const tsv = LZString.decompressFromBase64(qrContent);

  if (!tsv) {
    throw new Error('无法解压 QR 资料，可能是无效的格式');
  }

  // 分割 TSV
  const values = tsv.split('\t');
  const type = detectQRType(values);

  // 根据类型选择 Schema
  let schema: readonly string[];
  switch (type) {
    case 'match':
      schema = TSV_SCHEMA_MATCH;
      break;
    case 'path':
      schema = TSV_SCHEMA_PATH;
      break;
    case 'pit':
      schema = TSV_SCHEMA_PIT;
      break;
    default:
      // 未知类型，使用索引作为栏位名
      schema = values.map((_, i) => `field${i}`);
  }

  // 建立资料对象
  const data: Record<string, string> = {};
  schema.forEach((key, i) => {
    data[key] = values[i] ?? '';
  });

  return {
    type,
    data,
    raw: values,
    timestamp: Date.now(),
  };
}

/**
 * 解析布林值
 * TSV 中 "1" = true, "0" = false
 */
export function parseBoolean(val: string): boolean {
  return val === '1' || val.toLowerCase() === 'true';
}

/**
 * 解析数字
 */
export function parseNumber(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * 解析字串（处理 None）
 */
export function parseString(val: string): string {
  return val === 'None' ? '' : val;
}

/**
 * 解析路径字串为坐标数组
 * 格式: "x1,y1|x2,y2|x3,y3|..."
 */
export function parsePath(pathStr: string): PathPoint[] {
  if (!pathStr || pathStr === 'None' || pathStr.trim() === '') {
    return [];
  }

  return pathStr.split('|').map(point => {
    const [x, y] = point.split(',').map(Number);
    return { x: x || 0, y: y || 0 };
  });
}

/**
 * 产生 Match Key 用于配对 Match 和 Path QR
 */
export function getMatchKey(data: {
  eventCode?: string;
  matchNumber?: string | number;
  teamNumber?: string;
}): string {
  return `${data.eventCode || ''}_${data.matchNumber || ''}_${data.teamNumber || ''}`;
}

/**
 * 产生 Pit Key
 */
export function getPitKey(data: {
  eventCode?: string;
  teamNumber?: string;
}): string {
  return `${data.eventCode || ''}_${data.teamNumber || ''}`;
}

/**
 * 验证解码结果是否有效
 */
export function isValidDecodeResult(result: DecodeResult): boolean {
  if (result.type === 'unknown') {
    return false;
  }

  // 检查必要栏位
  switch (result.type) {
    case 'match':
      return !!(result.data.eventCode && result.data.matchNumber && result.data.teamNumber);
    case 'path':
      return !!(result.data.eventCode && result.data.matchNumber && result.data.teamNumber);
    case 'pit':
      return !!(result.data.eventCode && result.data.teamNumber);
    default:
      return false;
  }
}

/**
 * 格式化显示值
 */
export function formatDisplayValue(key: string, value: string): string {
  if (value === 'None' || value === '') return '-';
  if (value === '1') return 'Yes';
  if (value === '0') return 'No';
  return value;
}
