// js/main.js

import { getGameDOMReferences } from "./utils/dom-elements.js";

import {
  createSpeedometerTicks,
  wpmMax,
  accuracyMax,
  timerMax,
  wpmTickColors,
  accuracyTickColors,
  setTimerSpeedometerMax,
  getTimerTickColors,
} from "./utils/speedometer.js";

import { handleKeydown } from "./game/game-events.js";
import {
  formatDuration,
  positionTimeModeModal,
} from "./utils/time-mode-modal-helpers.js";
import {
  resetTestState,
  initGameListeners,
  invalidateTest,
  hideStatsContainer,
  showStatsContainer,
} from "./game/game-logic.js";

import {

  top200Words,
  top1000Words,
  top10000Words,
} from "./data/default-words.js";
import { initTheme } from "./theme.js";
import {
  initIndexKeyboard,
  saveKeyboardSettings,
  loadKeyboardVisibility,
  getKeyboardVisibility,
  setKeyboardVisibility,
  updateKeyboardVisibilityUI
} from "./index-keyboard.js";
import { initSettingsPanel } from "./utils/settings-panel.js";
import { loadQuotes, isQuotesLoaded } from "./data/quotes-loader.js";


// Set default kata-kata saat aplikasi pertama kali dijalankan
window.defaultKataKata = top200Words;

loadQuotes().catch(() => {

});

