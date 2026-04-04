# FRC Scout Scanner - Claude Code 專案指令

> 此檔案包含本專案特定的開發規範和上下文資訊，Claude Code 會自動讀取。

---

## 專案概述

**專案名稱**：FRC Scout Scanner
**用途**：掃描 FRC 6998 Scouting PASS 應用產生的 QR Code，解析比賽數據並上傳到 Google Sheets
**技術棧**：React 19 + TypeScript + Vite 6

---

## 核心架構

### QR Code 資料流程

```
Scouting App → QR Code (LZ-String Base64 壓縮) → Scanner App → 解碼 → Google Sheets
```

### 資料格式

- **Match Data QR**：21 個欄位，包含比賽數據 (v1.4.0)
- **Auto Path QR**：5 個欄位，包含自動路徑 + 聯盟 (v1.4.0)
- **Pit Path QR**：4 個欄位，Pit Collect 路徑 QR，掃描後自動合併 autoPath 到同隊 pit-external（多條用 `;` 分隔）
- **Pit Scouting QR**：13 個欄位，包含隊伍資訊
- **Pit External QR**：22 個欄位 (v2) 或 23 個欄位 (v1 legacy, 含 stability)，FRC6998 Pit Collect 格式，decoder 自動偵測版本

### Google Apps Script API

doGet() 支援 `action` 參數路由：
- **無 action**：回傳 API 狀態 `{ success: true, message: 'API is running' }`
- **`?action=queryPaths&eventCode=...&matchLevel=...&matchNumber=...`**：查詢指定比賽/隊伍的路徑資料（從 Match Data、Path Data、Pit Scouting 工作表），回傳 `{ success, paths: [...], query: {...} }`，每條路徑含 `source` 欄位（"path"/"match"/"pit"）標示來源。matchLevel 值為縮寫：P/QM/PO/X
- **`?action=tbaStatus`**：回傳 TBA 同步狀態（API key、trigger、各工作表行數）
- **`?action=tbaSync`**：透過 HTTP GET 觸發 TBA 同步
- **`?action=debug`**：回傳所有工作表概況（名稱、行數、標頭、樣本資料），用於線上診斷
- **`?action=fixHeaders`**：檢查所有已知工作表的標頭行，若為空自動修復為正確的 schema headers

輔助函數：
- **`seedTestData()`**：在 Apps Script 編輯器中手動執行，寫入測試資料（12 筆 Match + 4 筆 Path + 5 筆 Pit）

doPost() 接收資料上傳（match/path/pit/pit-external/batch）

### TBA (The Blue Alliance) 同步

自動從 TBA API v3 抓取賽事資料同步到 Google Sheets，使用 ETag 快取避免不必要的更新。

**7 個同步工作表**：TBA Teams / TBA Matches / TBA Score Breakdown / TBA Rankings / TBA OPRs / TBA Alliances / TBA Awards

**設定步驟**：
1. `setTBAApiKey('your_key')` — 儲存 API key
2. `setupTBAConfig()` — 測試連線 + 建立工作表
3. `manualSyncTBA()` — 首次同步
4. `setupTBATrigger()` — 啟動每 5 分鐘自動同步
5. `removeTBATrigger()` — 停止自動同步
6. `forceSyncTBA()` — 清除 ETag 強制重新同步

**技術細節**：
- ETag 存儲在 `PropertiesService.getScriptProperties()`
- Matches + Score Breakdown 共用一次 API call
- Score Breakdown headers 動態產生（依遊戲規則而異）
- 寫入策略：clear-and-replace（清除後批次寫入）
- 時間守衛：追蹤執行時間，4分40秒前停止避免超時
- 同步完成後自動更新 OPR Analysis（buildOPRSheet + calculateOPR），受時間守衛保護

### OPR Analysis（進攻效率值計算）

用最小平方法計算每支隊伍的 OPR（Offensive Power Rating）。建立「OPR Analysis」工作表，含三區塊：

**工作表佈局**：
- **Section A（A-L 欄）**：比賽得分表（matchId、6 支隊伍、紅藍得分、紅藍預測、來源）
- **Section B（N-R 欄）**：OPR 排名（rank、teamNumber、opr、matchesPlayed、lastCalculated）
- **Section C（T-Z 欄）**：隊伍查詢（U2 輸入隊號，自動 VLOOKUP/FILTER）

**執行函數**：
1. `buildOPRSheet()` — 建立分頁，優先從 TBA Matches 帶入（含分數），無 TBA 時從 scouting Match Data 建立（分數留空）
2. `calculateOPR()` — 讀取分數，矩陣運算 `x = (A^T·A)^(-1) · A^T·b`，寫入排名 + 預測分數

