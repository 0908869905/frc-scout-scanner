/**
 * FRC Scout Scanner - 扫描页面
 */

import { useState, useCallback } from 'react';
import { Scanner, UploadQueue } from '../components/scanner';
import { validateData } from '../utils/validator';
import { getMatchKey, isValidDecodeResult } from '../utils/decoder';
import { generateId } from '../utils/storage';
import { uploadBatch } from '../utils/sheets';
import { useI18n } from '../i18n';
import type { DecodeResult, ScanHistoryItem } from '../types';

interface ScanPageProps {
  history: ScanHistoryItem[];
  onAddHistory: (item: ScanHistoryItem) => void;
  onUpdateHistory: (items: ScanHistoryItem[]) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export function ScanPage({
  history,
  onAddHistory,
  onUpdateHistory,
  onShowToast,
}: ScanPageProps) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 处理扫描结果 - 直接儲存，不需確認
  const handleScan = useCallback((result: DecodeResult) => {
    setError(null);

    // 驗證基本資料
    if (!isValidDecodeResult(result)) {
      onShowToast('warning', t.result.incomplete);
      return;
    }

    const matchKey = getMatchKey(result.data);

    // 檢查 Path 是否需要配對到現有 Match
    if (result.type === 'path') {
      console.log('[Path Merge] Path matchKey:', matchKey);
      console.log('[Path Merge] Path data:', result.data);
      console.log('[Path Merge] History matches:', history.filter(h => h.qrType === 'match').map(h => ({ id: h.id, matchKey: h.matchKey, data: h.data })));

      const matchItem = history.find(
        (h) => h.qrType === 'match' && h.matchKey === matchKey
      );

      if (matchItem) {
        console.log('[Path Merge] Found match:', matchItem.id);
        console.log('[Path Merge] Original match data:', matchItem.data);
        console.log('[Path Merge] Adding autoPath:', result.data.autoPath);

        // 將路徑數據合併到 Match
        const updatedHistory = history.map((h) =>
          h.id === matchItem.id
            ? { ...h, data: { ...h.data, autoPath: result.data.autoPath } }
            : h
        );

        // 確認合併後的數據
        const mergedItem = updatedHistory.find(h => h.id === matchItem.id);
        console.log('[Path Merge] Merged match data:', mergedItem?.data);
        console.log('[Path Merge] autoPath in merged:', mergedItem?.data?.autoPath);

        onUpdateHistory(updatedHistory);
        onShowToast('success', t.result.pathMerged);
        return;
      } else {
        console.log('[Path Merge] No matching Match found!');
      }
    }

    // 檢查是否重複（相同 matchKey）
    const existingItem = history.find(
      (h) => h.qrType === result.type && h.matchKey === matchKey
    );
    if (existingItem) {
      onShowToast('info', `${result.type === 'match' ? 'Match' : 'Path'} ${result.data.teamNumber} #${result.data.matchNumber} ${t.result.alreadyExists || '已存在'}`);
      return;
    }

    // 驗證數據
    const validationResult = validateData(result.type, result.data);

    // 直接創建新的歷史記錄
    const newItem: ScanHistoryItem = {
      id: generateId(),
      qrType: result.type,
      data: result.data,
      scanTime: new Date().toISOString(),
      matchKey,
      uploaded: false,
      validationResult: validationResult || undefined,
    };

    onAddHistory(newItem);

    // 簡短提示
    const teamNum = result.data.teamNumber || '?';
    const matchNum = result.data.matchNumber || '?';
    onShowToast('success', `✓ ${teamNum} #${matchNum}`);
  }, [history, onAddHistory, onUpdateHistory, onShowToast, t.result]);

  // 处理扫描错误
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onShowToast('error', errorMessage);
  }, [onShowToast]);

  // 上传所有待上传的数据
  const handleUploadAll = useCallback(async () => {
    const pendingItems = history.filter((h) => !h.uploaded);
    if (pendingItems.length === 0) {
      onShowToast('info', t.upload.noItems);
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadBatch(pendingItems);

      // 更新上传状态
      const uploadedIds = new Set(
        pendingItems
          .filter((_, i) => result.results[i]?.success)
          .map((h) => h.id)
      );

      const updatedHistory = history.map((h) =>
        uploadedIds.has(h.id)
          ? { ...h, uploaded: true, uploadTime: new Date().toISOString() }
          : h
      );

      onUpdateHistory(updatedHistory);

      if (result.failed > 0) {
        onShowToast('warning', `${t.upload.complete}: ${result.successful} ${t.upload.success}, ${result.failed} ${t.upload.failed}`);
      } else {
        onShowToast('success', t.upload.successCount.replace('{count}', result.successful.toString()));
      }
    } catch (e) {
      onShowToast('error', e instanceof Error ? e.message : t.upload.uploadFailed);
    } finally {
      setIsUploading(false);
    }
  }, [history, onUpdateHistory, onShowToast, t.upload]);

  return (
    <div className="space-y-4">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 扫描器 - 持續開啟 */}
      <Scanner
        onScan={handleScan}
        onError={handleError}
        isActive={true}
      />

      {/* 待上传队列 */}
      <UploadQueue
        items={history}
        onUploadAll={handleUploadAll}
        isUploading={isUploading}
      />
    </div>
  );
}
