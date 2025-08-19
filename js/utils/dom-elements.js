// js/utils/dom-elements.js

/**
 * Mencari dan mengembalikan referensi elemen DOM yang dibutuhkan untuk halaman TYPING GAME.
 * @returns {Object|null} Objek berisi referensi elemen DOM, atau null jika ada elemen kunci yang tidak ditemukan.
 */
export function getGameDOMReferences() {
    const hiddenInput = getOrCreateHiddenInput();
    const textDisplay = document.getElementById('textDisplay');
    const restartButton = document.getElementById('restartButton');
    const wpmTicksContainer = document.getElementById('wpmTicks');
    const accuracyTicksContainer = document.getElementById('accuracyTicks');
    const timerTicksContainer = document.getElementById('timerTicks');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const wpmNeedle = document.getElementById('wpmNeedle');
    const wpmValue = document.getElementById('wpmValue');
    const accuracyNeedle = document.getElementById('accuracyNeedle');
    const accuracyValue = document.getElementById('accuracyValue');
    const timerNeedle = document.getElementById('timerNeedle');
    const timerValue = document.getElementById('timerValue');
    const statsContainer = document.getElementById('stats-container'); // dipake show/hide
    const header = document.querySelector('header');
    const menuButton = document.getElementById('MenuButton');

    // Pastikan semua elemen penting ada sebelum mengembalikannya
    if (!hiddenInput || !textDisplay || !restartButton || !wpmTicksContainer || !accuracyTicksContainer || !timerTicksContainer || !darkModeToggle) {
        console.error("ERROR: Beberapa elemen DOM kunci untuk game tidak ditemukan.");
        return null;
    }

    return {
        hiddenInput,
        textDisplay,
        restartButton,
        wpmTicksContainer,
        accuracyTicksContainer,
        timerTicksContainer,
        darkModeToggle,
        wpmNeedle,
        wpmValue,
        accuracyNeedle,
        accuracyValue,
        timerNeedle,
        timerValue,
        statsContainer,
        header,
        menuButton
    };
}

/**
 * Mencari dan mengembalikan referensi elemen DOM yang dibutuhkan untuk halaman PELAJARAN.
 * @returns {Object|null} Objek berisi referensi elemen DOM, atau null jika ada elemen kunci yang tidak ditemukan.
 */
export function getLessonDOMReferences() {
    const hiddenInput = getOrCreateHiddenInput();
    const keyboardContainer = document.getElementById('virtual-keyboard');
    const lessonHeader = document.getElementById('lesson-header');
    const lessonTitle = document.getElementById('lesson-title');
    const lessonInstruction = document.getElementById('lesson-instruction');
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    const nextLessonBtn = document.getElementById('next-lesson-btn');
    const retryLessonBtn = document.getElementById('retry-lesson-btn');
    const lessonCompleteNotification = document.getElementById('lesson-complete-notification');
    const continueBtn = document.getElementById('continue-to-next-lesson-btn');
    const progressContainerWrapper = document.getElementById('progress-container-wrapper');
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');
    const thumbAnimationContainer = document.getElementById('thumb-animation-container');
    const successAnimationSvg = document.getElementById('success-animation-svg');
    const circlePath = document.getElementById('circle-path');
    const checkPath = document.getElementById('check-path');
    const lessonListBtn = document.getElementById('lessons-list');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // Perbaikan: Tambahkan lessonCompleteNotification ke dalam validasi
    if (!hiddenInput || !keyboardContainer || !lessonHeader || !lessonTitle || !lessonInstruction || !lessonTextDisplay || !lessonCompleteNotification) {
        console.error("ERROR: Beberapa elemen DOM kunci untuk pelajaran tidak ditemukan.");
        return null;
    }

    return {
        hiddenInput,
        keyboardContainer,
        lessonHeader,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        retryLessonBtn,
        lessonCompleteNotification,
        continueBtn,
        progressContainerWrapper,
        progressBar,
        progressText,
        thumbAnimationContainer,
        successAnimationSvg,
        circlePath,
        checkPath,
        lessonListBtn,
        darkModeToggle,
    };
}

/**
 * Mencari dan mengembalikan referensi elemen DOM yang dibutuhkan untuk halaman RIWAYAT SKOR.
 * @returns {Object|null} Objek berisi referensi elemen DOM, atau null jika ada elemen kunci yang tidak ditemukan.
 */
export function getHistoryDOMReferences() {
    const wpmProgressChart = document.getElementById('wpmProgressChart');
    const accuracyProgressChart = document.getElementById('accuracyProgressChart');
    const scoreHistoryList = document.getElementById('scoreHistoryList');
    const noHistoryMessage = document.querySelector('.no-history');

    // Kita tidak perlu hiddenInput di sini, jadi tidak dimasukkan dalam validasi
    // Validasi opsional, tapi bagus untuk memastikan elemen penting ada
    if (!wpmProgressChart || !accuracyProgressChart || !scoreHistoryList) {
        console.error("ERROR: Beberapa elemen DOM kunci untuk riwayat skor tidak ditemukan.");
        return null;
    }

    return {
        wpmProgressChart,
        accuracyProgressChart,
        scoreHistoryList,
        noHistoryMessage,
    };
}

/**
 * Fungsi utilitas untuk mendapatkan atau membuat elemen input tersembunyi.
 */
function getOrCreateHiddenInput() {
    let hiddenInput = document.getElementById('hiddenTextInput');
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'text';
        hiddenInput.id = 'hiddenTextInput';
        hiddenInput.className = 'sr-only'; // pakai class helper, ga usah inline style
        hiddenInput.autocapitalize = 'off';
        hiddenInput.autocomplete = 'off';
        hiddenInput.spellcheck = false;
        document.body.appendChild(hiddenInput);
    }
    return hiddenInput;
}
