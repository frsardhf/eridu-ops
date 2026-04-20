import { ref, nextTick } from 'vue';

/**
 * Position a panel anchored to a trigger element.
 * First call (panelEl = null) gives an approximate position; call again after
 * nextTick with the rendered panelEl to flip if it clips the viewport.
 */
export function positionAtElement(
  triggerEl: HTMLElement,
  panelEl: HTMLElement | null = null,
  offsetY = 6,
): { top: string; left: string } {
  const tr = triggerEl.getBoundingClientRect();
  let x = tr.left;
  let y = tr.bottom + offsetY;

  if (panelEl) {
    const pr = panelEl.getBoundingClientRect();
    // flip right → align right edge of panel with right edge of trigger
    if (x + pr.width > window.innerWidth - 12) {
      x = Math.max(12, tr.right - pr.width);
    }
    // flip up → open above the trigger
    if (y + pr.height > window.innerHeight - 12) {
      y = Math.max(12, tr.top - pr.height - offsetY);
    }
  }

  return { top: `${y}px`, left: `${x}px` };
}

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
