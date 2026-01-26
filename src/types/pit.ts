/**
 * FRC Scout Scanner - Pit Scouting 类型定义
 */

// Pit Scouting 类型 (13 栏位)
export interface PitData {
  // === 基本资讯 ===
  scouterName: string;        // 记录员姓名
  eventCode: string;          // 赛事代码
  teamNumber: string;         // 队伍编号

  // === 机器人规格 ===
  pitDriveTrain: string;      // 驱动系统类型
  pitMotorType: string;       // 马达类型
  pitLength: number;          // 机器人长度
  pitWidth: number;           // 机器人宽度
  pitWeight: number;          // 机器人重量

  // === 能力 ===
  pitCanFuel: boolean;        // 可以处理燃料
  pitCanTowerL1: boolean;     // 可以爬 Level 1
  pitCanTowerL2: boolean;     // 可以爬 Level 2
  pitCanTowerL3: boolean;     // 可以爬 Level 3

  // === 备注 ===
  pitAutoNotes: string;       // 自动阶段备注

  // === 额外栏位（Scanner 添加）===
  scanTime?: string;          // 扫描时间 (ISO 8601)
  uploadTime?: string;        // 上传时间 (ISO 8601)
  scannerDevice?: string;     // 扫描装置资讯
}
