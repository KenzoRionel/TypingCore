// js/utils/dom-elements.js

/**
 * Mengelola semua referensi elemen DOM yang dibutuhkan oleh seluruh aplikasi,
 * baik untuk halaman utama (game) maupun halaman pelajaran.
 * File ini berfungsi sebagai satu sumber kebenaran (single source of truth)
 * untuk semua elemen DOM.
 * @returns {Object} Objek berisi semua referensi elemen DOM yang ditemukan.
 */
export function getDOMReferences() {
    // Hidden Input (dibuat jika tidak ada, untuk memastikan selalu tersedia)
    let hiddenInput = document.getElementById('hidden-input');
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'text';
        hiddenInput.id = 'hidden-input';
        hiddenInput.className = 'hidden-input';
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';
        hiddenInput.style.pointerEvents = 'none';
        hiddenInput.style.width = '1px';
        hiddenInput.style.height = '1px';
        hiddenInput.style.top = '-9999px';
        hiddenInput.style.left = '-9999px';
        hiddenInput.autocapitalize = 'off';
        hiddenInput.autocomplete = 'off';
        hiddenInput.spellcheck = false;
        document.body.appendChild(hiddenInput);
    }
    
    const elements = {
        // --- Referensi untuk halaman pelajaran ---
        keyboardContainer: document.getElementById('virtual-keyboard'),
        lessonHeader: document.getElementById('lesson-header'),
        lessonTitle: document.getElementById('lesson-title'),
        lessonInstruction: document.getElementById('lesson-instruction'),
        lessonTextDisplay: document.getElementById('lesson-text-display'),
        prevLessonBtn: document.getElementById('prev-lesson-btn'),
        nextLessonBtn: document.getElementById('next-lesson-btn'),
        retryLessonBtn: document.getElementById('retry-lesson-btn'),
        lessonCompleteNotification: document.getElementById('lesson-complete-notification'),
        continueBtn: document.getElementById('continue-to-next-lesson-btn'),
        progressContainerWrapper: document.getElementById('progress-container-wrapper'),
        progressBar: document.getElementById('lesson-progress-bar'),
        progressText: document.getElementById('progress-percentage'),
        thumbAnimationContainer: document.getElementById('thumb-animation-container'),
        successAnimationSvg: document.getElementById('success-animation-svg'),
        circlePath: document.getElementById('circle-path'),
        checkPath: document.getElementById('check-path'),

        // --- Referensi untuk halaman utama (typing game) ---
        textDisplay: document.getElementById('textDisplay'),
        restartButton: document.getElementById('restartButton'),
        accuracySpan: document.getElementById('accuracy'),
        timerSpan: document.getElementById('timer'),
        statsContainer: document.getElementById('stats-container'),
        wpmValueText: document.getElementById('wpmValue'),
        wpmNeedle: document.getElementById('wpmNeedle'),
        wpmTicksContainer: document.getElementById('wpmTicks'),
        accuracyValueText: document.getElementById('accuracyValue'),
        accuracyNeedle: document.getElementById('accuracyNeedle'),
        accuracyTicksContainer: document.getElementById('accuracyTicks'),
        timerValueText: document.getElementById('timerValue'),
        timerNeedle: document.getElementById('timerNeedle'),
        timerTicksContainer: document.getElementById('timerTicks'),
        resultsDisplayArea: document.getElementById('resultsDisplayArea'),
        finalWPMText: document.getElementById('finalWPM'),
        finalAccuracyText: document.getElementById('finalAccuracy'),
        finalTimeText: document.getElementById('finalTime'),
        finalErrorsText: document.getElementById('finalErrors'),
        finalTotalWordsText: document.getElementById('finalTotalWords'),
        finalCorrectWordsText: document.getElementById('finalCorrectWords'),
        finalIncorrectWordsText: document.getElementById('finalIncorrectWords'),
        resultModal: document.getElementById('resultModal'),
        scoreHistoryList: document.getElementById('scoreHistoryList'),
        noHistoryMessage: document.querySelector('#scoreHistoryList .no-history'),
        wpmProgressChartCanvas: document.getElementById('wpmProgressChart'),
        accuracyProgressChartCanvas: document.getElementById('accuracyProgressChart'),

        // --- Elemen yang digunakan di kedua halaman ---
        hiddenInput: hiddenInput,
        darkModeToggle: document.getElementById('darkModeToggle'),
    };
    
    return elements;
}
