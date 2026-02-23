// js/learn-typing-state.js

import { getLessonDOMReferences } from './utils/dom-elements.js';

let appState = {
    hiddenInput: null,
    currentLessonIndex: 0,
    waitingForAnim: false,
    lessonStates: {},
    isTransitioning: false,
};



export function initDOMAndState() {
    const domReferences = getLessonDOMReferences(); // Ganti fungsi ini
    if (domReferences) {
        appState.hiddenInput = domReferences.hiddenInput;
        return domReferences;
    }
    return null;
}

export function updateState(key, value) {
    if (appState.hasOwnProperty(key)) {
        appState[key] = value;
    } else if (key.startsWith('lesson')) {
        const currentState = appState.lessonStates[key] || {};
        appState.lessonStates[key] = { ...currentState, ...value };
    } else {
        const currentLessonId = `lesson${appState.currentLessonIndex + 1}`;
        if (!appState.lessonStates[currentLessonId]) {
            appState.lessonStates[currentLessonId] = {};
        }
        appState.lessonStates[currentLessonId][key] = value;
    }
}

export function getState(key) {
    if (appState.hasOwnProperty(key)) {
        return appState[key];
    }
    if (key.startsWith('lesson')) {
        return appState.lessonStates[key];
    }

    const currentLessonId = `lesson${appState.currentLessonIndex + 1}`;
    const currentLessonState = appState.lessonStates[currentLessonId];
    if (currentLessonState && currentLessonState.hasOwnProperty(key)) {
        return currentLessonState[key];
    }

    console.warn(`Attempted to get unknown state key: ${key}`);
    return undefined;
}

// ✅ Perbaikan: Inisialisasi state dengan properti isHoldKeyActive dari awal
export function initializeLessonState(lessonId, initialState) {
    if (!appState.lessonStates[lessonId]) {
        appState.lessonStates[lessonId] = { ...initialState, isHoldKeyActive: false };
    }
}

export function getHiddenInput() {
    return appState.hiddenInput;
}
