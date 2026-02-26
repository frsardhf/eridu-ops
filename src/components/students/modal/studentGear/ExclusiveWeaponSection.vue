<script setup lang="ts">
import { computed, ref, watch, toRef } from 'vue';
import { useStudentGearDisplay } from '@/composables/student/useStudentGearDisplay';
import { $t } from '@/locales';
import { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps;
  gradeLevels: { current?: number; target?: number; };
}>();

const emit = defineEmits<{
  (e: 'update-grade', current: number, target: number): void;
}>();

const { isMaxGrade, isWeaponLocked, getWeaponIconUrl } = useStudentGearDisplay(
  toRef(() => props.student),
  toRef(() => props.gradeLevels),
  () => ({}),
  () => ({})
);

// Local state to track levels for star click interaction
const gradeState = ref({
  current: props.gradeLevels?.current || 1,
  target: props.gradeLevels?.target || 1
});

// Watch for prop changes to update local state
watch(() => props.gradeLevels, (newVal) => {
  if (newVal) {
    gradeState.value.current = newVal.current ?? 1;
    gradeState.value.target = newVal.target ?? 1;
  }
}, { deep: true, immediate: true });

// Single function to handle both current and target grade updates
const updateCurrentGrade = (grade: number) => {
  // Clamp the value between 1 and 9
  const value = Math.max(1, Math.min(9, grade));
  gradeState.value.current = value;

  // Ensure target is at least as high as current
  if (gradeState.value.target < value) {
    gradeState.value.target = value;
  }

  emit('update-grade', gradeState.value.current, gradeState.value.target);
};

const updateTargetGrade = (grade: number) => {
  // Target must be at least current and at most 9
  const value = Math.max(gradeState.value.current, Math.min(9, grade));
  gradeState.value.target = value;

  emit('update-grade', gradeState.value.current, gradeState.value.target);
};

// Generate stars array for rendering
const currentStars = computed(() => {
  const starsArray: { position: number; isGold: boolean; active: boolean }[] = [];
  for (let i = 1; i <= 9; i++) {
    starsArray.push({ position: i, isGold: i <= 5, active: i <= gradeState.value.current });
  }
  return starsArray;
});

const targetStars = computed(() => {
  const starsArray: { position: number; isGold: boolean; active: boolean }[] = [];
  for (let i = 1; i <= 9; i++) {
    starsArray.push({ position: i, isGold: i <= 5, active: i <= gradeState.value.target });
  }
  return starsArray;
});
</script>

<template>
  <div class="grade-growth-section">
    <h3 class="sr-only">{{ $t('exclusiveWeapon') }}</h3>

    <div class="weapon-showcase">
      <div class="weapon-preview" :class="{ 'locked': isWeaponLocked }">
        <div class="grade-overlay">
          <div class="grade-indicators" v-if="!isMaxGrade">
            <div class="grade-pill" :class="gradeState.current <= 5 ? 'gold-grade' : 'blue-grade'">
              {{ gradeState.current <= 5 ? gradeState.current : (gradeState.current - 5) }}★
            </div>
            <div class="grade-arrow">→</div>
            <div class="grade-pill" :class="gradeState.target <= 5 ? 'gold-grade' : 'blue-grade'">
              {{ gradeState.target <= 5 ? gradeState.target : (gradeState.target - 5) }}★
            </div>
          </div>
          <div class="grade-max-pill" v-else>{{ $t('maxGrade') }}</div>
        </div>

        <img 
          :src="getWeaponIconUrl()" 
          :alt="$t('exclusiveWeapon')" 
          class="weapon-icon"
          v-if="props.student?.WeaponImg"
        />
        <div class="weapon-icon placeholder" v-else>?</div>

        <div class="grade-inputs-overlay" :class="{ 'max-state': isMaxGrade, 'locked-state': isWeaponLocked }">
          <div class="grade-stars-group current-group">
            <button
              v-for="star in currentStars"
              :key="`current-star-${star.position}`"
              class="grade-star-button"
              :class="[star.isGold ? 'gold-star' : 'blue-star', { active: star.active }]"
              type="button"
              :aria-label="`${$t('current')} ${star.position}`"
              @click="updateCurrentGrade(star.position)"
            >
              <svg class="star-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                <path fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/>
              </svg>
            </button>
          </div>

          <div v-if="!isMaxGrade" class="grade-stars-group target-group">
            <button
              v-for="star in targetStars"
              :key="`target-star-${star.position}`"
              class="grade-star-button"
              :class="[star.isGold ? 'gold-star' : 'blue-star', { active: star.active }]"
              type="button"
              :aria-label="`${$t('target')} ${star.position}`"
              @click="updateTargetGrade(star.position)"
            >
              <svg class="star-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                <path fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grade-growth-section {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--card-background);
  width: 100%;
}

.grade-indicators {
  display: flex;
  align-items: center;
  gap: 6px;
}

.grade-pill {
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 0.8em;
  font-weight: bold;
}

.grade-pill.gold-grade {
  background: rgba(255, 201, 51, 0.2);
  color: rgb(255, 201, 51);
}

.grade-pill.blue-grade {
  background: rgba(51, 200, 255, 0.2);
  color: hsl(192, 100%, 60%);
}

.grade-arrow {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
}

.grade-max-pill {
  background: linear-gradient(135deg, rgba(255, 201, 51, 0.32), rgba(51, 200, 255, 0.28));
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 0.8em;
  font-weight: bold;
  letter-spacing: 1px;
}

.weapon-showcase {
  position: relative;
  align-items: center;
  background: var(--background-primary);
  min-height: 170px;
  overflow: hidden;
}

.weapon-preview {
  width: 100%;
  min-height: 170px;
  display: flex;
  background: var(--card-background);
  align-items: center;
  justify-content: center;
  position: relative;
}

.grade-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

.grade-inputs-overlay {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.grade-inputs-overlay.max-state {
  justify-content: flex-end;
}

.grade-inputs-overlay.max-state .current-group {
  margin-right: 0;
}

.grade-stars-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 32px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  backdrop-filter: blur(4px);
}

.current-group {
  margin-right: auto;
}

.grade-star-button {
  border: none;
  background: transparent;
  width: 16px;
  height: 16px;
  padding: 0;
  line-height: 0;
  opacity: 0.28;
  cursor: pointer;
  transition: opacity 0.16s ease;
}

.grade-star-button.active {
  opacity: 1;
}

.grade-star-button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
  border-radius: 2px;
}

.star-icon {
  width: 120%;
  height: 120%;
}

.gold-star {
  color: rgb(255, 201, 51);
}

.blue-star {
  color: hsl(192, 100%, 60%);
}

/* Styles for locked weapon state */
.weapon-preview.locked .weapon-icon {
  filter: grayscale(100%) brightness(50%);
  opacity: 0.8;
}

.weapon-icon {
  width: auto;
  max-width: 100%;
  object-fit: contain;
  object-position: center;
}

.weapon-icon.placeholder {
  background: rgba(0, 0, 0, 0.3);
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1.5em;
  border-radius: 8px;
}

@media (max-width: 520px) {
  .grade-inputs-overlay.max-state {
    justify-content: flex-end;
  }

  .grade-stars-group {
    min-width: 0;
    flex: 1 1 0;
    max-width: 158px;
    justify-content: center;
    padding: 4px 6px;
  }

  .grade-inputs-overlay.max-state .grade-stars-group {
    flex: 0 1 auto;
    width: auto;
  }

  .grade-star-button {
    width: 14px;
    height: 14px;
  }
}
</style>
