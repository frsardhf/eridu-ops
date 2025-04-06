<script setup lang="ts">

defineProps<{
  currentLevel: number,
  targetLevel: number,
  totalXpNeeded: number
}>();

const emit = defineEmits(['update-level', 'update-target-level']);

function handleLevelInput(event: Event) {
  emit('update-level', event);
}

function handleTargetLevelInput(event: Event) {
  emit('update-target-level', event);
}
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
        :value="currentLevel"
        @input="handleLevelInput"
        class="level-input"
        min="1"
        max="90"
      />
    </div>
    
    <div class="level-container">
      <div class="level-display">
        <div class="level-icon-container">
          <div class="level-badge">
            <span class="level-number">{{ currentLevel }}</span>
          </div>
        </div>
      </div>
      
      <div class="level-arrow">→</div>
      
      <div class="level-display">
        <div class="level-icon-container">
          <div class="level-badge">
            <span class="level-number">{{ targetLevel }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="input-container">
      <label for="target-level-input">Target Level:</label>
      <input
        id="target-level-input"
        name="target-level-input"
        type="number"
        :value="targetLevel"
        @input="handleTargetLevelInput"
        class="level-input"
        min="1"
        max="90"
      />
    </div>
    
    <div class="total-exp">
      XP Required: {{ totalXpNeeded.toLocaleString() }}
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
  background: linear-gradient(135deg, #2c2f49, #1a1b2a);
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
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
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
</style>