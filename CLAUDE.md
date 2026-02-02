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

- **Match Data QR**：20 個欄位，包含比賽數據 (v1.3.0)
- **Auto Path QR**：4 個欄位，包含自動路徑
- **Pit Scouting QR**：13 個欄位，包含隊伍資訊
- **Pit External QR**：22 個欄位，FRC6998 Pit Collect 格式

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
│   │   ├── sheets.ts      # Google Sheets API
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
│       └── PathViewerPage.tsx  # 路徑可視化工具
├── google-apps-script/
│   ├── Code.gs            # Google Apps Script 完整程式碼
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

### Match Data (20 欄位) - v1.3.0

```typescript
const TSV_SCHEMA_MATCH = [
  // PreMatch (6)
  'scouterName', 'eventCode', 'matchLevel', 'matchNumber', 'alliance', 'teamNumber',
  // Auto (3)
  'autoClimbStatus', 'autoClimbTime', 'autoClimbPosition',
  // Teleop - Bump & Fuel (2)
  'bumpTrenchCount', 'fuelDroppedOnBumpCount',
  // Teleop - Penalty (2)
  'minorPenalty', 'majorPenalty',
  // Teleop - Climb (3)
  'teleClimbStatus', 'teleClimbTime', 'teleClimbPosition',
  // PostMatch (4)
  'robotDied', 'almostTipped', 'ridingOnBall', 'comments',
];
```

### Path Data (4 欄位)

```typescript
const TSV_SCHEMA_PATH = [
  'eventCode', 'matchNumber', 'teamNumber', 'autoPath'
];
```

### Pit Scouting (13 欄位)

```typescript
const TSV_SCHEMA_PIT = [
  'scouterName', 'eventCode', 'teamNumber', 'pitDriveTrain',
  'pitMotorType', 'pitLength', 'pitWidth', 'pitWeight',
  'pitCanFuel', 'pitCanTowerL1', 'pitCanTowerL2', 'pitCanTowerL3',
  'pitAutoNotes'
];
```

### Pit External (22 欄位) - FRC6998 Pit Collect

```typescript
const TSV_SCHEMA_PIT_EXTERNAL = [
  'teamNumber', 'scouterName', 'chassisType', 'weight', 'maxCapacity',
  'intake', 'visionHardware', 'visionSoftware', 'shooting', 'turret',
  'startLocation', 'preload', 'autoIntake', 'autoHang', 'autoTotal',
  'crossMidfield', 'terrain', 'climbLevel', 'climbPosition',
  'climbTime', 'photosTaken', 'notes'
];
```

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
2. **Match 和 Path QR 是分開的**：需要用 `eventCode + matchNumber + teamNumber` 配對
3. **布林值格式**：TSV 中 "1" = true, "0" = false
4. **空值格式**：空字串或 null 顯示為 "None"
5. **React StrictMode**：會導致相機雙重初始化，已用 useRef 解決
6. **Windows npm**：使用 PowerShell 執行 npm 命令更穩定

---

*最後更新：2026-02-01*
