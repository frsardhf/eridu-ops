import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import StudentDisplay from '@/components/display/StudentDisplay.vue';
import LandingPage from '@/pages/LandingPage.vue';
import BondsPage from '@/pages/BondsPage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
  },
  {
    path: '/students',
    name: 'Students',
    component: StudentDisplay,
  },
  {
    path: '/bonds',
    name: 'Bonds',
    component: BondsPage,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
