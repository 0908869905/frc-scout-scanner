/**
 * FRC Scout Scanner - Match Data 类型定义
 */

import type { MatchLevel, Alliance, ClimbStatus, Rating } from './common';

// Match Data 类型 (25 栏位)
export interface MatchData {
  // === 基本资讯 ===
  scouterName: string;        // 记录员姓名
  eventCode: string;          // 赛事代码，如 "2026MSLR"
  matchLevel: MatchLevel;     // 比赛等级
  matchNumber: number;        // 比赛编号
  alliance: Alliance;         // 联盟
  teamNumber: string;         // 队伍编号

  // === 自动阶段 ===
  autoFuel: number;           // 自动阶段燃料得分
  autoClimbStatus: ClimbStatus; // 自动爬升状态
  autoClimbTime: number;      // 自动爬升时间（秒）

  // === 遥控阶段 ===
  teleFuel: number;           // 遥控阶段燃料得分
  teleClimbStatus: ClimbStatus; // 遥控爬升状态
  teleClimbTime: number;      // 遥控爬升时间（秒）

  // === 比赛事件 ===
  bumpTrenchCount: number;    // 撞击沟槽次数
  fuelDroppedOnBump: boolean; // 撞击时掉落燃料
  penaltyCount: number;       // 罚球次数
  yellowCard: boolean;        // 黄牌
  redCard: boolean;           // 红牌
  robotDied: boolean;         // 机器人故障
  almostTipped: boolean;      // 差点翻倒
  ridingOnBall: boolean;      // 骑在球上

  // === 主观评分 ===
  defenseRating: Rating;      // 防守评分 (0-5)
  driverSkill: Rating;        // 驾驶技术 (0-5)
  speedRating: Rating;        // 速度评分 (0-5)

  // === 备注 ===
  comments: string;           // 评论
  subjectiveNotes: string;    // 主观备注

  // === 额外栏位（Scanner 添加）===
  scanTime?: string;          // 扫描时间 (ISO 8601)
  uploadTime?: string;        // 上传时间 (ISO 8601)
  scannerDevice?: string;     // 扫描装置资讯
}

// 合并后的完整比赛资料（包含路径）
export interface CombinedMatchData extends MatchData {
  autoPath?: string;
}
