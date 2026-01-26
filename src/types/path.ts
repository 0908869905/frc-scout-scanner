/**
 * FRC Scout Scanner - Path Data 类型定义
 */

import type { PathPoint } from './common';

// Path Data 类型 (4 栏位)
export interface PathData {
  // === 配对资讯 ===
  eventCode: string;          // 赛事代码
  matchNumber: number;        // 比赛编号
  teamNumber: string;         // 队伍编号

  // === 路径资料 ===
  autoPath: string;           // 路径坐标字串

  // === 额外栏位（Scanner 添加）===
  scanTime?: string;          // 扫描时间 (ISO 8601)
  uploadTime?: string;        // 上传时间 (ISO 8601)
  scannerDevice?: string;     // 扫描装置资讯
}

// 解析后的路径资料
export interface ParsedPathData extends Omit<PathData, 'autoPath'> {
  autoPath: string;
  pathPoints: PathPoint[];
}
