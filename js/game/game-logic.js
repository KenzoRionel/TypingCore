//js/game/game-logic.js
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
import {
  setKeyboardVisibility,
  updateKeyboardVisibilityUI,
} from "../index-keyboard.js";


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

  gameState.correctChars += correctCharsInWord;
  gameState.incorrectChars += incorrectCharsInWord;

  const isWordCorrect = currentWordTyped === targetWord;
  gameState.typedWordCorrectness[gameState.typedWordIndex] = isWordCorrect;
  if (isWordCorrect) gameState.totalCorrectWords++;
  else gameState.totalIncorrectWords++;

  const now = Date.now();
  const elapsedMs = now - (gameState.wordStartTime || gameState.startTime);

  if (!gameState.history) gameState.history = [];

  const errorPerSecond =
    elapsedMs > 0 ? incorrectCharsInWord / (elapsedMs / 1000) : 0;
  gameState.history.push({
    word: targetWord || "",
    typed: currentWordTyped || "",
    correct: isWordCorrect,
    errorCount: incorrectCharsInWord,
    correctCount: correctCharsInWord,
    startTime: gameState.wordStartTime || gameState.startTime,
    endTime: now,
    durationMs: elapsedMs,
    errorPerSecond: errorPerSecond,
  });

  gameState.wordStartTime = now;
}

// ✅ KODE YANG DIUBAH
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

  const now = Date.now();
  const elapsedMs = now - gameState.startTime;
  const elapsedMinutes = elapsedMs / 60000;
  const totalCorrectChars =
    gameState.correctChars + (DOM.hiddenInput?.value?.length || 0);
  const totalIncorrectChars = gameState.incorrectChars;
  const totalTypedChars = totalCorrectChars + totalIncorrectChars;

  // ✅ PERBAIKAN UTAMA: Tambah batas minimum waktu atau karakter.
  let instantWPM = 0;
  if (totalTypedChars >= 1 && elapsedMinutes > 0.00833) {
    // 0.00833 minutes = 0.5 seconds
    instantWPM = Math.round(totalCorrectChars / 5 / elapsedMinutes);
  }

  const alpha = 0.1;
  if (gameState.smootherWPM === undefined) {
    gameState.smootherWPM = instantWPM;
  } else {
    gameState.smootherWPM =
      alpha * instantWPM + (1 - alpha) * gameState.smootherWPM;
  }

  const accuracyPercent =
    totalTypedChars > 0
      ? Math.round((totalCorrectChars / totalTypedChars) * 100)
      : 100;

  try {
    setWpmSpeedometer(Math.round(gameState.smootherWPM));
  } catch (e) {}
  try {
    setAccuracySpeedometer(accuracyPercent);
  } catch (e) {}

// Update Tampilan Teks (Baru)
  const wpmText = document.getElementById("wpmTextDisplay");
  const accText = document.getElementById("accuracyTextDisplay");
  
  const displayWPM = String(Math.round(gameState.smootherWPM || 0));
  const displayAcc = `${accuracyPercent}%`;

  if (wpmText) wpmText.textContent = displayWPM;
  if (accText) accText.textContent = displayAcc;

  // Pertahankan update DOM reference lama jika masih dipakai
  if (DOM.wpmDisplay) DOM.wpmDisplay.textContent = displayWPM;
  if (DOM.accuracyDisplay) DOM.accuracyDisplay.textContent = displayAcc;

  if (DOM.wpmDisplay)
    DOM.wpmDisplay.textContent = String(Math.round(gameState.smootherWPM));
  if (DOM.accuracyDisplay)
    DOM.accuracyDisplay.textContent = `${accuracyPercent}%`;

  const currentSecond = Math.floor((now - gameState.startTime) / 1000);
  const totalKeystrokes = gameState.keystrokeLog.filter((ts) => {
    const tsSecond = Math.floor((ts - gameState.startTime) / 1000);
    return tsSecond === currentSecond;
  }).length;
  const wpm = Math.round((totalKeystrokes / 5) * 60);

  if (gameState.rawWpmPerSecond.length <= currentSecond) {
    gameState.rawWpmPerSecond.push(wpm);
  } else {
    gameState.rawWpmPerSecond[currentSecond] = wpm;
  }
}

