// js/lesson4-logic.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { highlightKeyOnKeyboard, renderOtherLessons, highlightWrongKeyOnKeyboard, clearKeyboardHighlights } from './learn-typing-ui.js';
import { updateProgressBar } from './progress-bar.js';
import { renderHandVisualizer } from './hand-visualizer.js';

const userTypingHistory = [];

export function renderLesson4(lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer, clearAnimation) {
    const lesson = lessons[3];
    const currentCharIndex = getState('lesson4CurrentCharIndex');
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    if (!lessonTextDisplay) return;

    if (lessonInstruction) lessonInstruction.textContent = lesson.instruction;

    clearKeyboardHighlights(keyboardContainer);
    if (clearAnimation) clearAnimation();

    lessonTextDisplay.innerHTML = '';

    lesson.sequence.forEach((char, idx) => {
        const span = document.createElement('span');
        const displayChar = char === ' ' ? '\u00A0' : char;
        span.textContent = displayChar;
        span.classList.add('typing-char');

        if (idx < currentCharIndex) {
            const historyItem = userTypingHistory[idx];
            if (historyItem) {
                if (historyItem.wasWrong && historyItem.isCorrect) {
                    span.classList.add('corrected-box');
                } else if (!historyItem.isCorrect) {
                    span.classList.add('wrong-char');
                } else {
                    span.classList.add('correct-box');
                }
            }
        }

        lessonTextDisplay.appendChild(span);
    });

    if (currentCharIndex < lesson.sequence.length) {
        const nextCharElement = lessonTextDisplay.children[currentCharIndex];
        if (nextCharElement) {
            nextCharElement.classList.add('cursor');
        }

        const nextChar = lesson.sequence[currentCharIndex];
        const keyElement = keyboardContainer.querySelector(`.key[data-key="${nextChar.toLowerCase()}"]`);

        if (keyElement) {
            keyElement.classList.add('next-key');
        }
        if (keyElement && setAnimatingKey) {
            setAnimatingKey(keyElement);
        }
        if (renderHandVisualizer) {
            renderHandVisualizer(nextChar);
        }
    } else {
        if (setAnimatingKey) setAnimatingKey(null);
        if (renderHandVisualizer) renderHandVisualizer(null);
    }
}

export function cleanupLesson4Elements(lessonInstruction) {
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    if (lessonTextDisplay) {
        lessonTextDisplay.innerHTML = '';
    }
    if (lessonInstruction) lessonInstruction.textContent = '';
    updateState('lesson4CurrentCharIndex', 0);
    userTypingHistory.length = 0;
}

export function handleLesson4Input({ e, doRenderAndHighlight, dispatchLesson4FinishedEvent, lessonInstructionEl, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    const currentCharIndex = getState('lesson4CurrentCharIndex');
    const lesson = lessons[3];
    const expectedChar = lesson.sequence[currentCharIndex];
    const lessonTextDisplay = document.getElementById('lesson-text-display');

    if (e.key === 'Backspace') {
        if (currentCharIndex > 0) {
            updateState('lesson4CurrentCharIndex', currentCharIndex - 1);
            userTypingHistory.pop();
            doRenderAndHighlight(); // Panggil render ulang hanya jika Backspace
        }
    } else {
        const isCorrect = (e.key.toLowerCase() === expectedChar.toLowerCase());

        if (isCorrect) {
            let wasWrong = userTypingHistory[currentCharIndex] ? userTypingHistory[currentCharIndex].wasWrong : false;
            userTypingHistory[currentCharIndex] = { key: e.key.toLowerCase(), isCorrect: isCorrect, wasWrong: wasWrong };

            if (setAnimationSpeed) {
                setAnimationSpeed(15);
                setTimeout(() => setAnimationSpeed(defaultAnimationSpeed), 100);
            }

            const newCharIndex = currentCharIndex + 1;
            updateState('lesson4CurrentCharIndex', newCharIndex);

            doRenderAndHighlight(); // Panggil render ulang hanya jika input BENAR

            if (newCharIndex >= lesson.sequence.length) {
                updateProgressBar(100);
                dispatchLesson4FinishedEvent(new Event('lesson4-finished'));
            }
        } else {
            // JIKA SALAH, CUKUP BERIKAN EFEK VISUAL, TANPA RENDER ULANG
            let wasWrong = userTypingHistory[currentCharIndex] ? userTypingHistory[currentCharIndex].wasWrong : false;
            userTypingHistory[currentCharIndex] = { key: e.key.toLowerCase(), isCorrect: false, wasWrong: true };
            
            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
            highlightWrongKeyOnKeyboard(keyboardContainer, e.key);

            const wrongCharElement = lessonTextDisplay.children[currentCharIndex];
            if (wrongCharElement) {
                wrongCharElement.classList.add('wrong-char-flash');
                setTimeout(() => {
                    wrongCharElement.classList.remove('wrong-char-flash');
                }, 500);
            }
        }
    }
}