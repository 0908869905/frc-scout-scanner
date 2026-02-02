# FRC Scout Scanner - 開發進度追蹤

> 此檔案追蹤專案開發進度，每次工作結束時更新。

---

## 目前狀態

**階段**：已部署上線 (Vercel)
**完成度**：98%
**最後更新**：2026-02-01

---

## Session: 2026-02-01

### 完成項目
- [x] 移除 debug console.log（`src/main.tsx` 中的 `isDev` 判斷和開發模式 log）
- [x] 首次部署到 Vercel（`vercel --prod`），URL: https://frc-scout-scanner.vercel.app
- [x] Pit Collect schema 同步修復：對比 FRC6998_Pit_Collect_2026 最新代碼，發現已移除 `stability` 欄位（23→22 欄位）
- [x] 更新 `src/constants/schema.ts`：TSV_SCHEMA_PIT_EXTERNAL 移除 `stability`，FIELD_LABELS 移除對應標籤
- [x] 重新部署到 Vercel（schema 更新後再次 `vercel --prod`）

### 修改檔案
- `src/main.tsx` - 移除 isDev 判斷和 debug console.log
- `src/constants/schema.ts` - Pit External schema 23→22 欄位（移除 stability）

### 5-Question Reboot Check
1. **做什麼？** 清理 debug log、部署上線、同步 Pit Collect schema
2. **進度？** 全部完成，已部署到 Vercel
3. **下一步？** 實際比賽測試、確認 Pit Scouting 資料接收正常
4. **阻礙？** 無
5. **檔案？** `src/constants/schema.ts`（schema 定義），`src/utils/decoder.ts`（解碼器）

---

## Session: 2026-01-30

### 完成項目
- [x] 修復 Path Viewer 場地圖與路徑疊圖比例問題（圖片、SVG viewBox、座標三層修正）

### 修改檔案
- `src/pages/PathViewerPage.tsx` - 修復圖片 object-fit、SVG viewBox 2:1 比例、x 座標映射到 0-200 範圍

### 5-Question Reboot Check
1. **做什麼？** 修復 Path Viewer 場地圖與 SVG 路徑疊圖的比例失真
2. **進度？** 已完成，commit 並 push 到 main
3. **下一步？** 部署到 Vercel，移除 debug log
4. **阻礙？** 無
5. **檔案？** `src/pages/PathViewerPage.tsx`

---

## Session: 2026-01-28

### 完成項目
- [x] 新增 Path Viewer 頁面 - 路徑可視化工具
- [x] Schema v1.2.0 更新（22 欄位）
- [x] Schema v1.3.0 更新（20 欄位）
- [x] 修復「資料不完整」驗證錯誤

### 修改檔案
- `src/pages/PathViewerPage.tsx` - 新建：路徑可視化頁面
- `src/constants/schema.ts` - 更新：Match Data 從 24 欄位 → 20 欄位
- `src/utils/decoder.ts` - 更新：支援新 schema 欄位數驗證
- `src/App.tsx` - 更新：新增 /path-viewer 路由

### 5-Question Reboot Check
1. **做什麼？** Schema 多次更新 + 新增 Path Viewer 功能
2. **進度？** Schema v1.3.0 完成，Path Viewer 基本功能完成
3. **下一步？** 部署到 Vercel，移除 debug log
4. **阻礙？** 無
5. **檔案？** `src/constants/schema.ts`, `src/pages/PathViewerPage.tsx`

---

## 里程碑

### Phase 1: 專案初始化 ✅

- [x] 建立專案結構 (Vite + React + TypeScript)
- [x] 設定 package.json
- [x] 建立專案文件 (CLAUDE.md, PROGRESS.md, FINDINGS.md, ERRORS.md)
- [x] 安裝核心依賴 (lz-string, html5-qrcode, react-router-dom)
- [x] 建立基本檔案結構

### Phase 2: 核心功能開發 ✅

- [x] 建立類型定義 (types.ts)
- [x] 建立 TSV Schema 常數 (constants/schema.ts)
- [x] 實作 QR 解碼器 (decoder.ts)
- [x] 實作 QR 掃描元件 (Scanner.tsx)
- [x] 實作掃描結果元件 (ScanResult.tsx)
- [x] 修復 React StrictMode 雙重掛載導致的鏡頭問題
- [x] 擴大掃描範圍至 90% 鏡頭視窗

### Phase 3: 資料管理 ✅

- [x] 實作掃描歷史記錄頁面 (HistoryPage.tsx)
- [x] localStorage 持久化 (storage.ts)
- [x] Match/Path QR 配對邏輯
- [x] 資料匯出功能 (CSV/JSON) (exporter.ts)
- [x] 資料驗證 (validator.ts)

