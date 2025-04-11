<script setup lang="ts">
import { StudentProps } from '../../../types/student'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { getStudentData, updateStudentData } from '../../../consumables/stores/studentStore'
import { EquipmentType } from '../../../types/equipment'
import { isStudentPinned, togglePinnedStudent } from '../../../consumables/utils/studentStorage'

const props = defineProps<{ student: StudentProps }>();
const emit = defineEmits<{
  (e: 'click', student: StudentProps): void;
  (e: 'pin-toggled', studentId: string | number, isPinned: boolean): void;
}>();

const isMobile = ref(false);
const studentData = computed(() => getStudentData(props.student.Id));
const isPinned = ref(false);

// Watch for changes in the store
watch(() => studentData.value, () => {
  // This will trigger a re-render when the data changes
}, { deep: true });

function checkScreenWidth() {
  isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
  // Initial check
  checkScreenWidth();
  // Add resize listener
  window.addEventListener('resize', checkScreenWidth);
  // Load initial pin status
  isPinned.value = isStudentPinned(props.student.Id);
});

onUnmounted(() => {
  // Clean up listener
  window.removeEventListener('resize', checkScreenWidth);
});

function getFontSizeClass(name: string): string {
  // For mobile screens (max-width: 768px)
  if (isMobile.value) {
    if (name.length < 10) {
      return 'text-lg'; 
    } else {
      return 'text-sm'; 
    }
  }
  
  // For desktop screens (normal sizing)
  if (name.length < 10) {
    return 'text-xl'; 
  } else if (name.length < 13) {
    return 'text-lg'; 
  } else if (name.length < 17) {
    return 'text-normal';
  } else {
    return 'text-sm';
  }
}

// New function to determine if we should show target value
function shouldShowTarget(current: number | undefined, target: number | undefined): boolean {
  if (!current || !target) return false;
  return current !== target;
}

// New function to format skill values
function formatSkillValue(value: number | undefined, isEx: boolean): string {
  if (!value) return '1';
  
  // For Ex skills, 5 is displayed as 'M'
  if (isEx && value === 5) return 'M';
  
  // For other skills, 10 is displayed as 'M'
  if (!isEx && value === 10) return 'M';
  
  return value.toString();
}

// Computed property to determine if any skill has a different current and target value
const hasAnySkillDifference = computed(() => {
  if (!studentData.value?.skillLevels) return false;
  
  const skillLevels = studentData.value.skillLevels;
  
  // Check if any skill has a different current and target value
  return (
    (skillLevels.Ex?.current !== skillLevels.Ex?.target && skillLevels.Ex?.current !== undefined && skillLevels.Ex?.target !== undefined) ||
    (skillLevels.Public?.current !== skillLevels.Public?.target && skillLevels.Public?.current !== undefined && skillLevels.Public?.target !== undefined) ||
    (skillLevels.Passive?.current !== skillLevels.Passive?.target && skillLevels.Passive?.current !== undefined && skillLevels.Passive?.target !== undefined) ||
    (skillLevels.ExtraPassive?.current !== skillLevels.ExtraPassive?.target && skillLevels.ExtraPassive?.current !== undefined && skillLevels.ExtraPassive?.target !== undefined)
  );
});

// New computed property to get equipment types for this student
const studentEquipment = computed(() => {
  return props.student.Equipment || [];
});

// Format equipment tier value
function formatEquipmentTier(value: number | undefined): string {
  if (!value) return '1';
  return value.toString();
}

