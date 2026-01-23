<script setup lang="ts">
import { ref } from 'vue';
import { importLocalStorageData, importFromOtherSite } from '../../consumables/utils/studentStorage';
import { $t } from '../../locales';

const emit = defineEmits<{
  'close': [];
  'import-success': [];
}>();

const isDragging = ref(false);
const importStatus = ref<string>('');
const showStatus = ref(false);
const isLoading = ref(false);
const importText = ref('');
const showTextInput = ref(false);

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  
  if (event.dataTransfer?.files.length) {
    handleFiles(event.dataTransfer.files);
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    handleFiles(input.files);
  }
}

async function handleFiles(files: FileList) {
  if (files.length === 0) return;
  
  const file = files[0];
  
  // Check if it's a valid file type
  if (!file.name.endsWith('.txt') && !file.name.endsWith('.json')) {
    showImportError($t('importErrorFileType'));
    return;
  }
  
  try {
    isLoading.value = true;
    showStatus.value = true;
    importStatus.value = $t('importingData');
    
    const success = await importLocalStorageData(file);
    
    if (success) {
      importStatus.value = $t('importSuccessful');
      emit('import-success');
      
      // Reload page after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showImportError($t('importFailed'));
    }
  } catch (error) {
    console.error('Error importing data:', error);
    showImportError($t('importFileFormatError'));
  } finally {
    isLoading.value = false;
  }
}

async function handleTextImport() {
  if (!importText.value.trim()) {
    showImportError($t('importEmptyText'));
    return;
  }

  try {
    isLoading.value = true;
    showStatus.value = true;
    importStatus.value = $t('importingData');
    
    const success = await importFromOtherSite(importText.value);
    
    if (success) {
      importStatus.value = $t('importSuccessful');
      emit('import-success');
      
      // Reload page after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showImportError($t('importFailed'));
    }
  } catch (error) {
    console.error('Error importing data:', error);
    showImportError($t('importFileFormatError'));
  } finally {
    isLoading.value = false;
  }
}

function toggleImportMethod() {
  showTextInput.value = !showTextInput.value;
  importText.value = '';
}

function showImportError(message: string) {
  importStatus.value = message;
  showStatus.value = true;
  setTimeout(() => {
    showStatus.value = false;
  }, 3000);
}

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
        <h2 class="modal-title">{{ $t('importData') }}</h2>
        <button class="close-button" @click="emit('close')" :aria-label="$t('close')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-content">
        <div class="import-method-toggle">
          <button 
            class="method-button" 
            :class="{ active: !showTextInput }"
            @click="toggleImportMethod"
          >
            {{ $t('importFromFile') }}
          </button>
          <button 
            class="method-button" 
            :class="{ active: showTextInput }"
            @click="toggleImportMethod"
          >
            {{ $t('importFromText') }}
          </button>
        </div>

        <div v-if="showTextInput" class="text-input-container">
          <textarea
            v-model="importText"
            class="import-textarea"
            :placeholder="$t('pasteImportData')"
            rows="6"
          ></textarea>
          <button 
            class="import-button"
            @click="handleTextImport"
            :disabled="isLoading || !importText.trim()"
          >
            {{ $t('import') }}
          </button>
        </div>

        <div 
          v-else
          class="dropzone" 
          :class="{ 'dragging': isDragging, 'has-status': showStatus }"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <input
            type="file"
            id="file-input"
            class="file-input"
            accept=".json,.txt"
            @change="handleFileSelect"
          />

          <div v-if="showStatus" class="status-message">
            <span class="loader" v-if="isLoading"></span>
            <p>{{ importStatus }}</p>
          </div>
          
          <div v-else class="dropzone-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p class="dropzone-text">{{ $t('dragDropFile') }}</p>
            <p class="dropzone-subtext">{{ $t('or') }}</p>
            <label for="file-input" class="browse-button">{{ $t('browseFiles') }}</label>
          </div>
        </div>

        <div class="info-text">
          <p>{{ $t('importInstructions') }}</p>
          <p>{{ $t('importWarning') }}</p>
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
  max-width: 450px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-appear 0.3s ease;
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
  border-bottom: 1px solid #333;
}

.modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.close-button {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: color 0.2s;
}

.close-button:hover {
  color: #fff;
}

.modal-content {
  padding: 16px;
  width: 100%;
}

.import-method-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.method-button {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.method-button:hover {
  background: var(--background-tertiary);
}

.method-button.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.text-input-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.import-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-primary);
  font-family: monospace;
  resize: vertical;
  min-height: 120px;
}

.import-textarea:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(var(--accent-color-rgb), 0.1);
}

.import-button {
  align-self: flex-end;
  padding: 8px 24px;
  border: none;
  border-radius: 6px;
  background: var(--accent-color);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.import-button:hover:not(:disabled) {
  background: var(--accent-color-hover);
}

.import-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropzone {
  border: 1px dashed #444;
  border-radius: 8px;
  padding: 20px 15px;
  text-align: center;
  margin-bottom: 16px;
  position: relative;
  transition: all 0.3s ease;
  background-color: var(--background-secondary);
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropzone.dragging {
  border-color: var(--accent-color);
  background-color: rgba(var(--accent-color-rgb), 0.1);
}

.dropzone.has-status {
  border-style: solid;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.dropzone-text {
  margin: 10px 0 5px;
  font-size: 1rem;
  color: var(--text-primary);
}

.dropzone-subtext {
  margin: 4px 0;
  color: #999;
  font-size: 0.85rem;
}

.file-input {
  display: none;
}

.browse-button {
  background-color: #6366f1;
  color: white;
  border: none;
  padding: 6px 18px;
  border-radius: 20px;
  margin-top: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.browse-button:hover {
  background-color: #4f46e5;
}

.info-text {
  color: #999;
  font-size: 0.85rem;
  line-height: 1.4;
}

.info-text p {
  margin: 6px 0;
}

.status-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  color: #fff;
}

.loader {
  width: 20px;
  height: 20px;
  border: 2px solid #333;
  border-bottom-color: #6366f1;
  border-radius: 50%;
  display: inline-block;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 480px) {
  .modal-container {
    width: 95%;
  }
  
  .dropzone {
    padding: 16px 12px;
    min-height: 140px;
  }
  
  .dropzone-text {
    font-size: 0.95rem;
  }
}
</style> 