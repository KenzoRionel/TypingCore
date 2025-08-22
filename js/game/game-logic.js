// js/game/game-logic.js

// Perbaikan: Ganti import { DOM } menjadi import { getGameDOMReferences }
import { getGameDOMReferences } from '../utils/dom-elements.js';
import { setWpmSpeedometer, setAccuracySpeedometer, setTimerSpeedometer, timerMax } from '../utils/speedometer.js';
import { prepareAndRenderLines, renderAllLines, updateWordHighlighting, triggerShakeAnimation } from '../utils/text-display.js';
import { renderResultChart } from '../history/result-chart.js';
import { gameState } from './game-state.js';
import { lockTextDisplayHeightTo3Lines } from '../utils/text-display.js';
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

export function processTypedWord() {
    const DOM = getGameDOMReferences();
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
    const DOM = getGameDOMReferences();
    if (!gameState.startTime) {
        setWpmSpeedometer(0);
        setAccuracySpeedometer(0);
        return;
    }

    const elapsedTime = (new Date().getTime() - gameState.startTime) / 1000;
    if (elapsedTime <= 0) return;

    let totalCorrectChars = gameState.correctChars;
    let totalIncorrectChars = gameState.incorrectChars;

    const currentWordTypedValue = DOM.hiddenInput.value;
    const targetWordForTyping = gameState.fullTextWords[gameState.typedWordIndex] || '';
    for (let i = 0; i < currentWordTypedValue.length; i++) {
        if (i < targetWordForTyping.length && currentWordTypedValue[i] === targetWordForTyping[i]) {
            totalCorrectChars++;
        } else {
            totalIncorrectChars++;
        }
    }

    const wpm = Math.round((totalCorrectChars / 5) / (elapsedTime / 60));
    setWpmSpeedometer(wpm);

    const totalTypedChars = totalCorrectChars + totalIncorrectChars;
    const rawWpm = Math.round((totalTypedChars / 5) / (elapsedTime / 60));

    const accuracy = totalTypedChars > 0 ? Math.round((totalCorrectChars / totalTypedChars) * 100) : 0;
    setAccuracySpeedometer(accuracy);
}

export function calculateAndDisplayFinalResults() {
    const DOM = getGameDOMReferences();

    const textDisplayContainer = document.querySelector('.text-display-container');
    if (textDisplayContainer) textDisplayContainer.style.display = 'none';

    // Konsisten pakai DOM.menuButton
    if (DOM.menuButton) DOM.menuButton.style.display = 'none';

    const resultsArea = document.getElementById('resultsDisplayArea');
    if (resultsArea) resultsArea.style.display = 'block';

    const finalCorrectChars = gameState.correctChars;
    const finalIncorrectChars = gameState.incorrectChars;
    const totalTypedChars = finalCorrectChars + finalIncorrectChars;
    const finalAccuracy = totalTypedChars > 0 ? Math.round((finalCorrectChars / totalTypedChars) * 100) : 0;

    const totalTestMinutes = gameState.TIMED_TEST_DURATION / 60;
    const finalWPM = totalTestMinutes > 0 ? Math.round((finalCorrectChars / 5) / totalTestMinutes) : 0;

    const finalRawWPM = totalTestMinutes > 0 ? Math.round((totalTypedChars / 5) / totalTestMinutes) : 0;

    const totalWordsTyped = (gameState.totalCorrectWords || 0) + (gameState.totalIncorrectWords || 0);
    const errorPercentage = totalWordsTyped > 0
        ? Math.round(((gameState.totalIncorrectWords || 0) / totalWordsTyped) * 100)
        : 0;

    let consistency = 0;
    const wpmHistory = gameState.history.map(h => h.wpm);
    if (wpmHistory.length > 1) {
        const mean = finalWPM;
        const stdDev = Math.sqrt(wpmHistory.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / wpmHistory.length);
        if (mean > 0) {
            consistency = Math.max(0, Math.round((1 - (stdDev / mean)) * 100));
        }
    }

    document.getElementById('finalWPM').textContent = finalWPM;
    document.getElementById('finalAccuracy').textContent = `${finalAccuracy}%`;
    document.getElementById('finalTime').textContent = `${gameState.TIMED_TEST_DURATION}s`;
    document.getElementById('finalChars').textContent = `${finalCorrectChars} / ${finalIncorrectChars} / ${totalTypedChars}`;
    document.getElementById('finalConsistency').textContent = `${consistency}%`;

    const historyData = gameState.history.map(h => ({
        ...h,
        correctWords: gameState.totalCorrectWords,
        incorrectWords: gameState.totalIncorrectWords,
        time: gameState.TIMED_TEST_DURATION,
        errorPercentage: errorPercentage
    }));

    renderResultChart(historyData);

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
    const DOM = getGameDOMReferences();
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.updateStatsInterval);
    clearTimeout(gameState.inactivityTimer);
    DOM.hiddenInput.disabled = true;
    if (!gameState.isTestInvalid) {
        calculateAndDisplayFinalResults();
    }
    gameState.startTime = null;
    setTimerSpeedometer(0);
    hideStatsContainer();
}

