// js/history/score-manager.js
import { getDOMReferences } from '../utils/dom-elements.js';
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

export function saveScore(wpm, accuracy, time, errors, type, mode, correctWords, incorrectWords) {
    const scores = getTypingScores();
    scores.push({
        date: new Date().toISOString(),
        wpm, accuracy, time, errors,
        type, mode,
        correctWords, incorrectWords
    });
    localStorage.setItem('typingScores', JSON.stringify(scores));
    if (window.location.pathname.includes('score-history.html')) {
        displayFullScoreHistory();
    }
}

export function displayFullScoreHistory() {
    const DOM = getDOMReferences();
    const scores = getTypingScores();

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
