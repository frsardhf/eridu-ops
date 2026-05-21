import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import LandingPage from '@/pages/LandingPage.vue';
import StudentsPage from '@/pages/StudentsPage.vue';
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
    component: StudentsPage,
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
