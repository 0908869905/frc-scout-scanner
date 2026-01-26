# FRC Scout Scanner - 資料模型

> 版本：1.0 | 建立日期：2026-01-26

---

## 設計決策

| 項目 | 決策 |
|------|------|
| **欄位命名** | 保持英文（使用原始 TSV Schema 名稱） |
| **額外欄位** | scanTime、uploadTime、scannerDevice |
| **資料驗證** | 啟用（評分範圍、數字格式、enum 值） |

---

## 實體定義

### 1. MatchData（比賽數據）

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

### 2. PathData（自動路徑）

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

### 3. PitScouting（隊伍資訊）

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

## 列舉類型

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

## 資料驗證規則

### 驗證類型

| 類型 | 說明 | 失敗處理 |
|------|------|----------|
| 必填 | 欄位不能為空 | 顯示警告 |
| 範圍 | 數值必須在指定範圍內 | 顯示警告 |
| 格式 | 必須符合特定格式 | 顯示警告 |
| 列舉 | 必須是預定義的值之一 | 顯示警告 |

### 具體規則

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

### 驗證結果類型

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

## 本地儲存結構

### ScanHistory（掃描歷史）

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

### localStorage Key 設計

```typescript
const STORAGE_KEYS = {
  SCAN_HISTORY: 'frc-scanner-history',      // 掃描歷史陣列
  SETTINGS: 'frc-scanner-settings',         // 使用者設定
  SHEETS_CONFIG: 'frc-scanner-sheets',      // Google Sheets 設定
};
```

---

## 實體關係

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

### 配對函式

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

## TSV Schema 常數

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

## 資料值轉換規則

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

*最後更新：2026-01-26*
