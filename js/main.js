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

  // Baris ini diperlukan untuk menghindari error, tapi tidak digunakan untuk menutup modal
  const settingsModalElement = document.getElementById("settingsModal");
  if (!settingsModalElement) {
    console.error("Elemen modal pengaturan tidak ditemukan.");
    return;
  }
  const settingsModal = new bootstrap.Modal(settingsModalElement);

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

  DOM.hiddenInput.addEventListener("keydown", handleKeydown);
  window.resetTest = resetTestState;
  initGameListeners();
  resetTestState();

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

  const defaultTimeBtn = document.querySelector(
    '.time-mode-btn[data-time="60"]'
  );
  if (defaultTimeBtn) defaultTimeBtn.classList.add("active");

  const defaultWordBtn = document.querySelector(
    '.word-type-btn[data-word-type="200"]'
  );
  if (defaultWordBtn) defaultWordBtn.classList.add("active");

  // Set nilai default ke gameState
  if (window.gameState) {
    window.gameState.TIMED_TEST_DURATION = 60;
    window.gameState.timeRemaining = 60;
    // Load saved cursor mode jika ada, fallback ke highlight
    const savedCursor = localStorage.getItem('cursorMode') || 'highlight';
    window.gameState.cursorMode = savedCursor;
  }

  // Muat preferensi statistik dari localStorage (jika ada) dan inisialisasi tampilan
  (function initStatsModeDisplay() {
    const stored = localStorage.getItem('statsMode');
    const modeToUse = stored || (window.gameState ? window.gameState.statsMode : 'speedometer');
    if (window.gameState) window.gameState.statsMode = modeToUse;

    // Set tombol aktif di modal pengaturan sesuai mode
    document.querySelectorAll('.stats-mode-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-mode') === modeToUse);
    });

    const textStats = document.querySelector('.text-stats-container');
    const speedContainers = document.querySelectorAll('.speedometer-container');
    if (modeToUse === 'text') {
      if (textStats) textStats.style.display = 'flex';
      speedContainers.forEach((el) => (el.style.display = 'none'));
    } else {
      if (textStats) textStats.style.display = 'none';
      speedContainers.forEach((el) => (el.style.display = 'flex'));
    }
  })();

  // Muat preferensi font dari localStorage
  (function initFontDisplay() {
    const savedFont = localStorage.getItem('selectedFont') || 'default';
    DOM.textDisplay.style.fontFamily = savedFont === 'default' ? '' : savedFont;
    
    // Tambahkan class untuk penanganan sans-serif
    DOM.textDisplay.classList.toggle("font-sans-serif", savedFont === "sans-serif");
    
    // Set tombol font aktif di modal pengaturan
    document.querySelectorAll('.font-choice-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-font') === savedFont);
    });
  })();

  // Muat preferensi cursor mode dari localStorage
  (function initCursorModeDisplay() {
    const savedCursorMode = localStorage.getItem('cursorMode') || 'highlight';
    
    // Set radio button cursor mode aktif di modal pengaturan
    const cursorRadio = document.querySelector(`input[name="cursorMode"][value="${savedCursorMode}"]`);
    if (cursorRadio) {
      cursorRadio.checked = true;
    }
  })();

  // Muat preferensi cursor blink dari localStorage
  (function initCursorBlinkDisplay() {
    const savedBlink = localStorage.getItem('cursorBlink') !== 'false';
    const cursorBlinkToggle = document.getElementById("cursorBlinkToggle");
    
    if (cursorBlinkToggle) {
      cursorBlinkToggle.checked = savedBlink;
    }
    
    // Apply kelas no-blink jika disabled
    if (!savedBlink) {
      DOM.textDisplay.classList.add("cursor-no-blink");
    }
  })();

  // Muat preferensi word set dari localStorage
  (function initWordSetDisplay() {
    const savedWordSet = localStorage.getItem('wordSet') || '200';
    
    // Set radio button word set aktif di modal pengaturan
    const wordSetRadio = document.querySelector(`input[name="wordSet"][value="${savedWordSet}"]`);
    if (wordSetRadio) {
      wordSetRadio.checked = true;
    }
    
    // Setel kata-kata yang sesuai
    if (savedWordSet === '1000') {
      window.defaultKataKata = top1000Words;
    } else if (savedWordSet === '10000') {
      window.defaultKataKata = top10000Words;
    } else {
      window.defaultKataKata = top200Words;
    }
  })();

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

  // --- Handle fokus global ---
  document.addEventListener("click", (e) => {
    // Pastikan klik di luar input tidak ganggu modal
    if (
      DOM.hiddenInput &&
      e.target !== DOM.hiddenInput &&
      !e.target.closest("#settingsModal")
    ) {
      DOM.hiddenInput.focus();
    }
  });

  // --- Preview update saat ganti cursor mode ---
  const cursorPreviewText = document.getElementById("cursorPreviewText");
  document.querySelectorAll('input[name="cursorMode"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        switch (input.value) {
          case "caret":
            cursorPreviewText.textContent = "|";
            break;
          case "underline":
            cursorPreviewText.textContent = "_";
            break;
          case "box":
            cursorPreviewText.textContent = "█";
            break;
          case "hidden":
            cursorPreviewText.textContent = "";
            break;
          default:
            cursorPreviewText.textContent = "█";
        }
      }
    });
  });

  // --- Tampilkan word set saat pilih bahasa ---
  document.querySelectorAll('input[name="language"]').forEach((langInput) => {
    langInput.addEventListener("change", () => {
      const wordSetContainer = document.getElementById("wordSetContainer");
      wordSetContainer.style.display = "block";
    });
  });

  // --- Event untuk font choice button ---
  document.querySelectorAll(".font-choice-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedFont = btn.getAttribute("data-font");
      const textDisplay = document.querySelector(".text-display-container");

      document
        .querySelectorAll(".font-choice-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      textDisplay.style.fontFamily =
        selectedFont === "default" ? "" : selectedFont;
      
      // Tambahkan class untuk penanganan sans-serif
      DOM.textDisplay.classList.toggle("font-sans-serif", selectedFont === "sans-serif");

      saveBtn.disabled = false; // Enable save
    });
  });

  // --- Event untuk stats mode button ---
  document.querySelectorAll(".stats-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedMode = btn.getAttribute("data-mode");

      document
        .querySelectorAll(".stats-mode-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Preview langsung update tampilan
      const speedometerContainer = document.querySelector(
        ".speedometer-container"
      );
      const textStatsContainer = document.querySelector(
        ".text-stats-container"
      );

      if (selectedMode === "speedometer") {
        speedometerContainer.style.display = "flex";
        textStatsContainer.style.display = "none";
      } else {
        speedometerContainer.style.display = "none";
        textStatsContainer.style.display = "flex";
      }

      saveBtn.disabled = false; // Enable save
    });
  });

  // --- Simpan pengaturan ---
  const saveBtn = document.getElementById("saveSettings");

  // Aktifkan logika enable save jika ada perubahan
  const settingsInputs = document.querySelectorAll(
    "#settingsModal input, #settingsModal select, #settingsModal .font-choice-btn, #settingsModal .stats-mode-btn"
  );
  settingsInputs.forEach((el) => {
    el.addEventListener("change", () => (saveBtn.disabled = false));
    el.addEventListener("click", () => (saveBtn.disabled = false));
  });

  saveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Cursor mode
    const selectedCursor = document.querySelector(
      'input[name="cursorMode"]:checked'
    ).value;
    gameState.cursorMode = selectedCursor;
    // persist pilihan agar halaman mengetik lain dapat menggunakannya
    try { localStorage.setItem('cursorMode', selectedCursor); } catch (e) {}

    // Normalisasi kelas mode kursor pada elemen textDisplay
    DOM.textDisplay.classList.remove(
      "caret-mode-active",
      "underline-mode-active",
      "box-mode-active",
      "hidden-mode-active"
    );
    switch (selectedCursor) {
      case "caret":
        DOM.textDisplay.classList.add("caret-mode-active");
        break;
      case "underline":
        DOM.textDisplay.classList.add("underline-mode-active");
        break;
      case "box":
        DOM.textDisplay.classList.add("box-mode-active");
        break;
      case "hidden":
        DOM.textDisplay.classList.add("hidden-mode-active");
        break;
      default:
        break;
    }

    // Word set
    const selectedWordSet = document.querySelector(
      'input[name="wordSet"]:checked'
    ).value;
    if (selectedWordSet === "200") {
      window.defaultKataKata = top200Words;
    } else if (selectedWordSet === "1000") {
      window.defaultKataKata = top1000Words;
    } else if (selectedWordSet === "10000") {
      window.defaultKataKata = top10000Words;
    }
    // Simpan pilihan word set ke localStorage
    try {
      localStorage.setItem('wordSet', selectedWordSet);
    } catch (e) {}

    // Font
    const activeFontBtn = document.querySelector(".font-choice-btn.active");
    const selectedFont = activeFontBtn
      ? activeFontBtn.getAttribute("data-font")
      : "default";
    DOM.textDisplay.style.fontFamily =
      selectedFont === "default" ? "" : selectedFont;
    
    // Tambahkan class untuk penanganan sans-serif
    DOM.textDisplay.classList.toggle("font-sans-serif", selectedFont === "sans-serif");
    
    // Simpan pilihan font ke localStorage
    try {
      localStorage.setItem('selectedFont', selectedFont);
    } catch (e) {}

    // Statistik tampilan
    const activeStatsBtn = document.querySelector(".stats-mode-btn.active");
    const selectedStatsMode = activeStatsBtn
      ? activeStatsBtn.getAttribute("data-mode")
      : "speedometer";
    gameState.statsMode = selectedStatsMode;
    // Simpan preferensi agar bertahan antar sesi
    try {
      localStorage.setItem('statsMode', selectedStatsMode);
    } catch (e) {}

    // Cursor Blink Toggle
    const cursorBlinkToggle = document.getElementById("cursorBlinkToggle");
    const shouldBlink = cursorBlinkToggle ? cursorBlinkToggle.checked : true;
    if (shouldBlink) {
      DOM.textDisplay.classList.remove("cursor-no-blink");
    } else {
      DOM.textDisplay.classList.add("cursor-no-blink");
    }
    // Simpan preferensi blink ke localStorage
    try {
      localStorage.setItem('cursorBlink', shouldBlink ? 'true' : 'false');
    } catch (e) {}

    // Reset tes supaya perubahan langsung berlaku
    if (typeof window.resetTest === "function") {
      window.resetTest();
    }

    // Pastikan tampilan statistik mengikuti pilihan baru setelah simpan
    try {
      showStatsContainer();
    } catch (e) {}

    // Update highlight dan pastikan fokus kembali kalau modal ditutup nanti
    setTimeout(() => {
      if (typeof window.updateWordHighlighting === "function") {
        window.updateWordHighlighting();
      }
    }, 100);

    // Disable tombol simpan sampai ada perubahan lagi
    saveBtn.disabled = true;

    // Baris di bawah ini yang harus dihapus agar modal tidak tertutup otomatis.
    // settingsModal.hide();

  });

  // Fokus kembali ke input setelah modal ditutup
  document
    .getElementById("settingsModal")
    .addEventListener("hidden.bs.modal", () => {
      setTimeout(() => {
        if (DOM.hiddenInput) DOM.hiddenInput.focus();
      }, 100);
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

    // Tambahan sesuai requirement
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
    if (DOM.header) DOM.header.classList.remove("hidden");
    if (DOM.menuButton) DOM.menuButton.classList.remove("hidden");
    if (DOM.restartButton) DOM.restartButton.classList.remove("hidden");
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