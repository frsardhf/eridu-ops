import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/image-cache-sw.js').catch(() => {});
}

// Ask the browser to keep our storage persistent. On WebKit this raises the
// per-origin quota and stops automatic eviction, which is what protects
// IndexedDB writes from failing once the schaledb image cache grows large.
if (navigator.storage?.persist) {
  navigator.storage.persisted()
    .then((already) => (already ? true : navigator.storage.persist()))
    .catch(() => {});
}