export function calculateAndDisplayFinalResults() {
  const DOM = getGameDOMReferences();

  const textDisplayContainer = document.querySelector(
    ".text-display-container"
  );
  if (textDisplayContainer) textDisplayContainer.style.display = "none";

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

  /** ✅ Hitung Konsistensi berdasarkan keystroke */
  let consistency = 0;
  const keystrokeLog = gameState.keystrokeLog || [];
  const perSecond = new Array(gameState.TIMED_TEST_DURATION).fill(0);

  keystrokeLog.forEach((ts) => {
    const sec = Math.floor((ts - gameState.startTime) / 1000);
    if (sec >= 0 && sec < perSecond.length) {
      perSecond[sec]++;
    }
  });

  const wpmBySecond = perSecond.map((c) => Math.round((c / 5) * 60));

  // Filter hanya WPM > 0
  const nonZeroWPMs = wpmBySecond.filter((wpm) => wpm > 0);
  if (nonZeroWPMs.length > 1) {
    const mean =
      nonZeroWPMs.reduce((sum, wpm) => sum + wpm, 0) / nonZeroWPMs.length;
    const stdDev = Math.sqrt(
      nonZeroWPMs.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) /
        nonZeroWPMs.length
    );
    if (mean > 0) {
      consistency = Math.max(0, Math.round((1 - stdDev / mean) * 100));
    }
  }

  // ✅ Update UI
  document.getElementById("finalWPM").textContent = finalWPM;
  document.getElementById("finalAccuracy").textContent = `${finalAccuracy}%`;
  document.getElementById(
    "finalTime"
  ).textContent = `${gameState.TIMED_TEST_DURATION}s`;
  document.getElementById(
    "finalChars"
  ).textContent = `${finalCorrectChars} / ${finalIncorrectChars} / ${totalTypedChars}`;
  document.getElementById("finalConsistency").textContent = `${consistency}%`;
  const rawWpmEl = document.getElementById("finalRawWPM");
  if (rawWpmEl) rawWpmEl.textContent = String(finalRawWPM);

  const historyData = gameState.history.slice();
  renderResultChart(
    historyData,
    finalWPM,
    gameState.TIMED_TEST_DURATION,
    gameState.rawWpmPerSecond,
    gameState.correctCharsPerSecond
  );

  // Prepare replay data - save text that was actually typed (not target words)
  // Using join(' ') to include spaces between words
  const typedText = gameState.userTypedWords.filter(w => w && w.length > 0).join(' ');
  
  // Build target text (full text that should have been typed)
  const targetText = gameState.fullTextWords.slice(0, gameState.typedWordIndex + 1).join(' ');
  
  // OPTIMIZED: Only store minimal keystroke data to prevent localStorage quota exceeded
  // Store only essential data, reconstruct state during replay from these keystrokes
  const keystrokesForReplay = (gameState.keystrokeDetails || []).map((keystroke, index) => {
    const elapsedMs = keystroke.timestamp - gameState.startTime;
    
    return {
      timestamp: elapsedMs,
      char: keystroke.char || '',
      isCorrect: keystroke.isCorrect || false,
      isDeletion: keystroke.isDeletion || false,
      inputState: keystroke.inputState || '',
      wpm: keystroke.wpm || 0,
      accuracy: keystroke.accuracy || 100,
      timeElapsed: keystroke.timeElapsed || gameState.TIMED_TEST_DURATION
    };
  });


  
  const replayData = {
    text: typedText,
    targetText: targetText,
    keystrokes: keystrokesForReplay
    // REMOVED: keystrokeDetails - too large, causes QuotaExceededError
  };



  if (typeof window.saveScore === "function") {
    window.saveScore(
      finalWPM,
      finalAccuracy,
      gameState.TIMED_TEST_DURATION,
      finalIncorrectChars,
      "Tes Kata Umum (Acak)",
      "default",
      gameState.totalCorrectWords,
      gameState.totalIncorrectWords,
      replayData
    );
  }

  // Debugging
  console.log("Keystroke log:", keystrokeLog.length);
  console.log("WPM per detik:", wpmBySecond);
  console.log("Konsistensi:", consistency + "%");
}

