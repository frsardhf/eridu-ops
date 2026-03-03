<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useStudentGearDisplay } from '@/composables/useStudentGearDisplay';
import { clampLevelPair } from '@/consumables/utils/upgradeUtils';
import {
  MAX_GRADE,
  WEAPON_STAR_THRESHOLD as TRESHOLD
} from '@/consumables/constants/gameConstants';
import { $t } from '@/locales';
import { StudentProps } from '@/types/student';
import StarRatingGroup from '@/components/modal/shared/StarRatingGroup.vue';

const props = defineProps<{
  student: StudentProps;
  gradeLevels: { current?: number; target?: number; };
}>();

const emit = defineEmits<{
  (e: 'update-grade', current: number, target: number): void;
}>();

const { 
  isMaxGrade, 
  isWeaponLocked, 
  getWeaponIconUrl, 
  currentGrade, 
  targetGrade 
} = useStudentGearDisplay(
  toRef(() => props.student),
  toRef(() => props.gradeLevels),
  () => ({}),
  () => ({})
);

const updateCurrentGrade = (grade: number) => {
  const result = clampLevelPair(grade, props.gradeLevels?.target ?? 1, 1, MAX_GRADE, false);
  if (result) emit('update-grade', result.current, result.target);
};

const updateTargetGrade = (grade: number) => {
  const result = clampLevelPair(grade, props.gradeLevels?.current ?? 1, 1, MAX_GRADE, true);
  if (result) emit('update-grade', result.current, result.target);
};

const currentStars = computed(() => {
  const current = props.gradeLevels?.current ?? 1;
  return Array.from({ length: MAX_GRADE }, (_, i) => ({
    position: i + 1,
    isGold: i + 1 <= TRESHOLD,
    active: i + 1 <= current,
  }));
});

const targetStars = computed(() => {
  const target = props.gradeLevels?.target ?? 1;
  return Array.from({ length: MAX_GRADE }, (_, i) => ({
    position: i + 1,
    isGold: i + 1 <= TRESHOLD,
    active: i + 1 <= target,
  }));
});
</script>

<template>
  <div class="grade-growth-section">
    <h3 class="sr-only">{{ $t('exclusiveWeapon') }}</h3>

    <div class="weapon-showcase">
      <div class="weapon-preview" :class="{ 'locked': isWeaponLocked }">
        <div class="grade-overlay">
          <div class="grade-indicators" v-if="!isMaxGrade">
            <div class="grade-pill" :class="currentGrade <= TRESHOLD ? 'gold-grade' : 'blue-grade'">
              {{ currentGrade <= TRESHOLD ? currentGrade : (currentGrade - TRESHOLD) }}★
            </div>
            <div class="grade-arrow">→</div>
            <div class="grade-pill" :class="targetGrade <= TRESHOLD ? 'gold-grade' : 'blue-grade'">
              {{ targetGrade <= TRESHOLD ? targetGrade : (targetGrade - TRESHOLD) }}★
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
          <StarRatingGroup
            class="current-group"
            :stars="currentStars"
            :label-prefix="$t('current')"
            @select="updateCurrentGrade"
          />

          <StarRatingGroup
            v-if="!isMaxGrade"
            class="target-group"
            :stars="targetStars"
            :label-prefix="$t('target')"
            @select="updateTargetGrade"
          />
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

.current-group {
  margin-right: auto;
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

  .grade-inputs-overlay.max-state .grade-stars-group {
    flex: 0 1 auto;
    width: auto;
  }
}
</style>
