<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { SkillType } from '../../../../types/upgrade';
import { currentLanguage } from '../../../../consumables/stores/localizationStore';
import { $t } from '../../../../locales';
import { getStudentData } from '../../../../consumables/stores/studentStore';
import {
  formatSkillDescription as sharedFormatSkillDescription,
  formatSkillCost as sharedFormatSkillCost,
  calculateTooltipPosition,
  fetchLocalizationData
} from '../../../../consumables/utils/upgradeUtils';
import { getBulletTypeColor } from '../../../../consumables/utils/colorUtils';

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

// Checkbox handlers
const handleMaxAllSkillsChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  emit('toggle-max-skills', checked);
};

const handleMaxTargetSkillsChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  emit('toggle-max-target', checked);
};

const studentData = computed(() => {
  if (!props.student?.Id) return null;
  return getStudentData(props.student.Id);
});

const useExtraExSkill = ref(false);

const hasExtraExSkill = computed(() => {
  return props.student?.Skills?.Ex?.ExtraSkills
    && props.student.Skills.Ex.ExtraSkills.length > 0;
});

// Helper functions to derive skill properties from props
const getSkillIcon = (skillType: SkillType): string => {
  if (skillType === 'Ex' && useExtraExSkill.value && props.student?.Skills?.Ex?.ExtraSkills?.[0]) {
    return props.student.Skills.Ex.ExtraSkills[0].Icon ?? '';
  }
  return props.student?.Skills?.[skillType]?.Icon ?? '';
};

const getSkillName = (skillType: SkillType): string => {
  if (skillType === 'Ex' && useExtraExSkill.value && props.student?.Skills?.Ex?.ExtraSkills?.[0]) {
    return props.student.Skills.Ex.ExtraSkills[0].Name ?? 'EX Skill';
  }
  return props.student?.Skills?.[skillType]?.Name ?? skillType;
};

const getMaxLevel = (skillType: SkillType): number => {
  const skill = props.student?.Skills?.[skillType];
  if (skillType === 'Ex') {
    return skill?.Parameters?.[0]?.length ||
      props.student?.Skills?.Ex?.ExtraSkills?.[0]?.Parameters?.[0]?.length || 5;
  }
  return skill?.Parameters?.[0]?.length ?? 10;
};

const gradeLevel = computed(() => {
  return studentData.value?.gradeLevels?.current || 0;
});

const isPassiveEnhanced = computed(() => {
  return gradeLevel.value >= 7;
});

const exclusiveGearLevel = computed(() => {
  return studentData.value?.exclusiveGearLevel?.current || 0;
});

const isBasicEnhanced = computed(() => {
  return exclusiveGearLevel.value >= 2;
});

// Handle skill level changes (using props directly, no internal state)
const updateSkillCurrent = (type: SkillType, value: number) => {
  const maxLevel = getMaxLevel(type);
  if (value >= 1 && value <= maxLevel) {
    const currentTarget = props.skillLevels[type]?.target ?? 1;
    // Ensure target is always >= current
    const newTarget = Math.max(value, currentTarget);
    emit('update-skill', type, value, newTarget);
  }
};

const updateSkillTarget = (type: SkillType, value: number) => {
  const maxLevel = getMaxLevel(type);
  if (value >= 1 && value <= maxLevel) {
    const currentLevel = props.skillLevels[type]?.current ?? 1;
    // Ensure current is always <= target
    if (currentLevel > value) {
      emit('update-skill', type, value, value);
    } else {
      emit('update-skill', type, currentLevel, value);
    }
  }
};

// Format skill icon URL
const getSkillIconUrl = (iconName: string) => {
  return `https://schaledb.com/images/skill/${iconName}.webp`;
};

// Cache for localization data
const localizationCache = ref<Record<string, any> | null>(null);

onMounted(() => {
  fetchLocalizationData(currentLanguage.value).then(data => {
    localizationCache.value = data;
  });
});

// Get the appropriate skill data
const getSkillData = (skillType: SkillType) => {
  if (skillType === 'Passive' && isPassiveEnhanced.value && props.student?.Skills?.WeaponPassive) {
    return props.student.Skills.WeaponPassive;
  }

  if (skillType === 'Public' && isBasicEnhanced.value && props.student?.Skills?.GearPublic) {
    return props.student.Skills.GearPublic;
  }

  if (skillType === 'Ex' && useExtraExSkill.value && props.student?.Skills?.Ex?.ExtraSkills?.[0]) {
    return props.student.Skills.Ex.ExtraSkills[0];
  }

  return props.student?.Skills?.[skillType];
};

