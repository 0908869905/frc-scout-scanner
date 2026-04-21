/**
 * FRC Scout Scanner - TSV Schema 定义
 */

// Match Data TSV Schema (23 栏位) - v1.5.0
// 必须与 Scouting PASS 的 constants.ts 保持一致
// v1.5.0: comments 拆成 robotIssues / performance / comments 三欄
export const TSV_SCHEMA_MATCH = [
  // PreMatch (6)
  'scouterName',
  'eventCode',
  'matchLevel',
  'matchNumber',
  'alliance',           // R1/R2/R3/B1/B2/B3
  'teamNumber',
  // Auto (3)
  'autoClimbStatus',
  'autoClimbTime',
  'autoClimbPosition',  // LeftSide/Left/Center/Right/RightSide
  // Teleop - Bump & Fuel (3)
  'bumpCount',
  'trenchCount',
  'fuelDroppedOnBumpCount',
  // Teleop - Penalty (2) - 計數器
  'minorPenalty',       // number (計數器)
  'majorPenalty',       // number (計數器)
  // Teleop - Climb (3)
  'teleClimbStatus',
  'teleClimbTime',
  'teleClimbPosition',  // LeftSide/Left/Center/Right/RightSide
  // PostMatch (6)
  'robotDied',
  'almostTipped',
  'ridingOnBall',
  'robotIssues',        // 機器異常（PostMatch checklist 序列化）
  'performance',        // 機器表現（flags + collision + ratings 序列化）
  'comments',           // 自由輸入備註
] as const;

// Path Data TSV Schema (5 栏位) - Scouting PASS
export const TSV_SCHEMA_PATH = [
  'eventCode',
  'matchNumber',
  'teamNumber',
  'alliance',
  'autoPath',
] as const;

// Pit Collect Path TSV Schema (4 栏位) - FRC6998 Pit Collect 路径 QR
// eventCode 固定 "2026PIT"，matchNumber 固定 "0"
export const TSV_SCHEMA_PIT_PATH = [
  'eventCode',
  'matchNumber',
  'teamNumber',
  'autoPath',
] as const;

// Pit Scouting TSV Schema (13 栏位) - Scouting PASS
export const TSV_SCHEMA_PIT = [
  'scouterName',
  'eventCode',
  'teamNumber',
  'pitDriveTrain',
  'pitMotorType',
  'pitLength',
  'pitWidth',
  'pitWeight',
  'pitCanFuel',
  'pitCanTowerL1',
  'pitCanTowerL2',
  'pitCanTowerL3',
  'pitAutoNotes',
] as const;

// Pit External TSV Schema (22 栏位) - FRC6998 Pit Collect 舊 v2 (無版本前綴、無 stability)
export const TSV_SCHEMA_PIT_EXTERNAL = [
  'teamNumber',
  'scouterName',
  'chassisType',
  'weight',
  'maxCapacity',
  'intake',
  'visionHardware',
  'visionSoftware',
  'shooting',
  'turret',
  'startLocation',
  'preload',
  'autoIntake',
  'autoHang',
  'autoTotal',
  'crossMidfield',
  'terrain',
  'climbLevel',
  'climbPosition',
  'climbTime',
  'photosTaken',
  'notes',
] as const;

// Pit External TSV Schema Legacy (23 栏位) - FRC6998 Pit Collect v1 (含 stability)
export const TSV_SCHEMA_PIT_EXTERNAL_LEGACY = [
  'teamNumber',
  'scouterName',
  'chassisType',
  'weight',
  'maxCapacity',
  'intake',
  'visionHardware',
  'visionSoftware',
  'shooting',
  'turret',
  'startLocation',
  'preload',
  'autoIntake',
  'autoHang',
  'autoTotal',
  'crossMidfield',
  'terrain',
  'stability',
  'climbLevel',
  'climbPosition',
  'climbTime',
  'photosTaken',
  'notes',
] as const;

