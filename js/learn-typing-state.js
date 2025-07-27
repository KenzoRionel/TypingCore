// learn-typing-state.js
// Deklarasikan variabel state di top-level scope agar bisa diakses oleh semua fungsi di modul ini
let hiddenInput;
let currentLessonIndex = 0;
let currentStepIndex = 0;
let currentCharIndex = 0;
let waitingForAnim = { value: false };
let lesson2Finished = false;
let lesson2State = 0;
let lesson2SequenceIndex = 0;

export function initDOMAndState() {
    // 1. DEKLARASI ELEMEN DOM
    const keyboardContainer = document.getElementById('virtual-keyboard');
    const lessonTitle = document.getElementById('lesson-title');
    const lessonInstruction = document.getElementById('lesson-instruction');
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    const nextLessonBtn = document.getElementById('next-lesson-btn');
    const modal = document.getElementById('lesson-complete-modal');
    const continueBtn = document.getElementById('continue-to-next-lesson-btn');
    const nextLessonPreview = document.getElementById('next-lesson-preview');
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');

    // **PENTING**: Verifikasi semua elemen DOM ditemukan
    if (!keyboardContainer || !lessonTitle || !lessonInstruction || !lessonTextDisplay || !prevLessonBtn || !nextLessonBtn || !modal || !continueBtn || !progressBar || !progressText) {
        console.error("ERROR: Satu atau lebih elemen DOM tidak ditemukan. Pastikan ID di HTML sudah benar.");
        return null;
    }

    // Inisialisasi hidden input di sini
    hiddenInput = document.getElementById('learnTypingHiddenInput');
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'text';
        hiddenInput.id = 'learnTypingHiddenInput';
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';
        hiddenInput.style.pointerEvents = 'none';
        hiddenInput.autocapitalize = 'off';
        hiddenInput.autocomplete = 'off';
        hiddenInput.spellcheck = false;
        document.body.appendChild(hiddenInput);
    }
    // Pastikan hiddenInput langsung fokus setelah dibuat/ditemukan
    setTimeout(() => hiddenInput.focus(), 0);

    return {
        // Elemen DOM
        keyboardContainer,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        modal,
        continueBtn,
        nextLessonPreview,
        hiddenInput,
        progressBar,
        progressText,
    };
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

export function getHiddenInput() {
    return hiddenInput;
}