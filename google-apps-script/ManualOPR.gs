/**
 * Manual OPR - 手動輸入 OPR 分析
 *
 * 建立「Manual OPR」分頁，使用者手動填入比賽隊伍和分數，
 * 從試算表選單「OPR Tools → Calculate Manual OPR」一鍵計算。
 *
 * 佈局與 OPR Analysis 完全相同（三區塊：比賽表 / 排名 / 隊伍查詢）。
 * 矩陣運算函數（matTranspose, matMultiply, matInverse, solveOPR）
 * 直接呼叫 Code.gs 中已有的函數。
 *
 * 使用方式：
 * 1. 執行 buildManualOPRSheet()（或從選單「OPR Tools → Build Manual OPR Sheet」）
 * 2. 在「Manual OPR」分頁手動填入比賽資料（A-I 欄）
 * 3. 從選單「OPR Tools → Calculate Manual OPR」計算 OPR
 * 4. 加入新資料後，再點一次 Calculate 即可重新計算
 */

var MANUAL_OPR_SHEET_NAME = 'Manual OPR';

// ============================================================
// onOpen - 自訂選單（開啟試算表時自動建立）
// ============================================================

/**
 * 試算表開啟時建立「OPR Tools」選單，讓使用者直接從選單執行。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OPR Tools')
    .addItem('Calculate Manual OPR', 'calculateManualOPR')
    .addItem('Build Manual OPR Sheet', 'buildManualOPRSheet')
    .addToUi();
}

// ============================================================
// buildManualOPRSheet - 建立手動 OPR 工作表
// ============================================================

/**
 * 建立「Manual OPR」工作表，三區塊佈局，Section A 留空給使用者手動填入。
 *
 * Section A（A-L）：比賽得分表（手動填入 matchId, 隊伍, 分數）
 * Section B（N-R）：OPR 排名（calculateManualOPR 填入）
 * Section C（T-Z）：隊伍查詢（自動公式）
 */
function buildManualOPRSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MANUAL_OPR_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(MANUAL_OPR_SHEET_NAME);
  }

  // --- Section A 標頭（欄 A-L）---
  sheet.getRange(1, 1, 1, OPR_HEADERS_A.length).setValues([OPR_HEADERS_A]);
  sheet.getRange(1, 1, 1, OPR_HEADERS_A.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');

  // --- Section B 標頭（欄 N-R）---
  var sectionBStartCol = 14;
  sheet.getRange(1, sectionBStartCol, 1, OPR_HEADERS_B.length).setValues([OPR_HEADERS_B]);
  sheet.getRange(1, sectionBStartCol, 1, OPR_HEADERS_B.length)
    .setFontWeight('bold')
    .setBackground('#0f9d58')
    .setFontColor('#ffffff');

  // --- Section C（欄 T-Z）---
  var sectionCStartCol = 20;

  // T1: 區塊標題
  sheet.getRange(1, sectionCStartCol).setValue('Team Lookup');
  sheet.getRange(1, sectionCStartCol)
    .setFontWeight('bold')
    .setBackground('#f4b400')
    .setFontColor('#ffffff');

  // T2: 標籤 + U2: 輸入格
  sheet.getRange(2, sectionCStartCol).setValue('隊伍代號:');
  sheet.getRange(2, sectionCStartCol).setFontWeight('bold');
  sheet.getRange(2, sectionCStartCol + 1)
    .setBackground('#fff2cc')
    .setBorder(true, true, true, true, false, false)
    .setFontWeight('bold');

  // T3-T5: 標籤
  sheet.getRange(3, sectionCStartCol).setValue('OPR:');
  sheet.getRange(3, sectionCStartCol).setFontWeight('bold');
  sheet.getRange(4, sectionCStartCol).setValue('排名:');
  sheet.getRange(4, sectionCStartCol).setFontWeight('bold');
  sheet.getRange(5, sectionCStartCol).setValue('比賽場數:');
  sheet.getRange(5, sectionCStartCol).setFontWeight('bold');

  // 比賽紀錄標頭（W7:Z7）
  var matchRecordHeaders = ['matchId', 'alliance', 'score', 'predicted'];
  sheet.getRange(7, sectionCStartCol + 3, 1, 4).setValues([matchRecordHeaders]);
  sheet.getRange(7, sectionCStartCol + 3, 1, 4)
    .setFontWeight('bold')
    .setBackground('#e8eaf6');

  sheet.setFrozenRows(1);

  // 設定查詢公式（呼叫 Code.gs 的共用函數）
  setupOPRLookupFormulas(sheet);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Fill in matchId (A), teams (B-G), scores (H-I), then use OPR Tools → Calculate Manual OPR',
    'Manual OPR Sheet Ready', 10
  );
}

// ============================================================
// calculateManualOPR - 計算手動輸入的 OPR
// ============================================================

/**
 * 從「Manual OPR」的 Section A 讀取手動填入的比賽資料，
 * 計算 OPR 並寫入 Section B 排名 + Section A 預測分數。
 */
function calculateManualOPR() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sheet = ss.getSheetByName(MANUAL_OPR_SHEET_NAME);
  if (!sheet) {
    ui.alert('Manual OPR', 'Sheet not found!\nRun "OPR Tools → Build Manual OPR Sheet" first.', ui.ButtonSet.OK);
    return;
  }

  ss.toast('Calculating...', 'Manual OPR', 30);

  // 1. 讀取 Section A 資料
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('Manual OPR', 'No data found.\nFill in match data (A-I columns) first.', ui.ButtonSet.OK);
    return;
  }

  var dataRange = sheet.getRange(2, 1, lastRow - 1, OPR_HEADERS_A.length).getValues();

  // 2. 收集隊伍 + 篩選有分數的比賽
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
    ui.alert('Manual OPR', 'No scored matches found.\nFill in redScore (H) and blueScore (I) columns.', ui.ButtonSet.OK);
    return;
  }

  // 3. 建立隊伍索引（按隊號升序）
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

  // 5. 求解 OPR（呼叫 Code.gs 的 solveOPR）
  var oprValues = solveOPR(A, b);
  if (!oprValues) {
    ui.alert('Manual OPR', 'Matrix is singular — cannot compute OPR.\nNeed more scored matches with diverse team combinations.', ui.ButtonSet.OK);
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

  // 清除舊排名資料
  var sectionBStartCol = 14;
  var oldRankRows = sheet.getLastRow() - 1;
  if (oldRankRows > 0) {
    sheet.getRange(2, sectionBStartCol, oldRankRows, OPR_HEADERS_B.length).clearContent();
  }

  if (rankRows.length > 0) {
    sheet.getRange(2, sectionBStartCol, rankRows.length, OPR_HEADERS_B.length).setValues(rankRows);
  }

  // 7. 寫入預測分數（Section A 的 J、K 欄）
  var predictedCol = OPR_HEADERS_A.indexOf('redPredicted') + 1;
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

  // 8. 更新查詢公式（呼叫 Code.gs 的共用函數）
  setupOPRLookupFormulas(sheet);

  // 9. 顯示結果摘要
  var summary = 'Matches: ' + scoredMatches.length + ' | Teams: ' + oprData.length;
  if (oprData.length > 0) {
    summary += '\n\nTop 3:';
    for (var top = 0; top < Math.min(3, oprData.length); top++) {
      summary += '\n  #' + (top + 1) + ' Team ' + oprData[top].team + ' — OPR: ' + oprData[top].opr;
    }
  }
  ss.toast(summary, 'OPR Calculation Complete', 10);
}

// Section C 查詢公式直接呼叫 Code.gs 的 setupOPRLookupFormulas(sheet)
