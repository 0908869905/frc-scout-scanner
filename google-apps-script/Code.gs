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
 * Match Data QR - 44 個欄位（不含 autoPath）
 * 必須與 Scouting PASS 的 constants.ts 保持一致
 * v1.4.0 變更：
 * - bumpTrenchCount 拆分為 bumpCount + trenchCount
 * v1.5.0 變更：
 * - comments 拆成 robotIssues / performance / comments 三欄
 * v1.6.0 變更：
 * - 23 → 44 欄：前 17 欄不變；後段 27 欄扁平化
 * - 移除：robotDied / almostTipped / ridingOnBall / robotIssues / performance
 * - 新增：11 issue bool + 6 flag bool + 3 collision bool + 1 collision text + 5 rating text + comments
 * v1.7.0 變更：
 * - 44 → 47 欄：動作評分加 3 個 fuel 相關 rating
 *   (ratingIntakeFuel / ratingTransportFuel / ratingShootFuel) 插在 ratingDefense 之後、comments 之前
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
  // Teleop - Bump & Fuel (3)
  'bumpCount',            // 9: 跨越 Bump 次數
  'trenchCount',          // 10: 跨越 Trench 次數
  'fuelDroppedOnBumpCount', // 11: 穿越 Bump 時掉落 Fuel 次數
  // Teleop - Penalty (2)
  'minorPenalty',         // 12: 輕微犯規次數
  'majorPenalty',         // 13: 重大犯規次數
  // Teleop - Climb (3)
  'teleClimbStatus',      // 14: 手動爬塔狀態
  'teleClimbTime',        // 15: 手動爬塔時間（秒）
  'teleClimbPosition',    // 16: 手動爬塔位置 (LeftSide/Left/Center/Right/RightSide)
  // --- 17 above unchanged ---
  // PostMatch Issues (11) — 0/1 (v1.6.0)
  'issueNoShow',          // 17: 未出場
  'issueCrashed',         // 18: 機器人死亡/失效
  'issueEStop',           // 19: E-Stop
  'issueAStop',           // 20: A-Stop
  'issueLowVoltage',      // 21: 電壓過低
  'issueIntakeStuck',     // 22: Intake 卡住
  'issueShooterOff',      // 23: Shooter 異常
  'issueStuckBump',       // 24: 卡在 Bump 上
  'issueHitTrench',       // 25: 撞到 Trench
  'issuePartFell',        // 26: 零件掉落
  'issueMovement',        // 27: 行動異常
  // PostMatch Flags (6) — 0/1 (v1.6.0)
  'flagYellowCard',       // 28: 黃牌
  'flagRedCard',          // 29: 紅牌
  'flagBelowExpected',    // 30: 表現低於預期
  'flagTipped',           // 31: 翻倒
  'flagRidingFuel',       // 32: 騎 Fuel
  'flagStuckBall',        // 33: 卡球
  // PostMatch Collision (3 bool + 1 text) — v1.6.0
  'hasCollision',         // 34: 有劇烈撞擊 (0/1)
  'collisionField',       // 35: 撞到場地 (0/1)
  'collisionRobot',       // 36: 撞到機器人 (0/1)
  'collisionTeamNumbers', // 37: 撞到的隊伍號碼（文字）
  // PostMatch Ratings (8) — good/ok/bad/空 (v1.7.0)
  'ratingPushTrench',     // 38: 推球回 Alliance Zone (from trench) 評分
  'ratingPushBump',       // 39: 推球回 Alliance Zone (from bump) 評分
  'ratingShoot',          // 40: 射球回 Alliance Zone 評分
  'ratingHuman',          // 41: 給 Human Player (Outpost) 評分
  'ratingDefense',        // 42: Defense 評分
  'ratingIntakeFuel',     // 43: 吸 fuel 評分 (v1.7.0)
  'ratingTransportFuel',  // 44: 輸送 fuel 評分 (v1.7.0)
  'ratingShootFuel',      // 45: 射擊 fuel 評分 (v1.7.0)
  // PostMatch free-text (1)
  'comments'              // 46: 自由輸入備註
];

/**
 * Path Data QR - 5 個欄位
 * 對應 SCANNER_INTEGRATION.md 的 TSV_SCHEMA_PATH
 */
