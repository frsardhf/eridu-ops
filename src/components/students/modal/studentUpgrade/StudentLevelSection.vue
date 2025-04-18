<script setup lang="ts">
import { computed, ref, watch } from 'vue';

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
    <h3 class="section-title">Character Level</h3>
    
    <!-- Level input moved to the top -->
    <div class="level-input-container">
      <label for="current-level-input">Current Level:</label>
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
      
      <!-- Only show arrow and target level if not maxed -->
      <template v-if="!isMaxLevel">
        <div class="level-arrow">→</div>
        
        <div class="level-display">
          <div class="level-icon-container">
            <div class="level-badge">
              <span class="level-number">{{ levelState.target }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
    
    <!-- Only show target input if not maxed -->
    <div class="input-container" v-if="!isMaxLevel">
      <label for="target-level-input">Target Level:</label>
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
    
    <!-- Only show XP required if not maxed -->
    <div class="total-exp" v-if="!isMaxLevel">
      XP Required: {{ totalXpNeeded.toLocaleString() }}
    </div>
    
    <!-- Show MAX indicator when level is maxed -->
    <div v-else class="max-level-indicator">
      MAX LEVEL
    </div>
  </div>
</template>

<style scoped>
.level-section {
  align-self: center;
  background: var(--card-background);
  border-radius: 8px;
  padding: 20px;
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
}

.level-input-container, .input-container {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 15px;
}

.level-input-container label, .input-container label {
  font-size: 0.9em;
  color: var(--text-secondary);
}

.exp-info {
  font-size: 0.9em;
  color: var(--text-primary);
  text-align: center;
  margin: 10px 0;
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
  width: 60px;
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

.max-level-indicator {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--accent-color);
  margin-top: 15px;
  text-align: center;
  background: var(--background-primary);
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>