// storageUtils.ts

/**
 * Storage keys used throughout the application
 */
export const STORAGE_KEYS = {
  STUDENTS: 'students',
  RESOURCES: 'resources',
  EQUIPMENTS: 'equipments',
  FORMS: 'forms',
  PINNED_STUDENTS: 'pinned-students',
  THEME: 'theme',
  SORT_OPTION: 'sort-option',
  SORT_DIRECTION: 'sort-direction',
  MATERIALS: 'materials',
  GEARS: 'gears',
  // Add more keys as needed
};

/**
 * Saves studentData to localStorage under the students collection
 * It includes all the data for the student, including favored gifts
 * @param studentData The base student data
 * @param favoredGift The favored gifts data for each student
 * @param giftBoxData The gift boxes data for each student
 * @returns boolean indicating success or failure
 */
export function saveStudentData(
  studentData: Record<string, any>,
  favoredGift: Record<string, any[]>,
  giftBoxData: Record<string, any[]>
): boolean {
  try {
    // Create a copy of studentData to avoid modifying the original
    const updatedStudentData = { ...studentData };

    // Add Gifts and Boxes to each student's data
    for (const studentId in updatedStudentData) {
      const giftsObject = (favoredGift[studentId] || []).reduce((acc, item) => {
        acc[item.gift.Id] = item;
        return acc;
      }, {} as Record<string, any>);

      const boxesObject = (giftBoxData[studentId] || []).reduce((acc, item) => {
        acc[item.gift.Id] = item;
        return acc;
      }, {} as Record<string, any>);

      updatedStudentData[studentId] = {
        ...updatedStudentData[studentId],
        Gifts: giftsObject,
        Boxes: boxesObject
      };
    }

    // Save entire students collection back to localStorage
    return setStorageData(STORAGE_KEYS.STUDENTS, updatedStudentData);
  } catch (error) {
    console.error('Error saving student data to localStorage:', error);
    return false;
  }
}

/**
 * Saves student-specific data to localStorage under the students collection
 * @param studentId The ID of the student
 * @param data The data to save
 * @returns boolean indicating success or failure
 */
export function saveFormData(studentId: string | number, data: Record<string, any>): boolean {
  if (!studentId) return false;
  
  try {
    // Get all students data
    let studentsData = getDataCollection(STORAGE_KEYS.FORMS);
    
    // Get existing data for this student
    const existingStudentData = studentsData[studentId] || {};
    
    // Merge with new data
    studentsData[studentId] = {
      ...existingStudentData,
      ...data,
      id: studentId, // Always ensure studentId is saved
    };
    
    // Save entire students collection back to localStorage
    return setStorageData(STORAGE_KEYS.FORMS, studentsData);
  } catch (error) {
    console.error('Error saving student data to localStorage:', error);
    return false;
  }
}

/**
 * Retrieves all data collection by key from localStorage
 * @returns Record of all collection or empty object if not found
 */
export function getDataCollection(key: string): Record<string | number, any> {
  try {
    const data = getStorageData(key);
    return data || {};
  } catch (error) {
    console.error(`Error retrieving collection ${key} from localStorage:`, error);
    return {};
  }
}

/**
 * Generic function to retrieve data from localStorage by key
 * @param key The storage key to retrieve data from
 * @returns The parsed data or null if not found
 */
