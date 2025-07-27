// learn-typing-state.js (DIUPDATE)

import { getDOMReferences } from './dom-elements.js'; // Import fungsi baru ini

// Deklarasikan variabel state di top-level scope agar bisa diakses oleh semua fungsi di modul ini
let hiddenInput = null; // Inisialisasi null dulu
let currentLessonIndex = 0;
let currentStepIndex = 0;
let currentCharIndex = 0;
let waitingForAnim = { value: false };
let lesson2Finished = false;
let lesson2State = 0;
let lesson2SequenceIndex = 0;

export function initDOMAndState() {
    // Panggil fungsi dari dom-elements.js untuk mendapatkan semua referensi DOM
    const domReferences = getDOMReferences();

    if (domReferences) {
        hiddenInput = domReferences.hiddenInput; // Simpan referensi hiddenInput ke variabel top-level
        return domReferences; // Kembalikan semua referensi DOM
    }
    return null; // Jika ada masalah dengan DOM, kembalikan null
}

// Fungsi untuk memperbarui nilai state dari luar
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
        default:
            console.warn(`Attempted to update unknown state key: ${key}`);
    }
}

// Fungsi untuk mendapatkan nilai state dari luar
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
        default:
            console.warn(`Attempted to get unknown state key: ${key}`);
            return undefined;
    }
}

// Fungsi ini tetap ada untuk memberikan akses ke hiddenInput dari luar,
// karena hiddenInput sekarang diinisialisasi melalui getDOMReferences()
export function getHiddenInput() {
    return hiddenInput;
}