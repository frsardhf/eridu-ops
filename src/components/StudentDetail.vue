<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const student = ref(null)

onMounted(async () => {
  try {
    const response = await fetch(`https://schaledb.com/data/en/students.json`)
    const data = await response.json()
    student.value = Object.values(data).find(s => s.PathName === route.params.name)
    console.log(student)
  } catch (error) {
    console.error('Error fetching student data:', error)
  }
})
</script>

<template>
  <div class="container mx-auto p-4">
    <div v-if="student" class="bg-white rounded-lg shadow-lg p-6">
      <div class="flex items-start gap-6">
        <div class="w-48">
          <img 
            :src="`https://schaledb.com/images/student/collection/${student.Id}.webp`"
            :alt="student.Name"
            class="w-full rounded-lg"
          >
        </div>
        
        <div class="flex-1">
          <h1 class="text-2xl font-bold mb-4">{{ student.Name }}</h1>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <p><span class="font-semibold">School:</span> {{ student.School }}</p>
              <p><span class="font-semibold">Club:</span> {{ student.Club }}</p>
              <p><span class="font-semibold">Age:</span> {{ student.Age }}</p>
            </div>
            
            <div class="space-y-2">
              <div>
                <p class="font-semibold">Favorite Item Tags:</p>
                <div class="flex flex-wrap gap-2 mt-1">
                  <span 
                    v-for="tag in student.FavorItemTags" 
                    :key="tag"
                    class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
              
              <div class="mt-2">
                <p class="font-semibold">Unique Gift Tags:</p>
                <div class="flex flex-wrap gap-2 mt-1">
                  <span 
                    v-for="tag in student.FavorItemUniqueTags" 
                    :key="tag"
                    class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center py-8">
      <p class="text-gray-500">Loading student details...</p>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles are handled by Tailwind classes */
</style>