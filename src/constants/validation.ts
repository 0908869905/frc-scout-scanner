/**
 * FRC Scout Scanner - 验证规则定义
 */

export interface ValidationRule {
  type: 'string' | 'number' | 'numeric-string' | 'boolean' | 'enum';
  required?: boolean;
  min?: number;
  max?: number;
  values?: string[];
  message: string;
}

// 验证规则定义
export const VALIDATION_RULES: Record<string, ValidationRule> = {
  // 必填字串
  scouterName: {
    type: 'string',
    required: true,
    message: '记录员姓名不能为空',
  },
  eventCode: {
    type: 'string',
    required: true,
    message: '赛事代码不能为空',
  },
  teamNumber: {
    type: 'numeric-string',
    required: true,
    message: '队伍编号必须是数字',
  },

  // 数字格式验证
  matchNumber: {
    type: 'number',
    min: 1,
    required: true,
    message: '比赛编号必须是正整数',
  },

  // 评分范围验证
  defenseRating: {
    type: 'number',
    min: 0,
    max: 5,
    message: '防守评分必须在 0-5 之间',
  },
  driverSkill: {
    type: 'number',
    min: 0,
    max: 5,
    message: '驾驶技术评分必须在 0-5 之间',
  },
  speedRating: {
    type: 'number',
    min: 0,
    max: 5,
    message: '速度评分必须在 0-5 之间',
  },

  // 列举验证
  matchLevel: {
    type: 'enum',
    values: ['P', 'QM', 'PO', 'X'],
    message: '比赛等级必须是 P/QM/PO/X 其中之一',
  },
  alliance: {
    type: 'enum',
    values: ['Red', 'Blue'],
    message: '联盟必须是 Red 或 Blue',
  },
  autoClimbStatus: {
    type: 'enum',
    values: ['None', 'Level1', 'Level2', 'Level3', 'Failed'],
    message: '爬升状态无效',
  },
  teleClimbStatus: {
    type: 'enum',
    values: ['None', 'Level1', 'Level2', 'Level3', 'Failed'],
    message: '爬升状态无效',
  },

  // 时间验证
  autoClimbTime: {
    type: 'number',
    min: 0,
    message: '爬升时间不能为负数',
  },
  teleClimbTime: {
    type: 'number',
    min: 0,
    message: '爬升时间不能为负数',
  },

  // 计数验证
  penaltyCount: {
    type: 'number',
    min: 0,
    message: '罚球次数不能为负数',
  },
  autoFuel: {
    type: 'number',
    min: 0,
    message: '燃料得分不能为负数',
  },
  teleFuel: {
    type: 'number',
    min: 0,
    message: '燃料得分不能为负数',
  },
  bumpTrenchCount: {
    type: 'number',
    min: 0,
    message: '撞击次数不能为负数',
  },

  // Pit 数据验证
  pitLength: {
    type: 'number',
    min: 0,
    message: '长度不能为负数',
  },
  pitWidth: {
    type: 'number',
    min: 0,
    message: '宽度不能为负数',
  },
  pitWeight: {
    type: 'number',
    min: 0,
    message: '重量不能为负数',
  },
};
