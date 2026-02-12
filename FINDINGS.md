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
7. [SVG viewBox 與場地圖比例對齊](#svg-viewbox-與場地圖比例對齊)
8. [Pit Collect Path QR 整合](#pit-collect-path-qr-整合pit-path-類型)
9. [Stale Closure 問題](#stale-closure-問題連續掃描多張-qr)
10. [doGet Action 路由與 queryPaths API](#doget-action-路由與-querypaths-api)
11. [多路徑同時播放動畫架構](#多路徑同時播放動畫架構)
12. [路徑 ID 重複與動畫連動問題](#路徑-id-重複與動畫連動問題)
13. [路徑來源標籤（Scouting PASS vs Pit Collect）](#路徑來源標籤scouting-pass-vs-pit-collect)
14. [seedTestData() 測試資料函數](#seedtestdata-測試資料函數)
15. [TBA (The Blue Alliance) 自動同步架構](#tba-the-blue-alliance-自動同步架構)
16. [TBA ETag 快取陷阱（首次同步全部 not_modified）](#tba-etag-快取陷阱首次同步全部-not_modified)
17. [Google Sheets 空白標頭導致查詢全部失敗](#google-sheets-空白標頭導致查詢全部失敗)
18. [OPR (Offensive Power Rating) 計算架構](#opr-offensive-power-rating-計算架構)

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

#### v1.3.0
| 類型 | 欄位數 | 變更 |
|------|--------|------|
| Match Data | 20 | 移除 autoClimbSide/teleClimbSide，climbPosition 合併為 5 選項 |
| Path Data | 4 | 無變更 |
| Pit Scouting | 13 | 無變更 |
| Pit External | 23 | 新增 FRC6998 Pit Collect 格式 |

#### v1.3.0 + Pit External v1.1
| 類型 | 欄位數 | 變更 |
|------|--------|------|
| Match Data | 20 | 無變更 |
| Path Data | 4 | 無變更 |
| Pit Scouting | 13 | 無變更 |
| Pit External | 22 | 移除 stability 欄位（同步 FRC6998_Pit_Collect_2026 上游變更） |

#### v1.3.0 + Pit External v1.1 + Legacy 支援
| 類型 | 欄位數 | 變更 |
|------|--------|------|
| Match Data | 20 | 無變更 |
| Path Data | 4 | 無變更 |
| Pit Scouting | 13 | 無變更 |
| Pit External v2 | 22 | 無 stability |
| Pit External v1 (legacy) | 23 | 含 stability，向後相容支援 |

#### v1.4.0
| 類型 | 欄位數 | 變更 |
|------|--------|------|
| Match Data | 21 | bumpTrenchCount 拆為 bumpCount + trenchCount（20→21） |
| Path Data | 5 | 新增 alliance 欄位（4→5） |
| Pit Scouting | 13 | 無變更 |
| Pit External v2 | 22 | 無變更 |
| Pit External v1 (legacy) | 23 | 無變更 |

#### v1.4.0 + Pit Path (目前版本)
| 類型 | 欄位數 | 變更 |
|------|--------|------|
| Match Data | 21 | 無變更 |
| Path Data | 5 | 無變更 |
| **Pit Path Data** | **4** | **新增：Pit Collect 路徑 QR（eventCode, matchNumber, teamNumber, autoPath）** |
| Pit Scouting | 13 | 無變更 |
| Pit External v2 | 22 | 無變更 |
| Pit External v1 (legacy) | 23 | 無變更 |

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
// doGet - 查詢 API（支援 action 參數路由）
function doGet(e) {
  var action = e.parameter.action;
  if (action === 'queryPaths') return handleQueryPaths(e);
  // 預設：回傳 API 狀態
  return createJsonResponse({ success: true, message: 'API is running' });
}

// doPost - 接收資料上傳
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
// 將座標轉換為 SVG path（x 座標乘 2 映射到 0-200）
const pathD = points
  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 2} ${p.y}`)
  .join(' ');

// SVG 使用 viewBox="0 0 200 100" 配合 2:1 場地圖比例
<svg viewBox="0 0 200 100">
  <path d={pathD} stroke={color} />
</svg>
```

### 實作重點

1. **場地圖疊圖**：使用 `position: relative` + `absolute` 讓 SVG 疊在圖片上
2. **多路徑比較**：使用陣列存儲多條路徑，分配不同顏色
3. **視覺標記**：起點（實心圓）、終點（空心圓）、中間點（小圓點）

---

## SVG viewBox 與場地圖比例對齊

### 發現日期：2026-01-30

**問題**：Path Viewer 的場地圖為 2:1 寬高比（3902x1584），但 SVG viewBox 使用 `0 0 100 100`（1:1），導致圓點被壓扁、路徑位置偏移。

### 原因分析

三層不一致：

1. **圖片層**：`object-contain` 保持原圖比例，容器內留白，與 Scouting App 的 `drawImage`（拉伸填滿）行為不同
2. **SVG 層**：viewBox `0 0 100 100` 是正方形座標空間，疊在 2:1 容器上會被拉伸，圓圈變橢圓
3. **座標層**：Scouting App 產出的座標 x/y 都是 0-100 百分比，直接繪製在 1:1 viewBox 上位置正確但形狀失真

### 解決方案

```
圖片：object-contain → object-fill（拉伸填滿 2:1 容器）
SVG：viewBox="0 0 100 100" → viewBox="0 0 200 100"（座標空間改為 2:1）
座標：x * 2 映射到 0-200，y 保持 0-100
```

### 選擇理由

- `object-fill` 而非 `object-cover`：與 Scouting App canvas `drawImage` 的拉伸行為完全一致
- viewBox `200 100` 而非 `100 50`：x 軸放大而非 y 軸縮小，避免路徑線條變細
- 移除 `preserveAspectRatio="none"`：viewBox 已正確匹配容器比例，不需要額外的非等比縮放

### 關鍵教訓

SVG 疊圖的 viewBox 必須與容器寬高比一致，否則圓形會變橢圓、路徑位置會偏移。座標映射要在數據層（乘 2）而非視覺層（preserveAspectRatio）解決。

---

## Pit Collect Schema 變更（stability 欄位移除）

### 發現日期：2026-02-01

**來源**：對比 https://github.com/minesoil/FRC6998_Pit_Collect_2026.git 最新代碼

### 發現

FRC6998 Pit Collect 應用已移除 `stability`（穩定性）欄位，導致 Pit External schema 從 23 欄位縮減為 22 欄位。

### 變更前後對比

```
變更前 (23 欄位):
... crossMidfield, terrain, stability, climbLevel, climbPosition, climbTime, photosTaken, notes

變更後 (22 欄位):
... crossMidfield, terrain, climbLevel, climbPosition, climbTime, photosTaken, notes
```

### 影響範圍

1. `src/constants/schema.ts` - TSV_SCHEMA_PIT_EXTERNAL 移除 `stability`，FIELD_LABELS 移除對應標籤
2. `src/utils/decoder.ts` - 使用 `.length` 動態取值，不需改動
3. Scanner App 的 QR 解碼邏輯自動適應（依據 schema 長度判斷類型）

### 關鍵教訓

外部應用的 schema 會隨版本更新變動，需要定期對比上游代碼庫確認欄位是否一致。decoder.ts 使用動態長度判斷是正確的設計，避免了硬編碼欄位數的脆弱性。

---

## Pit Collect 雙版本相容性（v1: 23 欄位 vs v2: 22 欄位）

### 發現日期：2026-02-02

**來源**：實際掃描 Pit Collect QR 後顯示「資料不完整」

### 問題

Scanner 在 2026-02-01 同步了 Pit Collect 上游變更（移除 stability 欄位，23 -> 22），但實際比賽現場仍有 v1 版本（23 欄位）產生的 QR Code。由於 decoder 使用精確欄位數匹配（`values.length === 22`），v1 的 23 欄位 QR 被判定為 `unknown`，導致顯示「資料不完整」。

### 原因分析

```
Pit Collect v1 (23 欄位): ... crossMidfield, terrain, stability, climbLevel, climbPosition, climbTime, photosTaken, notes
Pit Collect v2 (22 欄位): ... crossMidfield, terrain, climbLevel, climbPosition, climbTime, photosTaken, notes
                                                      ^^^^^^^^^ 移除
```

Scanner 的 `detectQRType()` 只有一個精確匹配：`length === 22 -> pit-external`，無法處理 `length === 23` 的情況。

### 解決方案

1. **新增 Legacy Schema**：在 `schema.ts` 中新增 `TSV_SCHEMA_PIT_EXTERNAL_LEGACY`（23 欄位，含 stability）
2. **雙版本偵測**：`detectQRType()` 同時匹配 22 和 23 欄位，都返回 `pit-external` 類型
3. **動態 Schema 選擇**：`decodeQR()` 的 `pit-external` case 根據實際欄位數選擇對應 schema

```typescript
// detectQRType: 兩個長度都返回 'pit-external'
if (length === TSV_SCHEMA_PIT_EXTERNAL.length) return 'pit-external';        // 22
if (length === TSV_SCHEMA_PIT_EXTERNAL_LEGACY.length) return 'pit-external'; // 23

// decodeQR: 根據實際欄位數選擇 schema
case 'pit-external':
  schema = values.length === TSV_SCHEMA_PIT_EXTERNAL_LEGACY.length
    ? TSV_SCHEMA_PIT_EXTERNAL_LEGACY
    : TSV_SCHEMA_PIT_EXTERNAL;
  break;
```

### 選擇理由

- **向後相容**：不破壞 v2 QR 的解碼，同時恢復 v1 QR 的支援
- **統一類型**：v1 和 v2 都映射到 `pit-external` 類型，上傳邏輯不需改動
- **最小改動**：只需新增一個 legacy schema 和修改兩處判斷邏輯

### 關鍵教訓

當外部應用存在多個版本同時使用時，scanner 的 decoder 不能只支援最新版本。應該為每個已知版本建立 schema，讓 decoder 能根據欄位數自動選擇正確的 schema。精確匹配（`===`）雖然安全，但在多版本共存的場景下需要覆蓋所有已知的欄位數。

---

## Schema v1.4.0 升級（Match 21 欄位、Path 5 欄位）

### 發現日期：2026-02-02

**來源**：Scouting PASS app 上游 schema 變更

### 變更內容

#### Match Data: 20 → 21 欄位

```
變更前 (v1.3.0, 20 欄位):
... autoClimbPosition, bumpTrenchCount, fuelDroppedOnBumpCount, ...

變更後 (v1.4.0, 21 欄位):
... autoClimbPosition, bumpCount, trenchCount, fuelDroppedOnBumpCount, ...
```

- `bumpTrenchCount`（1 欄位）拆分為 `bumpCount` + `trenchCount`（2 欄位）
- 總欄位數 20 → 21

#### Path Data: 4 → 5 欄位

```
變更前 (4 欄位): eventCode, matchNumber, teamNumber, autoPath
變更後 (5 欄位): eventCode, matchNumber, teamNumber, alliance, autoPath
```

- 新增 `alliance` 欄位（值為 red/blue/unknown）

### 影響範圍

1. `src/constants/schema.ts` - TSV_SCHEMA_MATCH 和 TSV_SCHEMA_PATH 更新，FIELD_LABELS 新增 bumpCount/trenchCount
2. `src/utils/decoder.ts` - detectQRType 欄位數判定更新（match=21, path=5）
3. `google-apps-script/Code.gs` - Schema 同步 v1.4.0

### 關鍵教訓

Schema 版本升級時，三處必須同步更新：schema.ts（欄位定義）、decoder.ts（欄位數判定）、Code.gs（Google Apps Script）。欄位拆分（1→2）會增加總欄位數，而非替換。

---

## Path Viewer 進階功能設計

### 發現日期：2026-02-02

**用途**：增強 Path Viewer 的路徑比較和分析能力

### 新增功能

#### 1. 路徑自訂顏色

使用 `input[type=color]` 原生 HTML5 顏色選擇器，讓用戶可以為每條路徑指定顏色，取代固定的預設顏色陣列。

#### 2. 聯盟標籤

PathData interface 新增 `alliance: 'red' | 'blue' | 'unknown'` 欄位。新增路徑時可選擇聯盟方，路徑列表中以紅色 `R` 或藍色 `B` 標籤顯示。

#### 3. 圖層排序

使用上移/下移按鈕控制路徑在 SVG 中的繪製順序。SVG 的繪製順序決定了前景/背景關係：陣列中越後面的元素越在前景。透過交換陣列中的位置來實現圖層排序。

#### 4. 起始區域疊圖

在場地圖上繪製半透明矩形標示紅/藍方起始區域。最終 offset 數值經過多次微調：
- Red 起始區域：left=25%
- Blue 起始區域：left=68%
- 兩者寬度：3.5%

### 實作重點

- 顏色選擇器直接綁定到 PathData 物件，修改顏色即時反映到 SVG 路徑
- 聯盟標籤同時影響路徑列表 UI 和資料匯出
- 圖層排序透過交換陣列元素位置實現，而非使用 CSS z-index（因為 SVG 不支援 z-index）
- 起始區域矩形使用百分比定位，與場地圖容器等比縮放

---

## 場地圖統一（Scanner + Scouting Pass）

### 發現日期：2026-02-03

**問題**：Scanner 和 Scouting Pass 兩個專案使用不同解析度的場地圖（scanner: 3128x1584, scouting pass: 3902x1584），導致路徑座標在兩個 app 中的視覺位置可能存在微妙差異。

### 原因分析

- Scanner 的 `public/field-2026.png` 為 3128x1584（2:1 比例）
- Scouting Pass 的 `FRC/field26.png` 為 3902x1584（約 2.46:1 比例）
- 雖然 SVG viewBox 和座標映射能在各自 app 內正常運作，但不同底圖會導致起始區域、場地元素的相對位置不一致

### 解決方案

將 scanner 的 field-2026.png (3128x1584) 複製到 scouting pass 的 field26.png，統一為相同檔案。

### 選擇理由

- 選擇 3128x1584 而非 3902x1584：3128x1584 更接近精確的 2:1 比例，與 SVG viewBox `0 0 200 100` 的座標系統更一致
- 統一底圖而非調整座標映射：從根源解決一致性問題，避免後續維護時再次出現偏差

### 附帶變更

同時移除了 Path Viewer 中的起始區域矩形疊圖（紅/藍方 SVG rect），因為：
1. 手動標註的區域位置不夠精確
2. 場地圖本身已經有清晰的起始區域標示
3. 半透明矩形遮擋了路徑可視化的觀察

---

## Pit Collect Path QR 整合（pit-path 類型）

### 發現日期：2026-02-03

**來源**：Pit Collect app 產生的路徑 QR Code 需要被 scanner 掃描並合併到 pit-external 記錄

### 問題

Pit Collect app 會為每支隊伍產生路徑 QR Code（autoPath），但 scanner 原本只支援 Scouting PASS 的 path 類型（5 欄位，含 alliance）。Pit Collect 的路徑 QR 只有 4 欄位（不含 alliance），且需要合併到 pit-external 記錄而非 match 記錄。

### 解決方案

新增 `pit-path` QR 類型，4 欄位 schema：

```typescript
const TSV_SCHEMA_PIT_PATH = ['eventCode', 'matchNumber', 'teamNumber', 'autoPath'];
```

#### 欄位數衝突處理

pit-path（4 欄位）和舊版 path（4 欄位，v1.3.0 以前）欄位數相同，但 v1.4.0 的 path 已升級為 5 欄位（含 alliance），因此不會衝突。decoder 的 `detectQRType()` 判定順序：先匹配 path（5 欄位），再匹配 pit-path（4 欄位）。

#### 客戶端合併邏輯（ScanPage.tsx）

掃描 pit-path QR 後，自動在 scanHistory 中尋找同隊（相同 teamNumber）的 pit-external 記錄，將 autoPath 合併進去。多條路徑用分號 `;` 分隔：

```typescript
// 找到同隊的 pit-external 記錄
const pitRecord = scanHistory.find(
  item => item.qrType === 'pit-external' && item.data.teamNumber === teamNumber
);

// 合併 autoPath
if (pitRecord) {
  const existingPath = pitRecord.data.autoPath || '';
  pitRecord.data.autoPath = existingPath ? `${existingPath};${newPath}` : newPath;
}
```

#### 服務端合併邏輯（Code.gs）

- `handlePathData`：新增判斷，如果 path 數據能匹配到 Pit 工作表中的隊伍，將 autoPath 合併到 Pit 記錄
- `handlePitData`：上傳 pit-external 時，如果該隊已有合併的 autoPath，保留不覆蓋

### 選擇理由

- 新增獨立的 `pit-path` 類型而非複用 `path` 類型：因為合併目標不同（pit-external vs match），邏輯需要分開處理
- 用 `;` 而非 `|` 作為多路徑分隔符：因為 `|` 已用於單條路徑內的座標點分隔（`x1,y1|x2,y2`）
- 客戶端即時合併 + 服務端再次合併：確保不論上傳順序，路徑都能正確合併到 pit-external

---

## Stale Closure 問題（連續掃描多張 QR）

### 發現日期：2026-02-03

**問題**：連續快速掃描多張 pit-path QR 時，第二張以後的 QR 掃描回調中 `scanHistory` state 仍是舊值（不包含前一張掃描的結果），導致合併邏輯找不到剛掃描的 pit-external 記錄。

### 原因分析

React 的 `useState` 在事件回調中會「捕獲」創建時的 state 值（closure）。當 `onScanSuccess` 回調在 useEffect 初始化時被創建，後續 state 更新不會改變已捕獲的閉包引用：

```
掃描 QR1 → scanHistory = [] → 新增到 state → state 更新為 [QR1]
掃描 QR2 → onScanSuccess 閉包中的 scanHistory 仍然是 [] → 找不到 QR1
```

### 解決方案

使用 `useRef` 同步最新的 scanHistory 值，讓回調總是能存取到最新 state：

```typescript
const scanHistoryRef = useRef(scanHistory);
scanHistoryRef.current = scanHistory; // 每次 render 時同步

const handleScan = useCallback((result) => {
  // 使用 ref 而非直接引用 state
  const currentHistory = scanHistoryRef.current;
  const pitRecord = currentHistory.find(item => ...);
  // ...
}, []); // 空依賴，避免重新創建
```

### 關鍵教訓

在 React 中，當 callback 需要存取最新 state 但又不能放入 dependency array（會導致 effect 重新執行）時，使用 `useRef` 作為「逃生艙口」（escape hatch）同步最新值。這在 html5-qrcode 的掃描回調場景中特別重要，因為重新創建回調會導致相機重新初始化。

---

## doGet Action 路由與 queryPaths API

### 發現日期：2026-02-04

**來源**：Path Viewer 需要從 Google Sheets 後端查詢比賽路徑資料

### 問題

原本 `doGet()` 只回傳 API 狀態訊息（`{ success: true, message: 'API is running' }`），沒有查詢功能。Path Viewer 需要從 Google Sheets 查詢特定比賽的路徑資料（Match Data 工作表的 autoPath + Path Data 工作表的 autoPath），但 doPost 已被用於資料上傳。

### 解決方案

擴展 `doGet()` 加入 `action` 參數路由：

```javascript
function doGet(e) {
  var action = e.parameter.action;
  if (action === 'queryPaths') {
    return handleQueryPaths(e);
  }
  // 預設：回傳 API 狀態
  return createJsonResponse({ success: true, message: 'API is running' });
}
```

#### queryPaths API 規格

**請求**：
```
GET ?action=queryPaths&eventCode=2026MSLR&matchLevel=Quals&matchNumber=5
```

**回應**：
```json
{
  "success": true,
  "paths": [
    {
      "teamNumber": "6998",
      "alliance": "R1",
      "autoPath": "x1,y1|x2,y2|...",
      "source": "path"
    }
  ],
  "query": { "eventCode": "2026MSLR", "matchLevel": "Quals", "matchNumber": "5" }
}
```

- `source` 欄位標示資料來源：`"path"`（Path Data 工作表）或 `"match"`（Match Data 工作表）
- 同時查詢 Match Data 和 Path Data 兩個工作表，合併結果

#### 客戶端實作

```typescript
// sheets.ts
export async function queryMatchPaths(eventCode: string, matchLevel: string, matchNumber: string) {
  const url = `${API_URL}?action=queryPaths&eventCode=${encodeURIComponent(eventCode)}&matchLevel=${encodeURIComponent(matchLevel)}&matchNumber=${encodeURIComponent(matchNumber)}`;
  const response = await fetch(url);
  return await response.json();
}
```

#### PathViewerPage 自動分配顏色

查詢結果根據 alliance 自動分配顏色：
- 紅方（R1/R2/R3）：使用紅色系（#ef4444, #f97316, #dc2626）
- 藍方（B1/B2/B3）：使用藍色系（#3b82f6, #6366f1, #06b6d4）

### 選擇理由

- 使用 `doGet` 而非 `doPost` 進行查詢：GET 語義更符合「讀取」操作，且不需要處理 CORS preflight（不需設定 Content-Type header）
- 使用 `action` 參數路由而非獨立端點：Google Apps Script 的 Web App 只有一個 URL，需要用參數區分不同操作
- 同時查詢兩個工作表（Match Data + Path Data）：確保無論路徑資料存在哪個工作表都能被查詢到

### 關鍵教訓

Google Apps Script Web App 只有一個 URL 端點，doGet 和 doPost 各一個入口函式。當需要支援多種 GET 操作時，使用 `e.parameter.action` 進行路由分發是標準模式。新增 action 時要確保向後相容（無 action 時保持原有行為）。

---

## 多路徑同時播放動畫架構

### 發現日期：2026-02-04

**來源**：Path Viewer 從單路徑動畫升級為多路徑同時播放

### 問題

原本的動畫架構使用單一 `animatingPathId: string | null` 和 `animationProgress: number` 狀態，一次只能播放一條路徑的動畫。用戶希望能同時播放多條路徑做比較分析。

### 解決方案

將動畫狀態從單一值改為 `Record<string, number>` 字典結構：

```typescript
// 舊架構（單路徑）
const [animatingPathId, setAnimatingPathId] = useState<string | null>(null);
const [animationProgress, setAnimationProgress] = useState(0);

// 新架構（多路徑）
const [animationProgress, setAnimationProgress] = useState<Record<string, number>>({});
```

- key = 路徑 ID，value = 動畫進度（0 到座標點數量）
- 每條路徑獨立管理自己的動畫進度
- Play All 按鈕同時啟動所有路徑的動畫
- 使用 `requestAnimationFrame` 統一驅動所有進行中的動畫

### 選擇理由

- `Record<string, number>` 比 `Map<string, number>` 更適合 React state（JSON 可序列化、immutable 更新更直覺）
- 統一的 `requestAnimationFrame` 循環而非每條路徑各自一個，避免多個 RAF 的性能問題
- Play All 只是批量設定所有路徑的初始進度值，不需要額外的邏輯

---

## 路徑 ID 重複與動畫連動問題

### 發現日期：2026-02-04

**問題**：同一隊伍在不同比賽等級（如 Quals 和 Playoff）的相同場次號碼（如 Match 5）會產生相同的路徑 ID，導致點擊一條路徑的動畫按鈕時，另一條路徑也同時開始播放。

### 原因分析

原本的 ID 生成邏輯只使用 `teamNumber-matchNumber`：

```typescript
// 舊 ID 生成
const id = `${teamNumber}-${matchNumber}`;
// Quals Match 5 Team 6998 → "6998-5"
// Playoff Match 5 Team 6998 → "6998-5"（重複！）
```

當兩條路徑共用同一個 ID 時，`animationProgress["6998-5"]` 會同時控制兩條路徑的動畫。

### 解決方案

在 ID 中加入 `matchLevel`：

```typescript
// 新 ID 生成
const id = `${teamNumber}-${matchLevel}-${matchNumber}`;
// Quals Match 5 Team 6998 → "6998-Quals-5"
// Playoff Match 5 Team 6998 → "6998-Playoff-5"（唯一）
```

### 關鍵教訓

ID 生成必須考慮所有可能影響唯一性的維度。在 FRC 比賽數據中，`teamNumber + matchNumber` 不足以唯一標識一條路徑，因為同一隊伍可能在不同等級（Quals/Playoff/Finals）的相同場次號碼中有不同的路徑。同時也需要配合修正後端的 dedup 邏輯（Code.gs queryPathsByTeam），不同 matchLevel 的同 matchNumber 不應被視為重複。

---

## getMatchKey 重複掃描誤判問題

### 發現日期：2026-02-05

**問題**：掃描 QR code 時，不同比賽等級（Quals/Playoff）的相同場次號會被誤判為重複掃描。例如 Quals #5 和 Playoff #5 產生相同的 matchKey，系統誤認為是重複資料。

### 原因分析

`getMatchKey` 函數只使用三個欄位組合 key：

```typescript
// 舊 key 生成
function getMatchKey(data: DecodedData): string {
  return `${data.eventCode}_${data.matchNumber}_${data.teamNumber}`;
}
// Quals #5 Team 6998 → "2026MSLR_5_6998"
// Playoff #5 Team 6998 → "2026MSLR_5_6998"（重複！）
```

缺少 `matchLevel` 維度導致不同比賽等級的資料被視為同一筆。

### 解決方案

在 key 中加入 `matchLevel`：

```typescript
// 新 key 生成
function getMatchKey(data: DecodedData): string {
  return `${data.eventCode}_${data.matchLevel}_${data.matchNumber}_${data.teamNumber}`;
}
// Quals #5 Team 6998 → "2026MSLR_Quals_5_6998"
// Playoff #5 Team 6998 → "2026MSLR_Playoff_5_6998"（唯一）
```

### 選擇理由

- `matchLevel` 是 FRC 比賽數據中區分資料唯一性的必要維度
- 與 2026-02-04 的路徑 ID 修復邏輯一致，保持整體架構的一致性
- 最小改動，只修改一個函數

### 關鍵教訓

在 FRC 比賽數據中，唯一性 key 必須包含 `matchLevel`。單純的 `eventCode + matchNumber + teamNumber` 不足以區分不同比賽等級的資料。這是繼路徑 ID 問題後的第二次提醒：**任何涉及「唯一標識」的邏輯都需要考慮 matchLevel 維度**。

---

## 路徑來源標籤（Scouting PASS vs Pit Collect）

### 發現日期：2026-02-04

**來源**：Path Viewer 查詢結果需要區分路徑資料來自 Scouting PASS 還是 Pit Collect

### 問題

後端 queryPaths API 從多個工作表（Match Data、Path Data、Pit Scouting）查詢路徑，但前端無法分辨每條路徑的來源。用戶需要知道路徑是來自比賽中即時記錄的（Scouting PASS）還是 pit walk 時收集的（Pit Collect）。

### 解決方案

#### 後端（Code.gs）

在 queryPathsByTeam 回傳結果中加入 `source` 欄位：

```javascript
// Path Data 工作表 → source: "path"（Scouting PASS）
// Match Data 工作表 → source: "match"（Scouting PASS）
// Pit Scouting 工作表 → source: "pit"（Pit Collect）
```

#### 前端（PathViewerPage.tsx）

根據 `source` 欄位顯示標籤：
- `source === "pit"` → 顯示 "Pit" 標籤（橙色）
- 其他（"path" / "match"） → 顯示 "SP" 標籤（綠色）

```typescript
// sheets.ts 回應類型
interface PathResult {
  teamNumber: string;
  alliance: string;
  autoPath: string;
  source?: string;  // "path" | "match" | "pit"
}
```

### 選擇理由

- "SP" 代表 Scouting PASS（來源 app 名稱的縮寫），比 "Match" 更簡潔
- 用顏色（綠/橙）搭配文字標籤，雙重視覺提示
- source 欄位設為 optional（`?`）以維持向後相容

---

## seedTestData() 測試資料函數

### 發現日期：2026-02-04

**來源**：Path Viewer 開發過程中需要穩定的測試資料

### 用途

在 Code.gs 中新增 `seedTestData()` 函數，可在 Google Apps Script 編輯器中手動執行，批量寫入測試資料到各工作表。

### 包含資料

- **12 筆 Match Data**：涵蓋 Quals（場次 1-8）和 Playoff（場次 1-4），6 支隊伍（6998/254/1678/118/2056/330）
- **4 筆 Path Data**：4 條自動路徑，含座標和聯盟資訊
- **5 筆 Pit Scouting**：5 支隊伍的 pit 資料

### 注意事項

- 執行前不會清除現有資料，會 append 到現有工作表
- 如果工作表不存在，需要先執行 `initializeSheets()`
- 測試資料使用 eventCode "TEST01" 方便篩選和清理

---

## TBA (The Blue Alliance) 自動同步架構

### 發現日期：2026-02-04

**來源**：整合 TBA API v3 到 Google Apps Script，自動同步賽事資料

### 問題

需要在 Google Apps Script 中整合 TBA API，自動同步賽事資料（Teams, Matches, Rankings 等），但面臨幾個挑戰：
1. Apps Script 有 6 分鐘執行時間限制
2. TBA API 有速率限制，不應每次都全量拉取
3. Score Breakdown 欄位每年不同（依遊戲規則變動），不能硬編碼
4. UrlFetchApp 和 ScriptApp 需要額外的 OAuth scope 授權

### 解決方案

#### 1. ETag 快取機制

TBA API 支援 HTTP ETag 條件請求，用 `If-None-Match` header 可以避免重複下載未變更的資料：

```javascript
function fetchTBA(endpoint) {
  var cacheKey = 'tba_etag_' + endpoint.replace(/\//g, '_');
  var cachedETag = PropertiesService.getScriptProperties().getProperty(cacheKey);

  var options = {
    headers: { 'X-TBA-Auth-Key': apiKey },
    muteHttpExceptions: true
  };
  if (cachedETag) {
    options.headers['If-None-Match'] = cachedETag;
  }

  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() === 304) {
    return { status: 'not_modified', data: null };
  }
  // 200: 更新 ETag 快取，回傳新資料
  var newETag = response.getHeaders()['ETag'];
  if (newETag) {
    PropertiesService.getScriptProperties().setProperty(cacheKey, newETag);
  }
  return { status: 'updated', data: JSON.parse(response.getContentText()) };
}
```

**選擇理由**：ETag 快取讓定時觸發器（如每 30 分鐘）能高效運作，若資料未變更則 304 直接跳過，節省 API 配額和執行時間。

#### 2. Score Breakdown 動態 Headers

FRC 每年遊戲規則不同，Score Breakdown 的欄位（如 autoReef, teleopCoral 等）每年都會變。使用動態 headers 而非硬編碼：

```javascript
function syncTBAScoreBreakdown(matchesData) {
  // 從第一筆資料自動提取所有欄位名稱
  var allKeys = {};
  matchesData.forEach(function(match) {
    ['red', 'blue'].forEach(function(color) {
      var bd = match.score_breakdown[color];
      Object.keys(bd).forEach(function(k) { allKeys[k] = true; });
    });
  });
  var breakdownKeys = Object.keys(allKeys).sort();
  var headers = ['matchKey', 'alliance'].concat(breakdownKeys);
  // 寫入...
}
```

**選擇理由**：避免每年手動更新 schema，任何新賽季的 Score Breakdown 都能自動處理。

#### 3. Matches + Score Breakdown 共用 API Call

TBA 的 `/event/{key}/matches` endpoint 已包含 `score_breakdown` 欄位，因此 Matches 和 Score Breakdown 可以共用同一次 API call：

```javascript
function syncTBAMatches(eventKey) {
  var result = fetchTBA('/event/' + eventKey + '/matches');
  // 寫入 TBA Matches 工作表
  // 同時呼叫 syncTBAScoreBreakdown(result.data) 寫入 Score Breakdown
}
```

**選擇理由**：減少 API call 次數，避免速率限制問題，同時減少執行時間。

#### 4. syncAllTBA 時間守衛

Apps Script 有 6 分鐘（360 秒）執行限制。使用時間守衛確保不會超時：

```javascript
function syncAllTBA() {
  var startTime = new Date().getTime();
  var TIME_LIMIT = 280000; // 4分40秒，預留 buffer

  var tasks = [syncTBATeams, syncTBAMatches, syncTBARankings, ...];
  for (var i = 0; i < tasks.length; i++) {
    if (new Date().getTime() - startTime > TIME_LIMIT) {
      Logger.log('Time guard triggered, stopping.');
      break;
    }
    tasks[i](eventKey);
  }
}
```

**選擇理由**：280 秒（4 分 40 秒）留了 80 秒的 buffer，確保即使最後一個同步函式需要較長時間也不會超過限制。

#### 5. UrlFetchApp / ScriptApp 權限授權

Google Apps Script 的 `UrlFetchApp.fetch()` 和 `ScriptApp.newTrigger()` 需要額外的 OAuth scope。必須在 appsscript.json 中明確聲明：

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

並執行 `authorizeTBA()` 輔助函式觸發授權提示。

**關鍵教訓**：即使 Apps Script 編輯器中手動執行函式會自動提示授權，部署為 Web App 時不會自動提示。必須預先通過手動執行來完成授權，且 appsscript.json 必須包含所有需要的 scope。

#### 6. clear-and-replace 寫入策略

每次同步時先清空工作表（保留 header），再寫入全部新資料：

```javascript
var sheet = getOrCreateSheet('TBA Teams', headers);
if (sheet.getLastRow() > 1) {
  sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
}
// 寫入全部資料...
```

**選擇理由**：比 upsert（逐筆比對更新）簡單可靠，避免資料不一致。TBA 資料量不大（通常 < 200 筆），全量重寫的性能代價可忽略。

### 驗證結果

2025mslr 賽事完整同步：
- 37 teams, 77 matches, 154 score breakdowns, 37 rankings, 37 OPRs, 8 alliances, 25 awards
- 總耗時 6.3 秒（遠低於 280 秒時間守衛）
- ETag 快取後二次同步：全部 not_modified，接近 0 秒

---

## TBA ETag 快取陷阱（首次同步全部 not_modified）

### 發現日期：2026-02-04

**問題**：第一次執行 `manualSyncTBA()` 時，所有 7 個同步函式都回傳 `not_modified`，沒有任何資料被寫入。

### 原因分析

開發過程中曾手動測試各個 sync 函式（如直接執行 `syncTBATeams('2025mslr')`），這些測試執行已經將 ETag 儲存到 ScriptProperties。當後來通過 `manualSyncTBA()` 統一執行時，所有 endpoint 都已有 cached ETag，TBA API 回傳 304 not_modified。

```
開發時：手動執行 syncTBATeams → 200 OK → 儲存 ETag
後來：manualSyncTBA → syncTBATeams 帶 If-None-Match → 304 not_modified → 跳過！
```

### 解決方案

新增 `forceSyncTBA()` 函式，先呼叫 `clearTBAETags()` 清除所有快取的 ETag，再執行 `syncAllTBA()`：

```javascript
function forceSyncTBA() {
  clearTBAETags();
  syncAllTBA();
}
```

### 關鍵教訓

ETag 快取是「隱形狀態」，儲存在 ScriptProperties 中不容易直覺觀察。當開發階段的手動測試產生了快取，後續的整合測試可能被快取影響而看不到預期結果。提供 `forceSyncTBA` 和 `clearTBAETags` 作為「清除快取」的工具是必要的。

---

## Google Sheets 空白標頭導致查詢全部失敗

### 發現日期：2026-02-06

**來源**：Path Viewer 後端查詢功能完全無法運作，所有查詢回傳 0 筆結果

### 問題

Path Viewer 的查詢功能壞掉了。輸入正確的 eventCode、matchLevel、matchNumber 後，API 回傳 0 筆路徑。直接呼叫 API 端點測試，queryPaths 和 queryTeamPaths 都回傳空陣列。

### 原因分析

通過新增 `?action=debug` 端點檢查 Google Sheets 實際內容，發現 Match Data 工作表的第一行（標頭行）全是空字串 `["", "", "", ...]`。

這導致所有依賴 `headers.indexOf('eventCode')` 的查詢邏輯回傳 -1，等同於「找不到這個欄位」，所以任何條件比對都不可能成功：

```javascript
// 標頭全空時的行為
var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
// headers = ["", "", "", "", "", ...]
var eventCodeCol = headers.indexOf('eventCode');
// eventCodeCol = -1（找不到！）

// 後續比對永遠失敗
if (row[eventCodeCol] === queryEventCode) { ... }
// row[-1] === "2026MSLR" → undefined === "2026MSLR" → false
```

**標頭為何變空**：推測是工作表被重建或手動編輯時，標頭行被清空但資料行仍保留。`getOrCreateSheet` 函數只在「工作表不存在時」才寫入標頭，如果工作表已存在但標頭為空，不會自動修復。

### 解決方案

#### 1. 即時修復：`?action=fixHeaders` 端點

新增 API 端點，檢查所有已知工作表的標頭行，若為空則自動寫入正確的 schema headers：

```javascript
function handleFixHeaders() {
  var sheetsToFix = {
    'Match Data': MATCH_HEADERS,
    'Path Data': PATH_HEADERS,
    'Pit Scouting': PIT_HEADERS,
    // ...
  };
  // 逐一檢查並修復空白標頭
}
```

#### 2. 長期防禦：`getOrCreateSheet` 加入標頭檢查

修改 `getOrCreateSheet` 函數，在工作表已存在的情況下也檢查標頭是否為空：

```javascript
function getOrCreateSheet(name, headers) {
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    // 防禦性檢查：標頭全空時自動修復
    var existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var allEmpty = existingHeaders.every(function(h) { return h === ''; });
    if (allEmpty) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    return sheet;
  }
  // 工作表不存在，建立新的...
}
```

#### 3. 同時發現：matchLevel 值是縮寫

調查過程中發現 Scouting PASS 實際存入的 matchLevel 是 'P', 'QM', 'PO', 'X' 縮寫，不是 'Practice', 'Quals', 'Playoff', 'Exhibition' 全名。PathViewerPage 的 dropdown 值已還原為縮寫格式。

### 選擇理由

- **debug 端點**：提供線上診斷能力，不需要進入 Google Apps Script 編輯器就能檢查工作表狀態
- **fixHeaders 端點**：一次性修復工具，比手動編輯 Google Sheets 更可靠且不易出錯
- **getOrCreateSheet 防禦修復**：從根源防止未來再次發生標頭丟失的問題，即使工作表被意外清空標頭也能自動恢復

### 關鍵教訓

1. **不要假設工作表標頭永遠正確**：Google Sheets 是多人協作環境，標頭可能被意外清空、移動或修改。所有依賴標頭的查詢邏輯都應該有防禦性檢查。
2. **`indexOf` 回傳 -1 是靜默失敗**：JavaScript 的 `array.indexOf()` 找不到元素時回傳 -1 而非拋出錯誤。`row[-1]` 回傳 `undefined`，比對永遠失敗但不會報錯，這類 bug 極難從錯誤日誌中發現。
3. **需要線上診斷工具**：Google Apps Script Web App 的除錯很不方便，新增 `debug` 端點能大幅加速問題排查。
4. **matchLevel 值要與上游 Scouting App 完全一致**：不能假設值的格式，應該從實際資料中確認。

---

## OPR (Offensive Power Rating) 計算架構

### 發現日期：2026-02-10

**來源**：在 Google Apps Script 中實作 OPR 計算，使用最小二乘法從比賽分數反推隊伍進攻效率

### 數學原理

OPR 使用最小二乘法求解線性方程組。每場比賽的聯盟總分 = 三支隊伍的 OPR 之和：

```
OPR(team1) + OPR(team2) + OPR(team3) = alliance_score
```

建立矩陣方程 `A * x = b`：
- **A**：出場矩陣（rows = 聯盟數 = 比賽數 * 2，cols = 隊伍數），每行標記哪 3 支隊伍出場
- **x**：待求的 OPR 向量
- **b**：各聯盟得分向量

因為方程數（聯盟數）通常大於未知數（隊伍數），使用 Normal Equation 求解：

```
x = (A^T * A)^-1 * A^T * b
```

### 矩陣運算實作

在 Google Apps Script (ES5) 中從零實作矩陣運算：

1. **matTranspose(A)**：矩陣轉置
2. **matMultiply(A, B)**：矩陣乘法
3. **matInverse(A)**：矩陣求逆（Gauss-Jordan 消去法 + partial pivoting）
4. **solveOPR(A, b)**：組合以上函數求解 OPR

#### Gauss-Jordan + Partial Pivoting

矩陣求逆使用增廣矩陣 `[A | I]` 進行 Gauss-Jordan 消去。加入 partial pivoting（部分主元選取）避免數值不穩定：

```javascript
// 找到當前列絕對值最大的元素作為主元
var maxVal = Math.abs(aug[col][col]);
var maxRow = col;
for (var k = col + 1; k < n; k++) {
  if (Math.abs(aug[k][col]) > maxVal) {
    maxVal = Math.abs(aug[k][col]);
    maxRow = k;
  }
}
// 交換行
if (maxRow !== col) {
  var temp = aug[col];
  aug[col] = aug[maxRow];
  aug[maxRow] = temp;
}
```

**選擇理由**：
- Google Apps Script 是 ES5 環境，無法使用 npm 套件或外部數學庫
- 從零實作矩陣運算約 80 行程式碼，足夠處理 FRC 規模的資料（通常 < 100 支隊伍）
- Partial pivoting 確保數值穩定性，避免主對角線元素接近零時的計算錯誤

### 雙資料來源

支援兩種工作流：

1. **TBA 資料**（`buildOPRSheet`）：從 TBA Matches 工作表讀取，使用 `parseMatchKey` 解析 matchKey 格式（如 `2025ntwc_qm1`），篩選 `comp_level === 'qm'` 的資格賽
2. **Scouting 資料**（`calculateOPR`）：從 Match Data 工作表讀取，使用 `matchLevel === 'QM'` 篩選資格賽

兩者共用相同的矩陣運算和 OPR 求解邏輯。

### OPR Analysis 工作表三區塊佈局

```
Column A-C: OPR 排名（Rank, Team, OPR）- 按 OPR 降序排列
Column E-I: 預測分數（Match, Red1-3, RedPred, Blue1-3, BluePred）
Column K+:  Lookup 公式區（輸入 teamNumber 用 INDEX/MATCH 查 OPR + FILTER 查出場記錄）
```

#### VLOOKUP vs INDEX/MATCH

**發現**：初始實作使用 `VLOOKUP` 查詢隊伍 OPR，但 `VLOOKUP` 要求查找值必須在查找範圍的第一欄。OPR 排名表的欄位順序是 Rank | Team | OPR，teamNumber 在第二欄而非第一欄，導致 VLOOKUP 無法正確運作。

**解決方案**：改用 `INDEX/MATCH` 組合，不受欄位順序限制：

```javascript
// VLOOKUP（錯誤，因為 teamNumber 不在第一欄）
'=VLOOKUP(K2, A:C, 3, FALSE)'

// INDEX/MATCH（正確）
'=IFERROR(INDEX(C:C, MATCH(K2, B:B, 0)), "Not found")'
```

### Google Sheets FILTER 公式合併多個陣列

OPR Lookup 區使用 `FILTER` 公式查詢指定隊伍的所有出場記錄。當需要同時搜尋 Red1、Red2、Red3、Blue1、Blue2、Blue3 六個欄位時，使用 `{...;...}` 語法（分號分隔）合併多個 FILTER 結果：

```
=FILTER({E:I;E:I;E:I;E:I;E:I;E:I},
  {F:F=K2;G:G=K2;H:H=K2;F:F=K2;G:G=K2;H:H=K2})
```

**注意**：`{A;B}` 是垂直堆疊（上下合併），`{A,B}` 是水平堆疊（左右合併）。在需要合併多個條件的查詢結果時，垂直堆疊是正確的選擇。

### 驗證結果

使用 2025 新北區域賽（2025ntwc）實測：
- 68 場資格賽、37 支隊伍
- 計算結果與 TBA 官方 OPR 完全一致（37 支隊伍零誤差）
- 驗證了矩陣運算、資料提取、OPR 求解的完整正確性

### 關鍵教訓

1. **ES5 環境限制**：Google Apps Script 不支援 ES6+ 語法（如 arrow functions、let/const、destructuring），矩陣運算必須用 `var` 和 `function` 關鍵字
2. **indexOf 驗證**：從工作表標頭取得欄位索引後，必須驗證是否為 -1（參見 E018 經驗），否則 `row[-1]` 會靜默回傳 `undefined`
3. **VLOOKUP 的第一欄限制**：當查找值不在查找範圍的第一欄時，必須改用 INDEX/MATCH
4. **OPR 只用資格賽**：OPR 計算只使用資格賽（Quals）數據，因為淘汰賽的聯盟組合是固定的（同一聯盟反覆出場），會導致矩陣奇異（不可逆）

---

## 參考資源

- [SCANNER_INTEGRATION.md](./SCANNER_INTEGRATION.md) - 整合文件
- [lz-string GitHub](https://github.com/pieroxy/lz-string)
- [html5-qrcode GitHub](https://github.com/mebjas/html5-qrcode)
- [Scouting App](https://frc-ten.vercel.app)

---

*此檔案持續更新，記錄所有技術發現*
*最後更新：2026-02-10 (OPR Analysis 計算架構)*
