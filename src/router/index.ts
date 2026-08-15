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
    path: '/crafting',
    name: 'Crafting',
    component: () => import('@/pages/CraftingPage.vue'),
  },
  {
    path: '/bond100',
    redirect: '/hall',
  },
  {
    // Live-3D chibi surface. Lazy so three.js + the GLB stay out of the entry chunk.
    // The landing-page Rio links here, while the navbar intentionally does not.
    path: '/chibi3d',
    name: 'Chibi3d',
    component: () => import('@/pages/Chibi3dPage.vue'),
  },
  {
    // Hidden from public navigation. Production access to both this route and
    // /api/activity is enforced by Cloudflare Access, not by a client gate.
    path: '/activity',
    name: 'Activity',
    component: () => import('@/pages/ActivityPage.vue'),
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