const getSkillDescription = (skillType: SkillType, current: number, target: number) => {
  const skill = getSkillData(skillType);
  return sharedFormatSkillDescription(skill, current, target, localizationCache.value);
};

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
    skill = props.student.Skills.Ex.ExtraSkills[0] as SkillData;
  } else {
    skill = props.student?.Skills?.[skillType] as SkillData;
  }

  return skill?.Cost ? sharedFormatSkillCost(skill.Cost, current, target) : '';
};

// Tooltip handling
const activeTooltip = ref<SkillType | null>(null);
const tooltipStyle = ref({ top: '0px', left: '0px' });

const showTooltip = (event: MouseEvent, skillType: SkillType) => {
  tooltipStyle.value = calculateTooltipPosition(event, 250, 100);
  activeTooltip.value = skillType;
};

const hideTooltip = () => {
  activeTooltip.value = null;
};

// Level display helpers
const getLevelDisplayState = (current: number, target: number, maxLevel: number) => {
  if (current === maxLevel && target === maxLevel) {
    return 'max';
  } else if (current === target) {
    return 'same';
  } else {
    return 'different';
  }
};

const isTargetMaxLevel = (target: number, maxLevel: number) => {
  return target === maxLevel;
};

const toggleExtraExSkill = () => {
  useExtraExSkill.value = !useExtraExSkill.value;
};

watch(() => props.student, () => {
  useExtraExSkill.value = false;
});

watch(currentLanguage, (newLanguage) => {
  localizationCache.value = null;
  fetchLocalizationData(newLanguage).then(data => {
    localizationCache.value = data;
  });
});

const bulletTypeColor = computed(() => getBulletTypeColor(props.student?.BulletType));
</script>

