# FRC Scout Scanner - 開發進度追蹤

> 此檔案追蹤專案開發進度，每次工作結束時更新。

---

## 目前狀態

**階段**：已部署上線 (Vercel)
**完成度**：99%
**最後更新**：2026-02-10 (OPR Analysis - 進攻效率值計算)

---

## Session: 2026-02-10 (OPR Analysis - 進攻效率值計算)

### 完成項目
- [x] 在 Code.gs 新增 ~280 行 OPR 計算程式碼
- [x] 矩陣運算函數：matTranspose, matMultiply, matInverse (Gauss-Jordan + partial pivoting), solveOPR
- [x] 資料讀取：extractMatchesFromTBA（從 TBA Matches 工作表）、extractMatchesFromScouting（從 Match Data 工作表）
- [x] 主功能：buildOPRSheet（建立 OPR Analysis 分頁）、calculateOPR（計算 OPR 排名 + 預測分數）
- [x] 輔助函數：getOrCreateOPRSheet（三區塊佈局）、setupOPRLookupFormulas（INDEX/MATCH + FILTER 公式）、parseMatchKey
- [x] Code Review 修正：VLOOKUP → INDEX/MATCH（因 teamNumber 不在 lookup 範圍第一欄）、新增 indexOf 驗證防止 -1 靜默失敗
- [x] 更新 README.md：新增 OPR Analysis 使用說明（TBA / Scouting 兩種工作流）
- [x] 更新 CLAUDE.md：新增 OPR Analysis 區塊說明（佈局、函數、數學原理）、更新日期
- [x] 驗證：用 2025 新北區域賽（2025ntwc）68 場資格賽、37 支隊伍實測，計算結果和 TBA 官方 OPR 完全一致（37 支隊伍零誤差）

### 修改檔案（3 個）
- `google-apps-script/Code.gs` - 新增 OPR Analysis 功能（~280 行：矩陣運算、資料讀取、OPR 計算、工作表佈局、公式設定）
- `google-apps-script/README.md` - 新增 OPR Analysis 使用說明（TBA / Scouting 兩種工作流程）
- `CLAUDE.md` - 新增 OPR Analysis 文件區塊、更新日期

### 5-Question Reboot Check
1. **做什麼？** 在 Code.gs 新增 OPR (Offensive Power Rating) 計算功能，使用最小二乘法求解聯立方程式，從比賽分數反推每支隊伍的進攻效率值
2. **進度？** 全部完成，已用 2025ntwc 賽事驗證結果與 TBA 官方 OPR 完全一致
3. **下一步？** 重新部署 Code.gs 到 Google Apps Script（含 OPR 功能）、在實際賽事中執行 `buildOPRSheet()` 或 `calculateOPR()` 測試
4. **阻礙？** 無
5. **檔案？** `google-apps-script/Code.gs`（OPR 全部功能：matTranspose/matMultiply/matInverse/solveOPR/extractMatchesFromTBA/extractMatchesFromScouting/buildOPRSheet/calculateOPR/getOrCreateOPRSheet/setupOPRLookupFormulas/parseMatchKey），`google-apps-script/README.md`（OPR 使用說明），`CLAUDE.md`（OPR 文件）

---

## Session: 2026-02-06 (路徑查詢修復 - 空白標頭 + matchLevel 值)

### 完成項目
- [x] 調查 Path Viewer 後端查詢功能無法運作的問題（輸入正確參數但顯示找不到資料）
- [x] 排除 matchLevel dropdown 值不匹配的可能性（前端 'QM' vs Scouting PASS enum 'Quals'）
- [x] 確認 Code.gs API version 1.3.0 已正確部署
- [x] 新增 `?action=debug` 端點到 Code.gs，回傳工作表概況和樣本資料
- [x] **發現根本原因**：Match Data 工作表第一行（標頭行）全是空字串，導致所有 `indexOf('eventCode')` 回傳 -1，查詢永遠找不到資料
- [x] 新增 `?action=fixHeaders` 端點到 Code.gs，自動修復空白標頭
- [x] 修復 `getOrCreateSheet` 加入防禦性標頭檢查（已存在的工作表若標頭為空自動修復）
- [x] 呼叫 fixHeaders API 成功修復 Match Data 標頭
- [x] 還原 PathViewerPage matchLevel dropdown 值為 'P', 'QM', 'PO', 'X'（與實際 QR 資料一致）
- [x] 修改翻轉 180 度邏輯：只交換聯盟標籤（red<->blue），不再自動換顏色
- [x] API 查詢驗證成功：queryPaths?eventCode=2026MSLR&matchLevel=QM&matchNumber=1 回傳 3 筆路徑
- [x] Commit c3f42ea: fix: repair path query by fixing empty sheet headers and matchLevel values