**自動更新**：每次 TBA 同步（syncAllTBA）完成後，自動執行 buildOPRSheet + calculateOPR 更新 OPR Analysis 工作表，受時間守衛保護，失敗不影響 TBA 同步主流程

**數學原理**：每場比賽 → 2 行（紅/藍），每隊一欄（在場=1），最小平方法求解各隊 OPR

### 關鍵依賴

```json
{
  "lz-string": "QR 資料解壓縮",
  "html5-qrcode": "QR 掃描器"
}
```

---

## 檔案結構

```
frc-scout-scanner/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx           # 應用入口
│   ├── App.tsx            # 主應用元件（路由設定）
│   ├── types.ts           # 類型定義
│   ├── constants/
│   │   ├── index.ts
│   │   └── schema.ts      # TSV Schema 定義
│   ├── i18n/              # 國際化
│   │   ├── index.ts
│   │   ├── context.tsx    # I18nProvider + useI18n hook
│   │   └── locales/
│   │       ├── zh-TW.ts   # 繁體中文
│   │       └── en.ts      # English
│   ├── utils/
│   │   ├── decoder.ts     # LZ-String 解碼
│   │   ├── sheets.ts      # Google Sheets API（上傳 + queryMatchPaths 查詢）
│   │   ├── storage.ts     # localStorage 操作
│   │   ├── exporter.ts    # CSV/JSON 匯出
│   │   └── validator.ts   # 資料驗證
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   └── Navbar.tsx
│   │   ├── scanner/
│   │   │   ├── Scanner.tsx
│   │   │   ├── ScanResult.tsx
│   │   │   └── UploadQueue.tsx
│   │   ├── history/
│   │   │   ├── HistoryList.tsx
│   │   │   ├── HistoryFilter.tsx
│   │   │   └── BatchActions.tsx
│   │   └── ui/
│   │       ├── Card.tsx
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       ├── Toast.tsx
│   │       └── LanguageToggle.tsx
│   └── pages/
│       ├── index.ts
│       ├── ScanPage.tsx
│       ├── HistoryPage.tsx
│       ├── SettingsPage.tsx
│       └── PathViewerPage.tsx  # 路徑可視化工具（顏色選擇器、聯盟標籤、圖層排序、後端查詢、多路徑同時播放、來源標籤 SP/Pit、全部顯示/隱藏）
├── google-apps-script/
│   ├── Code.gs            # Google Apps Script 完整程式碼（doGet action 路由 + doPost 上傳 + TBA 同步 + OPR Analysis）
│   ├── ManualOPR.gs       # 手動輸入版 OPR 分析（onOpen 自訂選單 + buildManualOPRSheet + calculateManualOPR，共用 Code.gs 矩陣運算，toast/alert UI 回饋）
│   └── README.md          # 部署指南
├── CLAUDE.md              # Claude Code 指令（此檔案）
├── PROGRESS.md            # 開發進度追蹤
├── FINDINGS.md            # 研究發現記錄
├── ERRORS.md              # 錯誤記錄與教訓
└── SCANNER_INTEGRATION.md # Scouting App 整合文件
```

---

## 開發規範

### 1. 類型安全

所有資料結構必須有明確的 TypeScript 類型定義：

```typescript
// 正確
interface MatchData {
  scouterName: string;
  matchNumber: number;
  // ...
}

// 錯誤
const data: any = parseQR(qrContent);
```

### 2. QR 解碼處理

```typescript
import LZString from 'lz-string';

// 解碼 QR 內容
function decodeQR(qrContent: string): string[] {
  const tsv = LZString.decompressFromBase64(qrContent);
  if (!tsv) throw new Error('無效的 QR 資料');
  return tsv.split('\t');
}
```

### 3. 錯誤處理

所有 QR 掃描和解碼操作必須有 try-catch：

```typescript
try {
  const result = decodeQR(qrContent);
  // 處理結果
} catch (error) {
  // 顯示用戶友好的錯誤訊息
  setError(error instanceof Error ? error.message : '解碼失敗');
}
```

### 4. 狀態管理

- 使用 React useState/useReducer 管理狀態
- 掃描歷史記錄存放在 localStorage

---

## TSV Schema 定義

### Match Data (21 欄位) - v1.4.0

```typescript
const TSV_SCHEMA_MATCH = [
  // PreMatch (6)
  'scouterName', 'eventCode', 'matchLevel', 'matchNumber', 'alliance', 'teamNumber',
  // Auto (3)
  'autoClimbStatus', 'autoClimbTime', 'autoClimbPosition',
  // Teleop - Bump & Trench & Fuel (3)
  'bumpCount', 'trenchCount', 'fuelDroppedOnBumpCount',
  // Teleop - Penalty (2)
  'minorPenalty', 'majorPenalty',
  // Teleop - Climb (3)
  'teleClimbStatus', 'teleClimbTime', 'teleClimbPosition',
  // PostMatch (4)
  'robotDied', 'almostTipped', 'ridingOnBall', 'comments',
];
```

