// js/game/game-state.js

export const gameState = {
    fullTextWords: [],
    typedWordIndex: 0,
    correctChars: 0,
    incorrectChars: 0,
    startTime: null,
    timerInterval: null,
    updateStatsInterval: null,
    isTypingActive: false,
    totalCorrectWords: 0,
    totalIncorrectWords: 0,
    typedWordCorrectness: [],
    userTypedWords: [],
    TIMED_TEST_DURATION: 60,
    timeRemaining: 60,

    // Properti baru untuk rendering dinamis per baris
    lines: [], 
    currentLineIndex: 0, 

    INITIAL_WORD_BUFFER: 100,
    MAX_OVERTYPED_CHARS_HIGHLIGHT: 5,
    cursorMode: 'highlight',
    
    history: [],
    currentVisibleLines: 0, // Baris yang sedang ditampilkan
    lineBufferSize: 100, // Jumlah baris buffer di depan
    totalRenderedLines: 0, // Total baris yang telah dirender

    inactivityTimer: null,
    isTestInvalid: false,

    // Properti baru:
    RENDERED_LINE_BUFFER: 3, // Jumlah baris yang akan dirender di awal dan setiap kali scroll
};

window.gameState = gameState;