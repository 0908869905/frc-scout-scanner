/**
 * FRC Scout Scanner - 标签组件
 */

import { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import type { QRType } from '../../types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | QRType;

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<string, { bg: string; text: string; border: string }> = {
  default: {
    bg: 'bg-slate-700',
    text: 'text-slate-300',
    border: 'border-slate-600',
  },
  success: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/50',
  },
  warning: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/50',
  },
  error: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
  },
  info: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
  },
  match: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/50',
  },
  path: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/50',
  },
  'pit-path': {
    bg: 'bg-amber-600/20',
    text: 'text-amber-500',
    border: 'border-amber-600/50',
  },
  pit: {
    bg: 'bg-violet-500/20',
    text: 'text-violet-400',
    border: 'border-violet-500/50',
  },
  unknown: {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    border: 'border-slate-500/50',
  },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  className = '',
  size = 'md',
}: BadgeProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-medium rounded-md border
        ${styles.bg} ${styles.text} ${styles.border}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// 专门用于 QR 类型的标签
interface QRTypeBadgeProps {
  type: QRType;
  className?: string;
}

export function QRTypeBadge({ type, className = '' }: QRTypeBadgeProps) {
  const { t } = useI18n();
  const labels: Record<QRType, string> = {
    match: t.qrType.match,
    path: t.qrType.path,
    'pit-path': t.qrType.pitPath,
    pit: t.qrType.pit,
    'pit-external': t.qrType.pit,
    unknown: t.qrType.unknown,
  };

  return (
    <Badge variant={type} className={className}>
      {labels[type]}
    </Badge>
  );
}

// 上传状态标签
interface UploadStatusBadgeProps {
  uploaded: boolean;
  className?: string;
}

export function UploadStatusBadge({ uploaded, className = '' }: UploadStatusBadgeProps) {
  const { t } = useI18n();
  return (
    <Badge variant={uploaded ? 'success' : 'warning'} size="sm" className={className}>
      {uploaded ? t.history.uploaded : t.history.pending}
    </Badge>
  );
}