export function endTest() {
  const DOM = getGameDOMReferences();
  clearInterval(gameState.timerInterval);
  clearInterval(gameState.updateStatsInterval);
  clearTimeout(gameState.inactivityTimer);
  DOM.hiddenInput.disabled = true;
  
  // Set flag global bahwa tes sudah selesai
  window.isTestCompleted = true;
  console.log('DEBUG: endTest() - window.isTestCompleted set to true');
  
  // Update UI keyboard untuk menyembunyikan keyboard saat tes selesai
  // Panggil SEBELUM calculateAndDisplayFinalResults untuk menghindari error di saveScore
  try {
    updateKeyboardVisibilityUI({
      hideStats: hideStatsContainer,
      showStats: showStatsContainer,
      statsMode: gameState.statsMode || 'speedometer'
    });
    console.log('DEBUG: endTest() - updateKeyboardVisibilityUI called successfully');
  } catch (e) {
    console.error('DEBUG: endTest() - Error calling updateKeyboardVisibilityUI:', e);
  }
  
  if (!gameState.isTestInvalid) {
    calculateAndDisplayFinalResults();
  }
  gameState.startTime = null;
  setTimerSpeedometer(0);
  hideStatsContainer();









  
  if (DOM.header) DOM.header.classList.remove("hidden");
  if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
  if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");
  if (typeof window.resetLogoPop === "function") window.resetLogoPop();
}


export function invalidateTest(reason) {
  const DOM = getGameDOMReferences();

  // Set flag dan hentikan semua aktivitas
  gameState.isTestInvalid = true;
  clearInterval(gameState.timerInterval);
  clearInterval(gameState.updateStatsInterval);
  clearTimeout(gameState.inactivityTimer);

  // Disable input biar user nggak ngetik lagi
  if (DOM.hiddenInput) {
    DOM.hiddenInput.disabled = true;
    DOM.hiddenInput.value = "";
  }

  // Hapus teks dan tampilkan pesan invalid
  const textDisplayContainer = document.querySelector(
    ".text-display-container"
  );
  if (textDisplayContainer) {
    textDisplayContainer.style.display = "flex";
    DOM.textDisplay.innerHTML = `<div class="invalid-test-message">Tes dibatalkan: ${reason}</div>`;
  }

  // Sembunyikan hasil tes
  const resultsArea = document.getElementById("resultsDisplayArea");
  if (resultsArea) {
    resultsArea.style.display = "none";
  }

  // Tampilkan menu & tombol restart lagi
  if (DOM.header) DOM.header.classList.remove("hidden");
  if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
  if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");

  hideStatsContainer();
  if (typeof window.resetLogoPop === "function") window.resetLogoPop();
}

export function resetTestState() {
  const DOM = getGameDOMReferences();
  
  // Reset flag global bahwa tes sudah selesai
  window.isTestCompleted = false;
  console.log('DEBUG: resetTestState() - window.isTestCompleted set to false');
  
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
  gameState.wordStartTime = null;
  gameState.keystrokeLog = [];
  gameState.rawWpmPerSecond = [];
  gameState.correctCharsPerSecond = [];
  gameState.keystrokeDetails = [];
  gameState.inputHistory = [];

  // ✅ TAMBAHAN: Reset smootherWPM saat state direset
  gameState.smootherWPM = undefined;

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
    textDisplayContainer.style.display = "flex";
  }

  if (DOM.finalWPM) DOM.finalWPM.textContent = "--";
  if (DOM.finalAccuracy) DOM.finalAccuracy.textContent = "--%";
  if (DOM.finalTime) DOM.finalTime.textContent = `-- detik`;
  if (DOM.finalErrors) DOM.finalErrors.textContent = "--";
  if (DOM.finalTotalWords) DOM.finalTotalWords.textContent = "--";
  if (DOM.finalCorrectWords) DOM.finalCorrectWords.textContent = "--";
  if (DOM.finalIncorrectWords) DOM.finalIncorrectWords.textContent = "--";

  hideStatsContainer();
  if (typeof window.resetLogoPop === "function") window.resetLogoPop();

  if (DOM.header) DOM.header.classList.remove("hidden");
  if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
  if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");

  generateAndAppendWords(gameState.INITIAL_WORD_BUFFER);
  prepareAndRenderText();

  lockTextDisplayHeightTo3Lines();
  DOM.textDisplay.scrollTop = 0;

  gameState.currentLineIndex = 0;
  gameState.typedWordIndex = 0;

  setTimeout(() => {
    updateWordHighlighting();
  }, 0);

  DOM.hiddenInput.focus();
  
  // Update UI keyboard untuk menampilkan keyboard kembali jika user menginginkannya
  // Panggil setelah semua state direset dan window.isTestCompleted = false
  try {
    updateKeyboardVisibilityUI({
      hideStats: hideStatsContainer,
      showStats: showStatsContainer,
      statsMode: gameState.statsMode || 'speedometer'
    });
    console.log('DEBUG: resetTestState() - updateKeyboardVisibilityUI called successfully');
  } catch (e) {
    console.error('DEBUG: resetTestState() - Error calling updateKeyboardVisibilityUI:', e);
  }
}

