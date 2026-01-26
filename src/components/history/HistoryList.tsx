/**
 * FRC Scout Scanner - 历史记录列表组件
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { HistoryFilter } from './HistoryFilter';
import { HistoryItem } from './HistoryItem';
import { BatchActions } from './BatchActions';
import { useI18n } from '../../i18n';
import type { ScanHistoryItem, QRType } from '../../types';

interface HistoryListProps {
  items: ScanHistoryItem[];
  onView: (item: ScanHistoryItem) => void;
  onDelete: (ids: string[]) => void;
  onUpload: (ids: string[]) => void;
  onExport: (format: 'csv' | 'json') => void;
  isUploading: boolean;
}

export function HistoryList({
  items,
  onView,
  onDelete,
  onUpload,
  onExport,
  isUploading,
}: HistoryListProps) {
  const { t } = useI18n();
  const [typeFilter, setTypeFilter] = useState<QRType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'uploaded' | 'pending'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 筛选后的项目
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.qrType !== typeFilter) return false;
      if (statusFilter === 'uploaded' && !item.uploaded) return false;
      if (statusFilter === 'pending' && item.uploaded) return false;
      return true;
    });
  }, [items, typeFilter, statusFilter]);

  // 选择处理
  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 批次操作
  const handleBatchDelete = () => {
    onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBatchUpload = () => {
    onUpload(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  // 统计
  const stats = useMemo(() => ({
    total: items.length,
    match: items.filter((i) => i.qrType === 'match').length,
    path: items.filter((i) => i.qrType === 'path').length,
    pit: items.filter((i) => i.qrType === 'pit').length,
    uploaded: items.filter((i) => i.uploaded).length,
    pending: items.filter((i) => !i.uploaded).length,
  }), [items]);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-slate-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-slate-400 text-lg mb-2">{t.history.noRecords}</p>
          <p className="text-slate-500 text-sm">{t.history.startScanning}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计 */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <StatCard label={t.history.total} value={stats.total} />
        <StatCard label={t.qrType.match} value={stats.match} color="cyan" />
        <StatCard label={t.qrType.path} value={stats.path} color="amber" />
        <StatCard label={t.qrType.pit} value={stats.pit} color="violet" />
        <StatCard label={t.history.uploaded} value={stats.uploaded} color="emerald" />
        <StatCard label={t.history.pending} value={stats.pending} color="amber" />
      </div>

      {/* 筛选器 */}
      <HistoryFilter
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        onTypeChange={setTypeFilter}
        onStatusChange={setStatusFilter}
      />

      {/* 批次操作 */}
      <BatchActions
        selectedCount={selectedIds.size}
        totalCount={filteredItems.length}
        onSelectAll={handleSelectAll}
        onDelete={handleBatchDelete}
        onUpload={handleBatchUpload}
        isUploading={isUploading}
      />

      {/* 列表 */}
      <Card padding="sm">
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              onSelect={handleSelect}
              onView={onView}
              onDelete={(id) => onDelete([id])}
            />
          ))}
        </div>
      </Card>

      {/* 导出按钮 */}
      <Card>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => onExport('csv')}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t.history.exportCSV}
          </Button>
          <Button variant="secondary" onClick={() => onExport('json')}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t.history.exportJSON}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// 统计卡片
function StatCard({
  label,
  value,
  color = 'slate',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    slate: 'text-slate-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
  };

  return (
    <div className="bg-slate-800 rounded-lg p-3 text-center">
      <p className={`text-2xl font-bold font-mono ${colorClasses[color]}`}>
        {value}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
