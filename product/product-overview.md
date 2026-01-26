# FRC Scout Scanner - 產品概覽

> 版本：1.0 | 建立日期：2026-01-26

---

## 產品定義

| 項目 | 定義 |
|------|------|
| **產品名稱** | FRC Scout Scanner |
| **一句話描述** | FRC 6998 專用的 Scouting QR Code 掃描器，快速解碼比賽數據並支援多種匯出方式 |
| **目標用戶** | FRC 6998 隊伍內部成員（Scouting 團隊） |
| **主要使用情境** | 比賽現場即時掃描（優先），賽後批次處理（次要） |

---

## 解決的問題

1. **效率問題**：手動輸入 Scouting 數據耗時
2. **準確性問題**：人工抄寫容易出錯
3. **即時性問題**：比賽現場需要快速收集數據進行策略分析

---

## 核心功能

### 功能優先級

| 優先級 | 功能 | 說明 | 狀態 |
|--------|------|------|------|
| P0 | LZ-String 解碼 | 解壓縮 QR Code 中的 Base64 TSV 資料 | 計畫中 |
| P0 | QR 掃描 | 使用相機掃描 Match/Path/Pit 三種 QR Code | 計畫中 |
| P1 | 資料預覽 | 掃描後顯示解碼結果，確認資料正確性 | 計畫中 |
| P1 | 匯出功能 | 支援 CSV 和 JSON 格式匯出 | 計畫中 |
| P1 | Google Sheets 上傳 | 即時將資料上傳到雲端試算表 | 計畫中 |
| P2 | 歷史記錄 | 本地儲存掃描紀錄，支援查看和管理 | 計畫中 |

### 功能詳細說明

#### P0: 核心掃描功能

**LZ-String 解碼**
- 解壓縮 Base64 編碼的 TSV 資料
- 自動偵測 QR 類型（Match/Path/Pit）
- 錯誤處理與用戶提示

**QR 掃描**
- 使用裝置相機即時掃描
- 支援三種 QR Code 類型
- 掃描成功後自動解碼

#### P1: 資料處理功能

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

#### P2: 輔助功能

**歷史記錄**
- localStorage 本地儲存
- 查看過去掃描紀錄
- 刪除或重新上傳功能

---

## 技術規格

### 資料類型

| 類型 | 欄位數 | 說明 |
|------|--------|------|
| Match Data | 25 | 比賽數據（得分、爬升、評分等） |
| Auto Path | 4 | 自動階段路徑座標 |
| Pit Scouting | 13 | 隊伍機器人資訊 |

### 編碼方式

```
Scouting App → TSV 字串 → LZ-String compressToBase64 → QR Code
Scanner App → QR Code → LZ-String decompressFromBase64 → TSV 字串 → 解析
```

### 配對邏輯

Match Data 和 Auto Path QR 是分開的，使用以下組合鍵配對：
- `eventCode`（賽事代碼）
- `matchNumber`（比賽編號）
- `teamNumber`（隊伍編號）

### 技術棧

- **框架**：React 19 + TypeScript
- **建置工具**：Vite 6
- **樣式**：Tailwind CSS
- **QR 掃描**：html5-qrcode
- **解壓縮**：lz-string

---

## 參考資源

- **Scouting App**：https://frc-ten.vercel.app
- **Scouting App Repo**：https://github.com/0908869905/FRC
- **技術規格文件**：`SCANNER_INTEGRATION.md`

---

*最後更新：2026-01-26*
