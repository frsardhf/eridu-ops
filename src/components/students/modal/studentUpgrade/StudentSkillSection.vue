<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  SkillType,
  SkillSettings
} from '../../../../types/upgrade';

// Modify this interface to match our component needs
interface SkillMaterial {
  material: Record<string, any> | null;
  materialQuantity: number;
  level?: number;
  blockStart?: number;
  blockEnd?: number;
  potentialType: string; // This is to handle compatibility with hook data
}

const props = defineProps<{
  student: Record<string, any> | null,
  skillLevels: Record<string, { current: number; target: number; }>,
  materials: SkillMaterial[];
}>();

const emit = defineEmits<{
  (e: 'update-skill', type: SkillType, current: number, target: number): void;
}>();

// Create skill settings for each type
const skillTypes = ref<Record<SkillType, SkillSettings>>({
  Ex: {
    current: props.skillLevels.Ex?.current || 1,
    target: props.skillLevels.Ex?.target || 1,
    icon: props.student?.Skills?.Ex?.Icon,
    name: 'EX Skill',
    maxLevel: props.student?.Skills?.Ex?.Parameters?.[0]?.length || 5
  },
  Public: {
    current: props.skillLevels.Public?.current || 1,
    target: props.skillLevels.Public?.target || 1,
    icon: props.student?.Skills?.Public?.Icon,
    name: 'Basic Skill',
    maxLevel: props.student?.Skills?.Public?.Parameters?.[0]?.length || 10
  },
  Passive: {
    current: props.skillLevels.Passive?.current || 1,
    target: props.skillLevels.Passive?.target || 1,
    icon: props.student?.Skills?.Passive?.Icon,
    name: 'Passive Skill',
    maxLevel: props.student?.Skills?.Passive?.Parameters?.[0]?.length || 10
  },
  ExtraPassive: {
    current: props.skillLevels.ExtraPassive?.current || 1,
    target: props.skillLevels.ExtraPassive?.target || 1,
    icon: props.student?.Skills?.ExtraPassive?.Icon,
    name: 'Sub Skill',
    maxLevel: props.student?.Skills?.ExtraPassive?.Parameters?.[0]?.length || 10
  }
});

// Watch for prop changes to update skill levels
watch(() => props.skillLevels, (newVal) => {
  Object.entries(newVal).forEach(([type, levels]) => {
    if (skillTypes.value[type as SkillType]) {
      skillTypes.value[type as SkillType].current = levels.current;
      skillTypes.value[type as SkillType].target = levels.target;
    }
  });
}, { deep: true, immediate: true });

// Update skill icons and names from student data if available
watch(() => props.student, (student) => {
  if (student?.Skills) {
    // Update EX skill
    if (student.Skills.Ex) {
      skillTypes.value.Ex.icon = student.Skills.Ex.Icon;
      skillTypes.value.Ex.name = student.Skills.Ex.Name;
      skillTypes.value.Ex.maxLevel = student.Skills.Ex.Parameters?.[0]?.length;
    }
    
    // Update Public skill
    if (student.Skills.Public) {
      skillTypes.value.Public.icon = student.Skills.Public.Icon;
      skillTypes.value.Public.name = student.Skills.Public.Name;
      skillTypes.value.Public.maxLevel = student.Skills.Public.Parameters?.[0]?.length;
    }
    
    // Update Passive skill
    if (student.Skills.Passive) {
      skillTypes.value.Passive.icon = student.Skills.Passive.Icon;
      skillTypes.value.Passive.name = student.Skills.Passive.Name;
      skillTypes.value.Passive.maxLevel = student.Skills.Passive.Parameters?.[0]?.length;
    }
    
    // Update Extra Passive skill if available
    if (student.Skills.ExtraPassive) {
      skillTypes.value.ExtraPassive.icon = student.Skills.ExtraPassive.Icon;
      skillTypes.value.ExtraPassive.name = student.Skills.ExtraPassive.Name;
      skillTypes.value.ExtraPassive.maxLevel = student.Skills.ExtraPassive.Parameters?.[0]?.length;
    }
  }
}, { immediate: true });

