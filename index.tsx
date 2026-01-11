import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// Type definitions for external libraries loaded via CDN
declare global {
  interface Window {
    jsQR: (data: Uint8ClampedArray, width: number, height: number, options?: any) => any;
    LZString: {
      decompressFromBase64: (input: string) => string;
    };
  }
}

interface ScanRecord {
  id: number;
  timestamp: string;
  raw: string;
  parsed?: Record<string, string>;
  displayData: string;
  status: 'pending' | 'sending' | 'sent' | 'error';
  errorMsg?: string;
}

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error';
}

const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxvZZdYPFmvdZLgx1lM0VZru9S7xgRaViI3KOdljZDVqL05aBIgBJ84Pnb6WVhD5oky/exec';
const SCOUTING_PASS_URL = 'https://frc-ten.vercel.app/';

// FRC 2026 REBUILT Columns Definition (Matched to frc-ten.vercel.app)
const FRC_COLUMNS = [
  "scouterName", "eventCode", "matchLevel", "matchNumber", "robotPosition", "teamNumber",
  "autoLeave", "autoFuel", "autoTower",
  "teleFuel", "teleTower",
  "defenseRating", "driverRating", "speedRating",
  "defendedBy", "robotDied", "tippedOver",
  "comments"
];

// Helper to fix common split issues and align columns
const fixSplitData = (parts: string[]): string[] => {
  let newParts: string[] = [];
  
  // 2026 Logic: Handle "Level 2" or "Level 3" if split by spaces
  for (let i = 0; i < parts.length; i++) {
    const curr = parts[i];
    const next = parts[i + 1];
    
    // Check for "Level X" split
    if (curr === 'Level' && next && /^\d+$/.test(next)) {
      newParts.push(`${curr} ${next}`);
      i++;
    } else {
      newParts.push(curr);
    }
  }
  return newParts;
};

// Helper to parse data (supports TSV and Space-Separated)
const parseFrcData = (raw: string): Record<string, string> => {
  const trimmed = raw.trim();
  let parts: string[] = [];

  // Detect delimiter: simple heuristic, if it has tabs, assume TSV
  if (trimmed.includes('\t')) {
    parts = trimmed.split('\t');
  } else {
    parts = trimmed.split(/\s+/);
    // Only apply fixSplitData if we split by spaces (TSV shouldn't split 'Level 2')
    parts = fixSplitData(parts);
  }

  const data: Record<string, string> = {};

  FRC_COLUMNS.forEach((col, index) => {
    if (index < parts.length) {
      if (index === FRC_COLUMNS.length - 1) {
        // Last column (comments) - join remaining if space-separated, or just take last if TSV
        // For TSV, comments is just one field. For space-split, it might be fragmented.
        if (trimmed.includes('\t')) {
           data[col] = parts[index] || "";
        } else {
           data[col] = parts.slice(index).join(' ');
        }
      } else {
        data[col] = parts[index];
      }
    }
  });
  return data;
};

