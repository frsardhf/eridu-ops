<script setup>
import { ref, onMounted } from 'vue'

const studentData = ref([])
const giftData = ref([])
const filteredGift = ref([])

// The function to filter items by category
function filterByCategory(items, category) {
  const filteredItems = {}

  for (const itemId in items) {
    if (items[itemId].Category === category) {
      filteredItems[itemId] = items[itemId]
    }
  }
  return filteredItems
}

// Helper function to check if arrays share any elements
function hasCommonElement(arr1, arr2) {
  return arr1.some(item => arr2.includes(item));
}

function getStudentUniqueGifts(students, items) {
  const result = {};
  for (const studentId in students) {
    const uniqueGiftTags = students[studentId].FavorItemUniqueTags;
    const rareGiftTags = students[studentId].FavorItemTags;
    const matchingGifts = [];
    let xpValue = 0
    
    for (const itemId in items) {
      const item = items[itemId];
      if (hasCommonElement(item.Tags, uniqueGiftTags)) {
        if (item.Rarity === 'SSR') {
          xpValue = 240
        } else {
          xpValue = 60
        }
        matchingGifts.push({ name: item.Name, xp: xpValue });
      } else if (hasCommonElement(item.Tags, rareGiftTags)) {
        if (item.Rarity === 'SSR') {
          xpValue = 180
        } else {
          xpValue = 40
        }
        matchingGifts.push({ name: item.Name, xp: xpValue });
      }
    }
    result[studentId] = matchingGifts;
  }
  console.log(result)
  return result;
}

// The fetchData function which fetches data based on the type (students or items)
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
  filteredGift.value = getStudentUniqueGifts(studentData.value, giftData.value)
})
</script>

<template>
  <div class="card">
    <h2>Student Data</h2>
    <ul>
      <li v-for="(student, index) in studentData" :key="index">
        {{ student.Name }}
        {{ student.FavorItemTags }}
        {{ student.FavorItemUniqueTags }}
      </li>
    </ul>

    <h2>Gift Data</h2>
    <ul>
      <li v-for="(gift, index) in giftData" :key="index">
        {{ gift.Name }} (Rarity: {{ gift.Rarity }})
      </li>
    </ul>
  </div>
</template>