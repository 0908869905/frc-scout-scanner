# FRC Scout Scanner - 錯誤記錄與教訓

> 此檔案記錄開發過程中遇到的錯誤、根本原因和解決方案，避免重複犯錯。

---

## 使用指南

每次遇到錯誤時，按以下格式記錄：

```markdown
### [錯誤類型] 簡短描述

**日期**：YYYY-MM-DD
**嚴重程度**：高/中/低
**狀態**：已解決/進行中

**錯誤訊息**：
```
完整的錯誤訊息
```

**根本原因**：
- 原因分析

**解決方案**：
- 具體修復步驟

**預防措施**：
- 未來如何避免

**相關檔案**：
- 受影響的檔案列表
```

---

## 錯誤索引

| ID | 類型 | 描述 | 日期 | 狀態 |
|----|------|------|------|------|
| E001 | npm | Windows Git Bash 環境 npm install 無輸出 | 2026-01-26 | 已解決 |
| E002 | React | StrictMode 雙重掛載導致相機初始化失敗 | 2026-01-26 | 已解決 |
| E003 | CORS | Google Apps Script 上傳失敗 | 2026-01-26 | 已解決 |
| E004 | React | useEffect dependency 導致相機重啟 | 2026-01-26 | 已解決 |
| E005 | TypeScript | ScanHistoryItem.qrType vs type 混淆 | 2026-01-26 | 已解決 |
| E006 | Camera | OverconstrainedError 相機參數不支援 | 2026-01-26 | 已解決 |
| E007 | Schema | Schema 欄位數不匹配導致「資料不完整」 | 2026-01-28 | 已解決 |
| E008 | Schema | Pit Collect 雙版本欄位數不匹配導致「資料不完整」 | 2026-02-02 | 已解決 |
| E009 | React | Stale closure 導致連續掃描多張 QR 時合併失敗 | 2026-02-03 | 已解決 |
| E010 | TypeScript | React namespace import 缺失導致 MouseEvent/TouchEvent 類型錯誤 | 2026-02-04 | 已解決 |
| E011 | React | handleQuery 空值檢查位置錯誤導致 loading 狀態卡住 | 2026-02-04 | 已解決 |
| E012 | Apps Script | TBA sync error 回傳缺少 rows 屬性 | 2026-02-04 | 已解決 |
| E013 | Apps Script | syncAllTBA log 未印出錯誤原因 | 2026-02-04 | 已解決 |
| E014 | Apps Script | UrlFetchApp.fetch 權限不足（缺少 external_request scope） | 2026-02-04 | 已解決 |
| E015 | Apps Script | ScriptApp 權限不足（缺少 scriptapp scope） | 2026-02-04 | 已解決 |
| E016 | Apps Script | ETag 快取導致首次 manualSyncTBA 全部 not_modified | 2026-02-04 | 已解決 |
| E017 | Logic | getMatchKey 缺少 matchLevel 導致不同比賽等級被誤判為重複 | 2026-02-05 | 已解決 |

---

## 錯誤記錄

### [E001] Windows Git Bash 環境 npm install 無輸出

**日期**：2026-01-26
**嚴重程度**：中
**狀態**：已解決

**錯誤訊息**：
```
npm install lz-string html5-qrcode
# 命令執行無任何輸出，但套件未安裝
# node_modules 中找不到套件
# package.json 未更新
```

**根本原因**：
- Windows 環境下，Git Bash 中的 npm 命令可能無法正確執行
- Bash 工具在某些 Windows 環境下與 npm 的交互有問題
- npm 的輸出可能被重定向或丟失

**解決方案**：
```bash
# 方法 1：使用 PowerShell 執行 npm 命令
powershell -Command "cd D:\frc-scout-scanner; npm install"

# 方法 2：手動編輯 package.json 添加依賴
# 然後清除並重新安裝
rm -rf node_modules package-lock.json
npm install
```

**預防措施**：
- 在 Windows 環境下，優先使用 PowerShell 執行 npm 命令
- 安裝套件後必須驗證：
  ```bash
  # 檢查 package.json
  cat package.json | grep "套件名稱"

  # 檢查 node_modules
  ls node_modules/套件名稱/package.json

  # 執行建置測試
  npm run build
  ```

**相關檔案**：
- package.json
- node_modules/

---

### [E003] Google Apps Script CORS 上傳失敗

