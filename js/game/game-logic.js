// js/game/game-logic.js

// Perbaikan: Ganti import { DOM } menjadi import { getDOMReferences }
import { getDOMReferences } from '../utils/dom-elements.js';
import { gameState } from './game-state.js';
import { setWpmSpeedometer, setAccuracySpeedometer, setTimerSpeedometer, timerMax } from '../utils/speedometer.js';
import { prepareAndRenderLines, renderCurrentLine, updateWordHighlighting, triggerShakeAnimation } from '../utils/text-display.js';
import { renderResultChart } from '../history/result-chart.js';

let hasStartedTyping = false; // Flag untuk melacak apakah mengetik sudah dimulai

// --- FUNGSI BARU UNTUK MENGATUR VISIBILITAS STATS CONTAINER ---
function showStatsContainer() {
    const DOM = getDOMReferences();
    if (DOM.statsContainer) { 
        DOM.statsContainer.classList.add('show');
    }
}

function hideStatsContainer() {
    const DOM = getDOMReferences();
    if (DOM.statsContainer) { 
        DOM.statsContainer.classList.remove('show');
    }
}
// --- AKHIR FUNGSI BARU ---


export function generateAndAppendWords(numWords) {
    if (!window.defaultKataKata || window.defaultKataKata.length === 0) {
        console.error("Tidak dapat menghasilkan kata baru: window.defaultKataKata kosong atau tidak terdefinisi.");
        for (let i = 0; i < numWords; i++) {
            gameState.fullTextWords.push("placeholder");
            gameState.typedWordCorrectness.push(false);
            gameState.userTypedWords.push("");
        }
        return;
    }
    for (let i = 0; i < numWords; i++) {
        const randomIndex = Math.floor(Math.random() * window.defaultKataKata.length);
        gameState.fullTextWords.push(window.defaultKataKata[randomIndex]);
        gameState.typedWordCorrectness.push(false);
        gameState.userTypedWords.push("");
    }
}

// export function processTypedWord() { ... tidak ada perubahan di sini }
export function processTypedWord() {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    // Perbaikan: Gunakan DOM.hiddenInput
    const currentWordTyped = DOM.hiddenInput.value;
    const targetWord = gameState.fullTextWords[gameState.typedWordIndex];

    gameState.userTypedWords[gameState.typedWordIndex] = currentWordTyped;

    if (!targetWord) {
        gameState.typedWordCorrectness[gameState.typedWordIndex] = false;
        gameState.totalIncorrectWords++;
        return;
    }

    let wordCorrectCharsTemp = 0;
    let wordIncorrectCharsTemp = 0;
    let isWordCorrect = true;

    for (let i = 0; i < Math.max(currentWordTyped.length, targetWord.length); i++) {
        if (i < currentWordTyped.length && i < targetWord.length) {
            if (currentWordTyped[i] === targetWord[i]) {
                wordCorrectCharsTemp++;
            } else {
                wordIncorrectCharsTemp++;
                isWordCorrect = false;
            }
        } else if (i < currentWordTyped.length) {
            wordIncorrectCharsTemp++;
            isWordCorrect = false;
        } else {
            wordIncorrectCharsTemp++;
            isWordCorrect = false;
        }
    }

    if (currentWordTyped.length !== targetWord.length || wordIncorrectCharsTemp > 0) {
        isWordCorrect = false;
    }

    gameState.correctChars += wordCorrectCharsTemp;
    gameState.incorrectChars += wordIncorrectCharsTemp;

    gameState.typedWordCorrectness[gameState.typedWordIndex] = isWordCorrect;

    if (isWordCorrect) {
        gameState.totalCorrectWords++;
    } else {
        gameState.totalIncorrectWords++;
    }
}


export function updateRealtimeStats() {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    if (!gameState.startTime) {
        setWpmSpeedometer(0);
        setAccuracySpeedometer(0);
        return;
    }

    const elapsedTime = (new Date().getTime() - gameState.startTime) / 1000;
    if (elapsedTime <= 0) return;

    // Hitung karakter benar dan salah dari kata-kata yang sudah selesai
    let totalCorrectChars = gameState.correctChars;
    let totalIncorrectChars = gameState.incorrectChars;

    // Tambahkan karakter dari kata yang sedang diketik
    // Perbaikan: Gunakan DOM.hiddenInput
    const currentWordTypedValue = DOM.hiddenInput.value;
    const targetWordForTyping = gameState.fullTextWords[gameState.typedWordIndex] || '';
    for (let i = 0; i < currentWordTypedValue.length; i++) {
        if (i < targetWordForTyping.length && currentWordTypedValue[i] === targetWordForTyping[i]) {
            totalCorrectChars++;
        } else {
            totalIncorrectChars++;
        }
    }

    // Hitung WPM (Net WPM)
    const wpm = Math.round((totalCorrectChars / 5) / (elapsedTime / 60));
    setWpmSpeedometer(wpm);

    // Hitung Raw WPM (Total karakter diketik / 5 / waktu)
    const totalTypedChars = totalCorrectChars + totalIncorrectChars;
    const rawWpm = Math.round((totalTypedChars / 5) / (elapsedTime / 60));

    // Hitung Akurasi
    const accuracy = totalTypedChars > 0 ? Math.round((totalCorrectChars / totalTypedChars) * 100) : 0;
    setAccuracySpeedometer(accuracy);

}