<template>
  <div class="skill-section">
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

    <div class="skill-grid">
      <div
        v-for="skillType in ['Ex', 'Public', 'Passive', 'ExtraPassive'] as SkillType[]"
        :key="skillType"
        class="skill-item"
      >
        <!-- Current Level Control -->
        <div class="level-control">
          <div class="custom-number-input">
            <button
              class="control-button min-button"
              :class="{ disabled: (props.skillLevels[skillType]?.current ?? 1) <= 1 }"
              @click="updateSkillCurrent(skillType, 1)"
              :disabled="(props.skillLevels[skillType]?.current ?? 1) <= 1"
              :aria-label="$t('setMinLevel')"
            >
              <span>«</span>
            </button>
            <button
              class="control-button decrement-button"
              :class="{ disabled: (props.skillLevels[skillType]?.current ?? 1) <= 1 }"
              @click="updateSkillCurrent(skillType, (props.skillLevels[skillType]?.current ?? 1) - 1)"
              :disabled="(props.skillLevels[skillType]?.current ?? 1) <= 1"
              :aria-label="$t('decreaseLevel')"
            >
              <span>−</span>
            </button>
            <input
              type="number"
              :name="`skill-current-${skillType}`"
              :value="props.skillLevels[skillType]?.current ?? 1"
              @input="(e) => updateSkillCurrent(skillType, parseInt((e.target as HTMLInputElement).value))"
              :min="1"
              :max="getMaxLevel(skillType)"
              class="level-input current-level"
              :aria-label="`${$t('current')} ${getSkillName(skillType)}`"
            />
            <button
              class="control-button increment-button"
              :class="{ disabled: (props.skillLevels[skillType]?.current ?? 1) >= getMaxLevel(skillType) }"
              @click="updateSkillCurrent(skillType, (props.skillLevels[skillType]?.current ?? 1) + 1)"
              :disabled="(props.skillLevels[skillType]?.current ?? 1) >= getMaxLevel(skillType)"
              :aria-label="$t('increaseLevel')"
            >
              <span>+</span>
            </button>
            <button
              class="control-button max-button"
              :class="{ disabled: (props.skillLevels[skillType]?.current ?? 1) >= getMaxLevel(skillType) }"
              @click="updateSkillCurrent(skillType, getMaxLevel(skillType))"
              :disabled="(props.skillLevels[skillType]?.current ?? 1) >= getMaxLevel(skillType)"
              :aria-label="$t('setMaxLevel')"
            >
              <span>»</span>
            </button>
          </div>
        </div>

        <!-- Skill Icon -->
        <div class="skill-icon-container">
          <div class="skill-icon-wrapper">
            <svg
              xml:space="preserve"
              viewBox="0 0 37.6 37.6"
              version="1.1"
              height="64"
              width="64"
              xmlns="http://www.w3.org/2000/svg"
              class="skill-bg"
            >
              <path
                :style="{ fill: bulletTypeColor }"
                d="m18.8 0c-0.96 0-1.92 0.161-2.47 0.481l-13.1 7.98c-1.13 0.653-1.81 1.8-1.81 3.03v14.6c0 1.23 0.684 2.37 1.81 3.03l13.1 7.98c1.11 0.642 3.85 0.665 4.95 0l13.1-7.98c1.11-0.677 1.81-1.8 1.81-3.03v-14.6c0-1.23-0.699-2.35-1.81-3.03l-13.1-7.98c-0.554-0.321-1.51-0.481-2.47-0.481z"
              />
            </svg>
            <img
              :src="getSkillIconUrl(getSkillIcon(skillType))"
              :alt="getSkillName(skillType)"
              class="skill-fg"
              @mouseenter="showTooltip($event, skillType)"
              @mouseleave="hideTooltip"
            />
            <!-- Enhanced overlay for Passive skill -->
            <div
              v-if="skillType === 'Passive' && isPassiveEnhanced"
              class="enhanced-overlay"
              :style="{ backgroundColor: bulletTypeColor }"
            >
              +
            </div>
            <!-- Enhanced overlay for Public skill (GearPublic) -->
            <div
              v-if="skillType === 'Public' && isBasicEnhanced"
              class="enhanced-overlay"
              :style="{ backgroundColor: bulletTypeColor }"
            >
              +
            </div>
            <!-- EX skill toggle -->
            <button
              v-if="skillType === 'Ex' && hasExtraExSkill"
              @click="toggleExtraExSkill"
              class="ex-toggle-btn"
              :class="{ active: useExtraExSkill }"
              :title="useExtraExSkill ? $t('skillToggle.normal') : $t('skillToggle.enhanced')"
            >
              {{ useExtraExSkill ? 'II' : 'I' }}
            </button>
          </div>

          <!-- Level Display -->
          <div class="level-indicator">
            <template v-if="getLevelDisplayState(
              props.skillLevels[skillType]?.current ?? 1,
              props.skillLevels[skillType]?.target ?? 1,
              getMaxLevel(skillType)
            ) === 'max'">
              <span class="max-level">{{ $t('max') }}</span>
            </template>
            <template v-else-if="getLevelDisplayState(
              props.skillLevels[skillType]?.current ?? 1,
              props.skillLevels[skillType]?.target ?? 1,
              getMaxLevel(skillType)
            ) === 'same'">
              <span>Lv.{{ props.skillLevels[skillType]?.current ?? 1 }}</span>
            </template>
            <template v-else>
              <span class="current-level-text">Lv.{{ props.skillLevels[skillType]?.current ?? 1 }}</span>
              <span class="level-arrow">→</span>
              <span class="target-level-text" :class="{ 'max-level': isTargetMaxLevel(props.skillLevels[skillType]?.target ?? 1, getMaxLevel(skillType)) }">
                {{ props.skillLevels[skillType]?.target ?? 1 }}
              </span>
            </template>
          </div>
        </div>

        <!-- Target Level Control -->
        <div class="level-control">
          <div class="custom-number-input">
            <button
              class="control-button min-button"
              :class="{ disabled: (props.skillLevels[skillType]?.target ?? 1) <= 1 }"
              @click="updateSkillTarget(skillType, 1)"
              :disabled="(props.skillLevels[skillType]?.target ?? 1) <= 1"
              :aria-label="$t('setMinLevel')"
            >
              <span>«</span>
            </button>
            <button
              class="control-button decrement-button"
              :class="{ disabled: (props.skillLevels[skillType]?.target ?? 1) <= 1 }"
              @click="updateSkillTarget(skillType, (props.skillLevels[skillType]?.target ?? 1) - 1)"
              :disabled="(props.skillLevels[skillType]?.target ?? 1) <= 1"
              :aria-label="$t('decreaseLevel')"
            >
              <span>−</span>
            </button>
            <input
              type="number"
              :name="`skill-target-${skillType}`"
              :value="props.skillLevels[skillType]?.target ?? 1"
              @input="(e) => updateSkillTarget(skillType, parseInt((e.target as HTMLInputElement).value))"
              :min="1"
              :max="getMaxLevel(skillType)"
              class="level-input target-level"
              :class="{ 'max-level': isTargetMaxLevel(props.skillLevels[skillType]?.target ?? 1, getMaxLevel(skillType)) }"
              :aria-label="`${$t('target')} ${getSkillName(skillType)}`"
            />
            <button
              class="control-button increment-button"
              :class="{ disabled: (props.skillLevels[skillType]?.target ?? 1) >= getMaxLevel(skillType) }"
              @click="updateSkillTarget(skillType, (props.skillLevels[skillType]?.target ?? 1) + 1)"
              :disabled="(props.skillLevels[skillType]?.target ?? 1) >= getMaxLevel(skillType)"
              :aria-label="$t('increaseLevel')"
            >
              <span>+</span>
            </button>
            <button
              class="control-button max-button"
              :class="{ disabled: (props.skillLevels[skillType]?.target ?? 1) >= getMaxLevel(skillType) }"
              @click="updateSkillTarget(skillType, getMaxLevel(skillType))"
              :disabled="(props.skillLevels[skillType]?.target ?? 1) >= getMaxLevel(skillType)"
              :aria-label="$t('setMaxLevel')"
            >
              <span>»</span>
            </button>
          </div>
        </div>

        <!-- Skill Name -->
        <div class="skill-name">{{ getSkillName(skillType) }}</div>
      </div>
    </div>

    <!-- Tooltip -->
    <div
      class="skill-tooltip"
      :style="tooltipStyle"
      v-show="activeTooltip !== null"
    >
      <div class="tooltip-content" v-if="activeTooltip">
        <div class="tooltip-name">{{ getSkillName(activeTooltip) }}</div>
        <div class="tooltip-cost" v-if="getSkillCost(activeTooltip, props.skillLevels[activeTooltip]?.current ?? 1, props.skillLevels[activeTooltip]?.target ?? 1)">
          {{ $t('cost') }}: <span v-html="getSkillCost(
            activeTooltip,
            props.skillLevels[activeTooltip]?.current ?? 1,
            props.skillLevels[activeTooltip]?.target ?? 1
          )"></span>
        </div>
        <div class="tooltip-desc" v-html="getSkillDescription(
          activeTooltip,
          props.skillLevels[activeTooltip]?.current ?? 1,
          props.skillLevels[activeTooltip]?.target ?? 1
        )"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skill-section {
  padding: 1rem;
  margin-bottom: 15px;
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 1rem 0;
  font-size: 1.1em;
  color: var(--text-primary);
}

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