**日期**：2026-01-26
**嚴重程度**：高
**狀態**：已解決

**錯誤訊息**：
```
上傳顯示成功，但試算表沒有資料
Response: {"success":true,"message":"Processed 0/1 items"}
```

**根本原因**：
- `Content-Type: application/json` 會觸發 CORS preflight (OPTIONS) 請求
- Google Apps Script 不支援 OPTIONS 方法
- 請求被瀏覽器攔截，實際上沒有送達

**解決方案**：
```typescript
// 移除 headers，讓瀏覽器使用預設 Content-Type
const response = await fetch(url, {
  method: 'POST',
  redirect: 'follow',
  body: JSON.stringify(payload),
});
```

**預防措施**：
- 對 Google Apps Script 的請求不要設定 Content-Type header
- Apps Script 會自動解析 JSON body

**相關檔案**：
- src/utils/sheets.ts

---

### [E004] useEffect dependency 導致相機重啟

**日期**：2026-01-26
**嚴重程度**：高
**狀態**：已解決

**錯誤訊息**：
```
掃描後相機消失/重啟
```

**根本原因**：
- `handleScanSuccess` callback 在 useEffect dependencies 中
- 當 parent component 重新渲染時，`onScan` prop 會重新創建
- 導致 `handleScanSuccess` 改變，觸發 useEffect 清理並重新初始化

**解決方案**：
```typescript
// 使用 ref 存儲 callbacks
const onScanRef = useRef(onScan);
onScanRef.current = onScan;

// handleScanSuccess 使用 ref
const handleScanSuccess = useCallback((text: string) => {
  onScanRef.current(result);
}, []); // 空依賴

// useEffect 只依賴 isActive
useEffect(() => {
  // ...
}, [isActive]);
```

**預防措施**：
- 對於會觸發 parent state 更新的 callbacks，使用 useRef 存儲
- useEffect 的 dependencies 要仔細考慮是否真的需要

**相關檔案**：
- src/components/scanner/Scanner.tsx

---

### [E005] ScanHistoryItem.qrType vs type 混淆

**日期**：2026-01-26
**嚴重程度**：高
**狀態**：已解決

**錯誤訊息**：
```
Response: {"success":true,"message":"Processed 0/1 items"}
Payload: {"type":"batch","data":[{"data":{...}}]}  // 缺少 type 欄位
```

**根本原因**：
- `ScanHistoryItem` interface 使用 `qrType` 欄位
- `sheets.ts` 中錯誤地使用 `item.type`（undefined）
- 導致 batch 請求中的 items 沒有 type 欄位

**解決方案**：
```typescript
// 錯誤
data: validItems.map(item => ({
  type: item.type,  // undefined!
  data: item.data,
}))

// 正確
data: validItems.map(item => ({
  type: item.qrType,  // 使用正確的欄位名
  data: item.data,
}))
```

**預防措施**：
- 使用 TypeScript 時，善用 IDE 的自動補全
- 欄位名稱要一致，避免 type/qrType 這種混淆

**相關檔案**：
- src/utils/sheets.ts
- src/types/index.ts

---

### [E007] Schema 欄位數不匹配導致「資料不完整」

**日期**：2026-01-28
**嚴重程度**：高
**狀態**：已解決

**錯誤訊息**：
```
資料不完整
```

**根本原因**：
- `constants/schema.ts` 更新了 Match Data 欄位數量（從 24 改為 20）
- `utils/decoder.ts` 中的欄位數驗證邏輯沒有同步更新
- 導致解碼後的資料被判定為「不完整」

**解決方案**：
```typescript
// decoder.ts 中的欄位數判斷要與 schema.ts 同步
// 錯誤：硬編碼舊的欄位數
if (values.length === 24) return 'match';

// 正確：使用 SCHEMA_LENGTHS 常數
import { SCHEMA_LENGTHS } from '../constants/schema';
if (values.length === SCHEMA_LENGTHS.match) return 'match';
```

**預防措施**：
- Schema 更新時，務必同時更新所有相關的驗證邏輯
- 使用 `SCHEMA_LENGTHS` 常數而非硬編碼數字
- 更新後執行 `npm run build` 確認無錯誤

**相關檔案**：
- src/constants/schema.ts
- src/utils/decoder.ts

---

### [E006] OverconstrainedError 相機參數不支援

**日期**：2026-01-26
**嚴重程度**：中
**狀態**：已解決

