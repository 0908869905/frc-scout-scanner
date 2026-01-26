/**
 * FRC Scout Scanner - 单笔历史记录组件
 */

import { QRTypeBadge, UploadStatusBadge } from '../ui/Badge';
import type { ScanHistoryItem } from '../../types';

interface HistoryItemProps {
  item: ScanHistoryItem;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onView: (item: ScanHistoryItem) => void;
  onDelete: (id: string) => void;
}

export function HistoryItem({
  item,
  isSelected,
  onSelect,
  onView,
  onDelete,
}: HistoryItemProps) {
  const getDisplayInfo = () => {
    const { data, qrType } = item;
    if (qrType === 'match' || qrType === 'path') {
      return {
        primary: `Team ${data.teamNumber || '?'}`,
        secondary: `${data.eventCode || '?'} | #${data.matchNumber || '?'}`,
      };
    }
    if (qrType === 'pit') {
      return {
        primary: `Team ${data.teamNumber || '?'}`,
        secondary: data.eventCode || '?',
      };
    }
    return {
      primary: 'Unknown',
      secondary: item.matchKey,
    };
  };

  const info = getDisplayInfo();

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg
        transition-colors duration-200 cursor-pointer
        ${isSelected ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-slate-800 hover:bg-slate-700/50 border border-transparent'}
      `}
      onClick={() => onView(item)}
    >
      {/* 勾选框 */}
      <div
        className="shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id, !isSelected);
        }}
      >
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            transition-colors duration-200
            ${isSelected
              ? 'bg-cyan-500 border-cyan-500'
              : 'border-slate-500 hover:border-cyan-500'
            }
          `}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* 类型标签 */}
      <QRTypeBadge type={item.qrType} />

      {/* 资讯 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white font-mono truncate">
          {info.primary}
        </p>
        <p className="text-xs text-slate-400 truncate">
          {info.secondary}
        </p>
      </div>

      {/* 状态和时间 */}
      <div className="shrink-0 text-right">
        <UploadStatusBadge uploaded={item.uploaded} />
        <p className="text-xs text-slate-500 mt-1">
          {new Date(item.scanTime).toLocaleTimeString()}
        </p>
      </div>

      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="shrink-0 p-1 text-slate-500 hover:text-red-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