// Updated GAS Script for FRC 2026 REBUILT format
const GAS_SCRIPT_TEMPLATE = `// FRC Scout Data Handler
// 更新時間：${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
// 適用於 2026 REBUILT Game
// 包含: Base64 解碼

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); 

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    
    var timestamp = e.parameter.timestamp;
    var raw = e.parameter.raw;
    var jsonCols = e.parameter.jsonCols;
    
    // 1. 解析原始資料
    var cols = [];
    if (jsonCols) {
      try {
        var decoded = Utilities.newBlob(Utilities.base64Decode(jsonCols), 'application/json').getDataAsString();
        cols = JSON.parse(decoded);
      } catch (err) {
        cols = raw ? raw.trim().split(/\\s+/) : [];
      }
    } else {
      cols = raw ? raw.trim().split(/\\s+/) : [];
    }

    // 1.5 Fix Split (Handle "Level X")
    function fixFrcSplit(arr) {
      var res = [];
      for (var i = 0; i < arr.length; i++) {
        var curr = arr[i];
        var next = arr[i+1];
        if (curr === 'Level' && next && /^\\d+$/.test(next)) {
          res.push(curr + ' ' + next);
          i++; 
        } else {
          res.push(curr);
        }
      }
      return res;
    }

    var frcHeaders = ${JSON.stringify(FRC_COLUMNS)};

    if (cols.length > frcHeaders.length) {
       cols = fixFrcSplit(cols);
    }
    
    // 2. 處理最後欄位溢出 (Comments)
    if (cols.length > frcHeaders.length) {
      var commentStartIndex = frcHeaders.length - 1; 
      var commentParts = cols.slice(commentStartIndex);
      var combinedComment = commentParts.join(" ");
      
      cols = cols.slice(0, commentStartIndex);
      cols.push(combinedComment);
    }

    // 3. 動態建立 Header
    if (sheet.getLastRow() === 0) {
      var fullHeader = ["timestamp"].concat(frcHeaders);
      sheet.appendRow(fullHeader);
    }

    // 4. 寫入
    var rowData = [timestamp];
    if (cols && cols.length > 0) {
       for (var i = 0; i < cols.length; i++) {
         rowData.push(cols[i]);
       }
    } else {
       rowData.push(raw);
    }

    sheet.appendRow(rowData);

    return ContentService.createTextOutput(JSON.stringify({result: "success"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

const App = () => {
  // --- State ---
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Camera Zoom State
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1 });
  const [hasZoom, setHasZoom] = useState(false);

  // Settings
  const [scriptUrl, setScriptUrl] = useState(DEFAULT_SCRIPT_URL);
  const [useLZ, setUseLZ] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showScriptCode, setShowScriptCode] = useState(false);

  // Detail Modal State
  const [viewingRecord, setViewingRecord] = useState<ScanRecord | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);
  const isScanningRef = useRef(false);

  // --- Initialization ---
  useEffect(() => {
    const savedUrl = localStorage.getItem('frc_script_url');
    const savedLZ = localStorage.getItem('frc_use_lz') === 'true';
    const savedHistory = localStorage.getItem('frc_scan_history');

    if (savedUrl) {
      setScriptUrl(savedUrl);
      setShowSettings(false);
    }
    if (savedLZ) setUseLZ(savedLZ);
    if (savedHistory) {
      try {
        setScanHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    getCameras();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('frc_scan_history', JSON.stringify(scanHistory));
  }, [scanHistory]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showToast = (message: string, type: 'success' | 'warning' | 'error') => {
    setNotification({ id: Date.now(), message, type });
  };

  const getCameras = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0) {
        const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        setSelectedCamera(backCamera ? backCamera.deviceId : videoDevices[videoDevices.length - 1].deviceId);
      }
    } catch (err) {
      console.error("Error accessing camera", err);
    }
  };

  const saveSettings = () => {
    let cleanUrl = scriptUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http')) {
      alert("網址格式錯誤，請包含 https://");
      return;
    }
    setScriptUrl(cleanUrl);
    localStorage.setItem('frc_script_url', cleanUrl);
    localStorage.setItem('frc_use_lz', String(useLZ));
    setShowSettings(false);
    showToast("設定已儲存", "success");
  };

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_TEMPLATE).then(() => {
      showToast("程式碼已複製！", "success");
    });
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    if (!selectedCamera) return;

    try {
      if (streamRef.current) stopCamera();

      // Relaxed constraints: Removed 'min' to prevent startup failure on some devices.
      // Kept 'ideal' high to request best quality available.
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: selectedCamera },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          // @ts-ignore: focusMode is not standard but works on some devices
          advanced: [{ focusMode: "continuous" }]
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // --- Detect Zoom Capabilities ---
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities ? track.getCapabilities() : {} as any;

        // Check standard 'zoom' capability
        if ('zoom' in caps) {
          setHasZoom(true);
          setZoomRange({ min: caps.zoom.min, max: caps.zoom.max });
          setZoom(caps.zoom.min);
        } else {
          setHasZoom(false);
        }

        // Ensure video plays (Safari requirement)
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
        };

        setIsScanning(true);
        isScanningRef.current = true;
        requestRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Failed to start camera", err);
      showToast("啟動相機失敗 (Camera Error)", "error");
    }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      // @ts-ignore
      track.applyConstraints({ advanced: [{ zoom: newZoom }] }).catch(e => console.log('Zoom error', e));
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    isScanningRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current || !isScanningRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        // Keep canvas size 1:1 with video source for max resolution
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data) {
            handleScan(code.data);
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  // --- Data Handling ---
  // Generate unique key for record deduplication
  const generateRecordKey = (parsed: Record<string, string> | undefined, raw: string): string => {
    if (parsed && parsed.matchNumber && parsed.teamNumber && parsed.scouterName) {
      // Use match info as unique key: eventCode + matchLevel + matchNumber + teamNumber + scouterName
      return `${parsed.eventCode || ''}-${parsed.matchLevel || ''}-${parsed.matchNumber}-${parsed.teamNumber}-${parsed.scouterName}`;
    }
    // Fallback: use raw data hash (simple version - first 100 chars)
    return raw.substring(0, 100);
  };
  // Check if record already exists in history
  const isDuplicateRecord = (parsed: Record<string, string> | undefined, raw: string): ScanRecord | undefined => {
    const newKey = generateRecordKey(parsed, raw);
    return scanHistory.find(record => {
      const existingKey = generateRecordKey(record.parsed, record.raw);
      return existingKey === newKey;
    });
  };

  const handleScan = useCallback((data: string) => {
    const now = Date.now();
    const normalizedData = data.trim().replace(/(\r\n|\n|\r)/gm, "");


    let processedData = normalizedData;

    // Auto-detect LZString compression
    if (window.LZString) {
      try {
        const decompressed = window.LZString.decompressFromBase64(normalizedData);
        // If decompression returns a value (not null/empty)
        if (decompressed) {
          // Heuristic check:
          // 1. If 'useLZ' is manually checked, trust it.
          // 2. Or if raw data has NO spaces (typical for base64) AND decompressed data HAS spaces (typical for FRC format).
          const rawHasSpaces = normalizedData.includes(' ');
          const decompressedHasSpaces = decompressed.includes(' ');

          if (useLZ || (!rawHasSpaces && decompressedHasSpaces)) {
            processedData = decompressed;
          }
        }
      } catch (e) {
        console.warn("Decompression attempt failed", e);
      }
    }

    const parsed = parseFrcData(processedData);

    // Check for duplicate in history - silently skip if exists
    const existingRecord = isDuplicateRecord(parsed, processedData);
    if (existingRecord) {
      const matchInfo = parsed.matchNumber && parsed.teamNumber
        ? `${parsed.matchLevel || ''}${parsed.matchNumber} / Team ${parsed.teamNumber}`
        : '此 QR Code';
      showToast(`⚠️ 重複資料已略過: ${matchInfo}`, "warning");
      return;
    }

    showToast("掃描成功！ (Success)", "success");

    if (videoRef.current) {
      videoRef.current.classList.add('flash-effect');
      setTimeout(() => videoRef.current?.classList.remove('flash-effect'), 300);
    }

    let preview = "";
    // Only format if we have valid columns. 
    // Checking matchNumber and teamNumber ensures we don't display garbage for raw strings.
    if (parsed.scouterName && parsed.matchNumber && parsed.teamNumber) {
      preview = `${parsed.scouterName} | ${parsed.matchLevel}${parsed.matchNumber} | T:${parsed.teamNumber}`;
      if (parsed.comments) {
        const shortComment = parsed.comments.length > 8 ? parsed.comments.substring(0, 8) + '..' : parsed.comments;
        preview += ` | 💬 ${shortComment}`;
      }
    } else {
      preview = processedData.length > 50 ? processedData.substring(0, 50) + '...' : processedData;
    }

    const newRecord: ScanRecord = {
      id: now,
      timestamp: new Date().toLocaleTimeString(),
      raw: processedData,
      parsed: parsed,
      displayData: preview,
      status: 'pending'
    };

    setScanHistory(prev => [newRecord, ...prev]);

    uploadData(newRecord);
  }, [useLZ, scriptUrl, scanHistory]);

  const updateComment = (id: number, newComment: string) => {
    setScanHistory(prev => prev.map(r => {
      if (r.id === id) {
        const updatedParsed = r.parsed ? { ...r.parsed, comments: newComment } : undefined;
        return { ...r, parsed: updatedParsed };
      }
      return r;
    }));
  };

  const uploadData = async (record: ScanRecord) => {
    if (!scriptUrl) return;

    updateRecordStatus(record.id, 'sending');

    // 1. Prepare Columns based on current state (parsed or raw)
    let cols: string[] = [];
    if (record.parsed) {
      cols = FRC_COLUMNS.map(key => {
        const val = record.parsed![key];
        return val === undefined ? "" : val;
      });
    } else {
      const rawCols = record.raw.trim().split(/\s+/);
      cols = fixSplitData(rawCols);
    }

    // 2. Reconstruct "raw" to reflect edits for the sheet's raw column
    const simulatedRaw = cols.join(' ');

    // 3. Use URLSearchParams with Base64 Encoding
    // Base64 encoding is the most robust way to transmit unicode data via no-cors
    const params = new URLSearchParams();
    params.append('timestamp', new Date().toLocaleString());
    params.append('raw', simulatedRaw);

    // Encode JSON string to UTF-8 safe Base64
    const jsonString = JSON.stringify(cols);
    const base64Json = btoa(unescape(encodeURIComponent(jsonString)));

    params.append('jsonCols', base64Json);

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        body: params,
        mode: 'no-cors'
      });

      updateRecordStatus(record.id, 'sent');
    } catch (e: any) {
      console.error("Upload failed", e);
      updateRecordStatus(record.id, 'error', e.message || "Network Error");
    }
  };

  const updateRecordStatus = (id: number, status: ScanRecord['status'], errorMsg?: string) => {
    setScanHistory(prev => prev.map(r => r.id === id ? { ...r, status, errorMsg } : r));
  };

  const retryPending = () => {
    const pending = scanHistory.filter(r => r.status === 'pending' || r.status === 'error');
    if (pending.length === 0) return;

    if (confirm(`Retry uploading ${pending.length} records?`)) {
      pending.forEach(r => uploadData(r));
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all history? This cannot be undone.")) {
      setScanHistory([]);
    }
  };

  // --- Render ---
  return (
    <div className="app-container">
      {notification && (
        <div className={`toast-notification toast-${notification.type}`}>
          {notification.message}
        </div>
      )}

      <header>
        <h1>FRC Scout Scanner</h1>
        <div className="subtitle">Offline QR Scanner & Uploader</div>
        <div style={{ marginTop: '12px' }}>
          <a
            href={SCOUTING_PASS_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            🔗 開啟 Scouting PASS (QR 產生器)
          </a>
        </div>
      </header>

      {/* Settings Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">⚙️ 設定 (Settings)</h2>
          <button className="btn btn-outline btn-sm" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? '隱藏' : '展開'}
          </button>
        </div>

        {showSettings && (
          <div>
            <div className="input-group">
              <label>Google Apps Script URL</label>
              <input
                type="text"
                placeholder={DEFAULT_SCRIPT_URL}
                value={scriptUrl}
                onChange={e => setScriptUrl(e.target.value)}
              />
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                ⚠️ 請確保 Script 部署權限為 "Anyone" (任何人)
              </div>
            </div>

            <div className="input-group checkbox-wrapper">
              <input
                type="checkbox"
                id="lzCheck"
                checked={useLZ}
                onChange={e => setUseLZ(e.target.checked)}
              />
              <label htmlFor="lzCheck" style={{ marginBottom: 0 }}>啟用 LZ-String 解壓縮</label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSettings}>
                儲存設定
              </button>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '16px 0' }} />

            <div className="input-group">
              <button
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
                onClick={() => setShowScriptCode(!showScriptCode)}
              >
                {showScriptCode ? '隱藏' : '顯示'} FRC 專用後端程式碼
              </button>

              {showScriptCode && (
                <div style={{ marginTop: '8px', position: 'relative' }}>
                  <textarea
                    readOnly
                    value={GAS_SCRIPT_TEMPLATE}
                    style={{
                      width: '100%',
                      height: '200px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      background: '#f5f5f5',
                      border: '2px solid #eab308',
                      borderRadius: '4px',
                      padding: '8px'
                    }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ position: 'absolute', top: '10px', right: '10px' }}
                    onClick={copyScriptToClipboard}
                  >
                    複製
                  </button>
                  <div style={{ fontSize: '0.85rem', color: '#d97706', marginTop: '8px', fontWeight: 'bold' }}>
                    ⚠️ 重要：這次更新採用 Base64 編碼來解決亂碼問題，<br />請務必更新 Google Apps Script 並重新部署！
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Camera Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📷 掃描器</h2>
        </div>

        <div className="input-group">
          <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)}>
            {cameras.map(c => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label || `Camera ${c.deviceId.slice(0, 5)}...`}
              </option>
            ))}
          </select>
        </div>

        <div className="camera-container">
          <video ref={videoRef} playsInline muted></video>
          <canvas ref={canvasRef} hidden></canvas>
          {isScanning && <div className="scan-overlay"></div>}
          {!isScanning && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white' }}>相機已暫停</div>}
        </div>

        {hasZoom && isScanning && (
          <div className="zoom-control">
            <label htmlFor="zoomSlider">Zoom: {zoom.toFixed(1)}x</label>
            <input
              id="zoomSlider"
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step="0.1"
              value={zoom}
              onChange={handleZoomChange}
            />
          </div>
        )}

        <div className="camera-controls" style={{ marginTop: '12px' }}>
          {!isScanning ? (
            <button className="btn btn-primary" onClick={startCamera}>▶ 開始掃描</button>
          ) : (
            <button className="btn btn-danger" onClick={stopCamera}>⏹ 停止</button>
          )}
        </div>

        {scanHistory.length > 0 && (
          <div className="last-scan">
            <strong>最近一次有效掃描：</strong><br />
            {(() => {
              const currentRecord = scanHistory.length > 0 ? scanHistory[0] : null;

              if (!currentRecord || !currentRecord.parsed) return <div style={{ marginTop: '4px' }}>{currentRecord?.raw || ''}</div>;

              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>
                      {currentRecord.parsed.scouterName || 'Unknown'}
                    </span>
                    <span>|</span>
                    <span>{currentRecord.parsed.eventCode}</span>
                    <span>|</span>
                    <span>{currentRecord.parsed.matchLevel}{currentRecord.parsed.matchNumber}</span>
                    <span className={`status-badge status-${currentRecord.status === 'sending' ? 'pending' : currentRecord.status}`}>
                      {currentRecord.status === 'sent' ? '已送出' : currentRecord.status}
                    </span>
                  </div>

                  <div style={{ marginTop: '6px', padding: '8px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
                      評論 (Comments) - 可編輯:
                    </label>
                    <textarea
                      value={currentRecord.parsed.comments || ''}
                      onChange={(e) => updateComment(currentRecord.id, e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem'
                      }}
                      placeholder="輸入評論..."
                    />
                    <div style={{ textAlign: 'right', marginTop: '4px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => uploadData(currentRecord)}
                        disabled={currentRecord.status === 'sending'}
                      >
                        {currentRecord.status === 'sent' ? '更新並重傳' : '傳送'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Queue Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📊 數據隊列</h2>
          <div className="stats-bar">
            <span style={{ color: 'var(--warning)' }}>待傳: {scanHistory.filter(r => r.status === 'pending' || r.status === 'error').length}</span>
            <span style={{ color: 'var(--success)' }}>已傳: {scanHistory.filter(r => r.status === 'sent').length}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button className="btn btn-primary btn-sm" onClick={retryPending}>重試失敗項目</button>
          <button className="btn btn-outline btn-sm" onClick={clearHistory}>清空紀錄</button>
        </div>

        <div className="data-list">
          {scanHistory.length === 0 && <div style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>暫無資料</div>}
          {scanHistory.map(record => (
            <div key={record.id} className="data-item">
              <div className="data-info">
                <span className="data-preview">{record.displayData}</span>
                <span className="data-time">{record.timestamp}</span>
                {record.errorMsg && <span style={{ color: 'red', fontSize: '0.75rem' }}>{record.errorMsg}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <span className={`status-badge status-${record.status === 'sending' ? 'pending' : record.status}`}>
                  {record.status === 'sent' && '已送出'}
                  {record.status === 'pending' && '待送出'}
                  {record.status === 'sending' && '傳送中...'}
                  {record.status === 'error' && '失敗'}
                </span>
                <button className="btn btn-outline btn-sm" onClick={() => setViewingRecord(record)}>
                  🔍 詳細
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {viewingRecord && (
        <div className="modal-overlay" onClick={() => setViewingRecord(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>詳細資料 (Details)</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewingRecord(null)}>✕</button>
            </div>

            <div className="modal-body">
              {viewingRecord.parsed ? (
                <div className="detail-table">
                  {Object.entries(viewingRecord.parsed).map(([key, value]) => (
                    <div key={key} className="detail-row">
                      <span className="detail-label">{key}</span>
                      <span className="detail-value">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <h4>Raw Data:</h4>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f1f5f9', padding: '8px', borderRadius: '4px' }}>
                    {viewingRecord.raw}
                  </pre>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewingRecord(null)}>關閉</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);