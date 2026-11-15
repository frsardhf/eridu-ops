<script setup lang="ts">
import { computed, ref } from 'vue';
import { $t } from '@/locales';
import type { PullRecapPityMark } from '@/types/pullRecap';
import PullRecapPityIcon from './PullRecapPityIcon.vue';

const props = defineProps<{
  name: string;
  portrait: string;
  elephArtwork?: string;
  pullNumber?: number;
  pityMark?: PullRecapPityMark;
  reserveRemoveSpace?: boolean;
}>();

const failedArtwork = ref<string>();
const elephArtworkUrl = computed(() =>
  props.elephArtwork === failedArtwork.value ? undefined : props.elephArtwork,
);

function handleImageError() {
  if (elephArtworkUrl.value) failedArtwork.value = elephArtworkUrl.value;
}
</script>

<template>
  <span class="pull-recap-result-card">
    <span class="result-portrait">
      <img
        class="student-icon"
        :class="{ 'eleph-artwork': elephArtworkUrl }"
        :src="elephArtworkUrl ?? portrait"
        :alt="name"
        @error="handleImageError"
      />
      <span
        v-if="pityMark || pullNumber"
        class="result-badges"
        :class="{ 'result-badges--editable': reserveRemoveSpace }"
      >
        <span
          v-if="pityMark"
          class="pity-badge"
          role="img"
          :aria-label="$t(`pullRecap.pity.${pityMark}`)"
          :title="$t(`pullRecap.pity.${pityMark}`)"
        >
          <PullRecapPityIcon :mark="pityMark" />
        </span>
        <strong
          v-if="pullNumber"
          class="pull-number-badge"
          :title="$t('pullRecap.pullNumberBadge', { number: pullNumber })"
          >#{{ pullNumber }}</strong
        >
      </span>
    </span>
  </span>
</template>

<style scoped>
.pull-recap-result-card {
  display: block;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-secondary);
}

.result-portrait {
  display: block;
  position: relative;
  aspect-ratio: 1;
}

.student-icon {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.eleph-artwork {
  object-fit: contain;
}

.result-badges {
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  pointer-events: none;
}

.result-badges--editable {
  right: 32px;
}

.pity-badge,
.pull-number-badge {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-primary);
  color: var(--text-primary);
  pointer-events: auto;
}

.pity-badge {
  display: inline-flex;
  flex: none;
  padding: 3px;
}

.pull-number-badge {
  min-width: 0;
  padding: 2px 4px;
  font-size: 0.72rem;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
