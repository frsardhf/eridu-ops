import { onMounted, onUnmounted } from 'vue';

/**
 * Registers a `click` listener on `window` and removes it on unmount.
 *
 * The caller is responsible for deciding what constitutes "outside" —
 * typically by checking `event.target` against a template ref in the handler.
 */
export function useClickOutside(handler: (event: MouseEvent) => void): void {
  onMounted(() => {
    window.addEventListener('click', handler);
  });
  onUnmounted(() => {
    window.removeEventListener('click', handler);
  });
}