// Check if any equipment has different current and target values
const hasAnyEquipmentDifference = computed(() => {
  if (!studentData.value?.equipmentLevels) return false;
  
  const equipmentLevels = studentData.value.equipmentLevels;
  
  // Check each equipment type
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

// Get equipment items to display (limit to prevent overflow)
const displayEquipment = computed(() => {
  return studentEquipment.value;
});

// Check if we have equipment data
const hasEquipmentData = computed(() => {
  return studentData.value?.equipmentLevels && 
    Object.keys(studentData.value.equipmentLevels).length > 0;
});

// Handle pin toggle
function handlePinToggle(event: MouseEvent) {
  event.stopPropagation(); // Prevent card click event
  const newPinStatus = togglePinnedStudent(props.student.Id);
  isPinned.value = newPinStatus;
  emit('pin-toggled', props.student.Id, newPinStatus);
}
</script>

<template>
  <div class="student-card" @click="emit('click', student)">
    <!-- Pin icon - moved outside card-img -->
    <div :class="['pin-icon', { 'pinned': isPinned }]" @click.stop="handlePinToggle">
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
          <div class="bond-container" v-if="studentData?.currentBond">
            <div class="bond-icon-container">
              <img 
                src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
                alt="Bond Level"
                class="bond-icon"
              />
              <span class="bond-number">{{ studentData.currentBond }}</span>
            </div>
          </div>
          
          <!-- Character Level -->
          <div class="level-container" v-if="studentData?.currentCharacterLevel">
            <span class="level-number">{{ studentData.currentCharacterLevel }}</span>
            <span class="level-max" v-if="shouldShowTarget(studentData.currentCharacterLevel,
              studentData.targetCharacterLevel
            )">/{{ studentData.targetCharacterLevel }}</span>
          </div>
          
          <!-- Bottom overlays container -->
          <div class="bottom-overlays">
            <!-- Equipment Levels -->
            <div class="equipment-levels" v-if="hasEquipmentData && displayEquipment.length > 0">
              <div class="equipment-row">
                <span 
                  v-for="type in displayEquipment" 
                  :key="type" 
                  class="equipment-value"
                  :title="type"
                >
                  {{ formatEquipmentTier(studentData.equipmentLevels[type]?.current) }}
                </span>
              </div>
              <div class="equipment-row" v-if="hasAnyEquipmentDifference">
                <span 
                  v-for="type in displayEquipment" 
                  :key="`target-${type}`" 
                  class="equipment-value target-value"
                  :title="`Target ${type}`"
                >
                  {{ formatEquipmentTier(studentData.equipmentLevels[type]?.target) }}
                </span>
              </div>
            </div>
            
            <!-- Skill Levels -->
            <div class="skill-levels" v-if="studentData?.skillLevels">
              <div class="skill-row">
                <span class="skill-value">
                  {{ formatSkillValue(studentData.skillLevels.Ex?.current, true) }}
                </span>
                <span class="skill-value">
                  {{ formatSkillValue(studentData.skillLevels.Public?.current, false) }}
                </span>
                <span class="skill-value">
                  {{ formatSkillValue(studentData.skillLevels.Passive?.current, false) }}
                </span>
                <span class="skill-value">
                  {{ formatSkillValue(studentData.skillLevels.ExtraPassive?.current, false) }}
                </span>
              </div>
              <div class="skill-row" v-if="hasAnySkillDifference">
                <span class="skill-value">
                  {{ formatSkillValue(studentData.skillLevels.Ex?.target, true) }}
                </span>
                <span class="skill-value">
                  {{ formatSkillValue(studentData.skillLevels.Public?.target, false) }}
                </span>
                <span class="skill-value">
                  {{ formatSkillValue(studentData.skillLevels.Passive?.target, false) }}
                </span>
                <span class="skill-value">
                  {{ formatSkillValue(studentData.skillLevels.ExtraPassive?.target, false) }}
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
  transition: transform 0.2s;
  cursor: pointer;
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
    "empty bond"
    "empty level"
    "bottom bottom";
  grid-template-rows: auto 1fr;
  padding: 4px;
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
  transform: translate(-50%, -60%);
  font-weight: bold;
  font-size: 14px;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.level-container {
  max-height: 22px;
  grid-area: level;
  justify-self: end;
  background: rgba(0, 0, 0, 0.6);
  padding: 0px 5px;
  margin-right: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 1px;
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
  transition: background-color 0.2s ease;
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
  transition: opacity 0.2s ease, transform 0.2s ease;
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
    min-width: 10px; 
    width: 10px; 
  }
  
  .bottom-overlays {
    gap: 2px;
  }

  .pin-icon {
    width: 24px;
    height: 24px;
    top: -8px;
    left: -8px;
    padding: 5px;
  }
}
</style>