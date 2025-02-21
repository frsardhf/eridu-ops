<script setup>
import { ref, onMounted } from 'vue'

const studentData = ref([])
const giftData = ref([])
const filteredGift = ref([])
const genericGiftTags = ["BC", "Bc", "ew"]

function filterByCategory(items, category) {
  const filteredItems = {}
  for (const itemId in items) {
    if (items[itemId].Category === category) {
      filteredItems[itemId] = items[itemId]
    }
  }
  return filteredItems
}

function getGiftsByStudent(students, items) {
  const result = {};
  
  for (const studentId in students) {
    const uniqueGiftTags = students[studentId].FavorItemUniqueTags;
    const rareGiftTags = students[studentId].FavorItemTags;
    const studentGifts = [];
    
    for (const itemId in items) {
      const allTags = [...uniqueGiftTags, ...rareGiftTags, ...genericGiftTags];
      const genericTagCount = items[itemId].Tags.filter(x => genericGiftTags.includes(x)).length;
      const commonTags = items[itemId].Tags.filter(x => allTags.includes(x));
      const favorGrade = Math.min(commonTags.length, 3);
      const expValue = items[itemId].ExpValue * (1 + Math.min(commonTags.length, 3));
      
      if (favorGrade - genericTagCount > 0) {
        studentGifts.push({
          gift: items[itemId],
          exp: expValue,
          grade: favorGrade + 1
        });
      }
    }
    result[studentId] = studentGifts;
  }
  return result
}

const fetchData = async (type) => {
  try {
    const url = `https://schaledb.com/data/en/${type}.json`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url}`)
    }
    const data = await response.json()
    if (type === 'items') {
      return filterByCategory(data, 'Favor')
    }
    return data
  } catch (error) {
    console.error('Error fetching data:', error)
    return {}
  }
}

onMounted(async () => {
  studentData.value = await fetchData('students')
  giftData.value = await fetchData('items')
  filteredGift.value = getGiftsByStudent(studentData.value, giftData.value)
})

function getFontSizeClass(name) {
  const length = name.length;
  if (length <= 10) return 'text-normal';
  return 'text-small';
}
</script>

<template>
  <div class="container-fluid mt-3">
    <div class="student-grid">
      <div v-for="(student, index) in studentData"
           :key="index"
           class="student-card">
        <a class="selection-grid-card">
          <div class="card-img">
            <img :src="`https://schaledb.com/images/student/collection/${student.Id}.webp`"
                 :alt="student.Name">
          </div>
          <div class="card-label">
            <span :class="['label-text', getFontSizeClass(student.Name)]">
              {{ student.Name }}
            </span>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.5rem;
  padding: 1rem;
}

.student-card {
  width: 80px;
}

.selection-grid-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.selection-grid-card:hover {
  transform: translateY(-2px);
}

.card-img {
  width: 80px;
  height: 90px;
  overflow: hidden;
}

.card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-label {
  margin-top: 0;
  padding: 4px;
  text-align: center;
  background-color: antiquewhite;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.label-text {
  line-height: 1;
  width: 100%;
  padding: 0 2px;
}

.text-normal {
  font-size: 0.85rem;
}

.text-small {
  font-size: 0.65rem;
}
</style>