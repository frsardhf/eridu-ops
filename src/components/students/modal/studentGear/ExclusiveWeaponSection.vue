<script setup lang="ts">
import { ModalProps, StudentProps } from '../../../../types/student';
import { computed, ref, watch } from 'vue';
import { $t } from '../../../../locales';

const props = defineProps<{
  student: ModalProps | null;
  gradeLevels: { current?: number; target?: number; };
}>();

const emit = defineEmits<{
  (e: 'update-grade', current: number, target: number): void;
}>();

// Local state to track levels
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

// Get weapon icon URL
function getWeaponIconUrl(): string {
  if (!props.student?.WeaponImg) return '';
  const baseUrl = 'https://schaledb.com/images/weapon';
  return `${baseUrl}/${props.student.WeaponImg}.webp`;
}

// Single function to handle both current and target grade updates
const updateCurrentGrade = (grade: number) => {
  // Clamp the value between 1 and 8
  const value = Math.max(1, Math.min(8, grade));
  gradeState.value.current = value;
  
  // Ensure target is at least as high as current
  if (gradeState.value.target < value) {
    gradeState.value.target = value;
  }
  
  emit('update-grade', gradeState.value.current, gradeState.value.target);
};

const updateTargetGrade = (grade: number) => {
  // Target must be at least current and at most 8
  const value = Math.max(gradeState.value.current, Math.min(8, grade));
  gradeState.value.target = value;
  
  emit('update-grade', gradeState.value.current, gradeState.value.target);
};

// Generate stars array for rendering
const currentStars = computed(() => {
  const starsArray: { position: number; isGold: boolean; active: boolean }[] = [];
  
  // Generate 8 stars (5 gold, 3 blue)
  for (let i = 1; i <= 8; i++) {
    starsArray.push({
      position: i,
      isGold: i <= 5,
      active: i <= gradeState.value.current
    });
  }
  
  return starsArray;
});

const targetStars = computed(() => {
  const starsArray: { position: number; isGold: boolean; active: boolean }[] = [];
  
  // Generate 8 stars (5 gold, 3 blue)
  for (let i = 1; i <= 8; i++) {
    starsArray.push({
      position: i,
      isGold: i <= 5,
      active: i <= gradeState.value.target
    });
  }
  
  return starsArray;
});

// Add computed property to check if grade is maxed
const isMaxGrade = computed(() => gradeState.value.current === 8);

// Add computed property to check if weapon is locked
const isWeaponLocked = computed(() => gradeState.value.current <= 5);
</script>

<template>
  <div class="grade-growth-section">
    <div class="card-header">
      <h3 class="section-title">{{ $t('exclusiveWeapon') }}</h3>
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
    
    <div class="weapon-showcase">
      <div class="weapon-preview" :class="{ 'locked': isWeaponLocked }">
        <img 
          :src="getWeaponIconUrl()" 
          :alt="$t('exclusiveWeapon')" 
          class="weapon-icon"
          v-if="props.student?.WeaponImg"
        />
        <div class="weapon-icon placeholder" v-else>?</div>
        
        <!-- Lock overlay for locked weapons -->
        <div class="weapon-lock-overlay" v-if="isWeaponLocked">
          <svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
            <path fill="currentColor" d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"/>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="grade-controls">
      <!-- Current Grade Stars -->
      <div class="grade-row" :class="{ 'centered-row': isMaxGrade }">
        <div class="grade-label">{{ $t('currentGrade') }}</div>
        <div class="stars-container">
          <span
            v-for="star in currentStars" 
            :key="'current-star-' + star.position"
            class="stargrade-star-weapon"
            :class="{ 
              'active': star.active,
              'gold-star': star.isGold,
              'blue-star': !star.isGold
            }"
            @click="updateCurrentGrade(star.position)"
          >
            <svg class="svg-inline--fa fa-star" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="star" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
              <path class="" fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"></path>
            </svg>
          </span>
        </div>
      </div>
      
      <!-- Only show target stars if not at max grade -->
      <div class="grade-row" v-if="!isMaxGrade">
        <div class="grade-label">{{ $t('targetGrade') }}</div>
        <div class="stars-container">
          <span
            v-for="star in targetStars" 
            :key="'target-star-' + star.position"
            class="stargrade-star-weapon"
            :class="{ 
              'active': star.active,
              'gold-star': star.isGold,
              'blue-star': !star.isGold,
              'disabled': star.position < gradeState.current
            }"
            @click="updateTargetGrade(star.position)"
          >
            <svg class="svg-inline--fa fa-star" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="star" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
              <path class="" fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"></path>
            </svg>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grade-growth-section {
  align-self: center;
  background: var(--card-background);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  margin-bottom: 15px;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  margin: 0;
}

.grade-indicators {
  display: flex;
  align-items: center;
  gap: 6px;
}

.grade-pill {
  padding: 4px 8px;
  border-radius: 12px;
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
  font-size: 0.9em;
}

.grade-max-pill {
  background: linear-gradient(135deg, rgba(255, 201, 51, 0.3), rgba(51, 200, 255, 0.3));
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: bold;
  letter-spacing: 1px;
}

.weapon-showcase {
  display: flex;
  justify-content: center;
  background: var(--background-primary);
}

.weapon-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* Styles for locked weapon state */
.weapon-preview.locked .weapon-icon {
  filter: grayscale(100%) brightness(50%);
  opacity: 0.8;
}

.weapon-lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
  min-width: 100%;
  min-height: 100%;
  object-fit: contain;
}

.weapon-icon.placeholder {
  background: rgba(0, 0, 0, 0.3);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1.5em;
  border-radius: 8px;
}

.grade-controls {
  padding: 15px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.centered-row {
  justify-content: center;
  margin: 0 auto;
  width: 100%;
}

.grade-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grade-label {
  font-size: 1em;
  color: var(--text-secondary);
  margin-bottom: 5px;
  text-align: center;
}

.stars-container {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.stargrade-star-weapon {
  width: 25px;
  height: 25px;
  cursor: pointer;
  opacity: 0.3;
  transition: all 0.25s ease;
}

.stargrade-star-weapon svg {
  width: 100%;
  height: 100%;
}

.stargrade-star-weapon.active {
  opacity: 1;
  transform: scale(1.1);
}

.stargrade-star-weapon.gold-star {
  color: rgb(255, 201, 51);
  filter: drop-shadow(0 0 2px rgba(255, 201, 51, 0.3));
}

.stargrade-star-weapon.blue-star {
  color: hsl(192, 100%, 60%);
  filter: drop-shadow(0 0 2px rgba(51, 200, 255, 0.3));
}

.stargrade-star-weapon.disabled {
  cursor: not-allowed;
}

.stargrade-star-weapon:hover:not(.disabled) {
  transform: scale(1.2);
}

@media (min-width: 768px) {
  .grade-controls {
    grid-template-columns: 1fr 1fr;
  }

  .centered-row {
    grid-column: 1 / span 2;
  }
}

@media (max-width: 480px) {
  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .grade-indicators {
    align-self: center;
  }
  
  .grade-max-pill {
    align-self: center;
  }
}
</style>