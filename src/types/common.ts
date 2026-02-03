/**
 * FRC Scout Scanner - 通用类型定义
 */

// QR 资料类型
// pit = 你的 Scouting PASS (TSV 格式)
// pit-external = 外部 Pit Collect (JSON 格式)
export type QRType = 'match' | 'path' | 'pit-path' | 'pit' | 'pit-external' | 'unknown';

// 比赛等级
export type MatchLevel = 'P' | 'QM' | 'PO' | 'X';

// 联盟
export type Alliance = 'Red' | 'Blue';

// 爬升状态
export type ClimbStatus = 'None' | 'Level1' | 'Level2' | 'Level3' | 'Failed';

// 评分 (0-5)
export type Rating = 0 | 1 | 2 | 3 | 4 | 5;

// 路径坐标点
export interface PathPoint {
  x: number;
  y: number;
}

// 验证错误
export interface ValidationError {
  field: string;
  value: unknown;
  message: string;
  severity: 'error' | 'warning';
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// 解码结果
export interface DecodeResult {
  type: QRType;
  data: Record<string, string>;
  raw: string[];
  timestamp: number;
}

// 上传状态
export interface UploadStatus {
  success: boolean;
  message: string;
  timestamp: number;
}