// Handle skill level changes
const updateSkillCurrent = (type: SkillType, value: number) => {
  if (value >= 1 && value <= skillTypes.value[type].maxLevel) {
    skillTypes.value[type].current = value;
    
    // Ensure target is always >= current
    if (skillTypes.value[type].target < value) {
      skillTypes.value[type].target = value;
    }
    
    // Emit the update event
    emit('update-skill', type, value, skillTypes.value[type].target);
  }
};

const updateSkillTarget = (type: SkillType, value: number) => {
  if (value >= 1 && value <= skillTypes.value[type].maxLevel) {
    const finalValue = Math.max(value, 1);
    skillTypes.value[type].target = finalValue;
    
    // Ensure current is always <= target
    if (skillTypes.value[type].current > finalValue) {
      skillTypes.value[type].current = finalValue;
      
      // Emit the update event for both current and target
      emit('update-skill', type, finalValue, finalValue);
    } else {
      // Emit the update event for target only
      emit('update-skill', type, skillTypes.value[type].current, finalValue);
    }
  }
};

// Format skill icon URL
const getSkillIconUrl = (iconName: string) => {
  return `https://schaledb.com/images/skill/${iconName}.webp`;
};
</script>

<template>
  <div class="skill-section">
    <h3 class="section-title">Skill Upgrade Calculator</h3>
    
    <div class="skill-sliders-column">
      <template v-for="(skillType, index) in ['Ex', 'Public', 'Passive', 'ExtraPassive'] as SkillType[]" :key="index">
        <!-- Only show ExtraPassive if student has it -->
        <div v-if="skillType !== 'ExtraPassive' || (props.student?.Skills?.ExtraPassive)" class="skill-type-section">
          <div class="skill-type-header">
            <img 
              :src="getSkillIconUrl(skillTypes[skillType].icon)"
              :alt="skillTypes[skillType].name"
              class="skill-type-icon"
            />
            <h4 class="skill-name">{{ skillTypes[skillType].name }}</h4>
            <div class="level-display">
              <span class="current-level">{{ skillTypes[skillType].current }}</span>
              <span class="level-arrow">→</span>
              <span class="target-level">{{ skillTypes[skillType].target }}</span>
            </div>
          </div>
          
          <div class="skill-sliders">
            <!-- Current Skill Level Slider -->
            <div class="slider-row">
              <span class="slider-label">Current</span>
              <input
                type="range"
                min="1"
                :max="skillTypes[skillType].maxLevel"
                class="skill-slider"
                :value="skillTypes[skillType].current"
                @input="(e) => updateSkillCurrent(skillType, parseInt((e.target as HTMLInputElement).value))"
              />
              <span class="slider-value">{{ skillTypes[skillType].current }}</span>
            </div>
            
            <!-- Target Skill Level Slider -->
            <div class="slider-row">
              <span class="slider-label">Target</span>
              <input
                type="range"
                min="1"
                :max="skillTypes[skillType].maxLevel"
                class="skill-slider"
                :value="skillTypes[skillType].target"
                @input="(e) => updateSkillTarget(skillType, parseInt((e.target as HTMLInputElement).value))"
              />
              <span class="slider-value">{{ skillTypes[skillType].target }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.skill-section {
  background: var(--card-background);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid var(--border-color);
  margin-bottom: 15px;
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 15px;
  color: var(--text-primary);
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
}

.skill-sliders-column {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.skill-type-section {
  background: var(--background-primary);
  border-radius: 8px;
  padding: 12px;
}

.skill-type-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.skill-type-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 50%;
  background-color: var(--background-secondary);
  padding: 4px;
}

.skill-name {
  font-size: 0.95em;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level-display {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: bold;
  font-size: 0.9em;
}

.level-arrow {
  color: var(--text-secondary);
}

.current-level {
  color: var(--text-secondary);
}

.target-level {
  color: var(--accent-color);
}

.skill-sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-label {
  font-size: 0.8em;
  color: var(--text-secondary);
  width: 50px;
}

.slider-value {
  font-size: 0.9em;
  color: var(--text-primary);
  width: 20px;
  text-align: center;
}

.skill-slider {
  flex: 1;
  height: 10px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--background-secondary);
  border-radius: 5px;
  outline: none;
}

.skill-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--accent-color);
  border-radius: 50%;
  cursor: pointer;
}

@media (max-width: 976px) {
  .skill-slider {
    height: 8px;
  }
  
  .skill-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
}
</style> 