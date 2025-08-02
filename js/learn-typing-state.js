// learn-typing-state.js
import { getDOMReferences } from './dom-elements.js';

let hiddenInput = null;
let currentLessonIndex = 0;
let currentStepIndex = 0;
let currentCharIndex = 0;
let waitingForAnim = { value: false };
let lesson2Finished = false;
let lesson2State = 0;
let lesson2SequenceIndex = 0;
let lesson3Finished = false; // BARIS BARU
let lesson3State = 0; // BARIS BARU
let lesson3SequenceIndex = 0; // BARIS BARU

export function initDOMAndState() {
    const domReferences = getDOMReferences();

    if (domReferences) {
        hiddenInput = domReferences.hiddenInput;
        return domReferences;
    }
    return null;
}

export function updateState(key, value) {
    switch (key) {
        case 'currentLessonIndex':
            currentLessonIndex = value;
            break;
        case 'currentStepIndex':
            currentStepIndex = value;
            break;
        case 'currentCharIndex':
            currentCharIndex = value;
            break;
        case 'waitingForAnim':
            waitingForAnim.value = value;
            break;
        case 'lesson2Finished':
            lesson2Finished = value;
            break;
        case 'lesson2State':
            lesson2State = value;
            break;
        case 'lesson2SequenceIndex':
            lesson2SequenceIndex = value;
            break;
        case 'lesson3Finished': // BARIS BARU
            lesson3Finished = value;
            break;
        case 'lesson3State': // BARIS BARU
            lesson3State = value;
            break;
        case 'lesson3SequenceIndex': // BARIS BARU
            lesson3SequenceIndex = value;
            break;
        default:
            console.warn(`Attempted to update unknown state key: ${key}`);
    }
}

export function getState(key) {
    switch (key) {
        case 'currentLessonIndex':
            return currentLessonIndex;
        case 'currentStepIndex':
            return currentStepIndex;
        case 'currentCharIndex':
            return currentCharIndex;
        case 'waitingForAnim':
            return waitingForAnim;
        case 'lesson2Finished':
            return lesson2Finished;
        case 'lesson2State':
            return lesson2State;
        case 'lesson2SequenceIndex':
            return lesson2SequenceIndex;
        case 'lesson3Finished': // BARIS BARU
            return lesson3Finished;
        case 'lesson3State': // BARIS BARU
            return lesson3State;
        case 'lesson3SequenceIndex': // BARIS BARU
            return lesson3SequenceIndex;
        default:
            console.warn(`Attempted to get unknown state key: ${key}`);
            return undefined;
    }
}

export function getHiddenInput() {
    return hiddenInput;
}