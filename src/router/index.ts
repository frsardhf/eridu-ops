import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
// Landing stays eager (it's the entry route); the heavy pages are lazy so each
// gets its own chunk and first paint doesn't download the whole app.
import LandingPage from '@/pages/LandingPage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
  },
  {
    path: '/students',
    name: 'Students',
    component: () => import('@/pages/StudentsPage.vue'),
  },
  {
    path: '/bonds',
    name: 'Bonds',
    component: () => import('@/pages/BondsPage.vue'),
  },
  {
    path: '/hall',
    name: 'Hall',
    component: () => import('@/pages/Bond100Page.vue'),
  },
  {
    path: '/bond100',
    redirect: '/hall',
  },
  {
    // Dev/test surface for the live-3D chibi (Road 2). Lazy so three.js + the GLB
    // never touch the entry chunk. Not linked from nav.
    path: '/chibi3d',
    name: 'Chibi3dTest',
    component: () => import('@/pages/Chibi3dTestPage.vue'),
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