**錯誤訊息**：
```
Error getting userMedia, error = OverconstrainedError
```

**根本原因**：
- 設定了裝置不支援的相機參數
- `facingMode: { exact: 'environment' }` 在某些裝置上不支援
- 4K 解析度 (3840x2160) 不是所有手機都支援

**解決方案**：
```typescript
// 錯誤 - 太嚴格的限制
videoConstraints: {
  facingMode: { exact: 'environment' },
  width: { min: 1280, ideal: 3840, max: 4096 },
}

// 正確 - 使用 ideal 而非 exact/min
videoConstraints: {
  facingMode: 'environment',  // 不用 exact
  width: { ideal: 1920 },
  height: { ideal: 1080 },
}
```

**預防措施**：
- 使用 `ideal` 而非 `exact` 或 `min`
- 測試時要在實際手機上測試，不只是電腦

**相關檔案**：
- src/components/scanner/Scanner.tsx

---

### [E008] Pit Collect 雙版本欄位數不匹配導致「資料不完整」

**日期**：2026-02-02
**嚴重程度**：高
**狀態**：已解決

**錯誤訊息**：
```
資料不完整
```

**根本原因**：
- Pit Collect app 存在兩個版本：v1（23 欄位，含 stability）和 v2（22 欄位，移除 stability）
- Scanner 在 2026-02-01 同步上游變更後只支援 v2（22 欄位）
- 實際比賽現場仍有 v1 QR Code，23 欄位無法匹配任何已知 schema
- `detectQRType()` 返回 `unknown`，導致顯示「資料不完整」

**解決方案**：
```typescript
// 1. schema.ts 新增 legacy schema
export const TSV_SCHEMA_PIT_EXTERNAL_LEGACY = [
  // 23 欄位，含 stability（位於 terrain 和 climbLevel 之間）
];

// 2. detectQRType() 同時匹配兩個長度
if (length === TSV_SCHEMA_PIT_EXTERNAL.length) return 'pit-external';        // 22
if (length === TSV_SCHEMA_PIT_EXTERNAL_LEGACY.length) return 'pit-external'; // 23

// 3. decodeQR() 根據實際欄位數選擇 schema
case 'pit-external':
  schema = values.length === TSV_SCHEMA_PIT_EXTERNAL_LEGACY.length
    ? TSV_SCHEMA_PIT_EXTERNAL_LEGACY
    : TSV_SCHEMA_PIT_EXTERNAL;
  break;
```

**預防措施**：
- 當外部應用有多個版本共存時，scanner 必須支援所有已知版本
- 同步上游 schema 變更時，保留舊版本作為 legacy 而非直接替換
- 使用 `SCHEMA_LENGTHS` 常數集中管理所有已知的欄位數

**相關檔案**：
- src/constants/schema.ts
- src/utils/decoder.ts

---

### [E009] Stale Closure 導致連續掃描多張 QR 時合併失敗

**日期**：2026-02-03
**嚴重程度**：高
**狀態**：已解決

**錯誤訊息**：
```
連續掃描多張 pit-path QR 時，第二張以後的路徑未合併到 pit-external 記錄
```

**根本原因**：
- `onScanSuccess` 回調在 useEffect 初始化時被創建，閉包中捕獲了當時的 `scanHistory` state
- React useState 更新 state 後，已創建的回調閉包不會自動獲取新值
- 掃描第二張 QR 時，回調中的 `scanHistory` 仍是掃描第一張之前的舊值
- 導致 `.find()` 找不到剛掃描進來的 pit-external 記錄

**解決方案**：
```typescript
// 使用 useRef 同步最新 state
const scanHistoryRef = useRef(scanHistory);
scanHistoryRef.current = scanHistory; // 每次 render 同步

const handleScan = useCallback((result) => {
  // 回調中使用 ref 而非直接引用 state
  const currentHistory = scanHistoryRef.current;
  const pitRecord = currentHistory.find(item => ...);
}, []); // 空依賴，不重新創建
```

**預防措施**：
- 在 html5-qrcode 掃描回調中，任何需要存取最新 state 的地方都用 `useRef` 同步
- 不能將 state 放入 useEffect/useCallback 的 dependency array（會導致相機重新初始化）
- 這是 React 中 "escape hatch" 的標準用法：當需要最新值但不能觸發重新執行時

**相關檔案**：
- src/pages/ScanPage.tsx

---