function shuffleArray(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

document.addEventListener("DOMContentLoaded", () => {
  const DOM = getGameDOMReferences();

  if (!DOM) {
    console.error(
      "Inisialisasi aplikasi dibatalkan karena beberapa elemen DOM kunci tidak ditemukan."
    );
    return;
  }

  const TEST_DURATION_STORAGE_KEY = "typingcore_selectedTestDuration";
  function getStoredTestDuration() {
    try {
      const raw = localStorage.getItem(TEST_DURATION_STORAGE_KEY);
      const val = parseInt(raw, 10);
 
      if (Number.isFinite(val) && val >= 5 && val <= 86400) return val;
    } catch (e) {
      // localStorage tidak tersedia (mis. mode private) - abaikan, pakai default.
    }
    return 60;
  }
  const initialTestDuration = getStoredTestDuration();
  if (window.gameState) {
    window.gameState.TIMED_TEST_DURATION = initialTestDuration;
    window.gameState.timeRemaining = initialTestDuration;
  }

  let logoPopObserver = null;
  let logoPopMouseMoveWired = false;

  // DOM.darkModeToggle (tombol trigger dropdown tema) tidak perlu di-pass
  // ke initTheme - Bootstrap yang menangani buka/tutup dropdown-nya lewat
  // atribut data-bs-toggle="dropdown" di index.html. initTheme hanya perlu
  // tahu container tempat grid pilihan tema dirender.
  initTheme({ pickerContainer: document.getElementById("themePickerContainer") });
  setupLogoPop();

  // Inisialisasi keyboard virtual untuk halaman index
  initIndexKeyboard({
    hideStats: hideStatsContainer,
    showStats: showStatsContainer,
    statsMode: window.gameState ? window.gameState.statsMode : 'speedometer'
  });



  // Initial Setup Speedometer ticks

  createSpeedometerTicks(DOM.wpmTicksContainer, 0, wpmMax, 10, wpmTickColors);
  createSpeedometerTicks(
    DOM.accuracyTicksContainer,
    0,
    accuracyMax,
    10,
    accuracyTickColors
  );
  createSpeedometerTicks(
    DOM.timerTicksContainer,
    0,
    timerMax,
    5,
    getTimerTickColors(timerMax)
  );

  if (DOM.restartButton) {
    DOM.restartButton.addEventListener("click", () => {
      resetTestState();
      setupLogoPop();
    });
  }

  DOM.hiddenInput.addEventListener("keydown", handleKeydown);
  window.resetTest = resetTestState;
  initGameListeners();
  resetTestState();

  // --- Event listener untuk tombol 'X' di Modal Hasil (dipindah dari common-script.js) ---
  if (window.closeButton) {
    window.closeButton.addEventListener('click', () => {
      if (window.resultModal) {
        window.resultModal.classList.remove('show');
        console.log('Result modal closed by close button');
      }
    });
  }

  // --- Event listener untuk tombol 'Coba Lagi' di Modal Hasil (dipindah dari common-script.js) ---
  if (window.restartButtonModal) {
    window.restartButtonModal.addEventListener('click', () => {
      if (window.resetTest && typeof window.resetTest === 'function') {
        window.resetTest();
        console.log('Test restarted from modal');
      }
      if (window.resultModal) {
        window.resultModal.classList.remove('show');
      }
    });
  }

  const quoteModeBtnRef = document.getElementById("quoteModeBtn");

  const punctuationModeBtnRef = document.getElementById("punctuationModeBtn");

  const timeModeToggleBtn = document.getElementById("timeModeToggleBtn");
  const timeModeToggleValue = document.getElementById("timeModeToggleValue");
  const timeModeModalOverlay = document.getElementById("timeModeModalOverlay");
  const timeModeModal = document.getElementById("timeModeModal");
  const timeModeModalClose = document.getElementById("timeModeModalClose");
  const timeModeCustomInput = document.getElementById("timeModeCustomInput");
  const timeModeCustomApply = document.getElementById("timeModeCustomApply");

  const TIME_MODE_CUSTOM_MIN = 5;
  const TIME_MODE_CUSTOM_MAX = 86400; // 24 jam (24 * 60 * 60 detik)

  function repositionTimeModeModal() {
    if (!timeModeToggleBtn || !timeModeModal) return;
    positionTimeModeModal(timeModeToggleBtn, timeModeModal);
  }

  function openTimeModeModal() {
    if (!timeModeModalOverlay) return;
    timeModeModalOverlay.hidden = false;
    if (timeModeToggleBtn) timeModeToggleBtn.setAttribute("aria-expanded", "true");
    if (timeModeCustomInput) {

      const currentDuration = window.gameState ? window.gameState.TIMED_TEST_DURATION : null;
      const isPreset = ["30", "60", "120", "180"].includes(String(currentDuration));
      const isQuoteModeActive = window.gameState && window.gameState.quoteMode;
      timeModeCustomInput.value =
        !isQuoteModeActive && !isPreset && currentDuration ? String(currentDuration) : "";
      timeModeCustomInput.classList.remove("input-error");
    }
 
    repositionTimeModeModal();
    window.addEventListener("resize", repositionTimeModeModal);
    window.addEventListener("scroll", repositionTimeModeModal, true);
    if (timeModeModal) timeModeModal.focus();
  }

  function closeTimeModeModal() {
    if (!timeModeModalOverlay) return;
    timeModeModalOverlay.hidden = true;
    if (timeModeToggleBtn) timeModeToggleBtn.setAttribute("aria-expanded", "false");
    window.removeEventListener("resize", repositionTimeModeModal);
    window.removeEventListener("scroll", repositionTimeModeModal, true);
  }

  if (timeModeToggleBtn) {
    timeModeToggleBtn.addEventListener("click", () => {
      if (timeModeModalOverlay && !timeModeModalOverlay.hidden) {
        closeTimeModeModal();
      } else {
        openTimeModeModal();
      }
    });
  }

  if (timeModeModalClose) {
    timeModeModalClose.addEventListener("click", closeTimeModeModal);
  }

  if (timeModeModalOverlay) {
    // Klik di area overlay (di luar kotak modal) menutup modal.
    timeModeModalOverlay.addEventListener("click", (e) => {
      if (e.target === timeModeModalOverlay) closeTimeModeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && timeModeModalOverlay && !timeModeModalOverlay.hidden) {
      closeTimeModeModal();
    }
  });

  function applySelectedDuration(selectedTime) {

    if (window.gameState && window.gameState.quoteMode) {
      window.gameState.quoteMode = false;
      if (quoteModeBtnRef) quoteModeBtnRef.classList.remove("active");
    }

    document
      .querySelectorAll(".time-mode-option-btn")
      .forEach((b) => b.classList.remove("active"));
    const matchingPreset = document.querySelector(
      `.time-mode-option-btn[data-time="${selectedTime}"]`
    );
    if (matchingPreset) matchingPreset.classList.add("active");

    if (window.gameState) {
      window.gameState.TIMED_TEST_DURATION = selectedTime;
      window.gameState.timeRemaining = selectedTime;
    }
 
    if (timeModeToggleValue) timeModeToggleValue.textContent = formatDuration(selectedTime);

    // Simpan pilihan durasi supaya tetap sama setelah halaman di-refresh.
    try {
      localStorage.setItem(TEST_DURATION_STORAGE_KEY, String(selectedTime));
    } catch (e) {
      // localStorage tidak tersedia - abaikan, cukup berlaku untuk sesi ini saja.
    }

    if (typeof window.resetTest === "function") {
      window.resetTest();
    }
    closeTimeModeModal();
    DOM.hiddenInput.focus();
  }

  document.querySelectorAll(".time-mode-option-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const selectedTime = parseInt(this.getAttribute("data-time"), 10);
      if (!Number.isFinite(selectedTime)) return;
      applySelectedDuration(selectedTime);
    });
  });

  document
    .querySelectorAll(".time-mode-option-btn")
    .forEach((b) => b.classList.remove("active"));
  const matchingInitialPreset = document.querySelector(
    `.time-mode-option-btn[data-time="${initialTestDuration}"]`
  );
  if (matchingInitialPreset) matchingInitialPreset.classList.add("active");
  if (timeModeToggleValue) timeModeToggleValue.textContent = formatDuration(initialTestDuration);

  if (timeModeCustomInput) {
    timeModeCustomInput.addEventListener("input", function () {
      const digitsOnly = this.value.replace(/[^0-9]/g, "");
      if (digitsOnly !== this.value) this.value = digitsOnly;
      this.classList.remove("input-error");
    });

    timeModeCustomInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (timeModeCustomApply) timeModeCustomApply.click();
      }
    });
  }

  if (timeModeCustomApply) {
    timeModeCustomApply.addEventListener("click", () => {
      const raw = timeModeCustomInput ? timeModeCustomInput.value.trim() : "";
      const customTime = parseInt(raw, 10);

      if (
        !raw ||
        !Number.isFinite(customTime) ||
        customTime < TIME_MODE_CUSTOM_MIN ||
        customTime > TIME_MODE_CUSTOM_MAX
      ) {
        if (timeModeCustomInput) {
          timeModeCustomInput.classList.add("input-error");
          timeModeCustomInput.focus();
        }
        return;
      }

      applySelectedDuration(customTime);
    });
  }

  if (quoteModeBtnRef) {
    quoteModeBtnRef.addEventListener("click", async () => {
      const activating = !(window.gameState && window.gameState.quoteMode);

      if (activating) {
        // Beri feedback visual singkat sambil menunggu fetch quotes.json
        // (biasanya sangat cepat, tapi tetap jaga-jaga kalau jaringan lambat).
        quoteModeBtnRef.disabled = true;
        quoteModeBtnRef.classList.add("loading");
        try {
          await loadQuotes();
        } catch (e) {
          // Sudah di-console.error di dalam loadQuotes(); beri tahu user juga.
        }
        quoteModeBtnRef.disabled = false;
        quoteModeBtnRef.classList.remove("loading");

        if (!isQuotesLoaded()) {
          alert(
            "Gagal memuat teks Quotes. Periksa koneksi kamu lalu coba lagi."
          );
          return;
        }

        if (window.gameState && window.gameState.punctuationMode) {
          window.gameState.punctuationMode = false;
          if (punctuationModeBtnRef) punctuationModeBtnRef.classList.remove("active");
        }

        if (window.gameState) window.gameState.quoteMode = true;
        quoteModeBtnRef.classList.add("active");
      } else {
        if (window.gameState) window.gameState.quoteMode = false;
        quoteModeBtnRef.classList.remove("active");
      }

      if (activating) closeTimeModeModal();

      if (typeof window.resetTest === "function") {
        window.resetTest();
      }
      DOM.hiddenInput.focus();
    });
  }

  if (punctuationModeBtnRef) {
    punctuationModeBtnRef.addEventListener("click", () => {
      const activating = !(window.gameState && window.gameState.punctuationMode);

      if (activating) {
        // Punctuation mode selalu pakai mode waktu -> matikan Quotes kalau aktif
        if (window.gameState && window.gameState.quoteMode) {
          window.gameState.quoteMode = false;
          if (quoteModeBtnRef) quoteModeBtnRef.classList.remove("active");
        }
        if (window.gameState) window.gameState.punctuationMode = true;
        punctuationModeBtnRef.classList.add("active");
        closeTimeModeModal();
      } else {
        if (window.gameState) window.gameState.punctuationMode = false;
        punctuationModeBtnRef.classList.remove("active");
      }

      if (typeof window.resetTest === "function") {
        window.resetTest();
      }
      DOM.hiddenInput.focus();
    });
  }

  const defaultWordBtn = document.querySelector(
    '.word-type-btn[data-word-type="200"]'
  );
  if (defaultWordBtn) defaultWordBtn.classList.add("active");

  initSettingsPanel({
    hideStats: hideStatsContainer,
    showStats: showStatsContainer,
  });

  setKeyboardVisibility(loadKeyboardVisibility());
  updateKeyboardVisibilityUI({
    hideStats: hideStatsContainer,
    showStats: showStatsContainer,
    statsMode: window.gameState ? window.gameState.statsMode : 'speedometer'
  });

  function setupLogoPop() {
    const container = document.querySelector(".text-display-container");
    if (!container) return;

    // Hapus logo lama
    const old = document.getElementById("logoPop");
    if (old) old.remove();

    // Ambil src logo (ikut dark mode)
    const navbarLogo = document.getElementById("logoWebsite");
    const src = navbarLogo
      ? navbarLogo.getAttribute("src")
      : "img/TypingCore.svg";

    const wrap = document.createElement("div");
    wrap.id = "logoPop";
    wrap.className = "logo-pop";
    const img = document.createElement("img");
    img.alt = "TypingCore";
    img.src = src;
    wrap.appendChild(img);
    container.appendChild(wrap);

    if (logoPopObserver) {
      logoPopObserver.disconnect();
      logoPopObserver = null;
    }
    logoPopObserver = new MutationObserver(() => {
      const newSrc = navbarLogo?.getAttribute("src");
      if (newSrc) img.src = newSrc;
    });
    if (navbarLogo)
      logoPopObserver.observe(navbarLogo, {
        attributes: true,
        attributeFilter: ["src"],
      });

    // Expose global
    window.triggerLogoPop = () => {
      const el = document.getElementById("logoPop");
      if (el) el.classList.add("pop");
    };

    window.resetLogoPop = () => {
      const el = document.getElementById("logoPop");
      if (el) el.classList.remove("pop");
    };

    if (!logoPopMouseMoveWired) {
      container.addEventListener("mousemove", () => {
        if (typeof window.resetLogoPop === "function") window.resetLogoPop();
      });
      logoPopMouseMoveWired = true;
    }
  }
  window.resetLogoPop = resetLogoPop;

  function resetLogoPop() {
    const el = document.getElementById("logoPop");
    if (el) el.classList.remove("pop");
  }

  // --- Handle fokus global ---
  document.addEventListener("click", (e) => {
    // Pastikan klik di luar input tidak ganggu modal
    if (
      DOM.hiddenInput &&
      e.target !== DOM.hiddenInput &&
      !e.target.closest("#settingsModal") &&
      !e.target.closest("#timeModeModalOverlay")
    ) {
      DOM.hiddenInput.focus();
    }
  });


});