### Phase 4: Google Sheets 整合 ✅

- [x] Google Apps Script 完整實作 (Code.gs)
- [x] API 整合 (sheets.ts)
- [x] 批次上傳功能
- [x] 自動合併 Path 到 Match
- [x] 防重複上傳機制
- [x] 錯誤記錄功能

### Phase 5: UI/UX 優化 ✅

- [x] Tailwind CSS 樣式 (深色科技風格)
- [x] 響應式設計 (多頁面：掃描/歷史/設定)
- [x] 掃描成功音效與震動回饋
- [x] 掃描線動畫
- [x] 中英文翻譯切換 (i18n)

### Phase 6: 測試與部署 ✅

- [x] 與 Scouting App 整合測試
- [x] Google Apps Script 部署
- [x] 修復 CORS 問題
- [x] 修復上傳功能
- [ ] 部署到 Vercel
- [ ] 移除 debug log

---

## 工作日誌

### 2026-01-30

**完成項目**：

1. **Path Viewer 場地圖比例修復**
   - 圖片：`object-contain` 改為 `object-fill`，拉伸填滿 2:1 容器，與 Scouting App 的 `drawImage` 行為一致
   - SVG viewBox：`0 0 100 100` 改為 `0 0 200 100`，座標空間與視覺空間同為 2:1
   - 移除 `preserveAspectRatio="none"`（viewBox 已正確匹配，不再需要）
   - 所有 x 座標乘 2 映射到 0-200 範圍，y 保持 0-100，圓點不再因正方形 viewBox 被壓扁變形

---

### 2026-01-28 (晚間場)

**完成項目**：

1. **Path Viewer 頁面**
   - 新增 `/path-viewer` 路由
   - 輸入座標字串（`x1,y1|x2,y2|...`）可視化
   - 疊加在 2026 場地圖上顯示
   - 支援多條路徑同時比較
   - 可切換顯示/隱藏個別路徑

2. **Schema v1.2.0 更新**
   - Match Data: 24 欄位 → 22 欄位
   - 新增：`autoClimbPosition`, `teleClimbPosition`（LeftSide/Left/Center/Right/RightSide）
   - 移除：`penaltyCount`（原本 v1.1.0 就沒有這個）
   - 移除：`defenseRating`, `driverSkill`, `speedRating`

3. **Schema v1.3.0 更新**
   - Match Data: 22 欄位 → 20 欄位
   - 移除：`autoClimbSide`, `teleClimbSide`（合併到 climbPosition）
   - climbPosition 選項：LeftSide / Left / Center / Right / RightSide

4. **修復「資料不完整」錯誤**
   - 原因：decoder.ts 驗證欄位數量與 schema.ts 不一致
   - 解決：更新 decoder.ts 的欄位數判斷邏輯

---

### 2026-01-28 (早上場)

**完成項目**：

1. **Schema v1.1.0 更新**（配合 SCANNER_INTEGRATION.md）
   - Match Data: 25 欄位 → 24 欄位
   - 移除：`autoFuel`, `teleFuel`, `subjectiveNotes`
   - 新增：`autoClimbSide`, `teleClimbSide`
   - 改名：`fuelDroppedOnBump` → `fuelDroppedOnBumpCount`
   - 改名：`yellowCard` → `minorPenalty`, `redCard` → `majorPenalty`
   - alliance 格式：`Red/Blue` → `R1/R2/R3/B1/B2/B3`

2. **Pit Collect 整合修復**
   - `pit-external` 類型轉換為 `pit` 上傳（避免 Apps Script 版本問題）
   - 修正 `timestamp` → `scanTime`（Apps Script 期望的欄位名）

**待確認**：
- Pit Scouting 工作表是否有接收到資料
- Path QR 掃描後是否成功合併到 Match

---

### 2026-01-26 (晚間場)

**完成項目**：

1. **快速掃描模式**
   - 移除確認對話框，掃描後直接儲存到歷史
   - 相機持續開啟，不在掃描後暫停
   - 加入掃描計數器顯示
   - 防止 2 秒內重複掃描相同 QR

2. **修復相機重啟問題**
   - 使用 useRef 存儲 onScan/onError callbacks
   - 移除 useEffect 的 callback dependencies
   - 相機不再因為 state 更新而重新初始化

3. **修復 Google Sheets 上傳**
   - 修復 CORS 問題：移除 Content-Type header
   - 修復 Invalid time value：`item.scanTime` 而非 `item.timestamp`
   - 修復 batch 上傳：`item.qrType` 而非 `item.type`

