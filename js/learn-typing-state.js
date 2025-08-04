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
let lesson3Finished = false; 
let lesson3State = 0;
let lesson3SequenceIndex = 0; 
let lesson4Finished = false;
let lesson4State = 0;
let lesson4SequenceIndex = 0;
let lesson4CurrentCharIndex = 0; // BARIS INI SUDAH ADA

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
        case 'lesson3Finished':
            lesson3Finished = value;
            break;
        case 'lesson3State':
            lesson3State = value;
            break;
        case 'lesson3SequenceIndex':
            lesson3SequenceIndex = value;
            break;
        case 'lesson4Finished':
            lesson4Finished = value;
            break;
        case 'lesson4State':
            lesson4State = value;
            break;
        case 'lesson4SequenceIndex':
            lesson4SequenceIndex = value;
            break;
        case 'lesson4CurrentCharIndex': // TAMBAHAN
            lesson4CurrentCharIndex = value;
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
            return waitingForAnim.value;
        case 'lesson2Finished':
            return lesson2Finished;
        case 'lesson2State':
            return lesson2State;
        case 'lesson2SequenceIndex':
            return lesson2SequenceIndex;
        case 'lesson3Finished':
            return lesson3Finished;
        case 'lesson3State':
            return lesson3State;
        case 'lesson3SequenceIndex':
            return lesson3SequenceIndex;
        case 'lesson4Finished':
            return lesson4Finished;
        case 'lesson4State':
            return lesson4State;
        case 'lesson4SequenceIndex':
            return lesson4SequenceIndex;
        case 'lesson4CurrentCharIndex': // TAMBAHAN
            return lesson4CurrentCharIndex;
        default:
            console.warn(`Attempted to get unknown state key: ${key}`);
            return undefined;
    }
}
export function getHiddenInput() {
    return hiddenInput;
}