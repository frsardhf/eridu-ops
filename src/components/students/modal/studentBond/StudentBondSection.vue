<script setup lang="ts">
import { $t } from '../../../../locales';

defineProps<{
  currentBond: number,
  newBondLevel: number,
  remainingXp: number,
  totalExp: number
}>();

const emit = defineEmits(['update-bond']);

function handleBondInput(event: Event) {
  emit('update-bond', event);
}
</script>

<template>
  <div class="bond-section">
    <!-- Bond input moved to the top -->
    <div class="bond-input-container">
      <label for="bond-input">{{ $t('currentBond') }}</label>
      <input
        id="bond-input"
        name="bond-input"
        type="number"
        :value="currentBond"
        @input="handleBondInput"
        class="bond-input"
        min="1"
        max="100"
      />
    </div>
    
    <div class="bond-container">
      <div class="bond-display">
        <div class="bond-icon-container">
          <img 
            src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
            alt="Current Bond"
            class="bond-icon"
          />
          <span class="bond-number">{{ currentBond }}</span>
        </div>
      </div>
      
      <div class="bond-arrow">→</div>
      
      <div class="bond-display">
        <div class="bond-icon-container">
          <img 
            src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
            alt="New Bond"
            class="bond-icon"
          />
          <span class="bond-number">{{ newBondLevel }}</span>
        </div>
      </div>
    </div>
    
    <div class="exp-info" v-if="remainingXp > 0">
      {{ remainingXp }} {{ $t('expToNextLevel') }}
    </div>
    
    <div class="total-exp">
      {{ $t('totalExp') }}: {{ totalExp }}
    </div>
  </div>
</template>

<style scoped>
.bond-section {
  align-self: center;
  background: var(--card-background);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

.bond-input-container {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 15px;
}

.bond-input-container label {
  font-size: 0.9em;
  color: var(--text-secondary);
}

.exp-info {
  font-size: 0.9em;
  color: var(--text-primary);
  text-align: center;
  margin: 10px 0 0 0;
}

.bond-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.bond-display {
  display: flex;
  align-items: center;
}

.bond-icon-container {
  position: relative;
  width: 50px;
  height: 50px;
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
  font-size: medium;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.bond-arrow {
  font-size: 24px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.bond-input {
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