### 修改檔案（6 個）
- `src/pages/PathViewerPage.tsx` - 還原 matchLevel dropdown 值為 P/QM/PO/X、翻轉只換聯盟不換色
- `google-apps-script/Code.gs` - 新增 debug/fixHeaders 端點、getOrCreateSheet 防禦性標頭修復
- `google-apps-script/README.md` - 部署指南更新（新增 debug/fixHeaders 說明）
- `CLAUDE.md` - 文件更新
- `ERRORS.md` - 錯誤記錄
- `FINDINGS.md` - 技術發現

### 5-Question Reboot Check
1. **做什麼？** 修復 Path Viewer 後端查詢功能，根本原因是 Google Sheets 標頭行為空白導致 indexOf 回傳 -1
2. **進度？** 已完成，commit c3f42ea 已 push 到 main，API 查詢驗證成功
3. **下一步？** 重新部署 Code.gs 到 Google Apps Script（含 debug/fixHeaders 端點 + getOrCreateSheet 防禦修復）、重新部署到 Vercel、實際測試 Path Viewer 查詢功能
4. **阻礙？** 無
5. **檔案？** `google-apps-script/Code.gs`（debug/fixHeaders/getOrCreateSheet），`src/pages/PathViewerPage.tsx`（matchLevel 值 + 翻轉邏輯）

---

## Session: 2026-02-05 (matchKey 重複掃描修復)

### 完成項目
- [x] 修復 `getMatchKey` 函數，加入 `matchLevel` 參數防止不同比賽等級的相同場次被誤判為重複

### 修改檔案（1 個）
- `src/utils/decoder.ts` - 修改 `getMatchKey` 函數：舊 key `eventCode_matchNumber_teamNumber` → 新 key `eventCode_matchLevel_matchNumber_teamNumber`

### 5-Question Reboot Check
1. **做什麼？** 修復掃描 QR code 時，不同比賽等級（Quals/Playoff）的相同場次號會被誤判為重複的問題
2. **進度？** 已完成，commit edb7d48 已 push 到 main
3. **下一步？** 重新部署到 Vercel（`vercel --prod`），實際測試 Quals/Playoff 相同場次號不再被誤判為重複
4. **阻礙？** 無
5. **檔案？** `src/utils/decoder.ts`（getMatchKey 函數）

---

## Session: 2026-02-04 (TBA 自動同步功能 - Google Apps Script)

### 完成項目
- [x] 新增 7 個 TBA 同步函式：syncTBATeams, syncTBAMatches, syncTBAScoreBreakdown, syncTBARankings, syncTBAOPRs, syncTBAAlliances, syncTBAAwards
- [x] ETag 快取機制：304 not_modified 跳過寫入，200 更新資料 + 儲存新 ETag
- [x] Matches + Score Breakdown 共用一次 API call（/matches endpoint 已含 score_breakdown）
- [x] Score Breakdown 動態 headers：依遊戲規則自動產生欄位（非硬編碼）
- [x] clear-and-replace 寫入策略：每次同步先清空再寫入，確保資料一致性
- [x] syncAllTBA 協調器：含時間守衛（4分40秒 / 280秒）防止超過 Apps Script 6 分鐘限制
- [x] 管理函式：setTBAApiKey, setupTBAConfig, setupTBATrigger, removeTBATrigger, manualSyncTBA, forceSyncTBA, clearTBAETags
- [x] doGet 擴展：?action=tbaStatus（查詢同步狀態）、?action=tbaSync（觸發手動同步）
- [x] authorizeTBA 授權輔助函式：觸發 UrlFetchApp + ScriptApp 授權流程
- [x] 修復 error 回傳缺少 rows 屬性問題（加入 rows: 0）
- [x] 修復 syncAllTBA log 未印出錯誤原因（加入 logResult 輔助函式）
- [x] 解決 UrlFetchApp.fetch 權限問題（appsscript.json 加入 script.external_request scope）
- [x] 解決 ScriptApp 權限問題（appsscript.json 加入 script.scriptapp scope）
- [x] 解決 ETag 快取導致首次 manualSyncTBA 全部 not_modified（用 forceSyncTBA 清除快取）
- [x] 驗證成功：2025mslr 賽事 - 37 teams, 77 matches, 154 score breakdowns, 37 rankings, 37 OPRs, 8 alliances, 25 awards，總耗時 6.3 秒
- [x] 更新 google-apps-script/README.md：新增 TBA 設定說明書（6 步驟指南 + FAQ）
- [x] 更新 CLAUDE.md：新增 TBA 相關文件（doGet actions, 工作表, 設定步驟）

