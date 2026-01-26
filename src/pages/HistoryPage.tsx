/**
 * FRC Scout Scanner - 历史记录页面
 */

import { useState, useCallback } from 'react';
import { HistoryList } from '../components/history';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { QRTypeBadge, UploadStatusBadge } from '../components/ui/Badge';
import {
  exportToCSV,
  exportAllToJSON,
  downloadFile,
  getExportFilename,
} from '../utils/exporter';
import { uploadBatch } from '../utils/sheets';
import { useI18n } from '../i18n';
import type { ScanHistoryItem } from '../types';

interface HistoryPageProps {
  history: ScanHistoryItem[];
  onUpdateHistory: (items: ScanHistoryItem[]) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export function HistoryPage({
  history,
  onUpdateHistory,
  onShowToast,
}: HistoryPageProps) {
  const { t } = useI18n();
  const [isUploading, setIsUploading] = useState(false);
  const [viewingItem, setViewingItem] = useState<ScanHistoryItem | null>(null);

  // 查看详情
  const handleView = useCallback((item: ScanHistoryItem) => {
    setViewingItem(item);
  }, []);

  // 删除
  const handleDelete = useCallback((ids: string[]) => {
    const updatedHistory = history.filter((h) => !ids.includes(h.id));
    onUpdateHistory(updatedHistory);
    onShowToast('success', t.common.deleted.replace('{count}', ids.length.toString()));
  }, [history, onUpdateHistory, onShowToast, t.common.deleted]);

  // 上传
  const handleUpload = useCallback(async (ids: string[]) => {
    const itemsToUpload = history.filter((h) => ids.includes(h.id) && !h.uploaded);
    if (itemsToUpload.length === 0) {
      onShowToast('info', t.upload.noItems);
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadBatch(itemsToUpload);

      // 更新上传状态
      const uploadedIds = new Set(
        itemsToUpload
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

  // 导出
  const handleExport = useCallback((format: 'csv' | 'json') => {
    if (history.length === 0) {
      onShowToast('info', t.export.noData);
      return;
    }

    if (format === 'json') {
      const content = exportAllToJSON(history);
      downloadFile(content, getExportFilename('all', 'json'), 'application/json');
      onShowToast('success', t.export.jsonSuccess);
    } else {
      // 分别导出各类型
      let exported = 0;

      const matchCSV = exportToCSV(history, 'match');
      if (matchCSV) {
        downloadFile(matchCSV, getExportFilename('match', 'csv'), 'text/csv');
        exported++;
      }

      const pathCSV = exportToCSV(history, 'path');
      if (pathCSV) {
        downloadFile(pathCSV, getExportFilename('path', 'csv'), 'text/csv');
        exported++;
      }

      const pitCSV = exportToCSV(history, 'pit');
      if (pitCSV) {
        downloadFile(pitCSV, getExportFilename('pit', 'csv'), 'text/csv');
        exported++;
      }

      if (exported > 0) {
        onShowToast('success', t.export.csvCount.replace('{count}', exported.toString()));
      } else {
        onShowToast('info', t.export.noData);
      }
    }
  }, [history, onShowToast, t.export]);

  return (
    <div>
      <HistoryList
        items={history}
        onView={handleView}
        onDelete={handleDelete}
        onUpload={handleUpload}
        onExport={handleExport}
        isUploading={isUploading}
      />

      {/* 详情弹窗 */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title={t.history.details}
      >
        {viewingItem && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="flex items-center gap-3">
              <QRTypeBadge type={viewingItem.qrType} />
              <UploadStatusBadge uploaded={viewingItem.uploaded} />
            </div>

            {/* 关键信息 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {viewingItem.data.teamNumber && (
                <div>
                  <span className="text-slate-400">{t.history.team}</span>
                  <p className="text-white font-mono font-bold">{viewingItem.data.teamNumber}</p>
                </div>
              )}
              {viewingItem.data.matchNumber && (
                <div>
                  <span className="text-slate-400">{t.history.match}</span>
                  <p className="text-white font-mono font-bold">#{viewingItem.data.matchNumber}</p>
                </div>
              )}
              {viewingItem.data.eventCode && (
                <div>
                  <span className="text-slate-400">{t.history.event}</span>
                  <p className="text-white font-mono">{viewingItem.data.eventCode}</p>
                </div>
              )}
              <div>
                <span className="text-slate-400">{t.history.scanTime}</span>
                <p className="text-white text-xs">{new Date(viewingItem.scanTime).toLocaleString()}</p>
              </div>
            </div>

            {/* 全部数据 */}
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(viewingItem.data).map(([key, value]) => (
                    <tr key={key} className="border-b border-slate-700/50 last:border-0">
                      <td className="py-1.5 pr-4 text-slate-400 w-1/3">
                        {(t.fields as Record<string, string>)[key] || key}
                      </td>
                      <td className="py-1.5 text-white">
                        {value === 'None' || value === '' ? (
                          <span className="text-slate-500">-</span>
                        ) : value === '1' ? (
                          t.common.yes
                        ) : value === '0' ? (
                          t.common.no
                        ) : (
                          value
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              {!viewingItem.uploaded && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleUpload([viewingItem.id]);
                    setViewingItem(null);
                  }}
                  isLoading={isUploading}
                >
                  {t.common.upload}
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  handleDelete([viewingItem.id]);
                  setViewingItem(null);
                }}
              >
                {t.common.delete}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
