/**
 * FRC 6998 Scout Scanner - Google Apps Script
 *
 * 對應 SCANNER_INTEGRATION.md v1.0.0
 *
 * 部署步驟：
 * 1. 開啟 Google Sheets，選擇「擴充功能」>「Apps Script」
 * 2. 將此程式碼貼到 Code.gs
 * 3. 點擊「部署」>「新增部署」
 * 4. 選擇「網頁應用程式」
 * 5. 設定「誰可以存取」為「所有人」
 * 6. 點擊「部署」並複製 Web App URL
 * 7. 將 URL 貼到 Scanner App 的設定頁面
 */

// ============================================
// 設定區
// ============================================

const CONFIG = {
  // 工作表名稱
  SHEET_MATCH: 'Match Data',
  SHEET_PATH: 'Path Data',
  SHEET_PIT: 'Pit Scouting',  // Pit Collect (外部)

  // 是否自動合併 Path 到 Match
  AUTO_MERGE_PATH: true,

  // 是否記錄錯誤到專用工作表
  LOG_ERRORS: true,
  SHEET_ERRORS: 'Error Log'
};

// ============================================
// TSV Schema 定義（必須與 Scouting PASS 一致）
// ============================================

/**
 * Match Data QR - 20 個欄位（不含 autoPath）
 * 必須與 Scouting PASS 的 constants.ts 保持一致
 * v1.3.0 變更：
 * - 移除 autoClimbSide, teleClimbSide
 * - climbPosition 改為 5 選項 (LeftSide/Left/Center/Right/RightSide)
 */
const TSV_SCHEMA_MATCH = [
  // PreMatch (6)
  'scouterName',          // 0: 偵察員姓名
  'eventCode',            // 1: 賽事代碼
  'matchLevel',           // 2: 比賽等級 (P/QM/PO/X)
  'matchNumber',          // 3: 場次編號
  'alliance',             // 4: 聯盟位置 (R1/R2/R3/B1/B2/B3)
  'teamNumber',           // 5: 隊伍號碼
  // Auto (3)
  'autoClimbStatus',      // 6: 自動爬塔狀態
  'autoClimbTime',        // 7: 自動爬塔時間（秒）
  'autoClimbPosition',    // 8: 自動爬塔位置 (LeftSide/Left/Center/Right/RightSide)
  // Teleop - Bump & Fuel (2)
  'bumpTrenchCount',      // 9: 跨越 Bump & Trench 次數
  'fuelDroppedOnBumpCount', // 10: 穿越 Bump 時掉落 Fuel 次數
  // Teleop - Penalty (2) - 計數器
  'minorPenalty',         // 11: 輕微犯規次數 (number)
  'majorPenalty',         // 12: 重大犯規次數 (number)
  // Teleop - Climb (3)
  'teleClimbStatus',      // 13: 手動爬塔狀態
  'teleClimbTime',        // 14: 手動爬塔時間（秒）
  'teleClimbPosition',    // 15: 手動爬塔位置 (LeftSide/Left/Center/Right/RightSide)
  // PostMatch (4)
  'robotDied',            // 16: 機器人故障 (0/1)
  'almostTipped',         // 17: 差點傾倒 (0/1)
  'ridingOnBall',         // 18: 騎在球上 (0/1)
  'comments'              // 19: 備註
];

/**
 * Path Data QR - 4 個欄位
 * 對應 SCANNER_INTEGRATION.md 的 TSV_SCHEMA_PATH
 */
const TSV_SCHEMA_PATH = [
  'eventCode',    // 0: 賽事代碼
  'matchNumber',  // 1: 場次編號
  'teamNumber',   // 2: 隊伍號碼
  'autoPath'      // 3: 路徑座標 (x1,y1|x2,y2|...)
];

/**
 * Pit Scouting QR - 23 個欄位 (FRC6998 Pit Collect)
 */
