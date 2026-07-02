import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/image-cache-sw.js').catch(() => {});
}

// Request persistent storage to reduce IndexedDB eviction.
if (navigator.storage?.persist) {
  navigator.storage
    .persisted()
    .then((already) => (already ? true : navigator.storage.persist()))
    .catch(() => {});
}
