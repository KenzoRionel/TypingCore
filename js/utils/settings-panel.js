// js/utils/settings-panel.js
//
// Modul untuk Panel Pengaturan (minimalis, auto-save).
// Bekerja di halaman standalone settings.html maupun modal (legacy).
// Setiap perubahan langsung diterapkan ke halaman, disimpan ke localStorage, dan memicu
// indikator "Tersimpan otomatis" di footer panel.
//
// Markup terkait tetap memakai pola native <input> (radio/checkbox)
// yang di-styling ulang secara visual lewat css/settings-modal.css
// (mengikuti pola Bootstrap .btn-check), jadi selector seperti
// `input[name="cursorMode"]:checked` tetap bekerja seperti sebelumnya.

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
 * Menerapkan seluruh preferensi yang tersimpan di localStorage ke halaman
 * saat ini. Fungsi ini SENGAJA dipisah dari pengikatan UI (nav/segmented
 * control) di bawah, dan selalu dijalankan terlepas dari apakah markup
 * panel pengaturan (.settings-page / #settingsModal) ada di halaman ini
 * atau tidak. Ini penting supaya preferensi yang diubah user di
 * settings.html (standalone) benar-benar diterapkan saat mereka kembali
 * ke index.html, yang tidak memiliki markup panel pengaturan sama sekali.
 */
function applyStoredPreferences(textDisplay, { hideStats, showStats } = {}) {
  const savedCursorMode = localStorage.getItem("cursorMode") || "highlight";
  if (window.gameState) window.gameState.cursorMode = savedCursorMode;
  applyCursorModeClass(textDisplay, savedCursorMode);

  const savedWordSet = localStorage.getItem("wordSet") || "200";
  applyWordSet(savedWordSet);

  const savedFont = localStorage.getItem("selectedFont") || "default";
  applyFont(textDisplay, savedFont);

  const storedStatsMode = localStorage.getItem("statsMode");
  const initialStatsMode =
    storedStatsMode || (window.gameState ? window.gameState.statsMode : "speedometer");
  if (window.gameState) window.gameState.statsMode = initialStatsMode;
  applyStatsModeDisplay(initialStatsMode);

  const savedBlink = localStorage.getItem("cursorBlink") !== "false";
  if (textDisplay) textDisplay.classList.toggle("cursor-no-blink", !savedBlink);

  const savedCaretSmoothness = localStorage.getItem("caretSmoothness") || "off";
  setCaretSmoothness(savedCaretSmoothness);

  return { savedCursorMode, savedWordSet, savedFont, initialStatsMode, savedBlink, savedCaretSmoothness };
}

/**
 * Inisialisasi Panel Pengaturan: menerapkan preferensi tersimpan (selalu),
 * dan mengikat UI (nav/segmented control/toggle) bila markup-nya ada di
 * halaman ini (settings.html).
 * @param {Object} options
 * @param {Function} options.hideStats - fungsi untuk menyembunyikan panel statistik
 * @param {Function} options.showStats - fungsi untuk menampilkan panel statistik
 */
export function initSettingsPanel({ hideStats, showStats } = {}) {
  // Ambil #textDisplay langsung (boleh null, mis. di settings.html yang
  // tidak punya area tes). Jangan pakai getGameDOMReferences() di sini —
  // fungsi itu mewajibkan elemen-elemen khusus halaman tes (textDisplay,
  // restartButton, speedometer, dst) dan akan return null di halaman yang
  // tidak memilikinya, sehingga seluruh panel pengaturan gagal ter-init.
  const textDisplay = document.getElementById("textDisplay");

  const saved = applyStoredPreferences(textDisplay, { hideStats, showStats });

  autosaveDot = document.getElementById("autosaveDot");
  autosaveText = document.getElementById("autosaveText");

  /* ---------------------------------------------------------------- */
  /* Navigasi Grup Pengaturan                                          */
  /* ---------------------------------------------------------------- */
  // Setiap tombol nav (icon + judul) menampilkan satu grup pengaturan
  // yang saling berhubungan (mis. "Caret & Kursor") dan menyembunyikan
  // grup lainnya. Struktur ini dibuat agar mudah menambah grup baru
  // di masa depan tanpa mengubah logika switching-nya.
  const settingsContainer = document.querySelector(
    ".settings-page, #settingsModal"
  );
  // Halaman ini (mis. index.html) tidak memiliki UI panel pengaturan —
  // preferensi sudah diterapkan di atas, jadi cukup berhenti di sini.
  if (!settingsContainer) return;

  const DOM = { textDisplay, hiddenInput: document.getElementById("hiddenTextInput") };

  const navItems = settingsContainer.querySelectorAll(
    ".settings-nav-item"
  );
  const groupPanels = settingsContainer.querySelectorAll(
    ".settings-group"
  );

  function activateGroup(target) {
    navItems.forEach((btn) => {
      const isActive = btn.getAttribute("data-group-target") === target;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    groupPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `group-${target}`);
    });
  }

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      activateGroup(btn.getAttribute("data-group-target"));
    });
  });

  // Aktivasi grup pertama saat halaman dimuat (standalone page).
  if (navItems.length) {
    activateGroup(navItems[0].getAttribute("data-group-target"));
  }

  /* ---------------------------------------------------------------- */
  /* Pilihan Kursor                                                    */
  /* ---------------------------------------------------------------- */
  // Sudah diterapkan ke halaman oleh applyStoredPreferences(); di sini
  // tinggal sinkronkan status "checked" pada radio input-nya.
  const cursorRadio = document.querySelector(
    `input[name="cursorMode"][value="${saved.savedCursorMode}"]`
  );
  if (cursorRadio) cursorRadio.checked = true;

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

  const wordSetRadio = document.querySelector(
    `input[name="wordSet"][value="${saved.savedWordSet}"]`
  );
  if (wordSetRadio) wordSetRadio.checked = true;

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
  document.querySelectorAll(".font-choice-btn").forEach((btn) => {
    const isActive = btn.getAttribute("data-font") === saved.savedFont;
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
  document.querySelectorAll(".stats-mode-btn").forEach((btn) => {
    const mode = btn.getAttribute("data-mode");
    const isActive = mode === saved.initialStatsMode;
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
  const cursorBlinkToggle = document.getElementById("cursorBlinkToggle");
  if (cursorBlinkToggle) {
    cursorBlinkToggle.checked = saved.savedBlink;

    cursorBlinkToggle.addEventListener("change", () => {
      const shouldBlink = cursorBlinkToggle.checked;
      if (DOM.textDisplay) DOM.textDisplay.classList.toggle("cursor-no-blink", !shouldBlink);
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
  const caretSmoothnessRadio = document.querySelector(
    `input[name="caretSmoothness"][value="${saved.savedCaretSmoothness}"]`
  );
  if (caretSmoothnessRadio) caretSmoothnessRadio.checked = true;

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