### 修改檔案（3 個）
- `google-apps-script/Code.gs` - 新增約 700 行 TBA 同步功能（7 sync 函式、ETag 快取、syncAllTBA 協調器、管理函式、doGet 擴展、authorizeTBA）
- `google-apps-script/README.md` - 新增 TBA 設定說明書（6 步驟指南 + FAQ + appsscript.json scope 說明）
- `CLAUDE.md` - 新增 TBA 相關文件（doGet actions: tbaStatus/tbaSync、TBA 工作表列表、設定步驟摘要）

### 5-Question Reboot Check
1. **做什麼？** 在 Code.gs 中新增 TBA (The Blue Alliance) 自動同步功能，包含 7 個同步函式、ETag 快取、動態 Score Breakdown headers、syncAllTBA 協調器（時間守衛 4分40秒）、管理函式、doGet 擴展
2. **進度？** 全部完成，已驗證 2025mslr 賽事資料同步（37 teams, 77 matches, 154 score breakdowns, 37 rankings, 37 OPRs, 8 alliances, 25 awards，6.3 秒）
3. **下一步？** 重新部署 Code.gs 到 Google Apps Script（新版本）、設定 TBA API Key（`setTBAApiKey('your-key')`）、設定賽事代碼（`setupTBAConfig('2026xxx')`）、設定自動觸發器（`setupTBATrigger(30)`）、實際比賽測試自動同步
4. **阻礙？** 無（需注意：首次部署後要執行 authorizeTBA 觸發授權，且 appsscript.json 需加入 external_request + scriptapp scope）
5. **檔案？** `google-apps-script/Code.gs`（TBA 同步全部功能），`google-apps-script/README.md`（TBA 設定指南），`CLAUDE.md`（TBA 文件更新）

---

## Session: 2026-02-04 (Path Viewer 大幅重寫 - 多路徑動畫、來源標籤、ID 修復)

### 完成項目
- [x] 建置驗證 - 確認上次 PathViewerPage.tsx 大幅重寫後建置通過
- [x] 修復 React namespace import - 加入 `import React` 修復 `React.MouseEvent`/`React.TouchEvent` 類型問題
- [x] 修復 handleQuery 卡住 loading - 將空值檢查移到 `setQueryLoading(true)` 之前，避免早期 return 後 loading 狀態永遠為 true
- [x] seedTestData() 實作 - Code.gs 加入測試資料函數（12 筆 Match Data、4 筆 Path Data、5 筆 Pit Scouting）
- [x] 刪除放大縮小功能 - 移除 zoom/pan 所有相關程式碼、狀態、事件處理
- [x] 多路徑同時播放 - 從單路徑動畫架構改為 `Record<string, number>` 多路徑同時播放，加入 Play All 按鈕
- [x] 修復 dedup 邏輯 - Code.gs queryPathsByTeam 中不同 matchLevel 同 matchNumber 不應視為重複
- [x] 來源標籤功能 - 路徑顯示 SP（Scouting PASS）/ Pit（Pit Collect）來源標籤
- [x] Pit Collect 測試資料 - seedTestData() 加入 5 筆 Pit Scouting 測試資料
- [x] 修復路徑 ID 重複 - id 生成加入 matchLevel，防止同隊同場次不同等級路徑產生相同 ID 導致動畫連動
- [x] 全部顯示/隱藏按鈕 - 路徑列表新增 toggle 按鈕，可一鍵顯示或隱藏所有路徑
- [x] i18n 新增 hideAll、showAllPaths 翻譯（zh-TW + en）
- [x] Commit ef7af55: feat: Path Viewer overhaul - multi-path animation, team query, seedTestData
- [x] Commit db971b7: feat: add source label (Scouting PASS / Pit Collect) to path viewer
- [x] Commit 6fcbfc2: fix: include matchLevel in path ID to prevent duplicate animation triggers
- [x] Commit 61e4c0a: feat: add show all / hide all toggle button in path list

