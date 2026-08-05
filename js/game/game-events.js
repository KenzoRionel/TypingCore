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
  prepareAndRenderText,
  lockTextDisplayHeightTo3Lines,
  initTextDisplayResizeObserver
} from "../utils/text-display.js";
import {
  highlightKeyOnKeyboard,
  highlightWrongKeyOnKeyboard,
  clearKeyboardHighlights
} from "../learn-typing-ui.js";
import {
  highlightActiveKeyOnKeyboard,
  clearActiveKeyHighlight,
  updateCapsLockIndicator
} from "../index-keyboard.js";




export function handleKeydown(e) {
  const DOM = getGameDOMReferences();

  if (gameState.isTestInvalid) {
    e.preventDefault();
    return;
  }

  // Reset inactivity timer on any keydown
  startInactivityTimer();

  // ✅ Mode Quotes sengaja membiarkan timeRemaining di 0 (stopwatch naik,
  // bukan hitung mundur) - jangan pernah blokir keystroke di mode ini
  // berdasarkan timeRemaining. Selain itu, gameState.timerInterval TIDAK
  // pernah di-null-kan setelah clearInterval() (lihat endTest/invalidateTest/
  // resetTestState di game-logic.js), jadi nilainya tetap "truthy" dari sisa
  // interval id tes sebelumnya - itulah kenapa cek ini sempat memblokir
  // SEMUA keystroke tes Quotes berikutnya setelah tes pertama pada page load.
  if (
    !gameState.quoteMode &&
    gameState.timeRemaining <= 0 &&
    gameState.timerInterval
  ) {
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
        // Tampilkan logo dan speedometer saat mulai mengetik
        if (typeof window.triggerLogoPop === 'function') window.triggerLogoPop();
        showStatsContainer();
      }

      // Set typing mode aktif tiap kali user ngetik
      gameState.isTypingActive = true;

      // Tampilkan kembali logo dan speedometer saat melanjutkan mengetik
      if (typeof window.triggerLogoPop === 'function') window.triggerLogoPop();
      showStatsContainer();

      // Hide header/menu dan restart button saat mulai mengetik
      if (DOM.header) DOM.header.classList.add("hidden");
      if (DOM.menuButton) DOM.menuButton.classList.add("hidden");
      if (DOM.restartButton) DOM.restartButton.classList.add("hidden");
    }

  // Pastikan buffer kata aman
  // ✅ FIX: Ghost mode dari Quotes (ghostFromQuote=true): jangan generate kata baru
  // saat ghostWords habis — ghost mode hanya menampilkan teks quotes secara persis.
  // Ghost mode dari waktu (ghostFromQuote=false): tetap fallback ke random words.
  const WORD_BUFFER_THRESHOLD = 80;
  const ghostFromQuoteExhausted = gameState.ghostMode && gameState.ghostFromQuote &&
    gameState.ghostWords.length > 0 &&
    gameState.fullTextWords.length >= gameState.ghostWords.length;
  if (
    !ghostFromQuoteExhausted &&
    gameState.fullTextWords.length - gameState.typedWordIndex <
      WORD_BUFFER_THRESHOLD &&
    window.defaultKataKata &&
    window.defaultKataKata.length > 0
  ) {
    generateAndAppendWords(200);
  }

  // Kalau index kelewatan, siapkan barisnya
  // ✅ FIX: Ghost mode dari Quotes: akhiri tes saat user mencapai akhir ghost words.
  // Ghost mode dari waktu: tetap generate kata baru seperti biasa.
  if (gameState.typedWordIndex >= gameState.fullTextWords.length) {
    if (gameState.ghostMode && gameState.ghostFromQuote) {
      endTest();
      return;
    }
    if (window.defaultKataKata && window.defaultKataKata.length > 0) {
      const prevLength = gameState.fullTextWords.length;
      generateAndAppendWords(100);
      prepareAndRenderText();
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
  // Highlight wrong key on keyboard
      const keyboardContainer = document.getElementById('virtual-keyboard-container');
      if (keyboardContainer) {
        highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
        // Also highlight as active key
        highlightActiveKeyOnKeyboard(keyboardContainer, e.key);
      }

      return;
    }
  }


  // Deteksi Caps Lock
  if (e.key === 'CapsLock') {
    const keyboardContainer = document.getElementById('virtual-keyboard-container');
    if (keyboardContainer) {
      // Toggle status Caps Lock (e.getModifierState tidak selalu akurat untuk CapsLock toggle)
      // Kita gunakan cara sederhana: cek apakah karakter yang akan diketik uppercase/lowercase
      const isCapsLockOn = e.getModifierState('CapsLock');
      updateCapsLockIndicator(keyboardContainer, isCapsLockOn);
    }
  }

  if (e.key === " ") {
    e.preventDefault();

    // Highlight the space key on keyboard
    const keyboardContainer = document.getElementById('virtual-keyboard-container');
    if (keyboardContainer) {
      highlightActiveKeyOnKeyboard(keyboardContainer, ' ');
    }


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

    gameState.typedWordIndex++;
    DOM.hiddenInput.value = "";
    updateWordHighlighting();
    updateRealtimeStats();

    // ✅ Mode Quotes/Ghost-from-Quote: tidak ada batas waktu - tes berakhir begitu
    // SELURUH kata sudah di-commit. Ghost-from-Time tetap lanjut (buffer refill).
    if ((gameState.quoteMode || (gameState.ghostMode && gameState.ghostFromQuote)) &&
        gameState.typedWordIndex >= gameState.fullTextWords.length) {
      endTest();
      return;
    }
  } else if (e.key === "Backspace") {
    // Highlight the backspace key on keyboard
    const keyboardContainer = document.getElementById('virtual-keyboard-container');
    if (keyboardContainer) {
      highlightActiveKeyOnKeyboard(keyboardContainer, e.key);
    }
    
    setTimeout(() => {
      updateWordHighlighting();
      updateRealtimeStats();
    }, 0);
  } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    // Handle regular character keys
    const keyboardContainer = document.getElementById('virtual-keyboard-container');
    if (keyboardContainer) {
      highlightActiveKeyOnKeyboard(keyboardContainer, e.key);
    }
    
    setTimeout(() => {
      gameState.userTypedWords[gameState.typedWordIndex] = DOM.hiddenInput.value;
      updateWordHighlighting();
      updateRealtimeStats();

      // ✅ Mode Quotes/Ghost-from-Quote: kalau ini kata TERAKHIR dan sudah
      // diketik sepanjang (atau lebih dari) kata targetnya, akhiri tes
      // langsung tanpa menunggu spasi. Ghost-from-Time tetap lanjut.
      if (
        (gameState.quoteMode || (gameState.ghostMode && gameState.ghostFromQuote)) &&
        gameState.typedWordIndex === gameState.fullTextWords.length - 1
      ) {
        const targetWord = gameState.fullTextWords[gameState.typedWordIndex] || "";
        const typedNow = DOM.hiddenInput.value;
        if (targetWord.length > 0 && typedNow.length >= targetWord.length) {
          processTypedWord();
          gameState.typedWordIndex++;
          endTest();
        }
      }
    }, 0);
  }

}


