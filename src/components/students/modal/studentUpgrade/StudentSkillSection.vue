<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import {
  SkillType,
  SkillSettings
} from '../../../../types/upgrade';
import '../../../../styles/studentUpgrade.css';
import { currentLanguage } from '../../../../consumables/stores/localizationStore';
import { $t } from '../../../../locales';
import { getStudentData } from '../../../../consumables/stores/studentStore';

const props = defineProps<{
  student: Record<string, any> | null,
  skillLevels: Record<string, { current: number; target: number; }>,
  allSkillsMaxed: boolean;
  targetSkillsMaxed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-skill', type: SkillType, current: number, target: number): void;
  (e: 'toggle-max-skills', checked: boolean): void;
  (e: 'toggle-max-target', checked: boolean): void;
}>();

const studentData = computed(() => {
  if (!props.student?.Id) return null;
  return getStudentData(props.student.Id);
});

const useExtraExSkill = ref(false);

const hasExtraExSkill = computed(() => {
  return props.student?.Skills?.Ex?.ExtraSkills && props.student.Skills.Ex.ExtraSkills.length > 0;
});

// Create skill settings for each type
const skillTypes = ref<Record<SkillType, SkillSettings>>({
  Ex: {
    current: props.skillLevels.Ex?.current || 1,
    target: props.skillLevels.Ex?.target || 1,
    icon: props.student?.Skills?.Ex?.Icon,
    name: 'EX Skill',
    maxLevel: props.student?.Skills?.Ex?.Parameters?.[0]?.length ||
      props.student?.Skills?.Ex?.ExtraSkills?.[0]?.Parameters?.[0]?.length || 5
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
      const skillData = useExtraExSkill.value && student.Skills.Ex.ExtraSkills?.[0] 
        ? student.Skills.Ex.ExtraSkills[0] 
        : student.Skills.Ex;

      skillTypes.value.Ex.icon = skillData.Icon;
      skillTypes.value.Ex.name = skillData.Name;
      skillTypes.value.Ex.maxLevel = student.Skills.Ex.Parameters?.[0]?.length ||
        student.Skills.Ex.ExtraSkills?.[0]?.Parameters?.[0]?.length || 5;
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
    
    // Update Extra Passive skill
    if (student.Skills.ExtraPassive) {
      skillTypes.value.ExtraPassive.icon = student.Skills.ExtraPassive.Icon;
      skillTypes.value.ExtraPassive.name = student.Skills.ExtraPassive.Name;
      skillTypes.value.ExtraPassive.maxLevel = student.Skills.ExtraPassive.Parameters?.[0]?.length;
    }
  }
}, { immediate: true });

// Watch for toggle state changes to update icon/name immediately
watch(useExtraExSkill, () => {
  if (props.student?.Skills?.Ex) {
    const skillData = useExtraExSkill.value && props.student.Skills.Ex.ExtraSkills?.[0] 
      ? props.student.Skills.Ex.ExtraSkills[0] 
      : props.student.Skills.Ex;
    
    skillTypes.value.Ex.icon = skillData.Icon;
    skillTypes.value.Ex.name = skillData.Name;
  }
});

// Watch for changes in the store
watch(() => studentData.value, () => {
}, { deep: true });

const gradeLevel = computed(() => {
  return studentData.value?.gradeLevels?.current || 0;
});

const isPassiveEnhanced = computed(() => {
  return gradeLevel.value >= 7;
});

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