export function getStorageData<T = Record<string, any>>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    // Check if the data is a plain string that shouldn't be parsed
    if (key === STORAGE_KEYS.THEME || 
        key === STORAGE_KEYS.SORT_OPTION || 
        key === STORAGE_KEYS.SORT_DIRECTION) {
      return data as unknown as T;
    }
    
    // Otherwise parse as JSON
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error retrieving data from localStorage key ${key}:`, error);
    return null;
  }
}

/**
 * Retrieves resources data from localStorage
 * @returns The resources data or null if not found
 */
export function getResources(): Record<string, any> | null {
  return getStorageData(STORAGE_KEYS.RESOURCES);
}

/**
 * Retrieves equipment data from localStorage
 * @returns The equipment data or null if not found
 */
export function getEquipments(): Record<string, any> | null {
  return getStorageData(STORAGE_KEYS.EQUIPMENTS);
}

/**
 * Retrieves a single student's data from localStorage
 * @param studentId The ID of the student
 * @returns The student data or null if not found
 */
export function getFormData(studentId: string | number): Record<string, any> | null {
  if (!studentId) return null;
  
  try {
    const studentsData = getDataCollection(STORAGE_KEYS.FORMS)
    return studentsData[studentId] ?? null;
  } catch (error) {
    console.error('Error retrieving form data from localStorage:', error);
    return null;
  }
}

/**
 * Loads stored values into reactive refs for a student
 * @param studentId The ID of the student
 * @param refs Object containing reactive refs to update with keys matching storage keys
 * @param defaultValues Default values to use if stored values don't exist
 * @returns boolean indicating if data was successfully loaded
 */
export function loadFormDataToRefs(
  studentId: string | number,
  refs: Record<string, { value: any }>,
  defaultValues: Record<string, any> = {}
): boolean {
  if (!studentId) return false;
  
  try {
    const studentData = getFormData(studentId);
    if (!studentData) return false;
    
    // Update each ref if the corresponding data exists
    Object.keys(refs).forEach(key => {
      if (key in studentData) {
        refs[key].value = studentData[key];
      } else if (key in defaultValues) {
        refs[key].value = defaultValues[key];
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error loading student data to refs:', error);
    return false;
  }
}

/**
 * Saves resources data to localStorage
 * @param resources The resources data to save, or a function to transform existing resources
 * @returns boolean indicating success or failure
 */
export function saveResources(
  resources: Record<string, any> | ((existing: Record<string, any>) => Record<string, any>)
): boolean {
  try {
    // If resources is a function, apply it to existing resources
    if (typeof resources === 'function') {
      const existingResources = getResources() || {};
      const newResources = resources(existingResources);
      return setStorageData(STORAGE_KEYS.RESOURCES, newResources);
    } else {
      // Otherwise, just save the provided resources
      return setStorageData(STORAGE_KEYS.RESOURCES, resources);
    }
  } catch (error) {
    console.error('Error saving resources to localStorage:', error);
    return false;
  }
}

/**
 * Loads resources data from localStorage into reactive refs
 * @param refs Object containing reactive refs to update with keys matching resource IDs
 * @returns boolean indicating if data was successfully loaded
 */
export function loadResourcesToRefs(
  refs: Record<string, { value: any }>
): boolean {
  try {
    const resources = getResources();
    if (!resources) return false;
    
    Object.entries(resources).forEach(([id, resource]) => {
      if (id in refs) {
        refs[id].value = resource.QuantityOwned || 0;
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error loading resources data to refs:', error);
    return false;
  }
}

/**
 * Saves resources data from student materials
 * @param student The student object containing materials
 * @param resourceFormData The form data with updated quantities
 * @returns boolean indicating success or failure
 */
export function saveResourcesFromStudent(
  student: { Materials?: Record<string, any> }, 
  resourceFormData: { value: Record<string, number> }
): boolean {
  try {
    if (!student?.Materials) return false;
    
    const resourceData = Object.values(student.Materials).reduce((acc, material: any) => {
      acc[material.Id] = {
        ...material,
        QuantityOwned: resourceFormData.value[material.Id] || 0
      };
      return acc;
    }, {} as Record<string, any>);
    
    return saveResources(resourceData);
  } catch (error) {
    console.error('Error processing and saving resources to localStorage:', error);
    return false;
  }
}

/**
 * Saves equipment data to localStorage
 * @param equipments The equipment data to save, or a function to transform existing equipments
 * @returns boolean indicating success or failure
 */
export function saveEquipments(
  equipments: Record<string, any> | ((existing: Record<string, any>) => Record<string, any>)
): boolean {
  try {
    // If equipments is a function, apply it to existing equipments
    if (typeof equipments === 'function') {
      const existingEquipments = getEquipments() || {};
      const newEquipments = equipments(existingEquipments);
      return setStorageData(STORAGE_KEYS.EQUIPMENTS, newEquipments);
    } else {
      // Otherwise, just save the provided equipments
      return setStorageData(STORAGE_KEYS.EQUIPMENTS, equipments);
    }
  } catch (error) {
    console.error('Error saving equipments to localStorage:', error);
    return false;
  }
}

/**
 * Loads equipment data from localStorage into reactive refs
 * @param refs Object containing reactive refs to update with keys matching equipment IDs
 * @returns boolean indicating if data was successfully loaded
 */
export function loadEquipmentsToRefs(
  refs: Record<string, { value: any }>
): boolean {
  try {
    const equipments = getEquipments();
    if (!equipments) return false;
    
    Object.entries(equipments).forEach(([id, equipment]) => {
      if (id in refs) {
        refs[id].value = equipment.QuantityOwned || 0;
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error loading equipments data to refs:', error);
    return false;
  }
}

/**
 * Saves equipment data from student equipment
 * @param student The student object containing equipment
 * @param equipmentFormData The form data with updated quantities
 * @returns boolean indicating success or failure
 */
export function saveEquipmentsFromStudent(
  student: { Equipments?: Record<string, any> }, 
  equipmentFormData: { value: Record<string, number> }
): boolean {
  try {
    if (!student?.Equipments) return false;
    
    const equipmentData = Object.values(student.Equipments).reduce((acc, equipment: any) => {
      acc[equipment.Id] = {
        ...equipment,
        QuantityOwned: equipmentFormData.value[equipment.Id] || 0
      };
      return acc;
    }, {} as Record<string, any>);
    
    return saveEquipments(equipmentData);
  } catch (error) {
    console.error('Error processing and saving equipment to localStorage:', error);
    return false;
  }
}

/**
 * Toggle a student's pinned status
 * @param studentId The ID of the student to toggle
 * @returns The new pinned status (true if pinned, false if unpinned)
 */
export function togglePinnedStudent(studentId: string | number): boolean {
  try {
    const pinnedStudents = getPinnedStudents();
    
    const isCurrentlyPinned = pinnedStudents.includes(studentId.toString());
    
    if (isCurrentlyPinned) {
      const updatedPinned = pinnedStudents.filter(id => id !== studentId.toString());
      setStorageData(STORAGE_KEYS.PINNED_STUDENTS, updatedPinned);
      return false;
    } else {
      pinnedStudents.push(studentId.toString());
      setStorageData(STORAGE_KEYS.PINNED_STUDENTS, pinnedStudents);
      return true;
    }
  } catch (error) {
    console.error('Error toggling pinned student:', error);
    return false;
  }
}

/**
 * Check if a student is pinned
 * @param studentId The ID of the student to check
 * @returns boolean indicating if the student is pinned
 */
export function isStudentPinned(studentId: string | number): boolean {
  try {
    const pinnedStudents = getPinnedStudents();
    return pinnedStudents.includes(studentId.toString());
  } catch (error) {
    console.error('Error checking if student is pinned:', error);
    return false;
  }
}

/**
 * Get the list of pinned student IDs
 * @returns Array of pinned student IDs
 */
export function getPinnedStudents(): string[] {
  try {
    const data = getStorageData<string[]>(STORAGE_KEYS.PINNED_STUDENTS);
    return data || [];
  } catch (error) {
    console.error('Error retrieving pinned students from localStorage:', error);
    return [];
  }
}

/**
 * Retrieves a single resource data from localStorage
 * @param id The ID of the resource
 * @returns The resource data or null if not found
 */
export function getResourceDataById(id: string | number): Record<string, any> | null {
  try {
    const resourcesData = getStorageData(STORAGE_KEYS.RESOURCES);
    return resourcesData?.[id] || null;
  } catch (error) {
    console.error('Error retrieving resource by ID from localStorage:', error);
    return null;
  }
}

/**
 * Retrieves a single equipment data from localStorage
 * @param id The ID of the equipment
 * @returns The equipment data or null if not found
 */
export function getEquipmentDataById(id: string | number): Record<string, any> | null {
  try {
    const equipmentData = getStorageData(STORAGE_KEYS.EQUIPMENTS);
    return equipmentData?.[id] || null;
  } catch (error) {
    console.error('Error retrieving equipment by ID from localStorage:', error);
    return null;
  }
}

/**
 * Generic function to set data in localStorage by key
 * @param key The storage key to store data in
 * @param data The data to store
 * @returns True if successful, false otherwise
 */
export function setStorageData<T>(key: string, data: T): boolean {
  try {
    // Handle special cases for plain string values
    if (key === STORAGE_KEYS.THEME || 
        key === STORAGE_KEYS.SORT_OPTION || 
        key === STORAGE_KEYS.SORT_DIRECTION) {
      localStorage.setItem(key, data as unknown as string);
    } else {
      // For other data, stringify as JSON
      localStorage.setItem(key, JSON.stringify(data));
    }
    return true;
  } catch (error) {
    console.error(`Error storing data in localStorage key ${key}:`, error);
    return false;
  }
}

/**
 * Save the pinned students to localStorage
 * @param studentIds List of student IDs to pin
 * @returns True if successful, false otherwise
 */
export function savePinnedStudents(studentIds: string[]): boolean {
  return setStorageData(STORAGE_KEYS.PINNED_STUDENTS, studentIds);
}

/**
 * Saves materials data to localStorage
 * @param studentId The ID of the student
 * @param materials The materials data to save
 * @returns boolean indicating success or failure
 */
export function saveMaterialsData(studentId: string | number, materials: any[]): boolean {
  try {
    // Get all materials data
    let materialsData = getDataCollection(STORAGE_KEYS.MATERIALS);
    
    // Update the materials for this student
    materialsData[studentId] = materials;
    
    // Save entire materials collection back to localStorage
    return setStorageData(STORAGE_KEYS.MATERIALS, materialsData);
  } catch (error) {
    console.error('Error saving materials data to localStorage:', error);
    return false;
  }
}

/**
 * Retrieves materials data for a specific student from localStorage
 * @param studentId The ID of the student
 * @returns The materials data or null if not found
 */
export function getMaterialsData(studentId: string | number): any[] | null {
  try {
    const materialsData = getDataCollection(STORAGE_KEYS.MATERIALS);
    return materialsData[studentId] ?? null;
  } catch (error) {
    console.error('Error retrieving materials data from localStorage:', error);
    return null;
  }
}

/**
 * Retrieves all materials data from localStorage
 * @returns All materials data or empty object if not found
 */
export function getAllMaterialsData(): Record<string, any[]> {
  try {
    return getDataCollection(STORAGE_KEYS.MATERIALS);
  } catch (error) {
    console.error('Error retrieving all materials data from localStorage:', error);
    return {};
  }
}

/**
 * Saves gears data to localStorage
 * @param studentId The ID of the student
 * @param gears The gears data to save
 * @returns boolean indicating success or failure
 */
export function saveGearsData(studentId: string | number, gears: any[]): boolean {
  try {
    // Get all gears data
    let gearsData = getDataCollection(STORAGE_KEYS.GEARS);
    
    // Update the gears for this student
    gearsData[studentId] = gears;
    
    // Save entire gears collection back to localStorage
    return setStorageData(STORAGE_KEYS.GEARS, gearsData);
  } catch (error) {
    console.error('Error saving gears data to localStorage:', error);
    return false;
  }
}

/**
 * Retrieves gears data for a specific student from localStorage
 * @param studentId The ID of the student
 * @returns The gears data or null if not found
 */
export function getGearsData(studentId: string | number): any[] | null {
  try {
    const gearsData = getDataCollection(STORAGE_KEYS.GEARS);
    return gearsData[studentId] ?? null;
  } catch (error) {
    console.error('Error retrieving gears data from localStorage:', error);
    return null;
  }
}

/**
 * Retrieves all gears data from localStorage
 * @returns All gears data or empty object if not found
 */
export function getAllGearsData(): Record<string, any[]> {
  try {
    return getDataCollection(STORAGE_KEYS.GEARS);
  } catch (error) {
    console.error('Error retrieving all gears data from localStorage:', error);
    return {};
  }
}

/**
 * Retrieves all students form data from localStorage
 * @returns Record of all students form data or empty object if not found
 */
export function getAllFormData(): Record<string | number, any> {
  try {
    return getDataCollection(STORAGE_KEYS.FORMS);
  } catch (error) {
    console.error('Error retrieving all form data from localStorage:', error);
    return {};
  }
}

/**
 * Migrates student form data from old format to new format
 * example:
 * Old: { currentCharacterLevel, targetCharacterLevel }
 * New: { characterLevels: { current, target } }
 */
export function migrateFormData() {
  try {
    // Get the forms data from localStorage
    const formsData = localStorage.getItem('forms');
    
    if (!formsData) {
      console.log('No forms data found to migrate');
      return;
    }
    
    // Parse the forms data
    const forms = JSON.parse(formsData);
    
    // Track if we've made any changes
    let hasChanges = false;
    
    // Iterate through each student ID in the forms object
    Object.keys(forms).forEach(studentId => {
      const studentData = forms[studentId];
      
      // Check if this student data needs migration
      if (studentData && 
          (studentData.convertBox !== undefined || 
           studentData.currentBond !== undefined)) {
        
        // Create new bondDetailData object
        studentData.bondDetailData = {
          convertBox: studentData.convertBox ?? false,
          currentBond: studentData.currentBond ?? 1,
          originalSelectorBoxQuantity: studentData.originalSelectorBoxQuantity ?? 0,
          originalSrGiftQuantity: studentData.originalSrGiftQuantity ?? 0,
          originalYellowStoneQuantity: studentData.originalYellowStoneQuantity ?? 0,
        };
        
        // Remove old properties
        delete studentData.convertBox;
        delete studentData.currentBond;
        delete studentData.originalSelectorBoxQuantity;
        delete studentData.originalSrGiftQuantity;
        delete studentData.originalYellowStoneQuantity;
        
        hasChanges = true;
        console.log(`Migrated data for student ${studentId}`);
      }
    });
    
    // Save the updated forms data if changes were made
    if (hasChanges) {
      localStorage.setItem('forms', JSON.stringify(forms));
      console.log('Migration completed and saved');
    } else {
      console.log('No data needed migration');
    }
    
    // Return the migrated data
    return forms;
  } catch (error) {
    console.error('Migration failed:', error);
    return null;
  }
}

// Function to check if migration is needed and run it if so
export function checkAndMigrateFormData() {
  // Check if migration has been run already
  const migrationVersion = localStorage.getItem('forms_migration_version');
  
  // If we haven't run migration version 2 yet
  if (!migrationVersion || parseInt(migrationVersion) < 2) {
    const migratedData = migrateFormData();
    
    if (migratedData) {
      // Mark migration as complete
      localStorage.setItem('forms_migration_version', '2');
    }
    
    return migratedData;
  }
  
  return null;
}