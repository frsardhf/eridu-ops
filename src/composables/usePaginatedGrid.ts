import { ref, computed, nextTick, watch, type ComputedRef, type ComponentPublicInstance } from 'vue';

export function usePaginatedGrid<T>(pages: ComputedRef<T[][]>) {
  const currentPage = ref(0);
  const disableTransition = ref(false);
  const pageRefs = ref<Array<HTMLElement | null>>([]);

  const totalPages = computed(() => pages.value.length);

  const sliderStyle = computed(() => ({
    transform: `translate3d(${-currentPage.value * 100}%, 0, 0)`,
    transition: disableTransition.value ? 'none' : 'transform 0.3s ease'
  }));

  watch(totalPages, (nextTotal) => {
    if (nextTotal === 0) {
      currentPage.value = 0;
      return;
    }
    if (currentPage.value > nextTotal - 1) {
      currentPage.value = nextTotal - 1;
    }
  });

  function setPageRef(el: Element | ComponentPublicInstance | null, pageIndex: number) {
    const resolved =
      el instanceof Element
        ? (el as HTMLElement)
        : ((el as ComponentPublicInstance | null)?.$el as HTMLElement | undefined);
    pageRefs.value[pageIndex] = resolved ?? null;
  }

  function focusPageBoundaryInput(pageIndex: number, target: 'first' | 'last') {
    const pageElement = pageRefs.value[pageIndex];
    if (!pageElement) return;

    const inputs = pageElement.querySelectorAll<HTMLInputElement>('input.resource-input');
    if (inputs.length === 0) return;

    const targetInput = target === 'first' ? inputs[0] : inputs[inputs.length - 1];
    targetInput.focus();
  }

  async function goToPage(pageIndex: number, focusTarget?: 'first' | 'last', instant = false) {
    const maxPage = Math.max(0, totalPages.value - 1);
    const safePage = Math.min(Math.max(pageIndex, 0), maxPage);

    disableTransition.value = instant;
    currentPage.value = safePage;

    await nextTick();

    if (focusTarget) {
      focusPageBoundaryInput(safePage, focusTarget);
    }

    if (instant) {
      requestAnimationFrame(() => {
        disableTransition.value = false;
      });
    }
  }

  function handleBoundaryTab(event: KeyboardEvent, pageIndex: number, itemIndex: number, pageLength: number) {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    if (pageIndex !== currentPage.value) return;

    if (!event.shiftKey && itemIndex === pageLength - 1 && pageIndex < totalPages.value - 1) {
      event.preventDefault();
      void goToPage(pageIndex + 1, 'first', true);
    }

    if (event.shiftKey && itemIndex === 0 && pageIndex > 0) {
      event.preventDefault();
      void goToPage(pageIndex - 1, 'last', true);
    }
  }

  return { currentPage, totalPages, sliderStyle, setPageRef, focusPageBoundaryInput, goToPage, handleBoundaryTab };
}
