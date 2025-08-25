// js/lesson6-logic.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard, highlightWrongKeyOnKeyboard, clearKeyboardHighlights, animateJellyEffect, animateAllBordersOnCorrectInput } from './learn-typing-ui.js';
import { setIsCorrectInputAnimationActive } from './learn-typing.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';

let lesson6SequenceContainer = null;
let lesson6UnderlineContainer = null;

let wrongInputState = {
    el: null,
    originalText: '',
    timeoutId: null
};

export function getSequenceForState(state) {
    // ✅ Menggunakan lessons[5] untuk Pelajaran 6
    const lesson6Sequences = lessons[5].sequences;
    if (!lesson6Sequences || state % 2 !== 0 || state < 0 || state >= lesson6Sequences.length * 2) {
        return [];
    }
    const index = state / 2;
    return lesson6Sequences[index];
}

export function renderLesson6(lessonInstruction, keyboardContainer, feedbackIndex = -1, isCorrect = null, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect, animateAllBordersOnCorrectInput) {
    if (!lessonInstruction) {
        console.error("renderLesson6: lessonInstruction tidak ditemukan.");
        return;
    }
    const lesson6State = getState('lesson6State');
    const lesson6SequenceIndex = getState('lesson6SequenceIndex');

    if (!lesson6SequenceContainer || !lessonInstruction.contains(lesson6SequenceContainer)) {
        lesson6SequenceContainer = document.createElement('div');
        lesson6SequenceContainer.classList.add('lesson-keyboard-sequence');
        lessonInstruction.prepend(lesson6SequenceContainer);
    }
    if (!lesson6UnderlineContainer || !lessonInstruction.contains(lesson6UnderlineContainer)) {
        lesson6UnderlineContainer = document.createElement('div');
        lesson6UnderlineContainer.classList.add('lesson-keyboard-underline');
        lessonInstruction.appendChild(lesson6UnderlineContainer);
    }

    const sequence = getSequenceForState(lesson6State);
    const highlightedKey = sequence[lesson6SequenceIndex];

    // ✅ Menggunakan lessons[5] untuk Pelajaran 6
    const totalSequences = lessons[5].sequences.length;
    if (lesson6State % 2 !== 0 && lesson6State < totalSequences * 2) {
        handleTransitionState();
    } else if (lesson6State < totalSequences * 2) {
        handleActiveState(sequence, lesson6SequenceIndex, highlightedKey, keyboardContainer, setAnimatingKey, renderHandVisualizer);
        applyFeedback(feedbackIndex, isCorrect);
    } else {
        cleanupLesson6Elements(lessonInstruction);
    }
}

function handleTransitionState() {
    if (lesson6SequenceContainer) {
        Array.from(lesson6SequenceContainer.children).forEach(keyEl => {
            keyEl.classList.remove('active', 'slide-down-fade-in', 'no-initial-animation', 'completed-correct', 'input-incorrect', 'wrong-input-overlay');
            keyEl.classList.add('slide-up-fade-out');
            void keyEl.offsetWidth;
            keyEl.addEventListener('animationend', () => keyEl.remove(), { once: true });
        });
    }
    if (lesson6UnderlineContainer) {
        lesson6UnderlineContainer.innerHTML = '';
    }
}

function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, setAnimatingKey, renderHandVisualizer) {
    if (!lesson6SequenceContainer || !lesson6UnderlineContainer) return;

    const currentKeys = Array.from(lesson6SequenceContainer.children).map(el => el.textContent).join('');
    const requiresRebuild = keysToDisplay.join('') !== currentKeys;
    
    if (requiresRebuild) {
        lesson6SequenceContainer.innerHTML = '';
        lesson6UnderlineContainer.innerHTML = '';
        keysToDisplay.forEach((keyChar, idx) => {
            const keyEl = document.createElement('span');
            keyEl.classList.add('lesson-keyboard-key', 'slide-down-fade-in');
            keyEl.textContent = keyChar;
            lesson6SequenceContainer.appendChild(keyEl);
            const underlineEl = document.createElement('span');
            underlineEl.classList.add('lesson-keyboard-underline-item');
            lesson6UnderlineContainer.appendChild(underlineEl);
        });
    }
    
    const keyElements = lesson6SequenceContainer.children;
    for (let i = 0; i < keyElements.length; i++) {
        if (i < activeIndex) {
            keyElements[i].classList.add('completed-correct');
            keyElements[i].classList.remove('active', 'wrong-input-overlay');
        } else if (i === activeIndex) {
            keyElements[i].classList.add('active');
            keyElements[i].classList.remove('completed-correct', 'wrong-input-overlay');
        } else {
            keyElements[i].classList.remove('active', 'completed-correct', 'wrong-input-overlay');
        }
    }
    
    updateUnderlineStatus(lesson6SequenceContainer, lesson6UnderlineContainer, activeIndex);
    clearKeyboardHighlights(keyboardContainer);
    if (highlightedKey) {
        highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
        if (setAnimatingKey) setAnimatingKey(keyboardContainer.querySelector(`[data-key="${highlightedKey.toLowerCase()}"]`));
        if (renderHandVisualizer) renderHandVisualizer(highlightedKey);
    }
}