// Refactored function to format the skill description
const formatSkillDescription = (skill: any, current: number, target: number) => {
  if (!skill || !skill.Desc || !skill.Parameters) return '';
  
  let formattedDesc = skill.Desc;
  const parameters = skill.Parameters;
  
  // First replace parameter placeholders with current/target values
  parameters.forEach((paramGroup: any[], groupIndex: number) => {
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
  
  // Handle knockback tag <kb:value> by finding Knockback effect and its scale value
  formattedDesc = formattedDesc.replace(/<kb:(\d+)>/g, (match: string, valueIndex: string) => {
    const indexNum = parseInt(valueIndex);
    if (!skill.Effects) return match;
    
    // Find the Knockback effect
    const knockbackEffect = skill.Effects.find((effect: any) => effect.Type === "Knockback");
    if (!knockbackEffect || !knockbackEffect.Scale) {
      return match;
    }
    
    // Calculate the sum of all knockback values up to the specified index
    let knockbackSum = 0;
    for (let i = 0; i <= indexNum && i < knockbackEffect.Scale.length; i++) {
      knockbackSum += knockbackEffect.Scale[i] || 0;
    }
    
    // Return a fixed format with the sum value and "units"
    return `${knockbackSum} units`;
  });
  
  // Process special tags with localization data
  formattedDesc = formattedDesc.replace(/<([bcds]):([^>]+)>/g, 
    (match: string, tagType: string, value: string) => {
    // Handle special tags according to the rules
    let prefix = '';
    
    switch (tagType) {
      case 'b': prefix = 'Buff_'; break;
      case 'd': prefix = 'Debuff_'; break;
      case 'c': prefix = 'CC_'; break;
      case 's': prefix = 'Special_'; break;
    }
    
    // Fetch the localized name
    const key = prefix + value;
    const localizedName = fetchLocalizedBuffName(key);
    
    if (localizedName) {
      return localizedName;
    }
  });
  
  return formattedDesc;
};

// Get the appropriate skill data - use WeaponPassive when enhanced, otherwise use the original skill
const getSkillData = (skillType: SkillType) => {
  if (skillType === 'Passive' && isPassiveEnhanced.value && props.student?.Skills?.WeaponPassive) {
    return props.student.Skills.WeaponPassive;
  }

  if (skillType === 'Ex' && useExtraExSkill.value && props.student?.Skills?.Ex?.ExtraSkills?.[0]) {
    return props.student.Skills.Ex.ExtraSkills[0];
  }

  return props.student?.Skills?.[skillType];
};

// Get skill description - use WeaponPassive description when enhanced
const getSkillDescription = (skillType: SkillType, current: number, target: number) => {
  const skill = getSkillData(skillType);
  return formatSkillDescription(skill, current, target);
};

// Get skill cost - use ExtraSkills cost when Ex skill toggle is active, 
// WeaponPassive doesn't have cost for Passive
interface SkillData {
  Cost?: number[];
  [key: string]: any;
}

const getSkillCost = (skillType: SkillType, current: number, target: number): string => {
  let skill: SkillData | undefined;

  if (
    skillType === 'Ex' &&
    useExtraExSkill.value &&
    props.student?.Skills?.Ex?.ExtraSkills?.[0]
  ) {
    // Use ExtraSkills cost when toggle is active
    skill = props.student.Skills.Ex.ExtraSkills[0] as SkillData;
  } else {
    // Use original skill cost for all other cases
    skill = props.student?.Skills?.[skillType] as SkillData;
  }

  return skill?.Cost ? formatSkillCost(skill.Cost, current, target) : '';
};

// Cache for localization data to avoid repeated fetching
const localizationCache = ref<Record<string, any> | null>(null);

// Function to fetch localized buff names from the schaledb
const fetchLocalizedBuffName = (key: string) => {
  // If we already have the data cached, use it
  if (localizationCache.value && localizationCache.value.BuffName && localizationCache.value.BuffName[key]) {
    return localizationCache.value.BuffName[key];
  }
  
  // If cache is empty, fetch the data
  if (!localizationCache.value) {
    // We'll use a Promise to handle this asynchronously
    const lang = currentLanguage.value;
    fetch(`https://schaledb.com/data/${lang}/localization.json`)
      .then(response => response.json())
      .then(data => {
        localizationCache.value = data;
      })
      .catch(error => {
        console.error('Error fetching localization data:', error);
      });
    
    // Return the original key for now until we have the data
    return key.replace(/^(Buff_|Debuff_|CC_|Special_)/, '');
  }
  
  // If we have the cache but the key doesn't exist
  return key.replace(/^(Buff_|Debuff_|CC_|Special_)/, '');
};

// Load localization data on component mount
onMounted(() => {
  const lang = currentLanguage.value;
  fetch(`https://schaledb.com/data/${lang}/localization.json`)
    .then(response => response.json())
    .then(data => {
      localizationCache.value = data;
    })
    .catch(error => {
      console.error('Error fetching localization data:', error);
    });
});

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

// Add this function to handle level display state
const getLevelDisplayState = (current: number, target: number, maxLevel: number) => {
  if (current === maxLevel && target === maxLevel) {
    return 'max';
  } else if (current === target) {
    return 'same';
  } else {
    return 'different';
  }
};

// Add this function to check if target is at max level
const isTargetMaxLevel = (target: number, maxLevel: number) => {
  return target === maxLevel;
};

// Track which skill sliders are being hovered
const hoveredSkill = ref<SkillType | null>(null);

// Set the currently hovered skill
const setHoveredSkill = (skillType: SkillType | null) => {
  hoveredSkill.value = skillType;
};

// Check if a slider should be shown (either always show current, or show target only when hovered or current !== target)
const shouldShowTargetSlider = (skillType: SkillType) => {
  const skill = skillTypes.value[skillType];
  return hoveredSkill.value === skillType || skill.current !== skill.target;
};

const toggleExtraExSkill = () => {
  useExtraExSkill.value = !useExtraExSkill.value;
};

watch(() => props.student, () => {
  useExtraExSkill.value = false;
});

// Watch for language changes and update localization data
watch(currentLanguage, (newLanguage) => {
  // Clear current cache to force a reload
  localizationCache.value = null;
  
  // Reload localization data with the new language
  fetch(`https://schaledb.com/data/${newLanguage}/localization.json`)
    .then(response => response.json())
    .then(data => {
      localizationCache.value = data;
    })
    .catch(error => {
      console.error(`Error fetching localization data for language ${newLanguage}:`, error);
    });
});
</script>

<template>
  <div class="upgrade-section">
    <h3 class="section-title">
      {{ $t('skills') }}
      <div class="options-container">
        <div class="max-all-container">
          <input
            type="checkbox"
            id="max-all-skills"
            name="max-all-skills"
            :checked="props.allSkillsMaxed"
            @change="handleMaxAllSkillsChange"
          />
          <label for="max-all-skills">{{ $t('maxAllSkills') }}</label>
        </div>
        <div class="max-all-container">
          <input
            type="checkbox"
            id="max-target-skills"
            name="max-target-skills"
            :checked="props.targetSkillsMaxed"
            @change="handleMaxTargetSkillsChange"
          />
          <label for="max-target-skills">{{ $t('maxTargetSkills') }}</label>
        </div>
      </div>
    </h3>
    
    <div class="sliders-column">
      <template 
        v-for="(skillType, index) in ['Ex', 'Public', 'Passive', 'ExtraPassive'] as SkillType[]" :key="index">
        <div class="type-section">
          <!-- Special header for Ex skill with toggle -->
          <div class="type-header" v-if="skillType === 'Ex'">
            <div class="skill-name-container">
              <h4 class="skill-name">{{ skillTypes[skillType].name }}</h4>
              <!-- Toggle button for ExtraSkills - only show if available -->
              <button 
                v-if="hasExtraExSkill"
                @click="toggleExtraExSkill"
                class="ex-toggle-btn"
                :class="{ active: useExtraExSkill }"
                :title="useExtraExSkill ? $t('skillToggle.normal') : $t('skillToggle.enhanced')"
              >
                {{ useExtraExSkill ? 'II' : 'I' }}
              </button>
            </div>
            <div class="level-display">
              <template v-if="getLevelDisplayState(
                skillTypes[skillType].current, 
                skillTypes[skillType].target, 
                skillTypes[skillType].maxLevel
              ) === 'max'">
                <span class="max-level">{{ $t('max') }}</span>
              </template>
              
              <template v-else-if="getLevelDisplayState(
                skillTypes[skillType].current, 
                skillTypes[skillType].target, 
                skillTypes[skillType].maxLevel
              ) === 'same'">
                <span class="target-level">{{ skillTypes[skillType].current }}</span>
              </template>
              
              <template v-else>
                <span class="current-level">{{ skillTypes[skillType].current }}</span>
                <span class="level-arrow">→</span>
                <span class="target-level">{{ skillTypes[skillType].target }}</span>
                <span class="max-indicator" 
                  v-if="isTargetMaxLevel(skillTypes[skillType].target, skillTypes[skillType].maxLevel)">
                  {{ $t('max') }}
                </span>
              </template>
            </div>
          </div>

          <!-- Regular header for other skills -->
          <div class="type-header" v-else>
            <h4 class="skill-name">{{ skillTypes[skillType].name }}</h4>
            <div class="level-display">
              <template v-if="getLevelDisplayState(
                skillTypes[skillType].current, 
                skillTypes[skillType].target, 
                skillTypes[skillType].maxLevel
              ) === 'max'">
                <span class="max-level">{{ $t('max') }}</span>
              </template>
              
              <template v-else-if="getLevelDisplayState(
                skillTypes[skillType].current, 
                skillTypes[skillType].target, 
                skillTypes[skillType].maxLevel
              ) === 'same'">
                <span class="target-level">{{ skillTypes[skillType].current }}</span>
              </template>
              
              <template v-else>
                <span class="current-level">{{ skillTypes[skillType].current }}</span>
                <span class="level-arrow">→</span>
                <span class="target-level">{{ skillTypes[skillType].target }}</span>
                <span class="max-indicator" 
                  v-if="isTargetMaxLevel(skillTypes[skillType].target, skillTypes[skillType].maxLevel)">
                  {{ $t('max') }}
                </span>
              </template>
            </div>
          </div>
          
          <div class="content-container">
            <div class="skill-icon-wrapper">
              <svg 
                data-v-0f12ca96="" 
                xml:space="preserve" 
                viewBox="0 0 37.6 37.6" 
                version="1.1" 
                height="64" 
                width="64" 
                xmlns="http://www.w3.org/2000/svg" 
                class="skill-bg"
                :class="{
                  'bg-explosive': props.student?.BulletType === 'Explosion',
                  'bg-piercing': props.student?.BulletType === 'Pierce',
                  'bg-mystic': props.student?.BulletType === 'Mystic',
                  'bg-sonic': props.student?.BulletType === 'Sonic'
                }"
              >
                <path 
                  xmlns="http://www.w3.org/2000/svg" 
                  d="m18.8 0c-0.96 0-1.92 0.161-2.47 0.481l-13.1 7.98c-1.13 0.653-1.81 1.8-1.81 3.03v14.6c0 1.23 0.684 2.37 1.81 3.03l13.1 7.98c1.11 0.642 3.85 0.665 4.95 0l13.1-7.98c1.11-0.677 1.81-1.8 1.81-3.03v-14.6c0-1.23-0.699-2.35-1.81-3.03l-13.1-7.98c-0.554-0.321-1.51-0.481-2.47-0.481z"
                />
              </svg>
              <img 
                :src="getSkillIconUrl(skillTypes[skillType].icon)"
                :alt="skillTypes[skillType].name"
                class="skill-fg"
                @mouseenter="showTooltip($event, skillType)"
                @mouseleave="hideTooltip"
              />
              <!-- Enhanced overlay for Passive and ExtraPassive skills -->
              <div 
                v-if="(skillType === 'Passive') && isPassiveEnhanced"
                class="enhanced-overlay"
              >
                +
              </div>
              <div 
                class="skill-tooltip"
                :style="tooltipStyle"
                v-show="activeTooltip === skillType"
              >
                <div class="tooltip-content">
                  <div class="tooltip-cost" v-if="getSkillCost(skillType, skillTypes[skillType].current, skillTypes[skillType].target)">
                    {{ $t('cost') }}: <span v-html="getSkillCost(
                      skillType,
                      skillTypes[skillType].current,
                      skillTypes[skillType].target
                    )"></span>
                  </div>
                  <div class="tooltip-desc" v-html="getSkillDescription(
                    skillType,
                    skillTypes[skillType].current,
                    skillTypes[skillType].target
                  )"></div>
                </div>
              </div>
            </div>
            
            <div 
              class="sliders" 
              @mouseenter="setHoveredSkill(skillType)" 
              @mouseleave="setHoveredSkill(null)"
            >
              <!-- Current Skill Level Slider -->
              <div class="slider-row">
                <span class="slider-label">{{ skillTypes[skillType].current === skillTypes[skillType].target ? $t('level') : $t('current') }}</span>
                <input
                  type="range"
                  min="1"
                  :max="skillTypes[skillType].maxLevel"
                  class="slider"
                  :name="`skill-current-${skillType}`"
                  :value="skillTypes[skillType].current"
                  @input="(e) => updateSkillCurrent(skillType, parseInt((e.target as HTMLInputElement).value))"
                />
              </div>
              
              <!-- Target Skill Level Slider - Only show when hovering or current !== target -->
              <div 
                class="slider-row target-slider"
                v-show="shouldShowTargetSlider(skillType)"
                :class="{ 'fade-in': hoveredSkill === skillType }"
              >
                <span class="slider-label">{{ $t('target') }}</span>
                <input
                  type="range"
                  min="1"
                  :max="skillTypes[skillType].maxLevel"
                  class="slider"
                  :name="`skill-target-${skillType}`"
                  :value="skillTypes[skillType].target"
                  @input="(e) => updateSkillTarget(skillType, parseInt((e.target as HTMLInputElement).value))"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Add these styles to your existing styles */
