/**
 * FRC Scout Scanner - 批次操作组件
 */

import { Button } from '../ui/Button';
import { useI18n } from '../../i18n';

interface BatchActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: (selected: boolean) => void;
  onDelete: () => void;
  onUpload: () => void;
  isUploading: boolean;
}

export function BatchActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onDelete,
  onUpload,
  isUploading,
}: BatchActionsProps) {
  const { t } = useI18n();
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded-lg">
      <div className="flex items-center gap-3">
        {/* 全选 */}
        <button
          onClick={() => onSelectAll(!allSelected)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <div
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center
              transition-colors duration-200
              ${allSelected
                ? 'bg-cyan-500 border-cyan-500'
                : 'border-slate-500 hover:border-cyan-500'
              }
            `}
          >
            {allSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          {t.history.selectAll}
        </button>

        {/* 选中数量 */}
        {selectedCount > 0 && (
          <span className="text-sm text-slate-400">
            {selectedCount} {t.history.selected}
          </span>
        )}
      </div>

      {/* 批次操作按钮 */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={onUpload}
            isLoading={isUploading}
            disabled={isUploading}
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {t.common.upload}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={onDelete}
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t.common.delete}
          </Button>
        </div>
      )}
    </div>
  );
}
