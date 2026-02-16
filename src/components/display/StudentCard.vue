<script setup lang="ts">
import { StudentProps } from '../../types/student'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useStudentFormData } from '../../consumables/stores/studentStore'
import { SkillType, SkillTypeName } from '../../types/upgrade'
import { EquipmentType } from '../../types/gear'
import {
  isStudentPinned,
  togglePinnedStudent
} from '../../consumables/utils/studentStorage'
import { currentLanguage } from '../../consumables/stores/localizationStore'

const props = defineProps<{ student: StudentProps }>();
const emit = defineEmits<{
  (e: 'click', student: StudentProps): void;
  (e: 'pin-toggled', studentId: string | number, isPinned: boolean): void;
}>();

const isMobile = ref(false);
// Use the composable for proper reactivity - no need for empty deep watch workaround
const studentData = useStudentFormData(computed(() => props.student.Id));
const forceUpdate = ref(0);
const isPinned = computed(() => {
  const _ = forceUpdate.value;
  return isStudentPinned(props.student.Id);
});
const skillTypes: SkillType[] = ['Ex', 'Public', 'Passive', 'ExtraPassive'];
const skillTypeNames: SkillTypeName[] = ['Ex', 'Basic', 'Enhanced', 'Sub'];

function checkScreenWidth() {
  isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
  checkScreenWidth();
  window.addEventListener('resize', checkScreenWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenWidth);
});

function getFontSizeClass(name: string): string {
  // Mobile sizing is the same regardless of language
  if (isMobile.value) {
    return name.length < 10 ? 'text-lg' : 'text-sm';
  }
  
  // Language-specific font sizing
  if (currentLanguage.value === 'jp') {
    // Japanese uses different thresholds
    if (name.length < 7) {
      return 'text-xl';
    } else if (name.length < 8) {
      return 'text-lg';
    } else {
      return 'text-normal';
    }
  } else {
    // English uses the original thresholds
    switch (true) {
      case name.length < 10:
        return 'text-xl';
      case name.length < 13:
        return 'text-lg';
      case name.length < 17:
        return 'text-normal';
      default:
        return 'text-sm';
    }
  }
}

function shouldShowTarget(
  current: number | undefined, target: number | undefined
): boolean {
  if (!current || !target) return false;
  return current !== target;
}

function formatSkillValue(
  value: number | undefined, isEx: boolean
): string {
  if (!value) return '1';
  if (isEx && value === 5) return 'M';
  if (!isEx && value === 10) return 'M';
  return value.toString();
}

const hasAnySkillDifference = computed(() => {
  if (!studentData.value?.skillLevels) return false;
  
  const skills = studentData.value.skillLevels;
  
  return (
    isDifferent(skills.Ex) ||
    isDifferent(skills.Public) ||
    isDifferent(skills.Passive) ||
    isDifferent(skills.ExtraPassive)
  );
});

function isDifferent(
  skill: { current?: number, target?: number } | undefined
): boolean {
  if (!skill?.current || !skill?.target) return false;
  return skill.current !== skill.target;
}

const studentEquipment = computed(() => {
  return props.student.Equipment || [];
});

function formatEquipmentTier(value: number | undefined): string {
  if (!value) return '1';
  return value.toString();
}

const hasAnyEquipmentDifference = computed(() => {
  if (!studentData.value?.equipmentLevels) return false;
  
  const equipmentLevels = studentData.value.equipmentLevels;
  
  for (const type of studentEquipment.value) {
    const equipment = equipmentLevels[type as EquipmentType];
    if (equipment?.current !== equipment?.target && 
        equipment?.current !== undefined && 
        equipment?.target !== undefined) {
      return true;
    }
  }
  
  return false;
});

const displayEquipment = computed(() => {
  return studentEquipment.value;
});

const hasEquipmentData = computed(() => {
  return studentData.value?.equipmentLevels && 
    Object.keys(studentData.value.equipmentLevels).length > 0;
});

const bondLevel = computed(() => {
  return studentData.value?.bondDetailData?.currentBond || 0;
});

const characterCurrentLevel = computed(() => {
  return studentData.value?.characterLevels?.current || 0;
});

const characterTargetLevel = computed(() => {
  return studentData.value?.characterLevels?.target || 0;
});

const gradeLevel = computed(() => {
  return studentData.value?.gradeLevels?.current || 0;
});

function handlePinToggle(event: MouseEvent) {
  event.stopPropagation();
  const newPinStatus = togglePinnedStudent(props.student.Id);
  forceUpdate.value++;
  emit('pin-toggled', props.student.Id, newPinStatus);
}
</script>

