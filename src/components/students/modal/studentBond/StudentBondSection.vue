<script setup lang="ts">

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
      
      <div class="bond-info">
        <div class="bond-arrow">→</div>
        <div class="exp-info" v-if="remainingXp > 0">
          {{ remainingXp }} XP to next level
        </div>
      </div>
      
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
    <div>
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
    <div class="total-exp">
      Total EXP: {{ totalExp }}
    </div>
  </div>
</template>

<style scoped>
.bond-section {
  align-self: center;
  background: var(--card-background);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid var(--border-color);
}

.bond-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.exp-info {
  font-size: 0.8em;
  color: var(--text-primary);
  text-align: center;
}

.bond-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0px;
  margin-bottom: 15px;
}

.bond-display {
  display: flex;
  align-items: center;
  gap: 5px;
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
}

.bond-input {
  width: 60px;
  padding: 4px;
  border: 1px solid var(--text-primary);
  border-radius: 4px;
  text-align: center;
  display: block;
  margin: 0 auto;
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