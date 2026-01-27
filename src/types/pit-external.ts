/**
 * FRC Scout Scanner - 外部 Pit Scouting 類型定義
 * 來源：minesoil/FRC6998_Pit_Collect_2026
 * 格式：JSON (LZ-String Base64 壓縮)
 */

// 外部 Pit Scouting 原始 JSON 格式（縮寫 key）
export interface PitExternalRaw {
  t: number;              // Team Number
  sc: string;             // Scouter Name
  dt: string;             // Chassis/Drive Type
  wt: number;             // Weight (lbs)
  mx: number;             // Max Fuel Capacity
  in: string;             // Intake Mechanism (多選用 " + " 連接)
  visH: string;           // Vision Hardware
  visS: string;           // Vision Software
  sht: string;            // Shooting Capability
  tur: string;            // Turret Feature
  stL: string;            // Starting Location
  pre: number;            // Preload Count
  auInt: 0 | 1;           // Auto Intake
  auHng: 0 | 1;           // Auto Hang
  at: number;             // Auto Total Pieces
  mid: 0 | 1;             // Cross Midfield
  ter: string;            // Terrain Type
  stb: number;            // Stability Rating (1-5)
  cLv: string;            // Climb Level
  cPs: string;            // Climb Position
  cTm: number;            // Climb Time (seconds)
  ph: 0 | 1;              // Photos Taken
  nt: string;             // Notes
}

// 外部 Pit Scouting 轉換後格式（完整 key）
export interface PitExternalData {
  // === 基本資訊 ===
  teamNumber: string;
  scouterName: string;

  // === 機器人規格 ===
  chassisType: string;
  weight: number;
  maxCapacity: number;

  // === 機構 ===
  intake: string;
  visionHardware: string;
  visionSoftware: string;
  shooting: string;
  turret: string;

  // === 自動階段 ===
  startLocation: string;
  preload: number;
  autoIntake: boolean;
  autoHang: boolean;
  autoTotal: number;
  crossMidfield: boolean;
  terrain: string;
  stability: number;

  // === 爬升 ===
  climbLevel: string;
  climbPosition: string;
  climbTime: number;

  // === 其他 ===
  photosTaken: boolean;
  notes: string;

  // === Scanner 添加 ===
  scanTime?: string;
  uploadTime?: string;
}

// 外部 Pit JSON 的 Key 映射表（縮寫 → 完整名稱）
export const PIT_EXTERNAL_KEY_MAP: Record<keyof PitExternalRaw, keyof PitExternalData> = {
  t: 'teamNumber',
  sc: 'scouterName',
  dt: 'chassisType',
  wt: 'weight',
  mx: 'maxCapacity',
  in: 'intake',
  visH: 'visionHardware',
  visS: 'visionSoftware',
  sht: 'shooting',
  tur: 'turret',
  stL: 'startLocation',
  pre: 'preload',
  auInt: 'autoIntake',
  auHng: 'autoHang',
  at: 'autoTotal',
  mid: 'crossMidfield',
  ter: 'terrain',
  stb: 'stability',
  cLv: 'climbLevel',
  cPs: 'climbPosition',
  cTm: 'climbTime',
  ph: 'photosTaken',
  nt: 'notes',
};

// 外部 Pit 的所有欄位名稱（用於 schema）
export const PIT_EXTERNAL_SCHEMA = [
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