export function startTimer() {

  const DOM = getGameDOMReferences();
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  
  gameState.timerInterval = setInterval(() => {
    gameState.timeRemaining--;
    
    // Update Speedometer Timer
    setTimerSpeedometer(gameState.timeRemaining);
    
    // Update Teks Timer
    const timerText = document.getElementById("timerTextDisplay");
    if (timerText) timerText.textContent = gameState.timeRemaining;

    if (gameState.timeRemaining <= 0) {
      endTest();
    }
  }, 1000);

  gameState.updateStatsInterval = setInterval(() => {
    updateRealtimeStats();
  }, 100);
}

export function startInactivityTimer() {
  clearTimeout(gameState.inactivityTimer);
  gameState.inactivityTimer = setTimeout(() => {
    invalidateTest("User AFK / Tidak ada aktivitas.");
  }, 30000);
}

export function initGameListeners() {
  const DOM = getGameDOMReferences();

  if (DOM.hiddenInput) {
    DOM.hiddenInput.addEventListener("keydown", (event) => {
      if (gameState.isTestInvalid) {
        event.preventDefault();
        return;
      }
      const now = Date.now();

      if (!gameState.startTime) {
        gameState.startTime = now;
        gameState.wordStartTime = now;
        startTimer();
      }
      if (!gameState.keystrokeLog) gameState.keystrokeLog = [];
      gameState.keystrokeLog.push(now);

      const currentSecond = Math.floor((now - gameState.startTime) / 1000);
      const typedChar = event.key;
      const currentInputLength = DOM.hiddenInput.value.length;

      if (typedChar.length === 1 && typedChar !== "Backspace") {
        let targetChar;
        let isCorrect;
        
        // Handle space character specially - spaces are always correct
        if (typedChar === ' ') {
          // Space is used to move to next word, always correct
          targetChar = ' ';
          isCorrect = true;
        } else {
          targetChar = gameState.fullTextWords[gameState.typedWordIndex]?.[currentInputLength];
          isCorrect = typedChar === targetChar;
        }

        while (gameState.correctCharsPerSecond.length <= currentSecond) {
          gameState.correctCharsPerSecond.push(0);
        }

        if (isCorrect && typedChar !== ' ') {
          // Don't count space as correct character for WPM calculation
          gameState.correctCharsPerSecond[currentSecond]++;
        }
        
        // Store detailed keystroke info for replay
        if (!gameState.keystrokeDetails) gameState.keystrokeDetails = [];
        if (!gameState.inputHistory) gameState.inputHistory = [];
        
        // Store the FULL accumulated text state (all completed words + current word)
        // Build inputState from scratch each time to avoid duplication issues
        const completedWords = gameState.userTypedWords.slice(0, gameState.typedWordIndex).filter(w => w && w.length > 0);
        const currentInput = DOM.hiddenInput.value;
        
        // Construct full input state: completed words + current word being typed
        let fullInputState = completedWords.join(' ');
        if (currentInput && currentInput.length > 0) {
          fullInputState = fullInputState ? fullInputState + ' ' + currentInput : currentInput;
        }
        
        gameState.inputHistory.push(fullInputState);
        
        // Calculate real-time stats for this keystroke
        const currentElapsedMs = now - gameState.startTime;
        const currentElapsedMinutes = currentElapsedMs / 60000;
        const currentTotalCorrectChars = gameState.correctChars + (isCorrect && typedChar !== ' ' ? 1 : 0);
        const currentTotalIncorrectChars = gameState.incorrectChars + (isCorrect ? 0 : 1);
        const currentTotalTypedChars = currentTotalCorrectChars + currentTotalIncorrectChars;
        
        // Calculate WPM (minimum 0.5 seconds to avoid division by zero)
        let currentWPM = 0;
        if (currentTotalTypedChars >= 1 && currentElapsedMinutes > 0.00833) {
          currentWPM = Math.round(currentTotalCorrectChars / 5 / currentElapsedMinutes);
        }
        
        // Calculate accuracy
        const currentAccuracy = currentTotalTypedChars > 0 
          ? Math.round((currentTotalCorrectChars / currentTotalTypedChars) * 100) 
          : 100;
        
        // Calculate countdown time (mundur)
        const timeRemaining = Math.max(0, gameState.TIMED_TEST_DURATION - Math.floor(currentElapsedMs / 1000));

        gameState.keystrokeDetails.push({
          char: typedChar,
          isCorrect: isCorrect,
          timestamp: now,
          inputState: fullInputState,
          isDeletion: false,
          wpm: currentWPM,
          accuracy: currentAccuracy,
          timeElapsed: timeRemaining
        });


      }
      
      // Handle Backspace - log deletion
      if (typedChar === 'Backspace') {
        if (!gameState.keystrokeDetails) gameState.keystrokeDetails = [];
        if (!gameState.inputHistory) gameState.inputHistory = [];
        
        // Get the text state after backspace (current hidden input value)
        // Build inputState from scratch each time to avoid duplication issues
        const completedWords = gameState.userTypedWords.slice(0, gameState.typedWordIndex).filter(w => w && w.length > 0);
        const currentInput = DOM.hiddenInput.value;
        
        // Construct full input state: completed words + current word being typed
        let fullInputState = completedWords.join(' ');
        if (currentInput && currentInput.length > 0) {
          fullInputState = fullInputState ? fullInputState + ' ' + currentInput : currentInput;
        }
        
        gameState.inputHistory.push(fullInputState);
        
        // Calculate real-time stats for backspace keystroke
        const currentElapsedMs = now - gameState.startTime;
        const currentElapsedMinutes = currentElapsedMs / 60000;
        const currentTotalCorrectChars = gameState.correctChars;
        const currentTotalIncorrectChars = gameState.incorrectChars;
        const currentTotalTypedChars = currentTotalCorrectChars + currentTotalIncorrectChars;
        
        // Calculate WPM (minimum 0.5 seconds to avoid division by zero)
        let currentWPM = 0;
        if (currentTotalTypedChars >= 1 && currentElapsedMinutes > 0.00833) {
          currentWPM = Math.round(currentTotalCorrectChars / 5 / currentElapsedMinutes);
        }
        
        // Calculate accuracy
        const currentAccuracy = currentTotalTypedChars > 0 
          ? Math.round((currentTotalCorrectChars / currentTotalTypedChars) * 100) 
          : 100;
        
        // Calculate countdown time (mundur)
        const timeRemaining = Math.max(0, gameState.TIMED_TEST_DURATION - Math.floor(currentElapsedMs / 1000));

        gameState.keystrokeDetails.push({
          char: 'Backspace',
          isCorrect: false,
          timestamp: now,
          inputState: fullInputState,
          isDeletion: true,
          wpm: currentWPM,
          accuracy: currentAccuracy,
          timeElapsed: timeRemaining
        });

      }


      startInactivityTimer();
    });
  }
}

