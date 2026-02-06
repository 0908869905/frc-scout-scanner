# FRC 6998 Scout Scanner - Google Apps Script 部署指南

## 概述

此 Apps Script 用於接收 FRC Scout Scanner 掃描的 QR Code 資料，並自動儲存到 Google Sheets。

## 功能特色

- **三種資料類型**：Match Data、Path Data、Pit Scouting
- **自動合併 Path**：Path 資料會自動合併到對應的 Match 紀錄
- **防止重複**：相同 Match 會更新而非新增
- **批次上傳**：支援一次上傳多筆資料
- **錯誤記錄**：自動記錄上傳錯誤

---

## 部署步驟

### 1. 建立 Google Sheets

1. 前往 [Google Sheets](https://sheets.google.com)
2. 建立新的試算表
3. 命名為「FRC 6998 Scouting Data」（或任意名稱）

### 2. 開啟 Apps Script

1. 在 Google Sheets 中，點擊「擴充功能」>「Apps Script」
2. 這會開啟 Apps Script 編輯器

### 3. 貼上程式碼

1. 刪除編輯器中的預設程式碼
2. 複製 `Code.gs` 的完整內容並貼上
3. 點擊「儲存」（Ctrl+S）

### 4. 部署為網頁應用程式

1. 點擊右上角的「部署」按鈕
2. 選擇「新增部署」
3. 點擊「選取類型」旁的齒輪圖示，選擇「網頁應用程式」
4. 填寫設定：
   - **說明**：FRC Scout Scanner API
   - **執行身分**：我
   - **誰可以存取**：所有人
5. 點擊「部署」
6. 授權存取（首次部署時）
7. **複製 Web 應用程式 URL**

### 5. 設定 Scanner App

1. 開啟 FRC Scout Scanner 應用
2. 前往「設定」頁面
3. 將複製的 URL 貼到「Google Sheets API URL」欄位
4. 點擊「測試連線」確認成功

---

## 工作表結構

Apps Script 會自動建立以下工作表：

### Match Data
儲存比賽資料（25 個欄位 + autoPath + timestamp + uploadTime）

| 欄位 | 說明 |
|------|------|
| scouterName | 記錄員姓名 |
| eventCode | 賽事代碼 |
| matchLevel | 比賽等級 (P/QM/PO/X) |
| matchNumber | 比賽編號 |
| alliance | 聯盟 (Red/Blue) |
| teamNumber | 隊伍編號 |
| autoFuel | 自動期間燃料 |
| autoClimbStatus | 自動攀爬狀態 |
| autoClimbTime | 自動攀爬時間 |
| teleFuel | 遙控期間燃料 |
| teleClimbStatus | 遙控攀爬狀態 |
| teleClimbTime | 遙控攀爬時間 |
| bumpTrenchCount | 撞擊次數 |
| fuelDroppedOnBump | 撞擊掉落燃料 |
| penaltyCount | 犯規次數 |
| yellowCard | 黃牌 |
| redCard | 紅牌 |
| robotDied | 機器人故障 |
| almostTipped | 差點翻倒 |
| ridingOnBall | 騎在球上 |
| defenseRating | 防守評分 (0-5) |
| driverSkill | 駕駛技術 (0-5) |
| speedRating | 速度評分 (0-5) |
| comments | 評論 |
| subjectiveNotes | 主觀筆記 |
| autoPath | 自動路徑 |
| timestamp | 掃描時間 |
| uploadTime | 上傳時間 |

### Path Data
儲存自動路徑資料（如果未自動合併）

| 欄位 | 說明 |
|------|------|
| eventCode | 賽事代碼 |
| matchNumber | 比賽編號 |
| teamNumber | 隊伍編號 |
| autoPath | 路徑座標 |
| timestamp | 掃描時間 |
| uploadTime | 上傳時間 |

### Pit Scouting
儲存 Pit 調查資料

| 欄位 | 說明 |
|------|------|
| scouterName | 記錄員姓名 |
| eventCode | 賽事代碼 |
| teamNumber | 隊伍編號 |
| pitDriveTrain | 底盤類型 |
| pitMotorType | 馬達類型 |
| pitLength | 長度 |
| pitWidth | 寬度 |
| pitWeight | 重量 |
| pitCanFuel | 能否處理燃料 |
| pitCanTowerL1 | 能否攀爬 L1 |
| pitCanTowerL2 | 能否攀爬 L2 |
| pitCanTowerL3 | 能否攀爬 L3 |
| pitAutoNotes | 自動筆記 |
| timestamp | 掃描時間 |
| uploadTime | 上傳時間 |

---

## API 格式

### 測試連線 (GET)

```
GET https://script.google.com/macros/s/xxx/exec
```

回應：
```json
{
  "success": true,
  "message": "FRC 6998 Scout Scanner API is running",
  "version": "1.0.0"
}
```

### 上傳資料 (POST)

```
POST https://script.google.com/macros/s/xxx/exec
Content-Type: application/json

{
  "type": "match",
  "data": {
    "scouterName": "John",
    "eventCode": "2026MSLR",
    ...
  }
}
```

支援的 type 值：
- `match` - 比賽資料
- `path` - 自動路徑
- `pit` - Pit 調查
- `batch` - 批次上傳

回應：
```json
{
  "success": true,
  "message": "Added new match record at row 2",
  "rowNumber": 2,
  "type": "match",
  "timestamp": "2026-01-26T12:00:00.000Z"
}
```

---

## 測試

在 Apps Script 編輯器中，可以執行以下測試函式：

1. **testMatchUpload** - 測試 Match 資料上傳
2. **testPathUpload** - 測試 Path 資料上傳
3. **initializeSheets** - 初始化所有工作表

---

## 更新部署

如果修改了程式碼，需要重新部署：

1. 點擊「部署」>「管理部署」
2. 點擊編輯圖示
3. 在「版本」下拉選單選擇「新版本」
4. 點擊「部署」

---

## 常見問題

### Q: 連線失敗？

1. 確認 URL 是否正確（以 `https://script.google.com/` 開頭）
2. 確認部署時選擇了「所有人」可存取
3. 嘗試重新部署

### Q: 資料沒有出現？

1. 檢查 Google Sheets 是否有對應的工作表
2. 檢查 Error Log 工作表是否有錯誤記錄
3. 在 Apps Script 中執行 `initializeSheets` 初始化工作表

### Q: CORS 錯誤？

Google Apps Script 部署為網頁應用程式時，會自動處理 CORS。如果仍有問題，請確認：
1. 使用的是部署後的 URL（不是編輯器 URL）
2. 部署設定為「所有人」可存取

---

## TBA (The Blue Alliance) 自動同步

自動從 The Blue Alliance 抓取賽事資料同步到 Google Sheets。使用 ETag 快取機制，只在 TBA 有新資料時才更新，避免浪費 API 額度。

### 同步的工作表（7 個）

| 工作表 | 內容 | 排序 |
|--------|------|------|
| TBA Teams | 隊伍資訊（號碼、暱稱、城市、國家、創隊年） | 隊伍號碼 |
| TBA Matches | 比賽結果（紅藍方隊伍、比分、勝方） | 比賽順序 |
| TBA Score Breakdown | 詳細得分拆解（欄位依遊戲規則自動產生） | 比賽 + 聯盟 |
| TBA Rankings | 排名（勝負、排序分數） | 排名 |
| TBA OPRs | 進攻/防守效率值（OPR/DPR/CCWM） | OPR 高到低 |
| TBA Alliances | 聯盟選秀結果 | 聯盟序號 |
| TBA Awards | 獎項（獲獎隊伍/個人） | 獎項名稱 |

### 設定步驟

#### 前置作業

1. 前往 https://www.thebluealliance.com/account 註冊/登入
2. 在頁面下方「Read API Keys」區域，新增一個 API Key
3. 複製產生的 Key（一長串英數字）

#### 首次設定（依序執行）

在 Apps Script 編輯器中：

**Step 1 — 設定 appsscript.json 權限**

1. 左側點擊齒輪圖示（專案設定）
2. 勾選「在編輯器中顯示 appsscript.json 資訊清單檔案」
3. 開啟 `appsscript.json`，確保 `oauthScopes` 包含以下三個權限：

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

**Step 2 — 儲存 API Key**

1. 在 Code.gs 最下方暫時加入一行（替換成你的 Key）：
```javascript
// 執行後立即刪除這行！
setTBAApiKey('你的_TBA_API_Key_貼在這裡');
```
2. 在上方函式下拉選單選擇 `setTBAApiKey`（或任意函式），點「執行」
3. 若彈出授權對話框 → 審查權限 → 允許
4. 確認 log 顯示 `TBA API key saved successfully.`
5. **刪除剛才加的那行程式碼**（Key 已安全存入，不需要留在程式碼中）

**Step 3 — 授權外部請求**

1. 在函式下拉選單選擇 `authorizeTBA`
2. 點「執行」
3. 若彈出授權對話框 → 審查權限 → 允許
4. 確認 log 顯示 `Authorization OK!`

**Step 4 — 測試連線 + 建立工作表**

1. 在函式下拉選單選擇 `setupTBAConfig`
2. 點「執行」
3. 確認 log 顯示：
   - `TBA connection OK! Found XX teams for 2025mslr`
   - `All 7 TBA sheets created/verified.`

**Step 5 — 首次同步資料**

1. 在函式下拉選單選擇 `forceSyncTBA`
2. 點「執行」
3. 確認所有 7 個工作表都顯示 `ok` 和行數

**Step 6 — 啟動自動同步**

1. 在函式下拉選單選擇 `setupTBATrigger`
2. 點「執行」
3. 確認 log 顯示 `TBA auto-sync trigger created (every 5 minutes).`

設定完成！系統會每 5 分鐘自動檢查 TBA 是否有新資料。

### 日常操作

| 操作 | 函式 | 說明 |
|------|------|------|
| 手動同步 | `manualSyncTBA` | 尊重 ETag 快取，無變更不寫入 |
| 強制同步 | `forceSyncTBA` | 清除快取，重新抓取所有資料 |
| 停止自動同步 | `removeTBATrigger` | 移除 5 分鐘觸發器 |
| 重啟自動同步 | `setupTBATrigger` | 重新建立 5 分鐘觸發器 |
| 查看狀態（網頁） | `?action=tbaStatus` | 在 Web App URL 後加此參數 |

### 更換賽事

預設賽事為 `2025mslr`。若需更換：

1. 在 Code.gs 中找到 `TBA_CONFIG` 區塊
2. 修改 `EVENT_KEY` 的值（例如改為 `2025cmptx`）
3. 儲存並重新部署
4. 執行 `forceSyncTBA` 抓取新賽事資料

賽事代碼格式為 `年份` + `賽事縮寫`，可在 TBA 網站查詢。

### 常見問題

**Q: 所有工作表都顯示 not_modified？**
表示 TBA 資料自上次同步後沒有變化，這是正常的。如需強制重新抓取，執行 `forceSyncTBA`。

**Q: 出現 UrlFetchApp 權限錯誤？**
執行 `authorizeTBA` 函式觸發授權對話框，允許權限後重試。

**Q: 出現 ScriptApp 權限錯誤？**
在 `appsscript.json` 中確認有 `script.scriptapp` scope，儲存後重新執行。

**Q: Score Breakdown 欄位很多/很少？**
這是正常的。欄位由 TBA 的遊戲規則決定，每年不同。系統會自動偵測並建立所有欄位。

**Q: 同步超時？**
正常同步約 5-8 秒。系統內建 4 分 40 秒的安全限制，會在超時前自動停止。若經常超時，可能是網路問題。

---

