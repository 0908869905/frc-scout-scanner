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

## 參考資源

- [SCANNER_INTEGRATION.md](./SCANNER_INTEGRATION.md) - 整合文件
- [lz-string GitHub](https://github.com/pieroxy/lz-string)
- [html5-qrcode GitHub](https://github.com/mebjas/html5-qrcode)
- [Scouting App](https://frc-ten.vercel.app)

---

*此檔案持續更新，記錄所有技術發現*
*最後更新：2026-02-04*
