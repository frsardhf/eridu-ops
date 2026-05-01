import { onMounted, onUnmounted } from 'vue';

/**
 * Registers a window `resize` listener and removes it on unmount.
 * Calls `handler` immediately on mount so the initial size is captured.
 */
export function useWindowResize(handler: () => void): void {
  onMounted(() => {
    handler();
    window.addEventListener('resize', handler);
  });
  onUnmounted(() => {
    window.removeEventListener('resize', handler);
  });
}
