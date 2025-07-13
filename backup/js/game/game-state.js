// js/game/game-state.js

export const gameState = {
    fullTextWords: [],
    typedWordIndex: 0,
    correctChars: 0,
    incorrectChars: 0,
    startTime: null,
    timerInterval: null,
    updateStatsInterval: null,
    totalCorrectWords: 0,
    totalIncorrectWords: 0,
    typedWordCorrectness: [],
    userTypedWords: [],
    TIMED_TEST_DURATION: 60,
    timeRemaining: 60,
    
    // Properti baru untuk rendering dinamis per baris
    lines: [], // Akan berisi array dari objek kata untuk setiap baris
    currentLineIndex: 0, // Melacak indeks baris yang sedang ditampilkan

    // Properti yang sudah tidak digunakan dihapus
    // WORDS_PER_LOGICAL_LINE, DISPLAY_LOGICAL_LINES_COUNT, currentLogicalLineOffset

    INITIAL_WORD_BUFFER: 150, // Jumlah kata yang dibuat di awal
    MAX_OVERTYPED_CHARS_HIGHLIGHT: 5,
    cursorMode: 'highlight', // 'highlight' atau 'caret'
    
    // Properti baru untuk data grafik hasil
    history: [], // Array untuk menyimpan {time, wpm, rawWpm, errors}

    // Properti untuk tes tidak valid
    inactivityTimer: null,
    isTestInvalid: false,
};

window.gameState = gameState;