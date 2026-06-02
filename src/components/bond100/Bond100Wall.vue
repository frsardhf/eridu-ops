<script setup lang="ts">
import { getStudentIconUrl } from '@/lib/utils/iconUtils';
import { $t } from '@/locales';
import type { Bond100StudentSummary } from '@/types/bond100';
import type { StudentProps } from '@/types/student';

defineProps<{
  cards: Array<{
    student: StudentProps;
    summary: Bond100StudentSummary | null;
    count: number;
  }>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'select-student': [student: StudentProps];
}>();

// Caption-strip style: dark translucent bg + white text, legible over any
// portrait. Theme-invariant.
const stripStyle = {
  background: 'rgba(0, 0, 0, 0.78)',
  color: '#fff',
};
</script>

<template>
  <section class="bond100-wall-wrap">
    <div v-if="loading" class="bond100-wall-state">{{ $t('loading') }}...</div>

    <div v-else-if="!cards.length" class="bond100-wall-state">
      {{ $t('bond100.noStudents') }}
    </div>

    <div v-else class="bond100-wall">
      <button
        v-for="card in cards"
        :key="card.student.Id"
        type="button"
        class="bond100-tile"
        :class="{ 'is-muted': card.count === 0 }"
        :title="`${card.student.Name} · ${$t('bond100.atBond100')} ${card.count}`"
        @click="emit('select-student', card.student)"
      >
        <div class="bond100-tile-portrait">
          <img :src="getStudentIconUrl(card.student.Id)" :alt="card.student.Name" loading="lazy" />
        </div>
        <div class="bond100-tile-count" :style="stripStyle">
          {{ card.count }}
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.bond100-wall-wrap {
  min-height: 240px;
}

.bond100-wall-state {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--text-secondary);
}

.bond100-wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 6px;
}

.bond100-tile {
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.15s, opacity 0.15s, filter 0.15s;
}

.bond100-tile:hover {
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

/* Inactive in the current mode — full tile dims so the eye lands on tiles
   that actually have data. Stays clickable for browsing/submission. Hover
   restores full opacity so the user knows it's interactive. */
.bond100-tile.is-muted {
  opacity: 0.45;
  filter: saturate(0.5);
}

.bond100-tile.is-muted:hover {
  opacity: 1;
  filter: none;
}

.bond100-tile-portrait {
  aspect-ratio: 1;
  width: 100%;
  overflow: hidden;
}

.bond100-tile-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.bond100-tile-count {
  padding: 2px 4px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  /* background / color / green top-border applied inline via stripStyle */
}

@media (max-width: 560px) {
  .bond100-wall {
    grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
    gap: 4px;
  }

  .bond100-tile-count {
    font-size: 0.72rem;
  }
}
</style>
