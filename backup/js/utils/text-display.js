// js/utils/text-display.js

import { DOM } from './dom-elements.js';
import { gameState } from '../game/game-state.js';

const MAX_OVERTYPED_CHARS_HIGHLIGHT = 5;

export function prepareAndRenderLines() {
    if (!DOM.textDisplay || !gameState.fullTextWords.length) return;
    calculateLines();
    renderCurrentLine();
}

export function renderCurrentLine() {
    DOM.textDisplay.innerHTML = '';
    const startLine = gameState.currentLineIndex;
    const endLine = Math.min(startLine + 3, gameState.lines.length);

    for (let i = startLine; i < endLine; i++) {
        const lineWords = gameState.lines[i];
        if (!lineWords) continue;
        const lineContainer = document.createElement('div');
        lineContainer.classList.add('text-line');
        lineWords.forEach(wordData => {
            const wordContainer = document.createElement('span');
            wordContainer.classList.add('word-container');
            wordContainer.id = `word-${wordData.index}`;
            wordData.word.split('').forEach(char => {
                const charSpan = document.createElement('span');
                charSpan.textContent = char;
                wordContainer.appendChild(charSpan);
            });
            if (wordData.indexInLine < lineWords.length - 1) {
                const spaceSpan = document.createElement('span');
                spaceSpan.textContent = ' ';
                spaceSpan.classList.add('space-char');
                wordContainer.appendChild(spaceSpan);
            }
            lineContainer.appendChild(wordContainer);
        });
        DOM.textDisplay.appendChild(lineContainer);
    }
    updateWordHighlighting();
}

function calculateLines() {
    DOM.textDisplay.innerHTML = '';
    gameState.lines = [];
    const wordElements = gameState.fullTextWords.map((word, index) => {
        const wordContainer = document.createElement('span');
        wordContainer.classList.add('word-container');
        wordContainer.id = `word-measure-${index}`;
        wordContainer.textContent = word + ' ';
        return wordContainer;
    });
    const lineContainer = document.createElement('div');
    lineContainer.classList.add('text-line');
    wordElements.forEach(el => lineContainer.appendChild(el));
    DOM.textDisplay.appendChild(lineContainer);
    let currentLine = [];
    let lastOffsetTop = -1;
    wordElements.forEach((el, index) => {
        const offsetTop = el.offsetTop;
        if (lastOffsetTop !== -1 && offsetTop > lastOffsetTop) {
            gameState.lines.push(currentLine);
            currentLine = [];
        }
        currentLine.push({
            word: gameState.fullTextWords[index],
            index: index,
            indexInLine: currentLine.length
        });
        lastOffsetTop = offsetTop;
    });
    if (currentLine.length > 0) {
        gameState.lines.push(currentLine);
    }
    DOM.textDisplay.innerHTML = '';
}

export function updateWordHighlighting() {
    // Hapus kursor lama terlebih dahulu
    const oldCursor = DOM.textDisplay.querySelector('.blinking-cursor');
    if (oldCursor) {
        oldCursor.remove();
    }

    const allWordContainers = DOM.textDisplay.querySelectorAll('.word-container');
    allWordContainers.forEach(wc => {
        wc.classList.remove('current-word-target');
        const wordIndex = parseInt(wc.id.replace('word-', ''));
        if (wordIndex < gameState.typedWordIndex) {
            wc.classList.toggle('word-correct', gameState.typedWordCorrectness[wordIndex]);
            wc.classList.toggle('word-incorrect', !gameState.typedWordCorrectness[wordIndex]);
        } else {
            wc.classList.remove('word-correct', 'word-incorrect');
        }
    });

    const currentWordElement = document.getElementById(`word-${gameState.typedWordIndex}`);
    if (currentWordElement) {
        // Selalu tandai kata saat ini. CSS akan menentukan cara menampilkannya.
        currentWordElement.classList.add('current-word-target');
        currentWordElement.classList.remove('word-correct', 'word-incorrect');

        const targetWord = gameState.fullTextWords[gameState.typedWordIndex] || '';
        const currentWordTypedValue = DOM.hiddenTextInput.value;

        // Perbarui warna karakter
        const charSpans = currentWordElement.querySelectorAll('span:not(.space-char)');
        const hasOvertyped = currentWordTypedValue.length > targetWord.length;

        charSpans.forEach((charSpan, j) => {
            if (hasOvertyped) {
                // Jika ada karakter berlebih, seluruh kata salah
                charSpan.classList.add('wrong');
                charSpan.classList.remove('correct');
            } else if (j < currentWordTypedValue.length) {
                // Logika normal jika tidak ada karakter berlebih
                const isCorrect = currentWordTypedValue[j] === targetWord[j];
                charSpan.classList.toggle('correct', isCorrect);
                charSpan.classList.toggle('wrong', !isCorrect);
            } else {
                // Karakter yang belum diketik
                charSpan.classList.remove('correct', 'wrong');
            }
        });

        // Logika untuk mode kursor 'caret'
        if (gameState.cursorMode === 'caret') {
            const cursor = document.createElement('span');
            cursor.classList.add('blinking-cursor');
            
            let cursorPosition = 0;
            const typedLength = currentWordTypedValue.length;

            // Buat elemen sementara untuk mengukur lebar teks yang diketik
            const measureSpan = document.createElement('span');
            measureSpan.style.visibility = 'hidden';
            measureSpan.style.position = 'absolute';
            measureSpan.style.font = window.getComputedStyle(currentWordElement).font;
            measureSpan.textContent = targetWord.substring(0, typedLength);
            document.body.appendChild(measureSpan);
            cursorPosition = measureSpan.offsetWidth;
            document.body.removeChild(measureSpan);

            cursor.style.left = `${cursorPosition}px`;
            currentWordElement.appendChild(cursor);
        }
    }
}
window.updateWordHighlighting = updateWordHighlighting; // Ekspor ke window

export function triggerShakeAnimation() {
    if (!DOM.textDisplay.classList.contains('error-shake')) {
        DOM.textDisplay.classList.add('error-shake');
        setTimeout(() => {
            DOM.textDisplay.classList.remove('error-shake');
        }, 200);
    }
}