// Pit External TSV Schema V2 (23 栏位) - FRC6998 Pit Collect 目前版本
// 第一欄為 'v2' 版本前綴；與 LEGACY 欄位數相同，以 values[0] 開頭字母區分
export const TSV_SCHEMA_PIT_EXTERNAL_V2 = [
  'version',
  'teamNumber',
  'scouterName',
  'chassisType',
  'weight',
  'maxCapacity',
  'intake',
  'visionHardware',
  'visionSoftware',
  'shooting',
  'turret',
  'startLocation',
  'preload',
  'autoIntake',
  'autoHang',
  'autoTotal',
  'crossMidfield',
  'terrain',
  'climbLevel',
  'climbPosition',
  'climbTime',
  'photosTaken',
  'notes',
] as const;

// 导出所有 schema 长度用于类型判断
export const SCHEMA_LENGTHS = {
  match: TSV_SCHEMA_MATCH.length,      // 21
  path: TSV_SCHEMA_PATH.length,        // 5
  pitPath: TSV_SCHEMA_PIT_PATH.length, // 4
  pit: TSV_SCHEMA_PIT.length,          // 13
  pitExternal: TSV_SCHEMA_PIT_EXTERNAL.length,          // 22 (舊 v2 無版本)
  pitExternalLegacy: TSV_SCHEMA_PIT_EXTERNAL_LEGACY.length, // 23 (v1 含 stability)
  pitExternalV2: TSV_SCHEMA_PIT_EXTERNAL_V2.length,     // 23 (新 v2 含 version 前綴)
} as const;

// 栏位显示名称（中文）- v1.3.0 更新
export const FIELD_LABELS: Record<string, string> = {
  // Match Data (v1.3.0) - 20 欄位
  scouterName: '记录员',
  eventCode: '赛事代码',
  matchLevel: '比赛等级',
  matchNumber: '比赛编号',
  alliance: '联盟位置',        // R1/R2/R3/B1/B2/B3
  teamNumber: '队伍编号',
  autoClimbStatus: '自动爬升状态',
  autoClimbTime: '自动爬升时间',
  autoClimbPosition: '自动爬升位置',  // LeftSide/Left/Center/Right/RightSide
  bumpCount: 'Bump 跨越次数',
  trenchCount: 'Trench 跨越次数',
  fuelDroppedOnBumpCount: '掉落次数',
  minorPenalty: '轻微犯规',    // 计数器
  majorPenalty: '重大犯规',    // 计数器
  teleClimbStatus: '手动爬升状态',
  teleClimbTime: '手动爬升时间',
  teleClimbPosition: '手动爬升位置',  // LeftSide/Left/Center/Right/RightSide
  robotDied: '机器人故障',
  almostTipped: '差点翻倒',
  ridingOnBall: '骑 Fuel',
  robotIssues: '机器异常',
  performance: '机器表现',
  comments: '备注',

  // Path Data
  autoPath: '自动路径',

  // Pit Data (你的 Scouting PASS)
  pitDriveTrain: '驱动系统',
  pitMotorType: '马达类型',
  pitLength: '长度',
  pitWidth: '宽度',
  pitWeight: '重量',
  pitCanFuel: '可处理燃料',
  pitCanTowerL1: '可爬 L1',
  pitCanTowerL2: '可爬 L2',
  pitCanTowerL3: '可爬 L3',
  pitAutoNotes: '自动备注',

  // Pit External Data (外部 Pit Collect)
  chassisType: '底盘类型',
  weight: '重量',
  maxCapacity: '最大容量',
  intake: '进料机构',
  visionHardware: '视觉硬体',
  visionSoftware: '视觉软体',
  shooting: '射击能力',
  turret: '炮塔功能',
  startLocation: '起始位置',
  preload: '预载数量',
  autoIntake: '自动进料',
  autoHang: '自动悬挂',
  autoTotal: '自动总数',
  crossMidfield: '跨越中场',
  terrain: '地形类型',
  stability: '稳定性',
  climbLevel: '爬升等级',
  climbPosition: '爬升位置',
  climbTime: '爬升时间',
  photosTaken: '已拍照',
  notes: '备注',
};
