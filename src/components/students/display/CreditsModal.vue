<script setup lang="ts">
const emit = defineEmits(['close']);

function closeModal(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close');
  }
}
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">Credits</h2>
        <button class="close-button" @click="emit('close')" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-content">
        <div class="credits-section">
          <h3>Data Sources</h3>
          <p>The data used in this application is sourced from:</p>
          <ul>
            <li><a href="https://schaledb.com" target="_blank" rel="noopener noreferrer">SchaleDB</a></li>
          </ul>
        </div>

        <div class="credits-section">
          <h3>Translations</h3>
          <p>
            English translations of skills are provided by Lonqie and are used with permission.
            Please note that translations in other languages may be contributed by other translators
            and are not free to use in other projects without explicit permission.
          </p>
        </div>

        <div class="credits-section">
          <h3>Acknowledgements</h3>
          <p>
            Special thanks to the SchaleDB team and Lonqie for their incredible work
            in maintaining comprehensive Blue Archive data resources that make applications
            like this possible.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-container {
  background-color: var(--background-primary);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-appear 0.3s ease;
}

.modal-content {
  width: 100%;
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.close-button {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: rgba(var(--background-hover-rgb), 0.1);
  color: var(--text-primary);
}

.credits-section {
  margin-bottom: 20px;
}

.credits-section:last-child {
  margin-bottom: 0;
}

.credits-section h3 {
  font-size: 1.1rem;
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.credits-section p {
  margin: 0 0 10px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.credits-section ul {
  margin: 0;
  padding-left: 20px;
}

.credits-section li {
  margin-bottom: 5px;
  color: var(--text-secondary);
}

.credits-section a {
  color: var(--accent-color);
  text-decoration: none;
  transition: color 0.2s;
}

.credits-section a:hover {
  text-decoration: underline;
}

@media (max-width: 576px) {
  .modal-container {
    width: 95%;
    max-height: 80vh;
  }
  
  .modal-content {
    padding: 12px;
  }
}
</style> 