// js/game/game-logic.js

// Perbaikan: Ganti import { DOM } menjadi import { getGameDOMReferences }
import { getGameDOMReferences } from "../utils/dom-elements.js";
import {
  setWpmSpeedometer,
  setAccuracySpeedometer,
  setTimerSpeedometer,
  timerMax,
} from "../utils/speedometer.js";
import {
  prepareAndRenderText,
  renderAllLines,
  updateWordHighlighting,
  triggerShakeAnimation,
} from "../utils/text-display.js";
import { renderResultChart } from "../history/result-chart.js";
import { gameState } from "./game-state.js";
import { lockTextDisplayHeightTo3Lines } from "../utils/text-display.js";
export function generateAndAppendWords(numWords) {
  if (!window.defaultKataKata || window.defaultKataKata.length === 0) {
    console.error(
      "Tidak dapat menghasilkan kata baru: window.defaultKataKata kosong atau tidak terdefinisi."
    );
    for (let i = 0; i < numWords; i++) {
      gameState.fullTextWords.push("placeholder");
      gameState.typedWordCorrectness.push(false);
      gameState.userTypedWords.push("");
    }
    return;
  }
  for (let i = 0; i < numWords; i++) {
    const randomIndex = Math.floor(
      Math.random() * window.defaultKataKata.length
    );
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

  let correctCharsInWord = 0;
  let incorrectCharsInWord = 0;

  for (let i = 0; i < currentWordTyped.length; i++) {
    if (targetWord[i] && currentWordTyped[i] === targetWord[i]) {
      correctCharsInWord++;
    } else {
      incorrectCharsInWord++;
    }
  }

  if (currentWordTyped.length > targetWord.length) {
    incorrectCharsInWord += currentWordTyped.length - targetWord.length;
  }

  // Tambahkan ke total
  gameState.correctChars += correctCharsInWord;
  gameState.incorrectChars += incorrectCharsInWord;

  // Hitung benar/salah kata
  const isWordCorrect = currentWordTyped === targetWord;
  gameState.typedWordCorrectness[gameState.typedWordIndex] = isWordCorrect;
  if (isWordCorrect) gameState.totalCorrectWords++;
  else gameState.totalIncorrectWords++;

  // ===================================
  // ✅ Hitung RAW WPM per kata
  // ===================================
  const now = Date.now();
  const startTime = gameState.wordStartTime || gameState.startTime;
  const elapsedMs = now - startTime;
  const elapsedMinutes = elapsedMs / 60000;

  const rawCharCount = currentWordTyped.length; // Semua karakter termasuk typo
  const rawWpm =
    elapsedMinutes > 0 ? Math.round(rawCharCount / 5 / elapsedMinutes) : 0;

  // Hitung error percentage (per kata)
  const totalChars = currentWordTyped.length || 1;
  const errorPercentage = (incorrectCharsInWord / totalChars) * 100;

  // Simpan ke history untuk grafik
  if (!gameState.history) gameState.history = [];
gameState.history.push({
  word: targetWord,
  typed: currentWordTyped,
  rawWpm,
  correct: isWordCorrect,
  errorCount: incorrectCharsInWord,     // <-- Tambah ini
  correctCount: correctCharsInWord,     // <-- Tambah ini
  startTime,
  endTime: now,
  durationMs: elapsedMs                 // <-- Tambah ini
});

  // ✅ Update waktu mulai kata berikutnya
  gameState.wordStartTime = now;
}

export function updateRealtimeStats() {
  const DOM = getGameDOMReferences();

  if (!gameState.startTime) {
    try {
      setWpmSpeedometer(0);
    } catch (e) {}
    try {
      setAccuracySpeedometer(0);
    } catch (e) {}
    if (DOM.wpmDisplay) DOM.wpmDisplay.textContent = "0";
    if (DOM.accuracyDisplay) DOM.accuracyDisplay.textContent = "0%";
    return;
  }

  const elapsedMinutes = (Date.now() - gameState.startTime) / 60000;
  if (elapsedMinutes <= 0) return;

  // ✅ Hitung hanya dari data final, jangan pakai kata aktif
  const totalCorrect = gameState.correctChars;
  const totalIncorrect = gameState.incorrectChars;
  const totalChars = totalCorrect + totalIncorrect;

  const grossWPM =
    totalCorrect > 0 ? Math.round(totalCorrect / 5 / elapsedMinutes) : 0;
  const accuracyPercent =
    totalChars > 0 ? Math.round((totalCorrect / totalChars) * 100) : 100;

  try {
    setWpmSpeedometer(grossWPM);
  } catch (e) {}
  try {
    setAccuracySpeedometer(accuracyPercent);
  } catch (e) {}

  if (DOM.wpmDisplay) DOM.wpmDisplay.textContent = String(grossWPM);
  if (DOM.accuracyDisplay)
    DOM.accuracyDisplay.textContent = `${accuracyPercent}%`;
}

export function calculateAndDisplayFinalResults() {
  const DOM = getGameDOMReferences();

  const textDisplayContainer = document.querySelector(
    ".text-display-container"
  );
  if (textDisplayContainer) textDisplayContainer.style.display = "none";

  // Konsisten pakai DOM.menuButton
  if (DOM.menuButton) DOM.menuButton.style.display = "none";

  const resultsArea = document.getElementById("resultsDisplayArea");
  if (resultsArea) resultsArea.style.display = "block";

  const finalCorrectChars = gameState.correctChars;
  const finalIncorrectChars = gameState.incorrectChars;
  const totalTypedChars = finalCorrectChars + finalIncorrectChars;
  const finalAccuracy =
    totalTypedChars > 0
      ? Math.round((finalCorrectChars / totalTypedChars) * 100)
      : 0;

  const totalTestMinutes = gameState.TIMED_TEST_DURATION / 60;
  const finalWPM =
    totalTestMinutes > 0
      ? Math.round(finalCorrectChars / 5 / totalTestMinutes)
      : 0;

  const finalRawWPM =
    totalTestMinutes > 0
      ? Math.round(totalTypedChars / 5 / totalTestMinutes)
      : 0;
  let consistency = 0;
  const wpmHistory = gameState.history.map((h) => h.rawWpm);
  if (wpmHistory.length > 1) {
    const mean = finalWPM;
    const stdDev = Math.sqrt(
      wpmHistory.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) /
        wpmHistory.length
    );
    if (mean > 0) {
      consistency = Math.max(0, Math.round((1 - stdDev / mean) * 100));
    }
  }

  document.getElementById("finalWPM").textContent = finalWPM;
  document.getElementById("finalAccuracy").textContent = `${finalAccuracy}%`;
  document.getElementById(
    "finalTime"
  ).textContent = `${gameState.TIMED_TEST_DURATION}s`;
  document.getElementById(
    "finalChars"
  ).textContent = `${finalCorrectChars} / ${finalIncorrectChars} / ${totalTypedChars}`;
  document.getElementById("finalConsistency").textContent = `${consistency}%`;

  const historyData = gameState.history.slice();
  renderResultChart(historyData, finalWPM, gameState.TIMED_TEST_DURATION);

  if (typeof window.saveScore === "function") {
    window.saveScore(
      finalWPM,
      finalAccuracy,
      gameState.TIMED_TEST_DURATION,
      finalIncorrectChars,
      "Tes Kata Umum (Acak)",
      "default",
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
  if (typeof window.resetLogoPop === "function") window.resetLogoPop();
}

export function invalidateTest(reason) {
  const DOM = getGameDOMReferences();
  gameState.isTestInvalid = true;
  endTest();

  const textDisplayContainer = document.querySelector(
    ".text-display-container"
  );
  if (textDisplayContainer) {
    textDisplayContainer.style.display = "flex";
    DOM.textDisplay.innerHTML = `<div class="invalid-test-message">Tes dibatalkan: ${reason}</div>`;
  }

  const resultsArea = document.getElementById("resultsDisplayArea");
  if (resultsArea) {
    resultsArea.style.display = "none";
  }

  // ✅ Tambahan agar header & tombol kembali muncul
  if (DOM.header) DOM.header.classList.remove("hidden");
  if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
  if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");

  // ✅ Speedometer & logo tetap sembunyi
  hideStatsContainer();
  if (typeof window.resetLogoPop === "function") window.resetLogoPop();
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
  gameState.wordStartTime = Date.now();

  if (DOM.accuracySpan) DOM.accuracySpan.textContent = "0%";
  if (DOM.timerSpan) DOM.timerSpan.textContent = gameState.TIMED_TEST_DURATION;

  DOM.hiddenInput.value = "";
  DOM.hiddenInput.disabled = false;
  gameState.fullTextWords = [];
  DOM.textDisplay.innerHTML = "";
  DOM.textDisplay.scrollTop = 0;
  DOM.textDisplay.classList.remove("error-shake");

  setWpmSpeedometer(0);
  setAccuracySpeedometer(0);
  setTimerSpeedometer(timerMax);

  const resultsArea = document.getElementById("resultsDisplayArea");
  if (resultsArea) {
    resultsArea.style.display = "none";
  }
  const textDisplayContainer = document.querySelector(
    ".text-display-container"
  );
  if (textDisplayContainer) {
    // Biarkan sesuai layout aslinya (flex), kalau layout-mu memang pakai flex
    textDisplayContainer.style.display = "flex";
  }

  if (DOM.finalWPM) DOM.finalWPM.textContent = "--";
  if (DOM.finalAccuracy) DOM.finalAccuracy.textContent = "--%";
  if (DOM.finalTime) DOM.finalTime.textContent = `-- detik`;
  if (DOM.finalErrors) DOM.finalErrors.textContent = "--";
  if (DOM.finalTotalWords) DOM.finalTotalWords.textContent = "--";
  if (DOM.finalCorrectWords) DOM.finalCorrectWords.textContent = "--";
  if (DOM.finalIncorrectWords) DOM.finalIncorrectWords.textContent = "--";

  // Sembunyikan logo dan speedometer saat restart
  hideStatsContainer();
  if (typeof window.resetLogoPop === "function") window.resetLogoPop();

  // Tampilkan kembali header, menu button, dan restart button saat restart
  if (DOM.header) DOM.header.classList.remove("hidden");
  if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
  if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");

  generateAndAppendWords(gameState.INITIAL_WORD_BUFFER);
  prepareAndRenderText();

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
  }, 3000);
}

export function initGameListeners() {}

export function showStatsContainer() {
  const DOM = getGameDOMReferences();
  if (DOM.statsContainer) {
    DOM.statsContainer.classList.add("show");
  }
}

export function hideStatsContainer() {
  const DOM = getGameDOMReferences();
  if (DOM.statsContainer) {
    DOM.statsContainer.classList.remove("show");
  }
}
