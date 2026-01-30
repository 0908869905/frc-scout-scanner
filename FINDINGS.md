# FRC Scout Scanner - 研究發現記錄

> 此檔案記錄開發過程中的技術發現、解決方案和學習筆記。

---

## 目錄

1. [QR Code 資料格式](#qr-code-資料格式)
2. [LZ-String 壓縮](#lz-string-壓縮)
3. [html5-qrcode 使用](#html5-qrcode-使用)
4. [React StrictMode 問題](#react-strictmode-問題)
5. [Google Sheets API](#google-sheets-api)
6. [i18n 國際化](#i18n-國際化)

---

## QR Code 資料格式

### 發現日期：2026-01-26

**來源**：SCANNER_INTEGRATION.md v1.0.0

### 編碼流程

```
原始資料 → TSV 字串 → LZ-String Base64 壓縮 → QR Code
```

### 解碼流程

```
QR Code → LZ-String Base64 解壓 → TSV 字串 → 陣列/物件
```

### TSV 格式說明

- 欄位分隔符：`\t` (Tab)
- 布林值：`"1"` = true, `"0"` = false
- 空值：`"None"`
- 路徑格式：`x1,y1|x2,y2|x3,y3|...`

### 資料類型判斷

```typescript
function detectQRType(values: string[]): 'match' | 'path' | 'pit' | 'unknown' {
  if (values.length === 25) return 'match';
  if (values.length === 4) return 'path';
  if (values.length === 13) return 'pit';
  return 'unknown';
}
```

### Schema 定義演進

#### v1.0.0 (初始版本)
| 類型 | 欄位數 | 說明 |
|------|--------|------|
| Match Data | 25 | scouterName → subjectiveNotes（不含 autoPath） |
| Path Data | 4 | eventCode, matchNumber, teamNumber, autoPath |
| Pit Scouting | 13 | scouterName → pitAutoNotes |

#### v1.1.0
| 類型 | 欄位數 | 變更 |
|------|--------|------|
| Match Data | 24 | 移除 autoFuel/teleFuel/subjectiveNotes，新增 autoClimbSide/teleClimbSide |

#### v1.2.0
| 類型 | 欄位數 | 變更 |
|------|--------|------|
| Match Data | 22 | 新增 autoClimbPosition/teleClimbPosition，移除 defenseRating/driverSkill/speedRating |

#### v1.3.0 (目前版本)
| 類型 | 欄位數 | 變更 |
|------|--------|------|
| Match Data | 20 | 移除 autoClimbSide/teleClimbSide，climbPosition 合併為 5 選項 |
| Path Data | 4 | 無變更 |
| Pit Scouting | 13 | 無變更 |
| Pit External | 23 | 新增 FRC6998 Pit Collect 格式 |

---

## LZ-String 壓縮

### 發現日期：2026-01-26

**套件**：`lz-string`

### 基本用法

```typescript
import LZString from 'lz-string';

// 壓縮（Scouting App 使用）
const compressed = LZString.compressToBase64(tsvString);

// 解壓（Scanner 使用）
const decompressed = LZString.decompressFromBase64(qrContent);
```

### 注意事項

- `decompressFromBase64` 失敗時返回 `null`，需要檢查
- Base64 URL 安全編碼避免 QR Code 問題
- TypeScript 需要 `@types/lz-string` 或自定義類型聲明

---

## html5-qrcode 使用

### 發現日期：2026-01-26

**套件**：`html5-qrcode`

### 基本設定

```typescript
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

const scanner = new Html5QrcodeScanner(
  'qr-reader',  // DOM 元素 ID
  {
    fps: 10,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      // 動態計算掃描框大小（90% viewport）
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const size = Math.floor(minEdge * 0.9);
      return { width: size, height: size };
    },
    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
    rememberLastUsedCamera: true,
    aspectRatio: 1.333,  // 4:3 比例適合手機
    showTorchButtonIfSupported: true,
    videoConstraints: {
      facingMode: 'environment',  // 優先後置相機
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },
  false  // verbose
);

scanner.render(onScanSuccess, onScanError);
```

### 最佳實踐

1. **使用動態 qrbox**：不要固定大小，用 90% viewport 覆蓋更大範圍
2. **優先後置相機**：`facingMode: 'environment'` 掃描更穩定
3. **清理時機**：元件卸載時務必呼叫 `scanner.clear()`
4. **錯誤處理**：區分嚴重錯誤（權限拒絕）和一般錯誤（無法識別）

---

## React StrictMode 問題

### 發現日期：2026-01-26

**問題**：在 React StrictMode 下，元件會雙重掛載，導致 html5-qrcode 初始化兩次，造成相機無法顯示。

### 症狀

- 相機已授權但畫面空白
- Console 顯示初始化被呼叫兩次
- 清理函式執行順序混亂

### 解決方案

使用 ref 追蹤初始化狀態，避免重複初始化：

```typescript
const scannerRef = useRef<Html5QrcodeScanner | null>(null);
const isInitializingRef = useRef(false);
const isMountedRef = useRef(false);

useEffect(() => {
  isMountedRef.current = true;

  // 避免重複初始化
  if (isInitializingRef.current || scannerRef.current) {
    return;
  }

  isInitializingRef.current = true;

  // 延遲初始化，確保 DOM 穩定
  const initTimer = setTimeout(() => {
    // 清空容器（防止殘留元素）
    const element = document.getElementById('qr-reader');
    if (element) element.innerHTML = '';

    // 初始化掃描器...
  }, 300);

  return () => {
    isMountedRef.current = false;
    clearTimeout(initTimer);
    // 非同步清理掃描器
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    isInitializingRef.current = false;
  };
}, []);
```

### 關鍵要點

1. 使用 `useRef` 而非 `useState` 追蹤初始化狀態（避免觸發重渲染）
2. 增加延遲讓 DOM 穩定
3. 初始化前清空容器內容
4. 清理時檢查 mounted 狀態

---

## Google Sheets API

### 發現日期：2026-01-26

**方案**：Google Apps Script Web App

### Apps Script 結構

```javascript
// doGet - 測試連線
function doGet(e) {
  return createJsonResponse({ success: true, message: 'API is running' });
}

// doPost - 接收資料
function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  // payload.type: 'match' | 'path' | 'pit' | 'batch'
  // payload.data: Record<string, string>
}
```

### API 格式

**請求**：
```json
{
  "type": "match",
  "data": {
    "scouterName": "John",
    "eventCode": "2026MSLR",
    ...
  }
}
```

**回應**：
```json
{
  "success": true,
  "message": "Added new match record at row 2",
  "rowNumber": 2,
  "timestamp": "2026-01-26T12:00:00.000Z"
}
```

### 功能特色

1. **自動合併 Path**：Path QR 會自動合併到對應 Match 的 autoPath 欄位
2. **防止重複**：相同 eventCode + matchNumber + teamNumber 會更新而非新增
3. **批次上傳**：type: 'batch' 支援一次上傳多筆
4. **錯誤記錄**：自動記錄到 Error Log 工作表

### 部署注意事項

- 部署時選擇「所有人」可存取
- 每次修改後需重新部署（新版本）
- URL 格式：`https://script.google.com/macros/s/xxx/exec`

---

## i18n 國際化

### 發現日期：2026-01-26

**實作方式**：React Context + localStorage

### 架構

```
src/i18n/
├── index.ts          # 導出入口
├── context.tsx       # I18nProvider + useI18n hook
└── locales/
    ├── zh-TW.ts      # 繁體中文
    └── en.ts         # English
```

### 使用方式

```typescript
// 在元件中使用
import { useI18n } from '../i18n';

function MyComponent() {
  const { t, locale, toggleLocale } = useI18n();

  return (
    <div>
      <p>{t.nav.scan}</p>
      <button onClick={toggleLocale}>
        {locale === 'zh-TW' ? '中' : 'EN'}
      </button>
    </div>
  );
}
```

### 最佳實踐

1. 語言設定存儲在 localStorage（key: `frc-scanner-locale`）
2. 預設語言：繁體中文
3. 使用 TypeScript 確保所有翻譯鍵值存在
4. 語言切換按鈕放在導航欄方便存取

---

## 常見問題解答

### Q: 為什麼 Match Data 和 Auto Path 是分開的 QR Code？

**A**：因為單一 QR Code 的資料容量有限，將大量資料（尤其是路徑座標）分開可以確保 QR Code 容易掃描。

### Q: 如何配對 Match 和 Path QR？

**A**：使用 `eventCode + matchNumber + teamNumber` 作為唯一鍵進行配對。

```typescript
const matchKey = `${data.eventCode}_${data.matchNumber}_${data.teamNumber}`;
```

### Q: 路徑座標是什麼單位？

**A**：百分比（0-100），相對於場地圖片。
- x: 0 = 左邊, 100 = 右邊
- y: 0 = 上方, 100 = 下方

### Q: 為什麼相機授權了卻沒有畫面？

**A**：可能是 React StrictMode 雙重掛載問題。解決方案見 [React StrictMode 問題](#react-strictmode-問題)。

---

---

## Path Viewer 可視化

### 發現日期：2026-01-28

**用途**：將座標字串可視化顯示在場地圖上

### 座標格式

```
x1,y1|x2,y2|x3,y3|...
```

- 座標範圍：0-100（百分比）
- x: 0 = 左邊, 100 = 右邊
- y: 0 = 上方, 100 = 下方

### SVG 路徑繪製

```typescript
// 將座標轉換為 SVG path
const pathD = points
  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
  .join(' ');

// SVG 使用 viewBox="0 0 100 100" 配合百分比座標
<svg viewBox="0 0 100 100" preserveAspectRatio="none">
  <path d={pathD} stroke={color} />
</svg>
```

### 實作重點

1. **場地圖疊圖**：使用 `position: relative` + `absolute` 讓 SVG 疊在圖片上
2. **多路徑比較**：使用陣列存儲多條路徑，分配不同顏色
3. **視覺標記**：起點（實心圓）、終點（空心圓）、中間點（小圓點）

---

## 參考資源

- [SCANNER_INTEGRATION.md](./SCANNER_INTEGRATION.md) - 整合文件
- [lz-string GitHub](https://github.com/pieroxy/lz-string)
- [html5-qrcode GitHub](https://github.com/mebjas/html5-qrcode)
- [Scouting App](https://frc-ten.vercel.app)

---

*此檔案持續更新，記錄所有技術發現*
*最後更新：2026-01-28*