export function calculateAndDisplayFinalResults() {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    // Sembunyikan kontainer text display dan menu button
    const textDisplayContainer = document.querySelector('.text-display-container');
    if (textDisplayContainer) {
        textDisplayContainer.style.display = 'none';
    }
    const menuButton = document.getElementById('MenuButton');
    if (menuButton) {
        menuButton.style.display = 'none';
    }

    // Tampilkan kontainer hasil
    const resultsArea = document.getElementById('resultsDisplayArea');
    if (resultsArea) {
        resultsArea.style.display = 'block';
    }

    // Hitung Akurasi final
    const finalCorrectChars = gameState.correctChars;
    const finalIncorrectChars = gameState.incorrectChars;
    const totalTypedChars = finalCorrectChars + finalIncorrectChars;
    const finalAccuracy = totalTypedChars > 0 ? Math.round((finalCorrectChars / totalTypedChars) * 100) : 0;

    // Hitung WPM final yang lebih akurat
    const totalTestMinutes = gameState.TIMED_TEST_DURATION / 60;
    const finalWPM = totalTestMinutes > 0 ? Math.round((finalCorrectChars / 5) / totalTestMinutes) : 0;

    // Hitung Konsistensi
    let consistency = 0;
    const wpmHistory = gameState.history.map(h => h.wpm);
    if (wpmHistory.length > 1) {
        const mean = finalWPM; // Gunakan WPM final yang baru sebagai rata-rata
        const stdDev = Math.sqrt(wpmHistory.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / wpmHistory.length);
        // Normalisasi: (1 - (stdDev / mean)) * 100. Semakin kecil stdDev, semakin tinggi konsistensi.
        if (mean > 0) {
            consistency = Math.max(0, Math.round((1 - (stdDev / mean)) * 100));
        }
    }

    // Isi statistik di bawah grafik
    document.getElementById('finalWPM').textContent = finalWPM;
    document.getElementById('finalAccuracy').textContent = `${finalAccuracy}%`;
    document.getElementById('finalTime').textContent = `${gameState.TIMED_TEST_DURATION}s`;
    document.getElementById('finalChars').textContent = `${finalCorrectChars} / ${finalIncorrectChars} / ${totalTypedChars}`;
    document.getElementById('finalConsistency').textContent = `${consistency}%`;

    // Render grafik
    renderResultChart(gameState.history);

    // Simpan skor (jika fungsi ada)
    if (typeof window.saveScore === 'function') {
        window.saveScore(
            finalWPM,
            finalAccuracy,
            gameState.TIMED_TEST_DURATION,
            finalIncorrectChars,
            "Tes Kata Umum (Acak)",
            'default',
            gameState.totalCorrectWords,
            gameState.totalIncorrectWords
        );
    }
}

export function endTest() {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.updateStatsInterval);
    clearTimeout(gameState.inactivityTimer); // Hentikan timer inaktivitas
    // Perbaikan: Gunakan DOM.hiddenInput
    DOM.hiddenInput.disabled = true;
    if (!gameState.isTestInvalid) {
        calculateAndDisplayFinalResults();
    }
    gameState.startTime = null; // Reset startTime untuk mencegah invalidasi setelah tes selesai
    setTimerSpeedometer(0);
    hideStatsContainer();
}

export function invalidateTest(reason) {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    gameState.isTestInvalid = true;
    endTest(); // Panggil endTest untuk menghentikan semua
    
    // Tampilkan pesan pembatalan
    const textDisplayContainer = document.querySelector('.text-display-container');
    if (textDisplayContainer) {
        textDisplayContainer.style.display = 'flex';
        DOM.textDisplay.innerHTML = `<div class="invalid-test-message">Tes dibatalkan: ${reason}</div>`;
    }

    // Sembunyikan area hasil jika sempat muncul
    const resultsArea = document.getElementById('resultsDisplayArea');
    if (resultsArea) {
        resultsArea.style.display = 'none';
    }
}

