import { ref } from 'vue';

/**
 * Generic drag-and-drop reorder composable.
 *
 * @param onReorder - Called with (from, to) when a valid drop occurs.
 * @param canDrop   - Optional guard; drop is allowed only when this returns true.
 *                   Also gates `isDropTarget` so invalid targets don't highlight.
 */
export function useDragReorder<K = number>(
  onReorder: (from: K, to: K) => void,
  canDrop?: (from: K, to: K) => boolean,
) {
  const dragFrom = ref<K | null>(null);
  const dragOver = ref<K | null>(null);
  const rejectedKey = ref<K | null>(null);

  function onDragStart(key: K, event: DragEvent) {
    dragFrom.value = key;
    event.dataTransfer!.effectAllowed = 'move';
  }

  function onDragOver(key: K, event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    dragOver.value = key;
  }

  function onDragLeave(key: K) {
    if (dragOver.value === key) dragOver.value = null;
  }

  function onDrop(key: K) {
    const from = dragFrom.value;
    if (from !== null && from !== key) {
      if (!canDrop || canDrop(from, key)) {
        onReorder(from, key);
      } else {
        rejectedKey.value = key;
        setTimeout(() => { rejectedKey.value = null; }, 400);
      }
    }
    dragFrom.value = null;
    dragOver.value = null;
  }

  function onDragEnd() {
    dragFrom.value = null;
    dragOver.value = null;
  }

  function isDragging(key: K): boolean {
    return dragFrom.value === key;
  }

  function isDropTarget(key: K): boolean {
    if (dragOver.value !== key || dragFrom.value === null || dragFrom.value === key) return false;
    return !canDrop || canDrop(dragFrom.value, key);
  }

  function isRejected(key: K): boolean {
    return rejectedKey.value === key;
  }

  return { onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, isDragging, isDropTarget, isRejected };
}
