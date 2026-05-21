<script setup lang="ts">
import { computed, toRef } from 'vue';
import { $t } from '@/locales';
import { useStudentInfo } from '@/composables/useStudentInfo';
import { useStudentLevels } from '@/composables/useStudentLevels';
import { useBondEditor } from '@/composables/useInputEditor';
import { getSchoolColor } from '@/lib/utils/colorUtils';
import { getBondIconUrl, getTypeIconUrl, getRoleIconUrl, getSchoolIconUrl } from '@/lib/utils/iconUtils';
import { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps;
  /** Required in level-pill mode (the default). Ignored when bondProgress is true. */
  characterLevels?: { current: number; target: number };
  currentBond: number;
  newBondLevel?: number;
  hasStyleSwitch?: boolean;
  activeStyleId?: number;
  primaryStudentId?: number;
  /**
   * BondsPage mode: the level pill shows BOND progression (currentBond →
   * newBondLevel) instead of character level. When set, `characterLevels`
   * is ignored and `remainingXp` / `totalExp` are rendered as stat chips.
   */
  bondProgress?: boolean;
  remainingXp?: number;
  totalExp?: number;
  /** Suppresses the wrapping card chrome (BondsPage embeds inline). */
  flat?: boolean;
  /**
   * Modal mode: clicking the bond icon emits `navigate-bond` instead of
   * starting an inline edit. Caller handles the route push to /bonds.
   * Mutually exclusive with `bondProgress`.
   */
  enableBondNavigate?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-style'): void;
  (e: 'update-bond', value: number): void;
  (e: 'navigate-bond'): void;
}>();

const effectiveNewBondLevel = computed(() => props.newBondLevel ?? props.currentBond);

const studentRef = toRef(() => props.student);

const { squadTypeName, bulletTypeName, armorTypeName, schoolName, clubName, tacticRoleName,
  squadTypeColor, bulletTypeColor, armorTypeColor, bulletTypeColorLight, armorTypeColorLight
} = useStudentInfo(studentRef);

const { showLevelArrow } = useStudentLevels(
  () => props.characterLevels ?? { current: 0, target: 0 }
);

const showBondArrow = computed(() => props.currentBond !== effectiveNewBondLevel.value);

// Inline bond editor — only used when bondProgress is true. Modal Bond tab
// keeps its own editor in BondSection so this stays inert in level mode.
const {
  bondState, bondEditorRef, isEditing, editValue,
  startEdit, commitEdit, handleEditorKeydown,
} = useBondEditor(() => props.currentBond, (value) => emit('update-bond', value));

const levelPillClass = computed(() => ({
  maxed50: props.currentBond >= 50 && props.currentBond < 100,
  maxed100: props.currentBond >= 100
}));

const styleModeLabel = computed(() => {
  if (typeof props.activeStyleId !== 'number') {
    return 'I';
  }

  if (typeof props.primaryStudentId === 'number') {
    return props.activeStyleId === props.primaryStudentId ? 'I' : 'II';
  }

  return props.activeStyleId === 2 ? 'II' : 'I';
});

const isBondInteractive = computed(() => !!props.bondProgress || !!props.enableBondNavigate);

const bondInlineTooltip = computed(() => {
  if (props.bondProgress) return $t('editBondLevel');
  if (props.enableBondNavigate) return $t('openInBondsPage');
  return undefined;
});

function onBondInlineClick() {
  if (props.bondProgress) startEdit();
  else if (props.enableBondNavigate) emit('navigate-bond');
}
</script>

