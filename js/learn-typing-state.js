// learn-typing-state.js (FILE BARU)
// Ini adalah tempat semua deklarasi elemen DOM dan variabel state utama aplikasi
let hiddenInput; // Deklarasi di sini agar bisa diakses secara global di modul ini

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
    const nextLessonPreview = document.getElementById('next-lesson-preview'); // Pertahankan jika digunakan di HTML
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');


    // **PENTING**: Verifikasi semua elemen DOM ditemukan
    if (!keyboardContainer || !lessonTitle || !lessonInstruction || !lessonTextDisplay || !prevLessonBtn || !nextLessonBtn || !modal || !continueBtn || !progressBar || !progressText) {
        console.error("ERROR: Satu atau lebih elemen DOM tidak ditemukan. Pastikan ID di HTML sudah benar.");
        return null; // Mengembalikan null jika ada elemen vital yang hilang
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


    // 2. DEKLARASI STATE APLIKASI UTAMA
    let currentLessonIndex = 0;
    let currentStepIndex = 0;
    let currentCharIndex = 0;
    let waitingForAnim = { value: false }; // Masih ok karena reference type
    let lesson2Finished = false; // Flag untuk menandai apakah pelajaran 2 sudah selesai

    // STATE PELAJARAN 2 (Module-scoped di learn-typing-logic, tapi bisa diinisialisasi di sini)
    // Akan di-export dan di-import oleh learn-typing-logic.js
    let lesson2State = 0;
    let lesson2SequenceIndex = 0;


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
        hiddenInput, // Sertakan hiddenInput
        progressBar,
        progressText,

        // Variabel State
        currentLessonIndex,
        currentStepIndex,
        currentCharIndex,
        waitingForAnim,
        lesson2Finished,
        lesson2State, // Export state pelajaran 2
        lesson2SequenceIndex // Export sequence index pelajaran 2
    };
}

// Fungsi untuk memperbarui nilai state dari luar (jika diperlukan)
// Ini adalah cara untuk memodifikasi state yang dideklarasikan di sini
export function updateState(key, value) {
    // Karena variabel ini let dan ada di scope modul ini, kita bisa langsung memodifikasinya
    // Ini adalah pendekatan yang lebih sederhana daripada getters/setters yang rumit
    // untuk kasus sederhana seperti ini.
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