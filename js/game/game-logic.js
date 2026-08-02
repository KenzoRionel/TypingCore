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
  updateGhostHighlighting,
  hideGhostCaret,
} from "../utils/text-display.js";
import { renderResultChart } from "../history/result-chart.js";
import { renderStatisticsPanel, initStatisticsPanel, resetStatisticsPanel } from "../history/statistics-panel.js";
import { gameState } from "./game-state.js";
import { lockTextDisplayHeightTo3Lines } from "../utils/text-display.js";
import {
  setKeyboardVisibility,
  updateKeyboardVisibilityUI,
} from "../index-keyboard.js";
import {
  getLevelInfo,
  getLevelName,
} from "../utils/level-system.js";
import { showLevelUpToast } from "../utils/toast.js";
import { getRandomQuoteSync } from "../data/quotes-loader.js";

function getInProgressCharCounts() {
  const log = gameState.currentWordCharLog || [];
  let correct = 0;
  let incorrect = 0;
  for (const entry of log) {
    if (entry.correct) {
      if (!entry.isSpace) correct++; // spasi benar tidak dihitung sebagai karakter WPM
    } else {
      incorrect++;
    }
  }
  return { correct, incorrect };
}

export function generateAndAppendWords(numWords) {
  const useGhostWords =
    gameState.ghostMode &&
    Array.isArray(gameState.ghostWords) &&
    gameState.ghostWords.length > 0;

  if (useGhostWords) {
    const startPointer = gameState.fullTextWords.length;
    for (let i = 0; i < numWords; i++) {
      const ghostIdx = startPointer + i;
      let word;
      if (ghostIdx < gameState.ghostWords.length) {
        word = gameState.ghostWords[ghostIdx];
      } else {

        const fallbackSource =
          (gameState.previousWordSet && gameState.previousWordSet.length > 0)
            ? gameState.previousWordSet
            : window.defaultKataKata;
        word =
          fallbackSource && fallbackSource.length > 0
            ? fallbackSource[Math.floor(Math.random() * fallbackSource.length)]
            : "placeholder";
      }
      gameState.fullTextWords.push(word);
      gameState.typedWordCorrectness.push(false);
      gameState.userTypedWords.push("");
    }
    return;
  }

  if (gameState.quoteMode) {
    if (gameState.quoteWordBuffer.length === 0) {
      const quote = getRandomQuoteSync();
      const words = quote
        ? quote.text.trim().split(/\s+/)
        : ["Quotes", "gagal", "dimuat."];

      gameState.quoteWordBuffer = words;
      gameState.quoteAuthorMarks = [
        { atIndex: 0, author: quote ? (quote.author || "Anonim") : "", text: quote ? quote.text : "" },
      ];

      for (const word of words) {
        gameState.fullTextWords.push(word);
        gameState.typedWordCorrectness.push(false);
        gameState.userTypedWords.push("");
      }

      updateQuoteAuthorDisplay();
    }
    return;
  }

  const usePracticeWords =
    gameState.practiceMode &&
    Array.isArray(gameState.practiceWords) &&
    gameState.practiceWords.length > 0;
  const sourceWords = usePracticeWords
    ? gameState.practiceWords
    : window.defaultKataKata;

  if (!sourceWords || sourceWords.length === 0) {
    console.error(
      "Tidak dapat menghasilkan kata baru: sumber kata (defaultKataKata/practiceWords) kosong atau tidak terdefinisi."
    );
    for (let i = 0; i < numWords; i++) {
      gameState.fullTextWords.push("placeholder");
      gameState.typedWordCorrectness.push(false);
      gameState.userTypedWords.push("");
    }
    return;
  }
  for (let i = 0; i < numWords; i++) {
    const randomIndex = Math.floor(Math.random() * sourceWords.length);
    gameState.fullTextWords.push(sourceWords[randomIndex]);
    gameState.typedWordCorrectness.push(false);
    gameState.userTypedWords.push("");
  }
}

export function updateQuoteAuthorDisplay() {
  const el = document.getElementById("quoteAuthorDisplay");
  if (!el) return;

  el.style.display = "none";
  el.textContent = "";
}