<template>
  <section
    :class="['student-meta-header', { 'student-meta-header--flat': flat }]"
    aria-label="Student Summary"
  >
    <div class="identity-row">
      <h2 class="student-name">{{ student.Name }}</h2>
      <div class="identity-actions">
        <button
          v-if="hasStyleSwitch"
          class="style-toggle-btn"
          :class="{ active: activeStyleId !== primaryStudentId }"
          @click="emit('toggle-style')"
          type="button"
          :title="`${$t('switchStyle')} (${styleModeLabel})`"
          :aria-label="`${$t('switchStyle')} ${styleModeLabel}`"
        >
          <span class="style-mode-label">{{ styleModeLabel }}</span>
        </button>

        <div v-if="bulletTypeName" class="type-pill-divided">
          <span class="pill-label" :style="{ backgroundColor: bulletTypeColorLight }">
            <img :src="getTypeIconUrl('Attack')" alt="ATK" class="type-icon icon-white" />
          </span>
          <span class="pill-value" :style="{ backgroundColor: bulletTypeColor }">
            {{ bulletTypeName }}
          </span>
        </div>

        <div v-if="armorTypeName" class="type-pill-divided">
          <span class="pill-label" :style="{ backgroundColor: armorTypeColorLight }">
            <img :src="getTypeIconUrl('Defense')" alt="DEF" class="type-icon icon-white" />
          </span>
          <span class="pill-value" :style="{ backgroundColor: armorTypeColor }">
            {{ armorTypeName }}
          </span>
        </div>

        <span
          v-if="squadTypeName"
          class="role-chip font-nexon"
          :style="{ backgroundColor: squadTypeColor }"
        >
          {{ squadTypeName }}
        </span>
      </div>
    </div>

    <div class="meta-row">
      <div class="meta-chips">
        <div class="level-pill" :class="levelPillClass">
          <div
            class="bond-inline"
            :class="{ updating: showBondArrow, 'bond-inline--editable': isBondInteractive }"
            :role="isBondInteractive ? 'button' : undefined"
            :tabindex="isBondInteractive ? 0 : undefined"
            :title="bondInlineTooltip"
            :aria-label="bondInlineTooltip"
            @click="onBondInlineClick"
            @keydown.enter.prevent="onBondInlineClick"
            @keydown.space.prevent="onBondInlineClick"
          >
            <img
              :src="getBondIconUrl()"
              alt="Bond"
              class="bond-icon-inline"
            />
            <span class="bond-number-inline">{{ currentBond }}</span>
          </div>
          <div class="level-content">
            <template v-if="bondProgress">
              <span class="level-label">BOND</span>
              <button
                v-if="!isEditing"
                type="button"
                class="level-number level-number-button"
                :title="$t('editBondLevel')"
                :aria-label="$t('editBondLevel')"
                @click="startEdit"
              >{{ bondState }}</button>
              <input
                v-else
                ref="bondEditorRef"
                v-model="editValue"
                type="number"
                class="level-number level-number-input"
                min="1"
                max="100"
                @blur="commitEdit"
                @keydown="handleEditorKeydown"
              />
              <template v-if="showBondArrow">
                <span class="level-arrow">→</span>
                <span class="level-number target">{{ effectiveNewBondLevel }}</span>
              </template>
            </template>
            <template v-else-if="characterLevels">
              <span class="level-label">LEVEL</span>
              <span class="level-number">{{ characterLevels.current }}</span>
              <template v-if="showLevelArrow">
                <span class="level-arrow">→</span>
                <span class="level-number target">{{ characterLevels.target }}</span>
              </template>
            </template>
          </div>
        </div>

        <template v-if="bondProgress">
          <span v-if="showBondArrow && (remainingXp ?? 0) > 0" class="bond-stat-chip">
            {{ remainingXp }} {{ $t('expToNextLevel') }}
          </span>
          <span v-if="bondProgress && (totalExp ?? 0) > 0" class="bond-stat-chip strong">
            {{ $t('totalExp') }}: {{ (totalExp ?? 0).toLocaleString() }}
          </span>
        </template>
      </div>
    </div>

    <div v-if="schoolName || clubName || tacticRoleName" class="affiliation-row">
      <span v-if="tacticRoleName" class="affiliation-pill affiliation-pill--role">
        <img
          :src="getRoleIconUrl(student.TacticRole)"
          :alt="tacticRoleName"
          class="affiliation-icon icon-white"
        />
        <span class="affiliation-text">{{ tacticRoleName }}</span>
      </span>
      <span class="affiliation-pill" :style="{ backgroundColor: getSchoolColor(student.School) }">
        <img
          v-if="schoolName"
          :src="getSchoolIconUrl(student.School)"
          :alt="schoolName"
          class="affiliation-icon icon-white"
        />
        <span class="affiliation-text">
          {{ schoolName }}<template v-if="schoolName && clubName"> / {{ clubName }}</template><template v-else-if="clubName">{{ clubName }}</template>
        </span>
      </span>
    </div>
  </section>
