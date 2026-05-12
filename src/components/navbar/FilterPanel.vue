<script setup lang="ts">
import { StudentFilters } from '@/types/filter';
import { $t } from '@/locales';
import { computed } from 'vue';
import { getSchoolIconUrl, getEquipmentSlotIconUrl } from '@/consumables/utils/iconUtils';
import {
  useFilterLabels,
  SQUAD_TYPE_KEYS,
  STAR_GRADE_VALUES,
  BULLET_TYPE_KEYS,
  ARMOR_TYPE_KEYS,
  EQUIPMENT_TYPE_KEYS,
  AVAILABILITY_OPTIONS,
  OTHER_SCHOOL_KEYS,
  isOtherSchool,
} from '@/composables/useFilterLabels';

const props = defineProps<{
  filters: StudentFilters;
  availableSchools: string[];
}>();

const emit = defineEmits<{
  'updateFilter': [key: keyof StudentFilters, value: any[]];
  'clearAll': [];
}>();

const { getSquadLabel, getBulletLabel, getArmorLabel, getSchoolLabel, getSquadColor, getBulletColor, getArmorColor } = useFilterLabels();

// Schools shown as individual chips (excludes the "Other" group)
const mainSchools = computed(() => props.availableSchools.filter(s => !isOtherSchool(s)));
// "Other" chip is shown only when at least one of the grouped schools is present in the data
const hasOtherSchools = computed(() => props.availableSchools.some(isOtherSchool));

const isOtherActive = computed(() =>
  OTHER_SCHOOL_KEYS.some(k => props.filters.school.includes(k))
);

function toggle(key: keyof StudentFilters, value: string | number) {
  const current = [...(props.filters[key] as (string | number)[])];
  const idx = current.indexOf(value as never);
  if (idx === -1) current.push(value as never);
  else current.splice(idx, 1);
  emit('updateFilter', key, current);
}

function isActive(key: keyof StudentFilters, value: string | number): boolean {
  return (props.filters[key] as (string | number)[]).includes(value as never);
}

function toggleOtherSchools() {
  const current = props.filters.school.filter(k => !isOtherSchool(k));
  if (isOtherActive.value) {
    emit('updateFilter', 'school', current);
  } else {
    const toAdd = OTHER_SCHOOL_KEYS.filter(k => props.availableSchools.includes(k));
    emit('updateFilter', 'school', [...current, ...toAdd]);
  }
}
</script>

