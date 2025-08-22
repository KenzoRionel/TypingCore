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
  resetTestState,
  initGameListeners,
  invalidateTest,
  hideStatsContainer,
  showStatsContainer,
} from "./game/game-logic.js";

import { gameState } from "./game/game-state.js";
import {
  top200Words,
  top1000Words,
  top10000Words,
} from "./data/default-words.js";
import { initDarkMode } from "./utils/dark-mode.js";

// Set default kata-kata saat aplikasi pertama kali dijalankan
window.defaultKataKata = top200Words;

function shuffleArray(array) {
  return array.slice().sort(() => Math.random() - 0.5);
}

document.addEventListener("DOMContentLoaded", () => {
  const DOM = getGameDOMReferences();

  if (!DOM) {
    console.error(
      "Inisialisasi aplikasi dibatalkan karena beberapa elemen DOM kunci tidak ditemukan."
    );
    return;
  }

  initDarkMode(DOM.darkModeToggle);
  setupLogoPop();

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

  // Listener utama mengetik (SATU pintu)
  DOM.hiddenInput.addEventListener("keydown", handleKeydown);

  // Expose resetTest
  window.resetTest = resetTestState;

  // Inisialisasi listener game (kosong agar tak bentrok, tapi dipanggil untuk konsistensi arsitektur)
  initGameListeners();

  // Reset awal + render awal
  resetTestState();

  // Tombol mode waktu
  document.querySelectorAll(".time-mode-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const selectedTime = parseInt(this.getAttribute("data-time"), 10);
      document
        .querySelectorAll(".time-mode-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      if (window.gameState) {
        window.gameState.TIMED_TEST_DURATION = selectedTime;
        window.gameState.timeRemaining = selectedTime;
      }
      setTimerSpeedometerMax(selectedTime);
      if (typeof window.resetTest === "function") {
        window.resetTest();
      }
      DOM.hiddenInput.focus();
    });
  });

  // -- letakkan di luar DOMContentLoaded (bagian bawah file) --
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

    // Mirror kalau dark mode ubah src
    const observer = new MutationObserver(() => {
      const newSrc = navbarLogo?.getAttribute("src");
      if (newSrc) img.src = newSrc;
    });
    if (navbarLogo)
      observer.observe(navbarLogo, {
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

    // Hilangkan logo kalau pointer gerak
    container.addEventListener("mousemove", () => {
      if (typeof window.resetLogoPop === "function") window.resetLogoPop();
    });
  }
  window.resetLogoPop = resetLogoPop;

  function resetLogoPop() {
    const el = document.getElementById("logoPop");
    if (el) el.classList.remove("pop");
  }

  // Tombol jenis kata
  document.querySelectorAll(".word-type-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".word-type-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      const selectedType = this.getAttribute("data-word-type");
      if (selectedType === "200") {
        window.defaultKataKata = top200Words;
      } else if (selectedType === "1000") {
        window.defaultKataKata = top1000Words;
      } else if (selectedType === "10000") {
        window.defaultKataKata = top10000Words;
      }
      if (typeof window.resetTest === "function") {
        window.resetTest();
      }
      DOM.hiddenInput.focus();
    });
  });

  // Tombol mode kursor
  document.querySelectorAll(".cursor-mode-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".cursor-mode-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      const selectedMode = this.getAttribute("data-cursor-mode");
      if (window.gameState) {
        window.gameState.cursorMode = selectedMode;
      }

      if (selectedMode === "caret") {
        DOM.textDisplay.classList.add("caret-mode-active");
      } else {
        DOM.textDisplay.classList.remove("caret-mode-active");
      }
      if (typeof window.updateWordHighlighting === "function") {
        window.updateWordHighlighting();
      }
      DOM.hiddenInput.focus();
    });
  });
  document.addEventListener("click", (e) => {
    // cek biar ga bikin infinite loop klik
    if (DOM.hiddenInput && e.target !== DOM.hiddenInput) {
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
    !gameState.isTestInvalid
  ) {
    invalidateTest("Tab diganti saat tes berlangsung.");
  }
});

// Blur window
window.addEventListener("blur", () => {
  if (gameState.startTime && !gameState.isTestInvalid) {
    invalidateTest("Jendela browser tidak aktif.");
  }
});

  // Gerak mouse: munculkan header/menu, sembunyikan speedometer dan logo
  document.addEventListener("mousemove", () => {
    const DOM = getGameDOMReferences();
    if (DOM.header) DOM.header.classList.remove("hidden");
    if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
    if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");
    hideStatsContainer();
    // Pointer gerak = fokus hilang, tandai lagi
    gameState.isTypingActive = false;

    // Sembunyikan logo saat pointer bergerak
    if (typeof window.resetLogoPop === "function") window.resetLogoPop();
  });
