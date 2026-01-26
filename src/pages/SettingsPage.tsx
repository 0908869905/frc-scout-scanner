/**
 * FRC Scout Scanner - 设定页面
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Toggle, Select } from '../components/ui/Input';
import { ConfirmModal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { loadSettings, saveSettings, clearHistory } from '../utils/storage';
import { testConnection } from '../utils/sheets';
import { useI18n } from '../i18n';
import type { AppSettings } from '../types';

interface SettingsPageProps {
  historyCount: number;
  onClearHistory: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export function SettingsPage({
  historyCount,
  onClearHistory,
  onShowToast,
}: SettingsPageProps) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 储存设定变更
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // 更新单一设定
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 测试连线
  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setConnectionStatus('unknown');

    try {
      const result = await testConnection(settings.sheetsApiUrl);
      setConnectionStatus(result.success ? 'success' : 'error');
      onShowToast(result.success ? 'success' : 'error', result.message);
    } catch (e) {
      setConnectionStatus('error');
      onShowToast('error', t.upload.connectionFailed);
    } finally {
      setIsTesting(false);
    }
  }, [settings.sheetsApiUrl, onShowToast, t.upload.connectionFailed]);

  // 清除历史
  const handleClearHistory = useCallback(() => {
    clearHistory();
    onClearHistory();
    setShowClearConfirm(false);
    onShowToast('success', t.settings.historyCleared);
  }, [onClearHistory, onShowToast, t.settings.historyCleared]);

  return (
    <div className="space-y-6">
      {/* Google Sheets 设定 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.sheetsApi}</CardTitle>
          {connectionStatus !== 'unknown' && (
            <Badge variant={connectionStatus === 'success' ? 'success' : 'error'}>
              {connectionStatus === 'success' ? t.settings.connected : t.settings.failed}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label={t.settings.sheetsUrl}
            value={settings.sheetsApiUrl}
            onChange={(e) => updateSetting('sheetsApiUrl', e.target.value)}
            placeholder="https://script.google.com/macros/s/..."
            hint={t.settings.sheetsUrlHint}
          />
          <Button
            variant="secondary"
            onClick={handleTestConnection}
            isLoading={isTesting}
            disabled={!settings.sheetsApiUrl || isTesting}
          >
            {t.settings.testConnection}
          </Button>
        </CardContent>
      </Card>

      {/* 导出设定 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.exportSettings}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label={t.settings.defaultFormat}
            value={settings.defaultExportFormat}
            onChange={(v) => updateSetting('defaultExportFormat', v as 'csv' | 'json')}
            options={[
              { value: 'csv', label: 'CSV' },
              { value: 'json', label: 'JSON' },
            ]}
          />
          <Toggle
            label={t.settings.includeHeaders}
            description={t.settings.includeHeadersDesc}
            checked={settings.includeHeaders}
            onChange={(v) => updateSetting('includeHeaders', v)}
          />
          <Select
            label={t.settings.timeFormat}
            value={settings.timeFormat}
            onChange={(v) => updateSetting('timeFormat', v as 'iso' | 'locale')}
            options={[
              { value: 'iso', label: 'ISO 8601 (2026-01-26T12:34:56)' },
              { value: 'locale', label: t.settings.localFormat },
            ]}
          />
        </CardContent>
      </Card>

      {/* 扫描设定 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.scanSettings}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Toggle
            label={t.settings.autoUpload}
            description={t.settings.autoUploadDesc}
            checked={settings.autoUpload}
            onChange={(v) => updateSetting('autoUpload', v)}
          />
          <Toggle
            label={t.settings.playSound}
            description={t.settings.playSoundDesc}
            checked={settings.playSound}
            onChange={(v) => updateSetting('playSound', v)}
          />
          <Toggle
            label={t.settings.vibrate}
            description={t.settings.vibrateDesc}
            checked={settings.vibrate}
            onChange={(v) => updateSetting('vibrate', v)}
          />
        </CardContent>
      </Card>

      {/* 数据管理 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.dataManagement}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-slate-300">{t.settings.scanHistory}</span>
              <p className="text-xs text-slate-500">{historyCount} {t.settings.recordsStored}</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={historyCount === 0}
            >
              {t.history.clearAll}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.about}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">FRC Scout Scanner</h2>
            <p className="text-slate-400 text-sm mb-4">{t.settings.version} 1.0.0</p>
            <p className="text-slate-500 text-sm">
              {t.settings.builtFor}
            </p>
            <p className="text-slate-600 text-xs mt-2">
              {t.settings.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 确认对话框 */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearHistory}
        title={t.settings.clearConfirmTitle}
        message={t.settings.clearConfirmMessage.replace('{count}', historyCount.toString())}
        confirmText={t.history.clearAll}
        cancelText={t.common.cancel}
        variant="danger"
      />
    </div>
  );
}
