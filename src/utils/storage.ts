/**
 * FRC Scout Scanner - localStorage 操作工具
 */

import { STORAGE_KEYS } from '../constants';
import type { ScanHistoryItem, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

/**
 * 读取扫描历史记录
 */
export function loadHistory(): ScanHistoryItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('读取历史记录失败:', e);
  }
  return [];
}

/**
 * 储存扫描历史记录
 */
export function saveHistory(history: ScanHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('储存历史记录失败:', e);
  }
}

/**
 * 清除所有历史记录
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SCAN_HISTORY);
  } catch (e) {
    console.error('清除历史记录失败:', e);
  }
}

/**
 * 读取应用设定
 */
export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 合并默认设定，确保新增的设定项有默认值
      return { ...getDefaultSettings(), ...parsed };
    }
  } catch (e) {
    console.error('读取设定失败:', e);
  }
  return getDefaultSettings();
}

/**
 * 储存应用设定
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('储存设定失败:', e);
  }
}

/**
 * 獲取預設設定
 */
function getDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

/**
 * 产生唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
