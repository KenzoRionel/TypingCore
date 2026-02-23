// js/history/score-manager.js
import { getHistoryDOMReferences } from '../utils/dom-elements.js';
import { renderScoreTable } from './history-dom.js';
import { renderProgressCharts, destroyCharts } from './history-chart.js';

// Maximum number of scores to store in localStorage to prevent QuotaExceededError
const MAX_SCORES = 50;

function formatDate(dateStr, locale = 'id-ID') {
    return new Date(dateStr).toLocaleString(locale, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

export function getTypingScores() {
    return JSON.parse(localStorage.getItem('typingScores') || '[]');
}

/**
 * Cleanup old scores to free up localStorage space
 * Removes oldest scores when exceeding MAX_SCORES limit
 */
function cleanupOldScores(scores) {
    if (scores.length > MAX_SCORES) {
        console.log(`Cleaning up old scores: ${scores.length} -> ${MAX_SCORES}`);
        // Keep only the most recent MAX_SCORES entries
        return scores.slice(-MAX_SCORES);
    }
    return scores;
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
    
    // Cleanup old scores to prevent localStorage quota exceeded
    const trimmedScores = cleanupOldScores(scores);
    
    try {
        localStorage.setItem('typingScores', JSON.stringify(trimmedScores));
        console.log('Score saved, total scores:', trimmedScores.length);
    } catch (e) {
        // Handle QuotaExceededError - localStorage is full
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            console.error('localStorage quota exceeded! Removing oldest scores and retrying...');
            
            // Remove half of the oldest scores and try again
            const reducedScores = trimmedScores.slice(-Math.floor(MAX_SCORES / 2));
            try {
                localStorage.setItem('typingScores', JSON.stringify(reducedScores));
                console.log('Score saved after cleanup, total scores:', reducedScores.length);
            } catch (e2) {
                console.error('Failed to save score even after cleanup:', e2);
                alert('Penyimpanan penuh! Riwayat skor tidak dapat disimpan. Silakan hapus riwayat lama di halaman Score History.');
            }
        } else {
            console.error('Error saving score:', e);
        }
    }
    
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
