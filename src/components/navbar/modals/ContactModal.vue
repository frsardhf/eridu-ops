<script setup lang="ts">
import { $t } from '@/locales';

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
        <h2 class="modal-title">{{ $t('contact') }}</h2>
        <button class="close-button" @click="emit('close')" :aria-label="$t('close')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-content">
        <div class="contact-section">
          <p>{{ $t('contactModal.body') }}</p>
          
          <div class="contact-card">
            <div class="contact-icon">
              <img src="/profile.jpg" alt="" class="contact-avatar" />
            </div>
            <div class="contact-handles">
              <a href="https://discord.com/users/idxyllic" target="_blank" rel="noopener noreferrer" class="contact-handle">
                <span class="contact-handle-platform">Discord</span>
                <span class="contact-handle-name">idxyllic</span>
              </a>
              <a href="https://x.com/idxyllune" target="_blank" rel="noopener noreferrer" class="contact-handle">
                <span class="contact-handle-platform">Twitter</span>
                <span class="contact-handle-name">idxyllune</span>
              </a>
            </div>
          </div>
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

/* One shared avatar on the left, one row per social platform on the right. */
.contact-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--background-secondary);
}

.contact-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Square 400x400 source clipped to a circle */
.contact-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.contact-handles {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.contact-handle {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.2s ease;
}

.contact-handle:hover {
  background-color: var(--background-tertiary);
}

.contact-handle-platform {
  flex-shrink: 0;
  min-width: 60px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.contact-handle-name {
  font-size: 0.9rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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