</template>

<style scoped>
.student-meta-header {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Flat variant — strip the card chrome when the header is embedded inside
   another card (e.g., BondsStudentEditor places it inline beside the icon). */
.student-meta-header--flat {
  background: transparent;
  border: none;
  padding: 0;
}

.identity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.student-name {
  margin: 0;
  font-size: 1.75rem;
  line-height: 1;
  font-weight: 700;
  color: var(--text-primary);
}

.identity-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.style-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.style-toggle-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.style-toggle-btn.active {
  border-color: var(--accent-color);
  background: var(--accent-color);
  color: white;
}

.style-mode-label {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1;
}

.role-chip {
  border-radius: 999px;
  padding: 1.835px 10px;
  font-size: 1rem;
  color: white;
  white-space: nowrap;
}

.meta-row {
  display: block;
}

.meta-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.level-pill {
  display: flex;
  align-items: center;
  min-width: 170px;
  height: 30px;
  background: var(--background-primary);
  border: 1px solid var(--color-bond);
  border-radius: 999px;
  overflow: visible;
}

.level-pill.maxed {
  background: var(--background-primary);
  border: 1px solid var(--color-bond);
}

.level-pill.maxed50 {
  background: linear-gradient(135deg, rgba(248, 203, 39, 0.24), rgba(248, 255, 51, 0.22));
  border-color: color-mix(in srgb, var(--color-grade-gold) 65%, transparent);
}

.level-pill.maxed100 {
  background: linear-gradient(135deg, rgba(255, 105, 180, 0.18), rgba(235, 51, 255, 0.18));
  border-color: rgba(255, 105, 180, 0.55);
}

.bond-inline {
  position: relative;
  width: 34px;
  height: 34px;
  margin-left: 2px;
  flex-shrink: 0;
}

/* Editable variant (BondsPage). Hover tint + cursor pointer signal that the
   heart icon is a secondary edit target alongside the dotted-underlined
   number. Tabindex makes it keyboard-focusable via the role="button"
   markup. */
.bond-inline--editable {
  cursor: pointer;
  border-radius: 999px;
  transition: background-color 0.15s, transform 0.15s;
}

.bond-inline--editable:hover {
  background-color: color-mix(in srgb, var(--accent-color) 18%, transparent);
  transform: scale(1.05);
}

.bond-inline--editable:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.bond-icon-inline {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bond-number-inline {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  font-weight: 700;
  font-size: 0.74rem;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.82);
}

.level-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.level-label {
  font-style: italic;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--text-secondary);
  letter-spacing: 0.45px;
}

.level-number {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--text-primary);
}

.level-arrow {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.level-number.target {
  color: var(--accent-color);
}

.level-number-button {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.level-number-button:hover {
  color: var(--accent-color);
}

.level-number-button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
  border-radius: 2px;
}

.level-number-input {
  width: 36px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-secondary);
  padding: 0 2px;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

.level-number-input::-webkit-outer-spin-button,
.level-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.type-pill-divided {
  display: flex;
  align-items: stretch;
  border-radius: 999px;
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.combat-type-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.bond-stat-chip {
  font-size: 0.82rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--background-primary);
  color: var(--text-secondary);
}

.bond-stat-chip.strong {
  font-weight: 700;
  color: var(--text-primary);
}

.pill-label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 7px;
}

.type-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  display: block;
}

.pill-value {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  color: white;
}

.affiliation-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.affiliation-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 14px 4px 8px;
  border-radius: 999px;
  border: none;
  white-space: nowrap;
}

.affiliation-pill--role {
  background: var(--text-tertiary);
  color: white;
}

.affiliation-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}

.affiliation-text {
  font-size: 0.88rem;
  font-weight: 600;
  color: white;
}

@media (max-width: 1024px) {
  .student-name {
    font-size: 1.45rem;
  }
}

@media (max-width: 768px) {
  .meta-row {
    display: block;
  }
}
</style>
