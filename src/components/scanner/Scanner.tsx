/**
 * FRC Scout Scanner - QR 掃描器元件
 * 修復 React StrictMode 雙重掛載導致的鏡頭問題
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { decodeQR } from '../../utils/decoder';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useI18n } from '../../i18n';
import type { DecodeResult } from '../../types';

interface ScannerProps {
  onScan: (result: DecodeResult) => void;
  onError: (error: string) => void;
  isActive?: boolean;
}

export function Scanner({ onScan, onError, isActive = true }: ScannerProps) {
  const { t } = useI18n();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  // 使用 ref 追蹤初始化狀態，避免 StrictMode 雙重掛載問題
  const isInitializingRef = useRef(false);
  const isMountedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // 處理掃描成功
  const handleScanSuccess = useCallback((decodedText: string) => {
    try {
      const result = decodeQR(decodedText);

      // 播放音效和震動
      playSuccessSound();
      triggerVibration();

      onScan(result);

      // 暫停掃描
      if (scannerRef.current) {
        try {
          scannerRef.current.pause();
          setIsPaused(true);
        } catch (e) {
          console.warn('Failed to pause scanner:', e);
        }
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : t.scan.decodeFailed);
    }
  }, [onScan, onError, t.scan.decodeFailed]);

  // 初始化掃描器
  useEffect(() => {
    // 標記元件已掛載
    isMountedRef.current = true;

    // 如果不活躍，清理掃描器
    if (!isActive) {
      const cleanup = async () => {
        if (scannerRef.current) {
          try {
            await scannerRef.current.clear();
          } catch (e) {
            console.warn('Failed to clear scanner:', e);
          }
          scannerRef.current = null;
        }
        if (isMountedRef.current) {
          setIsInitialized(false);
          setIsPaused(false);
          setCameraError(null);
        }
        isInitializingRef.current = false;
      };
      cleanup();
      return;
    }

    // 避免重複初始化（處理 StrictMode 雙重掛載）
    if (isInitializingRef.current || scannerRef.current) {
      console.log('[Scanner] Already initializing or initialized, skipping');
      return;
    }

    isInitializingRef.current = true;
    console.log('[Scanner] Starting initialization...');

    // 延遲初始化，確保 DOM 已渲染且前一個實例已清理
    const initTimer = setTimeout(async () => {
      // 確保 DOM 元素存在
      const readerElement = document.getElementById('qr-reader');
      if (!readerElement) {
        console.error('[Scanner] Reader element not found');
        isInitializingRef.current = false;
        return;
      }

      // 清空容器內容（防止殘留的 html5-qrcode 元素）
      readerElement.innerHTML = '';

      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            // 使用動態 qrbox，覆蓋整個鏡頭範圍
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // 使用 90% 的視窗範圍作為掃描區域
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.floor(minEdge * 0.9);
              return { width: size, height: size };
            },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            rememberLastUsedCamera: true,
            aspectRatio: 1.333, // 4:3 比例更適合手機相機
            showTorchButtonIfSupported: true,
            videoConstraints: {
              facingMode: 'environment', // 優先使用後置相機
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          /* verbose= */ false
        );

        scanner.render(
          handleScanSuccess,
          (errorMessage: string) => {
            // 只處理嚴重錯誤 - 錯誤訊息將在渲染時獲取
            if (errorMessage.includes('NotFoundError')) {
              setCameraError('cameraNotFound');
              onError('Camera not found');
            } else if (errorMessage.includes('NotAllowedError')) {
              setCameraError('cameraPermissionDenied');
              onError('Camera permission denied');
            }
            // 忽略一般的掃描錯誤（如無法識別的 QR Code）
          }
        );

        scannerRef.current = scanner;

        if (isMountedRef.current) {
          setIsInitialized(true);
          setCameraError(null);
        }
        console.log('[Scanner] Initialization complete');
      } catch (e) {
        console.error('[Scanner] Failed to initialize:', e);
        isInitializingRef.current = false;
        if (isMountedRef.current) {
          setCameraError('cameraInitFailed');
        }
      }
    }, 300); // 增加延遲時間以確保 DOM 穩定

    // 清理函式
    return () => {
      console.log('[Scanner] Cleanup triggered');
      isMountedRef.current = false;
      clearTimeout(initTimer);

      // 非同步清理掃描器
      const cleanupScanner = async () => {
        if (scannerRef.current) {
          try {
            await scannerRef.current.clear();
            console.log('[Scanner] Scanner cleared');
          } catch (e) {
            console.warn('[Scanner] Failed to clear scanner:', e);
          }
          scannerRef.current = null;
        }
        isInitializingRef.current = false;
      };
      cleanupScanner();
    };
  }, [isActive, handleScanSuccess, onError]);

  // 恢復掃描
  const resumeScanning = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
        setIsPaused(false);
      } catch (e) {
        console.warn('Failed to resume scanner:', e);
        // 如果恢復失敗，嘗試重新初始化
        handleRetry();
      }
    }
  };

  // 重試初始化
  const handleRetry = () => {
    // 清理現有掃描器
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    isInitializingRef.current = false;
    setIsInitialized(false);
    setIsPaused(false);
    setCameraError(null);
  };

  return (
    <Card className="overflow-hidden" padding="none">
      {/* 掃描器視窗 */}
      <div className="relative">
        <div
          id="qr-reader"
          className="w-full"
          style={{ minHeight: '300px' }}
        />

        {/* 掃描線動畫 - 全範圍掃描 */}
        {isInitialized && !isPaused && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
            <div className="w-full h-full max-w-[90%] max-h-[90%] relative">
              {/* 四個角 */}
              <div className="absolute top-0 left-0 w-12 h-12 border-l-3 border-t-3 border-cyan-400" style={{ borderWidth: '3px' }} />
              <div className="absolute top-0 right-0 w-12 h-12 border-r-3 border-t-3 border-cyan-400" style={{ borderWidth: '3px' }} />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-l-3 border-b-3 border-cyan-400" style={{ borderWidth: '3px' }} />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-r-3 border-b-3 border-cyan-400" style={{ borderWidth: '3px' }} />

              {/* 掃描線 */}
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent scan-line opacity-70" />
            </div>
          </div>
        )}
      </div>

      {/* 相機錯誤訊息 */}
      {cameraError && (
        <div className="p-4 bg-red-900/30 border-t border-red-700">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-400 text-sm">
                {(t.scan as Record<string, string>)[cameraError] || cameraError}
              </p>
            </div>
          </div>
          <Button
            onClick={handleRetry}
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
          >
            {t.scan.retry}
          </Button>
        </div>
      )}

      {/* 控制按鈕 */}
      {isInitialized && !cameraError && (
        <div className="p-4 border-t border-slate-700 flex justify-center gap-3">
          {isPaused ? (
            <Button onClick={resumeScanning} variant="primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.scan.continue}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-sm">{t.scan.scanning}</span>
            </div>
          )}
        </div>
      )}

      {/* 載入中狀態 */}
      {!isInitialized && isActive && !cameraError && (
        <div className="p-8 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">{t.scan.initCamera}</p>
        </div>
      )}
    </Card>
  );
}

// 播放成功音效
function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 100);
  } catch (e) {
    // 忽略音效错误
  }
}

// 触发震动
function triggerVibration() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  } catch (e) {
    // 忽略震动错误
  }
}