const TSV_SCHEMA_PATH = [
  'eventCode',    // 0: 賽事代碼
  'matchNumber',  // 1: 場次編號
  'teamNumber',   // 2: 隊伍號碼
  'alliance',     // 3: 聯盟 (R1/R2/R3/B1/B2/B3)
  'autoPath'      // 4: 路徑座標 (x1,y1|x2,y2|...)
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
  'notes',           // 22: 備註
  'autoPath'         // 23: 自動路徑（由 Pit Collect Path QR 合併）
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
 * 處理 GET 請求 - 用於測試連線 & 查詢 API
 */
function doGet(e) {
  // 檢查是否有 action 參數
  var action = e && e.parameter && e.parameter.action;

  if (action === 'queryPaths') {
    return handleQueryPaths(e.parameter);
  }

  if (action === 'queryTeamPaths') {
    return handleQueryTeamPaths(e.parameter);
  }

  if (action === 'tbaStatus') {
    return handleTBAStatus();
  }

  if (action === 'tbaSync') {
    return handleTBASync();
  }

  if (action === 'debug') {
    return handleDebug();
  }

  if (action === 'fixHeaders') {
    return handleFixHeaders();
  }

  var response = {
    success: true,
    message: 'FRC 6998 Scout Scanner API is running',
    version: '1.7.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: 'Upload scouting data',
      GET: 'API status check',
      'GET ?action=queryPaths': 'Query path data by match',
      'GET ?action=queryTeamPaths': 'Query path data by team',
      'GET ?action=tbaStatus': 'TBA sync status',
      'GET ?action=tbaSync': 'Trigger TBA sync'
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
 * 除錯端點 - 回傳工作表概況
 * GET ?action=debug
 */
function handleDebug() {
  try {
    var info = {};
    var sheets = ['Match Data', 'Path Data', 'Pit Scouting'];
    for (var s = 0; s < sheets.length; s++) {
      var sheet = getSheet(sheets[s]);
      if (!sheet) {
        info[sheets[s]] = { exists: false };
        continue;
      }
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var sheetInfo = { exists: true, rows: lastRow, columns: lastCol };
      if (lastRow >= 1) {
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        sheetInfo.headers = headers;
        // 顯示前 3 行樣本資料
        sheetInfo.sampleRows = [];
        for (var r = 1; r < Math.min(data.length, 4); r++) {
          sheetInfo.sampleRows.push(data[r].map(function(v) { return String(v); }));
        }
        var eventIdx = headers.indexOf('eventCode');
        var teamIdx = headers.indexOf('teamNumber');
        var autoPathIdx = headers.indexOf('autoPath');
        var events = {}, teams = {}, pathCount = 0;
        for (var i = 1; i < data.length; i++) {
          if (eventIdx >= 0) events[String(data[i][eventIdx])] = (events[String(data[i][eventIdx])] || 0) + 1;
          if (teamIdx >= 0) teams[String(data[i][teamIdx])] = true;
          if (autoPathIdx >= 0) {
            var ap = String(data[i][autoPathIdx]);
            if (ap && ap !== 'None' && ap !== 'undefined' && ap.trim() !== '') pathCount++;
          }
        }
        sheetInfo.eventCodes = events;
        sheetInfo.teamCount = Object.keys(teams).length;
        sheetInfo.sampleTeams = Object.keys(teams).slice(0, 10);
        sheetInfo.rowsWithAutoPath = pathCount;
      }
      info[sheets[s]] = sheetInfo;
    }
    info.expectedHeaders = {
      match: SHEET_HEADERS.MATCH,
      matchLength: SHEET_HEADERS.MATCH.length
    };
    return createJsonResponse({ success: true, debug: info });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

/**
 * 修復工作表標頭
 * GET ?action=fixHeaders
 */
function handleFixHeaders() {
  try {
    var results = {};
    var sheetConfigs = [
      { name: CONFIG.SHEET_MATCH, headers: SHEET_HEADERS.MATCH },
      { name: CONFIG.SHEET_PATH, headers: SHEET_HEADERS.PATH },
      { name: CONFIG.SHEET_PIT, headers: SHEET_HEADERS.PIT }
    ];

    for (var i = 0; i < sheetConfigs.length; i++) {
      var cfg = sheetConfigs[i];
      var sheet = getSheet(cfg.name);
      if (!sheet) {
        results[cfg.name] = 'not found';
        continue;
      }

      var lastRow = sheet.getLastRow();
      if (lastRow < 1) {
        // 空工作表，直接寫入標頭
        sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
        results[cfg.name] = 'headers written (empty sheet)';
        continue;
      }

      // 檢查第一行是否為空或不正確
      var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var isEmpty = currentHeaders.every(function(h) { return !h || String(h).trim() === ''; });

      if (isEmpty) {
        // 第一行是空的 - 檢查是否為資料行（需要插入標頭行）
        // 看第一行的資料模式來判斷
        var firstRowHasData = currentHeaders.some(function(v) {
          return v !== '' && v !== null && v !== undefined;
        });

        if (!firstRowHasData && lastRow > 1) {
          // 第一行完全空白，第二行開始有資料 -> 直接覆蓋第一行
          sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
          results[cfg.name] = 'headers written to empty row 1 (' + lastRow + ' total rows)';
        } else {
          // 第一行可能是資料 -> 插入新行作為標頭
          sheet.insertRowBefore(1);
          sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
          results[cfg.name] = 'headers inserted as new row 1 (' + (lastRow + 1) + ' total rows)';
        }
      } else {
        // 檢查是否已有正確標頭
        var hasCorrectHeaders = cfg.headers.every(function(h, idx) {
          return String(currentHeaders[idx] || '') === h;
        });
        if (hasCorrectHeaders) {
          results[cfg.name] = 'headers already correct';
        } else {
          // 標頭不正確，覆蓋
          sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
          results[cfg.name] = 'headers overwritten (were incorrect)';
        }
      }

      // 設定標頭樣式
      sheet.getRange(1, 1, 1, cfg.headers.length)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    return createJsonResponse({ success: true, results: results });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

/**
 * 處理查詢路徑 API
 * GET ?action=queryPaths&eventCode=XXX&matchLevel=YY&matchNumber=ZZ
 */
function handleQueryPaths(params) {
  try {
    var eventCode = params.eventCode;
    var matchLevel = params.matchLevel;
    var matchNumber = params.matchNumber;

    if (!eventCode || !matchLevel || !matchNumber) {
      return createJsonResponse({
        success: false,
        error: 'Missing required parameters: eventCode, matchLevel, matchNumber',
        paths: [],
        count: 0
      });
    }

    var paths = queryPathsByMatch(eventCode, matchLevel, matchNumber);

    return createJsonResponse({
      success: true,
      paths: paths,
      count: paths.length,
      query: { eventCode: eventCode, matchLevel: matchLevel, matchNumber: matchNumber }
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message,
      paths: [],
      count: 0
    });
  }
}

/**
 * 處理查詢隊伍路徑 API
 * GET ?action=queryTeamPaths&eventCode=XXX&teamNumber=ZZZ
 */
function handleQueryTeamPaths(params) {
  try {
    var eventCode = params.eventCode;
    var teamNumber = params.teamNumber;

    if (!eventCode || !teamNumber) {
      return createJsonResponse({
        success: false,
        error: 'Missing required parameters: eventCode, teamNumber',
        paths: [],
        count: 0
      });
    }

    var paths = queryPathsByTeam(eventCode, teamNumber);

    return createJsonResponse({
      success: true,
      paths: paths,
      count: paths.length,
      query: { eventCode: eventCode, teamNumber: teamNumber }
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message,
      paths: [],
      count: 0
    });
  }
}

/**
 * 從 Match Data 和 Path Data 工作表查詢指定隊伍的所有路徑資料
 */
function queryPathsByTeam(eventCode, teamNumber) {
  var results = [];
  var seen = {};  // key: matchLevel_matchNumber，避免重複

  // 1. 從 Match Data 工作表查詢（有 matchLevel）
  var matchSheet = getSheet(CONFIG.SHEET_MATCH);
  if (matchSheet && matchSheet.getLastRow() > 1) {
    var matchData = matchSheet.getDataRange().getValues();
    var matchHeaders = matchData[0];

    var eventIdx = matchHeaders.indexOf('eventCode');
    var levelIdx = matchHeaders.indexOf('matchLevel');
    var numberIdx = matchHeaders.indexOf('matchNumber');
    var teamIdx = matchHeaders.indexOf('teamNumber');
    var allianceIdx = matchHeaders.indexOf('alliance');
    var autoPathIdx = matchHeaders.indexOf('autoPath');

    for (var i = 1; i < matchData.length; i++) {
      var row = matchData[i];
      if (String(row[eventIdx]) === String(eventCode) &&
          String(row[teamIdx]) === String(teamNumber)) {
        var autoPath = autoPathIdx >= 0 ? String(row[autoPathIdx]) : '';
        if (autoPath && autoPath !== 'None' && autoPath.trim() !== '') {
          var ml = String(row[levelIdx] || '');
          var mn = String(row[numberIdx] || '');
          var key = ml + '_' + mn;
          if (!seen[key]) {
            results.push({
              teamNumber: String(teamNumber),
              alliance: String(row[allianceIdx] || ''),
              autoPath: autoPath,
              matchLevel: ml,
              matchNumber: mn,
              source: 'scouting'
            });
            seen[key] = true;
          }
        }
      }
    }
  }

  // 2. 從 Path Data 工作表查詢（備用，無 matchLevel）
  var pathSheet = getSheet(CONFIG.SHEET_PATH);
  if (pathSheet && pathSheet.getLastRow() > 1) {
    var pathData = pathSheet.getDataRange().getValues();
    var pathHeaders = pathData[0];

    var pEventIdx = pathHeaders.indexOf('eventCode');
    var pNumberIdx = pathHeaders.indexOf('matchNumber');
    var pTeamIdx = pathHeaders.indexOf('teamNumber');
    var pAllianceIdx = pathHeaders.indexOf('alliance');
    var pAutoPathIdx = pathHeaders.indexOf('autoPath');

    for (var j = 1; j < pathData.length; j++) {
      var pRow = pathData[j];
      if (String(pRow[pEventIdx]) === String(eventCode) &&
          String(pRow[pTeamIdx]) === String(teamNumber)) {
        var pAutoPath = pAutoPathIdx >= 0 ? String(pRow[pAutoPathIdx]) : '';
        if (pAutoPath && pAutoPath !== 'None' && pAutoPath.trim() !== '') {
          var pMn = String(pRow[pNumberIdx] || '');
          var pKey = '_' + pMn;
          if (!seen[pKey]) {
            results.push({
              teamNumber: String(teamNumber),
              alliance: pAllianceIdx >= 0 ? String(pRow[pAllianceIdx] || '') : '',
              autoPath: pAutoPath,
              matchLevel: '',
              matchNumber: pMn,
              source: 'scouting'
            });
            seen[pKey] = true;
          }
        }
      }
    }
  }

  // 3. 從 Pit Scouting 工作表查詢（Pit Collect 路徑）
  var pitSheet = getSheet(CONFIG.SHEET_PIT);
  if (pitSheet && pitSheet.getLastRow() > 1) {
    var pitData = pitSheet.getDataRange().getValues();
    var pitHeaders = pitData[0];

    var pitTeamIdx = pitHeaders.indexOf('teamNumber');
    var pitAutoPathIdx = pitHeaders.indexOf('autoPath');

    for (var k = 1; k < pitData.length; k++) {
      var pitRow = pitData[k];
      if (String(pitRow[pitTeamIdx]) === String(teamNumber)) {
        var pitAutoPath = pitAutoPathIdx >= 0 ? String(pitRow[pitAutoPathIdx]) : '';
        if (pitAutoPath && pitAutoPath !== 'None' && pitAutoPath.trim() !== '') {
          // Pit autoPath 可能有多條用 ';' 分隔
          var pitPaths = pitAutoPath.split(';');
          for (var pi = 0; pi < pitPaths.length; pi++) {
            var singlePath = pitPaths[pi].trim();
            if (singlePath && singlePath !== 'None') {
              var pitKey = 'pit_' + pi;
              if (!seen[pitKey]) {
                results.push({
                  teamNumber: String(teamNumber),
                  alliance: '',
                  autoPath: singlePath,
                  matchLevel: '',
                  matchNumber: '',
                  source: 'pit'
                });
                seen[pitKey] = true;
              }
            }
          }
        }
      }
    }
  }

  return results;
}

/**
 * 從 Match Data 和 Path Data 工作表查詢路徑資料
 */
function queryPathsByMatch(eventCode, matchLevel, matchNumber) {
  var results = {};  // key: teamNumber, value: { teamNumber, alliance, autoPath }

  // 1. 從 Match Data 工作表查詢
  var matchSheet = getSheet(CONFIG.SHEET_MATCH);
  if (matchSheet && matchSheet.getLastRow() > 1) {
    var matchData = matchSheet.getDataRange().getValues();
    var matchHeaders = matchData[0];

    var eventIdx = matchHeaders.indexOf('eventCode');
    var levelIdx = matchHeaders.indexOf('matchLevel');
    var numberIdx = matchHeaders.indexOf('matchNumber');
    var teamIdx = matchHeaders.indexOf('teamNumber');
    var allianceIdx = matchHeaders.indexOf('alliance');
    var autoPathIdx = matchHeaders.indexOf('autoPath');

    for (var i = 1; i < matchData.length; i++) {
      var row = matchData[i];
      if (String(row[eventIdx]) === String(eventCode) &&
          String(row[levelIdx]) === String(matchLevel) &&
          String(row[numberIdx]) === String(matchNumber)) {
        var team = String(row[teamIdx]);
        var autoPath = autoPathIdx >= 0 ? String(row[autoPathIdx]) : '';
        // 只加入有效路徑
        if (autoPath && autoPath !== 'None' && autoPath.trim() !== '') {
          results[team] = {
            teamNumber: team,
            alliance: String(row[allianceIdx] || ''),
            autoPath: autoPath,
            matchLevel: String(row[levelIdx] || matchLevel),
            matchNumber: String(matchNumber),
            source: 'scouting'
          };
        }
      }
    }
  }

  // 2. 從 Path Data 工作表查詢（備用存儲）
  var pathSheet = getSheet(CONFIG.SHEET_PATH);
  if (pathSheet && pathSheet.getLastRow() > 1) {
    var pathData = pathSheet.getDataRange().getValues();
    var pathHeaders = pathData[0];

    var pEventIdx = pathHeaders.indexOf('eventCode');
    var pNumberIdx = pathHeaders.indexOf('matchNumber');
    var pTeamIdx = pathHeaders.indexOf('teamNumber');
    var pAllianceIdx = pathHeaders.indexOf('alliance');
    var pAutoPathIdx = pathHeaders.indexOf('autoPath');

    for (var j = 1; j < pathData.length; j++) {
      var pRow = pathData[j];
      if (String(pRow[pEventIdx]) === String(eventCode) &&
          String(pRow[pNumberIdx]) === String(matchNumber)) {
        var pTeam = String(pRow[pTeamIdx]);
        var pAutoPath = pAutoPathIdx >= 0 ? String(pRow[pAutoPathIdx]) : '';
        if (pAutoPath && pAutoPath !== 'None' && pAutoPath.trim() !== '' && !results[pTeam]) {
          results[pTeam] = {
            teamNumber: pTeam,
            alliance: pAllianceIdx >= 0 ? String(pRow[pAllianceIdx] || '') : '',
            autoPath: pAutoPath,
            matchLevel: String(matchLevel),
            matchNumber: String(matchNumber),
            source: 'scouting'
          };
        }
      }
    }
  }

  // 轉換為陣列
  var arr = [];
  for (var key in results) {
    if (results.hasOwnProperty(key)) {
      arr.push(results[key]);
    }
  }
  return arr;
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

  // 如果啟用自動合併，嘗試將 Path 合併到對應的 Match 或 Pit
  if (CONFIG.AUTO_MERGE_PATH) {
    // 1. 先嘗試合併到 Match（Scouting PASS 的 path）
    // Path QR 不含 matchLevel，使用 field-by-field 比較
    const matchSheet = getSheet(CONFIG.SHEET_MATCH);
    if (matchSheet) {
      const matchRow = findMatchRowByFields(matchSheet, data.eventCode, data.matchNumber, data.teamNumber);

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

    // 2. 再嘗試合併到 Pit（Pit Collect 的 path）
    const pitSheet = getSheet(CONFIG.SHEET_PIT);
    if (pitSheet && data.teamNumber) {
      const pitRow = findRowByTeamNumber(pitSheet, data.teamNumber, SHEET_HEADERS.PIT);
      if (pitRow > 0) {
        const autoPathColIndex = SHEET_HEADERS.PIT.indexOf('autoPath') + 1;
        if (autoPathColIndex > 0) {
          // 支援多路徑合併（分號分隔）
          const existing = pitSheet.getRange(pitRow, autoPathColIndex).getValue();
          const newValue = existing && String(existing) !== 'None' && String(existing) !== ''
            ? String(existing) + ';' + (data.autoPath || 'None')
            : (data.autoPath || 'None');
          pitSheet.getRange(pitRow, autoPathColIndex).setValue(newValue);

          return {
            message: `Merged path data to pit record at row ${pitRow}`,
            rowNumber: pitRow
          };
        }
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
    // 更新現有紀錄（保留已合併的 autoPath）
    const existingData = getRowData(sheet, existingRow, SHEET_HEADERS.PIT);
    const mergedData = { ...data };
    if (!mergedData.autoPath || mergedData.autoPath === 'None') {
      mergedData.autoPath = existingData.autoPath || 'None';
    }
    const row = buildPitRow(mergedData, data.scanTime, uploadTime);
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
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // 檢查現有工作表的標頭是否正確，空白則自動修復
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var isEmpty = currentHeaders.every(function(h) { return !h || String(h).trim() === ''; });
      if (isEmpty) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length)
          .setFontWeight('bold')
          .setBackground('#4285f4')
          .setFontColor('#ffffff');
        sheet.setFrozenRows(1);
      }
    }
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
 * 包含 matchLevel + alliance，確保不同比賽等級/聯盟位置不會互相覆蓋
 */
function getMatchKey(data) {
  return `${data.eventCode || ''}_${data.matchLevel || ''}_${data.matchNumber || ''}_${data.alliance || ''}_${data.teamNumber || ''}`;
}

/**
 * 根據 Match Key 尋找列號
 */
function findRowByMatchKey(sheet, matchKey) {
  const data = sheet.getDataRange().getValues();
  const eventCodeIdx = SHEET_HEADERS.MATCH.indexOf('eventCode');
  const matchLevelIdx = SHEET_HEADERS.MATCH.indexOf('matchLevel');
  const matchNumberIdx = SHEET_HEADERS.MATCH.indexOf('matchNumber');
  const allianceIdx = SHEET_HEADERS.MATCH.indexOf('alliance');
  const teamNumberIdx = SHEET_HEADERS.MATCH.indexOf('teamNumber');

  for (let i = 1; i < data.length; i++) {
    const rowKey = `${data[i][eventCodeIdx]}_${data[i][matchLevelIdx]}_${data[i][matchNumberIdx]}_${data[i][allianceIdx]}_${data[i][teamNumberIdx]}`;
    if (rowKey === matchKey) {
      return i + 1; // 列號從 1 開始
    }
  }

  return -1;
}

/**
 * 根據個別欄位尋找 Match 列號（用於 Path 合併）
 * Path QR 不含 matchLevel，因此只比較 eventCode + matchNumber + teamNumber
 */
function findMatchRowByFields(sheet, eventCode, matchNumber, teamNumber) {
  const data = sheet.getDataRange().getValues();
  const eventCodeIdx = SHEET_HEADERS.MATCH.indexOf('eventCode');
  const matchNumberIdx = SHEET_HEADERS.MATCH.indexOf('matchNumber');
  const teamNumberIdx = SHEET_HEADERS.MATCH.indexOf('teamNumber');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][eventCodeIdx]) === String(eventCode) &&
        String(data[i][matchNumberIdx]) === String(matchNumber) &&
        String(data[i][teamNumberIdx]) === String(teamNumber)) {
      return i + 1;
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
    bumpCount: '2',
    trenchCount: '1',
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
    alliance: 'R1',
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
 * 測試查詢路徑 API
 */
function testQueryPaths() {
  var result = queryPathsByMatch('2026TEST', 'QM', '1');
  console.log('Query result:', JSON.stringify(result));
  console.log('Found', result.length, 'paths');
}

/**
 * 填入測試資料（用於測試查詢功能）
 * 在 Apps Script 編輯器中選擇此函數，點「執行」即可
 *
 * 會在 Match Data 和 Path Data 工作表各加入多筆模擬路徑資料
 * 賽事代碼：2026TEST
 * 涵蓋：練習賽(P)、資格賽(QM)、季後賽(PO)
 * 隊伍：6998, 254, 1678, 2056, 3310, 118
 * 紅藍方：R1-R3, B1-B3
 */
function seedTestData() {
  // --- Match Data 工作表 ---
  var matchSheet = getOrCreateSheet(CONFIG.SHEET_MATCH, SHEET_HEADERS.MATCH);
  var uploadTime = new Date().toISOString();

  var matchRows = [
    buildMatchRow({ scouterName:'Alice', eventCode:'2026TEST', matchLevel:'QM', matchNumber:'1', alliance:'R1', teamNumber:'6998',
      autoClimbStatus:'Level1', autoClimbTime:'4', autoClimbPosition:'Center',
      bumpCount:'2', trenchCount:'1', fuelDroppedOnBumpCount:'0', minorPenalty:'0', majorPenalty:'0',
      teleClimbStatus:'Level2', teleClimbTime:'7', teleClimbPosition:'Left',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Fast auto' },
      '15.2,75.3|20.1,65.0|28.5,55.2|35.0,48.0|40.0,42.5', uploadTime, uploadTime),

    buildMatchRow({ scouterName:'Bob', eventCode:'2026TEST', matchLevel:'QM', matchNumber:'1', alliance:'R2', teamNumber:'254',
      autoClimbStatus:'None', autoClimbTime:'0', autoClimbPosition:'Center',
      bumpCount:'3', trenchCount:'2', fuelDroppedOnBumpCount:'1', minorPenalty:'1', majorPenalty:'0',
      teleClimbStatus:'Level3', teleClimbTime:'12', teleClimbPosition:'Right',
      robotDied:'0', almostTipped:'1', ridingOnBall:'0', comments:'Strong climb' },
      '10.0,80.0|18.0,70.0|25.0,60.0|30.0,52.0|38.0,45.0|45.0,40.0', uploadTime, uploadTime),

    buildMatchRow({ scouterName:'Charlie', eventCode:'2026TEST', matchLevel:'QM', matchNumber:'1', alliance:'R3', teamNumber:'1678',
      autoClimbStatus:'Level1', autoClimbTime:'3', autoClimbPosition:'LeftSide',
      bumpCount:'1', trenchCount:'0', fuelDroppedOnBumpCount:'0', minorPenalty:'0', majorPenalty:'0',
      teleClimbStatus:'Level2', teleClimbTime:'6', teleClimbPosition:'Center',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Consistent auto' },
      '12.0,78.0|15.5,70.0|18.0,62.0|22.0,55.0|28.0,50.0', uploadTime, uploadTime),

    buildMatchRow({ scouterName:'Dave', eventCode:'2026TEST', matchLevel:'QM', matchNumber:'1', alliance:'B1', teamNumber:'2056',
      autoClimbStatus:'None', autoClimbTime:'0', autoClimbPosition:'Center',
      bumpCount:'0', trenchCount:'1', fuelDroppedOnBumpCount:'0', minorPenalty:'0', majorPenalty:'0',
      teleClimbStatus:'Level1', teleClimbTime:'5', teleClimbPosition:'RightSide',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Smooth driving' },
      '85.0,75.0|80.0,65.0|72.0,55.0|65.0,48.0|60.0,42.0', uploadTime, uploadTime),

    buildMatchRow({ scouterName:'Eve', eventCode:'2026TEST', matchLevel:'QM', matchNumber:'1', alliance:'B2', teamNumber:'3310',
      autoClimbStatus:'Level1', autoClimbTime:'5', autoClimbPosition:'Right',
      bumpCount:'1', trenchCount:'1', fuelDroppedOnBumpCount:'0', minorPenalty:'0', majorPenalty:'0',
      teleClimbStatus:'Level2', teleClimbTime:'9', teleClimbPosition:'Left',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Great defense' },
      '88.0,80.0|82.0,72.0|75.0,63.0|70.0,55.0|63.0,50.0|58.0,45.0', uploadTime, uploadTime),

    buildMatchRow({ scouterName:'Frank', eventCode:'2026TEST', matchLevel:'QM', matchNumber:'1', alliance:'B3', teamNumber:'118',
      autoClimbStatus:'Level2', autoClimbTime:'7', autoClimbPosition:'Center',
      bumpCount:'2', trenchCount:'2', fuelDroppedOnBumpCount:'1', minorPenalty:'1', majorPenalty:'0',
      teleClimbStatus:'Level3', teleClimbTime:'15', teleClimbPosition:'Center',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Aggressive play' },
      '90.0,78.0|85.0,68.0|78.0,58.0|72.0,50.0|65.0,45.0', uploadTime, uploadTime),

    // QM2
    buildMatchRow({ scouterName:'Alice', eventCode:'2026TEST', matchLevel:'QM', matchNumber:'2', alliance:'B1', teamNumber:'6998',
      autoClimbStatus:'Level2', autoClimbTime:'5', autoClimbPosition:'Center',
      bumpCount:'1', trenchCount:'2', fuelDroppedOnBumpCount:'0', minorPenalty:'0', majorPenalty:'0',
      teleClimbStatus:'Level3', teleClimbTime:'10', teleClimbPosition:'Center',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Best match' },
      '88.0,72.0|82.0,62.0|75.0,53.0|68.0,45.0|60.0,40.0|55.0,35.0', uploadTime, uploadTime),

    buildMatchRow({ scouterName:'Bob', eventCode:'2026TEST', matchLevel:'QM', matchNumber:'2', alliance:'B2', teamNumber:'254',
      autoClimbStatus:'Level1', autoClimbTime:'4', autoClimbPosition:'Left',
      bumpCount:'2', trenchCount:'1', fuelDroppedOnBumpCount:'0', minorPenalty:'0', majorPenalty:'0',
      teleClimbStatus:'Level2', teleClimbTime:'8', teleClimbPosition:'LeftSide',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Good auto' },
      '90.0,80.0|84.0,70.0|78.0,62.0|70.0,55.0|62.0,48.0', uploadTime, uploadTime),

    // QM3
    buildMatchRow({ scouterName:'Charlie', eventCode:'2026TEST', matchLevel:'QM', matchNumber:'3', alliance:'R2', teamNumber:'6998',
      autoClimbStatus:'Level1', autoClimbTime:'3', autoClimbPosition:'Right',
      bumpCount:'3', trenchCount:'1', fuelDroppedOnBumpCount:'1', minorPenalty:'1', majorPenalty:'0',
      teleClimbStatus:'Level2', teleClimbTime:'9', teleClimbPosition:'Right',
      robotDied:'0', almostTipped:'1', ridingOnBall:'0', comments:'Tough defense' },
      '18.0,70.0|22.0,60.0|30.0,50.0|35.0,42.0|42.0,35.0', uploadTime, uploadTime),

    // P1: 練習賽
    buildMatchRow({ scouterName:'Alice', eventCode:'2026TEST', matchLevel:'P', matchNumber:'1', alliance:'R1', teamNumber:'6998',
      autoClimbStatus:'None', autoClimbTime:'0', autoClimbPosition:'Center',
      bumpCount:'0', trenchCount:'0', fuelDroppedOnBumpCount:'0', minorPenalty:'0', majorPenalty:'0',
      teleClimbStatus:'None', teleClimbTime:'0', teleClimbPosition:'Center',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Practice run' },
      '14.0,82.0|18.0,72.0|22.0,62.0|28.0,52.0', uploadTime, uploadTime),

    // PO1: 季後賽
    buildMatchRow({ scouterName:'Dave', eventCode:'2026TEST', matchLevel:'PO', matchNumber:'1', alliance:'R1', teamNumber:'6998',
      autoClimbStatus:'Level2', autoClimbTime:'4', autoClimbPosition:'Center',
      bumpCount:'2', trenchCount:'2', fuelDroppedOnBumpCount:'0', minorPenalty:'0', majorPenalty:'0',
      teleClimbStatus:'Level3', teleClimbTime:'8', teleClimbPosition:'Center',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Playoff run' },
      '16.0,76.0|22.0,66.0|30.0,56.0|38.0,46.0|45.0,38.0|50.0,32.0', uploadTime, uploadTime),

    buildMatchRow({ scouterName:'Eve', eventCode:'2026TEST', matchLevel:'PO', matchNumber:'1', alliance:'B1', teamNumber:'254',
      autoClimbStatus:'Level2', autoClimbTime:'5', autoClimbPosition:'Left',
      bumpCount:'1', trenchCount:'1', fuelDroppedOnBumpCount:'0', minorPenalty:'0', majorPenalty:'0',
      teleClimbStatus:'Level3', teleClimbTime:'10', teleClimbPosition:'Left',
      robotDied:'0', almostTipped:'0', ridingOnBall:'0', comments:'Finals' },
      '86.0,76.0|80.0,66.0|72.0,56.0|65.0,48.0|58.0,42.0|52.0,36.0', uploadTime, uploadTime),
  ];

  for (var m = 0; m < matchRows.length; m++) {
    matchSheet.appendRow(matchRows[m]);
  }

  // --- Path Data 工作表（額外路徑，不在 Match Data 裡的）---
  var pathSheet = getOrCreateSheet(CONFIG.SHEET_PATH, SHEET_HEADERS.PATH);

  var pathRows = [
    // QM4: 只有路徑資料（沒有 Match Data）
    buildPathRow({ eventCode:'2026TEST', matchNumber:'4', teamNumber:'6998', alliance:'R1',
      autoPath:'12.0,80.0|16.0,70.0|22.0,60.0|28.0,50.0|35.0,42.0|40.0,36.0' }, uploadTime, uploadTime),

    buildPathRow({ eventCode:'2026TEST', matchNumber:'4', teamNumber:'1678', alliance:'R3',
      autoPath:'10.0,85.0|14.0,75.0|20.0,65.0|26.0,55.0|32.0,48.0' }, uploadTime, uploadTime),

    buildPathRow({ eventCode:'2026TEST', matchNumber:'4', teamNumber:'118', alliance:'B2',
      autoPath:'92.0,82.0|86.0,72.0|80.0,62.0|74.0,52.0|68.0,45.0|62.0,40.0' }, uploadTime, uploadTime),

    // QM5: 只有路徑
    buildPathRow({ eventCode:'2026TEST', matchNumber:'5', teamNumber:'254', alliance:'R1',
      autoPath:'8.0,78.0|14.0,68.0|20.0,58.0|28.0,48.0|36.0,40.0|42.0,35.0|48.0,30.0' }, uploadTime, uploadTime),
  ];

  for (var p = 0; p < pathRows.length; p++) {
    pathSheet.appendRow(pathRows[p]);
  }

  // --- Pit Scouting 工作表（Pit Collect 資料，含 autoPath）---
  var pitSheet = getOrCreateSheet(CONFIG.SHEET_PIT, SHEET_HEADERS.PIT);

  var pitRows = [
    // 6998: 有 2 條 Pit Collect 路徑（分號分隔）
    buildPitRow({
      teamNumber:'6998', scouterName:'Alice', chassisType:'Swerve', weight:'52',
      maxCapacity:'4', intake:'Ground + Source', visionHardware:'Limelight 3',
      visionSoftware:'PhotonVision', shooting:'Speaker + Amp', turret:'None',
      startLocation:'Center', preload:'1', autoIntake:'1', autoHang:'0',
      autoTotal:'5', crossMidfield:'1', terrain:'Chain', stability:'4',
      climbLevel:'Harmony', climbPosition:'Center', climbTime:'8',
      photosTaken:'1', notes:'Strong auto, fast cycle',
      autoPath:'20.0,85.0|25.0,75.0|30.0,65.0|35.0,55.0|40.0,48.0;18.0,80.0|22.0,70.0|28.0,60.0|35.0,50.0|42.0,42.0|48.0,35.0'
    }, uploadTime, uploadTime),

    // 254: 有 1 條 Pit Collect 路徑
    buildPitRow({
      teamNumber:'254', scouterName:'Bob', chassisType:'Swerve', weight:'55',
      maxCapacity:'5', intake:'Ground', visionHardware:'Limelight 3',
      visionSoftware:'Custom', shooting:'Speaker', turret:'Full 360',
      startLocation:'Left', preload:'1', autoIntake:'1', autoHang:'1',
      autoTotal:'6', crossMidfield:'1', terrain:'Chain + Bump', stability:'5',
      climbLevel:'Harmony', climbPosition:'Left', climbTime:'5',
      photosTaken:'1', notes:'Best auto in event',
      autoPath:'82.0,88.0|78.0,78.0|72.0,68.0|65.0,58.0|58.0,50.0|52.0,42.0|48.0,35.0'
    }, uploadTime, uploadTime),

    // 1678: 有 1 條 Pit Collect 路徑
    buildPitRow({
      teamNumber:'1678', scouterName:'Charlie', chassisType:'Swerve', weight:'50',
      maxCapacity:'4', intake:'Ground + Source', visionHardware:'PhotonVision Camera',
      visionSoftware:'PhotonVision', shooting:'Speaker', turret:'None',
      startLocation:'Right', preload:'1', autoIntake:'1', autoHang:'0',
      autoTotal:'4', crossMidfield:'1', terrain:'Chain', stability:'4',
      climbLevel:'Level2', climbPosition:'Right', climbTime:'10',
      photosTaken:'1', notes:'Consistent scorer',
      autoPath:'15.0,90.0|18.0,80.0|22.0,70.0|28.0,60.0|35.0,52.0'
    }, uploadTime, uploadTime),

    // 2056: 無 autoPath（測試空路徑不會被查詢出來）
    buildPitRow({
      teamNumber:'2056', scouterName:'Dave', chassisType:'Tank', weight:'48',
      maxCapacity:'3', intake:'Source Only', visionHardware:'None',
      visionSoftware:'None', shooting:'Amp', turret:'None',
      startLocation:'Center', preload:'1', autoIntake:'0', autoHang:'0',
      autoTotal:'2', crossMidfield:'0', terrain:'Bump', stability:'3',
      climbLevel:'Level1', climbPosition:'Center', climbTime:'15',
      photosTaken:'0', notes:'Defense bot',
      autoPath:'None'
    }, uploadTime, uploadTime),

    // 3310: 有 3 條 Pit Collect 路徑
    buildPitRow({
      teamNumber:'3310', scouterName:'Eve', chassisType:'Swerve', weight:'54',
      maxCapacity:'4', intake:'Ground', visionHardware:'Limelight 2+',
      visionSoftware:'Limelight OS', shooting:'Speaker + Amp', turret:'None',
      startLocation:'Right', preload:'1', autoIntake:'1', autoHang:'1',
      autoTotal:'5', crossMidfield:'1', terrain:'Chain', stability:'4',
      climbLevel:'Harmony', climbPosition:'Right', climbTime:'7',
      photosTaken:'1', notes:'Great all-rounder',
      autoPath:'85.0,90.0|80.0,80.0|74.0,70.0|68.0,60.0|62.0,52.0;88.0,85.0|82.0,75.0|76.0,65.0|70.0,55.0|65.0,48.0|60.0,42.0;90.0,82.0|84.0,72.0|78.0,62.0|72.0,52.0|66.0,45.0'
    }, uploadTime, uploadTime),
  ];

  for (var pt = 0; pt < pitRows.length; pt++) {
    pitSheet.appendRow(pitRows[pt]);
  }

  console.log('=== Seed Data Complete ===');
  console.log('Match Data rows added: ' + matchRows.length);
  console.log('Path Data rows added: ' + pathRows.length);
  console.log('Pit Scouting rows added: ' + pitRows.length);
  console.log('');
  console.log('Test queries:');
  console.log('  By match: eventCode=2026TEST, matchLevel=QM, matchNumber=1 (6 scouting paths)');
  console.log('  By match: eventCode=2026TEST, matchLevel=PO, matchNumber=1 (2 scouting paths)');
  console.log('  By team:  eventCode=2026TEST, teamNumber=6998 → scouting: P1,QM1-3,PO1,Path QM4 + pit: 2 paths');
  console.log('  By team:  eventCode=2026TEST, teamNumber=254  → scouting: QM1-2,PO1,Path QM5 + pit: 1 path');
  console.log('  By team:  eventCode=2026TEST, teamNumber=3310 → scouting: QM1 + pit: 3 paths');
  console.log('  By team:  eventCode=2026TEST, teamNumber=2056 → scouting: QM1 + pit: 0 (autoPath=None)');
}

/**
 * 清除測試資料（只保留標題列）
 */
function clearTestData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  [CONFIG.SHEET_MATCH, CONFIG.SHEET_PATH, CONFIG.SHEET_PIT].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }
  });

  console.log('Test data cleared!');
}

// ============================================
// TBA (The Blue Alliance) 同步功能
// ============================================

/**
 * TBA 設定
 */
var TBA_CONFIG = {
  BASE_URL: 'https://www.thebluealliance.com/api/v3',
  EVENT_KEY: '2026mslr',

  // 工作表名稱
  SHEET_TEAMS: 'TBA Teams',
  SHEET_MATCHES: 'TBA Matches',
  SHEET_SCORE_BREAKDOWN: 'TBA Score Breakdown',
  SHEET_RANKINGS: 'TBA Rankings',
  SHEET_OPRS: 'TBA OPRs',
  SHEET_ALLIANCES: 'TBA Alliances',
  SHEET_AWARDS: 'TBA Awards',

  // 時間限制（毫秒），避免 Apps Script 6 分鐘超時
  TIME_LIMIT_MS: 280000  // 4 分 40 秒
};

/**
 * TBA 工作表標題定義
 */
var TBA_HEADERS = {
  TEAMS: ['teamNumber', 'nickname', 'city', 'stateProv', 'country', 'rookieYear', 'lastSynced'],
  MATCHES: ['matchKey', 'compLevel', 'setNumber', 'matchNumber',
            'redTeam1', 'redTeam2', 'redTeam3',
            'blueTeam1', 'blueTeam2', 'blueTeam3',
            'redScore', 'blueScore', 'winningAlliance', 'time', 'lastSynced'],
  RANKINGS: ['rank', 'teamNumber', 'wins', 'losses', 'ties', 'matchesPlayed',
             'sortOrder1', 'sortOrder2', 'sortOrder3', 'extraStat1', 'lastSynced'],
  OPRS: ['teamNumber', 'opr', 'dpr', 'ccwm', 'lastSynced'],
  ALLIANCES: ['allianceNumber', 'captain', 'pick1', 'pick2', 'pick3',
              'status', 'level', 'lastSynced'],
  AWARDS: ['awardName', 'awardType', 'teamNumber', 'awardee', 'lastSynced']
};

// ============================================
// TBA 核心工具函式
// ============================================

/**
 * TBA API 請求（含 ETag 快取）
 * @param {string} endpoint - API 端點（不含 base URL）
 * @returns {Object} { status: 'ok'|'not_modified'|'error', data: any, error?: string }
 */
function tbaFetch(endpoint) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('TBA_API_KEY');

  if (!apiKey) {
    return { status: 'error', data: null, error: 'TBA API key not set. Run setTBAApiKey() first.' };
  }

  var url = TBA_CONFIG.BASE_URL + endpoint;
  var etagKey = 'tba_etag_' + endpoint;
  var etag = props.getProperty(etagKey) || '';

  var options = {
    method: 'get',
    headers: {
      'X-TBA-Auth-Key': apiKey
    },
    muteHttpExceptions: true
  };

  if (etag) {
    options.headers['If-None-Match'] = etag;
  }

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();

    if (code === 304) {
      return { status: 'not_modified', data: null };
    }

    if (code === 200) {
      var newEtag = response.getHeaders()['ETag'] || response.getHeaders()['etag'] || '';
      if (newEtag) {
        props.setProperty(etagKey, newEtag);
      }
      var data = JSON.parse(response.getContentText());
      return { status: 'ok', data: data };
    }

    return { status: 'error', data: null, error: 'HTTP ' + code + ': ' + response.getContentText().substring(0, 200) };
  } catch (e) {
    return { status: 'error', data: null, error: e.message };
  }
}

/**
 * 將 TBA team key 轉為隊伍號碼
 * "frc6998" → "6998"
 */
function stripFrcPrefix(teamKey) {
  if (!teamKey) return '';
  return String(teamKey).replace(/^frc/i, '');
}

/**
 * Clear-and-replace 批次寫入工作表
 * @param {string} sheetName - 工作表名稱
 * @param {string[]} headers - 標題列
 * @param {any[][]} rows - 資料列（二維陣列）
 * @returns {number} 寫入的行數
 */
function writeSheetData(sheetName, headers, rows) {
  var sheet = getOrCreateSheet(sheetName, headers);

  // 比對標頭，若不同則更新（支援動態標頭如 Score Breakdown）
  var lastCol = sheet.getLastColumn();
  var needHeaderUpdate = false;
  if (lastCol !== headers.length) {
    needHeaderUpdate = true;
  } else if (lastCol > 0) {
    var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    needHeaderUpdate = headers.some(function(h, i) { return String(currentHeaders[i] || '') !== String(h); });
  }

  if (needHeaderUpdate) {
    // 清除舊標頭（可能欄數不同）
    if (lastCol > 0) {
      sheet.getRange(1, 1, 1, lastCol).clear();
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
  }

  // 清除標題以下所有資料（用 max 確保清除舊的寬欄資料）
  var clearCols = Math.max(lastCol, headers.length);
  if (sheet.getLastRow() > 1 && clearCols > 0) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, clearCols).clear();
  }

  // 批次寫入
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  return rows.length;
}

// ============================================
// TBA 同步函式（7 個）
// ============================================

/**
 * 同步 TBA Teams
 */
function syncTBATeams(eventKey) {
  var result = tbaFetch('/event/' + eventKey + '/teams');
  if (result.status === 'not_modified') return { sheet: TBA_CONFIG.SHEET_TEAMS, status: 'not_modified', rows: 0 };
  if (result.status === 'error') return { sheet: TBA_CONFIG.SHEET_TEAMS, status: 'error', rows: 0, error: result.error };

  var now = new Date().toISOString();
  var teams = result.data || [];

  // 按 teamNumber 排序
  teams.sort(function(a, b) { return a.team_number - b.team_number; });

  var rows = teams.map(function(t) {
    return [
      t.team_number || '',
      t.nickname || '',
      t.city || '',
      t.state_prov || '',
      t.country || '',
      t.rookie_year || '',
      now
    ];
  });

  var count = writeSheetData(TBA_CONFIG.SHEET_TEAMS, TBA_HEADERS.TEAMS, rows);
  return { sheet: TBA_CONFIG.SHEET_TEAMS, status: 'ok', rows: count };
}

/**
 * 同步 TBA Matches 和 Score Breakdown（共用一次 API call）
 * @returns {Object} { matches: {...}, scoreBreakdown: {...} }
 */
function syncTBAMatchesAndBreakdown(eventKey) {
  var result = tbaFetch('/event/' + eventKey + '/matches');
  if (result.status === 'not_modified') {
    return {
      matches: { sheet: TBA_CONFIG.SHEET_MATCHES, status: 'not_modified', rows: 0 },
      scoreBreakdown: { sheet: TBA_CONFIG.SHEET_SCORE_BREAKDOWN, status: 'not_modified', rows: 0 }
    };
  }
  if (result.status === 'error') {
    return {
      matches: { sheet: TBA_CONFIG.SHEET_MATCHES, status: 'error', rows: 0, error: result.error },
      scoreBreakdown: { sheet: TBA_CONFIG.SHEET_SCORE_BREAKDOWN, status: 'error', rows: 0, error: result.error }
    };
  }

  var now = new Date().toISOString();
  var matches = result.data || [];

  // --- Matches ---
  var compLevelOrder = { qm: 1, ef: 2, qf: 3, sf: 4, f: 5 };

  matches.sort(function(a, b) {
    var la = compLevelOrder[a.comp_level] || 99;
    var lb = compLevelOrder[b.comp_level] || 99;
    if (la !== lb) return la - lb;
    if (a.set_number !== b.set_number) return a.set_number - b.set_number;
    return a.match_number - b.match_number;
  });

  var matchRows = matches.map(function(m) {
    var red = (m.alliances && m.alliances.red && m.alliances.red.team_keys) || [];
    var blue = (m.alliances && m.alliances.blue && m.alliances.blue.team_keys) || [];
    var redScore = (m.alliances && m.alliances.red) ? m.alliances.red.score : '';
    var blueScore = (m.alliances && m.alliances.blue) ? m.alliances.blue.score : '';
    var timeStr = m.time ? new Date(m.time * 1000).toISOString() : '';

    return [
      m.key || '',
      m.comp_level || '',
      m.set_number || '',
      m.match_number || '',
      stripFrcPrefix(red[0]),
      stripFrcPrefix(red[1]),
      stripFrcPrefix(red[2]),
      stripFrcPrefix(blue[0]),
      stripFrcPrefix(blue[1]),
      stripFrcPrefix(blue[2]),
      redScore !== null && redScore !== undefined ? redScore : '',
      blueScore !== null && blueScore !== undefined ? blueScore : '',
      m.winning_alliance || '',
      timeStr,
      now
    ];
  });

  var matchCount = writeSheetData(TBA_CONFIG.SHEET_MATCHES, TBA_HEADERS.MATCHES, matchRows);

  // --- Score Breakdown (dynamic headers) ---
  var breakdownResult = buildScoreBreakdownData(matches, now);

  var sbCount = 0;
  if (breakdownResult.rows.length > 0) {
    sbCount = writeSheetData(TBA_CONFIG.SHEET_SCORE_BREAKDOWN, breakdownResult.headers, breakdownResult.rows);
  }

  return {
    matches: { sheet: TBA_CONFIG.SHEET_MATCHES, status: 'ok', rows: matchCount },
    scoreBreakdown: { sheet: TBA_CONFIG.SHEET_SCORE_BREAKDOWN, status: 'ok', rows: sbCount }
  };
}

/**
 * 從 matches 資料建立 Score Breakdown 的 headers 和 rows
 * Headers 動態產生（根據遊戲規則不同而變化）
 */
function buildScoreBreakdownData(matches, now) {
  // 收集所有 score_breakdown 的 key
  var allKeys = {};
  var breakdownEntries = [];

  for (var i = 0; i < matches.length; i++) {
    var m = matches[i];
    if (!m.score_breakdown) continue;

    var alliances = ['red', 'blue'];
    for (var a = 0; a < alliances.length; a++) {
      var alliance = alliances[a];
      var bd = m.score_breakdown[alliance];
      if (!bd) continue;

      // 收集所有 key
      for (var key in bd) {
        if (bd.hasOwnProperty(key)) {
          allKeys[key] = true;
        }
      }

      breakdownEntries.push({
        matchKey: m.key,
        alliance: alliance,
        breakdown: bd
      });
    }
  }

  // 建立排序後的 key 列表
  var sortedKeys = Object.keys(allKeys).sort();

  if (sortedKeys.length === 0) {
    return { headers: ['matchKey', 'alliance', 'lastSynced'], rows: [] };
  }

  // 建立 headers: matchKey, alliance, ...dynamic keys..., lastSynced
  var headers = ['matchKey', 'alliance'].concat(sortedKeys).concat(['lastSynced']);

  // 建立 rows
  var rows = breakdownEntries.map(function(entry) {
    var row = [entry.matchKey, entry.alliance];
    for (var k = 0; k < sortedKeys.length; k++) {
      var val = entry.breakdown[sortedKeys[k]];
      row.push(val !== undefined && val !== null ? val : '');
    }
    row.push(now);
    return row;
  });

  return { headers: headers, rows: rows };
}

/**
 * 同步 TBA Rankings
 */
function syncTBARankings(eventKey) {
  var result = tbaFetch('/event/' + eventKey + '/rankings');
  if (result.status === 'not_modified') return { sheet: TBA_CONFIG.SHEET_RANKINGS, status: 'not_modified', rows: 0 };
  if (result.status === 'error') return { sheet: TBA_CONFIG.SHEET_RANKINGS, status: 'error', rows: 0, error: result.error };

  var now = new Date().toISOString();
  var rankings = (result.data && result.data.rankings) || [];

  var rows = rankings.map(function(r) {
    var record = r.record || {};
    var sortOrders = r.sort_orders || [];
    var extraStats = r.extra_stats || [];
    return [
      r.rank || '',
      stripFrcPrefix(r.team_key),
      record.wins || 0,
      record.losses || 0,
      record.ties || 0,
      r.matches_played || 0,
      sortOrders[0] !== undefined ? sortOrders[0] : '',
      sortOrders[1] !== undefined ? sortOrders[1] : '',
      sortOrders[2] !== undefined ? sortOrders[2] : '',
      extraStats[0] !== undefined ? extraStats[0] : '',
      now
    ];
  });

  var count = writeSheetData(TBA_CONFIG.SHEET_RANKINGS, TBA_HEADERS.RANKINGS, rows);
  return { sheet: TBA_CONFIG.SHEET_RANKINGS, status: 'ok', rows: count };
}

/**
 * 同步 TBA OPRs
 */
function syncTBAOPRs(eventKey) {
  var result = tbaFetch('/event/' + eventKey + '/oprs');
  if (result.status === 'not_modified') return { sheet: TBA_CONFIG.SHEET_OPRS, status: 'not_modified', rows: 0 };
  if (result.status === 'error') return { sheet: TBA_CONFIG.SHEET_OPRS, status: 'error', rows: 0, error: result.error };

  var now = new Date().toISOString();
  var data = result.data || {};
  var oprs = data.oprs || {};
  var dprs = data.dprs || {};
  var ccwms = data.ccwms || {};

  // 收集所有隊伍 key
  var teamKeys = Object.keys(oprs);
  teamKeys.sort(function(a, b) {
    return (oprs[b] || 0) - (oprs[a] || 0);  // OPR DESC
  });

  var rows = teamKeys.map(function(tk) {
    return [
      stripFrcPrefix(tk),
      oprs[tk] !== undefined ? Math.round(oprs[tk] * 100) / 100 : '',
      dprs[tk] !== undefined ? Math.round(dprs[tk] * 100) / 100 : '',
      ccwms[tk] !== undefined ? Math.round(ccwms[tk] * 100) / 100 : '',
      now
    ];
  });

  var count = writeSheetData(TBA_CONFIG.SHEET_OPRS, TBA_HEADERS.OPRS, rows);
  return { sheet: TBA_CONFIG.SHEET_OPRS, status: 'ok', rows: count };
}

/**
 * 同步 TBA Alliances
 */
function syncTBAAlliances(eventKey) {
  var result = tbaFetch('/event/' + eventKey + '/alliances');
  if (result.status === 'not_modified') return { sheet: TBA_CONFIG.SHEET_ALLIANCES, status: 'not_modified', rows: 0 };
  if (result.status === 'error') return { sheet: TBA_CONFIG.SHEET_ALLIANCES, status: 'error', rows: 0, error: result.error };

  var now = new Date().toISOString();
  var alliances = result.data || [];

  var rows = alliances.map(function(a, idx) {
    var picks = a.picks || [];
    var status = a.status || {};
    return [
      idx + 1,
      stripFrcPrefix(picks[0]),
      stripFrcPrefix(picks[1]),
      stripFrcPrefix(picks[2]),
      stripFrcPrefix(picks[3]),
      status.status || '',
      status.level || '',
      now
    ];
  });

  var count = writeSheetData(TBA_CONFIG.SHEET_ALLIANCES, TBA_HEADERS.ALLIANCES, rows);
  return { sheet: TBA_CONFIG.SHEET_ALLIANCES, status: 'ok', rows: count };
}

/**
 * 同步 TBA Awards
 */
function syncTBAAwards(eventKey) {
  var result = tbaFetch('/event/' + eventKey + '/awards');
  if (result.status === 'not_modified') return { sheet: TBA_CONFIG.SHEET_AWARDS, status: 'not_modified', rows: 0 };
  if (result.status === 'error') return { sheet: TBA_CONFIG.SHEET_AWARDS, status: 'error', rows: 0, error: result.error };

  var now = new Date().toISOString();
  var awards = result.data || [];

  var rows = [];
  for (var i = 0; i < awards.length; i++) {
    var award = awards[i];
    var recipients = award.recipient_list || [];
    for (var j = 0; j < recipients.length; j++) {
      var r = recipients[j];
      rows.push([
        award.name || '',
        award.award_type || '',
        r.team_key ? stripFrcPrefix(r.team_key) : '',
        r.awardee || '',
        now
      ]);
    }
  }

  // 按 awardName 排序
  rows.sort(function(a, b) {
    return String(a[0]).localeCompare(String(b[0]));
  });

  var count = writeSheetData(TBA_CONFIG.SHEET_AWARDS, TBA_HEADERS.AWARDS, rows);
  return { sheet: TBA_CONFIG.SHEET_AWARDS, status: 'ok', rows: count };
}

// ============================================
// TBA 協調器
// ============================================

/**
 * 同步所有 TBA 資料（主要入口）
 * 會追蹤經過時間，若接近超時則提前停止
 */
function syncAllTBA() {
  var startTime = new Date().getTime();
  var eventKey = TBA_CONFIG.EVENT_KEY;
  var results = [];

  function elapsed() {
    return new Date().getTime() - startTime;
  }

  function timeOk() {
    return elapsed() < TBA_CONFIG.TIME_LIMIT_MS;
  }

  console.log('=== TBA Sync Start: ' + eventKey + ' ===');

  function logResult(name, r) {
    if (r.status === 'error') {
      console.log(name + ': ERROR - ' + r.error);
    } else {
      console.log(name + ': ' + r.status + ' (' + r.rows + ' rows)');
    }
  }

  // 1. Teams
  if (timeOk()) {
    var teamsResult = syncTBATeams(eventKey);
    results.push(teamsResult);
    logResult('Teams', teamsResult);
  }

  // 2 & 3. Matches + Score Breakdown (shared API call)
  if (timeOk()) {
    var matchBreakdown = syncTBAMatchesAndBreakdown(eventKey);
    results.push(matchBreakdown.matches);
    results.push(matchBreakdown.scoreBreakdown);
    logResult('Matches', matchBreakdown.matches);
    logResult('Score Breakdown', matchBreakdown.scoreBreakdown);
  }

  // 4. Rankings
  if (timeOk()) {
    var rankingsResult = syncTBARankings(eventKey);
    results.push(rankingsResult);
    logResult('Rankings', rankingsResult);
  }

  // 5. OPRs
  if (timeOk()) {
    var oprsResult = syncTBAOPRs(eventKey);
    results.push(oprsResult);
    logResult('OPRs', oprsResult);
  }

  // 6. Alliances
  if (timeOk()) {
    var alliancesResult = syncTBAAlliances(eventKey);
    results.push(alliancesResult);
    logResult('Alliances', alliancesResult);
  }

  // 7. Awards
  if (timeOk()) {
    var awardsResult = syncTBAAwards(eventKey);
    results.push(awardsResult);
    logResult('Awards', awardsResult);
  }

  // 8. OPR Analysis（自動重算）
  if (timeOk()) {
    try {
      buildOPRSheet();
      calculateOPR();
      console.log('OPR Analysis: updated');
    } catch (oprErr) {
      console.log('OPR Analysis: ERROR - ' + oprErr.message);
    }
  }

  var totalMs = elapsed();
  console.log('=== TBA Sync Complete: ' + totalMs + 'ms ===');

  return {
    eventKey: eventKey,
    results: results,
    elapsedMs: totalMs,
    timestamp: new Date().toISOString()
  };
}

// ============================================
// TBA 設定 / 管理函式
// ============================================

/**
 * 設定 TBA API Key
 * 在 Apps Script 編輯器中執行：setTBAApiKey('your_read_api_key')
 */
function setTBAApiKey(key) {
  if (!key) {
    console.log('Error: API key is empty. Get your key at https://www.thebluealliance.com/account');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('TBA_API_KEY', key);
  console.log('TBA API key saved successfully.');
}

/**
 * 測試 TBA 連線 + 建立所有 TBA 工作表
 */
function setupTBAConfig() {
  // 測試 API 連線
  var result = tbaFetch('/event/' + TBA_CONFIG.EVENT_KEY + '/teams');

  if (result.status === 'error') {
    console.log('TBA connection FAILED: ' + result.error);
    return;
  }

  var teamCount = result.data ? result.data.length : 0;
  console.log('TBA connection OK! Found ' + teamCount + ' teams for ' + TBA_CONFIG.EVENT_KEY);

  // 建立所有 TBA 工作表
  getOrCreateSheet(TBA_CONFIG.SHEET_TEAMS, TBA_HEADERS.TEAMS);
  getOrCreateSheet(TBA_CONFIG.SHEET_MATCHES, TBA_HEADERS.MATCHES);
  getOrCreateSheet(TBA_CONFIG.SHEET_SCORE_BREAKDOWN, ['matchKey', 'alliance', 'lastSynced']);
  getOrCreateSheet(TBA_CONFIG.SHEET_RANKINGS, TBA_HEADERS.RANKINGS);
  getOrCreateSheet(TBA_CONFIG.SHEET_OPRS, TBA_HEADERS.OPRS);
  getOrCreateSheet(TBA_CONFIG.SHEET_ALLIANCES, TBA_HEADERS.ALLIANCES);
  getOrCreateSheet(TBA_CONFIG.SHEET_AWARDS, TBA_HEADERS.AWARDS);

  console.log('All 7 TBA sheets created/verified.');
}

/**
 * 建立每 5 分鐘的自動觸發器
 */
function setupTBATrigger() {
  // 先移除舊的
  removeTBATrigger();

  ScriptApp.newTrigger('syncAllTBA')
    .timeBased()
    .everyMinutes(1)
    .create();

  console.log('TBA auto-sync trigger created (every 1 minute).');
}

/**
 * 移除 TBA 自動觸發器
 */
function removeTBATrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncAllTBA') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  if (removed > 0) {
    console.log('Removed ' + removed + ' TBA trigger(s).');
  } else {
    console.log('No TBA triggers found.');
  }
}

/**
 * 手動同步（尊重 ETag 快取）
 */
function manualSyncTBA() {
  var result = syncAllTBA();
  console.log('Manual sync complete.');
  return result;
}

/**
 * 強制同步（清除 ETag 快取後再同步）
 */
function forceSyncTBA() {
  clearTBAETags();
  var result = syncAllTBA();
  console.log('Force sync complete.');
  return result;
}

/**
 * 清除所有 TBA ETag 快取
 */
function clearTBAETags() {
  var props = PropertiesService.getScriptProperties();
  var allProps = props.getProperties();
  var cleared = 0;

  for (var key in allProps) {
    if (key.indexOf('tba_etag_') === 0) {
      props.deleteProperty(key);
      cleared++;
    }
  }

  console.log('Cleared ' + cleared + ' TBA ETag(s).');
}

// ============================================
// TBA doGet 處理函式
// ============================================

/**
 * 處理 ?action=tbaStatus
 */
function handleTBAStatus() {
  var props = PropertiesService.getScriptProperties();
  var hasApiKey = !!props.getProperty('TBA_API_KEY');

  // 檢查觸發器
  var triggers = ScriptApp.getProjectTriggers();
  var hasTrigger = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncAllTBA') {
      hasTrigger = true;
      break;
    }
  }

  // 檢查各工作表狀態
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = {};
  var sheetNames = [
    TBA_CONFIG.SHEET_TEAMS, TBA_CONFIG.SHEET_MATCHES,
    TBA_CONFIG.SHEET_SCORE_BREAKDOWN, TBA_CONFIG.SHEET_RANKINGS,
    TBA_CONFIG.SHEET_OPRS, TBA_CONFIG.SHEET_ALLIANCES, TBA_CONFIG.SHEET_AWARDS
  ];

  for (var j = 0; j < sheetNames.length; j++) {
    var name = sheetNames[j];
    var sheet = ss.getSheetByName(name);
    sheets[name] = {
      exists: !!sheet,
      rows: sheet ? Math.max(0, sheet.getLastRow() - 1) : 0
    };
  }

  return createJsonResponse({
    success: true,
    eventKey: TBA_CONFIG.EVENT_KEY,
    apiKeyConfigured: hasApiKey,
    triggerActive: hasTrigger,
    sheets: sheets,
    timestamp: new Date().toISOString()
  });
}

/**
 * 處理 ?action=tbaSync（透過 HTTP GET 觸發同步）
 */
function handleTBASync() {
  try {
    var result = syncAllTBA();
    return createJsonResponse({
      success: true,
      message: 'TBA sync completed',
      details: result
    });
  } catch (e) {
    return createJsonResponse({
      success: false,
      error: e.message
    });
  }
}
function authorizeTBA() {
  UrlFetchApp.fetch('https://www.thebluealliance.com/api/v3/status', {
    headers: { 'X-TBA-Auth-Key': PropertiesService.getScriptProperties().getProperty('TBA_API_KEY') }
  });
  console.log('Authorization OK!');
}

// ============================================
// OPR Analysis 功能
// ============================================

/**
 * OPR Analysis 工作表名稱
 */
var OPR_SHEET_NAME = 'OPR Analysis';

/**
 * Section A 標頭（欄 A-L）：比賽得分表
 */
var OPR_HEADERS_A = [
  'matchId', 'redTeam1', 'redTeam2', 'redTeam3',
  'blueTeam1', 'blueTeam2', 'blueTeam3',
  'redScore', 'blueScore', 'redPredicted', 'bluePredicted', 'source'
];

/**
 * Section B 標頭（欄 N-R）：OPR 排名
 */
var OPR_HEADERS_B = ['rank', 'teamNumber', 'opr', 'matchesPlayed', 'lastCalculated'];

// ============================================
// 矩陣運算（純數學，無副作用）
// ============================================

/**
 * 矩陣轉置
 * @param {number[][]} M - 輸入矩陣
 * @returns {number[][]} 轉置後的矩陣
 */
function matTranspose(M) {
  var rows = M.length;
  var cols = M[0].length;
  var T = [];
  for (var j = 0; j < cols; j++) {
    T[j] = [];
    for (var i = 0; i < rows; i++) {
      T[j][i] = M[i][j];
    }
  }
  return T;
}

/**
 * 矩陣乘法 A × B
 * @param {number[][]} A - 左矩陣 (m×n)
 * @param {number[][]} B - 右矩陣 (n×p)
 * @returns {number[][]} 結果矩陣 (m×p)
 */
function matMultiply(A, B) {
  var m = A.length;
  var n = A[0].length;
  var p = B[0].length;
  var C = [];
  for (var i = 0; i < m; i++) {
    C[i] = [];
    for (var j = 0; j < p; j++) {
      var sum = 0;
      for (var k = 0; k < n; k++) {
        sum += A[i][k] * B[k][j];
      }
      C[i][j] = sum;
    }
  }
  return C;
}

/**
 * 矩陣求逆（Gauss-Jordan 消去法，含 partial pivoting）
 * @param {number[][]} M - 方陣
 * @returns {number[][]|null} 逆矩陣，不可逆時回傳 null
 */
function matInverse(M) {
  var n = M.length;
  // 建立增廣矩陣 [M | I]
  var aug = [];
  for (var i = 0; i < n; i++) {
    aug[i] = [];
    for (var j = 0; j < n; j++) {
      aug[i][j] = M[i][j];
    }
    for (var j2 = 0; j2 < n; j2++) {
      aug[i][n + j2] = (i === j2) ? 1 : 0;
    }
  }

  for (var col = 0; col < n; col++) {
    // Partial pivoting: 找最大絕對值的列
    var maxVal = Math.abs(aug[col][col]);
    var maxRow = col;
    for (var r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > maxVal) {
        maxVal = Math.abs(aug[r][col]);
        maxRow = r;
      }
    }
    if (maxVal < 1e-10) return null; // 矩陣不可逆

    // 交換列
    if (maxRow !== col) {
      var tmp = aug[col];
      aug[col] = aug[maxRow];
      aug[maxRow] = tmp;
    }

    // 消去
    var pivot = aug[col][col];
    for (var j3 = 0; j3 < 2 * n; j3++) {
      aug[col][j3] /= pivot;
    }
    for (var r2 = 0; r2 < n; r2++) {
      if (r2 === col) continue;
      var factor = aug[r2][col];
      for (var j4 = 0; j4 < 2 * n; j4++) {
        aug[r2][j4] -= factor * aug[col][j4];
      }
    }
  }

  // 提取逆矩陣
  var inv = [];
  for (var i2 = 0; i2 < n; i2++) {
    inv[i2] = [];
    for (var j5 = 0; j5 < n; j5++) {
      inv[i2][j5] = aug[i2][n + j5];
    }
  }
  return inv;
}

/**
 * 用最小平方法求解 OPR: x = (A^T·A)^(-1) · A^T·b
 * @param {number[][]} A - 聯盟矩陣（每行 = 一場聯盟，每列 = 一支隊伍，在場=1）
 * @param {number[]} b - 分數向量
 * @returns {number[]|null} OPR 向量，或 null（矩陣不可逆）
 */
function solveOPR(A, b) {
  var At = matTranspose(A);
  var AtA = matMultiply(At, A);
  var AtAinv = matInverse(AtA);
  if (!AtAinv) return null;

  // 將 b 轉為列向量
  var bCol = [];
  for (var i = 0; i < b.length; i++) {
    bCol[i] = [b[i]];
  }

  var Atb = matMultiply(At, bCol);
  var x = matMultiply(AtAinv, Atb);

  // 展平為一維陣列
  var result = [];
  for (var j = 0; j < x.length; j++) {
    result[j] = x[j][0];
  }
  return result;
}

// ============================================
// 資料讀取
// ============================================

/**
 * 從 TBA Matches 工作表讀取比賽資料（含分數）
 * @returns {Object[]} 比賽列表 [{ matchId, redTeams: [t1,t2,t3], blueTeams: [t1,t2,t3], redScore, blueScore }]
 */
function extractMatchesFromTBA() {
  var sheet = getSheet(TBA_CONFIG.SHEET_MATCHES);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var matchKeyIdx = headers.indexOf('matchKey');
  var compLevelIdx = headers.indexOf('compLevel');
  var setNumberIdx = headers.indexOf('setNumber');
  var matchNumberIdx = headers.indexOf('matchNumber');
  var r1Idx = headers.indexOf('redTeam1');
  var r2Idx = headers.indexOf('redTeam2');
  var r3Idx = headers.indexOf('redTeam3');
  var b1Idx = headers.indexOf('blueTeam1');
  var b2Idx = headers.indexOf('blueTeam2');
  var b3Idx = headers.indexOf('blueTeam3');
  var rsIdx = headers.indexOf('redScore');
  var bsIdx = headers.indexOf('blueScore');

  if (compLevelIdx === -1 || matchNumberIdx === -1 || r1Idx === -1 || rsIdx === -1) {
    console.log('TBA Matches sheet is missing required columns.');
    return [];
  }

  var matches = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var compLevel = String(row[compLevelIdx] || '');
    var setNum = String(row[setNumberIdx] || '');
    var matchNum = String(row[matchNumberIdx] || '');

    // 產生友善顯示 ID
    var matchId = parseMatchKey(compLevel, setNum, matchNum);

    var redScore = row[rsIdx];
    var blueScore = row[bsIdx];

    matches.push({
      matchId: matchId,
      redTeams: [String(row[r1Idx] || ''), String(row[r2Idx] || ''), String(row[r3Idx] || '')],
      blueTeams: [String(row[b1Idx] || ''), String(row[b2Idx] || ''), String(row[b3Idx] || '')],
      redScore: (redScore !== '' && redScore !== null && redScore !== undefined) ? Number(redScore) : '',
      blueScore: (blueScore !== '' && blueScore !== null && blueScore !== undefined) ? Number(blueScore) : '',
      source: 'TBA'
    });
  }
  return matches;
}

/**
 * 從 Match Data 工作表讀取比賽組成（分數留空，由用戶手動填寫）
 * @returns {Object[]} 比賽列表
 */
function extractMatchesFromScouting() {
  var sheet = getSheet(CONFIG.SHEET_MATCH);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var levelIdx = headers.indexOf('matchLevel');
  var numberIdx = headers.indexOf('matchNumber');
  var allianceIdx = headers.indexOf('alliance');
  var teamIdx = headers.indexOf('teamNumber');

  if (levelIdx === -1 || numberIdx === -1 || allianceIdx === -1 || teamIdx === -1) {
    console.log('Match Data sheet is missing required columns.');
    return [];
  }

  // 按 matchLevel + matchNumber 分組
  var matchMap = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var ml = String(row[levelIdx] || '');
    var mn = String(row[numberIdx] || '');
    var alliance = String(row[allianceIdx] || '');
    var team = String(row[teamIdx] || '');

    if (!ml || !mn || !team) continue;

    var key = ml + '_' + mn;
    if (!matchMap[key]) {
      matchMap[key] = { matchLevel: ml, matchNumber: mn, red: [], blue: [] };
    }

    // R 開頭 → 紅方，B 開頭 → 藍方
    if (alliance.charAt(0) === 'R') {
      matchMap[key].red.push(team);
    } else if (alliance.charAt(0) === 'B') {
      matchMap[key].blue.push(team);
    }
  }

  // 轉為比賽陣列
  var matches = [];
  var sortedKeys = Object.keys(matchMap).sort(function(a, b) {
    var pa = a.split('_');
    var pb = b.split('_');
    var levelOrder = { 'P': 0, 'QM': 1, 'PO': 2, 'X': 3 };
    var la = levelOrder[pa[0]] !== undefined ? levelOrder[pa[0]] : 99;
    var lb = levelOrder[pb[0]] !== undefined ? levelOrder[pb[0]] : 99;
    if (la !== lb) return la - lb;
    return Number(pa[1]) - Number(pb[1]);
  });

  for (var j = 0; j < sortedKeys.length; j++) {
    var m = matchMap[sortedKeys[j]];
    // 補齊 3 支隊伍
    while (m.red.length < 3) m.red.push('');
    while (m.blue.length < 3) m.blue.push('');

    matches.push({
      matchId: m.matchLevel + ' ' + m.matchNumber,
      redTeams: [m.red[0], m.red[1], m.red[2]],
      blueTeams: [m.blue[0], m.blue[1], m.blue[2]],
      redScore: '',
      blueScore: '',
      source: 'Scouting'
    });
  }
  return matches;
}

/**
 * 解析 TBA compLevel + setNumber + matchNumber 為友善顯示
 * @param {string} compLevel - 比賽等級 (qm/qf/sf/f)
 * @param {string} setNumber
 * @param {string} matchNumber
 * @returns {string} 例如 "QM 1", "SF 2-1", "F 1"
 */
function parseMatchKey(compLevel, setNumber, matchNumber) {
  var level = String(compLevel || '').toUpperCase();
  var set = String(setNumber || '');
  var num = String(matchNumber || '');

  if (level === 'QM') {
    return 'QM ' + num;
  } else if (level === 'QF' || level === 'SF' || level === 'EF') {
    return level + ' ' + set + '-' + num;
  } else if (level === 'F') {
    return 'F ' + num;
  }
  return level + ' ' + num;
}

// ============================================
// 主要功能
// ============================================

/**
 * 建立/更新 OPR Analysis 工作表，填入比賽資料
 * 優先使用 TBA 資料，無 TBA 時從 scouting 資料建立
 *
 * 在 Apps Script 編輯器中選擇此函數，點「執行」
 */
function buildOPRSheet() {
  // 1. 嘗試從 TBA 讀取
  var matches = extractMatchesFromTBA();
  var dataSource = 'TBA';

  // 2. 無 TBA 資料時，從 scouting 讀取
  if (matches.length === 0) {
    matches = extractMatchesFromScouting();
    dataSource = 'Scouting';
  }

  if (matches.length === 0) {
    console.log('No match data found. Import TBA data (syncAllTBA) or upload scouting data first.');
    return;
  }

  // 3. 建立/取得工作表
  var sheet = getOrCreateOPRSheet();

  // 4. 清除 Section A 舊資料（保留標頭行）
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    // 只清除 A-L 欄的資料行
    sheet.getRange(2, 1, lastRow - 1, OPR_HEADERS_A.length).clearContent();
  }

  // 5. 寫入比賽資料
  var rows = [];
  for (var i = 0; i < matches.length; i++) {
    var m = matches[i];
    rows.push([
      m.matchId,
      m.redTeams[0], m.redTeams[1], m.redTeams[2],
      m.blueTeams[0], m.blueTeams[1], m.blueTeams[2],
      m.redScore, m.blueScore,
      '', '',  // redPredicted, bluePredicted（calculateOPR 後填入）
      m.source
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, OPR_HEADERS_A.length).setValues(rows);
  }

  // 6. 設定 Section C 查詢公式
  setupOPRLookupFormulas(sheet);

  console.log('=== OPR Sheet Built ===');
  console.log('Data source: ' + dataSource);
  console.log('Matches loaded: ' + matches.length);
  if (dataSource === 'Scouting') {
    console.log('NOTE: Scores are empty. Please fill in redScore (H) and blueScore (I) columns manually.');
  }
  console.log('Next step: Run calculateOPR() to compute OPR values.');
}

/**
 * 計算 OPR 並寫入排名和預測分數
 *
 * 在 Apps Script 編輯器中選擇此函數，點「執行」
 */
function calculateOPR() {
  var sheet = getSheet(OPR_SHEET_NAME);
  if (!sheet) {
    console.log('OPR Analysis sheet not found. Run buildOPRSheet() first.');
    return;
  }

  // 1. 讀取 Section A 資料
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    console.log('No match data in OPR Analysis sheet. Run buildOPRSheet() first.');
    return;
  }

  var dataRange = sheet.getRange(2, 1, lastRow - 1, OPR_HEADERS_A.length).getValues();

  // 2. 收集所有隊伍 + 建立有分數的比賽資料
  var teamSet = {};
  var scoredMatches = [];

  for (var i = 0; i < dataRange.length; i++) {
    var row = dataRange[i];
    var matchId = String(row[0] || '');
    if (!matchId) continue;

    var redTeams = [String(row[1] || ''), String(row[2] || ''), String(row[3] || '')];
    var blueTeams = [String(row[4] || ''), String(row[5] || ''), String(row[6] || '')];
    var redScore = row[7];
    var blueScore = row[8];

    // 記錄所有隊伍
    for (var t = 0; t < 3; t++) {
      if (redTeams[t]) teamSet[redTeams[t]] = true;
      if (blueTeams[t]) teamSet[blueTeams[t]] = true;
    }

    // 只使用有分數的場次
    var rs = (redScore !== '' && redScore !== null && redScore !== undefined) ? Number(redScore) : NaN;
    var bs = (blueScore !== '' && blueScore !== null && blueScore !== undefined) ? Number(blueScore) : NaN;
    if (!isNaN(rs) && !isNaN(bs)) {
      scoredMatches.push({
        rowIndex: i,
        redTeams: redTeams,
        blueTeams: blueTeams,
        redScore: rs,
        blueScore: bs
      });
    }
  }

  if (scoredMatches.length === 0) {
    console.log('No scored matches found. Fill in redScore and blueScore columns first.');
    return;
  }

  // 3. 建立隊伍索引
  var teamList = Object.keys(teamSet).sort(function(a, b) { return Number(a) - Number(b); });
  var teamIndex = {};
  for (var ti = 0; ti < teamList.length; ti++) {
    teamIndex[teamList[ti]] = ti;
  }
  var numTeams = teamList.length;

  // 4. 建立聯盟矩陣 A 和分數向量 b
  var A = [];
  var b = [];
  var matchesPerTeam = {};

  for (var mi = 0; mi < scoredMatches.length; mi++) {
    var sm = scoredMatches[mi];

    // 紅方行
    var redRow = [];
    for (var c = 0; c < numTeams; c++) redRow[c] = 0;
    for (var r = 0; r < 3; r++) {
      if (sm.redTeams[r] && teamIndex[sm.redTeams[r]] !== undefined) {
        redRow[teamIndex[sm.redTeams[r]]] = 1;
        matchesPerTeam[sm.redTeams[r]] = (matchesPerTeam[sm.redTeams[r]] || 0) + 1;
      }
    }
    A.push(redRow);
    b.push(sm.redScore);

    // 藍方行
    var blueRow = [];
    for (var c2 = 0; c2 < numTeams; c2++) blueRow[c2] = 0;
    for (var bl = 0; bl < 3; bl++) {
      if (sm.blueTeams[bl] && teamIndex[sm.blueTeams[bl]] !== undefined) {
        blueRow[teamIndex[sm.blueTeams[bl]]] = 1;
        matchesPerTeam[sm.blueTeams[bl]] = (matchesPerTeam[sm.blueTeams[bl]] || 0) + 1;
      }
    }
    A.push(blueRow);
    b.push(sm.blueScore);
  }

  // 5. 求解 OPR
  var oprValues = solveOPR(A, b);
  if (!oprValues) {
    console.log('Matrix is singular - cannot compute OPR. Need more scored matches with diverse team combinations.');
    return;
  }

  // 6. 寫入 OPR 排名（Section B，欄 N-R）
  var now = new Date().toISOString();
  var oprData = [];
  for (var oi = 0; oi < teamList.length; oi++) {
    oprData.push({
      team: teamList[oi],
      opr: Math.round(oprValues[oi] * 100) / 100,
      matches: matchesPerTeam[teamList[oi]] || 0
    });
  }

  // 按 OPR 降序排名
  oprData.sort(function(a, b2) { return b2.opr - a.opr; });

  var rankRows = [];
  for (var ri = 0; ri < oprData.length; ri++) {
    rankRows.push([
      ri + 1,
      oprData[ri].team,
      oprData[ri].opr,
      oprData[ri].matches,
      now
    ]);
  }

  // 清除舊排名資料（欄 N-R）
  var sectionBStartCol = 14; // N = 14
  var oldRankRows = sheet.getLastRow() - 1;
  if (oldRankRows > 0) {
    sheet.getRange(2, sectionBStartCol, oldRankRows, OPR_HEADERS_B.length).clearContent();
  }

  if (rankRows.length > 0) {
    sheet.getRange(2, sectionBStartCol, rankRows.length, OPR_HEADERS_B.length).setValues(rankRows);
  }

  // 7. 寫入預測分數（Section A 的 J、K 欄）
  var predictedCol = OPR_HEADERS_A.indexOf('redPredicted') + 1; // 10
  for (var pi = 0; pi < dataRange.length; pi++) {
    var pRow = dataRange[pi];
    var pMatchId = String(pRow[0] || '');
    if (!pMatchId) continue;

    var pRedTeams = [String(pRow[1] || ''), String(pRow[2] || ''), String(pRow[3] || '')];
    var pBlueTeams = [String(pRow[4] || ''), String(pRow[5] || ''), String(pRow[6] || '')];

    var redPred = 0;
    var bluePred = 0;
    var redValid = false;
    var blueValid = false;

    for (var pt = 0; pt < 3; pt++) {
      if (pRedTeams[pt] && teamIndex[pRedTeams[pt]] !== undefined) {
        redPred += oprValues[teamIndex[pRedTeams[pt]]];
        redValid = true;
      }
      if (pBlueTeams[pt] && teamIndex[pBlueTeams[pt]] !== undefined) {
        bluePred += oprValues[teamIndex[pBlueTeams[pt]]];
        blueValid = true;
      }
    }

    sheet.getRange(pi + 2, predictedCol).setValue(redValid ? Math.round(redPred * 100) / 100 : '');
    sheet.getRange(pi + 2, predictedCol + 1).setValue(blueValid ? Math.round(bluePred * 100) / 100 : '');
  }

  // 8. 更新查詢公式
  setupOPRLookupFormulas(sheet);

  console.log('=== OPR Calculation Complete ===');
  console.log('Scored matches used: ' + scoredMatches.length);
  console.log('Teams ranked: ' + oprData.length);
  if (oprData.length > 0) {
    console.log('Top 3:');
    for (var top = 0; top < Math.min(3, oprData.length); top++) {
      console.log('  #' + (top + 1) + ' Team ' + oprData[top].team + ' — OPR: ' + oprData[top].opr);
    }
  }
}

// ============================================
// OPR 輔助函式
// ============================================

/**
 * 建立 OPR Analysis 工作表（含三區塊佈局）
 * @returns {Sheet} 工作表物件
 */
function getOrCreateOPRSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(OPR_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(OPR_SHEET_NAME);
  }

  // --- Section A 標頭（欄 A-L）---
  sheet.getRange(1, 1, 1, OPR_HEADERS_A.length).setValues([OPR_HEADERS_A]);
  sheet.getRange(1, 1, 1, OPR_HEADERS_A.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');

  // --- Section B 標頭（欄 N-R）---
  var sectionBStartCol = 14; // N
  sheet.getRange(1, sectionBStartCol, 1, OPR_HEADERS_B.length).setValues([OPR_HEADERS_B]);
  sheet.getRange(1, sectionBStartCol, 1, OPR_HEADERS_B.length)
    .setFontWeight('bold')
    .setBackground('#0f9d58')
    .setFontColor('#ffffff');

  // --- Section C 標頭區域（欄 T-Z）---
  var sectionCStartCol = 20; // T

  // T1: 區塊標題
  sheet.getRange(1, sectionCStartCol).setValue('Team Lookup');
  sheet.getRange(1, sectionCStartCol)
    .setFontWeight('bold')
    .setBackground('#f4b400')
    .setFontColor('#ffffff');

  // T2: "隊伍代號:" 標籤
  sheet.getRange(2, sectionCStartCol).setValue('隊伍代號:');
  sheet.getRange(2, sectionCStartCol).setFontWeight('bold');

  // U2: 輸入格（黃底）
  sheet.getRange(2, sectionCStartCol + 1)
    .setBackground('#fff2cc')
    .setBorder(true, true, true, true, false, false)
    .setFontWeight('bold');

  // T3/U3: OPR
  sheet.getRange(3, sectionCStartCol).setValue('OPR:');
  sheet.getRange(3, sectionCStartCol).setFontWeight('bold');

  // T4/U4: 排名
  sheet.getRange(4, sectionCStartCol).setValue('排名:');
  sheet.getRange(4, sectionCStartCol).setFontWeight('bold');

  // T5/U5: 比賽場數
  sheet.getRange(5, sectionCStartCol).setValue('比賽場數:');
  sheet.getRange(5, sectionCStartCol).setFontWeight('bold');

  // 比賽紀錄標頭（W7:Z7）
  var matchRecordHeaders = ['matchId', 'alliance', 'score', 'predicted'];
  sheet.getRange(7, sectionCStartCol + 3, 1, 4).setValues([matchRecordHeaders]);
  sheet.getRange(7, sectionCStartCol + 3, 1, 4)
    .setFontWeight('bold')
    .setBackground('#e8eaf6');

  sheet.setFrozenRows(1);

  return sheet;
}

/**
 * 寫入 Section C 的 VLOOKUP / FILTER 公式
 * @param {Sheet} sheet - OPR Analysis 工作表
 */
function setupOPRLookupFormulas(sheet) {
  var sectionCStartCol = 20; // T
  var inputCell = 'U2'; // 用戶輸入隊號的格

  // Section B 佈局：N=rank, O=teamNumber, P=opr, Q=matchesPlayed, R=lastCalculated
  // VLOOKUP 要求查詢欄位在範圍第一欄，但 teamNumber 在 O 欄（第二欄），改用 INDEX/MATCH

  // U3: OPR 值
  sheet.getRange(3, sectionCStartCol + 1).setFormula(
    '=IFERROR(INDEX(P:P,MATCH(' + inputCell + ',O:O,0)),"")'
  );

  // U4: 排名 / 總隊數
  sheet.getRange(4, sectionCStartCol + 1).setFormula(
    '=IFERROR(INDEX(N:N,MATCH(' + inputCell + ',O:O,0))&" / "&COUNTA(N2:N),"")'
  );

  // U5: 比賽場數
  sheet.getRange(5, sectionCStartCol + 1).setFormula(
    '=IFERROR(INDEX(Q:Q,MATCH(' + inputCell + ',O:O,0)),"")'
  );

  // W8+: 該隊比賽紀錄（紅藍方合併 FILTER）
  // 顯示 matchId / alliance / score / predicted
  sheet.getRange(8, sectionCStartCol + 3).setFormula(
    '=IFERROR({FILTER({A2:A,IF((B2:B=U2)+(C2:C=U2)+(D2:D=U2),"Red",""),H2:H,J2:J},(B2:B=U2)+(C2:C=U2)+(D2:D=U2));' +
    'FILTER({A2:A,IF((E2:E=U2)+(F2:F=U2)+(G2:G=U2),"Blue",""),I2:I,K2:K},(E2:E=U2)+(F2:F=U2)+(G2:G=U2))},"")'
  );
}