<template>
  <div class="student-card" @click="emit('click', student)" 
    :key="`card-${student.Id}-${isPinned}`">
    <!-- Pin icon -->
    <div :class="['pin-icon', { 'pinned': isPinned }]" @click.stop="handlePinToggle"
      :key="`pin-${student.Id}-${isPinned}`">
      <img 
        src="/assets/push-pin.png" 
        :class="['pin-img', { 'pinned': isPinned }]"
        alt="Pin icon"
      />
    </div>
    
    <a class="selection-grid-card">
      <div class="card-img">
        <img 
          :src="`https://schaledb.com/images/student/collection/${student.Id}.webp`"
          :alt="student.Name"
        >
        <!-- Stats overlay -->
        <div class="stats-overlay">
          <!-- Bond Level -->
          <div class="bond-container" v-if="bondLevel > 0">
            <div class="bond-icon-container">
              <img 
                src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
                alt="Bond Level"
                class="bond-icon"
              />
              <span class="bond-number">{{ bondLevel }}</span>
            </div>
          </div>

          <!-- Grade Level -->
          <div class="grade-container" v-if="gradeLevel > 0">
            <div class="grade-stars-row">
              <!-- Gold stars only for grades 1-5 -->
              <template v-if="gradeLevel <= 5">
                <template v-for="i in gradeLevel" :key="`gold-star-${i}`">
                  <svg class="small-star gold-star"
                      aria-hidden="true"
                      focusable="false"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 576 512">
                    <path fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 
                      0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 
                      21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 
                      31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 
                      33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 
                      11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z">
                    </path>
                  </svg>
                </template>
              </template>
              
              <!-- Blue stars only for grades 6-9 -->
              <template v-else>
                <template v-for="i in gradeLevel - 5" :key="`blue-star-${i}`">
                  <svg class="small-star blue-star"
                      aria-hidden="true"
                      focusable="false"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 576 512">
                      <path fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 
                        0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 
                        21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 
                        31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 
                        33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 
                        11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z">
                      </path>
                  </svg>
                </template>
              </template>
            </div>
          </div>
          
          <!-- Character Level -->
          <div class="level-container" 
          v-if="characterCurrentLevel > 0">
            <span class="level-number">{{ characterCurrentLevel }}</span>
            <span class="level-max" 
              v-if="shouldShowTarget(characterCurrentLevel,
              characterTargetLevel
            )">/{{ characterTargetLevel }}</span>
          </div>
          
          <!-- Bottom overlays container -->
          <div class="bottom-overlays">
            <!-- Equipment Levels -->
            <div class="equipment-levels" 
              v-if="hasEquipmentData && displayEquipment.length > 0">
              <div class="equipment-row">
                <span 
                  v-for="type in displayEquipment" 
                  :key="type" 
                  class="equipment-value"
                  :title="type + ' Equipment Level'"
                >
                  {{ formatEquipmentTier(studentData?.equipmentLevels?.[type]?.current) }}
                </span>
              </div>
              <div class="equipment-row" v-if="hasAnyEquipmentDifference">
                <span
                  v-for="type in displayEquipment"
                  :key="`target-${type}`"
                  class="equipment-value target-value"
                  :title="'Target ' + type + ' Equipment Level'"
                >
                  {{ formatEquipmentTier(studentData?.equipmentLevels?.[type]?.target) }}
                </span>
              </div>
            </div>
            
            <!-- Skill Levels -->
            <div class="skill-levels" v-if="studentData?.skillLevels">
              <div class="skill-row">
                <span 
                  v-for="(skillType, idx) in skillTypes" 
                  :key="skillType"
                  class="skill-value"
                  :title="skillTypeNames[idx] + ' Skill Level'"
                >
                  {{ formatSkillValue(
                    studentData.skillLevels[skillType]?.current, 
                    skillType === 'Ex'
                  ) }}
                </span>
              </div>
              <div class="skill-row" v-if="hasAnySkillDifference">
                <span 
                  v-for="(skillType, idx) in skillTypes" 
                  :key="`target-${skillType}`"
                  class="skill-value"
                  :title="'Target ' + skillTypeNames[idx] + ' Skill Level'"
                >
                  {{ formatSkillValue(
                    studentData.skillLevels[skillType]?.target, 
                    skillType === 'Ex'
                  ) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-label">
        <span :class="['label-text', getFontSizeClass(student.Name)]">
          {{ student.Name }}
        </span>
      </div>
    </a>
  </div>
</template>

<style scoped>
.student-card {
  width: 150px;
  position: relative;
}

.selection-grid-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-background);
  box-shadow: 0 2px 4px var(--box-shadow);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.selection-grid-card:focus {
  box-shadow: 0 0 0 3px #4fc3f7, 0 2px 8px var(--box-shadow);
  z-index: 2;
}

.selection-grid-card:hover {
  transform: scale(1.04);
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
}

.selection-grid-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}

