// js/utils/settings-panel.js
//
// Modul untuk redesign Modal Pengaturan (minimalis, auto-save).
// Menggantikan logika lama yang sebelumnya menempel di main.js dan
// baru diterapkan saat tombol "Simpan" diklik. Sekarang setiap perubahan
// langsung diterapkan ke halaman, disimpan ke localStorage, dan memicu
// indikator "Tersimpan otomatis" di footer modal.
//
// Markup terkait tetap memakai pola native <input> (radio/checkbox)
// yang di-styling ulang secara visual lewat css/settings-modal.css
// (mengikuti pola Bootstrap .btn-check), jadi selector seperti
// `input[name="cursorMode"]:checked` tetap bekerja seperti sebelumnya.

import { getGameDOMReferences } from "./dom-elements.js";
import {
  top200Words,
  top1000Words,
  top10000Words,
} from "../data/default-words.js";
import {
  saveKeyboardSettings,
  loadKeyboardVisibility,
} from "../index-keyboard.js";
import { setCaretSmoothness } from "./text-display.js";

let autosaveDot = null;
let autosaveText = null;
let autosaveTimeout = null;

function pulseAutosave() {
  if (!autosaveDot || !autosaveText) return;
  autosaveDot.classList.add("pulse");
  autosaveText.classList.add("pulse");
  clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    autosaveDot.classList.remove("pulse");
    autosaveText.classList.remove("pulse");
  }, 1600);
}

// Beberapa perubahan (kursor, word set, font, mode statistik) memengaruhi
// teks/tampilan yang sedang berjalan, jadi tes di-restart agar konsisten
// (perilaku ini setara dengan resetTest() yang dulu dipanggil sekali di
// akhir handler tombol "Simpan"). Toggle blink & keyboard sengaja TIDAK
// me-restart tes karena keduanya murni preferensi visual.
function restartCurrentTest() {
  if (typeof window.resetTest === "function") {
    window.resetTest();
  }
  setTimeout(() => {
    if (typeof window.updateWordHighlighting === "function") {
      window.updateWordHighlighting();
    }
  }, 100);
}

function applyCursorModeClass(textDisplay, mode) {
  if (!textDisplay) return;
  textDisplay.classList.remove(
    "caret-mode-active",
    "underline-mode-active",
    "box-mode-active",
    "hidden-mode-active"
  );
  switch (mode) {
    case "caret":
      textDisplay.classList.add("caret-mode-active");
      break;
    case "underline":
      textDisplay.classList.add("underline-mode-active");
      break;
    case "box":
      textDisplay.classList.add("box-mode-active");
      break;
    case "hidden":
      textDisplay.classList.add("hidden-mode-active");
      break;
    default:
      break;
  }
}

function applyWordSet(value) {
  if (value === "1000") window.defaultKataKata = top1000Words;
  else if (value === "10000") window.defaultKataKata = top10000Words;
  else window.defaultKataKata = top200Words;
}

function applyFont(textDisplay, font) {
  if (!textDisplay) return;
  textDisplay.style.fontFamily = font === "default" ? "" : font;
  textDisplay.classList.toggle("font-sans-serif", font === "sans-serif");
  textDisplay.classList.toggle("font-serif", font === "serif");
}

function applyStatsModeDisplay(mode) {
  const textStats = document.querySelector(".text-stats-container");
  const speedContainers = document.querySelectorAll(".speedometer-container");
  if (mode === "text") {
    if (textStats) textStats.style.display = "flex";
    speedContainers.forEach((el) => (el.style.display = "none"));
  } else {
    if (textStats) textStats.style.display = "none";
    speedContainers.forEach((el) => (el.style.display = "flex"));
  }
}

/**
 * Inisialisasi seluruh interaksi Modal Pengaturan.
 * @param {Object} options
 * @param {Function} options.hideStats - fungsi untuk menyembunyikan panel statistik
 * @param {Function} options.showStats - fungsi untuk menampilkan panel statistik
 */
