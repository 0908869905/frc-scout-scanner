/**
 * FRC Scout Scanner - 扫描页面
 */

import { useState, useCallback } from 'react';
import { Scanner, ScanResult, UploadQueue } from '../components/scanner';
import { validateData } from '../utils/validator';
import { getMatchKey, isValidDecodeResult } from '../utils/decoder';
import { generateId } from '../utils/storage';
import { uploadBatch } from '../utils/sheets';
import { useI18n } from '../i18n';
import type { DecodeResult, ScanHistoryItem, ValidationResult } from '../types';

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
  const [lastScan, setLastScan] = useState<DecodeResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 处理扫描结果
  const handleScan = useCallback((result: DecodeResult) => {
    setError(null);
    setLastScan(result);

    // 验证数据
    const validationResult = validateData(result.type, result.data);
    setValidation(validationResult);

    if (!validationResult.isValid) {
      onShowToast('warning', `${validationResult.errors.length} ${t.result.errors}`);
    }
  }, [onShowToast, t.result.errors]);

  // 处理扫描错误
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onShowToast('error', errorMessage);
  }, [onShowToast]);

  // 确认储存扫描结果
  const handleConfirm = useCallback(() => {
    if (!lastScan) return;

    if (!isValidDecodeResult(lastScan)) {
      onShowToast('error', t.result.incomplete);
      return;
    }

    const matchKey = getMatchKey(lastScan.data);

    // 检查 Path 是否需要配对到现有 Match
    if (lastScan.type === 'path') {
      const matchItem = history.find(
        (h) => h.qrType === 'match' && h.matchKey === matchKey
      );
      if (matchItem) {
        // 将路径数据合并到 Match
        const updatedHistory = history.map((h) =>
          h.id === matchItem.id
            ? { ...h, data: { ...h.data, autoPath: lastScan.data.autoPath } }
            : h
        );
        onUpdateHistory(updatedHistory);
        onShowToast('success', t.result.pathMerged);
        setLastScan(null);
        setValidation(null);
        return;
      }
    }

    // 创建新的历史记录
    const newItem: ScanHistoryItem = {
      id: generateId(),
      qrType: lastScan.type,
      data: lastScan.data,
      scanTime: new Date().toISOString(),
      matchKey,
      uploaded: false,
      validationResult: validation || undefined,
    };

    onAddHistory(newItem);
    onShowToast('success', t.result.saved);
    setLastScan(null);
    setValidation(null);
  }, [lastScan, history, validation, onAddHistory, onUpdateHistory, onShowToast, t.result]);

  // 舍弃扫描结果
  const handleDiscard = useCallback(() => {
    setLastScan(null);
    setValidation(null);
    setError(null);
  }, []);

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

      {/* 扫描器 */}
      <Scanner
        onScan={handleScan}
        onError={handleError}
        isActive={!lastScan}
      />

      {/* 扫描结果预览 */}
      {lastScan && (
        <ScanResult
          result={lastScan}
          validation={validation || undefined}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
        />
      )}

      {/* 待上传队列 */}
      <UploadQueue
        items={history}
        onUploadAll={handleUploadAll}
        isUploading={isUploading}
      />
    </div>
  );
}
