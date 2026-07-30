// js/utils/dom-elements.js

/* ==========================================================================
   PERFORMANCE FIX: cache referensi DOM per halaman
   ==========================================================================
   getGameDOMReferences() dipanggil ULANG di setiap keydown (lihat
   handleKeydown di game-events.js) dan berkali-kali lagi di text-display.js
   / game-logic.js / main.js — padahal elemen-elemen ini (#textDisplay,
   #restartButton, dst.) dibuat SEKALI saat halaman dimuat dan tidak pernah
   di-remove/diganti; yang berubah cuma isi/class-nya lewat referensi yang
   sudah didapat. Hasilnya: puluhan getElementById per keystroke, padahal
   hasilnya selalu sama.

   Solusinya sama seperti pola resetHighlightCache() di text-display.js:
   simpan hasil query pertama di variabel module-level, dan kembalikan cache
   itu di panggilan berikutnya. Supaya cache tidak pernah "nyangkut" ke
   elemen yang sudah tidak ada di DOM, setiap pemanggilan tetap memvalidasi
   salah satu elemen kunci lewat `.isConnected` sebelum memutuskan pakai
   cache atau query ulang — jadi cache-nya "self-healing", tidak wajib
   dipanggil manual dari luar modul ini di jalur normal.
   resetGameDOMCache()/resetLessonDOMCache()/resetHistoryDOMCache() tetap
   diekspor untuk kasus di mana caller TAHU markup-nya baru saja di-rebuild
   dan mau memaksa query ulang tanpa menunggu deteksi `.isConnected`.
*/
let cachedGameDOM = null;
let cachedLessonDOM = null;
let cachedHistoryDOM = null;

export function resetGameDOMCache() {
    cachedGameDOM = null;
}

export function resetLessonDOMCache() {
    cachedLessonDOM = null;
}

export function resetHistoryDOMCache() {
    cachedHistoryDOM = null;
}

/**
 * Mencari dan mengembalikan referensi elemen DOM yang dibutuhkan untuk halaman TYPING GAME.
 * @returns {Object|null} Objek berisi referensi elemen DOM, atau null jika ada elemen kunci yang tidak ditemukan.
 */
export function getGameDOMReferences() {
    // Cache hit: elemen kunci masih terpasang di DOM yang sama -> jangan query ulang.
    if (cachedGameDOM && cachedGameDOM.hiddenInput.isConnected && cachedGameDOM.textDisplay.isConnected) {
        return cachedGameDOM;
    }

    const hiddenInput = getOrCreateHiddenInput();
    const textDisplay = document.getElementById('textDisplay');
    const restartButton = document.getElementById('restartButton');
    const wpmTicksContainer = document.getElementById('wpmTicks');
    const accuracyTicksContainer = document.getElementById('accuracyTicks');
    const timerTicksContainer = document.getElementById('timerTicks');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const wpmNeedle = document.getElementById('wpmNeedle');
    const wpmValue = document.getElementById('wpmValue');
    const accuracyNeedle = document.getElementById('accuracyNeedle');
    const accuracyValue = document.getElementById('accuracyValue');
    const timerNeedle = document.getElementById('timerNeedle');
    const timerValue = document.getElementById('timerValue');
    const statsContainer = document.getElementById('stats-container'); // dipake show/hide
    const header = document.querySelector('header');
    const menuButton = document.getElementById('MenuButton');

    // Pastikan semua elemen penting ada sebelum mengembalikannya
    if (!hiddenInput || !textDisplay || !restartButton || !wpmTicksContainer || !accuracyTicksContainer || !timerTicksContainer || !darkModeToggle) {
        console.error("ERROR: Beberapa elemen DOM kunci untuk game tidak ditemukan.");
        return null;
    }

    // Terapkan kelas mode kursor yang disimpan (jika ada)
    try {
        const savedCursor = localStorage.getItem('cursorMode');
        if (savedCursor && textDisplay) {
            textDisplay.classList.remove('caret-mode-active','underline-mode-active','box-mode-active','hidden-mode-active');
            switch (savedCursor) {
                case 'caret': textDisplay.classList.add('caret-mode-active'); break;
                case 'underline': textDisplay.classList.add('underline-mode-active'); break;
                case 'box': textDisplay.classList.add('box-mode-active'); break;
                case 'hidden': textDisplay.classList.add('hidden-mode-active'); break;
                default: break;
            }
        }
    } catch(e) {}

    cachedGameDOM = {
        hiddenInput,
        textDisplay,
        restartButton,
        wpmTicksContainer,
        accuracyTicksContainer,
        timerTicksContainer,
        darkModeToggle,
        wpmNeedle,
        wpmValue,
        accuracyNeedle,
        accuracyValue,
        timerNeedle,
        timerValue,
        statsContainer,
        header,
        menuButton
    };
    return cachedGameDOM;
}