.card-img {
  width: 150px;
  height: 170px;
  overflow: hidden;
  position: relative;
}

.card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stats-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-areas: 
    "grade bond"
    "empty level"
    "bottom bottom";
  grid-template-rows: auto 1fr;
  grid-template-columns: 1fr auto;
  padding: 4px;
  gap: 0;
}

.bottom-overlays {
  grid-area: bottom;
  align-self: end;
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.bond-container {
  grid-area: bond;
  justify-self: end;
}

.bond-icon-container {
  position: relative;
  width: 36px;
  height: 36px;
}

.bond-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bond-number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  font-weight: bold;
  font-size: 14px;
  color: white;
}

.grade-container {
  grid-area: grade;
  justify-self: flex-end;
  margin-top: 7px;
  margin-right: 2px;
  opacity: 0;
  transform: translateX(-30px);
  transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1);
  pointer-events: none;
}

.grade-stars-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 4px;
  border-radius: 4px;
}

.small-star {
  width: 16px;
  height: 16px;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5));
}

.gold-star {
  color: rgb(255, 201, 51);
}

.blue-star {
  color: hsl(192, 100%, 60%);
}

.level-container {
  max-height: 22px;
  grid-area: level;
  justify-self: end;
  background: rgba(0, 0, 0, 0.6);
  padding: 0px 4px;
  margin-right: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 1px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1);
  pointer-events: none;
}

.level-number {
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.level-max {
  color: #aaa;
  font-size: 12px;
}

.selection-grid-card:hover .grade-container,
.selection-grid-card:focus .grade-container {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.selection-grid-card:hover .level-container,
.selection-grid-card:focus .level-container {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.skill-levels,
.equipment-levels {
  align-self: end;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
}

.skill-levels {
  margin-left: 2px;
}

.equipment-levels {
  margin-right: 2px;
}

.skill-row,
.equipment-row {
  display: flex;
  width: 100%;
}

.skill-row {
  justify-content: flex-end;
}

.equipment-row {
  justify-content: flex-start;
}

.skill-value, 
.equipment-value {
  color: white;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 2px;
  min-width: 20px; 
  width: 20px; 
  text-align: center;
  display: inline-block; 
  box-sizing: border-box;
  transition: background 0.15s;
}

.skill-value[title]:hover, .equipment-value[title]:hover {
  background: rgba(80, 180, 255, 0.5);
}

.card-label {
  margin-top: 0;
  padding: 4px;
  text-align: center;
  background-color: var(--card-label-background);
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.label-text {
  line-height: 1;
  width: 100%;
  padding: 0 2px;
  color: var(--text-primary);
}

.label-text:hover {
  color: var(--accent-color);
}

/* Font size classes */
.text-xl {
  font-size: 1.25rem;
}

.text-lg {
  font-size: 1.125rem;
}

.text-normal {
  font-size: 1rem;
}

.text-sm {
  font-size: 0.875rem;
}

/* Pin icon styles */
.pin-icon {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 30px;
  height: 30px;
  z-index: 10;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #a6a6a6;
  border-radius: 50%;
  padding: 7px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: background-color 0.1s ease;
}

.pin-icon:hover {
  background-color: #edba2d;
  color: black;
}

.pin-icon.pinned {
  background-color: #edba2d;
}

.pin-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.7;
  transition: opacity 0.1s ease;
}

.pin-img.pinned {
  opacity: 1;
}

@media screen and (max-width: 768px) {
  .student-card {
    width: 100px;
  }

  .card-img {
    width: 100px;
    height: 113px;
  }

  .bond-icon-container {
    width: 24px;
    height: 24px;
  }

  .bond-number {
    font-size: 10px;
  }

  .grade-container {
    margin-top: 4px;
    margin-right: 0px;
  }

  .grade-stars-row {
    padding: 3px 3px;
  }

  .small-star {
    width: 10px;
    height: 10px;
  }

  .level-container {
    max-height: 18px;
    padding: 1px 3px;
  }

  .level-number {
    font-size: 10px;
  }

  .level-max {
    font-size: 10px;
  }

  .skill-levels, 
  .equipment-levels {
    gap: 1px;
    padding: 1px;
  }

  .skill-value,
  .equipment-value {
    font-size: 10px;
    min-width: 12px; 
    width: 10px; 
  }

  .pin-icon {
    width: 24px;
    height: 24px;
    top: -8px;
    left: -8px;
    padding: 5px;
  }
}

@media screen and (max-width: 384px) {
  .bond-number {
    left: 52%;
  }
}
</style>