const TSV_SCHEMA_PIT = [
  'teamNumber',      // 0: 隊伍號碼
  'scouterName',     // 1: 偵察員姓名
  'chassisType',     // 2: 底盤類型
  'weight',          // 3: 重量
  'maxCapacity',     // 4: 最大容量
  'intake',          // 5: 進料機構
  'visionHardware',  // 6: 視覺硬體
  'visionSoftware',  // 7: 視覺軟體
  'shooting',        // 8: 射擊能力
  'turret',          // 9: 炮塔功能
  'startLocation',   // 10: 起始位置
  'preload',         // 11: 預載數量
  'autoIntake',      // 12: 自動進料 (0/1)
  'autoHang',        // 13: 自動懸掛 (0/1)
  'autoTotal',       // 14: 自動總數
  'crossMidfield',   // 15: 跨越中場 (0/1)
  'terrain',         // 16: 地形類型
  'stability',       // 17: 穩定性 (1-5)
  'climbLevel',      // 18: 爬升等級
  'climbPosition',   // 19: 爬升位置
  'climbTime',       // 20: 爬升時間
  'photosTaken',     // 21: 已拍照 (0/1)
  'notes'            // 22: 備註
];

/**
 * Sheets 欄位標題（含系統欄位）
 */
const SHEET_HEADERS = {
  MATCH: [...TSV_SCHEMA_MATCH, 'autoPath', 'scanTime', 'uploadTime'],
  PATH: [...TSV_SCHEMA_PATH, 'scanTime', 'uploadTime'],
  PIT: [...TSV_SCHEMA_PIT, 'scanTime', 'uploadTime']
};

// ============================================
// HTTP 處理函式
// ============================================

/**
 * 處理 GET 請求 - 用於測試連線
 */
function doGet(e) {
  const response = {
    success: true,
    message: 'FRC 6998 Scout Scanner API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: 'Upload scouting data',
      GET: 'API status check'
    },
    schema: {
      match: TSV_SCHEMA_MATCH.length,
      path: TSV_SCHEMA_PATH.length,
      pit: TSV_SCHEMA_PIT.length
    }
  };

  return createJsonResponse(response);
}

/**
 * 處理 POST 請求 - 接收掃描資料
 *
 * 注意：此函數無法在 Apps Script 編輯器中直接點「執行」測試！
 * 必須透過實際的 HTTP POST 請求才能正常運作。
 *
 * 測試方式：
 * 1. 部署為 Web App
 * 2. 使用瀏覽器訪問 URL（測試 doGet）
 * 3. 使用 Scanner App 發送 POST 請求
 * 4. 或使用 curl/Postman 發送測試請求
 */