export function showStatsContainer() {
  const DOM = getGameDOMReferences();
  if (!DOM || !DOM.statsContainer) return;
  
  // Cek apakah keyboard virtual aktif - jika ya, jangan tampilkan statistik
  const keyboardVisible = localStorage.getItem('typingCore_showKeyboard') === 'true';
  if (keyboardVisible) {
    // Keyboard aktif, sembunyikan statistik
    hideStatsContainer();
    return;
  }
  
  DOM.statsContainer.classList.add("show");


  // Sesuaikan tampilan berdasarkan mode statistik yang dipilih
  const textStats = document.querySelector('.text-stats-container');
  const speedContainers = document.querySelectorAll('.speedometer-container');

  if (gameState.statsMode === 'text') {
    if (textStats) textStats.style.display = 'flex';
    speedContainers.forEach((el) => (el.style.display = 'none'));
  } else {
    if (textStats) textStats.style.display = 'none';
    speedContainers.forEach((el) => (el.style.display = 'flex'));
  }
}

export function hideStatsContainer() {
  const DOM = getGameDOMReferences();
  if (!DOM || !DOM.statsContainer) return;
  DOM.statsContainer.classList.remove("show");

  // Pastikan semua sub-komponen statistik tersembunyi saat container disembunyikan
  const textStats = document.querySelector('.text-stats-container');
  const speedContainers = document.querySelectorAll('.speedometer-container');
  if (textStats) textStats.style.display = 'none';
  speedContainers.forEach((el) => (el.style.display = 'none'));
}
