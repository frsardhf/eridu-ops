import type { EquipmentType } from '@/types/gear';
import { formatLargeNumber, isExpReport, isExpBall } from './materialUtils';

/**
 * Returns the CSS grid-template-columns repeat count for a tooltip student/item grid.
 * Scales column count progressively based on the number of items.
 */
export function getTooltipGridColumns(count: number): string {
  if (count <= 3) return count.toString();
  if (count <= 8) return Math.min(4, count).toString();
  if (count <= 16) return Math.min(8, count).toString();
  return Math.min(10, count).toString();
}

/**
 * Formats a per-student usage quantity for display inside a resource tooltip.
 * EXP reports and EXP balls show raw numbers; everything else uses the abbreviated format.
 */
export function formatUsageQuantity(
  quantity: number,
  materialId?: number | null,
  equipmentTypes?: EquipmentType[]
): string {
  if (materialId && (isExpReport(materialId) || isExpBall(materialId))) {
    return quantity.toString();
  }
  return formatLargeNumber(quantity);
}