### 修改檔案（5 個）
- `src/pages/PathViewerPage.tsx` - 大幅重寫（zoom 移除、多路徑動畫 Record<string, number>、Play All、來源標籤 SP/Pit、ID 加入 matchLevel、全部顯示/隱藏按鈕）
- `google-apps-script/Code.gs` - source 欄位回傳、queryPathsByTeam Pit 查詢、seedTestData()（Match+Path+Pit）、dedup 修復（matchLevel 區分）
- `src/utils/sheets.ts` - 回應類型加入 `source?: string` 欄位
- `src/i18n/locales/zh-TW.ts` - 新增路徑查詢/檢視器翻譯（多路徑播放、來源標籤、hideAll、showAllPaths）
- `src/i18n/locales/en.ts` - 新增路徑查詢/檢視器英文翻譯（hideAll、showAllPaths）

### 5-Question Reboot Check
1. **做什麼？** Path Viewer 大幅重寫：移除 zoom/pan、實作多路徑同時播放動畫（Record<string, number>）、加入 Play All、加入來源標籤（SP/Pit）、修復路徑 ID 重複問題、新增全部顯示/隱藏按鈕
2. **進度？** 全部完成，commits ef7af55 + db971b7 + 6fcbfc2 + 61e4c0a 已 push 到 main
3. **下一步？** 重新部署 Code.gs 到 Google Apps Script（seedTestData + source 欄位 + dedup 修復）、重新部署到 Vercel（`vercel --prod`）、實際測試多路徑動畫、來源標籤和全部顯示/隱藏功能
4. **阻礙？** 無
5. **檔案？** `src/pages/PathViewerPage.tsx`（多路徑動畫 + 來源標籤 + ID 修復 + 全部顯示/隱藏），`google-apps-script/Code.gs`（seedTestData + source + dedup），`src/utils/sheets.ts`（source 類型），`src/i18n/locales/zh-TW.ts`、`src/i18n/locales/en.ts`（翻譯）

---

## Session: 2026-02-04 (Path Viewer 後端查詢功能)

### 完成項目
- [x] Code.gs 擴展 doGet() 支援 `?action=queryPaths` 查詢參數路由
- [x] Code.gs 新增 `handleQueryPaths()` 和 `queryPathsByMatch()` 函式，從 Match Data 和 Path Data 工作表查詢路徑
- [x] Code.gs 新增 `testQueryPaths()` 測試函式
- [x] sheets.ts 新增 `queryMatchPaths()` export 函式，GET 請求帶 query string
- [x] PathViewerPage 新增查詢表單 UI（Event Code + Match Level 下拉 + Match Number + 查詢按鈕）
- [x] 查詢結果自動分配顏色（紅方紅色系、藍方藍色系）
- [x] 原手動輸入區改為可折疊面板
- [x] i18n 新增 pathQuery 翻譯區塊（zh-TW + en）
- [x] Commit 0fe334a 已 push 到 origin/main

### 修改檔案（5 個）
- `google-apps-script/Code.gs` - 擴展 doGet() 支援 action 參數路由，新增 handleQueryPaths()、queryPathsByMatch()、testQueryPaths()
- `src/utils/sheets.ts` - 新增 queryMatchPaths() export 函式（GET 請求帶 query string）
- `src/pages/PathViewerPage.tsx` - 新增查詢表單 UI、自動分配顏色、手動輸入改為可折疊面板
- `src/i18n/locales/zh-TW.ts` - 新增 pathQuery 翻譯區塊
- `src/i18n/locales/en.ts` - 新增 pathQuery 翻譯區塊

