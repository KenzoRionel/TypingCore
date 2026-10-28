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
  saveKeyboardVisibility,
  setKeyboardVisibility,
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
    "hidden-mode-active",
    "highlight-mode-active"
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
    case "highlight":
      textDisplay.classList.add("highlight-mode-active");
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

const FONT_STACKS = {
  default: "",
  theme: "var(--theme-font-family)",
  monospace: "monospace",
  serif: "serif",
  "sans-serif": "sans-serif",
  minecraft: '"Minecraft", monospace',
  "jetbrains-mono": '"JetBrains Mono", monospace',
  "fira-code": '"Fira Code", monospace',
  "ibm-plex-mono": '"IBM Plex Mono", monospace',
  "roboto-mono": '"Roboto Mono", monospace',
  "space-mono": '"Space Mono", monospace',
  "courier-prime": '"Courier Prime", monospace',
  vt323: '"VT323", monospace',
  "special-elite": '"Special Elite", monospace',
  lora: '"Lora", serif',
  merriweather: '"Merriweather", serif',
  poppins: '"Poppins", sans-serif',
};

const SERIF_FONT_KEYS = new Set(["serif", "lora", "merriweather"]);
const SANS_SERIF_FONT_KEYS = new Set(["sans-serif", "poppins"]);

function applyFont(textDisplay, font) {
  if (!textDisplay) return;
  textDisplay.style.fontFamily = FONT_STACKS[font] ?? "";
  textDisplay.classList.toggle("font-theme", font === "theme");
  textDisplay.classList.toggle("font-sans-serif", SANS_SERIF_FONT_KEYS.has(font));
  textDisplay.classList.toggle("font-serif", SERIF_FONT_KEYS.has(font));
}

function applyStatsDisplayMode(mode) {
  const keyboardMode = mode === "keyboard";
  document.documentElement.classList.toggle("display-mode-keyboard", keyboardMode);
  saveKeyboardVisibility(keyboardMode);
  setKeyboardVisibility(keyboardMode);
}

function applyLiveHudVisibility(visible) {
  document.documentElement.classList.toggle("hide-live-hud", !visible);
}

