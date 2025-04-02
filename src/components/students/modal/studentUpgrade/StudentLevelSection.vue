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
  <div class="xp-level-section">
    <h3 class="section-title">Character Level</h3>

    <div class="level-inputs">
      <div class="input-group">
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

      <div class="level-info">
        <div class="level-arrow">→</div>
        <div class="exp-info" v-if="totalXpNeeded > 0">
          {{ totalXpNeeded.toLocaleString() }} XP needed
        </div>
      </div>
      
      <div class="input-group">
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
    </div>
    
    <div class="total-exp">
      Total XP Required: {{ totalXpNeeded.toLocaleString() }}
    </div>
  </div>
</template>