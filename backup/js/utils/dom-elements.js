// js/utils/dom-elements.js (updated)

export const DOM = {
    // Elemen Input/Display Utama (dari default-mode-script.js)
    textDisplay: document.getElementById('textDisplay'),
    hiddenTextInput: document.getElementById('hiddenTextInput'),
    restartButton: document.getElementById('restartButton'),
    accuracySpan: document.getElementById('accuracy'), // Mungkin tidak lagi digunakan
    timerSpan: document.getElementById('timer'),     // Mungkin tidak lagi digunakan

    // Elemen Speedometer
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

    // Elemen untuk menampilkan hasil (bukan modal)
    resultsDisplayArea: document.getElementById('resultsDisplayArea'),
    finalWPMText: document.getElementById('finalWPM'),
    finalAccuracyText: document.getElementById('finalAccuracy'),
    finalTimeText: document.getElementById('finalTime'),
    finalErrorsText: document.getElementById('finalErrors'),
    finalTotalWordsText: document.getElementById('finalTotalWords'),
    finalCorrectWordsText: document.getElementById('finalCorrectWords'),
    finalIncorrectWordsText: document.getElementById('finalIncorrectWords'),
    resultModal: document.getElementById('resultModal'), // Elemen modal yang mungkin masih ada

    // --- BARU: Elemen untuk Score History ---
    scoreHistoryList: document.getElementById('scoreHistoryList'),
    noHistoryMessage: null, // Akan diinisialisasi setelah scoreHistoryList.querySelector
    wpmProgressChartCanvas: document.getElementById('wpmProgressChart'),
    accuracyProgressChartCanvas: document.getElementById('accuracyProgressChart'),
};

// Inisialisasi noHistoryMessage setelah DOM.scoreHistoryList tersedia
document.addEventListener('DOMContentLoaded', () => {
    if (DOM.scoreHistoryList) {
        DOM.noHistoryMessage = DOM.scoreHistoryList.querySelector('.no-history');
    }
});