export function processTypedWord() {
  const DOM = getGameDOMReferences();
  const currentWordTyped = DOM.hiddenInput.value;
  const targetWord = gameState.fullTextWords[gameState.typedWordIndex];

  gameState.userTypedWords[gameState.typedWordIndex] = currentWordTyped;

  if (!targetWord) {
    gameState.typedWordCorrectness[gameState.typedWordIndex] = false;
    gameState.totalIncorrectWords++;
    // ✅ PERBAIKAN: reset log karakter kata berjalan meski targetWord kosong,
    // supaya kata berikutnya tidak mewarisi log dari kata ini.
    gameState.currentWordCharLog = [];
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

  gameState.currentWordCharLog = [];
}

export function updateRealtimeStats() {
  const DOM = getGameDOMReferences();
  updateQuoteAuthorDisplay();
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

  const { correct: inProgressCorrect, incorrect: inProgressIncorrect } =
    getInProgressCharCounts();
  const totalCorrectChars = gameState.correctChars + inProgressCorrect;
  const totalIncorrectChars = gameState.incorrectChars + inProgressIncorrect;
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


function buildWrongWordsPracticeData(historyData) {
  const freq = {};
  (historyData || []).forEach((entry) => {
    if (entry && entry.correct === false && entry.word) {
      freq[entry.word] = (freq[entry.word] || 0) + 1;
    }
  });

  const sortedWords = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
  const weightedList = [];
  sortedWords.forEach((word) => {
    // Minimal 5x pengulangan per kata unik, ditambah bobot ekstra untuk kata
    // yang lebih sering salah, supaya buffer sampling cukup & tidak monoton.
    const repeatCount = Math.max(freq[word] * 3, 5);
    for (let i = 0; i < repeatCount; i++) weightedList.push(word);
  });

  return { sortedWords, weightedList };
}


function updatePracticeWrongWordsButton(uniqueWrongWordCount) {
  const btn = document.getElementById("practiceWrongWordsBtn");
  const countEl = document.getElementById("practiceWrongWordsCount");
  if (!btn) return;

  if (uniqueWrongWordCount > 0) {
    if (countEl) countEl.textContent = String(uniqueWrongWordCount);
    btn.classList.add("show");
    btn.style.setProperty("display", "flex", "important");
  } else {
    btn.classList.remove("show");
    btn.style.setProperty("display", "none", "important");
  }
}

/** Sembunyikan tombol latihan kata salah (dipanggil saat reset/invalidate). */
function hidePracticeWrongWordsButton() {
  const btn = document.getElementById("practiceWrongWordsBtn");
  if (btn) {
    btn.classList.remove("show");
    btn.style.setProperty("display", "none", "important");
  }
}


export function startWrongWordsPractice() {
  if (!Array.isArray(gameState.practiceWords) || gameState.practiceWords.length === 0) {
    return;
  }

  gameState.previousWordSet = window.defaultKataKata;
  gameState.practiceMode = true;

  resetTestState({ preservePracticeMode: true });
}

/** Pasang listener klik pada tombol "Latih Kata yang Salah". */
export function initPracticeWrongWordsButton() {
  const btn = document.getElementById("practiceWrongWordsBtn");
  if (!btn) return;
  btn.addEventListener("click", startWrongWordsPractice);
}

const GHOST_DELAY_CAP_MS = 2000;

function computeGhostTimeline(keystrokes) {
  if (!Array.isArray(keystrokes) || keystrokes.length === 0) return [];

  const timeline = new Array(keystrokes.length).fill(0);
  let prevTs =
    typeof keystrokes[0]?.timestamp === "number" ? keystrokes[0].timestamp : 0;
  let acc = 0;

  for (let i = 0; i < keystrokes.length; i++) {
    const ts =
      typeof keystrokes[i]?.timestamp === "number"
        ? keystrokes[i].timestamp
        : prevTs;
    const rawDelay = i === 0 ? 0 : ts - prevTs;
    const delay = Math.min(Math.max(0, rawDelay), GHOST_DELAY_CAP_MS);
    acc += delay;
    timeline[i] = acc;
    prevTs = ts;
  }

  return timeline;
}

/** Hentikan timer ghost caret (dipanggil saat tes berakhir/dibatalkan/direset). */
function stopGhostTimer() {
  if (gameState.ghostInterval) {
    clearInterval(gameState.ghostInterval);
    gameState.ghostInterval = null;
  }
}

function startGhostTimer() {
  if (!gameState.ghostMode) return;
  const timeline = gameState.ghostTimeline;
  if (!Array.isArray(timeline) || timeline.length === 0) return;

  stopGhostTimer();
  gameState.ghostCurrentIndex = 0;

  gameState.ghostInterval = setInterval(() => {
    if (!gameState.startTime) return;
    const elapsed = Date.now() - gameState.startTime;

    let idx = gameState.ghostCurrentIndex;
    while (idx < timeline.length - 1 && timeline[idx + 1] <= elapsed) {
      idx++;
    }
    gameState.ghostCurrentIndex = idx;

    updateGhostHighlighting();

    if (idx >= timeline.length - 1 && elapsed >= timeline[timeline.length - 1]) {
      stopGhostTimer();
    }
  }, 100);
}


function updateGhostPracticeButton(show) {
  const btn = document.getElementById("ghostPracticeBtn");
  if (!btn) return;

  if (show) {
    btn.classList.add("show");
    btn.style.setProperty("display", "flex", "important");
  } else {
    btn.classList.remove("show");
    btn.style.setProperty("display", "none", "important");
  }
}

/** Sembunyikan tombol ghost caret practice (dipanggil saat reset/invalidate). */
function hideGhostPracticeButton() {
  updateGhostPracticeButton(false);
}

export function startGhostPractice() {
  const data = gameState.ghostData;
  if (
    !data ||
    typeof data.targetText !== "string" ||
    !data.targetText.trim() ||
    !Array.isArray(data.keystrokes) ||
    data.keystrokes.length === 0
  ) {
    return;
  }

  gameState.ghostWords = data.targetText.split(" ").filter((w) => w.length > 0);
  gameState.ghostTimeline = computeGhostTimeline(data.keystrokes);
  gameState.ghostCurrentIndex = 0;

  if (gameState.ghostWords.length === 0 || gameState.ghostTimeline.length === 0) {
    return;
  }

  gameState.previousWordSet = window.defaultKataKata;
  gameState.ghostMode = true;

  resetTestState({ preserveGhostMode: true });
}

/** Pasang listener klik pada tombol ghost caret practice. */
export function initGhostPracticeButton() {
  const btn = document.getElementById("ghostPracticeBtn");
  if (!btn) return;
  btn.addEventListener("click", startGhostPractice);
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

  const actualTestDuration = gameState.quoteMode
    ? Math.max(1, Math.round((Date.now() - gameState.startTime) / 1000))
    : gameState.TIMED_TEST_DURATION;

  const totalTestMinutes = actualTestDuration / 60;
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
  const perSecond = new Array(actualTestDuration).fill(0);

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

  // ✅ Hitung XP: (WPM × Akurasi%) × (Lama Mengetik dalam Menit)
  const accuracyDecimal = finalAccuracy / 100;
  const earnedXP = Math.round(finalWPM * accuracyDecimal * totalTestMinutes);
  
  // Simpan XP ke localStorage
  const currentXP = parseInt(localStorage.getItem("userXP")) || 0;
  const newTotalXP = currentXP + earnedXP;
  localStorage.setItem("userXP", newTotalXP);
  
  console.log(`XP Earned: ${earnedXP}, Total XP: ${newTotalXP}`);

  // ✅ Update UI
  document.getElementById("finalWPM").textContent = finalWPM;
  document.getElementById("finalAccuracy").textContent = `${finalAccuracy}%`;
  document.getElementById(
    "finalTime"
  ).textContent = `${actualTestDuration}s`;
  document.getElementById(
    "finalChars"
  ).textContent = `${finalCorrectChars} / ${finalIncorrectChars} / ${totalTypedChars}`;
  document.getElementById("finalConsistency").textContent = `${consistency}%`;
  const rawWpmEl = document.getElementById("finalRawWPM");
  if (rawWpmEl) rawWpmEl.textContent = String(finalRawWPM);

  // ✅ Animate XP Bar
  animateXPBar(earnedXP);

  const historyData = gameState.history.slice();

  const { sortedWords: wrongWordsUnique, weightedList: wrongWordsWeighted } =
    buildWrongWordsPracticeData(historyData);
  gameState.practiceWords = wrongWordsWeighted;
  updatePracticeWrongWordsButton(wrongWordsUnique.length);

  const quoteAuthorForChart =
    gameState.quoteMode &&
    Array.isArray(gameState.quoteAuthorMarks) &&
    gameState.quoteAuthorMarks.length > 0
      ? gameState.quoteAuthorMarks[gameState.quoteAuthorMarks.length - 1].author
      : null;

  renderResultChart(
    historyData,
    finalWPM,
    actualTestDuration,
    gameState.rawWpmPerSecond,
    gameState.correctCharsPerSecond,
    quoteAuthorForChart
  );

  const selectedLangInput = document.querySelector('input[name="language"]:checked');
  const languageLabel = selectedLangInput
    ? (selectedLangInput.value === 'en' ? 'English' : 'Bahasa Indonesia')
    : '-';

  const targetWordsUsed = historyData.map((h) => h.word || '').filter(Boolean);
  const avgWordLength = targetWordsUsed.length > 0
    ? targetWordsUsed.reduce((sum, w) => sum + w.length, 0) / targetWordsUsed.length
    : 0;

  const rareWordCount = targetWordsUsed.filter((w) => w.length >= 7).length;
  const rareWordPercent = targetWordsUsed.length > 0
    ? Math.round((rareWordCount / targetWordsUsed.length) * 100)
    : 0;

  const hasNumbers = targetWordsUsed.some((w) => /[0-9]/.test(w));
  const hasPunctuation = targetWordsUsed.some((w) => /[.,!?;:'"()\-]/.test(w));

  const testContext = {
    mode: gameState.quoteMode
      ? `${languageLabel} · Quotes Mode (${actualTestDuration}s)`
      : `${languageLabel} · Time Mode (${actualTestDuration}s)`,
    difficulty: avgWordLength > 0
      ? `Avg ${avgWordLength.toFixed(1)} karakter/kata, ${rareWordPercent}% kata langka`
      : '-',
    includeNumbers: hasNumbers,
    includePunctuation: hasPunctuation,
    charCount: finalCorrectChars + finalIncorrectChars
  };
  renderStatisticsPanel(
    historyData,
    finalWPM,
    actualTestDuration,
    testContext
  );

  const typedText = gameState.userTypedWords.filter(w => w && w.length > 0).join(' ');

  const targetText = gameState.fullTextWords.slice(0, gameState.typedWordIndex + 1).join(' ');

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
      timeElapsed: keystroke.timeElapsed || actualTestDuration
    };
  });


  
  const replayData = {
    text: typedText,
    targetText: targetText,
    keystrokes: keystrokesForReplay
    // REMOVED: keystrokeDetails - too large, causes QuotaExceededError
  };

  gameState.ghostData = replayData;
  updateGhostPracticeButton(true);

  if (typeof window.saveScore === "function") {

    const languageCode = selectedLangInput && selectedLangInput.value === 'en' ? 'en' : 'id';

    window.saveScore(
      finalWPM,
      finalAccuracy,
      actualTestDuration,
      finalIncorrectChars,
      gameState.quoteMode ? "Tes Kutipan (Quotes)" : "Tes Kata Umum (Acak)",
      gameState.quoteMode ? "quotes" : "default",
      gameState.totalCorrectWords,
      gameState.totalIncorrectWords,
      replayData,
      languageCode
    );
  }

  // Debugging
  console.log("Keystroke log:", keystrokeLog.length);
  console.log("WPM per detik:", wpmBySecond);
  console.log("Konsistensi:", consistency + "%");

  // Scroll to top of page to show results
  window.scrollTo(0, 0);

  // Prevent spacebar from scrolling page down when test is completed
  // Remove existing listener first to avoid duplicates
  document.removeEventListener('keydown', preventSpaceScroll);
  document.addEventListener('keydown', preventSpaceScroll);
}

/**
 * Prevent spacebar from scrolling page when test is completed
 * @param {KeyboardEvent} event
 */
function preventSpaceScroll(event) {
  if (event.code === 'Space' || event.key === ' ') {
    event.preventDefault();
  }
}

/**
 * Remove spacebar scroll prevention when test is reset
 */
function removeSpaceScrollPrevention() {
  document.removeEventListener('keydown', preventSpaceScroll);
}

export function endTest() {
  const DOM = getGameDOMReferences();
  clearInterval(gameState.timerInterval);
  gameState.timerInterval = null;
  clearInterval(gameState.updateStatsInterval);
  clearTimeout(gameState.inactivityTimer);
  DOM.hiddenInput.disabled = true;
  
  // Set flag global bahwa tes sudah selesai
  window.isTestCompleted = true;
  console.log('DEBUG: endTest() - window.isTestCompleted set to true');

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

  if (gameState.practiceMode) {
    if (gameState.previousWordSet) {
      window.defaultKataKata = gameState.previousWordSet;
    }
    gameState.practiceMode = false;
    gameState.previousWordSet = null;
  }

  if (gameState.ghostMode) {
    stopGhostTimer();
    if (gameState.previousWordSet) {
      window.defaultKataKata = gameState.previousWordSet;
    }
    gameState.ghostMode = false;
    gameState.previousWordSet = null;
    hideGhostCaret();
  }

  gameState.startTime = null;
  setTimerSpeedometer(0, gameState.TIMED_TEST_DURATION);
  hideStatsContainer();

  if (DOM.header) DOM.header.classList.remove("hidden");
  if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");
  if (typeof window.resetLogoPop === "function") window.resetLogoPop();

}


export function invalidateTest(reason) {
  const DOM = getGameDOMReferences();

  // Set flag dan hentikan semua aktivitas
  gameState.isTestInvalid = true;
  clearInterval(gameState.timerInterval);
  gameState.timerInterval = null;
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

  // Tombol/panel statistik hanya relevan untuk hasil tes yang valid & selesai,
  // jadi selalu sembunyikan & reset saat tes dibatalkan.
  resetStatisticsPanel();
  hidePracticeWrongWordsButton();
  hideGhostPracticeButton();

  // ✅ Tes latihan kata salah yang dibatalkan (mis. user pindah tab) juga
  // dianggap berakhir: pulihkan word set asli, sama seperti di endTest().
  if (gameState.practiceMode) {
    if (gameState.previousWordSet) {
      window.defaultKataKata = gameState.previousWordSet;
    }
    gameState.practiceMode = false;
    gameState.previousWordSet = null;
  }

  if (gameState.ghostMode) {
    stopGhostTimer();
    if (gameState.previousWordSet) {
      window.defaultKataKata = gameState.previousWordSet;
    }
    gameState.ghostMode = false;
    gameState.previousWordSet = null;
  }
  hideGhostCaret();

  // Tampilkan menu & tombol restart lagi - jangan tampilkan jika test sudah selesai
  if (window.isTestCompleted) return;
  
  if (DOM.header) DOM.header.classList.remove("hidden");
  if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
  if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");


  hideStatsContainer();
  if (typeof window.resetLogoPop === "function") window.resetLogoPop();
}

export function resetTestState(options = {}) {
  const { preservePracticeMode = false, preserveGhostMode = false } = options;
  const DOM = getGameDOMReferences();
  
  // Reset flag global bahwa tes sudah selesai
  window.isTestCompleted = false;
  console.log('DEBUG: resetTestState() - window.isTestCompleted set to false');
  if (!preservePracticeMode && gameState.practiceMode) {
    if (gameState.previousWordSet) {
      window.defaultKataKata = gameState.previousWordSet;
    }
    gameState.practiceMode = false;
    gameState.previousWordSet = null;
  }
  if (!preserveGhostMode && gameState.ghostMode) {
    if (gameState.previousWordSet) {
      window.defaultKataKata = gameState.previousWordSet;
    }
    gameState.ghostMode = false;
    gameState.previousWordSet = null;
    gameState.ghostWords = [];
    gameState.ghostTimeline = [];
  }
  gameState.ghostCurrentIndex = 0;
  stopGhostTimer();
  hideGhostCaret();
  gameState.quoteWordBuffer = [];
  gameState.quoteAuthorMarks = [];

  clearInterval(gameState.timerInterval);
  gameState.timerInterval = null;
  clearInterval(gameState.updateStatsInterval);
  clearTimeout(gameState.inactivityTimer);
  gameState.isTestInvalid = false;

  gameState.typedWordIndex = 0;
  gameState.correctChars = 0;
  gameState.incorrectChars = 0;
  gameState.startTime = null;
  // ✅ Mode Quotes: tidak pakai batas waktu, jadi mulai dari 0 dan berjalan
  // NAIK (stopwatch) selama tes, bukan hitung mundur dari durasi terpilih.
  gameState.timeRemaining = gameState.quoteMode ? 0 : gameState.TIMED_TEST_DURATION;
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
  gameState.currentWordCharLog = []; // ✅ BARU: log karakter kata yang sedang berjalan

  // ✅ TAMBAHAN: Reset smootherWPM saat state direset
  gameState.smootherWPM = undefined;

  if (DOM.accuracySpan) DOM.accuracySpan.textContent = "0%";
  if (DOM.timerSpan) DOM.timerSpan.textContent = gameState.timeRemaining;

  DOM.hiddenInput.value = "";
  DOM.hiddenInput.disabled = false;
  gameState.fullTextWords = [];
  DOM.textDisplay.innerHTML = "";
  DOM.textDisplay.scrollTop = 0;
  DOM.textDisplay.classList.remove("error-shake");

  setWpmSpeedometer(0);
  setAccuracySpeedometer(0);
  setTimerSpeedometer(
    gameState.quoteMode ? 0 : gameState.TIMED_TEST_DURATION,
    gameState.quoteMode ? timerMax : gameState.TIMED_TEST_DURATION
  );

  const timerTextDisplayEl = document.getElementById("timerTextDisplay");
  if (timerTextDisplayEl) timerTextDisplayEl.textContent = gameState.timeRemaining;

  const resultsArea = document.getElementById("resultsDisplayArea");
  if (resultsArea) {
    resultsArea.style.display = "none";
  }

  // Reset statistics panel
  resetStatisticsPanel();
  hidePracticeWrongWordsButton();
  hideGhostPracticeButton();

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

  // Remove spacebar scroll prevention when resetting test
  removeSpaceScrollPrevention();

  generateAndAppendWords(gameState.INITIAL_WORD_BUFFER);
  updateQuoteAuthorDisplay();
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
    if (gameState.quoteMode) {
      gameState.timeRemaining++;
      const timerText = document.getElementById("timerTextDisplay");
      if (timerText) timerText.textContent = gameState.timeRemaining;
      setTimerSpeedometer(Math.min(gameState.timeRemaining, timerMax), timerMax);
      return;
    }

    gameState.timeRemaining--;
    
    // Update Speedometer Timer
    setTimerSpeedometer(gameState.timeRemaining, gameState.TIMED_TEST_DURATION);
    
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

  if (gameState.ghostMode) {
    startGhostTimer();
  }
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

      const currentSecond = Math.floor((now - gameState.startTime) / 1000);
      const typedChar = event.key;
      const currentInputLength = DOM.hiddenInput.value.length;

      if (typedChar.length === 1 && typedChar !== "Backspace") {
        gameState.keystrokeLog.push(now);

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

        if (!gameState.currentWordCharLog) gameState.currentWordCharLog = [];
        gameState.currentWordCharLog.push({
          correct: isCorrect,
          isSpace: typedChar === ' ',
          second: currentSecond,
        });

        // Store detailed keystroke info for replay
        if (!gameState.keystrokeDetails) gameState.keystrokeDetails = [];
        if (!gameState.inputHistory) gameState.inputHistory = [];
        const completedWords = gameState.userTypedWords.slice(0, gameState.typedWordIndex).filter(w => w && w.length > 0);
        const currentInput = DOM.hiddenInput.value;
        
        // Construct full input state: completed words + current word being typed
        let fullInputState = completedWords.join(' ');
        if (currentInput && currentInput.length > 0) {
          fullInputState = fullInputState ? fullInputState + ' ' + currentInput : currentInput;
        }
        
        gameState.inputHistory.push(fullInputState);

        const currentElapsedMs = now - gameState.startTime;
        const currentElapsedMinutes = currentElapsedMs / 60000;
        const { correct: inProgCorrectNow, incorrect: inProgIncorrectNow } =
          getInProgressCharCounts();
        const currentTotalCorrectChars = gameState.correctChars + inProgCorrectNow;
        const currentTotalIncorrectChars = gameState.incorrectChars + inProgIncorrectNow;
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

        if (gameState.currentWordCharLog && gameState.currentWordCharLog.length > 0) {
          const removedEntry = gameState.currentWordCharLog.pop();
          if (removedEntry.correct && !removedEntry.isSpace) {
            const sec = removedEntry.second;
            if (gameState.correctCharsPerSecond[sec] > 0) {
              gameState.correctCharsPerSecond[sec]--;
            }
          }
        }

        const completedWords = gameState.userTypedWords.slice(0, gameState.typedWordIndex).filter(w => w && w.length > 0);
        const currentInput = DOM.hiddenInput.value;
        
        // Construct full input state: completed words + current word being typed
        let fullInputState = completedWords.join(' ');
        if (currentInput && currentInput.length > 0) {
          fullInputState = fullInputState ? fullInputState + ' ' + currentInput : currentInput;
        }
        
        gameState.inputHistory.push(fullInputState);

        const currentElapsedMs = now - gameState.startTime;
        const currentElapsedMinutes = currentElapsedMs / 60000;
        const { correct: inProgCorrectAfterDel, incorrect: inProgIncorrectAfterDel } =
          getInProgressCharCounts();
        const currentTotalCorrectChars = gameState.correctChars + inProgCorrectAfterDel;
        const currentTotalIncorrectChars = gameState.incorrectChars + inProgIncorrectAfterDel;
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

  // Initialize statistics panel button listener
  initStatisticsPanel();

  // Initialize "Latih Kata yang Salah" button listener
  initPracticeWrongWordsButton();

  // Initialize "Ulangi dengan Ghost Caret" button listener
  initGhostPracticeButton();
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

/**
 * Animate XP bar with earned XP amount showing progress to next level
 * @param {number} earnedXP - The amount of XP earned
 */
function animateXPBar(earnedXP) {
  const xpBarText = document.getElementById("xpBarText");
  const xpBarProgress = document.getElementById("xpBarProgress");
  
  if (!xpBarText || !xpBarProgress) return;
  
  // Get current total XP
  const currentTotalXP = parseInt(localStorage.getItem("userXP")) || 0;
  const previousTotalXP = currentTotalXP - earnedXP;

  const currentInfo = getLevelInfo(currentTotalXP);
  const previousInfo = getLevelInfo(previousTotalXP);

  // Calculate progress percentages
  const previousProgressPercent = previousInfo.xpToNext
    ? (previousInfo.xp / previousInfo.xpToNext) * 100
    : 0;
  const currentProgressPercent = currentInfo.xpToNext
    ? (currentInfo.xp / currentInfo.xpToNext) * 100
    : 100;

  // Reset state
  xpBarText.classList.remove("show");
  xpBarProgress.style.width = `${previousProgressPercent}%`;

  // Update text with earned XP and level info
  xpBarText.textContent = `+${earnedXP} XP (Level ${currentInfo.level})`;

  // Check if leveled up
  const didLevelUp = currentInfo.level > previousInfo.level;

  // Small delay before animation starts
  setTimeout(() => {
    // Show text with animation
    xpBarText.classList.add("show");

    if (didLevelUp) {
      // ✅ Toast "Level Up!" saat naik level, menampilkan nama level baru
      // dari sistem "Typing Journey".
      showLevelUpToast(
        `Level Up! Kamu sekarang ${getLevelName(currentInfo.level)}`
      );

      // Animate to 100% first, then reset to new progress
      setTimeout(() => {
        xpBarProgress.style.width = "100%";
        
        // After reaching 100%, reset and animate to new progress
        setTimeout(() => {
          xpBarProgress.style.transition = "none";
          xpBarProgress.style.width = "0%";
          
          setTimeout(() => {
            xpBarProgress.style.transition = "width 1s ease-out";
            xpBarProgress.style.width = `${currentProgressPercent}%`;
          }, 50);
        }, 1000);
      }, 100);
    } else {
      // Normal animation to new progress
      setTimeout(() => {
        xpBarProgress.style.width = `${currentProgressPercent}%`;
      }, 100);
    }
  }, 300);
}