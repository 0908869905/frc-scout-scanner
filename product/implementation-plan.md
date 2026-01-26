# FRC Scout Scanner - 實作計畫

> 版本：1.0 | 建立日期：2026-01-26

---

## 專案總覽

| 項目 | 內容 |
|------|------|
| **專案名稱** | FRC Scout Scanner |
| **技術棧** | React 19 + TypeScript + Vite 6 + Tailwind CSS |
| **目標** | 掃描 FRC Scouting QR Code 並上傳到 Google Sheets |
| **預估時間** | 6-8 天 |

---

## 檔案結構

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

## 開發順序

### Sprint 1: Day 1-2 (核心功能)

#### Day 1 上午：專案設定

```bash
# 1. 初始化專案（如果還沒有）
npm create vite@latest . -- --template react-ts

# 2. 安裝依賴
npm install react-router-dom lz-string html5-qrcode
npm install -D @types/lz-string tailwindcss postcss autoprefixer

# 3. 初始化 Tailwind
npx tailwindcss init -p
```

**任務清單**：
- [ ] 設定 Vite 和 TypeScript
- [ ] 設定 Tailwind CSS（使用設計系統的顏色和字型）
- [ ] 新增 Google Fonts 到 index.html
- [ ] 建立基本檔案結構

#### Day 1 下午：類型定義和工具函式

**任務清單**：
- [ ] 建立 `types/` 目錄下的所有類型定義
- [ ] 建立 `constants/schema.ts` TSV Schema
- [ ] 實作 `utils/decoder.ts` LZ-String 解碼
- [ ] 實作 `utils/parser.ts` TSV 解析
- [ ] 實作 `utils/validator.ts` 資料驗證

#### Day 2 上午：路由和佈局

**任務清單**：
- [ ] 設定 React Router
- [ ] 建立 `Layout.tsx` 整體佈局
- [ ] 建立 `Navbar.tsx` 導航列
- [ ] 建立三個頁面空殼

#### Day 2 下午：QR 掃描

**任務清單**：
- [ ] 建立 `Scanner.tsx` 元件
- [ ] 整合 html5-qrcode
- [ ] 實作掃描 → 解碼 → 顯示流程
- [ ] 建立 `ScanResult.tsx` 顯示結果

---

### Sprint 2: Day 3-4 (資料處理)

#### Day 3 上午：資料預覽

**任務清單**：
- [ ] 建立 `DataPreview.tsx` 資料預覽元件
- [ ] 建立 `MatchPreview.tsx` Match 資料表格
- [ ] 建立 `PathPreview.tsx` Path 視覺化
- [ ] 建立 `PitPreview.tsx` Pit 資料表格

#### Day 3 下午：本地儲存

**任務清單**：
- [ ] 實作 `utils/storage.ts` localStorage 操作
- [ ] 建立 `useHistory.ts` Hook
- [ ] 實作 Match + Path 配對邏輯
- [ ] 測試歷史記錄功能

#### Day 4 上午：匯出功能

**任務清單**：
- [ ] 實作 `utils/exporter.ts` 匯出邏輯
- [ ] CSV 匯出（含標題列）
- [ ] JSON 匯出
- [ ] 檔案下載功能

#### Day 4 下午：Google Sheets 整合

**任務清單**：
- [ ] 建立 Google Apps Script（參考 SCANNER_INTEGRATION.md）
- [ ] 實作 `utils/sheets.ts` API 呼叫
- [ ] 建立 `useUpload.ts` Hook
- [ ] 實作上傳狀態管理

---

### Sprint 3: Day 5-6 (輔助功能)

#### Day 5：歷史頁面

**任務清單**：
- [ ] 建立 `HistoryPage.tsx` 完整頁面
- [ ] 建立 `HistoryFilter.tsx` 篩選器
- [ ] 建立 `HistoryList.tsx` 列表
- [ ] 建立 `BatchActions.tsx` 批次操作
- [ ] 實作篩選邏輯

#### Day 6 上午：設定頁面

**任務清單**：
- [ ] 建立 `SettingsPage.tsx` 完整頁面
- [ ] 建立 `useSettings.ts` Hook
- [ ] Google Sheets URL 設定
- [ ] 匯出設定
- [ ] 掃描設定

#### Day 6 下午：最終優化

**任務清單**：
- [ ] 響應式設計調整
- [ ] 手機版底部 TabBar
- [ ] 錯誤處理優化
- [ ] 完整流程測試
- [ ] 準備部署

---

## 核心程式碼範例

### 1. 解碼器 (decoder.ts)

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

### 2. 驗證器 (validator.ts)

```typescript
import { ValidationResult, ValidationError } from '../types';
import { VALIDATION_RULES } from '../constants/validation';

export function validateData(
  type: string,
  data: Record<string, string>
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, value] of Object.entries(data)) {
    const rule = VALIDATION_RULES[field];
    if (!rule) continue;

    const error = validateField(field, value, rule);
    if (error) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors: errors.filter(e => e.severity === 'error'),
    warnings: errors.filter(e => e.severity === 'warning'),
  };
}

function validateField(
  field: string,
  value: string,
  rule: ValidationRule
): ValidationError | null {
  // 必填檢查
  if (rule.required && (!value || value === 'None')) {
    return {
      field,
      value,
      message: `${field} 為必填欄位`,
      severity: 'error',
    };
  }

  // 範圍檢查
  if (rule.type === 'number' && value) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return {
        field,
        value,
        message: rule.message || `${field} 必須是數字`,
        severity: 'error',
      };
    }
    if (rule.min !== undefined && num < rule.min) {
      return {
        field,
        value,
        message: rule.message || `${field} 不能小於 ${rule.min}`,
        severity: 'warning',
      };
    }
    if (rule.max !== undefined && num > rule.max) {
      return {
        field,
        value,
        message: rule.message || `${field} 不能大於 ${rule.max}`,
        severity: 'warning',
      };
    }
  }

  // 列舉檢查
  if (rule.type === 'enum' && value && rule.values) {
    if (!rule.values.includes(value)) {
      return {
        field,
        value,
        message: rule.message || `${field} 必須是 ${rule.values.join('/')} 其中之一`,
        severity: 'error',
      };
    }
  }

  return null;
}
```

### 3. 掃描器 Hook (useScanner.ts)

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

## Tailwind 設定

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

## 測試清單

### 功能測試

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

### 相容性測試

- [ ] Chrome (桌面)
- [ ] Safari (iOS)
- [ ] Chrome (Android)
- [ ] 手機版佈局正常

---

## 部署

```bash
# 建置
npm run build

# 預覽
npm run preview

# 部署到 Vercel
npx vercel
```

---

*最後更新：2026-01-26*
