# FRC Scout Scanner - 設計文件包

> 匯出時間: 2026-01-26

---

## 目錄

1. [產品願景](#產品願景)
2. [資料模型](#資料模型)
3. [設計系統](#設計系統)
4. [實作規劃](#實作規劃)

---

## 產品願景

# FRC Scout Scanner - 產品概覽

> 版本：1.0 | 建立日期：2026-01-26

---

### 產品定義

| 項目 | 定義 |
|------|------|
| **產品名稱** | FRC Scout Scanner |
| **一句話描述** | FRC 6998 專用的 Scouting QR Code 掃描器，快速解碼比賽數據並支援多種匯出方式 |
| **目標用戶** | FRC 6998 隊伍內部成員（Scouting 團隊） |
| **主要使用情境** | 比賽現場即時掃描（優先），賽後批次處理（次要） |

---

### 解決的問題

1. **效率問題**：手動輸入 Scouting 數據耗時
2. **準確性問題**：人工抄寫容易出錯
3. **即時性問題**：比賽現場需要快速收集數據進行策略分析

---

### 核心功能

#### 功能優先級

| 優先級 | 功能 | 說明 | 狀態 |
|--------|------|------|------|
| P0 | LZ-String 解碼 | 解壓縮 QR Code 中的 Base64 TSV 資料 | 計畫中 |
| P0 | QR 掃描 | 使用相機掃描 Match/Path/Pit 三種 QR Code | 計畫中 |
| P1 | 資料預覽 | 掃描後顯示解碼結果，確認資料正確性 | 計畫中 |
| P1 | 匯出功能 | 支援 CSV 和 JSON 格式匯出 | 計畫中 |
| P1 | Google Sheets 上傳 | 即時將資料上傳到雲端試算表 | 計畫中 |
| P2 | 歷史記錄 | 本地儲存掃描紀錄，支援查看和管理 | 計畫中 |

#### 功能詳細說明

##### P0: 核心掃描功能

**LZ-String 解碼**
- 解壓縮 Base64 編碼的 TSV 資料
- 自動偵測 QR 類型（Match/Path/Pit）
- 錯誤處理與用戶提示

**QR 掃描**
- 使用裝置相機即時掃描
- 支援三種 QR Code 類型
- 掃描成功後自動解碼

##### P1: 資料處理功能

**資料預覽**
- 以表格形式顯示解碼後的資料
- 區分不同資料類型（Match/Path/Pit）
- 高亮顯示重要欄位

**匯出功能**
- CSV 格式匯出（適用於 Excel/Sheets）
- JSON 格式匯出（適用於程式處理）
- 支援單筆或批次匯出

**Google Sheets 上傳**
- 透過 Google Apps Script 即時上傳
- 上傳狀態回饋
- 失敗重試機制

##### P2: 輔助功能

**歷史記錄**
- localStorage 本地儲存
- 查看過去掃描紀錄
- 刪除或重新上傳功能

---

### 技術規格

#### 資料類型

| 類型 | 欄位數 | 說明 |
|------|--------|------|
| Match Data | 25 | 比賽數據（得分、爬升、評分等） |
| Auto Path | 4 | 自動階段路徑座標 |
| Pit Scouting | 13 | 隊伍機器人資訊 |

#### 編碼方式

```
Scouting App → TSV 字串 → LZ-String compressToBase64 → QR Code
Scanner App → QR Code → LZ-String decompressFromBase64 → TSV 字串 → 解析
```

#### 配對邏輯

Match Data 和 Auto Path QR 是分開的，使用以下組合鍵配對：
- `eventCode`（賽事代碼）
- `matchNumber`（比賽編號）
- `teamNumber`（隊伍編號）

#### 技術棧

- **框架**：React 19 + TypeScript
- **建置工具**：Vite 6
- **樣式**：Tailwind CSS
- **QR 掃描**：html5-qrcode
- **解壓縮**：lz-string

---

### 參考資源

- **Scouting App**：https://frc-ten.vercel.app
- **Scouting App Repo**：https://github.com/0908869905/FRC
- **技術規格文件**：`SCANNER_INTEGRATION.md`

---

## 資料模型

# FRC Scout Scanner - 資料模型

> 版本：1.0 | 建立日期：2026-01-26

---

### 設計決策

| 項目 | 決策 |
|------|------|
| **欄位命名** | 保持英文（使用原始 TSV Schema 名稱） |
| **額外欄位** | scanTime、uploadTime、scannerDevice |
| **資料驗證** | 啟用（評分範圍、數字格式、enum 值） |

---

### 實體定義

#### 1. MatchData（比賽數據）

**來源**：Match Data QR（青色）
**欄位數**：25 + 3（額外欄位）

```typescript
interface MatchData {
  // === 基本資訊 ===
  scouterName: string;        // 記錄員姓名
  eventCode: string;          // 賽事代碼，如 "2026MSLR"
  matchLevel: MatchLevel;     // 比賽等級
  matchNumber: number;        // 比賽編號
  alliance: Alliance;         // 聯盟
  teamNumber: string;         // 隊伍編號

  // === 自動階段 ===
  autoFuel: number;           // 自動階段燃料得分
  autoClimbStatus: ClimbStatus; // 自動爬升狀態
  autoClimbTime: number;      // 自動爬升時間（秒）

  // === 遙控階段 ===
  teleFuel: number;           // 遙控階段燃料得分
  teleClimbStatus: ClimbStatus; // 遙控爬升狀態
  teleClimbTime: number;      // 遙控爬升時間（秒）

  // === 比賽事件 ===
  bumpTrenchCount: number;    // 撞擊溝槽次數
  fuelDroppedOnBump: boolean; // 撞擊時掉落燃料
  penaltyCount: number;       // 罰球次數
  yellowCard: boolean;        // 黃牌
  redCard: boolean;           // 紅牌
  robotDied: boolean;         // 機器人故障
  almostTipped: boolean;      // 差點翻倒
  ridingOnBall: boolean;      // 騎在球上

  // === 主觀評分 ===
  defenseRating: Rating;      // 防守評分 (0-5)
  driverSkill: Rating;        // 駕駛技術 (0-5)
  speedRating: Rating;        // 速度評分 (0-5)

  // === 備註 ===
  comments: string;           // 評論
  subjectiveNotes: string;    // 主觀備註

  // === 額外欄位（Scanner 添加）===
  scanTime: string;           // 掃描時間 (ISO 8601)
  uploadTime?: string;        // 上傳時間 (ISO 8601)
  scannerDevice?: string;     // 掃描裝置資訊
}
```

---

#### 2. PathData（自動路徑）

**來源**：Auto Path QR（琥珀色）
**欄位數**：4 + 3（額外欄位）

```typescript
interface PathData {
  // === 配對資訊 ===
  eventCode: string;          // 賽事代碼
  matchNumber: number;        // 比賽編號
  teamNumber: string;         // 隊伍編號

  // === 路徑資料 ===
  autoPath: string;           // 路徑座標字串

  // === 額外欄位（Scanner 添加）===
  scanTime: string;           // 掃描時間 (ISO 8601)
  uploadTime?: string;        // 上傳時間 (ISO 8601)
  scannerDevice?: string;     // 掃描裝置資訊
}

// 解析後的路徑點
interface PathPoint {
  x: number;  // 水平位置 (0-100%)
  y: number;  // 垂直位置 (0-100%)
}
```

**路徑格式說明**：
- 原始格式：`"x1,y1|x2,y2|x3,y3|..."`
- 座標為百分比值（0-100）
- 空路徑表示為：`"None"`

---

#### 3. PitScouting（隊伍資訊）

**來源**：Pit Scouting QR
**欄位數**：13 + 3（額外欄位）

```typescript
interface PitScouting {
  // === 基本資訊 ===
  scouterName: string;        // 記錄員姓名
  eventCode: string;          // 賽事代碼
  teamNumber: string;         // 隊伍編號

  // === 機器人規格 ===
  pitDriveTrain: string;      // 驅動系統類型
  pitMotorType: string;       // 馬達類型
  pitLength: number;          // 機器人長度
  pitWidth: number;           // 機器人寬度
  pitWeight: number;          // 機器人重量

  // === 能力 ===
  pitCanFuel: boolean;        // 可以處理燃料
  pitCanTowerL1: boolean;     // 可以爬 Level 1
  pitCanTowerL2: boolean;     // 可以爬 Level 2
  pitCanTowerL3: boolean;     // 可以爬 Level 3

  // === 備註 ===
  pitAutoNotes: string;       // 自動階段備註

  // === 額外欄位（Scanner 添加）===
  scanTime: string;           // 掃描時間 (ISO 8601)
  uploadTime?: string;        // 上傳時間 (ISO 8601)
  scannerDevice?: string;     // 掃描裝置資訊
}
```

---

### 列舉類型

```typescript
// 比賽等級
type MatchLevel = 'P' | 'QM' | 'PO' | 'X';
// P = Practice（練習賽）
// QM = Quals（資格賽）
// PO = Playoffs（季後賽）
// X = Test（測試）

// 聯盟
type Alliance = 'Red' | 'Blue';

// 爬升狀態
type ClimbStatus = 'None' | 'Level1' | 'Level2' | 'Level3' | 'Failed';

// 評分（0-5）
type Rating = 0 | 1 | 2 | 3 | 4 | 5;

// QR 類型
type QRType = 'match' | 'path' | 'pit' | 'unknown';
```

---

### 資料驗證規則

#### 驗證類型

| 類型 | 說明 | 失敗處理 |
|------|------|----------|
| 必填 | 欄位不能為空 | 顯示警告 |
| 範圍 | 數值必須在指定範圍內 | 顯示警告 |
| 格式 | 必須符合特定格式 | 顯示警告 |
| 列舉 | 必須是預定義的值之一 | 顯示警告 |

#### 具體規則

```typescript
const validationRules = {
  // 數字格式驗證
  matchNumber: {
    type: 'number',
    min: 1,
    required: true,
    message: '比賽編號必須是正整數'
  },
  teamNumber: {
    type: 'numeric-string',
    required: true,
    message: '隊伍編號必須是數字'
  },

  // 評分範圍驗證
  defenseRating: {
    type: 'number',
    min: 0,
    max: 5,
    message: '防守評分必須在 0-5 之間'
  },
  driverSkill: {
    type: 'number',
    min: 0,
    max: 5,
    message: '駕駛技術評分必須在 0-5 之間'
  },
  speedRating: {
    type: 'number',
    min: 0,
    max: 5,
    message: '速度評分必須在 0-5 之間'
  },

  // 列舉驗證
  matchLevel: {
    type: 'enum',
    values: ['P', 'QM', 'PO', 'X'],
    message: '比賽等級必須是 P/QM/PO/X 其中之一'
  },
  alliance: {
    type: 'enum',
    values: ['Red', 'Blue'],
    message: '聯盟必須是 Red 或 Blue'
  },
  autoClimbStatus: {
    type: 'enum',
    values: ['None', 'Level1', 'Level2', 'Level3', 'Failed'],
    message: '爬升狀態無效'
  },
  teleClimbStatus: {
    type: 'enum',
    values: ['None', 'Level1', 'Level2', 'Level3', 'Failed'],
    message: '爬升狀態無效'
  },

  // 時間驗證
  autoClimbTime: {
    type: 'number',
    min: 0,
    message: '爬升時間不能為負數'
  },
  teleClimbTime: {
    type: 'number',
    min: 0,
    message: '爬升時間不能為負數'
  },

  // 計數驗證
  penaltyCount: {
    type: 'number',
    min: 0,
    message: '罰球次數不能為負數'
  }
};
```

#### 驗證結果類型

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  value: unknown;
  message: string;
  severity: 'error' | 'warning';
}
```

---

### 本地儲存結構

#### ScanHistory（掃描歷史）

```typescript
interface ScanHistory {
  id: string;                 // UUID，唯一識別碼
  scanTime: string;           // 掃描時間 (ISO 8601)
  qrType: QRType;             // QR 類型
  data: MatchData | PathData | PitScouting;
  uploaded: boolean;          // 是否已上傳到 Google Sheets
  uploadTime?: string;        // 上傳時間
  matchKey: string;           // 配對鍵
  validationResult?: ValidationResult; // 驗證結果
}
```

#### localStorage Key 設計

```typescript
const STORAGE_KEYS = {
  SCAN_HISTORY: 'frc-scanner-history',      // 掃描歷史陣列
  SETTINGS: 'frc-scanner-settings',         // 使用者設定
  SHEETS_CONFIG: 'frc-scanner-sheets',      // Google Sheets 設定
};
```

---

### 實體關係

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   MatchData ◄────────── 1:1 ──────────► PathData           │
│       │                                    │                │
│       └────────── 配對鍵 ─────────────────┘                │
│                   eventCode +                               │
│                   matchNumber +                             │
│                   teamNumber                                │
│                                                             │
│   PitScouting ─────────── 獨立 ───────────────────────────  │
│       │                                                     │
│       └── 識別鍵：eventCode + teamNumber                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 配對函式

```typescript
function getMatchKey(data: {
  eventCode: string;
  matchNumber: number | string;
  teamNumber: string;
}): string {
  return `${data.eventCode}_${data.matchNumber}_${data.teamNumber}`;
}

function getPitKey(data: {
  eventCode: string;
  teamNumber: string;
}): string {
  return `${data.eventCode}_${data.teamNumber}`;
}
```

---

### TSV Schema 常數

```typescript
export const TSV_SCHEMA_MATCH = [
  'scouterName', 'eventCode', 'matchLevel', 'matchNumber', 'alliance',
  'teamNumber', 'autoFuel', 'autoClimbStatus', 'autoClimbTime',
  'teleFuel', 'teleClimbStatus', 'teleClimbTime', 'bumpTrenchCount',
  'fuelDroppedOnBump', 'penaltyCount', 'yellowCard', 'redCard',
  'robotDied', 'almostTipped', 'ridingOnBall', 'defenseRating',
  'driverSkill', 'speedRating', 'comments', 'subjectiveNotes'
] as const;

export const TSV_SCHEMA_PATH = [
  'eventCode', 'matchNumber', 'teamNumber', 'autoPath'
] as const;

export const TSV_SCHEMA_PIT = [
  'scouterName', 'eventCode', 'teamNumber', 'pitDriveTrain',
  'pitMotorType', 'pitLength', 'pitWidth', 'pitWeight',
  'pitCanFuel', 'pitCanTowerL1', 'pitCanTowerL2', 'pitCanTowerL3',
  'pitAutoNotes'
] as const;
```

---

### 資料值轉換規則

| TSV 值 | JavaScript 值 | 說明 |
|--------|--------------|------|
| `"1"` | `true` | 布林值 true |
| `"0"` | `false` | 布林值 false |
| `"None"` | `""` 或 `null` | 空值 |
| `"42"` | `42` | 數字 |
| `"3.5"` | `3.5` | 浮點數 |

```typescript
// 轉換函式
export function parseBoolean(val: string): boolean {
  return val === '1' || val.toLowerCase() === 'true';
}

export function parseNumber(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function parseString(val: string): string {
  return val === 'None' ? '' : val;
}
```

---

## 設計系統

### 顏色

| 類別 | 名稱 | Hex 值 | Tailwind | 用途 |
|------|------|--------|----------|------|
| **背景** | primary | `#0f172a` | slate-900 | 主要背景 |
| | secondary | `#1e293b` | slate-800 | 卡片背景、次要區塊 |
| | tertiary | `#334155` | slate-700 | 懸停狀態、分隔線 |
| **品牌** | primary | `#06b6d4` | cyan-500 | 主色調、主要按鈕、連結 |
| | primaryHover | `#0891b2` | cyan-600 | 主色調懸停狀態 |
| | accent | `#f59e0b` | amber-500 | 強調色、Path QR 標識、重要提示 |
| | accentHover | `#d97706` | amber-600 | 強調色懸停狀態 |
| **語義** | success | `#10b981` | emerald-500 | 成功狀態、已上傳、驗證通過 |
| | successLight | `#d1fae5` | emerald-100 | 成功背景（淺色） |
| | error | `#ef4444` | red-500 | 錯誤狀態、驗證失敗、紅牌 |
| | errorLight | `#fee2e2` | red-100 | 錯誤背景（淺色） |
| | warning | `#f59e0b` | amber-500 | 警告狀態、黃牌 |
| | warningLight | `#fef3c7` | amber-100 | 警告背景（淺色） |
| | info | `#3b82f6` | blue-500 | 資訊提示 |
| **文字** | primary | `#ffffff` | white | 主要文字 |
| | secondary | `#94a3b8` | slate-400 | 次要文字、說明文字 |
| | muted | `#64748b` | slate-500 | 禁用文字、佔位符 |
| | inverse | `#0f172a` | slate-900 | 深色文字（用於淺色背景） |
| **聯盟** | red | `#ef4444` | red-500 | 紅色聯盟標識 |
| | redBackground | `#7f1d1d` | red-900 | 紅色聯盟背景 |
| | blue | `#3b82f6` | blue-500 | 藍色聯盟標識 |
| | blueBackground | `#1e3a8a` | blue-900 | 藍色聯盟背景 |
| **QR 類型** | match | `#06b6d4` | cyan-500 | Match Data QR 標識 |
| | path | `#f59e0b` | amber-500 | Auto Path QR 標識 |
| | pit | `#8b5cf6` | violet-500 | Pit Scouting QR 標識 |
| **邊框** | default | `#334155` | slate-700 | 預設邊框 |
| | focus | `#06b6d4` | cyan-500 | 聚焦邊框 |

#### 漸層

| 名稱 | 值 | Tailwind | 用途 |
|------|---|----------|------|
| headerGradient | `linear-gradient(to right, #0f172a, #1e293b)` | `bg-gradient-to-r from-slate-900 to-slate-800` | 頁首漸層 |
| cardGlow | `0 0 20px rgba(6, 182, 212, 0.3)` | - | 卡片發光效果 |

---

### 字型

#### 字型家族

| 類型 | 字型 | 備用字型 | 用途 |
|------|------|----------|------|
| 主要 | Inter | system-ui, -apple-system, sans-serif | UI 文字、按鈕、標籤 |
| 中文 | Noto Sans TC | Inter, system-ui, sans-serif | 中文內容 |
| 等寬 | JetBrains Mono | Consolas, monospace | 數據顯示、隊伍編號、比賽編號 |

#### 字型尺寸

| 名稱 | 大小 | 行高 | Tailwind | 用途 |
|------|------|------|----------|------|
| xs | 0.75rem | 1rem | text-xs | 輔助文字、時間戳記 |
| sm | 0.875rem | 1.25rem | text-sm | 次要文字、表格內容 |
| base | 1rem | 1.5rem | text-base | 正文、按鈕文字 |
| lg | 1.125rem | 1.75rem | text-lg | 卡片標題 |
| xl | 1.25rem | 1.75rem | text-xl | 區塊標題 |
| 2xl | 1.5rem | 2rem | text-2xl | 頁面標題 |
| 3xl | 1.875rem | 2.25rem | text-3xl | 大標題、數據重點 |
| 4xl | 2.25rem | 2.5rem | text-4xl | 主標題 |

#### 字型樣式

| 名稱 | 尺寸 | 粗細 | 顏色 | 用途 |
|------|------|------|------|------|
| heading1 | text-2xl md:text-3xl | font-bold | text-white | 頁面主標題 |
| heading2 | text-xl md:text-2xl | font-semibold | text-white | 區塊標題 |
| heading3 | text-lg | font-semibold | text-white | 卡片標題 |
| body | text-base | font-normal | text-slate-300 | 正文內容 |
| bodySmall | text-sm | font-normal | text-slate-400 | 說明文字 |
| label | text-sm | font-medium | text-slate-300 | 表單標籤 |
| button | text-base | font-medium | - | 按鈕文字 |
| data | text-lg md:text-xl | font-semibold | text-cyan-400 | 數據顯示（隊伍編號、分數） |
| dataSmall | text-sm | font-medium | text-slate-300 | 次要數據 |
| timestamp | text-xs | font-normal | text-slate-500 | 時間戳記 |

#### HTML 匯入

```html
<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
```

#### Tailwind 設定

```javascript
fontFamily: {
  sans: ['Inter', 'Noto Sans TC', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'Consolas', 'monospace']
}
```

---

## 實作規劃

### 路線圖

# FRC Scout Scanner - 開發路線圖

> 版本：1.0 | 建立日期：2026-01-26

---

#### 總覽

| 項目 | 內容 |
|------|------|
| **總開發時間** | 約 6-8 天 |
| **Sprint 數量** | 3 個 |
| **技術棧** | React 19 + TypeScript + Vite 6 + Tailwind CSS |

---

#### Sprint 1: 核心掃描功能 (P0)

**預估時間**：2-3 天

##### 目標

建立應用程式基礎架構和核心掃描功能。

##### 任務清單

| # | 任務 | 說明 | 優先級 |
|---|------|------|--------|
| 1.1 | 專案初始化 | Vite + React + TypeScript 設定 | P0 |
| 1.2 | Tailwind CSS 設定 | 安裝並設定設計系統顏色和字型 | P0 |
| 1.3 | 路由設定 | React Router 多頁面架構 | P0 |
| 1.4 | 應用外殼 | 頂部導航、頁面佈局 | P0 |
| 1.5 | LZ-String 解碼器 | 實作 decoder.ts 工具函式 | P0 |
| 1.6 | QR 掃描元件 | html5-qrcode 整合 | P0 |
| 1.7 | 類型定義 | MatchData, PathData, PitScouting 介面 | P0 |
| 1.8 | 基本掃描流程 | 掃描 → 解碼 → 顯示結果 | P0 |

##### 交付物

- [x] 可運行的開發環境
- [x] 基本 UI 框架（導航 + 頁面切換）
- [x] QR 掃描功能
- [x] 資料解碼功能

---

#### Sprint 2: 資料處理功能 (P1)

**預估時間**：2-3 天

##### 目標

完成資料預覽、匯出和 Google Sheets 上傳功能。

##### 任務清單

| # | 任務 | 說明 | 優先級 |
|---|------|------|--------|
| 2.1 | 資料預覽元件 | 表格顯示解碼後的資料 | P1 |
| 2.2 | 資料驗證 | 實作驗證規則和錯誤顯示 | P1 |
| 2.3 | localStorage 儲存 | 掃描歷史本地儲存 | P1 |
| 2.4 | CSV 匯出 | 產生 CSV 檔案下載 | P1 |
| 2.5 | JSON 匯出 | 產生 JSON 檔案下載 | P1 |
| 2.6 | Google Sheets 整合 | Apps Script API 串接 | P1 |
| 2.7 | 上傳狀態管理 | 上傳中、成功、失敗狀態 | P1 |
| 2.8 | Match + Path 配對 | 自動配對邏輯 | P1 |

##### 交付物

- [x] 資料預覽功能
- [x] 匯出功能（CSV/JSON）
- [x] Google Sheets 上傳功能
- [x] 掃描歷史儲存

---

#### Sprint 3: 輔助功能 (P2)

**預估時間**：1-2 天

##### 目標

完成歷史記錄管理和設定頁面。

##### 任務清單

| # | 任務 | 說明 | 優先級 |
|---|------|------|--------|
| 3.1 | 歷史頁面 | 掃描記錄列表 | P2 |
| 3.2 | 歷史篩選 | 按類型、日期、上傳狀態篩選 | P2 |
| 3.3 | 批次操作 | 批次上傳、批次刪除 | P2 |
| 3.4 | 設定頁面 | Google Sheets URL 設定 | P2 |
| 3.5 | 設定持久化 | 設定存入 localStorage | P2 |
| 3.6 | 錯誤處理優化 | 友善錯誤訊息 | P2 |
| 3.7 | 響應式設計 | 手機/平板適配 | P2 |
| 3.8 | 最終測試 | 完整流程測試 | P2 |

##### 交付物

- [x] 完整的歷史記錄功能
- [x] 設定頁面
- [x] 響應式設計
- [x] 可部署的應用程式

---

#### 里程碑

```
Week 1
├── Day 1-2: Sprint 1 (核心掃描)
│   └── Milestone: 可以掃描並解碼 QR Code
├── Day 3-4: Sprint 2 (資料處理)
│   └── Milestone: 可以預覽、匯出、上傳資料
└── Day 5-6: Sprint 3 (輔助功能)
    └── Milestone: 完整功能的應用程式

Week 2 (Optional)
├── Day 7: 部署到 Vercel
└── Day 8: 現場測試和修復
```

---

#### 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| QR 掃描在特定裝置不穩定 | 高 | 測試多種裝置，準備備用掃描庫 |
| Google Sheets API 限制 | 中 | 實作批次上傳，加入重試機制 |
| 比賽現場網路不穩 | 中 | 離線儲存 + 後續批次上傳 |

---

#### 成功標準

- [ ] 可以成功掃描並解碼 3 種 QR Code
- [ ] 資料驗證正確識別錯誤資料
- [ ] 可以匯出 CSV 和 JSON
- [ ] 可以上傳到 Google Sheets
- [ ] 歷史記錄正確儲存和顯示
- [ ] 在手機瀏覽器上正常運作

---

### 應用程式外殼

# FRC Scout Scanner - 應用外殼規格

> 版本：1.0 | 建立日期：2026-01-26

---

#### 頁面結構

```
/                   首頁（掃描頁）
/history            歷史記錄頁
/settings           設定頁
```

---

#### 整體佈局

```
+----------------------------------------------------------+
|                     頂部導航列                             |
|  [Logo] FRC Scout Scanner    [掃描] [歷史] [設定]         |
+----------------------------------------------------------+
|                                                          |
|                                                          |
|                     主要內容區域                          |
|                   (依據路由切換)                          |
|                                                          |
|                                                          |
+----------------------------------------------------------+
|                     底部狀態列                            |
|              上次掃描: 12:34:56 | 待上傳: 3              |
+----------------------------------------------------------+
```

---

#### 頂部導航列

##### 規格

| 屬性 | 值 |
|------|---|
| 高度 | 64px (h-16) |
| 背景 | slate-800 |
| 固定 | 是 (sticky top-0) |
| z-index | 50 |

##### 導航項目

| 項目 | 路徑 | 圖示 | 說明 |
|------|------|------|------|
| 掃描 | `/` | QrCode | 主要掃描功能 |
| 歷史 | `/history` | ClockHistory | 掃描記錄 |
| 設定 | `/settings` | Cog | 應用設定 |

---

#### 頁面 1: 掃描頁 (/)

```
+----------------------------------------------------------+
|                      頂部導航                              |
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |                  QR 掃描器區域                      |  |
|  |                 (相機即時預覽)                      |  |
|  |                                                    |  |
|  |                  [暫停] [切換相機]                  |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |  掃描結果                                          |  |
|  |  ┌──────────────────────────────────────────────┐  |  |
|  |  │ [Match] Team 6998 | QM #42 | Red Alliance   │  |  |
|  |  │ 掃描時間: 2026-01-26 12:34:56               │  |  |
|  |  │ 狀態: ✓ 驗證通過                             │  |  |
|  |  │                                              │  |  |
|  |  │ [查看詳情]  [上傳]  [刪除]                   │  |  |
|  |  └──────────────────────────────────────────────┘  |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |  待上傳佇列 (3)                     [全部上傳]      |  |
|  |  • Match - Team 6998 - QM #42                     |  |
|  |  • Path  - Team 6998 - QM #42                     |  |
|  |  • Match - Team 1234 - QM #43                     |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

---

#### 頁面 2: 歷史頁 (/history)

```
+----------------------------------------------------------+
|                      頂部導航                              |
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |  篩選器                                             |  |
|  |  類型: [全部 v]  狀態: [全部 v]  日期: [今天 v]    |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |  [□ 全選]  已選 0 項    [批次上傳] [批次刪除]       |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |  歷史記錄列表                                       |  |
|  |  ┌──────────────────────────────────────────────┐  |  |
|  |  │ [□] [Match] Team 6998 | QM #42    [✓ 已上傳] │  |  |
|  |  │     2026-01-26 12:34:56                      │  |  |
|  |  ├──────────────────────────────────────────────┤  |  |
|  |  │ [□] [Path]  Team 6998 | QM #42    [○ 待上傳] │  |  |
|  |  │     2026-01-26 12:35:12                      │  |  |
|  |  └──────────────────────────────────────────────┘  |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |  匯出                                               |  |
|  |  [匯出 CSV]  [匯出 JSON]  [清除全部歷史]            |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

---

#### 頁面 3: 設定頁 (/settings)

```
+----------------------------------------------------------+
|                      頂部導航                              |
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |  Google Sheets 設定                                 |  |
|  |  ┌──────────────────────────────────────────────┐  |  |
|  |  │ Apps Script URL:                             │  |  |
|  |  │ [https://script.google.com/...            ]  │  |  |
|  |  │                                              │  |  |
|  |  │ [測試連線]  狀態: ✓ 已連線                   │  |  |
|  |  └──────────────────────────────────────────────┘  |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |  匯出設定                                           |  |
|  |  ┌──────────────────────────────────────────────┐  |  |
|  |  │ 預設匯出格式:  (•) CSV  ( ) JSON             │  |  |
|  |  │ 包含標題列:    [✓]                           │  |  |
|  |  │ 時間格式:      [ISO 8601 v]                  │  |  |
|  |  └──────────────────────────────────────────────┘  |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |  掃描設定                                           |  |
|  |  ┌──────────────────────────────────────────────┐  |  |
|  |  │ 掃描成功後自動上傳:  [✓]                     │  |  |
|  |  │ 播放掃描成功音效:    [✓]                     │  |  |
|  |  │ 震動回饋:            [✓]                     │  |  |
|  |  └──────────────────────────────────────────────┘  |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |  關於                                               |  |
|  |  FRC Scout Scanner v1.0.0                          |  |
|  |  FRC Team 6998                                     |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

---

#### 響應式設計

##### 斷點

| 斷點 | 寬度 | 說明 |
|------|------|------|
| sm | 640px | 手機（橫向） |
| md | 768px | 平板 |
| lg | 1024px | 桌面 |

##### 手機版調整

- 導航改為底部 Tab Bar
- 掃描器佔滿螢幕寬度
- 減少卡片 padding
- 表格改為卡片列表

```
手機版佈局：

+------------------+
|   頂部標題列      |
+------------------+
|                  |
|    掃描器        |
|                  |
+------------------+
|   掃描結果       |
+------------------+
|   待上傳佇列     |
+------------------+
| [掃描][歷史][設定]|  <- 底部 Tab Bar
+------------------+
```

---

#### 路由定義

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScanPage } from './pages/ScanPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ScanPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

#### 共用元件

| 元件 | 說明 |
|------|------|
| `<Layout />` | 整體佈局（導航 + Outlet） |
| `<Navbar />` | 頂部導航列 |
| `<TabBar />` | 手機版底部導航 |
| `<Card />` | 卡片容器 |
| `<Button />` | 按鈕（primary/secondary/danger） |
| `<Badge />` | 標籤（QR 類型、狀態） |
| `<Modal />` | 對話框 |
| `<Toast />` | 通知訊息 |

---

### 實作計畫

# FRC Scout Scanner - 實作計畫

> 版本：1.0 | 建立日期：2026-01-26

---

#### 專案總覽

| 項目 | 內容 |
|------|------|
| **專案名稱** | FRC Scout Scanner |
| **技術棧** | React 19 + TypeScript + Vite 6 + Tailwind CSS |
| **目標** | 掃描 FRC Scouting QR Code 並上傳到 Google Sheets |
| **預估時間** | 6-8 天 |

---

#### 檔案結構

```
frc-scout-scanner/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
│
├── public/
│   └── favicon.svg
│
├── src/
│   ├── main.tsx                 # 應用入口
│   ├── App.tsx                  # 根元件（路由設定）
│   ├── index.css                # 全域樣式（Tailwind）
│   │
│   ├── types/
│   │   ├── index.ts             # 類型匯出
│   │   ├── match.ts             # MatchData 介面
│   │   ├── path.ts              # PathData 介面
│   │   ├── pit.ts               # PitScouting 介面
│   │   └── common.ts            # 共用類型
│   │
│   ├── constants/
│   │   ├── index.ts             # 常數匯出
│   │   ├── schema.ts            # TSV Schema 定義
│   │   └── validation.ts        # 驗證規則
│   │
│   ├── utils/
│   │   ├── decoder.ts           # LZ-String 解碼
│   │   ├── validator.ts         # 資料驗證
│   │   ├── parser.ts            # TSV 解析
│   │   ├── exporter.ts          # CSV/JSON 匯出
│   │   ├── storage.ts           # localStorage 操作
│   │   └── sheets.ts            # Google Sheets API
│   │
│   ├── hooks/
│   │   ├── useScanner.ts        # QR 掃描 Hook
│   │   ├── useHistory.ts        # 歷史記錄 Hook
│   │   ├── useSettings.ts       # 設定 Hook
│   │   └── useUpload.ts         # 上傳 Hook
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx       # 整體佈局
│   │   │   ├── Navbar.tsx       # 頂部導航
│   │   │   └── TabBar.tsx       # 底部導航（手機版）
│   │   │
│   │   ├── scanner/
│   │   │   ├── Scanner.tsx      # QR 掃描器
│   │   │   ├── ScanResult.tsx   # 掃描結果顯示
│   │   │   └── UploadQueue.tsx  # 待上傳佇列
│   │   │
│   │   ├── history/
│   │   │   ├── HistoryFilter.tsx  # 篩選器
│   │   │   ├── HistoryList.tsx    # 列表
│   │   │   ├── HistoryItem.tsx    # 單筆記錄
│   │   │   └── BatchActions.tsx   # 批次操作
│   │   │
│   │   ├── preview/
│   │   │   ├── DataPreview.tsx    # 資料預覽
│   │   │   ├── MatchPreview.tsx   # Match 資料預覽
│   │   │   ├── PathPreview.tsx    # Path 資料預覽
│   │   │   └── PitPreview.tsx     # Pit 資料預覽
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx       # 按鈕
│   │       ├── Card.tsx         # 卡片
│   │       ├── Badge.tsx        # 標籤
│   │       ├── Modal.tsx        # 對話框
│   │       ├── Toast.tsx        # 通知
│   │       └── Input.tsx        # 輸入框
│   │
│   └── pages/
│       ├── ScanPage.tsx         # 掃描頁
│       ├── HistoryPage.tsx      # 歷史頁
│       └── SettingsPage.tsx     # 設定頁
│
├── product/                     # 產品設計文件
│   ├── product-overview.md
│   ├── product-roadmap.md
│   ├── implementation-plan.md
│   ├── data-model/
│   │   └── data-model.md
│   ├── design-system/
│   │   ├── colors.json
│   │   └── typography.json
│   └── shell/
│       └── spec.md
│
├── CLAUDE.md                    # Claude Code 指令
├── SCANNER_INTEGRATION.md       # 技術規格
└── README.md
```

---

#### 核心程式碼範例

##### 1. 解碼器 (decoder.ts)

```typescript
import LZString from 'lz-string';
import { TSV_SCHEMA_MATCH, TSV_SCHEMA_PATH, TSV_SCHEMA_PIT } from '../constants/schema';

export type QRType = 'match' | 'path' | 'pit' | 'unknown';

export interface DecodeResult {
  type: QRType;
  data: Record<string, string>;
  raw: string[];
}

export function decodeQR(qrContent: string): DecodeResult {
  // 解壓縮
  const tsv = LZString.decompressFromBase64(qrContent);
  if (!tsv) {
    throw new Error('無法解壓縮 QR Code 資料');
  }

  // 分割 TSV
  const values = tsv.split('\t');

  // 偵測類型
  const type = detectQRType(values);

  // 取得對應的 Schema
  const schema = getSchema(type);

  // 建立資料物件
  const data: Record<string, string> = {};
  schema.forEach((key, i) => {
    data[key] = values[i] ?? '';
  });

  return { type, data, raw: values };
}

function detectQRType(values: string[]): QRType {
  if (values.length === TSV_SCHEMA_MATCH.length) return 'match';
  if (values.length === TSV_SCHEMA_PATH.length) return 'path';
  if (values.length === TSV_SCHEMA_PIT.length) return 'pit';
  return 'unknown';
}

function getSchema(type: QRType): readonly string[] {
  switch (type) {
    case 'match': return TSV_SCHEMA_MATCH;
    case 'path': return TSV_SCHEMA_PATH;
    case 'pit': return TSV_SCHEMA_PIT;
    default: return [];
  }
}
```

##### 2. 掃描器 Hook (useScanner.ts)

```typescript
import { useState, useCallback } from 'react';
import { decodeQR, DecodeResult } from '../utils/decoder';
import { validateData } from '../utils/validator';
import { ScanHistory } from '../types';

export function useScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback((qrContent: string) => {
    try {
      setError(null);

      // 解碼
      const decoded = decodeQR(qrContent);

      // 驗證
      const validation = validateData(decoded.type, decoded.data);

      // 建立歷史記錄
      const history: ScanHistory = {
        id: crypto.randomUUID(),
        scanTime: new Date().toISOString(),
        qrType: decoded.type,
        data: decoded.data,
        uploaded: false,
        matchKey: getMatchKey(decoded.data),
        validationResult: validation,
      };

      setLastScan(history);
      return history;
    } catch (e) {
      const message = e instanceof Error ? e.message : '解碼失敗';
      setError(message);
      return null;
    }
  }, []);

  return {
    isScanning,
    setIsScanning,
    lastScan,
    error,
    handleScan,
  };
}

function getMatchKey(data: Record<string, string>): string {
  return `${data.eventCode}_${data.matchNumber}_${data.teamNumber}`;
}
```

---

#### Tailwind 設定

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        // 使用 Tailwind 預設色即可，設計系統中已定義
      },
    },
  },
  plugins: [],
}
```

---

#### 測試清單

##### 功能測試

- [ ] 掃描 Match Data QR → 正確解碼 25 欄位
- [ ] 掃描 Path Data QR → 正確解碼 4 欄位
- [ ] 掃描 Pit Scouting QR → 正確解碼 13 欄位
- [ ] 驗證錯誤時顯示警告
- [ ] 歷史記錄正確儲存
- [ ] CSV 匯出格式正確
- [ ] JSON 匯出格式正確
- [ ] Google Sheets 上傳成功
- [ ] 篩選功能正常
- [ ] 批次操作正常

##### 相容性測試

- [ ] Chrome (桌面)
- [ ] Safari (iOS)
- [ ] Chrome (Android)
- [ ] 手機版佈局正常

---

#### 部署

```bash
# 建置
npm run build

# 預覽
npm run preview

# 部署到 Vercel
npx vercel
```

---

*此文件由 Design Expert 自動產生*
