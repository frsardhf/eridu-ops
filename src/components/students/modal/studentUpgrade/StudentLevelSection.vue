<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { $t } from '../../../../locales';

const props = defineProps<{
  characterLevels: { current: number; target: number; },
  totalXpNeeded: number
}>();

const emit = defineEmits<(
  e: 'update-level', current: number, target: number
) => void>();

// Create potential settings for each type
const levelState = ref({
  current: props.characterLevels.current,
  target: props.characterLevels.target,
});

// Watch for prop changes to update local state
watch(() => props.characterLevels, (newVal) => {
  if (newVal) {
    levelState.value.current = newVal.current;
    levelState.value.target = newVal.target;
  }
}, { deep: true, immediate: true });

// Single function to handle both current and target level updates
const updateLevel = (event: Event, isTarget: boolean) => {
  const input = event.target as HTMLInputElement;

  // If the input is empty or just a dash, don't process yet
  if (input.value === '' || input.value === '-') {
    return;
  }
  
  // Remove leading zeros and parse the value
  input.value = input.value.replace(/^0+(?=\d)/, '');
  let value = parseInt(input.value);
  
  // Handle NaN case
  if (isNaN(value)) {
    input.value = isTarget ? levelState.value.target.toString() 
      : levelState.value.current.toString();
    return;
  }
  
  // Clamp the value based on whether it's for target or current
  if (isTarget) {
    value = Math.max(levelState.value.current, Math.min(90, value));
    levelState.value.target = value;
  } else {
    value = Math.max(1, Math.min(90, value));
    levelState.value.current = value;
    if (levelState.value.target < value) {
      levelState.value.target = value;
    }
  }
  
  input.value = value.toString();
  emit('update-level', levelState.value.current, levelState.value.target);
};

// Add computed property to check if level is maxed
const isMaxLevel = computed(() => props.characterLevels.current === 90);
</script>

<template>
  <div class="level-section">
    
    <!-- Maxed Version -->
    <div v-if="isMaxLevel" class="maxed-section">
      <div class="maxed-content">
        <div class="maxed-icon">
          <div class="max-level-badge">
            <span class="max-level-number">90</span>
          </div>
        </div>
        <div class="maxed-text">
          <h3 class="maxed-title">{{ $t('maxGrade') }}</h3>
          <p class="maxed-subtitle">{{ $t('noUpgradeNeeded') }}</p>
        </div>
      </div>
      
      <!-- Keep the level input for maxed version -->
      <div class="maxed-input-container">
        <input
          id="current-level-input-maxed"
          name="current-level-input"
          type="number"
          :value="levelState.current"
          @input="(e) => updateLevel(e, false)"
          class="level-input maxed-input"
          min="1"
          max="90"
        />
      </div>
      
      <div class="maxed-decorative">
        <div class="shine-effect"></div>
      </div>
    </div>

    <!-- Normal Version -->
    <template v-else>
      <!-- Level input moved to the top -->
      <div class="level-input-container">
        <label for="current-level-input">{{ $t('currentLevel') }}</label>
        <input
          id="current-level-input"
          name="current-level-input"
          type="number"
          :value="levelState.current"
          @input="(e) => updateLevel(e, false)"
          class="level-input"
          min="1"
          max="90"
        />
      </div>
      
      <div class="level-container">
        <div class="level-display">
          <div class="level-icon-container">
            <div class="level-badge">
              <span class="level-number">{{ levelState.current }}</span>
            </div>
          </div>
        </div>
        
        <div class="level-arrow">→</div>
        
        <div class="level-display">
          <div class="level-icon-container">
            <div class="level-badge">
              <span class="level-number">{{ levelState.target }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="input-container">
        <label for="target-level-input">{{ $t('targetLevel') }}</label>
        <input
          id="target-level-input"
          name="target-level-input"
          type="number"
          :value="levelState.target"
          @input="(e) => updateLevel(e, true)"
          class="level-input"
          min="1"
          max="90"
        />
      </div>
      
      <div class="total-exp">
        {{ $t('xpRequired') }}: {{ totalXpNeeded.toLocaleString() }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.level-section {
  align-self: center;
  background: var(--card-background);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
  margin-bottom: 15px;
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
}

/* Maxed Section Styles */
.maxed-section {
  position: relative;
  background: linear-gradient(135deg, 
    rgba(255, 201, 51, 0.1), 
    rgba(51, 200, 255, 0.1),
    rgba(255, 201, 51, 0.05)
  );
  border: 2px solid transparent;
  background-clip: padding-box;
  border-radius: 8px;
  padding: 16px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  gap: 15px;
}

.maxed-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 2;
  position: relative;
}

.maxed-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.max-level-badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--header-gradient-start);
  border: 2px solid #4e7eff;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s ease-in-out infinite;
}

