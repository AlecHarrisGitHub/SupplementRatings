import { useEffect, useRef, useCallback } from 'react';
import { sessionManager } from '../services/api';

export const useAutoSave = (formKey, formData, saveFunction, options = {}) => {
    const {
        autoSaveInterval = 30000, // 30 seconds
        enableAutoSave = true,
        enableLocalStorage = true,
        onAutoSaveSuccess = () => {},
        onAutoSaveError = () => {},
        onRestoreData = () => {}
    } = options;

    const lastSavedData = useRef(null);
    const isInitialized = useRef(false);

    // Save form data to localStorage
    const saveToLocalStorage = useCallback((data) => {
        if (enableLocalStorage) {
            sessionManager.saveFormDataToStorage(formKey, data);
        }
    }, [formKey, enableLocalStorage]);

    // Load form data from localStorage
    const loadFromLocalStorage = useCallback(() => {
        if (enableLocalStorage && !isInitialized.current) {
            const savedData = sessionManager.loadFormDataFromStorage(formKey);
            if (savedData) {
                onRestoreData(savedData);
                return true;
            }
        }
        return false;
    }, [formKey, enableLocalStorage, onRestoreData]);

    // Auto-save function
    const performAutoSave = useCallback(async (data) => {
        if (!enableAutoSave || !data || !saveFunction) return;

        try {
            // Check if data has actually changed
            const dataString = JSON.stringify(data);
            if (dataString === lastSavedData.current) {
                return; // No changes, skip save
            }

            await saveFunction(data);
            lastSavedData.current = dataString;
            saveToLocalStorage(data);
            onAutoSaveSuccess(data);
            console.log('Auto-save completed successfully');
        } catch (error) {
            console.error('Auto-save failed:', error);
            onAutoSaveError(error);
        }
    }, [enableAutoSave, saveFunction, saveToLocalStorage, onAutoSaveSuccess, onAutoSaveError]);

    // Start auto-save when form data changes
    useEffect(() => {
        if (!enableAutoSave || !formData) return;

        // Load saved data on first render
        if (!isInitialized.current) {
            const hasRestoredData = loadFromLocalStorage();
            if (hasRestoredData) {
                // Show notification about restored data
                import('react-hot-toast').then(({ toast }) => {
                    toast.success('Your previous work has been restored!', { duration: 5000 });
                });
            }
            isInitialized.current = true;
        }

        // Start auto-save interval
        sessionManager.startAutoSave(formData, performAutoSave, autoSaveInterval);

        // Cleanup on unmount or when dependencies change
        return () => {
            sessionManager.stopAutoSave();
        };
    }, [formData, enableAutoSave, autoSaveInterval, performAutoSave, loadFromLocalStorage]);

    // Manual save function
    const manualSave = useCallback(async (data = formData) => {
        return await performAutoSave(data);
    }, [performAutoSave, formData]);

    // Clear saved data
    const clearSavedData = useCallback(() => {
        sessionManager.clearFormDataFromStorage(formKey);
        lastSavedData.current = null;
    }, [formKey]);

    return {
        manualSave,
        clearSavedData,
        hasUnsavedChanges: () => {
            if (!formData || !lastSavedData.current) return false;
            return JSON.stringify(formData) !== lastSavedData.current;
        }
    };
}; 