### 部署注意
- Code.gs 修改後需要在 Google Apps Script 中重新部署新版本才能生效

### 5-Question Reboot Check
1. **做什麼？** 在 Path Viewer 頁面新增後端查詢功能，可輸入 eventCode + matchLevel + matchNumber 從 Google Sheets 查詢該場比賽的路徑資料
2. **進度？** 全部完成，commit 0fe334a 已 push 到 main
3. **下一步？** 重新部署 Code.gs 到 Google Apps Script（新版本）、重新部署到 Vercel（`vercel --prod`）、實際測試查詢功能（需有比賽資料）
4. **阻礙？** 無
5. **檔案？** `google-apps-script/Code.gs`（doGet action 路由 + queryPaths 邏輯），`src/utils/sheets.ts`（queryMatchPaths 函式），`src/pages/PathViewerPage.tsx`（查詢表單 UI + 自動分配顏色），`src/i18n/locales/zh-TW.ts`、`src/i18n/locales/en.ts`（pathQuery 翻譯）

---

## Session: 2026-02-03 (晚間場 - Pit Collect Path QR 整合)

### 完成項目
- [x] 新增 `pit-path` QR 類型（4 欄位：eventCode, matchNumber, teamNumber, autoPath）
- [x] 支援 Pit Collect app 的路徑 QR Code 掃描和自動合併到 pit-external
- [x] 多條路徑用分號 `;` 分隔合併（連續掃描多張 pit-path QR 時自動 append）
- [x] 用 `useRef` 修正連續掃描多張 QR 時的 stale closure 問題（scanHistory state 過期）
- [x] Code.gs: handlePathData 新增合併到 Pit 邏輯，handlePitData 保留已合併的 autoPath
- [x] 更新 i18n（zh-TW + en）新增 pit-path 相關翻譯
- [x] Commit b924b4f 已 push 到 main

### 修改檔案（16 個）
- `src/constants/schema.ts` - 新增 TSV_SCHEMA_PIT_PATH（4 欄位）、SCHEMA_LENGTHS.pitPath、FIELD_LABELS
- `src/constants/index.ts` - 匯出 TSV_SCHEMA_PIT_PATH
- `src/types.ts` - QRType 新增 'pit-path'、ScanHistoryItem 擴展
- `src/utils/decoder.ts` - detectQRType 新增 pit-path 判定、decodeQR 新增 pit-path case
- `src/utils/validator.ts` - 新增 pit-path 驗證邏輯
- `src/utils/sheets.ts` - 上傳邏輯支援 pit-path 類型
- `src/utils/exporter.ts` - 匯出支援 pit-path
- `src/pages/ScanPage.tsx` - 用 useRef 修正 stale closure、pit-path 自動合併到 pit-external
- `src/pages/HistoryPage.tsx` - 篩選器支援 pit-path
- `src/components/history/HistoryList.tsx` - 列表顯示 pit-path
- `src/components/history/HistoryFilter.tsx` - 篩選選項新增 pit-path
- `src/components/ui/Badge.tsx` - pit-path 樣式
- `src/i18n/locales/zh-TW.ts` - 繁中翻譯
- `src/i18n/locales/en.ts` - 英文翻譯
- `google-apps-script/Code.gs` - handlePathData 合併到 Pit、handlePitData 保留 autoPath
- `CLAUDE.md` - （待本次更新）

### 5-Question Reboot Check
1. **做什麼？** 實作 Pit Collect Path QR 整合，讓 scanner 能掃描 pit-path QR 並自動合併路徑到 pit-external 記錄
2. **進度？** 全部完成，commit b924b4f 已 push
3. **下一步？** 重新部署到 Vercel（`vercel --prod`）、部署新版 Code.gs 到 Google Apps Script、實際測試 pit-path QR 掃描 + 合併流程
4. **阻礙？** 無
5. **檔案？** `src/pages/ScanPage.tsx`（合併邏輯 + useRef 修正），`src/utils/decoder.ts`（pit-path 解碼），`src/constants/schema.ts`（pit-path schema），`google-apps-script/Code.gs`（服務端合併邏輯）

---

## Session: 2026-02-03 (早上場 - Path Viewer 清理 + 場地圖統一)