export function invalidateTest(reason) {
    const DOM = getGameDOMReferences();
    gameState.isTestInvalid = true;
    endTest();

    const textDisplayContainer = document.querySelector('.text-display-container');
    if (textDisplayContainer) {
        textDisplayContainer.style.display = 'flex';
        DOM.textDisplay.innerHTML = `<div class="invalid-test-message">Tes dibatalkan: ${reason}</div>`;
    }

    const resultsArea = document.getElementById('resultsDisplayArea');
    if (resultsArea) {
        resultsArea.style.display = 'none';
    }
}

export function resetTestState() {
    const DOM = getGameDOMReferences();
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.updateStatsInterval);
    clearTimeout(gameState.inactivityTimer);
    gameState.isTestInvalid = false;
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
    gameState.history = [];

    if (DOM.accuracySpan) DOM.accuracySpan.textContent = '0%';
    if (DOM.timerSpan) DOM.timerSpan.textContent = gameState.TIMED_TEST_DURATION;

    DOM.hiddenInput.value = '';
    DOM.hiddenInput.disabled = false;
    gameState.fullTextWords = [];
    DOM.textDisplay.innerHTML = '';
    DOM.textDisplay.scrollTop = 0;
    DOM.textDisplay.classList.remove('error-shake');

    setWpmSpeedometer(0);
    setAccuracySpeedometer(0);
    setTimerSpeedometer(timerMax);

    const resultsArea = document.getElementById('resultsDisplayArea');
    if (resultsArea) {
        resultsArea.style.display = 'none';
    }
    const textDisplayContainer = document.querySelector('.text-display-container');
    if (textDisplayContainer) {
        // Biarkan sesuai layout aslinya (flex), kalau layout-mu memang pakai flex
        textDisplayContainer.style.display = 'flex';
    }

    if (DOM.finalWPM) DOM.finalWPM.textContent = '--';
    if (DOM.finalAccuracy) DOM.finalAccuracy.textContent = '--%';
    if (DOM.finalTime) DOM.finalTime.textContent = `-- detik`;
    if (DOM.finalErrors) DOM.finalErrors.textContent = '--';
    if (DOM.finalTotalWords) DOM.finalTotalWords.textContent = '--';
    if (DOM.finalCorrectWords) DOM.finalCorrectWords.textContent = '--';
    if (DOM.finalIncorrectWords) DOM.finalIncorrectWords.textContent = '--';

    generateAndAppendWords(gameState.INITIAL_WORD_BUFFER);
    prepareAndRenderLines();

    // 🔑 kunci ulang tinggi kontainer & reset scroll
    lockTextDisplayHeightTo3Lines();
    DOM.textDisplay.scrollTop = 0;

    // 🔑 pastikan typedWordIndex balik ke 0
    gameState.currentLineIndex = 0;
    gameState.typedWordIndex = 0;

    // 🔑 baru update highlight/cursor setelah fokus
    setTimeout(() => {
        updateWordHighlighting();
    }, 0);

    DOM.hiddenInput.focus();
}

export function startTimer() {
    const DOM = getGameDOMReferences();
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);

    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        setTimerSpeedometer(gameState.timeRemaining);

        if (gameState.timeRemaining <= 0) {
            endTest();
        }
    }, 1000);

    gameState.updateStatsInterval = setInterval(() => {
        updateRealtimeStats();
    }, 100);

    startInactivityTimer();
}

export function startInactivityTimer() {
    clearTimeout(gameState.inactivityTimer);
    gameState.inactivityTimer = setTimeout(() => {
        invalidateTest("User AFK / Tidak ada aktivitas.");
    }, 30000);
}

export function initGameListeners() {
}

export function showStatsContainer() {
    const DOM = getGameDOMReferences();
    if (DOM.statsContainer) {
        DOM.statsContainer.classList.add('show');
    }
}

export function hideStatsContainer() {
    const DOM = getGameDOMReferences();
    if (DOM.statsContainer) {
        DOM.statsContainer.classList.remove('show');
    }
}
