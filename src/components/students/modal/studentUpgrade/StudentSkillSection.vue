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
  allSkillsMaxed: boolean;
  targetSkillsMaxed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-skill', type: SkillType, current: number, target: number): void;
  (e: 'toggle-max-skills', checked: boolean): void;
  (e: 'toggle-max-target', checked: boolean): void;
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

// Add this function to format the skill description
const formatSkillDescription = (desc: string, parameters: any[][], current: number, target: number) => {
  if (!desc || !parameters) return '';
  
  // First process the special tags before handling parameters
  let formattedDesc = desc;
  
  // 1. Handle <b:Tag> format by adding spaces before capital letters and removing tags
  formattedDesc = formattedDesc.replace(/<b:([^>]+)>/g, (match, tagContent) => {
    // Add spaces before capital letters (except the first one)
    return tagContent.replace(/([A-Z])/g, (_, capital, index) => {
      return index > 0 ? ' ' + capital : capital;
    });
  });
  
  // 2. Handle <s:Tag> which references skill names - for simplicity, just remove these tags
  formattedDesc = formattedDesc.replace(/<s:[^>]+>/g, '');
  
  // 3. Handle any other tags that might be present (except parameter placeholders)
  formattedDesc = formattedDesc.replace(/<(?!\?)[^>]+>/g, '');
  
  // Now replace parameter placeholders with current/target values
  parameters.forEach((paramGroup, groupIndex) => {
    const currentValue = paramGroup[current - 1] || paramGroup[0];
    const targetValue = paramGroup[target - 1] || paramGroup[0];
    const placeholder = `<?${groupIndex + 1}>`;
    
    // If current and target are the same, just show a single value
    if (current === target) {
      formattedDesc = formattedDesc.replace(
        placeholder,
        `<span style="color: var(--accent-color)">${currentValue}</span>`
      );
    } else {
      formattedDesc = formattedDesc.replace(
        placeholder,
        `${currentValue}/<span style="color: var(--accent-color)">${targetValue}</span>`
      );
    }
  });
  
  return formattedDesc;
};

// Add this function to format the skill cost
const formatSkillCost = (cost: number[], current: number, target: number) => {
  if (!cost || !cost.length) return '';
  const currentValue = cost[current - 1] || cost[0];
  const targetValue = cost[target - 1] || cost[0];
  
  // If current and target are the same, just show a single value
  if (current === target) {
    return `<span style="color: var(--accent-color)">${currentValue}</span>`;
  } else {
    return `${currentValue}/<span style="color: var(--accent-color)">${targetValue}</span>`;
  }
};

// Add these refs for tooltip positioning
const activeTooltip = ref<SkillType | null>(null);
const tooltipStyle = ref({
  top: '0px',
  left: '0px'
});

// Add these methods for tooltip handling
const showTooltip = (event: MouseEvent, skillType: SkillType) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const tooltipWidth = 250; // Approximate width of tooltip
  const tooltipHeight = 100; // Approximate height of tooltip
  
  // Calculate position
  let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
  let top = rect.top - tooltipHeight - 10; // 10px gap
  
  // Adjust if tooltip would go off screen
  if (left < 0) left = 0;
  if (left + tooltipWidth > window.innerWidth) {
    left = window.innerWidth - tooltipWidth;
  }
  
  // If tooltip would go off top of screen, show below instead
  if (top < 0) {
    top = rect.bottom + 10;
  }
  
  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  };
  
  activeTooltip.value = skillType;
};

const hideTooltip = () => {
  activeTooltip.value = null;
};

// Handle max all skills checkbox change
const handleMaxAllSkillsChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  emit('toggle-max-skills', checked);
};

// Handle max target skills checkbox change
const handleMaxTargetSkillsChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  emit('toggle-max-target', checked);
};
</script>

<template>
  <div class="skill-section">
    <h3 class="section-title">
      Skill Upgrade Calculator
      <div class="options-container">
        <div class="max-all-container">
          <input
            type="checkbox"
            id="max-all-skills"
            name="max-all-skills"
            :checked="props.allSkillsMaxed"
            @change="handleMaxAllSkillsChange"
          />
          <label for="max-all-skills">Max All Skills</label>
        </div>
        <div class="max-all-container">
          <input
            type="checkbox"
            id="max-target-skills"
            name="max-target-skills"
            :checked="props.targetSkillsMaxed"
            @change="handleMaxTargetSkillsChange"
          />
          <label for="max-target-skills">Max Target Skills</label>
        </div>
      </div>
    </h3>
    
    <div class="skill-sliders-column">
      <template v-for="(skillType, index) in ['Ex', 'Public', 'Passive', 'ExtraPassive'] as SkillType[]" :key="index">
        <div class="skill-type-section">
          <div class="skill-type-header">
            <div class="skill-icon-wrapper">
              <img 
                :src="getSkillIconUrl(skillTypes[skillType].icon)"
                :alt="skillTypes[skillType].name"
                class="skill-type-icon"
                :class="{
                  'icon-background-explosive': props.student?.BulletType === 'Explosion',
                  'icon-background-piercing': props.student?.BulletType === 'Pierce',
                  'icon-background-mystic': props.student?.BulletType === 'Mystic',
                  'icon-background-sonic': props.student?.BulletType === 'Sonic'
                }"
                @mouseenter="showTooltip($event, skillType)"
                @mouseleave="hideTooltip"
              />
              <div 
                class="skill-tooltip"
                :style="tooltipStyle"
                v-show="activeTooltip === skillType"
              >
                <div class="tooltip-content">
                  <div class="tooltip-cost" v-if="props.student?.Skills?.[skillType]?.Cost">
                    Cost: <span v-html="formatSkillCost(
                      props.student.Skills[skillType].Cost,
                      skillTypes[skillType].current,
                      skillTypes[skillType].target
                    )"></span>
                  </div>
                  <div class="tooltip-desc" v-html="formatSkillDescription(
                    props.student?.Skills?.[skillType]?.Desc,
                    props.student?.Skills?.[skillType]?.Parameters,
                    skillTypes[skillType].current,
                    skillTypes[skillType].target
                  )"></div>
                </div>
              </div>
            </div>
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
                :name="`skill-current-${skillType}`"
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
                :name="`skill-target-${skillType}`"
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.options-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.max-all-container {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  color: var(--text-secondary);
}

.max-all-container input[type="checkbox"] {
  cursor: pointer;
}

.max-all-container label {
  cursor: pointer;
  user-select: none;
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

.skill-icon-wrapper {
  position: relative;
}

.skill-tooltip {
  position: fixed;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px;
  min-width: 200px;
  max-width: 300px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  pointer-events: none; /* Prevent tooltip from interfering with hover */
}

.skill-icon-wrapper:hover .skill-tooltip {
  opacity: 1;
  visibility: visible;
}

.tooltip-content {
  font-size: 0.9em;
  line-height: 1.4;
  color: var(--text-primary);
}

.tooltip-cost {
  font-weight: bold;
  margin-bottom: 4px;
}

.tooltip-desc {
  white-space: pre-wrap;
}

.skill-type-icon {
  width: 40px;
  height: 40px;
  border-radius: 20%;
  padding: 4px;
  transition: background-color 0.3s ease;
}

.icon-background-explosive {
  background-color: rgb(167, 12, 25);
}

.icon-background-piercing {
  background-color: rgb(178, 109, 31);
}

.icon-background-mystic {
  background-color: rgb(33, 111, 156);
}

.icon-background-sonic {
  background-color: rgb(148, 49, 165);
}

.skill-name {
  font-size: 0.95em;
  white-space: nowrap;
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