function doPost(e) {
  try {
    // 檢查是否有有效的請求參數
    // 如果在編輯器中直接執行，e 會是 undefined
    if (!e) {
      return createJsonResponse({
        success: false,
        error: '無法直接在編輯器中測試 doPost。請部署為 Web App 後，使用實際的 HTTP POST 請求測試。',
        hint: '使用 testMatchUpload()、testPathUpload() 或 testPitUpload() 函數來測試資料處理邏輯。',
        timestamp: new Date().toISOString()
      });
    }

    // 檢查是否有 postData
    if (!e.postData) {
      return createJsonResponse({
        success: false,
        error: '請求中沒有 POST 資料。請確保使用 POST 方法並包含 JSON body。',
        timestamp: new Date().toISOString()
      });
    }

    // 檢查是否有 contents
    if (!e.postData.contents) {
      return createJsonResponse({
        success: false,
        error: '請求的 POST 資料是空的。請確保 request body 包含有效的 JSON。',
        timestamp: new Date().toISOString()
      });
    }

    // 解析 JSON 資料
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createJsonResponse({
        success: false,
        error: 'JSON 解析失敗：' + parseError.message,
        receivedData: e.postData.contents.substring(0, 200), // 只顯示前 200 字元
        timestamp: new Date().toISOString()
      });
    }

    // 驗證必要欄位
    if (!payload.type) {
      throw new Error('Missing required field: type');
    }

    if (!payload.data) {
      throw new Error('Missing required field: data');
    }

    // 根據類型處理資料
    let result;
    switch (payload.type) {
      case 'match':
        result = handleMatchData(payload.data);
        break;
      case 'path':
        result = handlePathData(payload.data);
        break;
      case 'pit':
      case 'pit-external':
        result = handlePitData(payload.data);
        break;
      case 'batch':
        result = handleBatchData(payload.data);
        break;
      default:
        throw new Error(`Unknown data type: ${payload.type}`);
    }

    return createJsonResponse({
      success: true,
      message: result.message,
      rowNumber: result.rowNumber,
      type: payload.type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logError(error, e.postData?.contents);

    return createJsonResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// ============================================
// 資料處理函式
// ============================================

/**
 * 處理 Match Data
 */
function handleMatchData(data) {
  const sheet = getOrCreateSheet(CONFIG.SHEET_MATCH, SHEET_HEADERS.MATCH);

  // 檢查是否已存在相同的紀錄（防止重複上傳）
  const matchKey = getMatchKey(data);
  const existingRow = findRowByMatchKey(sheet, matchKey);

  const uploadTime = new Date().toISOString();

  if (existingRow > 0) {
    // 更新現有紀錄（保留原有的 autoPath）
    const existingData = getRowData(sheet, existingRow, SHEET_HEADERS.MATCH);
    const row = buildMatchRow(data, existingData.autoPath, data.scanTime, uploadTime);
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);

    return {
      message: `Updated existing match record at row ${existingRow}`,
      rowNumber: existingRow
    };
  }

  // 新增紀錄（使用 data.autoPath，如果前端已合併路徑）
  const row = buildMatchRow(data, data.autoPath || 'None', data.scanTime, uploadTime);
  sheet.appendRow(row);
  const rowNumber = sheet.getLastRow();

  return {
    message: `Added new match record at row ${rowNumber}`,
    rowNumber: rowNumber
  };
}

/**
 * 處理 Path Data
 */
function handlePathData(data) {
  const uploadTime = new Date().toISOString();

  // 如果啟用自動合併，嘗試將 Path 合併到對應的 Match
  if (CONFIG.AUTO_MERGE_PATH) {
    const matchSheet = getSheet(CONFIG.SHEET_MATCH);
    if (matchSheet) {
      const matchKey = getMatchKey(data);
      const matchRow = findRowByMatchKey(matchSheet, matchKey);

      if (matchRow > 0) {
        // 找到對應的 Match，更新 autoPath 欄位
        const autoPathColIndex = SHEET_HEADERS.MATCH.indexOf('autoPath') + 1;
        matchSheet.getRange(matchRow, autoPathColIndex).setValue(data.autoPath || 'None');

        return {
          message: `Merged path data to match record at row ${matchRow}`,
          rowNumber: matchRow
        };
      }
    }
  }

  // 沒有找到對應的 Match，或未啟用自動合併，儲存到 Path 工作表
  const sheet = getOrCreateSheet(CONFIG.SHEET_PATH, SHEET_HEADERS.PATH);
  const row = buildPathRow(data, data.scanTime, uploadTime);
  sheet.appendRow(row);
  const rowNumber = sheet.getLastRow();

  return {
    message: `Added path data at row ${rowNumber}`,
    rowNumber: rowNumber
  };
}

/**
 * 處理 Pit Scouting Data (FRC6998 Pit Collect)
 */
function handlePitData(data) {
  const sheet = getOrCreateSheet(CONFIG.SHEET_PIT, SHEET_HEADERS.PIT);
  const uploadTime = new Date().toISOString();

  // 檢查是否已存在相同隊伍的紀錄（用 teamNumber 作為 key）
  const existingRow = findRowByTeamNumber(sheet, data.teamNumber, SHEET_HEADERS.PIT);

  if (existingRow > 0) {
    // 更新現有紀錄
    const row = buildPitRow(data, data.scanTime, uploadTime);
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);

    return {
      message: `Updated existing pit record at row ${existingRow}`,
      rowNumber: existingRow
    };
  }

  // 新增紀錄
  const row = buildPitRow(data, data.scanTime, uploadTime);
  sheet.appendRow(row);
  const rowNumber = sheet.getLastRow();

  return {
    message: `Added new pit record at row ${rowNumber}`,
    rowNumber: rowNumber
  };
}

/**
 * 處理批次資料
 */
function handleBatchData(items) {
  if (!Array.isArray(items)) {
    throw new Error('Batch data must be an array');
  }

  const results = [];

  for (const item of items) {
    try {
      let result;
      switch (item.type) {
        case 'match':
          result = handleMatchData(item.data);
          break;
        case 'path':
          result = handlePathData(item.data);
          break;
        case 'pit':
        case 'pit-external':
          result = handlePitData(item.data);
          break;
        default:
          throw new Error(`Unknown type: ${item.type}`);
      }
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  return {
    message: `Processed ${successCount}/${items.length} items`,
    rowNumber: null,
    details: results
  };
}

// ============================================
// Row Builder 函式
// ============================================

/**
 * 建立 Match 資料列
 */
function buildMatchRow(data, autoPath, scanTime, uploadTime) {
  const row = TSV_SCHEMA_MATCH.map(field => {
    const value = data[field];
    return value !== undefined && value !== null ? value : 'None';
  });

  // 加入系統欄位
  row.push(autoPath || 'None');  // autoPath
  row.push(scanTime || new Date().toISOString());  // scanTime
  row.push(uploadTime);  // uploadTime

  return row;
}

/**
 * 建立 Path 資料列
 */
function buildPathRow(data, scanTime, uploadTime) {
  const row = TSV_SCHEMA_PATH.map(field => {
    const value = data[field];
    return value !== undefined && value !== null ? value : 'None';
  });

  // 加入系統欄位
  row.push(scanTime || new Date().toISOString());  // scanTime
  row.push(uploadTime);  // uploadTime

  return row;
}

/**
 * 建立 Pit 資料列
 */
function buildPitRow(data, scanTime, uploadTime) {
  const row = TSV_SCHEMA_PIT.map(field => {
    const value = data[field];
    return value !== undefined && value !== null ? value : 'None';
  });

  // 加入系統欄位
  row.push(scanTime || new Date().toISOString());  // scanTime
  row.push(uploadTime);  // uploadTime

  return row;
}

// ============================================
// 工具函式
// ============================================

/**
 * 取得或建立工作表
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // 設定標題列
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * 取得工作表（不建立）
 */
function getSheet(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
}

/**
 * 取得指定列的資料
 */
function getRowData(sheet, rowNumber, headers) {
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const data = {};
  headers.forEach((key, i) => {
    data[key] = values[i];
  });
  return data;
}

/**
 * 產生 Match Key（用於識別唯一比賽紀錄）
 */
function getMatchKey(data) {
  return `${data.eventCode || ''}_${data.matchNumber || ''}_${data.teamNumber || ''}`;
}

/**
 * 根據 Match Key 尋找列號
 */
function findRowByMatchKey(sheet, matchKey) {
  const data = sheet.getDataRange().getValues();
  const eventCodeIdx = SHEET_HEADERS.MATCH.indexOf('eventCode');
  const matchNumberIdx = SHEET_HEADERS.MATCH.indexOf('matchNumber');
  const teamNumberIdx = SHEET_HEADERS.MATCH.indexOf('teamNumber');

  for (let i = 1; i < data.length; i++) {
    const rowKey = `${data[i][eventCodeIdx]}_${data[i][matchNumberIdx]}_${data[i][teamNumberIdx]}`;
    if (rowKey === matchKey) {
      return i + 1; // 列號從 1 開始
    }
  }

  return -1;
}

/**
 * 根據 Team Number 尋找列號（用於 Pit Scouting）
 */
function findRowByTeamNumber(sheet, teamNumber, headers) {
  const data = sheet.getDataRange().getValues();
  const teamNumberIdx = headers.indexOf('teamNumber');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][teamNumberIdx]) === String(teamNumber)) {
      return i + 1;
    }
  }

  return -1;
}

