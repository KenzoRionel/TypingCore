// js/lesson-free-typing.js

import { getState, updateState, initializeLessonState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import {
    highlightKeyOnKeyboard,
    highlightWrongKeyOnKeyboard,
    clearKeyboardHighlights,
    setAnimatingKey,
    clearAnimation
} from './learn-typing-ui.js';
import { updateProgressBar, calculateLessonProgress } from './progress-bar.js';
import { renderHandVisualizer } from './hand-visualizer.js';
import { dispatchFinishedEvent, renderLesson as reRenderLesson } from './learn-typing-logic.js';

let lessonTextDisplayRef = null;

function getLessonState(lessonId) {
    const defaultState = {
        currentCharIndex: 0,
        userTypingHistory: [],
        wrongInputState: { el: null, originalText: '', timeoutId: null }
    };
    let state = getState(lessonId);
    if (!state) {
        initializeLessonState(lessonId, defaultState);
        state = getState(lessonId);
    }
    // PERBAIKAN: Pastikan wrongInputState selalu ada
    if (!state.wrongInputState) {
        state.wrongInputState = defaultState.wrongInputState;
    }
    return state;
}

function clearWrongInputFeedback(lessonId) {
    const lessonState = getLessonState(lessonId);
    // PERBAIKAN: Tambahkan pengecekan yang lebih kuat untuk properti 'wrongInputState'
    if (lessonState && lessonState.wrongInputState && lessonState.wrongInputState.el) {
        clearTimeout(lessonState.wrongInputState.timeoutId);
        lessonState.wrongInputState.el.textContent = lessonState.wrongInputState.originalText;
        lessonState.wrongInputState.el.classList.remove('wrong-char-overlay', 'wrong-char');
        lessonState.wrongInputState = { el: null, originalText: '', timeoutId: null };
        updateState(lessonId, { wrongInputState: lessonState.wrongInputState });
    }
}

export function renderFreeTypingLesson({ lesson, lessonInstruction, keyboardContainer, lessonTextDisplay: displayEl }) {
    lessonTextDisplayRef = displayEl;
    const lessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${lessonIndex + 1}`;
    const lessonState = getLessonState(lessonId);
    const { currentCharIndex, userTypingHistory } = lessonState;

    clearWrongInputFeedback(lessonId);

    if (!lessonTextDisplayRef) return;
    if (lessonInstruction) lessonInstruction.textContent = lesson.instruction || '';

    lessonTextDisplayRef.innerHTML = '';
    lessonTextDisplayRef.dataset.lessonId = lessonIndex.toString();
    lesson.sequence.forEach((char) => {
        const span = document.createElement('span');
        const displayChar = char === ' ' ? '\u00A0' : char;
        span.textContent = displayChar;
        span.classList.add('typing-char');
        lessonTextDisplayRef.appendChild(span);
    });
    
    Array.from(lessonTextDisplayRef.children).forEach((span, idx) => {
        span.classList.remove('cursor', 'correct-box', 'corrected-box', 'wrong-char', 'error-char');
        const originalChar = lesson.sequence[idx];
        const displayChar = originalChar === ' ' ? '\u00A0' : originalChar;

        if (idx < currentCharIndex) {
            const historyItem = userTypingHistory[idx];
            if (historyItem?.isCorrect) {
                span.textContent = displayChar;
                span.classList.add(historyItem.wasWrong ? 'corrected-box' : 'correct-box');
            } else if (historyItem) {
                span.textContent = historyItem.key === ' ' ? '\u00A0' : historyItem.key;
                span.classList.add('error-char');
            }
        } else if (idx === currentCharIndex) {
            span.classList.add('cursor');
            span.textContent = displayChar;
        } else {
            span.textContent = displayChar;
        }
    });

    if (currentCharIndex < lesson.sequence.length) {
        // PERBAIKAN: Tambahkan logika untuk membersihkan sorotan tombol sebelumnya
        clearKeyboardHighlights(keyboardContainer);
        const nextChar = lesson.sequence[currentCharIndex];
        const keyElement = nextChar ? keyboardContainer.querySelector(`.key[data-key="${nextChar.toLowerCase()}"]`) : null;
        if (keyElement) {
            highlightKeyOnKeyboard(keyboardContainer, nextChar);
            setAnimatingKey(keyElement);
        } else {
            setAnimatingKey(null);
        }
        renderHandVisualizer(nextChar);
    } else {
        clearKeyboardHighlights(keyboardContainer);
        setAnimatingKey(null);
        renderHandVisualizer(null);
    }
}

export function handleFreeTypingInput({ e, domElements, animationFunctions }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    const { keyboardContainer, lessonInstruction } = domElements;
    const { animateJellyEffect, setAnimationSpeed, setIsCorrectInputAnimationActive } = animationFunctions;

    const currentLessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${currentLessonIndex + 1}`;
    const lesson = lessons[currentLessonIndex];
    let lessonState = getLessonState(lessonId);
    let { currentCharIndex, userTypingHistory } = lessonState;

    if (e.key === 'Backspace') {
        if (currentCharIndex > 0) {
            currentCharIndex--;
            userTypingHistory.pop();
            updateState(lessonId, { currentCharIndex, userTypingHistory });
            clearWrongInputFeedback(lessonId);
            reRenderLesson();
        }
    } else if (currentCharIndex < lesson.sequence.length) {
        const expectedChar = lesson.sequence[currentCharIndex];
        const isCorrect = (e.key.toLowerCase() === expectedChar.toLowerCase()) || (e.key === ' ' && expectedChar === ' ');
        const typingCharElement = lessonTextDisplayRef.children[currentCharIndex];

        if (isCorrect) {
            clearWrongInputFeedback(lessonId);
            const wasWrong = (userTypingHistory[currentCharIndex] && userTypingHistory[currentCharIndex].isCorrect === false) || false;
            userTypingHistory[currentCharIndex] = { key: e.key, isCorrect: true, wasWrong, originalChar: expectedChar };
            
            const keyElement = keyboardContainer.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
            if (keyElement && animateJellyEffect) {
                animateJellyEffect(keyElement);
            }

            setAnimationSpeed(15);
            setIsCorrectInputAnimationActive(true);
            setTimeout(() => {
                setAnimationSpeed(3);
                setIsCorrectInputAnimationActive(false);
            }, 50);

            currentCharIndex++;
            updateState(lessonId, { currentCharIndex, userTypingHistory });

            const progressValue = calculateLessonProgress(lesson);
            updateProgressBar(progressValue, domElements.progressText, domElements.progressBar);

            reRenderLesson();

            // PERBAIKAN: Ubah kondisi pengecekan untuk memicu event
            if (currentCharIndex === lesson.sequence.length) {
                dispatchFinishedEvent(currentLessonIndex);
            }
        } else {
            if (typingCharElement) {
                clearWrongInputFeedback(lessonId);
                const wrongInputState = {
                    el: typingCharElement,
                    originalText: typingCharElement.textContent,
                    timeoutId: null
                };

                const displayKey = e.key === ' ' ? '\u00A0' : e.key;
                typingCharElement.textContent = displayKey;
                typingCharElement.classList.add('wrong-char', 'wrong-char-overlay');

                wrongInputState.timeoutId = setTimeout(() => {
                    if (wrongInputState.el === typingCharElement) {
                        typingCharElement.textContent = wrongInputState.originalText;
                        typingCharElement.classList.remove('wrong-char', 'wrong-char-overlay');
                        updateState(lessonId, { wrongInputState: { el: null, originalText: '', timeoutId: null } });
                    }
                }, 200);

                updateState(lessonId, { wrongInputState });
            }
            userTypingHistory[currentCharIndex] = { key: e.key, isCorrect: false, wasWrong: true, originalChar: expectedChar };
            updateState(lessonId, { userTypingHistory });

            if (lessonInstruction) {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
            }
            highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
        }
    }
}

export function resetFreeTypingState() {
    const currentLessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${currentLessonIndex + 1}`;
    clearWrongInputFeedback(lessonId);
    updateState(lessonId, { currentCharIndex: 0, userTypingHistory: [], finished: false });
    if (lessonTextDisplayRef) {
        lessonTextDisplayRef.innerHTML = '';
        lessonTextDisplayRef.dataset.lessonId = '';
    }
    clearAnimation();
}