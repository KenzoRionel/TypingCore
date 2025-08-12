// js/history/score-manager.js

// Perbaikan: Ganti import { DOM } menjadi import { getDOMReferences }
import { getDOMReferences } from '../utils/dom-elements.js';
import { renderScoreTable } from './history-dom.js';
import { renderProgressCharts, destroyCharts } from './history-chart.js';

export function getTypingScores() {
    return JSON.parse(localStorage.getItem('typingScores') || '[]');
}

export function saveScore(wpm, accuracy, time, errors, type, mode, correctWords, incorrectWords) {
    const scores = getTypingScores();
    const newScore = {
        date: new Date().toISOString(),
        wpm: wpm,
        accuracy: accuracy,
        time: time,
        errors: errors,
        type: type, // Contoh: "Tes Kata Umum (Acak)"
        mode: mode, // Contoh: 'default'
        correctWords: correctWords,
        incorrectWords: incorrectWords
    };
    scores.push(newScore);
    localStorage.setItem('typingScores', JSON.stringify(scores));
    // Opsional: Jika Anda ingin memperbarui tampilan riwayat segera setelah skor disimpan
    if (window.location.pathname.includes('score-history.html')) {
        displayFullScoreHistory();
    }
}

export function displayFullScoreHistory() {
    // Perbaikan: Panggil getDOMReferences()
    const DOM = getDOMReferences();
    const scores = getTypingScores();

    if (scores.length > 0) {
        if (DOM.noHistoryMessage) DOM.noHistoryMessage.style.display = 'none';
        renderScoreTable(scores);
        renderProgressCharts(scores);
    } else {
        if (DOM.noHistoryMessage) DOM.noHistoryMessage.style.display = 'block';
        if (DOM.scoreHistoryList) {
            DOM.scoreHistoryList.innerHTML = '<p class="no-history">Belum ada riwayat skor. Mulai mengetik untuk menyimpan skor!</p>';
        }
        destroyCharts();
    }
}

// Paparkan fungsi saveScore secara global agar bisa dipanggil dari default-mode-script.js
window.saveScore = saveScore;
// Paparkan fungsi displayFullScoreHistory secara global agar bisa dipanggil dari HTML
window.displayFullScoreHistory = displayFullScoreHistory;