function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null || !lesson6SequenceContainer) return;
    const keyElements = lesson6SequenceContainer.children;
    if (keyElements[feedbackIndex]) {
        keyElements[feedbackIndex].classList.remove('input-incorrect');
        if (!isCorrect) {
            keyElements[feedbackIndex].classList.add('input-incorrect');
            setTimeout(() => {
                if (keyElements[feedbackIndex]) {
                    keyElements[feedbackIndex].classList.remove('input-incorrect');
                }
            }, 200);
        }
    }
}

function clearWrongInputFeedback() {
    if (wrongInputState.el) {
        clearTimeout(wrongInputState.timeoutId);
        wrongInputState.el.textContent = wrongInputState.originalText;
        wrongInputState.el.classList.remove('wrong-input-overlay');
        wrongInputState = { el: null, originalText: '', timeoutId: null };
    }
}

export function cleanupLesson6Elements(lessonInstruction) {
    if (lesson6SequenceContainer && lesson6SequenceContainer.parentNode) {
        lesson6SequenceContainer.remove();
        lesson6SequenceContainer = null;
    }
    if (lesson6UnderlineContainer && lesson6UnderlineContainer.parentNode) {
        lesson6UnderlineContainer.remove();
        lesson6UnderlineContainer = null;
    }
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.remove();
        }
    });
}

export function handleLesson6Input({ e, doRenderAndHighlight, dispatchLesson6FinishedEvent, lessonInstructionEl, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, animateJellyEffect, animateAllBordersOnCorrectInput }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }
    let lesson6State = getState('lesson6State');
    let lesson6SequenceIndex = getState('lesson6SequenceIndex');

    const totalSequences = lessons[5].sequences.length;
    if (lesson6State % 2 === 0 && lesson6State < totalSequences * 2) {
        const sequence = getSequenceForState(lesson6State);
        const expectedKey = sequence[lesson6SequenceIndex];
        const correctKeyEl = lesson6SequenceContainer ? lesson6SequenceContainer.children[lesson6SequenceIndex] : null;

        if (e.key.toLowerCase() === expectedKey) {
            clearWrongInputFeedback();
            
            const nextSequenceIndex = lesson6SequenceIndex + 1;
            const isSequenceComplete = nextSequenceIndex >= sequence.length;

            const keyElement = keyboardContainer.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
            if (keyElement) {
                if (animateJellyEffect) {
                    const onAnimationEnd = () => {
                        if (isSequenceComplete && getState('lesson6State') >= totalSequences * 2) {
                            dispatchLesson6FinishedEvent(new Event('lesson6-finished'));
                        }
                    };
                    animateJellyEffect(keyElement, onAnimationEnd);
                }
            } else {
                if (isSequenceComplete && getState('lesson6State') >= totalSequences * 2) {
                    dispatchLesson6FinishedEvent(new Event('lesson6-finished'));
                }
            }

            if (animateAllBordersOnCorrectInput) {
                animateAllBordersOnCorrectInput(lesson6SequenceContainer);
            }

            if (setAnimationSpeed) {
                setAnimationSpeed(15);
                setIsCorrectInputAnimationActive(true);
                setTimeout(() => {
                    setAnimationSpeed(3);
                    setIsCorrectInputAnimationActive(false);
                }, 50);
            }
            
            if (isSequenceComplete) {
                updateState('lesson6SequenceIndex', 0);
                updateState('lesson6State', lesson6State + 2);
            } else {
                updateState('lesson6SequenceIndex', nextSequenceIndex);
            }

            const currentLessonIndex = getState('currentLessonIndex');
            const progress = calculateLessonProgress(lessons[currentLessonIndex]);
            updateProgressBar(progress);
            
            doRenderAndHighlight();

        } else {
            let feedbackIndex = lesson6SequenceIndex;
            let isCorrect = false;

            if (correctKeyEl) {
                clearWrongInputFeedback();
                wrongInputState.el = correctKeyEl;
                wrongInputState.originalText = correctKeyEl.textContent;
                const displayKey = e.key === ' ' ? '\u00A0' : e.key;
                correctKeyEl.textContent = displayKey;
                correctKeyEl.classList.add('wrong-input-overlay');
                wrongInputState.timeoutId = setTimeout(() => {
                    if (wrongInputState.el === correctKeyEl) {
                        correctKeyEl.textContent = wrongInputState.originalText;
                        correctKeyEl.classList.remove('wrong-input-overlay');
                        wrongInputState = { el: null, originalText: '', timeoutId: null };
                    }
                }, 200);
            }

            applyFeedback(feedbackIndex, isCorrect);
            highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
            
            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    }
}