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

import {

  top200Words,
  top1000Words,
  top10000Words,
} from "./data/default-words.js";
import { initDarkMode } from "./utils/dark-mode.js";
import {
  initIndexKeyboard,
  saveKeyboardSettings,
  loadKeyboardVisibility,
  getKeyboardVisibility,
  setKeyboardVisibility,
  updateKeyboardVisibilityUI
} from "./index-keyboard.js";
import { initSettingsPanel } from "./utils/settings-panel.js";


// Set default kata-kata saat aplikasi pertama kali dijalankan
window.defaultKataKata = top200Words;

// Fisher-Yates (Durstenfeld) shuffle: O(n), unbiased.
// `sort(() => Math.random() - 0.5)` dibuang karena:
//  - Biasnya nyata: hasil sort tergantung comparator konsisten (transitif),
//    sedangkan comparator random tidak transitif, jadi distribusi permutasi
//    tidak seragam (elemen tertentu cenderung "menetap" di posisi tertentu).
//  - Kompleksitasnya O(n log n) dan comparator dipanggil berkali-kali per elemen,
//    padahal Fisher-Yates cukup O(n) dengan 1 kali random per elemen.
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

  // PENTING: deklarasi ini HARUS ada sebelum setupLogoPop() dipanggil pertama kali.
  // `function setupLogoPop(){...}` di-hoist penuh sehingga bisa dipanggil lebih awal,
  // tapi `let logoPopObserver` / `let logoPopMouseMoveWired` di scope yang sama tetap
  // kena Temporal Dead Zone sampai baris deklarasinya benar-benar dieksekusi.
  // Kalau setupLogoPop() dipanggil sebelum baris ini, akan lempar:
  // "ReferenceError: Cannot access 'logoPopObserver' before initialization"
  // dan itu menghentikan seluruh sisa callback DOMContentLoaded (termasuk
  // initGameListeners()/resetTestState() yang merender teks latihan).
  let logoPopObserver = null;
  let logoPopMouseMoveWired = false;

  initDarkMode(DOM.darkModeToggle);
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
  }

  // Inisialisasi Modal Pengaturan (redesign minimalis, auto-save).
  // Menggantikan seluruh IIFE inisialisasi + handler tombol "Simpan" lama:
  // sekarang setiap perubahan di modal langsung diterapkan & disimpan.
  initSettingsPanel({
    hideStats: hideStatsContainer,
    showStats: showStatsContainer,
  });

  // updateKeyboardVisibilityUI tetap dipanggil di sini agar status keyboard
  // (dan visibilitas panel statistik terkait) langsung sinkron saat halaman dimuat.
  setKeyboardVisibility(loadKeyboardVisibility());
  updateKeyboardVisibilityUI({
    hideStats: hideStatsContainer,
    showStats: showStatsContainer,
    statsMode: window.gameState ? window.gameState.statsMode : 'speedometer'
  });



  // -- letakkan di luar DOMContentLoaded (bagian bawah file) --
  //
  // PENTING: setupLogoPop() dipanggil ULANG setiap kali restart (resetTestState()
  // di listener restartButton). Sebelumnya, tiap panggilan menambahkan:
  //   1. sebuah listener "mousemove" BARU ke `container` (tidak pernah dilepas)
  //   2. sebuah MutationObserver BARU yang mengamati navbarLogo (tidak pernah di-disconnect)
  // Setelah N kali restart, 1 gerakan mouse akan memicu handler yang sama N kali,
  // dan N observer aktif sekaligus -> memory leak & kerja berulang yang sia-sia.
  //
  // Perbaikan: simpan observer & flag "sudah wired" di luar closure (di scope
  // DOMContentLoaded, dideklarasikan di ATAS sebelum panggilan pertama), sehingga
  // listener mousemove hanya dipasang SEKALI, dan observer lama selalu
  // di-disconnect sebelum membuat yang baru.
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

    // Mirror kalau dark mode ubah src.
    // Putuskan observer lama dulu (kalau ada) sebelum membuat yang baru,
    // supaya tidak menumpuk observer tiap kali setupLogoPop() dipanggil ulang.
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

    // Hilangkan logo kalau pointer gerak.
    // Listener ini hanya perlu dipasang SEKALI: dia membaca window.resetLogoPop
    // secara dinamis tiap kali dipanggil, jadi tidak perlu di-rebind walaupun
    // logo/elemen di dalamnya dibuat ulang oleh setupLogoPop().
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
      !e.target.closest("#settingsModal")
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