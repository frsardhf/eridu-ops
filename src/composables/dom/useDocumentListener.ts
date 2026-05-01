import { onMounted, onUnmounted } from 'vue';

/**
 * Registers a `document` event listener and removes it on unmount.
 * Use for `pointerdown`, `keydown`, etc. that need document-level scope.
 */
export function useDocumentListener<K extends keyof DocumentEventMap>(
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
): void {
  onMounted(() => {
    document.addEventListener(type, handler);
  });
  onUnmounted(() => {
    document.removeEventListener(type, handler);
  });
}