export function resetTestState() {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.updateStatsInterval);
    clearTimeout(gameState.inactivityTimer); // Hentikan timer inaktivitas saat reset
    gameState.isTestInvalid = false; // Reset status invalid
    gameState.typedWordIndex = 0;
    gameState.correctChars = 0;
    gameState.incorrectChars = 0;
    gameState.startTime = null;
    gameState.timeRemaining = gameState.TIMED_TEST_DURATION;
    gameState.totalCorrectWords = 0;
    gameState.totalIncorrectWords = 0;
    gameState.typedWordCorrectness = [];
    gameState.userTypedWords = [];
    gameState.lines = [];
    gameState.currentLineIndex = 0;
    gameState.history = []; // KOSONGKAN RIWAYAT GRAFIK

    // Perbaikan: Gunakan DOM.hiddenInput
    if (DOM.accuracySpan) DOM.accuracySpan.textContent = '0%';
    if (DOM.timerSpan) DOM.timerSpan.textContent = gameState.TIMED_TEST_DURATION;

    DOM.hiddenInput.value = '';
    DOM.hiddenInput.disabled = false;
    // DOM.hiddenInput.focus(); // Ini akan fokus ulang input
    gameState.fullTextWords = [];
    DOM.textDisplay.innerHTML = '';
    DOM.textDisplay.scrollTop = 0;
    DOM.textDisplay.classList.remove('error-shake');

    setWpmSpeedometer(0);
    setAccuracySpeedometer(0);
    setTimerSpeedometer(timerMax);

    // Sembunyikan area hasil dan tampilkan kembali area teks
    const resultsArea = document.getElementById('resultsDisplayArea');
    if (resultsArea) {
        resultsArea.style.display = 'none';
    }
    const textDisplayContainer = document.querySelector('.text-display-container');
    if (textDisplayContainer) {
        textDisplayContainer.style.display = 'flex'; // Gunakan 'flex' sesuai gaya aslinya
    }

    // Perbaikan: Gunakan DOM.finalWPM, DOM.finalAccuracy, dst
    if (DOM.finalWPM) DOM.finalWPM.textContent = '--';
    if (DOM.finalAccuracy) DOM.finalAccuracy.textContent = '--%';
    if (DOM.finalTime) DOM.finalTime.textContent = `-- detik`;
    if (DOM.finalErrors) DOM.finalErrors.textContent = '--';
    if (DOM.finalTotalWords) DOM.finalTotalWords.textContent = '--';
    if (DOM.finalCorrectWords) DOM.finalCorrectWords.textContent = '--';
    if (DOM.finalIncorrectWords) DOM.finalIncorrectWords.textContent = '--';

    generateAndAppendWords(gameState.INITIAL_WORD_BUFFER);
    prepareAndRenderLines();
    // Perbaikan: Gunakan DOM.hiddenInput
    DOM.hiddenInput.focus();

    hasStartedTyping = false; // --- TAMBAHAN: Reset flag saat tes di-reset ---
    hideStatsContainer(); // --- TAMBAHAN: Sembunyikan speedometer saat tes di-reset ---
}

export function startTimer() {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    
    // Mulai timer utama
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        setTimerSpeedometer(gameState.timeRemaining);

        if (gameState.timeRemaining <= 0) {
            endTest();
        }
    }, 1000);

    // Mulai timer statistik
    gameState.updateStatsInterval = setInterval(() => {
        updateRealtimeStats();
    }, 100);

    // Mulai timer inaktivitas
    startInactivityTimer();
}

export function startInactivityTimer() {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    clearTimeout(gameState.inactivityTimer); // Hapus timer lama jika ada
    gameState.inactivityTimer = setTimeout(() => {
        invalidateTest("User AFK / Tidak ada aktivitas.");
    }, 10000);
}

// --- MODIFIKASI: Tambahkan event listener untuk input pertama kali ---
// Fungsi ini akan dipanggil dari luar game-logic (misalnya main.js)
// untuk menginisialisasi event listener setelah DOM dimuat.
export function initGameListeners() {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    // Perbaikan: Gunakan DOM.hiddenInput
    DOM.hiddenInput.addEventListener('input', (event) => {
        // Jika belum mulai mengetik dan input bukan spasi pertama
        // (spasi pertama bisa jadi bagian dari input normal atau error)
        // Kita anggap input pertama yang bukan spasi adalah awal mengetik
        if (!hasStartedTyping && event.data && event.data.trim() !== '') {
            hasStartedTyping = true;
            showStatsContainer(); // Tampilkan speedometer
            // Mulai timer di sini jika belum dimulai oleh logika lain
            if (!gameState.startTime) { // Pastikan timer belum berjalan
                    gameState.startTime = new Date().getTime();
                    startTimer();
            }
        } else if (!hasStartedTyping && !event.data && DOM.hiddenInput.value.length === 1 && event.inputType === 'insertText') {
            // Ini bisa menangani kasus copy-paste satu karakter pertama
            hasStartedTyping = true;
            showStatsContainer();
            if (!gameState.startTime) {
                    gameState.startTime = new Date().getTime();
                    startTimer();
            }
        }
        // ... Logika penanganan input mengetik Anda yang sudah ada ...
        // Misalnya, updateWordHighlighting, processTypedWord, dll.
        // Asumsi ini sudah ditangani di bagian lain atau dipanggil setelah ini
    });

    // Panggil resetTestState saat halaman pertama kali dimuat
    document.addEventListener('DOMContentLoaded', () => {
        resetTestState(); // Memastikan speedometer tersembunyi dan state direset
    });
}
