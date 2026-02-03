/**
 * FRC Scout Scanner - 扫描页面
 */

import { useState, useCallback, useRef } from 'react';
import { Scanner, UploadQueue } from '../components/scanner';
import { validateData } from '../utils/validator';
import { getMatchKey, getPitPathKey, isValidDecodeResult } from '../utils/decoder';
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

  // 使用 ref 保持最新的 history，避免 handleScan 閉包中的 stale reference
  // （連續掃描多張 QR 時，閉包中的 history 可能還是上次 render 的舊值）
  const historyRef = useRef(history);
  historyRef.current = history;

  // 处理扫描结果 - 直接儲存，不需確認
  const handleScan = useCallback((result: DecodeResult) => {
    setError(null);
    const currentHistory = historyRef.current;

    // 驗證基本資料
    if (!isValidDecodeResult(result)) {
      // 顯示更詳細的錯誤訊息
      const fieldCount = result.raw?.length || 0;
      onShowToast('warning', `${t.result.incomplete} (欄位數: ${fieldCount})`);
      return;
    }

    const matchKey = result.type === 'pit-path'
      ? getPitPathKey(result.data)
      : getMatchKey(result.data);

    // 檢查 pit-path 是否需要合併到 pit-external
    if (result.type === 'pit-path') {
      const pitExtItem = currentHistory.find(
        (h) => h.qrType === 'pit-external' &&
               h.data.teamNumber === result.data.teamNumber
      );

      if (pitExtItem) {
        // 合併 autoPath 到 pit-external（多條路徑用分號分隔）
        const existingPath = pitExtItem.data.autoPath;
        const newPath = result.data.autoPath;
        const mergedPath = existingPath && existingPath !== 'None'
          ? `${existingPath};${newPath}`
          : newPath;

        const updatedHistory = currentHistory.map((h) =>
          h.id === pitExtItem.id
            ? { ...h, data: { ...h.data, autoPath: mergedPath } }
            : h
        );
        onUpdateHistory(updatedHistory);
        onShowToast('success', t.result.pitPathMerged);
        return;
      }

      // 找不到 pit-external，獨立保存為 pit-path
    }

    // 檢查 Path 是否需要配對到現有 Match
    if (result.type === 'path') {
      const matchItem = currentHistory.find(
        (h) => h.qrType === 'match' && h.matchKey === matchKey
      );

      if (matchItem) {
        // 將路徑數據合併到 Match
        const updatedHistory = currentHistory.map((h) =>
          h.id === matchItem.id
            ? { ...h, data: { ...h.data, autoPath: result.data.autoPath } }
            : h
        );
        onUpdateHistory(updatedHistory);
        onShowToast('success', t.result.pathMerged);
        return;
      }
    }

    // 檢查是否重複（相同 matchKey）— pit-path 不做重複檢查（允許多條路徑獨立存放）
    if (result.type !== 'pit-path') {
      const existingItem = currentHistory.find(
        (h) => h.qrType === result.type && h.matchKey === matchKey
      );
      if (existingItem) {
        onShowToast('info', `${result.type === 'match' ? 'Match' : 'Path'} ${result.data.teamNumber} #${result.data.matchNumber} ${t.result.alreadyExists || '已存在'}`);
        return;
      }
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
  }, [onAddHistory, onUpdateHistory, onShowToast, t.result]);

  // 处理扫描错误
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onShowToast('error', errorMessage);
  }, [onShowToast]);

  // 上传所有待上传的数据
  const handleUploadAll = useCallback(async () => {
    const currentHistory = historyRef.current;
    const pendingItems = currentHistory.filter((h) => !h.uploaded);
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

      const updatedHistory = historyRef.current.map((h) =>
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
  }, [onUpdateHistory, onShowToast, t.upload]);

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
