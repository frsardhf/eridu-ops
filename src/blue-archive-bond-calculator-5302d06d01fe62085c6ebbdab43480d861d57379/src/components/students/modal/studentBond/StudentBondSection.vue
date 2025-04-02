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