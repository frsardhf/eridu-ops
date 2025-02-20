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

// Helper function to check if arrays share all elements
function hasAllElement(arr1, arr2) {
  return arr1.every(item => arr2.includes(item));
}

function getUniqueXpValue(item) {
  if (item.Rarity === 'SSR') {
    return 240;
  } else if (item.Tags.includes('BN')) {
    return 80;
  } else {
    return 60;
  }
}

function getRareXpValue(item) {
  return item.Rarity === 'SSR' ? 180 : 40;
}

function getStudentUniqueGifts(students, items) {
  const result = {};

  for (const studentId in students) {
    const uniqueGiftTags = students[studentId].FavorItemUniqueTags;
    const rareGiftTags = students[studentId].FavorItemTags;
    const matchingGifts = new Map()
    
    for (const itemId in items) {
      const item = items[itemId];
      if (hasCommonElement(item.Tags, uniqueGiftTags)) {
          const xpValue = getUniqueXpValue(item);
          matchingGifts.set(item.Id, {
            name: item.Name,
            rarity: item.Rarity,
            xp: xpValue
          });
      } else if (hasCommonElement(item.Tags, rareGiftTags)) {
          const xpValue = getRareXpValue(item);
          matchingGifts.set(item.Id, {
            name: item.Name,
            rarity: item.Rarity,
            xp: xpValue
          });
      }
      if (hasAllElement(rareGiftTags, item.Tags)) {
        if (matchingGifts.has(item.Id)) {
          matchingGifts.set(item.Id, {
            name: item.Name,
            rarity: item.Rarity,
            xp: item.Rarity === 'SSR' ? 180 : 60
          });
        }
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