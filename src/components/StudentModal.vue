<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  student: {
    type: Object,
    required: true
  },
  isVisible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const formData = ref({});

// Initialize formData when the component mounts
onMounted(() => {
  if (props.student?.Gifts) {
    props.student.Gifts.forEach(item => {
      formData.value[item.gift.Id] = '';
    });
  }
});

const handleInput = (giftId, event) => {
  formData.value[giftId] = event.target.value;
  console.log('Current input values:', formData.value);
};

const closeModal = () => {
  emit('close');
};
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="text-xl font-bold">{{ student.Name }}</h2>
        <img 
          :src="`https://schaledb.com/images/student/collection/${student.Id}.webp`"
          :alt="student.Name"
          class="student-image"
        />
      </div>

      <div class="gifts-container">
        <div v-for="item in student.Gifts" 
             :key="item.gift.Id"
             class="gift-item">
          <div class="gift-info">
            <img 
              :src="`https://schaledb.com/images/item/icon/${item.gift.Icon}.webp`"
              :alt="item.gift.Name"
              class="gift-icon"
            />
            <span class="gift-exp"> 
              <img 
              :src="`https://schaledb.com/images/ui/Cafe_Interaction_Gift_0${item.grade}.png`"
              :alt="item.grade"
              />
            </span>
            <span>{{ item.exp }}</span>
          </div>
          <input
            type="text"
            :value="formData[item.gift.Id]"
            @input="(e) => handleInput(item.gift.Id, e)"
            class="gift-input"
            :placeholder="'Enter amount for ' + item.gift.Name"
          />
        </div>
      </div>

      <button 
        @click="closeModal"
        class="close-button"
      >
        Close
      </button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  text-align: center;
  margin-bottom: 20px;
}

.student-image {
  width: 120px;
  height: auto;
  margin: 10px auto;
  border-radius: 8px;
}

.gifts-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin: 20px 0;
}

.gift-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 6px;
}

.gift-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.gift-icon {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.gift-exp {
  width: 40px;
  height: 40px;
  font-size: 0.9em;
  color: #666;
}

.gift-input {
  width: 100px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.close-button {
  width: 100%;
  padding: 8px;
  background-color: #4a5568;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;
}

.close-button:hover {
  background-color: #2d3748;
}
</style>