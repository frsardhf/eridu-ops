import { computed, MaybeRefOrGetter, onBeforeUnmount, ref, toValue, watch } from 'vue';
import { StudentProps } from '@/types/student';

/**
 * Encapsulates ModalHeader's image loading state: shimmer timer, portrait/background
 * load tracking, and computed image URLs.
 *
 * - `imageLoading` drives the shimmer overlay — starts true, cleared once both
 *   portrait and background (if any) have loaded or errored.
 * - A short 80ms delay before showing the shimmer avoids a flash when images
 *   are already cached (service-worker cache-first).
 * - Cleans up the pending shimmer timer on unmount.
 */
export function useStudentImages(student: MaybeRefOrGetter<StudentProps>) {
  const backgroundLoadFailed = ref(false);
  const imageLoading = ref(true);
  const portraitLoaded = ref(false);
  const backgroundLoaded = ref(false);
  let shimmerTimer: ReturnType<typeof setTimeout> | null = null;

  const portraitSrc = computed(() =>
    `https://schaledb.com/images/student/portrait/${toValue(student).Id}.webp`
  );

  const backgroundSrc = computed(() => {
    const bg = toValue(student).CollectionBG;
    if (!bg || backgroundLoadFailed.value) return '';
    return `https://schaledb.com/images/background/${bg}.jpg`;
  });

  watch(() => toValue(student).Id, () => {
    portraitLoaded.value = false;
    backgroundLoaded.value = false;
    backgroundLoadFailed.value = false;

    if (shimmerTimer) clearTimeout(shimmerTimer);
    shimmerTimer = setTimeout(() => {
      shimmerTimer = null;
      if (!portraitLoaded.value) imageLoading.value = true;
    }, 80);
  });

  onBeforeUnmount(() => {
    if (shimmerTimer) clearTimeout(shimmerTimer);
  });

  function checkAllLoaded() {
    const bgDone = !backgroundSrc.value || backgroundLoaded.value;
    if (portraitLoaded.value && bgDone) {
      if (shimmerTimer) { clearTimeout(shimmerTimer); shimmerTimer = null; }
      imageLoading.value = false;
    }
  }

  function handlePortraitLoad()    { portraitLoaded.value = true; checkAllLoaded(); }
  function handlePortraitError()   { portraitLoaded.value = true; checkAllLoaded(); }
  function handleBackgroundLoad()  { backgroundLoaded.value = true; checkAllLoaded(); }
  function handleBackgroundError() {
    backgroundLoadFailed.value = true;
    backgroundLoaded.value = true;
    checkAllLoaded();
  }

  return {
    portraitSrc,
    backgroundSrc,
    imageLoading,
    handlePortraitLoad,
    handlePortraitError,
    handleBackgroundLoad,
    handleBackgroundError,
  };
}
