<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps
}>();

const backgroundLoadFailed = ref(false);
const imageLoading = ref(true);
const portraitLoaded = ref(false);
const backgroundLoaded = ref(false);

const portraitSrc = computed(() =>
  `https://schaledb.com/images/student/portrait/${props.student.Id}.webp`
);

const backgroundSrc = computed(() => {
  const collectionBg = props.student.CollectionBG;
  if (!collectionBg || backgroundLoadFailed.value) return '';
  return `https://schaledb.com/images/background/${collectionBg}.jpg`;
});

let shimmerTimer: ReturnType<typeof setTimeout> | null = null;

// Reset loading state when student changes; delay shimmer so cache hits never flash it
watch(() => props.student.Id, () => {
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
    if (shimmerTimer) {
      clearTimeout(shimmerTimer);
      shimmerTimer = null;
    }
    imageLoading.value = false;
  }
}

function handlePortraitLoad() {
  portraitLoaded.value = true;
  checkAllLoaded();
}

function handlePortraitError() {
  portraitLoaded.value = true;
  checkAllLoaded();
}

function handleBackgroundLoad() {
  backgroundLoaded.value = true;
  checkAllLoaded();
}

function handleBackgroundError() {
  backgroundLoadFailed.value = true;
  backgroundLoaded.value = true;
  checkAllLoaded();
}
</script>

<template>
  <div class="student-section">
    <div v-if="backgroundSrc" class="hero-background">
      <img
        :src="backgroundSrc"
        alt=""
        aria-hidden="true"
        class="hero-background-image"
        @load="handleBackgroundLoad"
        @error="handleBackgroundError"
      />
    </div>
    <div v-else class="hero-background-fallback" aria-hidden="true"></div>

    <div class="hero-foreground">
      <img
        :src="portraitSrc"
        :alt="student.Name"
        class="student-image"
        @load="handlePortraitLoad"
        @error="handlePortraitError"
      />
    </div>

    <div v-if="imageLoading" class="hero-loading-overlay" aria-hidden="true">
      <div class="hero-shimmer"></div>
    </div>
  </div>
</template>

<style scoped>
.student-section {
  position: relative;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  background: var(--card-background);
  height: var(--student-modal-hero-height, clamp(460px, 72vh, 820px));
  min-height: 320px;
  isolation: isolate;
}

.hero-background,
.hero-background-fallback {
  position: absolute;
  inset: 0;
}

.hero-background {
  overflow: hidden;
}

.hero-background-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(2px) saturate(1.08);
  transform: scale(1.12);
}

.hero-background::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 14, 28, 0.2) 0%,
    rgba(10, 14, 28, 0.28) 58%,
    rgba(10, 14, 28, 0.4) 100%
  );
}

.hero-background-fallback {
  background: linear-gradient(140deg, var(--header-gradient-start), var(--header-gradient-end));
}

.hero-foreground {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 10px 8px;
  box-sizing: border-box;
}

.student-image {
  width: auto;
  height: 100%;
  max-width: 100%;
  object-fit: cover;
  object-position: center bottom;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
}

.hero-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: var(--card-background);
  overflow: hidden;
}

.hero-shimmer {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--text-primary) 6%, transparent) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
