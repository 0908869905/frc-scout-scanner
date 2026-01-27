/**
 * FRC Scout Scanner - TSV Schema 定义
 */

// Match Data TSV Schema (25 栏位)
export const TSV_SCHEMA_MATCH = [
  'scouterName',
  'eventCode',
  'matchLevel',
  'matchNumber',
  'alliance',
  'teamNumber',
  'autoFuel',
  'autoClimbStatus',
  'autoClimbTime',
  'teleFuel',
  'teleClimbStatus',
  'teleClimbTime',
  'bumpTrenchCount',
  'fuelDroppedOnBump',
  'penaltyCount',
  'yellowCard',
  'redCard',
  'robotDied',
  'almostTipped',
  'ridingOnBall',
  'defenseRating',
  'driverSkill',
  'speedRating',
  'comments',
  'subjectiveNotes',
] as const;

// Path Data TSV Schema (4 栏位)
export const TSV_SCHEMA_PATH = [
  'eventCode',
  'matchNumber',
  'teamNumber',
  'autoPath',
] as const;

// Pit Scouting TSV Schema (13 栏位)
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

// 栏位显示名称（中文）
export const FIELD_LABELS: Record<string, string> = {
  // Match Data
  scouterName: '记录员',
  eventCode: '赛事代码',
  matchLevel: '比赛等级',
  matchNumber: '比赛编号',
  alliance: '联盟',
  teamNumber: '队伍编号',
  autoFuel: '自动燃料',
  autoClimbStatus: '自动爬升',
  autoClimbTime: '自动爬升时间',
  teleFuel: '遥控燃料',
  teleClimbStatus: '遥控爬升',
  teleClimbTime: '遥控爬升时间',
  bumpTrenchCount: '撞沟次数',
  fuelDroppedOnBump: '撞击掉落',
  penaltyCount: '罚球次数',
  yellowCard: '黄牌',
  redCard: '红牌',
  robotDied: '机器人故障',
  almostTipped: '差点翻倒',
  ridingOnBall: '骑球',
  defenseRating: '防守评分',
  driverSkill: '驾驶技术',
  speedRating: '速度评分',
  comments: '评论',
  subjectiveNotes: '备注',

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