function applyCaretBlinkSpeed(seconds) {
  document.documentElement.style.setProperty(
    "--caret-blink-duration",
    `${seconds}s`
  );
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
function applyStoredPreferences(textDisplay) {
  const savedCursorMode = localStorage.getItem("cursorMode") || "highlight";
  if (window.gameState) window.gameState.cursorMode = savedCursorMode;
  applyCursorModeClass(textDisplay, savedCursorMode);

  const savedWordSet = localStorage.getItem("wordSet") || "200";
  applyWordSet(savedWordSet);

  const savedFont = localStorage.getItem("selectedFont") || "default";
  applyFont(textDisplay, savedFont);

  const storedDisplayMode = localStorage.getItem("statsDisplayMode");
  const savedDisplayMode =
    storedDisplayMode ||
    (localStorage.getItem("typingCore_showKeyboard") === "true"
      ? "keyboard"
      : "speedometer");
  if (window.gameState) window.gameState.statsDisplayMode = savedDisplayMode;
  applyStatsDisplayMode(savedDisplayMode);

  const rawLiveHud = localStorage.getItem("showLiveHud");
  const savedLiveHud = rawLiveHud === null ? true : rawLiveHud !== "false";
  applyLiveHudVisibility(savedLiveHud);

  const savedBlink = localStorage.getItem("cursorBlink") !== "false";
  if (textDisplay) textDisplay.classList.toggle("cursor-no-blink", !savedBlink);

  const rawBlinkSpeed = parseFloat(localStorage.getItem("cursorBlinkSpeed"));
  const savedBlinkSpeed = Number.isFinite(rawBlinkSpeed)
    ? Math.max(0.3, Math.min(2, rawBlinkSpeed))
    : 1;
  applyCaretBlinkSpeed(savedBlinkSpeed);

  const savedCaretSmoothness = localStorage.getItem("caretSmoothness") || "off";
  setCaretSmoothness(savedCaretSmoothness);

  // Frekuensi tanda baca mode Punctuation (dalam persen 0-100, default 30).
  // Disimpan di gameState.punctuationChance sebagai pecahan 0.0-1.0 supaya
  // langsung dipakai generateAndAppendWords() tanpa konversi lagi.
  const rawPunctuationChance = parseFloat(localStorage.getItem("punctuationChance"));
  const savedPunctuationChance = Number.isFinite(rawPunctuationChance)
    ? Math.max(0, Math.min(100, rawPunctuationChance))
    : 30;
  if (window.gameState) {
    window.gameState.punctuationChance = savedPunctuationChance / 100;
  }

  // Frekuensi angka mode Numbers (dalam persen 0-100, default 30). Pola
  // identik dengan punctuationChance di atas.
  const rawNumberChance = parseFloat(localStorage.getItem("numberChance"));
  const savedNumberChance = Number.isFinite(rawNumberChance)
    ? Math.max(0, Math.min(100, rawNumberChance))
    : 30;
  if (window.gameState) {
    window.gameState.numberChance = savedNumberChance / 100;
  }

  return {
    savedCursorMode,
    savedWordSet,
    savedFont,
    savedDisplayMode,
    savedLiveHud,
    savedBlink,
    savedBlinkSpeed,
    savedCaretSmoothness,
    savedPunctuationChance,
    savedNumberChance,
  };
}

/**
 * Inisialisasi Panel Pengaturan: menerapkan preferensi tersimpan (selalu),
 * dan mengikat UI (nav/segmented control/toggle) bila markup-nya ada di
 * halaman ini (settings.html).
 */
export function initSettingsPanel() {
  // Ambil #textDisplay langsung (boleh null, mis. di settings.html yang
  // tidak punya area tes). Jangan pakai getGameDOMReferences() di sini —
  // fungsi itu mewajibkan elemen-elemen khusus halaman tes (textDisplay,
  // restartButton, speedometer, dst) dan akan return null di halaman yang
  // tidak memilikinya, sehingga seluruh panel pengaturan gagal ter-init.
  const textDisplay = document.getElementById("textDisplay");

  const saved = applyStoredPreferences(textDisplay);

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
  /* Tampilan (Speedometer / Keyboard Virtual) + HUD Teks              */
  /* ---------------------------------------------------------------- */
  function notifyDisplaySettingsChanged() {
    document.dispatchEvent(new CustomEvent("typingcore:display-settings-changed"));
  }

  document.querySelectorAll(".stat-display-btn").forEach((btn) => {
    const mode = btn.getAttribute("data-display-mode");
    const isActive = mode === saved.savedDisplayMode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive ? "true" : "false");

    btn.addEventListener("click", () => {
      document.querySelectorAll(".stat-display-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-checked", "true");
      if (window.gameState) window.gameState.statsDisplayMode = mode;
      applyStatsDisplayMode(mode);
      try {
        localStorage.setItem("statsDisplayMode", mode);
      } catch (e) {}
      pulseAutosave();
      notifyDisplaySettingsChanged();
      restartCurrentTest();
    });
  });

  const liveHudToggle = document.getElementById("liveHudToggle");
  if (liveHudToggle) {
    liveHudToggle.checked = saved.savedLiveHud;
    liveHudToggle.addEventListener("change", () => {
      const visible = liveHudToggle.checked;
      applyLiveHudVisibility(visible);
      try {
        localStorage.setItem("showLiveHud", visible ? "true" : "false");
      } catch (e) {}
      pulseAutosave();
      notifyDisplaySettingsChanged();
    });
  }

  /* ---------------------------------------------------------------- */
  /* Efek Kursor: Kursor Berkedip                                      */
  /* ---------------------------------------------------------------- */
  const cursorBlinkToggle = document.getElementById("cursorBlinkToggle");
  const blinkSpeedRange = document.getElementById("cursorBlinkSpeed");
  const blinkSpeedValue = document.getElementById("cursorBlinkSpeedValue");

  function syncBlinkSpeedState() {
    if (blinkSpeedRange) {
      blinkSpeedRange.disabled = !(cursorBlinkToggle && cursorBlinkToggle.checked);
    }
  }

  if (blinkSpeedRange) {
    blinkSpeedRange.value = saved.savedBlinkSpeed.toFixed(1);
    if (blinkSpeedValue) {
      blinkSpeedValue.textContent = `${saved.savedBlinkSpeed.toFixed(1)}s`;
    }

    blinkSpeedRange.addEventListener("input", () => {
      const seconds = parseFloat(blinkSpeedRange.value);
      if (!Number.isFinite(seconds)) return;
      applyCaretBlinkSpeed(seconds);
      if (blinkSpeedValue) blinkSpeedValue.textContent = `${seconds.toFixed(1)}s`;
    });

    blinkSpeedRange.addEventListener("change", () => {
      const seconds = parseFloat(blinkSpeedRange.value);
      const clamped = Number.isFinite(seconds)
        ? Math.max(0.3, Math.min(2, seconds))
        : 1;
      applyCaretBlinkSpeed(clamped);
      try {
        localStorage.setItem("cursorBlinkSpeed", String(clamped));
      } catch (e) {}
      pulseAutosave();
    });
  }

  if (cursorBlinkToggle) {
    cursorBlinkToggle.checked = saved.savedBlink;
    syncBlinkSpeedState();

    cursorBlinkToggle.addEventListener("change", () => {
      const shouldBlink = cursorBlinkToggle.checked;
      if (DOM.textDisplay) DOM.textDisplay.classList.toggle("cursor-no-blink", !shouldBlink);
      try {
        localStorage.setItem("cursorBlink", shouldBlink ? "true" : "false");
      } catch (e) {}
      syncBlinkSpeedState();
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
  /* Frekuensi Tanda Baca Mode Punctuation                            */
  /* ---------------------------------------------------------------- */
  const punctuationRange = document.getElementById("punctuationChanceRange");
  const punctuationValue = document.getElementById("punctuationChanceValue");
  if (punctuationRange) {
    punctuationRange.value = String(saved.savedPunctuationChance);
    if (punctuationValue) {
      punctuationValue.textContent = `${saved.savedPunctuationChance}%`;
    }

    punctuationRange.addEventListener("input", () => {
      if (punctuationValue) punctuationValue.textContent = `${punctuationRange.value}%`;
    });

    // "change" (lepas/drag selesai) supaya tidak menulis localStorage
    // berulang kali selama user masih menggeser slider.
    punctuationRange.addEventListener("change", () => {
      const percent = parseFloat(punctuationRange.value);
      const clamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 30;
      if (window.gameState) {
        window.gameState.punctuationChance = clamped / 100;
      }
      try {
        localStorage.setItem("punctuationChance", String(clamped));
      } catch (e) {}
      pulseAutosave();
    });
  }

  /* ---------------------------------------------------------------- */
  /* Frekuensi Angka Mode Numbers                                     */
  /* ---------------------------------------------------------------- */
  const numberRange = document.getElementById("numberChanceRange");
  const numberValue = document.getElementById("numberChanceValue");
  if (numberRange) {
    numberRange.value = String(saved.savedNumberChance);
    if (numberValue) {
      numberValue.textContent = `${saved.savedNumberChance}%`;
    }

    numberRange.addEventListener("input", () => {
      if (numberValue) numberValue.textContent = `${numberRange.value}%`;
    });

    numberRange.addEventListener("change", () => {
      const percent = parseFloat(numberRange.value);
      const clamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 30;
      if (window.gameState) {
        window.gameState.numberChance = clamped / 100;
      }
      try {
        localStorage.setItem("numberChance", String(clamped));
      } catch (e) {}
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