### 完成項目
- [x] 移除 Path Viewer 起始區域框：刪除 PathViewerPage.tsx 中紅/藍方起始區域矩形 SVG rect 和相關常數（STARTING_ZONE_WIDTH、RED_STARTING_ZONE_OFFSET、BLUE_STARTING_ZONE_OFFSET）
- [x] 統一場地圖：將 scanner 的 field-2026.png (3128x1584) 複製到 scouting pass 的 field26.png，替換原本的 3902x1584 版本，兩個專案使用相同場地圖
- [x] Commit + Push 兩個 repo：
  - frc-scout-scanner (2efca3c): `fix: remove starting zone overlays from path viewer, update field image`
  - frc-6998-scouting-pass (a093637): `fix: replace field image to match scanner app (3128x1584)`

### 修改檔案
- `src/pages/PathViewerPage.tsx` - 移除起始區域 SVG rect 和相關常數
- `public/field-2026.png` - 場地圖（已是正確版本，3128x1584）
- `D:\FRC\frc-6998-scouting-pass\FRC\field26.png` - 替換為 scanner 的場地圖（跨 repo）

### 5-Question Reboot Check
1. **做什麼？** 清理 Path Viewer 起始區域框 + 統一兩個專案的場地圖
2. **進度？** 全部完成，兩個 repo 都已 commit + push
3. **下一步？** 重新部署到 Vercel（`vercel --prod`）、確認場地圖在兩個 app 中顯示一致
4. **阻礙？** 無
5. **檔案？** `src/pages/PathViewerPage.tsx`（Path Viewer UI），`public/field-2026.png`（場地圖）

---

## Session: 2026-02-02 (晚間場 - Path Viewer 增強 & Schema v1.4.0)

### 完成項目
- [x] 刪除 PathViewerPage 的「清除全部」按鈕（移除 clearAllPaths 函數和按鈕）
- [x] 路徑自訂顏色：每條路徑旁新增 input[type=color] 顏色選擇器
- [x] 路徑聯盟標籤：PathData 新增 alliance 欄位 (red/blue/unknown)，新增路徑時可選擇聯盟，列表顯示 R/B 標籤
- [x] 圖層排序按鈕：新增上移/下移按鈕控制 SVG 繪製順序（前景/背景）
- [x] 起始區域疊圖：場地圖上新增紅/藍方起始區域半透明矩形（Red=25%, Blue=68%, Width=3.5%）
- [x] Schema v1.4.0 同步：match 20→21 欄位（bumpTrenchCount → bumpCount + trenchCount），path 4→5 欄位（加 alliance）
- [x] Code.gs 更新：Google Apps Script schema 同步 v1.4.0
- [x] Commit c776af8 - feat: path color picker, alliance label, layer ordering, schema sync
- [x] Commit 24f5cdb - fix: sync Code.gs schema with v1.4.0 (match 21 fields, path 5 fields)

### 修改檔案
- `src/pages/PathViewerPage.tsx` - 顏色選擇器、聯盟標籤、圖層排序、起始區域疊圖、刪除清除全部按鈕
- `src/constants/schema.ts` - match 21 欄位（bumpTrenchCount 拆為 bumpCount + trenchCount）、path 5 欄位（加 alliance）、FIELD_LABELS 更新
- `src/utils/decoder.ts` - 欄位數判定更新（match=21, path=5）
- `google-apps-script/Code.gs` - Schema v1.4.0 同步（match 21 欄位、path 5 欄位）

### 5-Question Reboot Check
1. **做什麼？** Path Viewer 功能增強（顏色/聯盟/圖層/起始區域）+ Schema v1.4.0 同步
2. **進度？** 全部完成，commits c776af8 + 24f5cdb
3. **下一步？** 重新部署到 Vercel（`vercel --prod`）、部署新版 Code.gs 到 Google Apps Script、實際比賽測試 v1.4.0 QR 解碼
4. **阻礙？** 無
5. **檔案？** `src/pages/PathViewerPage.tsx`（Path Viewer UI），`src/constants/schema.ts`（v1.4.0 schema），`src/utils/decoder.ts`（欄位數判定），`google-apps-script/Code.gs`（Apps Script 同步）

---