.target-slider {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-in {
  animation: fadeIn 0.2s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Component-specific styles */
.options-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.max-all-container {
  display: flex;
  align-items: center;
  gap: 2px;
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

.content-container {
  display: flex;
  gap: 15px;
  align-items: center;
  padding-right: 20px;
}

.skill-icon-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 54px;
  height: 54px;
}

.skill-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.skill-bg.bg-explosive path {
  fill: rgb(167, 12, 25);
}

.skill-bg.bg-piercing path {
  fill: rgb(178, 109, 31);
}

.skill-bg.bg-mystic path {
  fill: rgb(33, 111, 156);
}

.skill-bg.bg-sonic path {
  fill: rgb(148, 49, 165);
}

.skill-fg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  z-index: 2;
  padding: 2px;
}

img, svg {
  vertical-align: middle;
}

/* Modified style for the enhanced overlay */
.enhanced-overlay {
  position: absolute;
  top: 2px;
  right: -4px;
  width: 15px;
  height: 15px;
  color: white;
  font-size: 15px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  z-index: 3;
  pointer-events: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  line-height: 1;
}

/* Background colors based on bullet type */
.bg-explosive + .skill-fg + .enhanced-overlay {
  background-color: rgb(167, 12, 25);
}

.bg-piercing + .skill-fg + .enhanced-overlay {
  background-color: rgb(178, 109, 31);
}

.bg-mystic + .skill-fg + .enhanced-overlay {
  background-color: rgb(33, 111, 156);
}

.bg-sonic + .skill-fg + .enhanced-overlay {
  background-color: rgb(148, 49, 165);
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
  pointer-events: none;
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

.skill-name {
  font-size: 0.95em;
  white-space: normal;
  font-weight: bold;
}

.skill-name-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ex-toggle-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.ex-toggle-btn:hover {
  background: var(--hover-bg);
  border-color: var(--accent-color);
}

.ex-toggle-btn.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.ex-toggle-btn.active:hover {
  background: var(--accent-color-hover);
}

.ex-toggle-btn:focus {
  outline: none;
}

.sliders {
  flex: 1;
}

.slider-value {
  font-size: 0.9em;
  color: var(--text-primary);
  width: 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .content-container {
    padding-right: 10px;
  }
  
  .skill-icon-wrapper {
    align-self: center;
  }
  
  .sliders {
    width: 100%;
  }
}

@media (max-width: 500px) {
  :deep(.section-title) {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .options-container {
    width: 100%;
    gap: 0px;
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 350px) {
  .sliders {
    gap: 3px;
  }
}
</style>