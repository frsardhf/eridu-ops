import { ref, nextTick } from 'vue';

export function positionAtCursor(
  event: MouseEvent,
  element: HTMLElement | null = null,
  offsetX = 20,
  offsetY = 20
): { top: string; left: string } {
  let x = event.clientX + offsetX;
  let y = event.clientY + offsetY;

  if (element) {
    const rect = element.getBoundingClientRect();
    if (rect.right  > window.innerWidth  - 20) x = Math.max(20, event.clientX - rect.width  - offsetX);
    if (rect.bottom > window.innerHeight - 20) y = Math.max(20, event.clientY - rect.height - offsetY);
  }

  return { top: `${y}px`, left: `${x}px` };
}

export function useTooltip<T>() {
  const activeTooltip = ref<T | null>(null);
  const tooltipStyle = ref({ top: '0px', left: '0px' });
  const tooltipRef = ref<HTMLElement | null>(null);

  const showTooltip = async (event: MouseEvent, identifier: T) => {
    tooltipStyle.value = positionAtCursor(event);
    activeTooltip.value = identifier as any;

    await nextTick();
    tooltipStyle.value = positionAtCursor(event, tooltipRef.value);
  };

  const hideTooltip = () => {
    activeTooltip.value = null;
  };

  return { activeTooltip, tooltipStyle, tooltipRef, showTooltip, hideTooltip };
}
