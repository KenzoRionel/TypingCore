// js/main.js

import { DOM } from './utils/dom-elements.js';
import { createSpeedometerTicks, wpmMax, accuracyMax, timerMax, wpmTickColors, accuracyTickColors, setTimerSpeedometer, setTimerSpeedometerMax, getTimerTickColors } from './utils/speedometer.js';
import { handleKeydown } from './game/game-events.js';
import { resetTestState, initGameListeners, invalidateTest } from './game/game-logic.js';
import { gameState } from './game/game-state.js';
import { top200Words, top1000Words, top10000Words } from './data/default-words.js';

// Set default kata-kata saat aplikasi pertama kali dijalankan
window.defaultKataKata = top200Words;

function setWordList(type) {
    let wordList = [];
    if (type === '200') {
        wordList = top200Words;
    } else if (type === '1000') {
        wordList = top1000Words;
    } else if (type === '10000') {
        wordList = top10000Words;
    }
    window.gameState.fullTextWords = shuffleArray(wordList).slice(0, 100); // contoh ambil 100 kata
    window.gameState.typedWordIndex = 0;
    window.gameState.typedWordCorrectness = [];
    window.gameState.userTypedWords = [];
}

function shuffleArray(array) {
    return array.slice().sort(() => Math.random() - 0.5);
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial Setup
    createSpeedometerTicks(DOM.wpmTicksContainer, 0, wpmMax, 10, wpmTickColors);
    createSpeedometerTicks(DOM.accuracyTicksContainer, 0, accuracyMax, 10, accuracyTickColors);
    createSpeedometerTicks(DOM.timerTicksContainer, 0, timerMax, 5, getTimerTickColors(timerMax));

    if (DOM.restartButton) {
        DOM.restartButton.addEventListener('click', () => {
            resetTestState();
        });
    }

    // Ini adalah event listener input yang menangani logika mengetik,
    // TIDAK BOLEH dihapus. Event listener di initGameListeners()
    // akan berjalan secara paralel atau menangani kondisi 'start typing'.
    DOM.hiddenTextInput.addEventListener('input', () => {
        // Ini adalah tempat Anda memproses kata yang diketik dan highlight
        // (jika belum dipindahkan sepenuhnya ke handleKeydown)
        // Jika handleKeydown sudah menangani semua, ini mungkin bisa lebih sederhana
        // atau dihapus, tapi untuk saat ini biarkan saja.
    });
    DOM.hiddenTextInput.addEventListener('keydown', handleKeydown);

    // Expose resetTest globally if needed by other scripts (e.g., from HTML)
    window.resetTest = resetTestState;

    // PENTING: Panggil initGameListeners() di sini
    initGameListeners(); // TAMBAHAN: Panggil fungsi inisialisasi listener game

    // Panggil resetTestState() untuk inisialisasi awal (termasuk menyembunyikan speedometer)
    resetTestState();

    // Event listener untuk tombol mode waktu
    document.querySelectorAll('.time-mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const selectedTime = parseInt(this.getAttribute('data-time'), 10);

            // Hilangkan class 'active' dari semua tombol
            document.querySelectorAll('.time-mode-btn').forEach(b => b.classList.remove('active'));
            // Tambahkan class 'active' pada tombol yang dipilih
            this.classList.add('active');

            if (window.gameState) {
                window.gameState.TIMED_TEST_DURATION = selectedTime;
                window.gameState.timeRemaining = selectedTime;
            }
            setTimerSpeedometerMax(selectedTime); // Update speedometer timer
            if (typeof window.resetTest === 'function') {
                window.resetTest();
            }
            DOM.hiddenTextInput.focus(); // Kembalikan fokus
        });
    });

    document.querySelectorAll('.word-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.word-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const selectedType = this.getAttribute('data-word-type');
            // Ubah window.defaultKataKata sesuai pilihan
            if (selectedType === '200') {
                window.defaultKataKata = top200Words;
            } else if (selectedType === '1000') {
                window.defaultKataKata = top1000Words;
            } else if (selectedType === '10000') {
                window.defaultKataKata = top10000Words;
            }
            // Reset test agar text-display menggunakan kata baru
            if (typeof window.resetTest === 'function') {
                window.resetTest();
            }
            DOM.hiddenTextInput.focus(); // Kembalikan fokus
        });
    });

    document.getElementById('darkModeToggle').addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        DOM.hiddenTextInput.focus(); // Kembalikan fokus
    });

    // Event listener untuk tombol mode kursor
    document.querySelectorAll('.cursor-mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Hapus 'active' dari semua tombol mode kursor
            document.querySelectorAll('.cursor-mode-btn').forEach(b => b.classList.remove('active'));
            // Tambahkan 'active' ke tombol yang diklik
            this.classList.add('active');

            const selectedMode = this.getAttribute('data-cursor-mode');
            if (window.gameState) {
                window.gameState.cursorMode = selectedMode;
            }

            // Tambahkan atau hapus kelas pada body untuk styling CSS yang berbeda
            if (selectedMode === 'caret') {
                DOM.textDisplay.classList.add('caret-mode-active');
            } else {
                DOM.textDisplay.classList.remove('caret-mode-active');
            }

            // Panggil update highlighting untuk segera menerapkan perubahan kursor
            if (typeof window.updateWordHighlighting === 'function') {
                window.updateWordHighlighting();
            }
            DOM.hiddenTextInput.focus(); // Kembalikan fokus
        });
    });
});

// Page Visibility API untuk mendeteksi pergantian tab
document.addEventListener('visibilitychange', () => {
    // Jika halaman disembunyikan DAN tes sedang berjalan (startTime ada)
    if (document.hidden && gameState.startTime && !gameState.isTestInvalid) {
        invalidateTest("Tab diganti saat tes berlangsung.");
    }
});

// Event listener untuk mendeteksi saat jendela tidak aktif (blur)
window.addEventListener('blur', () => {
    if (gameState.startTime && !gameState.isTestInvalid) {
        invalidateTest("Jendela browser tidak aktif.");
    }
});