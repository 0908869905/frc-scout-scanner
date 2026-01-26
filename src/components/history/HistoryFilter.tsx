/**
 * FRC Scout Scanner - 历史记录筛选器
 */

import { Select } from '../ui/Input';
import { useI18n } from '../../i18n';
import type { QRType } from '../../types';

interface HistoryFilterProps {
  typeFilter: QRType | 'all';
  statusFilter: 'all' | 'uploaded' | 'pending';
  onTypeChange: (type: QRType | 'all') => void;
  onStatusChange: (status: 'all' | 'uploaded' | 'pending') => void;
}

export function HistoryFilter({
  typeFilter,
  statusFilter,
  onTypeChange,
  onStatusChange,
}: HistoryFilterProps) {
  const { t } = useI18n();

  const typeOptions = [
    { value: 'all', label: t.history.allTypes },
    { value: 'match', label: t.qrType.match },
    { value: 'path', label: t.qrType.path },
    { value: 'pit', label: t.qrType.pit },
  ];

  const statusOptions = [
    { value: 'all', label: t.history.allStatus },
    { value: 'uploaded', label: t.history.uploaded },
    { value: 'pending', label: t.history.pending },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="flex-1">
        <Select
          label={t.history.type}
          value={typeFilter}
          onChange={(v) => onTypeChange(v as QRType | 'all')}
          options={typeOptions}
        />
      </div>
      <div className="flex-1">
        <Select
          label={t.history.status}
          value={statusFilter}
          onChange={(v) => onStatusChange(v as 'all' | 'uploaded' | 'pending')}
          options={statusOptions}
        />
      </div>
    </div>
  );
}
