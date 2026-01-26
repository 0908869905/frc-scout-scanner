/**
 * FRC Scout Scanner - 扫描结果组件
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, QRTypeBadge } from '../ui/Badge';
import { MATCH_LEVEL_MAP, ALLIANCE_COLORS } from '../../constants';
import { parsePath } from '../../utils/decoder';
import { useI18n } from '../../i18n';
import type { DecodeResult, ValidationResult } from '../../types';

interface ScanResultProps {
  result: DecodeResult;
  validation?: ValidationResult;
  onConfirm: () => void;
  onDiscard: () => void;
}

export function ScanResult({
  result,
  validation,
  onConfirm,
  onDiscard,
}: ScanResultProps) {
  const { t } = useI18n();
  const { type, data, timestamp } = result;

  // 格式化显示值
  const formatValue = (key: string, value: string): React.ReactNode => {
    if (value === 'None' || value === '') return <span className="text-slate-500">-</span>;
    if (value === '1') return <Badge variant="success" size="sm">{t.common.yes}</Badge>;
    if (value === '0') return <Badge variant="default" size="sm">{t.common.no}</Badge>;

    // 特殊格式化
    if (key === 'matchLevel' && MATCH_LEVEL_MAP[value]) {
      return <span className="font-mono text-cyan-400">{MATCH_LEVEL_MAP[value]}</span>;
    }

    if (key === 'alliance') {
      const colors = ALLIANCE_COLORS[value as keyof typeof ALLIANCE_COLORS];
      if (colors) {
        return (
          <span
            className="px-2 py-0.5 rounded text-sm font-medium"
            style={{ backgroundColor: colors.background, color: colors.text }}
          >
            {value}
          </span>
        );
      }
    }

    if (key === 'teamNumber' || key === 'matchNumber') {
      return <span className="font-mono text-lg text-cyan-400 font-semibold">{value}</span>;
    }

    if (key.includes('Rating') || key === 'driverSkill') {
      const rating = parseInt(value, 10);
      return <RatingDisplay rating={rating} />;
    }

    return value;
  };

  // 获取标签
  const getLabel = (key: string): string => {
    return (t.fields as Record<string, string>)[key] || key;
  };

  // 重要栏位排序到前面
  const sortedEntries = Object.entries(data).sort(([a], [b]) => {
    const priority = ['teamNumber', 'matchNumber', 'alliance', 'eventCode'];
    const aIdx = priority.indexOf(a);
    const bIdx = priority.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });

  return (
    <Card glow className="mt-4">
      <CardHeader>
        <div className="flex items-center gap-3">
          <QRTypeBadge type={type} />
          {data.teamNumber && (
            <span className="text-xl font-bold text-white font-mono">
              Team {data.teamNumber}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </CardHeader>

      <CardContent>
        {/* 验证状态 */}
        {validation && (
          <div className="mb-4">
            {validation.isValid ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t.result.validationPassed}
              </div>
            ) : (
              <div className="text-red-400 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {validation.errors.length} {t.result.errors}
                </div>
                {validation.errors.slice(0, 3).map((err, i) => (
                  <p key={i} className="text-xs pl-6">{err.message}</p>
                ))}
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="text-amber-400 text-sm mt-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                  {validation.warnings.length} {t.result.warnings}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 数据表格 */}
        <div className="max-h-64 overflow-y-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <tbody>
              {sortedEntries.map(([key, value]) => (
                <tr key={key} className="border-b border-slate-700/50 last:border-0">
                  <td className="py-2 pr-4 text-slate-400 w-1/3">
                    {getLabel(key)}
                  </td>
                  <td className="py-2 text-white">
                    {key === 'autoPath' && value !== 'None' ? (
                      <PathPreview pathStr={value} />
                    ) : (
                      formatValue(key, value)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
          <Button variant="success" onClick={onConfirm} className="flex-1">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t.scan.save}
          </Button>
          <Button variant="danger" onClick={onDiscard} className="flex-1">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {t.scan.discard}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 评分显示
function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-amber-400' : 'text-slate-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-slate-400 text-xs ml-1">({rating}/5)</span>
    </div>
  );
}

// 路径预览
function PathPreview({ pathStr }: { pathStr: string }) {
  const { t } = useI18n();
  const points = parsePath(pathStr);

  if (points.length === 0) {
    return <span className="text-slate-500">{t.fields.noPath}</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 100 100"
        className="w-16 h-16 bg-slate-900 rounded border border-slate-600"
      >
        {/* 路径线 */}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
        />
        {/* 起点 */}
        <circle cx={points[0].x} cy={points[0].y} r="3" fill="#10b981" />
        {/* 终点 */}
        {points.length > 1 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3"
            fill="#ef4444"
          />
        )}
      </svg>
      <span className="text-xs text-slate-400">{points.length} {t.fields.points}</span>
    </div>
  );
}
