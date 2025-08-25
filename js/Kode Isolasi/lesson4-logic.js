// js/lesson4-logic.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { highlightKeyOnKeyboard,
    renderOtherLessons,
    highlightWrongKeyOnKeyboard,
    clearKeyboardHighlights,
    animateJellyEffect  } from './learn-typing-ui.js';
import { updateProgressBar } from './progress-bar.js';
import { renderHandVisualizer } from './hand-visualizer.js';
import { setIsCorrectInputAnimationActive } from './learn-typing.js';
// PERBAIKAN: Impor fungsi calculateLessonProgress
import { calculateLessonProgress } from './progress-bar.js';

const userTypingHistory = [];

let wrongInputState = {
    el: null,
    originalText: '',
    timeoutId: null
};

function clearWrongInputFeedback() {
    if (wrongInputState.el) {
        clearTimeout(wrongInputState.timeoutId);
        wrongInputState.el.textContent = wrongInputState.originalText;
        wrongInputState.el.classList.remove('wrong-char-overlay', 'wrong-char');
        wrongInputState = { el: null, originalText: '', timeoutId: null };
    }
}

export function renderLesson4(lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect) {
    const lesson = lessons[3];
    // PERBAIKAN: Menggunakan currentCharIndex yang konsisten
    const currentCharIndex = getState('currentCharIndex');
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
                    span.textContent = historyItem.key;
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
    // PERBAIKAN: Mereset currentCharIndex yang konsisten
    updateState('currentCharIndex', 0);
    userTypingHistory.length = 0;
}

export function handleLesson4Input({ e, doRenderAndHighlight, dispatchLesson4FinishedEvent, lessonInstructionEl, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    // PERBAIKAN: Menggunakan currentCharIndex yang konsisten
    const currentCharIndex = getState('currentCharIndex');
    const lesson = lessons[3];
    const expectedChar = lesson.sequence[currentCharIndex];
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    const wrongCharElement = lessonTextDisplay.children[currentCharIndex];

    if (e.key === 'Backspace') {
        if (currentCharIndex > 0) {
            // PERBAIKAN: Menggunakan currentCharIndex yang konsisten
            updateState('currentCharIndex', currentCharIndex - 1);
            userTypingHistory.pop();
            doRenderAndHighlight();
        }
    } else {
        const isCorrect = (e.key.toLowerCase() === expectedChar.toLowerCase());

        if (isCorrect) {
            clearWrongInputFeedback();
            let wasWrong = userTypingHistory[currentCharIndex] ? userTypingHistory[currentCharIndex].wasWrong : false;
            userTypingHistory[currentCharIndex] = { key: e.key, isCorrect: isCorrect, wasWrong: wasWrong };

            const keyElement = keyboardContainer.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
            if (keyElement) {
                if (animateJellyEffect) {
                    animateJellyEffect(keyElement);
                }
            }

            if (setAnimationSpeed) {
                setAnimationSpeed(15);
                setIsCorrectInputAnimationActive(true);
                setTimeout(() => {
                    setAnimationSpeed(3);
                    setIsCorrectInputAnimationActive(false);
                }, 50);
            }
            
            updateState('lastKeyPressed', e.key.toLowerCase());
            const newCharIndex = currentCharIndex + 1;
            // PERBAIKAN: Menggunakan currentCharIndex yang konsisten
            updateState('currentCharIndex', newCharIndex);
            
            // PERBAIKAN: Panggil calculateLessonProgress dengan argumen yang benar
            const currentLessonIndex = getState('currentLessonIndex');
            const progress = calculateLessonProgress(lessons[currentLessonIndex]);
            updateProgressBar(progress);
            
            doRenderAndHighlight();

            if (newCharIndex >= lesson.sequence.length) {
                updateProgressBar(100);
                dispatchLesson4FinishedEvent(new Event('lesson4-finished'));
            }
        } else {
            if (wrongCharElement) {
                clearWrongInputFeedback();
                
                wrongInputState.el = wrongCharElement;
                wrongInputState.originalText = wrongCharElement.textContent;
                
                const displayKey = e.key === ' ' ? '\u00A0' : e.key;
                wrongCharElement.textContent = displayKey;

                wrongCharElement.classList.add('wrong-char');
                wrongCharElement.classList.add('wrong-char-overlay');
                
                wrongInputState.timeoutId = setTimeout(() => {
                    if (wrongInputState.el === wrongCharElement) {
                        wrongCharElement.textContent = wrongInputState.originalText;
                        wrongInputState.el.classList.remove('wrong-char');
                        wrongInputState.el.classList.remove('wrong-char-overlay');
                        wrongInputState = { el: null, originalText: '', timeoutId: null };
                    }
                }, 200);
            }
            
            userTypingHistory[currentCharIndex] = { key: e.key, isCorrect: false, wasWrong: true };
            
            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
            highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
        }
    }
}