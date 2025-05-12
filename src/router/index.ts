import { createRouter, createWebHistory } from 'vue-router';
import StudentDisplay from '../components/display/StudentDisplay.vue';

const routes = [
  {
    path: '/',
    name: 'StudentDisplay',
    component: StudentDisplay
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router