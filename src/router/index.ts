import { createRouter, createWebHistory } from 'vue-router';
import StudentDisplay from '../components/students/StudentDisplay.vue';


const routes = [
  {
    path: '/',
    name: 'StudentDisplay',
    component: StudentDisplay
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router