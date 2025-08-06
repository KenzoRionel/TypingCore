// js/learn-typing-state.js
import { getDOMReferences } from './dom-elements.js';

let appState = {
    hiddenInput: null,
    currentLessonIndex: 0,
    currentStepIndex: 0,
    currentCharIndex: 0,
    waitingForAnim: false,
    lesson2Finished: false,
    lesson2State: 0,
    lesson2SequenceIndex: 0,
    lesson3Finished: false,
    lesson3State: 0,
    lesson3SequenceIndex: 0,
    lesson4Finished: false,
    lesson4State: 0,
    lesson4SequenceIndex: 0,
    lesson4CurrentCharIndex: 0,
    lesson4CharHistory: [],
};

export function initDOMAndState() {
    const domReferences = getDOMReferences();
    if (domReferences) {
        appState.hiddenInput = domReferences.hiddenInput;
        return domReferences;
    }
    return null;
}

export function updateState(key, value) {
    if (appState.hasOwnProperty(key)) {
        appState[key] = value;
    } else {
        console.warn(`Attempted to update unknown state key: ${key}`);
    }
}

export function getState(key) {
    if (appState.hasOwnProperty(key)) {
        return appState[key];
    } else {
        console.warn(`Attempted to get unknown state key: ${key}`);
        return undefined;
    }
}

export function getHiddenInput() {
    return appState.hiddenInput;
}