/**
 * 建立 JSON 回應
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 記錄錯誤
 */
function logError(error, requestData) {
  if (!CONFIG.LOG_ERRORS) return;

  try {
    const headers = ['timestamp', 'error', 'requestData'];
    const sheet = getOrCreateSheet(CONFIG.SHEET_ERRORS, headers);

    sheet.appendRow([
      new Date().toISOString(),
      error.message || String(error),
      requestData || ''
    ]);
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

// ============================================
// 測試函式（在 Apps Script 編輯器中使用）
// ============================================

/**
 * 測試 Match Data 上傳
 */
function testMatchUpload() {
  const testData = {
    scouterName: 'Test User',
    eventCode: '2026TEST',
    matchLevel: 'QM',
    matchNumber: '1',
    alliance: 'R1',
    teamNumber: '6998',
    autoClimbStatus: 'Level1',
    autoClimbTime: '5',
    autoClimbPosition: 'Center',
    bumpTrenchCount: '2',
    fuelDroppedOnBumpCount: '0',
    minorPenalty: '1',
    majorPenalty: '0',
    teleClimbStatus: 'Level2',
    teleClimbTime: '8',
    teleClimbPosition: 'LeftSide',
    robotDied: '0',
    almostTipped: '0',
    ridingOnBall: '0',
    comments: 'Test comment',
    scanTime: new Date().toISOString()
  };

  const result = handleMatchData(testData);
  console.log('Test result:', result);
}

/**
 * 測試 Path Data 上傳（會合併到 Match）
 */
function testPathUpload() {
  const testData = {
    eventCode: '2026TEST',
    matchNumber: '1',
    teamNumber: '6998',
    autoPath: '40.5,50.0|42.3,48.2|45.0,45.5|50.0,40.0',
    scanTime: new Date().toISOString()
  };

  const result = handlePathData(testData);
  console.log('Test result:', result);
}

/**
 * 測試 Pit Data 上傳 (FRC6998 Pit Collect 格式)
 */
function testPitUpload() {
  const testData = {
    teamNumber: '6998',
    scouterName: 'Test User',
    chassisType: 'Swerve',
    weight: '125',
    maxCapacity: '5',
    intake: 'Ground + Source',
    visionHardware: 'Limelight',
    visionSoftware: 'PhotonVision',
    shooting: 'Speaker',
    turret: 'None',
    startLocation: 'Center',
    preload: '1',
    autoIntake: '1',
    autoHang: '0',
    autoTotal: '4',
    crossMidfield: '1',
    terrain: 'Chain',
    stability: '4',
    climbLevel: 'Harmony',
    climbPosition: 'Center',
    climbTime: '8',
    photosTaken: '1',
    notes: 'Good robot',
    scanTime: new Date().toISOString()
  };

  const result = handlePitData(testData);
  console.log('Test result:', result);
}

/**
 * 初始化所有工作表
 */
function initializeSheets() {
  getOrCreateSheet(CONFIG.SHEET_MATCH, SHEET_HEADERS.MATCH);
  getOrCreateSheet(CONFIG.SHEET_PATH, SHEET_HEADERS.PATH);
  getOrCreateSheet(CONFIG.SHEET_PIT, SHEET_HEADERS.PIT);
  console.log('All sheets initialized successfully!');
  console.log('Match columns:', SHEET_HEADERS.MATCH.length);
  console.log('Path columns:', SHEET_HEADERS.PATH.length);
  console.log('Pit columns:', SHEET_HEADERS.PIT.length);
}

/**
 * 清除測試資料（只保留標題列）
 */
function clearTestData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  [CONFIG.SHEET_MATCH, CONFIG.SHEET_PATH, CONFIG.SHEET_PIT].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  });

  console.log('Test data cleared!');
}
