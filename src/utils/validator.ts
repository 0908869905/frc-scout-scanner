/**
 * FRC Scout Scanner - 资料验证工具
 */

import { VALIDATION_RULES, ValidationRule } from '../constants/validation';
import type { QRType, ValidationResult, ValidationError } from '../types';
import { parseNumber } from './decoder';

/**
 * 验证单一栏位
 */
function validateField(
  field: string,
  value: string,
  rule: ValidationRule
): ValidationError | null {
  // 必填验证
  if (rule.required && (!value || value === 'None')) {
    return {
      field,
      value,
      message: rule.message,
      severity: 'error',
    };
  }

  // 空值跳过后续验证
  if (!value || value === 'None') {
    return null;
  }

  switch (rule.type) {
    case 'number': {
      const num = parseNumber(value);
      if (isNaN(parseFloat(value))) {
        return {
          field,
          value,
          message: `${field} 必须是数字`,
          severity: 'error',
        };
      }
      if (rule.min !== undefined && num < rule.min) {
        return {
          field,
          value,
          message: rule.message,
          severity: 'warning',
        };
      }
      if (rule.max !== undefined && num > rule.max) {
        return {
          field,
          value,
          message: rule.message,
          severity: 'warning',
        };
      }
      break;
    }

    case 'numeric-string': {
      if (!/^\d+$/.test(value)) {
        return {
          field,
          value,
          message: rule.message,
          severity: 'error',
        };
      }
      break;
    }

    case 'enum': {
      if (rule.values && !rule.values.includes(value)) {
        return {
          field,
          value,
          message: rule.message,
          severity: 'warning',
        };
      }
      break;
    }

    case 'string': {
      // 字串验证（仅检查必填，已在上面处理）
      break;
    }

    case 'boolean': {
      if (value !== '0' && value !== '1' && value !== 'true' && value !== 'false') {
        return {
          field,
          value,
          message: `${field} 必须是布林值`,
          severity: 'warning',
        };
      }
      break;
    }
  }

  return null;
}

/**
 * 验证资料
 */
export function validateData(
  type: QRType,
  data: Record<string, string>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 遍历所有栏位进行验证
  for (const [field, value] of Object.entries(data)) {
    const rule = VALIDATION_RULES[field];
    if (!rule) continue;

    const error = validateField(field, value, rule);
    if (error) {
      if (error.severity === 'error') {
        errors.push(error);
      } else {
        warnings.push(error);
      }
    }
  }

  // 根据类型进行额外验证
  switch (type) {
    case 'match':
      // 确保关键栏位存在
      if (!data.eventCode) {
        errors.push({
          field: 'eventCode',
          value: data.eventCode,
          message: '赛事代码不能为空',
          severity: 'error',
        });
      }
      if (!data.matchNumber) {
        errors.push({
          field: 'matchNumber',
          value: data.matchNumber,
          message: '比赛编号不能为空',
          severity: 'error',
        });
      }
      if (!data.teamNumber) {
        errors.push({
          field: 'teamNumber',
          value: data.teamNumber,
          message: '队伍编号不能为空',
          severity: 'error',
        });
      }
      break;

    case 'path':
      if (!data.eventCode || !data.matchNumber || !data.teamNumber) {
        errors.push({
          field: 'matchKey',
          value: `${data.eventCode}_${data.matchNumber}_${data.teamNumber}`,
          message: '路径资料缺少配对资讯',
          severity: 'error',
        });
      }
      break;

    case 'pit-path':
      if (!data.teamNumber || !data.autoPath) {
        errors.push({
          field: 'pitPathKey',
          value: `${data.teamNumber}`,
          message: 'Pit 路径资料缺少队伍编号或路径',
          severity: 'error',
        });
      }
      break;

    case 'pit':
      if (!data.eventCode || !data.teamNumber) {
        errors.push({
          field: 'pitKey',
          value: `${data.eventCode}_${data.teamNumber}`,
          message: 'Pit 资料缺少识别资讯',
          severity: 'error',
        });
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 获取验证状态文字
 */
export function getValidationStatusText(result: ValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return '验证通过';
  }
  if (result.isValid && result.warnings.length > 0) {
    return `有 ${result.warnings.length} 个警告`;
  }
  return `有 ${result.errors.length} 个错误`;
}
