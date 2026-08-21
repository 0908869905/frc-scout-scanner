# FRC Scout Scanner — 偵察資料掃描、彙整與 OPR 計算

> 偵察資料鏈的後半段：掃描 [Scouting PASS](https://github.com/0908869905/frc-scouting-pass) 產生的壓縮 QR Code → 解碼 → 自動彙整進 Google Sheets → 以**最小平方法**算出各隊的進攻貢獻（OPR），供聯盟選擇與策略會議使用。比賽現場實戰使用（2026 賽季：Magnolia 區域賽、世界賽）。

| | |
|---|---|
| 作者 | 李昌侑（Rick Lee）— FRC 6998 UNIPARDS 程式組 |
| 期間 | 2025/12 – 2026/04（60+ commits） |
| 狀態 | **已部署、賽季實戰使用** |
| 規模 | 約 8,500 行（含 Google Apps Script `Code.gs` 單檔 2,500 行） |

## 為什麼做這個

比賽現場網路不可靠、時間以秒計。隊友在看台用 App 離線記錄，資料壓成 QR；這支掃描器負責把幾百張 QR 變成可分析的表格，再把「哪一隊真的會得分」算出來——不靠感覺，靠數據。

## 做了什麼

- **QR 掃描解碼**：`html5-qrcode` 連續掃描＋`lz-string` 解壓；Match Data 23 欄位（v1.5.0 schema，與 App 端鏡像同步）
- **自動彙整**：解碼資料批次寫入 Google Sheets（Apps Script 後端），去重以 `event_level_match_alliance` 複合鍵判定
- **TBA 同步**：從 The Blue Alliance 拉取賽程與官方比分，與偵察資料對齊
- **OPR 計算（最小平方法）**：以「聯盟成員矩陣 A × 各隊貢獻 x ＝ 聯盟得分 b」建模，在 Apps Script 中**手刻矩陣運算**（`matTranspose` / `matMultiply` / `matInverse` / `solveOPR`）解正規方程 (AᵀA)x = Aᵀb——沒有外部數學函式庫；另有 Manual OPR 分頁可手動輸入比分即時計算
- **匯出**：CSV／試算表／賽前簡報用的隊伍速查

## 架構

```
Scouting PASS (App) ──QR──▶ Scanner (React 19 + Vite 6, PWA)
                                │ 解碼・驗證・去重
                                ▼
                      Google Apps Script (Code.gs)
                       ├─ Sheets 寫入與彙整
                       ├─ TBA API 同步
                       └─ OPR 最小平方求解
```

主要目錄：`src/`（掃描、i18n、路徑檢視）、`google-apps-script/`（後端與 OPR）、`product/`（產品定義與設計文件）。`ERRORS.md` 保存了賽季期間的除錯紀錄。

## 本機執行

```bash
cp .env.example .env    # 可選：Gemini API key（僅實驗功能）
npm install && npm run dev
```

## 開發方式（AI 協作聲明）

本專案以「與 AI 結對開發」完成：問題定義、資料格式設計、OPR 演算法選型與驗證由我負責，程式碼由我與 AI（Claude Code）協作產出；每個模組做什麼、為什麼選這個方案、哪裡會失效，由我判斷並負責。`PROGRESS.md`／`FINDINGS.md`／`ERRORS.md` 為開發期間的真實工作紀錄。

## 相關專案

[偵察 App Scouting PASS](https://github.com/0908869905/frc-scouting-pass) ・ [科展・電腦視覺計分](https://github.com/0908869905/scoring-analyzer) ・ [影像標註平台](https://github.com/0908869905/frc-train-review) ・ [報帳系統](https://github.com/0908869905/frc-expense-money) ・ [台灣手語影音辭典](https://github.com/0908869905/tsl-sign-dictionary) ・ [園遊會點餐系統](https://github.com/0908869905/ordering-system)
