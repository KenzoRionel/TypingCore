// js/game/game-events.js

import { DOM } from '../utils/dom-elements.js';
import { gameState } from './game-state.js';
import { processTypedWord, startTimer, endTest, updateRealtimeStats, startInactivityTimer, generateAndAppendWords } from './game-logic.js';
import { renderCurrentLine, updateWordHighlighting, triggerShakeAnimation, prepareAndRenderLines } from '../utils/text-display.js';

export function handleKeydown(e) {
    if (gameState.isTestInvalid) {
        e.preventDefault();
        return;
    }
    
    // Reset inactivity timer on any keydown
    startInactivityTimer();
    if (gameState.isTestInvalid) {
        e.preventDefault();
        return;
    }

    // Reset inactivity timer on any keydown
    startInactivityTimer();
    if (gameState.timeRemaining <= 0 && gameState.timerInterval) {
        e.preventDefault();
        return;
    }

    // Mencegah spasi di awal tes
    if (e.key === ' ' && DOM.hiddenTextInput.value.length === 0 && gameState.typedWordIndex === 0) {
        e.preventDefault();
        return;
    }

    // Memulai timer saat ketikan pertama (bukan spasi atau tombol fungsi)
    if (!gameState.startTime && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== 'Backspace') {
        gameState.startTime = new Date().getTime();
        startTimer();
    }

    // Memastikan buffer kata selalu cukup agar text-display tidak kehabisan kata
    const WORD_BUFFER_THRESHOLD = 80; // Naikkan threshold agar generate lebih awal
    if (
        gameState.fullTextWords.length - gameState.typedWordIndex < WORD_BUFFER_THRESHOLD
        && window.defaultKataKata && window.defaultKataKata.length > 0
    ) {
        generateAndAppendWords(200); // Tambah lebih banyak kata sekaligus
        prepareAndRenderLines();
    }

    // --- Tambahan: jika index sudah melebihi jumlah kata, generate ulang kata ---
    if (gameState.typedWordIndex >= gameState.fullTextWords.length) {
        // Tambahkan kata baru (buffer 100 kata, bisa disesuaikan)
        if (window.defaultKataKata && window.defaultKataKata.length > 0) {
            const prevLength = gameState.fullTextWords.length;
            generateAndAppendWords(100);
            prepareAndRenderLines();
            // Jika index melebihi array, set ke kata pertama batch baru
            if (gameState.typedWordIndex >= gameState.fullTextWords.length) {
                gameState.typedWordIndex = prevLength;
            }
        }
        // Setelah generate, pastikan currentLineIndex menunjuk ke baris yang mengandung typedWordIndex
        let foundLine = 0;
        for (let i = 0; i < gameState.lines.length; i++) {
            const line = gameState.lines[i];
            if (line.some(w => w.index === gameState.typedWordIndex)) {
                foundLine = i;
                break;
            }
        }
        gameState.currentLineIndex = foundLine;
        renderCurrentLine();
    }

    const targetWord = gameState.fullTextWords[gameState.typedWordIndex] || '';
    const currentTypedLength = DOM.hiddenTextInput.value.length;

    // Mencegah mengetik karakter berlebih
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== 'Backspace' && e.key !== ' ') {
        if (currentTypedLength >= targetWord.length && (currentTypedLength - targetWord.length) >= gameState.MAX_OVERTYPED_CHARS_HIGHLIGHT) {
            e.preventDefault();
            triggerShakeAnimation();
            return;
        }
    }

    if (e.key === ' ') {
        e.preventDefault();

        if (DOM.hiddenTextInput.value.length === 0) return; // Jangan proses jika tidak ada input

        processTypedWord();

        const currentLine = gameState.lines[gameState.currentLineIndex];
        const isLastWordInLine = currentLine.findIndex(w => w.index === gameState.typedWordIndex) === currentLine.length - 1;

        // Rekam data untuk grafik SEBELUM memproses kata berikutnya
        const elapsedTime = (new Date().getTime() - gameState.startTime) / 1000;
        if (elapsedTime > 0) {
            const totalCorrectChars = gameState.correctChars;
            const totalIncorrectChars = gameState.incorrectChars;
            // Perhitungan Raw WPM yang benar: termasuk semua karakter yang sudah diketik
            const allTypedChars = totalCorrectChars + totalIncorrectChars + DOM.hiddenTextInput.value.length;
            
            const wpm = Math.round((totalCorrectChars / 5) / (elapsedTime / 60));
            const rawWpm = Math.round((allTypedChars / 5) / (elapsedTime / 60));

            // Ambil status kebenaran kata dan hitung persentase kesalahan
            const wasCorrect = gameState.typedWordCorrectness[gameState.typedWordIndex];
            const typedWord = gameState.userTypedWords[gameState.typedWordIndex] || '';
            const targetWord = gameState.fullTextWords[gameState.typedWordIndex] || '';
            let incorrectCharsInWord = 0;
            for (let i = 0; i < typedWord.length; i++) {
                if (i >= targetWord.length || typedWord[i] !== targetWord[i]) {
                    incorrectCharsInWord++;
                }
            }
            // Tambahkan kesalahan untuk karakter yang tidak diketik jika kata target lebih panjang
            if (targetWord.length > typedWord.length) {
                incorrectCharsInWord += targetWord.length - typedWord.length;
            }
            const errorPercentage = targetWord.length > 0 ? (incorrectCharsInWord / targetWord.length) * 100 : 0;

            gameState.history.push({
                wpm: wpm,
                rawWpm: rawWpm,
                errors: totalIncorrectChars,
                correct: wasCorrect,
                errorPercentage: errorPercentage // Tambahkan persentase kesalahan
            });
        }

        if (isLastWordInLine) {
            gameState.currentLineIndex++;
            if (gameState.currentLineIndex >= gameState.lines.length) {
                gameState.typedWordIndex++;
                DOM.hiddenTextInput.value = '';
                endTest();
                return;
            } else {
                renderCurrentLine();
            }
        }

        gameState.typedWordIndex++;
        DOM.hiddenTextInput.value = '';

        updateWordHighlighting();
        updateRealtimeStats();

    } else if (e.key === 'Backspace') {
        // Gunakan setTimeout untuk memastikan nilai input sudah diperbarui
        setTimeout(() => {
            updateWordHighlighting();
            updateRealtimeStats();
        }, 0);

    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Gunakan setTimeout untuk memastikan nilai input sudah diperbarui
        setTimeout(() => {
            gameState.userTypedWords[gameState.typedWordIndex] = DOM.hiddenTextInput.value;
            updateWordHighlighting();
            updateRealtimeStats();
        }, 0);
    }
}