### [E010] React Namespace Import 缺失導致類型錯誤

**日期**：2026-02-04
**嚴重程度**：中
**狀態**：已解決

**錯誤訊息**：
```
error TS2503: Cannot find namespace 'React'.
  React.MouseEvent / React.TouchEvent
```

**根本原因**：
- PathViewerPage.tsx 使用了 `React.MouseEvent` 和 `React.TouchEvent` 類型
- 但檔案頂部只有 `import { useState, useEffect, ... } from 'react'`，沒有 `import React from 'react'`
- TypeScript 需要 React namespace import 才能使用 `React.XXX` 類型語法

**解決方案**：
```typescript
// 加入 React default import
import React, { useState, useEffect, useCallback, useRef } from 'react';
```

**預防措施**：
- 當使用 `React.XXX` 類型（如 `React.MouseEvent`、`React.TouchEvent`、`React.CSSProperties`）時，必須有 `import React` default import
- 或改用直接 import：`import { MouseEvent, TouchEvent } from 'react'`

**相關檔案**：
- src/pages/PathViewerPage.tsx

---

### [E011] handleQuery 空值檢查位置錯誤導致 Loading 狀態卡住

**日期**：2026-02-04
**嚴重程度**：中
**狀態**：已解決

**錯誤訊息**：
```
查詢按鈕點擊後 spinner 永遠轉不停，無法再次查詢
```

**根本原因**：
- `handleQuery()` 函數中 `setQueryLoading(true)` 在空值檢查之前執行
- 當 eventCode 或 matchNumber 為空時，函數提前 return，但 loading 已被設為 true
- 沒有對應的 `setQueryLoading(false)` 被執行，loading 狀態永遠卡在 true

```typescript
// 錯誤順序
const handleQuery = async () => {
  setQueryLoading(true);  // 設為 true
  if (!eventCode || !matchNumber) return;  // 提前 return，loading 永遠是 true！
  // ...
};
```

**解決方案**：
```typescript
// 正確順序：先檢查，再設 loading
const handleQuery = async () => {
  if (!eventCode || !matchNumber) return;  // 先檢查
  setQueryLoading(true);  // 確定要查詢才設 loading
  try {
    // ...
  } finally {
    setQueryLoading(false);
  }
};
```

**預防措施**：
- `setLoading(true)` 必須在所有提前 return 的條件檢查之後
- 或使用 `try/finally` 確保 loading 一定會被重置
- 任何設置 loading 狀態的函數，都要確認所有的退出路徑都有對應的重置

**相關檔案**：
- src/pages/PathViewerPage.tsx

---

### [E012] TBA Sync Error 回傳缺少 rows 屬性

**日期**：2026-02-04
**嚴重程度**：低
**狀態**：已解決

**錯誤訊息**：
```
syncAllTBA 的 logResult 輔助函式存取 result.rows 時回傳 undefined
```

**根本原因**：
- 各 sync 函式在 error 路徑回傳 `{ status: 'error', error: '...' }` 時，沒有包含 `rows` 屬性
- syncAllTBA 的結果彙總假設所有回傳物件都有 `rows` 屬性

**解決方案**：
```javascript
// 在 error 回傳中加入 rows: 0
return { status: 'error', error: e.message, rows: 0 };
```

**預防措施**：
- 定義統一的回傳格式 interface，確保所有路徑（success/not_modified/error）都包含必要欄位
- error 路徑也要提供合理的預設值（rows: 0）

**相關檔案**：
- google-apps-script/Code.gs

---

### [E013] syncAllTBA Log 未印出錯誤原因

**日期**：2026-02-04
**嚴重程度**：低
**狀態**：已解決

**錯誤訊息**：
```
Logger.log 只顯示 "Teams: error"，沒有具體錯誤訊息
```

**根本原因**：
- syncAllTBA 中的 log 只印出 `result.status`，沒有印出 `result.error`
- 當同步失敗時無法從 log 中得知失敗原因

**解決方案**：
```javascript
// 加入 logResult 輔助函式
function logResult(name, result) {
  var msg = name + ': ' + result.status + ' (' + result.rows + ' rows)';
  if (result.error) msg += ' - ' + result.error;
  Logger.log(msg);
}
```

**預防措施**：
- 所有協調器函式（orchestrator）在 log 中應包含子任務的完整結果資訊
- error 路徑的 log 必須包含錯誤訊息，不能只印狀態碼

