// js/history/score-manager.js
import { getHistoryDOMReferences } from '../utils/dom-elements.js';
import { renderScoreTable } from './history-dom.js';
import { renderProgressCharts, destroyCharts } from './history-chart.js';

function formatDate(dateStr, locale = 'id-ID') {
    return new Date(dateStr).toLocaleString(locale, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

export function getTypingScores() {
    return JSON.parse(localStorage.getItem('typingScores') || '[]');
}

export function saveScore(wpm, accuracy, time, errors, type, mode, correctWords, incorrectWords, replayData = null) {
    console.log('saveScore called with replayData:', replayData ? 'YES' : 'NO');
    
    const scores = getTypingScores();
    const scoreEntry = {
        date: new Date().toISOString(),
        wpm, accuracy, time, errors,
        type, mode,
        correctWords, incorrectWords
    };
    
    // Add replay data if available
    if (replayData) {
        console.log('Adding replayData to score entry');
        scoreEntry.replayData = replayData;
    } else {
        console.log('WARNING: No replayData provided!');
    }
    
    scores.push(scoreEntry);
    localStorage.setItem('typingScores', JSON.stringify(scores));
    console.log('Score saved, total scores:', scores.length);
    
    if (window.location.pathname.includes('score-history.html')) {
        displayFullScoreHistory();
    }
}

export function displayFullScoreHistory() {
    // Perbaikan: Ganti getGameDOMReferences() menjadi getHistoryDOMReferences()
    const DOM = getHistoryDOMReferences();
    if (!DOM) {
        console.error("Gagal mendapatkan referensi DOM untuk riwayat skor. Fungsi dibatalkan.");
        return;
    }
    
    const scores = getTypingScores();
    console.log('displayFullScoreHistory: Total scores:', scores.length);
    
    // Check if any scores have replayData
    const scoresWithReplay = scores.filter(s => s.replayData);
    console.log('Scores with replayData:', scoresWithReplay.length);

    if (!scores.length) {
        if (DOM.noHistoryMessage) DOM.noHistoryMessage.style.display = 'block';
        if (DOM.scoreHistoryList) {
            DOM.scoreHistoryList.innerHTML = '<p class="no-history">Belum ada riwayat skor. Mulai mengetik untuk menyimpan skor!</p>';
        }
        destroyCharts();
        return;
    }

    if (DOM.noHistoryMessage) DOM.noHistoryMessage.style.display = 'none';

    // Render table
    renderScoreTable(scores, formatDate);

    // Render charts
    renderProgressCharts(scores, formatDate);
}

window.saveScore = saveScore;
window.displayFullScoreHistory = displayFullScoreHistory;
