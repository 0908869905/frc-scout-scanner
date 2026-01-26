/**
 * FRC Scout Scanner - 待上传队列组件
 */

import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { QRTypeBadge } from '../ui/Badge';
import { useI18n } from '../../i18n';
import type { ScanHistoryItem } from '../../types';

interface UploadQueueProps {
  items: ScanHistoryItem[];
  onUploadAll: () => void;
  isUploading: boolean;
}

export function UploadQueue({ items, onUploadAll, isUploading }: UploadQueueProps) {
  const { t } = useI18n();
  const pendingItems = items.filter((item) => !item.uploaded);

  if (pendingItems.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{t.upload.pendingUpload}</CardTitle>
          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-sm font-medium">
            {pendingItems.length}
          </span>
        </div>
        <Button
          size="sm"
          onClick={onUploadAll}
          isLoading={isUploading}
          disabled={isUploading}
        >
          {t.upload.uploadAll}
        </Button>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {pendingItems.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 px-3 bg-slate-900/50 rounded-lg"
            >
              <QRTypeBadge type={item.qrType} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-mono truncate">
                  {item.data.teamNumber && `Team ${item.data.teamNumber}`}
                  {item.data.matchNumber && ` | #${item.data.matchNumber}`}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(item.scanTime).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {pendingItems.length > 5 && (
            <p className="text-xs text-slate-500 text-center py-2">
              +{pendingItems.length - 5} {t.history.moreItems}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
