import { ref } from 'vue';
import { calculateTooltipPosition } from '@/consumables/utils/upgradeUtils';

export function useTooltip<T>(tooltipWidth = 250, tooltipHeight = 100) {
  const activeTooltip = ref<T | null>(null);
  const tooltipStyle = ref({ top: '0px', left: '0px' });

  const showTooltip = (event: MouseEvent, identifier: T) => {
    tooltipStyle.value = calculateTooltipPosition(event, tooltipWidth, tooltipHeight);
    activeTooltip.value = identifier as any;
  };

  const hideTooltip = () => {
    activeTooltip.value = null;
  };

  return { activeTooltip, tooltipStyle, showTooltip, hideTooltip };
}
