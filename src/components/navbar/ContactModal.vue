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
        <h2 class="modal-title">Contact</h2>
        <button class="close-button" @click="emit('close')" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-content">
        <div class="contact-section">
          <p>If you have any inquiries or want to report bugs, you can contact me on Discord:</p>
          
          <a href="https://discord.com/users/idxyllic" target="_blank" rel="noopener noreferrer" class="contact-link">
            <div class="contact-item">
              <div class="contact-icon discord">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <div class="contact-info">
                <h4>Discord</h4>
                <p>idxyllic</p>
              </div>
            </div>
          </a>
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
  padding: 16px;
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

.contact-section {
  margin-bottom: 20px;
}

.contact-section p {
  margin: 0 0 20px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.contact-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--background-secondary);
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.contact-item:hover {
  transform: translateY(-2px);
  background-color: var(--background-tertiary);
}

.contact-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  object-fit: fill;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 16px;
  flex-shrink: 0;
}

.contact-icon.discord {
  color: #5865F2;
  background-color: rgba(88, 101, 242, 0.1);
}

.contact-info {
  flex-grow: 1;
}

.contact-info h4 {
  margin: 0 0 4px;
  font-size: 1rem;
  color: var(--text-primary);
}

.contact-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
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