/**
 * Mencari dan mengembalikan referensi elemen DOM yang dibutuhkan untuk halaman PELAJARAN.
 * @returns {Object|null} Objek berisi referensi elemen DOM, atau null jika ada elemen kunci yang tidak ditemukan.
 */
export function getLessonDOMReferences() {
    if (cachedLessonDOM && cachedLessonDOM.hiddenInput.isConnected && cachedLessonDOM.lessonTextDisplay.isConnected) {
        return cachedLessonDOM;
    }

    const hiddenInput = getOrCreateHiddenInput();
    const keyboardContainer = document.getElementById('virtual-keyboard');
    const lessonHeader = document.getElementById('lesson-header');
    const lessonTitle = document.getElementById('lesson-title');
    const lessonInstruction = document.getElementById('lesson-instruction');
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    const nextLessonBtn = document.getElementById('next-lesson-btn');
    const retryLessonBtn = document.getElementById('retry-lesson-btn');
    const lessonCompleteNotification = document.getElementById('lesson-complete-notification');
    const continueBtn = document.getElementById('continue-to-next-lesson-btn');
    const progressContainerWrapper = document.getElementById('progress-container-wrapper');
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');
    const thumbAnimationContainer = document.getElementById('thumb-animation-container');
    const successAnimationSvg = document.getElementById('success-animation-svg');
    const circlePath = document.getElementById('circle-path');
    const checkPath = document.getElementById('check-path');
    const lessonListBtn = document.getElementById('lessons-list');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // Perbaikan: Tambahkan lessonCompleteNotification ke dalam validasi
    if (!hiddenInput || !keyboardContainer || !lessonHeader || !lessonTitle || !lessonInstruction || !lessonTextDisplay || !lessonCompleteNotification) {
        console.error("ERROR: Beberapa elemen DOM kunci untuk pelajaran tidak ditemukan.");
        return null;
    }

    // Terapkan kelas mode kursor ke lessonTextDisplay agar mode yang dipilih digunakan
    try {
        const savedCursor = localStorage.getItem('cursorMode');
        if (savedCursor && lessonTextDisplay) {
            lessonTextDisplay.classList.remove('caret-mode-active','underline-mode-active','box-mode-active','hidden-mode-active');
            switch (savedCursor) {
                case 'caret': lessonTextDisplay.classList.add('caret-mode-active'); break;
                case 'underline': lessonTextDisplay.classList.add('underline-mode-active'); break;
                case 'box': lessonTextDisplay.classList.add('box-mode-active'); break;
                case 'hidden': lessonTextDisplay.classList.add('hidden-mode-active'); break;
                default: break;
            }
        }
    } catch(e) {}

    cachedLessonDOM = {
        hiddenInput,
        keyboardContainer,
        lessonHeader,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        retryLessonBtn,
        lessonCompleteNotification,
        continueBtn,
        progressContainerWrapper,
        progressBar,
        progressText,
        thumbAnimationContainer,
        successAnimationSvg,
        circlePath,
        checkPath,
        lessonListBtn,
        darkModeToggle,
    };
    return cachedLessonDOM;
}

/**
 * Mencari dan mengembalikan referensi elemen DOM yang dibutuhkan untuk halaman RIWAYAT SKOR.
 * @returns {Object|null} Objek berisi referensi elemen DOM, atau null jika ada elemen kunci yang tidak ditemukan.
 */
export function getHistoryDOMReferences() {
    if (cachedHistoryDOM && cachedHistoryDOM.scoreHistoryList.isConnected) {
        return cachedHistoryDOM;
    }

    const wpmProgressChart = document.getElementById('wpmProgressChart');
    const accuracyProgressChart = document.getElementById('accuracyProgressChart');
    const scoreHistoryList = document.getElementById('scoreHistoryList');
    const noHistoryMessage = document.querySelector('.no-history');

    // Kita tidak perlu hiddenInput di sini, jadi tidak dimasukkan dalam validasi
    // Validasi opsional, tapi bagus untuk memastikan elemen penting ada
    if (!wpmProgressChart || !accuracyProgressChart || !scoreHistoryList) {
        console.error("ERROR: Beberapa elemen DOM kunci untuk riwayat skor tidak ditemukan.");
        return null;
    }

    cachedHistoryDOM = {
        wpmProgressChart,
        accuracyProgressChart,
        scoreHistoryList,
        noHistoryMessage,
    };
    return cachedHistoryDOM;
}

/**
 * Fungsi utilitas untuk mendapatkan atau membuat elemen input tersembunyi.
 */
function getOrCreateHiddenInput() {
    let hiddenInput = document.getElementById('hiddenTextInput');
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'text';
        hiddenInput.id = 'hiddenTextInput';
        hiddenInput.className = 'sr-only'; // pakai class helper, ga usah inline style
        hiddenInput.autocapitalize = 'off';
        hiddenInput.autocomplete = 'off';
        hiddenInput.spellcheck = false;
        document.body.appendChild(hiddenInput);
    }
    return hiddenInput;
}