**相關檔案**：
- google-apps-script/Code.gs

---

### [E014] UrlFetchApp.fetch 權限不足

**日期**：2026-02-04
**嚴重程度**：高
**狀態**：已解決

**錯誤訊息**：
```
Exception: You do not have permission to call UrlFetchApp.fetch
```

**根本原因**：
- Google Apps Script 的 `UrlFetchApp.fetch()` 需要 `https://www.googleapis.com/auth/script.external_request` OAuth scope
- 預設的 Apps Script 部署不包含此 scope
- Web App 部署後不會自動提示授權外部請求

**解決方案**：
1. 在 Apps Script 編輯器中，點擊「專案設定」→ 勾選「在編輯器中顯示 appsscript.json 資訊清單檔案」
2. 在 appsscript.json 中加入 scope：
```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```
3. 執行 `authorizeTBA()` 函式觸發授權提示
4. 重新部署 Web App

**預防措施**：
- 使用 `UrlFetchApp`、`ScriptApp` 等需要額外權限的 API 時，必須在 appsscript.json 中明確聲明 scope
- 提供 `authorizeTBA()` 類的輔助函式，讓用戶手動觸發授權流程
- 在 README 中明確記錄所需的 scope 和授權步驟

**相關檔案**：
- google-apps-script/Code.gs
- google-apps-script/README.md

---

### [E015] ScriptApp 權限不足

**日期**：2026-02-04
**嚴重程度**：高
**狀態**：已解決

**錯誤訊息**：
```
Exception: You do not have permission to call ScriptApp.newTrigger
```

**根本原因**：
- `ScriptApp.newTrigger()` 需要 `https://www.googleapis.com/auth/script.scriptapp` OAuth scope
- 與 UrlFetchApp 類似，Web App 部署不會自動提示此權限

**解決方案**：
```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

**預防措施**：
- 所有需要的 scope 應在開發初期就加入 appsscript.json，避免部署後才發現權限不足
- 在 README 的部署指南中列出完整的 scope 清單

**相關檔案**：
- google-apps-script/Code.gs
- google-apps-script/README.md

---

### [E016] ETag 快取導致首次 manualSyncTBA 全部 not_modified

**日期**：2026-02-04
**嚴重程度**：中
**狀態**：已解決

**錯誤訊息**：
```
manualSyncTBA 執行後所有 7 個同步函式都回傳 not_modified，Google Sheets 沒有任何資料
```

**根本原因**：
- 開發過程中手動測試各個 sync 函式（如 `syncTBATeams('2025mslr')`）時，已將 ETag 儲存到 ScriptProperties
- 當後來通過 `manualSyncTBA()` 統一執行時，所有 endpoint 都已有 cached ETag
- TBA API 回傳 304 not_modified，sync 函式跳過寫入
- 但工作表可能是空的（之前測試的資料已被清除或工作表被重建）

**解決方案**：
```javascript
// 新增 forceSyncTBA：先清 ETag 再同步
function forceSyncTBA() {
  clearTBAETags();  // 清除所有 tba_etag_* 的 ScriptProperties
  syncAllTBA();
}

// 新增 clearTBAETags：清除所有 TBA ETag 快取
function clearTBAETags() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  for (var key in all) {
    if (key.indexOf('tba_etag_') === 0) {
      props.deleteProperty(key);
    }
  }
}
```

**預防措施**：
- 提供 `forceSyncTBA()` 作為「強制重新同步」的工具
- 在 README 中說明 ETag 快取的行為，並告知用戶首次設定後應使用 `forceSyncTBA()` 而非 `manualSyncTBA()`
- 開發階段的測試快取可能影響整合測試，需要注意清除

**相關檔案**：
- google-apps-script/Code.gs

---

### [E017] getMatchKey 缺少 matchLevel 導致不同比賽等級被誤判為重複

**日期**：2026-02-05
**嚴重程度**：高
**狀態**：已解決

**錯誤訊息**：
```
掃描 Playoff #5 的 QR code 時，系統顯示「重複掃描」，因為之前已掃描 Quals #5
```

**根本原因**：
- `getMatchKey` 函數只使用 `eventCode_matchNumber_teamNumber` 組合 key
- 沒有包含 `matchLevel` 維度
- 導致 Quals #5 和 Playoff #5 產生相同的 key（如 `2026MSLR_5_6998`）
- 系統誤判為重複資料

**解決方案**：
```typescript
// 舊 key 生成（錯誤）
function getMatchKey(data: DecodedData): string {
  return `${data.eventCode}_${data.matchNumber}_${data.teamNumber}`;
}

