// js/game/game-events.js

// Perbaikan: Ganti import { DOM } menjadi import { getGameDOMReferences }
import { getGameDOMReferences } from "../utils/dom-elements.js";
import { gameState } from "./game-state.js";
import {
  processTypedWord,
  startTimer,
  endTest,
  updateRealtimeStats,
  startInactivityTimer,
  generateAndAppendWords,
  showStatsContainer,
} from "./game-logic.js";
import {
  renderAllLines,
  updateWordHighlighting,
  triggerShakeAnimation,
  prepareAndRenderLines,
  lockTextDisplayHeightTo3Lines,
  initTextDisplayResizeObserver
} from "../utils/text-display.js";

export function handleKeydown(e) {
  const DOM = getGameDOMReferences();

  if (gameState.isTestInvalid) {
    e.preventDefault();
    return;
  }

  // Reset inactivity timer on any keydown
  startInactivityTimer();

  if (gameState.timeRemaining <= 0 && gameState.timerInterval) {
    e.preventDefault();
    return;
  }

  // Mencegah spasi di awal tes
  if (
    e.key === " " &&
    DOM.hiddenInput.value.length === 0 &&
    gameState.typedWordIndex === 0
  ) {
    e.preventDefault();
    return;
  }

  // Mulai tes pada ketikan pertama (bukan spasi/kombinasi)
  if (
    e.key.length === 1 &&
    !e.ctrlKey &&
    !e.altKey &&
    !e.metaKey &&
    e.key !== "Backspace"
  ) {
    // Kalau belum pernah start → set startTime
    if (!gameState.startTime) {
      gameState.startTime = Date.now();
      startTimer();
    }

    // Set typing mode aktif tiap kali user ngetik
    gameState.isTypingActive = true;

    // Hide header/menu dan tampilkan speedometer
    if (DOM.header) DOM.header.classList.add("hidden");
    if (DOM.menuButton) DOM.menuButton.classList.add("hidden");
    if (DOM.restartButton) DOM.restartButton.classList.add("hidden");
    showStatsContainer();
  }

  // Pastikan buffer kata aman
  const WORD_BUFFER_THRESHOLD = 80;
  if (
    gameState.fullTextWords.length - gameState.typedWordIndex <
      WORD_BUFFER_THRESHOLD &&
    window.defaultKataKata &&
    window.defaultKataKata.length > 0
  ) {
    generateAndAppendWords(200);
  }

  // Kalau index kelewatan, siapkan barisnya
  if (gameState.typedWordIndex >= gameState.fullTextWords.length) {
    if (window.defaultKataKata && window.defaultKataKata.length > 0) {
      const prevLength = gameState.fullTextWords.length;
      generateAndAppendWords(100);
      prepareAndRenderLines();
      if (gameState.typedWordIndex >= gameState.fullTextWords.length) {
        gameState.typedWordIndex = prevLength;
      }
    }
    let foundLine = 0;
    for (let i = 0; i < gameState.lines.length; i++) {
      const line = gameState.lines[i];
      if (line.some((w) => w.index === gameState.typedWordIndex)) {
        foundLine = i;
        break;
      }
    }
    gameState.currentLineIndex = foundLine;
    renderAllLines();
  }

  const targetWord = gameState.fullTextWords[gameState.typedWordIndex] || "";
  const currentTypedLength = DOM.hiddenInput.value.length;

  // Cegah overtype berlebih
  if (
    e.key.length === 1 &&
    !e.ctrlKey &&
    !e.altKey &&
    !e.metaKey &&
    e.key !== "Backspace" &&
    e.key !== " "
  ) {
    if (
      currentTypedLength >= targetWord.length &&
      currentTypedLength - targetWord.length >=
        gameState.MAX_OVERTYPED_CHARS_HIGHLIGHT
    ) {
      e.preventDefault();
      triggerShakeAnimation();
      return;
    }
  }

  if (e.key === " ") {
    e.preventDefault();

    if (DOM.hiddenInput.value.length === 0) return;

    processTypedWord();

    // Cari baris asal dari word yang baru saja di-commit
    const lineOfTyped = gameState.lines.findIndex(
      (ln) => ln && ln.some((w) => w.index === gameState.typedWordIndex)
    );
    const isLastWordInLine =
      lineOfTyped !== -1 &&
      gameState.lines[lineOfTyped][gameState.lines[lineOfTyped].length - 1]
        .index === gameState.typedWordIndex;

    // Kalau memang akhir baris asal → majukan currentLineIndex minimal ke baris berikutnya
    if (isLastWordInLine) {
      gameState.currentLineIndex = Math.max(
        gameState.currentLineIndex,
        lineOfTyped + 1
      ); 
    }

    const elapsedTime = (new Date().getTime() - gameState.startTime) / 1000;
    if (elapsedTime > 0) {
      const totalCorrectChars = gameState.correctChars;
      const totalIncorrectChars = gameState.incorrectChars;
      const allTypedChars =
        totalCorrectChars + totalIncorrectChars + DOM.hiddenInput.value.length;

      const wpm = Math.round(totalCorrectChars / 5 / (elapsedTime / 60));
      const rawWpm = Math.round(allTypedChars / 5 / (elapsedTime / 60));

      const wasCorrect =
        gameState.typedWordCorrectness[gameState.typedWordIndex];
      const typedWord =
        gameState.userTypedWords[gameState.typedWordIndex] || "";
      const targetWord2 =
        gameState.fullTextWords[gameState.typedWordIndex] || "";
      let incorrectCharsInWord = 0;
      for (let i = 0; i < typedWord.length; i++) {
        if (i >= targetWord2.length || typedWord[i] !== targetWord2[i]) {
          incorrectCharsInWord++;
        }
      }
      if (targetWord2.length > typedWord.length) {
        incorrectCharsInWord += targetWord2.length - typedWord.length;
      }
      const errorPercentage =
        targetWord2.length > 0
          ? (incorrectCharsInWord / targetWord2.length) * 100
          : 0;

      gameState.history.push({
        wpm: wpm,
        rawWpm: rawWpm,
        errors: totalIncorrectChars,
        correct: wasCorrect,
        errorPercentage: errorPercentage,
      });
    }

    gameState.typedWordIndex++;
    DOM.hiddenInput.value = "";
    updateWordHighlighting();
    updateRealtimeStats();
  } else if (e.key === "Backspace") {
    setTimeout(() => {
      updateWordHighlighting();
      updateRealtimeStats();
    }, 0);
  } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    setTimeout(() => {
      gameState.userTypedWords[gameState.typedWordIndex] =
        DOM.hiddenInput.value;
      updateWordHighlighting();
      updateRealtimeStats();
    }, 0);
  }
}

function advanceLineIndex() {
  if (gameState.currentLineIndex === 0) {
    return 0;
  } else if (gameState.currentLineIndex === 1) {
    return 2;
  } else {
    return gameState.currentLineIndex + 1;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTextDisplayResizeObserver();
});
