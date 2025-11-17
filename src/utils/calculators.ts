import type { ResourceEntry } from "./types";
/**
 * 时间范围接口
 */
export interface TimeRange {
  min: number;
  max: number;
}

/**
 * 计算资源的时间范围
 * @param resources 资源列表
 * @returns 时间范围对象
 */
export function calculateResourceTimeRange(
  resources: ResourceEntry[]
): TimeRange {
  if (!resources || resources.length === 0) {
    return { min: 0, max: 0 };
  }

  let minStart = Infinity;
  let maxEnd = 0;

  for (const resource of resources) {
    const start = resource.startTime;
    const end = resource.startTime + resource.duration;
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }

  return { min: minStart, max: maxEnd };
}

/**
 * 计算百分比
 * @param value 当前值
 * @param total 总值
 * @returns 百分比(0-100)
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * 计算背景位置和大小
 * @param startPercentage 开始位置百分比
 * @param percentage 持续时间百分比
 * @param containerWidth 容器宽度
 * @returns 背景样式对象
 */
export function calculateBackgroundStyle(
  startPercentage: number,
  percentage: number,
  containerWidth: number
): { width: number; position: number } {
  const width = Math.max(1, (percentage / 100) * containerWidth);
  const position = (startPercentage / 100) * containerWidth;

  return {
    width,
    position: Math.min(position, containerWidth - 1),
  };
}