.skill-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.skill-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  background-color: var(--background-primary);
  padding: 0.5rem;
}

.level-control {
  width: 100%;
}

.custom-number-input {
  display: flex;
  align-items: center;
  background-color: var(--background-primary);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  height: 36px;
}

.level-input {
  flex: 1;
  height: 100%;
  padding: 0 0.25rem;
  border: none;
  background-color: transparent;
  color: var(--text-primary);
  text-align: center;
  font-weight: 600;
  font-size: 1rem;
  min-width: 0;
}

.level-input::-webkit-outer-spin-button,
.level-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.level-input:focus {
  outline: none;
  background-color: rgba(0, 0, 0, 0.02);
}

.level-input.max-level {
  color: var(--accent-color, #4a8af4);
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 36px;
  border: none;
  background-color: transparent;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0;
  font-size: 1.1rem;
  transition: background-color 0.2s, color 0.2s;
  flex-shrink: 0;
}

.control-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--accent-color, #4a8af4);
}

.control-button:active {
  background-color: rgba(0, 0, 0, 0.1);
}

.control-button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-button.disabled:hover {
  background-color: transparent;
  color: var(--text-primary);
}

.min-button,
.max-button {
  font-size: 0.9rem;
  font-weight: bold;
}

.skill-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.skill-icon-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
}

.skill-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
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
  cursor: pointer;
}

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

.ex-toggle-btn {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  z-index: 3;
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

.level-indicator {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.level-indicator .max-level {
  color: var(--accent-color, #4a8af4);
}

.level-indicator .level-arrow {
  margin: 0 2px;
  color: var(--text-secondary);
}

.level-indicator .target-level-text.max-level {
  color: var(--accent-color, #4a8af4);
}

.skill-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.tooltip-name {
  font-weight: bold;
  font-size: 1em;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color);
}

.tooltip-cost {
  font-weight: bold;
  margin-bottom: 4px;
}

.tooltip-desc {
  white-space: pre-wrap;
}

@media (max-width: 768px) {
  .skill-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}

@media (max-width: 500px) {
  .section-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .options-container {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 0px;
  }

  .skill-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .control-button {
    width: 20px;
  }
}

@media (max-width: 350px) {
  .skill-grid {
    grid-template-columns: 1fr;
  }
}
</style>