<template>
  <div class="filter-panel">
    <div class="filter-panel-header">
      <span class="filter-panel-title">{{ $t('filter.title') }}</span>
      <button class="filter-clear-btn" type="button" @click="emit('clearAll')">
        {{ $t('filter.clearAll') }}
      </button>
    </div>

    <div class="filter-panel-body">
      <!-- Type -->
      <div class="filter-section">
        <div class="filter-section-label">{{ $t('filter.type') }}</div>
        <div class="filter-chips">
          <button
            v-for="key in SQUAD_TYPE_KEYS"
            :key="key"
            class="filter-chip filter-chip--squad font-nexon"
            :class="{ active: isActive('squadType', key) }"
            :style="isActive('squadType', key)
              ? { backgroundColor: getSquadColor(key), borderColor: getSquadColor(key), color: 'white' }
              : { borderColor: getSquadColor(key), color: getSquadColor(key) }"
            type="button"
            @click="toggle('squadType', key)"
          ><span class="squad-label">{{ getSquadLabel(key) }}</span></button>
        </div>
      </div>

      <!-- Rarity & Availability -->
      <div class="filter-section">
        <div class="filter-section-label">{{ $t('filter.rarity') }} / {{ $t('filter.availability') }}</div>
        <div class="filter-chips">
          <button
            v-for="grade in STAR_GRADE_VALUES"
            :key="grade"
            class="filter-chip"
            :class="{ active: isActive('starGrade', grade) }"
            type="button"
            @click="toggle('starGrade', grade)"
          >{{ '★'.repeat(grade) }}</button>
          <span class="filter-chip-divider"></span>
          <button
            v-for="opt in AVAILABILITY_OPTIONS"
            :key="opt.value"
            class="filter-chip"
            :class="{ active: isActive('availability', opt.value) }"
            type="button"
            @click="toggle('availability', opt.value)"
          >{{ $t(opt.key) }}</button>
        </div>
      </div>

      <!-- Attack Type -->
      <div class="filter-section">
        <div class="filter-section-label">{{ $t('filter.attackType') }}</div>
        <div class="filter-chips">
          <button
            v-for="key in BULLET_TYPE_KEYS"
            :key="key"
            class="filter-chip filter-chip--typed"
            :class="{ active: isActive('bulletType', key) }"
            :style="isActive('bulletType', key)
              ? { backgroundColor: getBulletColor(key), borderColor: getBulletColor(key), color: 'white' }
              : { borderColor: getBulletColor(key), color: getBulletColor(key) }"
            type="button"
            @click="toggle('bulletType', key)"
          >{{ getBulletLabel(key) }}</button>
        </div>
      </div>

      <!-- Defense Type -->
      <div class="filter-section">
        <div class="filter-section-label">{{ $t('filter.defenseType') }}</div>
        <div class="filter-chips">
          <button
            v-for="key in ARMOR_TYPE_KEYS"
            :key="key"
            class="filter-chip filter-chip--typed"
            :class="{ active: isActive('armorType', key) }"
            :style="isActive('armorType', key)
              ? { backgroundColor: getArmorColor(key), borderColor: getArmorColor(key), color: 'white' }
              : { borderColor: getArmorColor(key), color: getArmorColor(key) }"
            type="button"
            @click="toggle('armorType', key)"
          >{{ getArmorLabel(key) }}</button>
        </div>
      </div>

      <!-- Academy -->
      <div class="filter-section" v-if="availableSchools.length">
        <div class="filter-section-label">{{ $t('filter.academy') }}</div>
        <div class="filter-chips">
          <button
            v-for="school in mainSchools"
            :key="school"
            class="filter-chip filter-chip--icon"
            :class="{ active: isActive('school', school) }"
            type="button"
            @click="toggle('school', school)"
          >
            <img
              :src="getSchoolIconUrl(school)"
              :alt="getSchoolLabel(school)"
              :class="['chip-icon', isActive('school', school) ? 'icon-white' : 'icon-dimmed']"
            />
            {{ getSchoolLabel(school) }}
          </button>
          <button
            v-if="hasOtherSchools"
            class="filter-chip filter-chip--icon"
            :class="{ active: isOtherActive }"
            type="button"
            @click="toggleOtherSchools"
          >
            <img
              :src="getSchoolIconUrl('ETC')"
              alt="Other"
              :class="['chip-icon', isOtherActive ? 'icon-white' : 'icon-dimmed']"
            />
            {{ $t('filter.other') }}
          </button>
        </div>
      </div>

      <!-- Equipment -->
      <div class="filter-section">
        <div class="filter-section-label">{{ $t('filter.equipment') }}</div>
        <div class="filter-chips">
          <button
            v-for="eq in EQUIPMENT_TYPE_KEYS"
            :key="eq"
            class="filter-chip filter-chip--icon"
            :class="{ active: isActive('equipment', eq) }"
            type="button"
            @click="toggle('equipment', eq)"
          >
            <img
              :src="getEquipmentSlotIconUrl(eq)"
              :alt="$t(`equipmentTypes.${eq}`)"
              :class="['chip-icon', isActive('equipment', eq) ? 'icon-white' : 'icon-dimmed']"
            />
            {{ $t(`equipmentTypes.${eq}`) }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.filter-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  min-width: 280px;
  background-color: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  z-index: 150;
  overflow: hidden;
}

.filter-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border-color);
}

.filter-panel-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.filter-clear-btn {
  font-size: 0.75rem;
  color: var(--accent-color);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.filter-clear-btn:hover {
  background-color: rgba(var(--accent-color-rgb), 0.1);
}

.filter-panel-body {
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 55vh;
  overflow-y: auto;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-section-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.filter-chip {
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--input-border);
  background: var(--background-secondary);
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.12s, background-color 0.12s, color 0.12s;
  white-space: nowrap;
  line-height: 1.5;
}

.filter-chip:hover {
  border-color: var(--accent-color);
  color: var(--text-primary);
}

.filter-chip.active {
  border-color: var(--accent-color);
  background-color: rgba(var(--accent-color-rgb), 0.15);
  color: var(--accent-color);
  font-weight: 500;
}

.filter-chip--squad {
  background-color: transparent;
  padding: 0;
}

.filter-chip--squad:hover {
  opacity: 0.85;
}

.squad-label {
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 8px;
}

.filter-chip--icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chip-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}

.filter-chip--typed {
  background-color: transparent;
}

.filter-chip--typed:hover {
  opacity: 0.85;
}

.filter-chip-divider {
  display: inline-block;
  width: 1px;
  height: 18px;
  background-color: var(--border-color);
  align-self: center;
  margin: 0 2px;
  flex-shrink: 0;
}
</style>
