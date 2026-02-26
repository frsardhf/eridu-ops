<script setup lang="ts">
import { toRef } from 'vue';
import { useStudentGearDisplay } from '@/composables/useStudentGearDisplay';
import { $t } from '@/locales';
import { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps;
  gradeLevels: { current?: number; target?: number };
  equipmentLevels: Record<string, { current: number; target: number }>;
  exclusiveGearLevel: { current?: number; target?: number };
}>();

const {
  isWeaponLocked,
  blueStars,
  getWeaponIconUrl
} = useStudentGearDisplay(
  toRef(() => props.student),
  toRef(() => props.gradeLevels),
  toRef(() => props.equipmentLevels),
  toRef(() => props.exclusiveGearLevel)
);
</script>

<template>
  <div class="info-gear-weapon">
    <div class="weapon-showcase">
      <div class="weapon-preview" :class="{ 'locked': isWeaponLocked }">
        <img
          v-if="student?.WeaponImg"
          :src="getWeaponIconUrl()"
          :alt="$t('exclusiveWeapon')"
          class="weapon-icon"
        />
        <div v-else class="weapon-icon placeholder">?</div>

        <div v-if="isWeaponLocked" class="weapon-lock-overlay">
          <svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
            <path fill="currentColor" d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"/>
          </svg>
        </div>
      </div>

      <div v-if="!isWeaponLocked" class="stars-overlay">
        <span
          v-for="star in blueStars"
          :key="'star-' + star.position"
          class="star blue-star"
          :class="{ active: star.active }"
        >
          <svg class="svg-inline--fa fa-star" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
            <path fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/>
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-gear-weapon {
  background: var(--card-background);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.weapon-showcase {
  display: flex;
  justify-content: center;
  background: var(--background-primary);
  position: relative;
  max-height: 160px;
  overflow: hidden;
}

.weapon-preview {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.weapon-preview.locked .weapon-icon {
  filter: grayscale(100%) brightness(50%);
  opacity: 0.8;
}

.weapon-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.lock-icon {
  width: 40px;
  height: 40px;
  color: rgba(255, 255, 255, 0.8);
  filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.5));
}

.weapon-icon {
  width: 100%;
  height: auto;
  max-height: 160px;
  object-fit: contain;
}

.weapon-icon.placeholder {
  background: rgba(0, 0, 0, 0.3);
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1.5em;
  border-radius: 8px;
}

.stars-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  gap: 3px;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 6px;
  border-radius: 8px;
}

.star {
  width: 18px;
  height: 18px;
  opacity: 0.3;
}

.star svg {
  width: 100%;
  height: 100%;
}

.star.active {
  opacity: 1;
}

.star.blue-star {
  color: hsl(192, 100%, 60%);
  filter: drop-shadow(0 0 2px rgba(51, 200, 255, 0.5));
}
</style>