### Path Data (5 欄位) - v1.4.0

```typescript
const TSV_SCHEMA_PATH = [
  'eventCode', 'matchNumber', 'teamNumber', 'alliance', 'autoPath'
];
```

### Pit Path Data (4 欄位) - Pit Collect 路徑 QR

```typescript
const TSV_SCHEMA_PIT_PATH = [
  'eventCode', 'matchNumber', 'teamNumber', 'autoPath'
];
```

> **注意**：pit-path 和 path 的差異：pit-path 沒有 alliance 欄位（4 欄位 vs 5 欄位），且合併目標是 pit-external 而非 match。多條路徑用 `;` 分隔合併到 pit-external 的 autoPath 欄位。

### Pit Scouting (13 欄位)

```typescript
const TSV_SCHEMA_PIT = [
  'scouterName', 'eventCode', 'teamNumber', 'pitDriveTrain',
  'pitMotorType', 'pitLength', 'pitWidth', 'pitWeight',
  'pitCanFuel', 'pitCanTowerL1', 'pitCanTowerL2', 'pitCanTowerL3',
  'pitAutoNotes'
];
```

### Pit External v2 (22 欄位) - FRC6998 Pit Collect (目前版本)

```typescript
const TSV_SCHEMA_PIT_EXTERNAL = [
  'teamNumber', 'scouterName', 'chassisType', 'weight', 'maxCapacity',
  'intake', 'visionHardware', 'visionSoftware', 'shooting', 'turret',
  'startLocation', 'preload', 'autoIntake', 'autoHang', 'autoTotal',
  'crossMidfield', 'terrain', 'climbLevel', 'climbPosition',
  'climbTime', 'photosTaken', 'notes'
];
```

### Pit External v1 Legacy (23 欄位) - FRC6998 Pit Collect (舊版，含 stability)

```typescript
const TSV_SCHEMA_PIT_EXTERNAL_LEGACY = [
  'teamNumber', 'scouterName', 'chassisType', 'weight', 'maxCapacity',
  'intake', 'visionHardware', 'visionSoftware', 'shooting', 'turret',
  'startLocation', 'preload', 'autoIntake', 'autoHang', 'autoTotal',
  'crossMidfield', 'terrain', 'stability', 'climbLevel', 'climbPosition',
  'climbTime', 'photosTaken', 'notes'
];
```

> **注意**：decoder 會根據欄位數自動選擇 v1 或 v2 schema，兩者都映射為 `pit-external` 類型。

---

## 測試資源

- **Scouting App 線上版**：https://frc-ten.vercel.app
- **Scouting App Repo**：https://github.com/0908869905/FRC

---

## 常用命令

```bash
# 開發
npm run dev

# 建置
npm run build

# 預覽建置結果
npm run preview

# 安裝新套件後驗證
npm install <package>
cat package.json | grep "<package>"
npm run build
```

---

## i18n 國際化

使用 React Context 實作，支援繁體中文和英文。

```typescript
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

語言設定存儲在 localStorage（key: `frc-scanner-locale`）。

---

## Google Apps Script 部署

1. 開啟 Google Sheets，建立新試算表
2. 工具 → 指令碼編輯器
3. 貼上 `google-apps-script/Code.gs` 內容
4. 部署 → 新增部署作業 → Web 應用程式
5. 執行身分：你自己 / 誰可以存取：所有人
6. 複製 URL 到 `src/utils/sheets.ts` 的 `API_URL`

詳細說明見 `google-apps-script/README.md`。

---

## 注意事項

1. **QR 資料是壓縮的**：不能直接讀取，必須用 `lz-string` 解壓
2. **Match 和 Path QR 是分開的**：跨類型配對用 `eventCode + matchNumber + teamNumber`（field-by-field），同類型去重用 `eventCode + matchLevel + matchNumber + alliance + teamNumber`（getMatchKey 5 要素 key）
3. **布林值格式**：TSV 中 "1" = true, "0" = false
4. **空值格式**：空字串或 null 顯示為 "None"
5. **React StrictMode**：會導致相機雙重初始化，已用 useRef 解決
6. **Windows npm**：使用 PowerShell 執行 npm 命令更穩定
7. **matchLevel 值是縮寫**：Scouting PASS 存入的是 'P'（Practice）、'QM'（Quals）、'PO'（Playoff）、'X'（Exhibition），不是全名
8. **getOrCreateSheet 防禦性標頭**：已加入標頭檢查，若工作表存在但標頭全空會自動修復，防止查詢因 indexOf 回傳 -1 而靜默失敗

---

*最後更新：2026-03-21*
