import { createRouter, createWebHistory } from 'vue-router';
import StudentDisplay from '../components/StudentDisplay.vue';
import StudentDetail from '../components/StudentDetail.vue';


const routes = [
  {
    path: '/',
    name: 'StudentDisplay',
    component: StudentDisplay
  },
  {
    path: '/:name',
    name: 'StudentDetail',
    component: StudentDetail
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router