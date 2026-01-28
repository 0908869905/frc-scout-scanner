/**
 * FRC Scout Scanner - TSV Schema 定义
 */

// Match Data TSV Schema (24 栏位) - v1.1.0
export const TSV_SCHEMA_MATCH = [
  'scouterName',
  'eventCode',
  'matchLevel',
  'matchNumber',
  'alliance',           // R1/R2/R3/B1/B2/B3
  'teamNumber',
  'autoClimbStatus',
  'autoClimbTime',
  'autoClimbSide',      // None/Left/Center/Right
  'teleClimbStatus',
  'teleClimbTime',
  'teleClimbSide',      // None/Left/Center/Right
  'bumpTrenchCount',
  'fuelDroppedOnBumpCount',
  'penaltyCount',
  'minorPenalty',       // 原 yellowCard
  'majorPenalty',       // 原 redCard
  'robotDied',
  'almostTipped',
  'ridingOnBall',
  'defenseRating',
  'driverSkill',
  'speedRating',
  'comments',
] as const;

// Path Data TSV Schema (4 栏位)
export const TSV_SCHEMA_PATH = [
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

// Pit External TSV Schema (23 栏位) - FRC6998 Pit Collect
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
  'stability',
  'climbLevel',
  'climbPosition',
  'climbTime',
  'photosTaken',
  'notes',
] as const;

// 导出所有 schema 长度用于类型判断
export const SCHEMA_LENGTHS = {
  match: TSV_SCHEMA_MATCH.length,      // 24
  path: TSV_SCHEMA_PATH.length,        // 4
  pit: TSV_SCHEMA_PIT.length,          // 13
  pitExternal: TSV_SCHEMA_PIT_EXTERNAL.length, // 23
} as const;

// 栏位显示名称（中文）- v1.1.0 更新
export const FIELD_LABELS: Record<string, string> = {
  // Match Data (v1.1.0)
  scouterName: '记录员',
  eventCode: '赛事代码',
  matchLevel: '比赛等级',
  matchNumber: '比赛编号',
  alliance: '联盟位置',        // R1/R2/R3/B1/B2/B3
  teamNumber: '队伍编号',
  autoClimbStatus: '自动爬升状态',
  autoClimbTime: '自动爬升时间',
  autoClimbSide: '自动爬升侧',  // 新增
  teleClimbStatus: '手动爬升状态',
  teleClimbTime: '手动爬升时间',
  teleClimbSide: '手动爬升侧',  // 新增
  bumpTrenchCount: '跨越次数',
  fuelDroppedOnBumpCount: '掉落次数',  // 改名
  penaltyCount: '犯规次数',
  minorPenalty: '轻微犯规',    // 原 yellowCard
  majorPenalty: '重大犯规',    // 原 redCard
  robotDied: '机器人故障',
  almostTipped: '差点翻倒',
  ridingOnBall: '骑球',
  defenseRating: '防守评分',
  driverSkill: '驾驶技术',
  speedRating: '速度评分',
  comments: '评论',

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