4. **相機設定調整**
   - 修復 OverconstrainedError（4K 解析度不支援）
   - 目前設定：1080p, fps=30, qrbox=350x350

5. **Google Apps Script 部署**
   - 執行 initializeSheets() 建立工作表
   - 測試 testMatchUpload() 成功
   - 上傳功能已驗證可用

**下一步**：
- 部署到 Vercel
- 移除 debug console.log
- 實際比賽測試

---

### 2026-01-26 (下午場)

**完成項目**：

1. **鏡頭問題修復**
   - 使用 ref 追蹤初始化狀態，解決 React StrictMode 雙重掛載問題
   - 增加初始化延遲 (300ms) 確保 DOM 穩定
   - 新增相機錯誤處理和重試按鈕

2. **掃描範圍擴大**
   - qrbox 從固定 250x250 改為動態 90% viewport
   - 使用 4:3 比例適合手機相機
   - 優先使用後置相機 (facingMode: 'environment')

3. **中英文翻譯功能**
   - 建立 i18n 系統 (src/i18n/)
   - 支援繁體中文和英文
   - 語言切換按鈕位於導航欄右側
   - 語言設定存儲在 localStorage

4. **Google Apps Script 完整實作**
   - 建立 google-apps-script/Code.gs
   - 支援 Match/Path/Pit 三種資料類型
   - 自動合併 Path 到對應 Match
   - 防止重複上傳（更新而非新增）
   - 批次上傳功能
   - 錯誤記錄功能

5. **更新 sheets.ts**
   - 與 Apps Script 格式對應
   - 新增 sendTestData() 函式
   - 改善錯誤處理

**下一步**：
- 部署 Google Apps Script
- 與實際 Scouting App 測試
- 部署到 Vercel

### 2026-01-26 (上午場)

**完成項目**：
- 建立專案文件系統 (CLAUDE.md, PROGRESS.md, FINDINGS.md, ERRORS.md)
- 安裝核心依賴 (lz-string, html5-qrcode, react-router-dom)
- 建立完整 src/ 目錄結構
- 實作類型定義、常數、QR 解碼器
- 實作掃描頁面、歷史頁面、設定頁面
- 實作 UI 元件 (Card, Button, Badge, Toast)
- 驗證建置成功

---

## 專案結構 (目前)

```
frc-scout-scanner/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts
│   ├── constants/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── i18n/
│   │   ├── index.ts
│   │   ├── context.tsx
│   │   └── locales/
│   │       ├── zh-TW.ts
│   │       └── en.ts
│   ├── utils/
│   │   ├── decoder.ts
│   │   ├── sheets.ts
│   │   ├── storage.ts
│   │   ├── exporter.ts
│   │   └── validator.ts
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
│       └── SettingsPage.tsx
├── google-apps-script/
│   ├── Code.gs
│   └── README.md
├── CLAUDE.md
├── PROGRESS.md
├── FINDINGS.md
├── ERRORS.md
└── SCANNER_INTEGRATION.md
```

---

## 待辦事項 (優先順序)

1. ~~修復鏡頭顯示問題~~ ✅
2. ~~新增中英翻譯切換~~ ✅
3. ~~完成 Google Apps Script~~ ✅
4. ~~部署 Google Apps Script 到 Google Sheets~~ ✅
5. ~~與 Scouting App 進行整合測試~~ ✅
6. ~~部署到 Vercel~~ ✅ (https://frc-scout-scanner.vercel.app)
7. ~~移除 debug console.log~~ ✅

---

## 已知問題

| 問題 | 狀態 | 備註 |
|------|------|------|
| React StrictMode 雙重掛載導致鏡頭初始化失敗 | ✅ 已解決 | 使用 ref 追蹤狀態 |
| 掃描範圍太小 | ✅ 已解決 | qrbox=350x350 |
| CORS 問題導致上傳失敗 | ✅ 已解決 | 移除 Content-Type header |
| 相機掃描後重啟 | ✅ 已解決 | 使用 useRef 存儲 callbacks |
| batch 上傳缺少 type 欄位 | ✅ 已解決 | 使用 qrType 而非 type |
| 4K 解析度導致 OverconstrainedError | ✅ 已解決 | 改用 1080p |

---

## 筆記

- Schema v1.3.0 為最新版本
- Match Data: 20 欄位（不含 autoPath）
- Path Data: 4 欄位
- Pit Scouting: 13 欄位
- Pit External (Pit Collect): 22 欄位（v1.1: 移除 stability）
- Apps Script 會自動將 Path 合併到對應的 Match
- Path Viewer 可輸入座標字串可視化路徑

---

*此檔案在每次工作結束時更新*
