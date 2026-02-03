/**
 * FRC Scout Scanner - Google Sheets 整合
 *
 * 與 Google Apps Script 配合使用
 * 支援 Match Data、Path Data、Pit Scouting 三種資料類型
 */

import type { UploadStatus, ScanHistoryItem, QRType } from '../types';
import { loadSettings } from './storage';

/**
 * 上傳 Payload 格式
 */
interface UploadPayload {
  type: QRType;
  data: Record<string, string>;
}

/**
 * 批次上傳 Payload 格式
 */
interface BatchUploadPayload {
  type: 'batch';
  data: Array<{
    type: QRType;
    data: Record<string, string>;
  }>;
}

/**
 * Apps Script 回應格式
 */
interface AppsScriptResponse {
  success: boolean;
  message?: string;
  error?: string;
  rowNumber?: number;
  timestamp?: string;
}

/**
 * 上傳單筆資料到 Google Sheets
 */
export async function uploadToSheets(
  type: QRType,
  data: Record<string, string>
): Promise<UploadStatus> {
  const settings = loadSettings();

  if (!settings.sheetsApiUrl) {
    return {
      success: false,
      message: '尚未設定 Google Sheets API URL',
      timestamp: Date.now(),
    };
  }

  // 過濾掉 unknown 類型
  if (type === 'unknown') {
    return {
      success: false,
      message: '無法上傳未知類型的資料',
      timestamp: Date.now(),
    };
  }

  // pit-external 轉換成 pit，pit-path 轉換成 path，Apps Script 用相同邏輯處理
  const uploadType = type === 'pit-external' ? 'pit' : type === 'pit-path' ? 'path' : type;

  const payload: UploadPayload = {
    type: uploadType,
    data: {
      ...data,
      scanTime: data.scanTime || new Date().toISOString(),  // Apps Script 期望 scanTime
    },
  };

  try {
    const response = await fetch(settings.sheetsApiUrl, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    let result: AppsScriptResponse;

    try {
      result = JSON.parse(text);
    } catch {
      return {
        success: false,
        message: '回應格式錯誤: ' + text.substring(0, 100),
        timestamp: Date.now(),
      };
    }

    if (result.success) {
      return {
        success: true,
        message: result.message || '上傳成功',
        timestamp: Date.now(),
      };
    } else {
      return {
        success: false,
        message: result.error || '上傳失敗',
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    console.error('[Upload] Error:', error);
    return {
      success: false,
      message: `上傳失敗: ${error instanceof Error ? error.message : '網路錯誤'}`,
      timestamp: Date.now(),
    };
  }
}

/**
 * 上傳歷史項目（自動偵測類型）
 */
export async function uploadHistoryItem(
  item: ScanHistoryItem
): Promise<UploadStatus> {
  return uploadToSheets(item.qrType, item.data);
}

/**
 * 批次上傳多筆資料（使用批次 API）
 */
export async function uploadBatch(items: ScanHistoryItem[]): Promise<{
  successful: number;
  failed: number;
  results: UploadStatus[];
}> {
  const settings = loadSettings();

  if (!settings.sheetsApiUrl) {
    return {
      successful: 0,
      failed: items.length,
      results: items.map(() => ({
        success: false,
        message: '尚未設定 Google Sheets API URL',
        timestamp: Date.now(),
      })),
    };
  }

  // 過濾掉 unknown 類型
  const validItems = items.filter(item => item.qrType !== 'unknown');
  const invalidCount = items.length - validItems.length;

  // 嘗試使用批次 API
  // 注意：pit-external 轉換成 pit，pit-path 轉換成 path，因為 Apps Script 用相同邏輯處理
  const payload: BatchUploadPayload = {
    type: 'batch',
    data: validItems.map(item => ({
      type: item.qrType === 'pit-external' ? 'pit' : item.qrType === 'pit-path' ? 'path' : item.qrType,
      data: {
        ...item.data,
        scanTime: item.scanTime || new Date().toISOString(),  // Apps Script 期望 scanTime
      },
    })),
  };

  try {
    const response = await fetch(settings.sheetsApiUrl, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    let result: { success: boolean };

    try {
      result = JSON.parse(text);
    } catch {
      result = { success: false };
    }

    if (result.success) {
      // 批次上傳成功
      const successResults = validItems.map(() => ({
        success: true,
        message: '上傳成功',
        timestamp: Date.now(),
      }));

      const invalidResults = Array(invalidCount).fill({
        success: false,
        message: '無法上傳未知類型的資料',
        timestamp: Date.now(),
      });

      return {
        successful: validItems.length,
        failed: invalidCount,
        results: [...successResults, ...invalidResults],
      };
    }
  } catch (error) {
    console.warn('Batch upload failed, falling back to individual uploads:', error);
  }

  // 批次 API 失敗，改為逐筆上傳
  return uploadBatchSequentially(items);
}

/**
 * 逐筆上傳（備用方案）
 */
async function uploadBatchSequentially(items: ScanHistoryItem[]): Promise<{
  successful: number;
  failed: number;
  results: UploadStatus[];
}> {
  const results: UploadStatus[] = [];
  let successful = 0;
  let failed = 0;

  for (const item of items) {
    const status = await uploadHistoryItem(item);
    results.push(status);

    if (status.success) {
      successful++;
    } else {
      failed++;
    }

    // 避免請求過快
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return { successful, failed, results };
}

/**
 * 測試 Google Sheets 連線
 */
export async function testConnection(url: string): Promise<{
  success: boolean;
  message: string;
  details?: AppsScriptResponse;
}> {
  if (!url) {
    return {
      success: false,
      message: '請輸入 API URL',
    };
  }

  // 驗證 URL 格式
  if (!url.startsWith('https://script.google.com/')) {
    return {
      success: false,
      message: 'URL 格式不正確，應以 https://script.google.com/ 開頭',
    };
  }

  try {
    // 發送 GET 請求測試連線
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
    });

    const text = await response.text();
    let result: AppsScriptResponse;

    try {
      result = JSON.parse(text);
    } catch {
      // 有回應但不是 JSON，可能是重定向頁面
      return {
        success: false,
        message: '回應格式錯誤，請確認 URL 是否正確部署',
      };
    }

    if (result.success) {
      return {
        success: true,
        message: result.message || '連線成功',
        details: result,
      };
    } else {
      return {
        success: false,
        message: result.error || '連線失敗',
        details: result,
      };
    }
  } catch (error) {
    // CORS 或網路錯誤
    return {
      success: false,
      message: `連線失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
    };
  }
}

/**
 * 發送測試資料
 */
export async function sendTestData(url: string): Promise<{
  success: boolean;
  message: string;
}> {
  const testPayload: UploadPayload = {
    type: 'match',
    data: {
      scouterName: 'Test User',
      eventCode: 'TEST',
      matchLevel: 'X',
      matchNumber: '0',
      alliance: 'Red',
      teamNumber: '0000',
      autoFuel: '0',
      autoClimbStatus: 'None',
      autoClimbTime: '0',
      teleFuel: '0',
      teleClimbStatus: 'None',
      teleClimbTime: '0',
      bumpTrenchCount: '0',
      fuelDroppedOnBump: '0',
      penaltyCount: '0',
      yellowCard: '0',
      redCard: '0',
      robotDied: '0',
      almostTipped: '0',
      ridingOnBall: '0',
      defenseRating: '0',
      driverSkill: '0',
      speedRating: '0',
      comments: 'This is a test entry',
      subjectiveNotes: 'None',
      autoPath: 'None',
      timestamp: new Date().toISOString(),
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(testPayload),
    });

    const text = await response.text();
    let result: AppsScriptResponse;

    try {
      result = JSON.parse(text);
    } catch {
      return {
        success: true,
        message: '測試請求已發送',
      };
    }

    if (result.success) {
      return {
        success: true,
        message: `測試成功！資料已寫入第 ${result.rowNumber} 列`,
      };
    } else {
      return {
        success: false,
        message: result.error || '測試失敗',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `測試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
    };
  }
}