// Page Visibility API
document.addEventListener("visibilitychange", () => {
  const DOM = getGameDOMReferences();
  if (
    DOM &&
    document.hidden &&
    gameState.startTime &&
    !gameState.isTestInvalid &&
    gameState.inactivityTimer
  ) {
    invalidateTest("Tab diganti saat tes berlangsung.");

    // Tambahan sesuai requirement - jangan tampilkan menu jika test sudah selesai
    if (window.isTestCompleted) return;
    
    if (DOM.header) DOM.header.classList.remove("hidden");
    if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
    if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");

    // Speedometer & logo tetap sembunyi
    hideStatsContainer();
    if (typeof window.resetLogoPop === "function") window.resetLogoPop();
  }
});


// Blur window
window.addEventListener("blur", () => {
  const DOM = getGameDOMReferences();
  if (gameState.startTime && !gameState.isTestInvalid) {
    invalidateTest("Jendela browser tidak aktif.");
    // Jangan tampilkan menu jika test sudah selesai
    if (window.isTestCompleted) return;
    
    if (DOM.header) DOM.header.classList.remove("hidden");
    if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
    if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");
  }
});


// Gerak mouse: munculkan header/menu, sembunyikan speedometer dan logo
document.addEventListener("mousemove", () => {
  const DOM = getGameDOMReferences();
  // Jangan tampilkan menu jika test sudah selesai
  if (window.isTestCompleted) return;
  
  if (DOM.header) DOM.header.classList.remove("hidden");
  if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
  if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");
  hideStatsContainer();
  // Pointer gerak = fokus hilang, tandai lagi
  gameState.isTypingActive = false;

  // Sembunyikan logo saat pointer bergerak
  if (typeof window.resetLogoPop === "function") window.resetLogoPop();
});