export function initSettingsPanel({ hideStats, showStats } = {}) {
  const DOM = getGameDOMReferences();
  if (!DOM) return;

  autosaveDot = document.getElementById("autosaveDot");
  autosaveText = document.getElementById("autosaveText");

  /* ---------------------------------------------------------------- */
  /* Pilihan Kursor                                                    */
  /* ---------------------------------------------------------------- */
  const savedCursorMode = localStorage.getItem("cursorMode") || "highlight";
  if (window.gameState) window.gameState.cursorMode = savedCursorMode;
  const cursorRadio = document.querySelector(
    `input[name="cursorMode"][value="${savedCursorMode}"]`
  );
  if (cursorRadio) cursorRadio.checked = true;
  applyCursorModeClass(DOM.textDisplay, savedCursorMode);

  document.querySelectorAll('input[name="cursorMode"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const mode = input.value;
      if (window.gameState) window.gameState.cursorMode = mode;
      applyCursorModeClass(DOM.textDisplay, mode);
      try {
        localStorage.setItem("cursorMode", mode);
      } catch (e) {}
      pulseAutosave();
      restartCurrentTest();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Bahasa & Word Set                                                  */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('input[name="language"]').forEach((langInput) => {
    langInput.addEventListener("change", () => {
      if (!langInput.checked) return;
      const wordSetContainer = document.getElementById("wordSetContainer");
      if (wordSetContainer) wordSetContainer.style.display = "block";
      pulseAutosave();
    });
  });

  const savedWordSet = localStorage.getItem("wordSet") || "200";
  const wordSetRadio = document.querySelector(
    `input[name="wordSet"][value="${savedWordSet}"]`
  );
  if (wordSetRadio) wordSetRadio.checked = true;
  applyWordSet(savedWordSet);

  document.querySelectorAll('input[name="wordSet"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      applyWordSet(input.value);
      try {
        localStorage.setItem("wordSet", input.value);
      } catch (e) {}
      pulseAutosave();
      restartCurrentTest();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Pilih Font                                                        */
  /* ---------------------------------------------------------------- */
  const savedFont = localStorage.getItem("selectedFont") || "default";
  applyFont(DOM.textDisplay, savedFont);
  document.querySelectorAll(".font-choice-btn").forEach((btn) => {
    const isActive = btn.getAttribute("data-font") === savedFont;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive ? "true" : "false");

    btn.addEventListener("click", () => {
      const font = btn.getAttribute("data-font");
      document.querySelectorAll(".font-choice-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-checked", "true");
      applyFont(DOM.textDisplay, font);
      try {
        localStorage.setItem("selectedFont", font);
      } catch (e) {}
      pulseAutosave();
      restartCurrentTest();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Tampilan Statistik (Speedometer / Teks)                           */
  /* ---------------------------------------------------------------- */
  const storedStatsMode = localStorage.getItem("statsMode");
  const initialStatsMode =
    storedStatsMode || (window.gameState ? window.gameState.statsMode : "speedometer");
  if (window.gameState) window.gameState.statsMode = initialStatsMode;
  applyStatsModeDisplay(initialStatsMode);

  document.querySelectorAll(".stats-mode-btn").forEach((btn) => {
    const mode = btn.getAttribute("data-mode");
    const isActive = mode === initialStatsMode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive ? "true" : "false");

    btn.addEventListener("click", () => {
      document.querySelectorAll(".stats-mode-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-checked", "true");
      if (window.gameState) window.gameState.statsMode = mode;
      applyStatsModeDisplay(mode);
      try {
        localStorage.setItem("statsMode", mode);
      } catch (e) {}
      pulseAutosave();
      try {
        if (typeof showStats === "function") showStats();
      } catch (e) {}
      restartCurrentTest();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Efek Kursor: Kursor Berkedip                                      */
  /* ---------------------------------------------------------------- */
  const savedBlink = localStorage.getItem("cursorBlink") !== "false";
  const cursorBlinkToggle = document.getElementById("cursorBlinkToggle");
  if (cursorBlinkToggle) {
    cursorBlinkToggle.checked = savedBlink;
    if (!savedBlink) DOM.textDisplay.classList.add("cursor-no-blink");

    cursorBlinkToggle.addEventListener("change", () => {
      const shouldBlink = cursorBlinkToggle.checked;
      DOM.textDisplay.classList.toggle("cursor-no-blink", !shouldBlink);
      try {
        localStorage.setItem("cursorBlink", shouldBlink ? "true" : "false");
      } catch (e) {}
      pulseAutosave();
    });
  }

  /* ---------------------------------------------------------------- */
  /* Kehalusan Perpindahan Kursor (Smooth Caret)                       */
  /* ---------------------------------------------------------------- */
  // Preferensi murni visual, tidak me-restart tes (sama seperti Kursor
  // Berkedip) supaya user bisa langsung merasakan efeknya saat mengetik.
  const savedCaretSmoothness = localStorage.getItem("caretSmoothness") || "off";
  const caretSmoothnessRadio = document.querySelector(
    `input[name="caretSmoothness"][value="${savedCaretSmoothness}"]`
  );
  if (caretSmoothnessRadio) caretSmoothnessRadio.checked = true;
  setCaretSmoothness(savedCaretSmoothness);

  document.querySelectorAll('input[name="caretSmoothness"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const level = input.value;
      setCaretSmoothness(level);
      try {
        localStorage.setItem("caretSmoothness", level);
      } catch (e) {}
      pulseAutosave();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Tampilan Keyboard Virtual                                         */
  /* ---------------------------------------------------------------- */
  const savedKeyboardVisibility = loadKeyboardVisibility();
  const keyboardToggle = document.getElementById("keyboardToggle");
  if (keyboardToggle) {
    keyboardToggle.checked = savedKeyboardVisibility;
    keyboardToggle.addEventListener("change", () => {
      saveKeyboardSettings(keyboardToggle.checked, {
        hideStats,
        showStats,
        statsMode: window.gameState ? window.gameState.statsMode : "speedometer",
      });
      pulseAutosave();
    });
  }

  /* ---------------------------------------------------------------- */
  /* Fokus kembali ke input saat modal ditutup                         */
  /* ---------------------------------------------------------------- */
  const settingsModalEl = document.getElementById("settingsModal");
  if (settingsModalEl) {
    settingsModalEl.addEventListener("hidden.bs.modal", () => {
      setTimeout(() => {
        if (DOM.hiddenInput) DOM.hiddenInput.focus();
      }, 100);
    });
  }
}