.max-level-number {
  font-weight: bold;
  font-size: 1.1em;
  color: var(--text-primary);
}

.maxed-text {
  text-align: center;
}

.maxed-title {
  font-size: 1.2em;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(135deg, rgb(255, 201, 51), hsl(192, 100%, 60%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.maxed-subtitle {
  font-size: 0.9em;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
  opacity: 0.8;
}

.maxed-level-display {
  display: flex;
  align-items: center;
  justify-content: center;
}

.maxed-badge {
  background: linear-gradient(135deg, rgba(255, 201, 51, 0.2), rgba(51, 200, 255, 0.2));
  border: 2px solid;
  border-image: linear-gradient(135deg, rgb(255, 201, 51), hsl(192, 100%, 60%)) 1;
  box-shadow: 0 0 15px rgba(255, 201, 51, 0.3);
  animation: glow 2s ease-in-out infinite alternate;
}

.maxed-input-container {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
  z-index: 2;
  position: relative;
}

.maxed-input-container label {
  font-size: 0.9em;
  color: var(--text-secondary);
  font-weight: 500;
}

.maxed-input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 201, 51, 0.3);
  backdrop-filter: blur(5px);
}

.maxed-input:focus {
  outline: none;
  border-color: rgb(255, 201, 51);
  box-shadow: 0 0 0 2px rgba(255, 201, 51, 0.2);
}

.maxed-decorative {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.shine-effect {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.05) 40%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 60%,
    transparent 70%
  );
  animation: shine 4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

@keyframes glow {
  0% { box-shadow: 0 0 15px rgba(255, 201, 51, 0.3); }
  100% { box-shadow: 0 0 25px rgba(255, 201, 51, 0.5); }
}

@keyframes shine {
  0% { transform: rotate(0deg) translate(-100%, -100%); }
  100% { transform: rotate(360deg) translate(-100%, -100%); }
}

/* Normal Section Styles */
.level-input-container, .input-container {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
  margin-bottom: 15px;
}

.level-input-container label, .input-container label {
  font-size: 0.9em;
  color: var(--text-secondary);
}

.level-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 12px 0;
}

.level-display {
  display: flex;
  align-items: center;
}

.level-icon-container {
  position: relative;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.level-badge {
  background: var(--header-gradient-start);
  border: 2px solid #4e7eff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.level-number {
  font-weight: bold;
  font-size: 1em;
  color: var(--text-primary);
}

.level-arrow {
  font-size: 24px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.level-input {
  width: 40px;
  padding: 4px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
  background-color: var(--input-color, var(--background-primary));
}

.total-exp {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  margin-top: 15px;
  text-align: center;
  background: var(--background-primary);
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.level-input-container, .input-container, .maxed-input-container
::-webkit-outer-spin-button,
::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Responsive design */
@media (max-width: 480px) {
  .maxed-title {
    font-size: 1.1em;
  }
  
  .max-level-badge {
    width: 55px;
    height: 55px;
  }
  
  .max-level-number {
    font-size: 1.2em;
  }
  
  .maxed-section {
    min-height: 120px;
    padding: 15px;
  }
}
</style>