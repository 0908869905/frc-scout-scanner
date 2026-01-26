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

## 聯絡

- **Team**: FRC 6998
- **Scouting App**: https://frc-ten.vercel.app