// Handler diberi nama (bukan arrow function anonim inline) supaya:
//  1. Jelas terlihat di devtools/profiler siapa yang terpasang di listener list,
//  2. Bisa di-removeEventListener kalau suatu saat modul ini perlu di-teardown
//     (mis. hot-reload, SPA navigation), tanpa perlu refactor ulang.
function onGlobalKeyUp() {
  const keyboardContainer = document.getElementById('virtual-keyboard-container');
  if (keyboardContainer) {
    // Gunakan clearActiveKeyHighlight dengan delay agar animasi tetap terlihat saat mengetik cepat
    clearActiveKeyHighlight(keyboardContainer);
  }
}

function onGlobalKeyDownForCapsLock(e) {
  if (e.key === 'CapsLock') {
    const keyboardContainer = document.getElementById('virtual-keyboard-container');
    if (keyboardContainer) {
      const isCapsLockOn = e.getModifierState('CapsLock');
      updateCapsLockIndicator(keyboardContainer, isCapsLockOn);
    }
  }
}

function onWindowFocusCheckCapsLock() {
  const keyboardContainer = document.getElementById('virtual-keyboard-container');
  if (keyboardContainer) {
    // Simulasi event untuk mendapatkan status Caps Lock
    const simulatedEvent = new KeyboardEvent('keydown', { key: 'CapsLock' });
    const isCapsLockOn = simulatedEvent.getModifierState('CapsLock');
    updateCapsLockIndicator(keyboardContainer, isCapsLockOn);
  }
}

// Guard: memastikan listener global di bawah ini hanya pernah dipasang SATU KALI
// untuk seluruh siklus hidup halaman, meskipun DOMContentLoaded ini secara teori
// dipanggil ulang (mis. modul ter-reimport oleh bundler/HMR). resetTestState()
// TIDAK memanggil blok ini, jadi ini murni pengaman tambahan, konsisten dengan
// perbaikan pola yang sama di main.js dan typing-replay.js.
let gameEventsGlobalListenersWired = false;

function wireGameEventsGlobalListeners() {
  if (gameEventsGlobalListenersWired) return;
  gameEventsGlobalListenersWired = true;

  initTextDisplayResizeObserver();

  // Tambahkan event listener untuk keyup untuk menghapus highlight tombol aktif dengan delay
  document.addEventListener('keyup', onGlobalKeyUp);

  // Event listener untuk mendeteksi Caps Lock saat halaman dimuat atau fokus
  document.addEventListener('keydown', onGlobalKeyDownForCapsLock);

  // Cek status Caps Lock saat halaman mendapatkan fokus
  window.addEventListener('focus', onWindowFocusCheckCapsLock);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireGameEventsGlobalListeners, { once: true });
} else {
  wireGameEventsGlobalListeners();
}