// 新 key 生成（正確）
function getMatchKey(data: DecodedData): string {
  return `${data.eventCode}_${data.matchLevel}_${data.matchNumber}_${data.teamNumber}`;
}
```

**預防措施**：
- 任何涉及 FRC 比賽數據「唯一標識」的邏輯都必須考慮 `matchLevel` 維度
- 這是繼路徑 ID 問題（2026-02-04）後的第二次提醒
- 建立檢查清單：唯一性 key = eventCode + matchLevel + matchNumber + teamNumber

**相關檔案**：
- src/utils/decoder.ts

---

## 常見錯誤模式

### 1. TypeScript 類型錯誤

**症狀**：`Type 'X' is not assignable to type 'Y'`

**常見原因**：
- 使用 `any` 類型後忘記轉換
- JSON 解析後未指定類型

**解決模板**：
```typescript
// 正確做法
const data = JSON.parse(str) as ExpectedType;

// 或使用類型守衛
function isExpectedType(obj: unknown): obj is ExpectedType {
  return typeof obj === 'object' && obj !== null && 'requiredField' in obj;
}
```

### 2. 模組找不到

**症狀**：`Cannot find module 'xxx'`

**檢查清單**：
- [ ] 套件已安裝到 node_modules
- [ ] package.json 有該套件
- [ ] 導入路徑正確
- [ ] TypeScript 類型聲明存在（@types/xxx）

### 3. LZ-String 解壓失敗

**症狀**：`decompressFromBase64` 返回 `null`

**可能原因**：
- QR 內容不是有效的 Base64
- 資料在傳輸中損壞
- 使用了錯誤的壓縮方法

**解決方案**：
```typescript
const decompressed = LZString.decompressFromBase64(content);
if (!decompressed) {
  throw new Error('無法解壓 QR 資料，可能是無效的格式');
}
```

### 4. QR 掃描器初始化失敗

**症狀**：掃描器無法啟動或黑屏

**檢查清單**：
- [ ] 瀏覽器已授予相機權限
- [ ] 元素 ID 存在於 DOM 中
- [ ] 沒有同時初始化多個掃描器實例

### 5. React Hook 規則違反

**症狀**：`Hooks can only be called inside the body of a function component`

**常見原因**：
- 在條件語句中呼叫 Hook
- 在迴圈中呼叫 Hook
- 在普通函式中呼叫 Hook

---

## 自動檢查清單

在提交代碼前，確認以下項目：

### 建置檢查
- [ ] `npm run build` 成功無錯誤
- [ ] 無 TypeScript 警告

### 套件檢查
- [ ] 新套件已添加到 package.json
- [ ] 必要的 @types 套件已安裝

### 代碼品質
- [ ] 無 `any` 類型（除非必要並有註解說明）
- [ ] 所有 async 操作有 try-catch
- [ ] 沒有 console.log（除了調試用途）

### QR 相關
- [ ] 解碼函式有錯誤處理
- [ ] 處理 null/undefined 返回值
- [ ] 驗證資料欄位數量

---

## 學到的教訓

### 1. 永遠驗證外部操作

任何依賴外部工具（npm、git 等）的操作，都要驗證結果。

### 2. 先理解再實作

閱讀完整的整合文件（SCANNER_INTEGRATION.md）再開始編碼。

### 3. 小步快跑

每完成一個小功能就測試，不要等到全部完成才測試。

### 4. 記錄一切

遇到問題立即記錄，包括錯誤訊息、嘗試的解決方案、最終解決方法。

---

## 統計

| 類型 | 數量 |
|------|------|
| 總錯誤數 | 17 |
| 已解決 | 17 |
| 進行中 | 0 |
| 高嚴重度 | 9 |
| 中嚴重度 | 6 |
| 低嚴重度 | 2 |

---

## Windows 環境特別注意事項

1. **npm 命令使用 PowerShell**：`powershell -Command "npm install ..."`
2. **路徑格式**：Windows 使用 `D:\path` 或 `/d/path`，根據工具不同
3. **驗證所有操作**：Windows 下的命令輸出可能不顯示，要額外驗證

---

*此檔案在每次遇到錯誤時更新*
*最後更新：2026-02-05*