## Session: 2026-02-02 (早上場 - Pit Collect 雙版本修復)

### 完成項目
- [x] 調查 Pit Collect QR 掃描後顯示「資料不完整」問題
- [x] 發現根本原因：Pit Collect app 有兩個版本（v1: 23 欄位含 stability, v2: 22 欄位移除 stability），decoder 只匹配精確欄位數
- [x] 新增 `TSV_SCHEMA_PIT_EXTERNAL_LEGACY`（23 欄位），讓 decoder 同時支援 22 和 23 欄位
- [x] 修改 decoder.ts 支援雙版本偵測和解碼（pit-external 類型根據欄位數選擇對應 schema）
- [x] 恢復 stability 欄位的 FIELD_LABELS 標籤
- [x] Build 驗證通過，commit 7e5298e 並 push 到 main

### 修改檔案
- `src/constants/schema.ts` - 新增 TSV_SCHEMA_PIT_EXTERNAL_LEGACY（23 欄位）、SCHEMA_LENGTHS 加入 pitExternalLegacy、恢復 stability label
- `src/utils/decoder.ts` - detectQRType 支援 22/23 雙版本、decodeQR switch case 根據欄位數選擇 schema

### 5-Question Reboot Check
1. **做什麼？** 修復 Pit Collect QR 雙版本相容性問題
2. **進度？** 已完成，commit 7e5298e 已 push 到 main
3. **下一步？** 重新部署到 Vercel（`vercel --prod`），實際比賽現場測試 v1/v2 Pit Collect QR 都能正確解碼
4. **阻礙？** 無
5. **檔案？** `src/constants/schema.ts`（schema 定義），`src/utils/decoder.ts`（解碼器雙版本邏輯）

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
- [x] 部署到 Vercel
- [x] 移除 debug log

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

- Schema v1.4.0 為最新版本
- Match Data: 21 欄位（不含 autoPath）- bumpTrenchCount 拆為 bumpCount + trenchCount
- Path Data: 5 欄位（加 alliance）
- Pit Path Data: 4 欄位（Pit Collect 路徑 QR，不含 alliance）
- Pit Scouting: 13 欄位
- Pit External (Pit Collect): 22 欄位 (v2) 或 23 欄位 (v1 legacy, 含 stability)，decoder 自動偵測
- Apps Script 會自動將 Path 合併到對應的 Match，也會將 Pit Path 合併到對應的 Pit External
- Scanner 端掃描 pit-path QR 時，自動合併 autoPath 到同隊 pit-external 記錄（多條用 `;` 分隔）
- Path Viewer 功能：座標可視化、自訂顏色、聯盟標籤(R/B)、圖層排序、後端查詢（queryPaths API）、多路徑同時播放動畫（Play All）、來源標籤（SP/Pit）、路徑 ID 含 matchLevel 防重複、全部顯示/隱藏按鈕
- 場地圖：兩個專案（scanner + scouting pass）統一使用 3128x1584 版本
- doGet() 支援 action 參數路由：無 action 時回傳 API 狀態，`action=queryPaths` 查詢路徑資料，`action=tbaStatus` 查詢 TBA 同步狀態，`action=tbaSync` 觸發手動同步，`action=debug` 回傳工作表概況，`action=fixHeaders` 自動修復空白標頭
- matchLevel 實際值為縮寫：'P'（Practice）、'QM'（Quals）、'PO'（Playoff）、'X'（Exhibition），不是全名
- getOrCreateSheet 含防禦性標頭檢查：已存在的工作表若標頭全為空字串會自動修復
- TBA 自動同步：7 個同步函式（Teams/Matches/ScoreBreakdown/Rankings/OPRs/Alliances/Awards）、ETag 快取、syncAllTBA 協調器（時間守衛 280 秒）
- TBA 工作表：TBA Teams, TBA Matches, TBA Score Breakdown, TBA Rankings, TBA OPRs, TBA Alliances, TBA Awards
- OPR Analysis：最小二乘法求解 (A^T * A)^-1 * A^T * b，支援 TBA 資料和 Scouting 資料兩種來源，OPR Analysis 工作表三區塊佈局（OPR 排名 + 預測分數 + Lookup/Filter 公式）

---

*此檔案在每次工作結束時更新*
