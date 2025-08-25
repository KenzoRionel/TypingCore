// js/lesson2-logic.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard, highlightWrongKeyOnKeyboard, clearKeyboardHighlights, animateJellyEffect, animateAllBordersOnCorrectInput } from './learn-typing-ui.js';
import { setIsCorrectInputAnimationActive } from './learn-typing.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';

let lesson2SequenceContainer = null;
let lesson2UnderlineContainer = null;

let wrongInputState = {
    el: null,
    originalText: '',
    timeoutId: null
};

export function getSequenceForState(state) {
    const lesson2Sequences = lessons[1].sequences;
    if (!lesson2Sequences || state % 2 !== 0 || state < 0 || state >= lesson2Sequences.length * 2) {
        return [];
    }
    const index = state / 2;
    return lesson2Sequences[index];
}

export function renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex = -1, isCorrect = null, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect, animateAllBordersOnCorrectInput) {
    if (!lessonInstruction) {
        console.error("renderLesson2: lessonInstruction tidak ditemukan.");
        return;
    }
    const lesson2State = getState('lesson2State');
    const lesson2SequenceIndex = getState('lesson2SequenceIndex');

    if (!lesson2SequenceContainer || !lessonInstruction.contains(lesson2SequenceContainer)) {
        lesson2SequenceContainer = document.createElement('div');
        lesson2SequenceContainer.classList.add('lesson-keyboard-sequence');
        lessonInstruction.prepend(lesson2SequenceContainer);
    }
    if (!lesson2UnderlineContainer || !lessonInstruction.contains(lesson2UnderlineContainer)) {
        lesson2UnderlineContainer = document.createElement('div');
        lesson2UnderlineContainer.classList.add('lesson-keyboard-underline');
        lessonInstruction.appendChild(lesson2UnderlineContainer);
    }

    const sequence = getSequenceForState(lesson2State);
    const highlightedKey = sequence[lesson2SequenceIndex];

    const totalSequences = lessons[1].sequences.length;
    if (lesson2State % 2 !== 0 && lesson2State < totalSequences * 2) {
        handleTransitionState();
    } else if (lesson2State < totalSequences * 2) {
        handleActiveState(sequence, lesson2SequenceIndex, highlightedKey, keyboardContainer, setAnimatingKey, renderHandVisualizer);
        applyFeedback(feedbackIndex, isCorrect);
    } else {
        cleanupLesson2Elements(lessonInstruction);
    }
}

function handleTransitionState() {
    if (lesson2SequenceContainer) {
        Array.from(lesson2SequenceContainer.children).forEach(keyEl => {
            keyEl.classList.remove('active', 'slide-down-fade-in', 'no-initial-animation', 'completed-correct', 'input-incorrect', 'wrong-input-overlay');
            keyEl.classList.add('slide-up-fade-out');
            void keyEl.offsetWidth;
            keyEl.addEventListener('animationend', () => keyEl.remove(), { once: true });
        });
    }
    if (lesson2UnderlineContainer) {
        lesson2UnderlineContainer.innerHTML = '';
    }
}

function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, setAnimatingKey, renderHandVisualizer) {
    if (!lesson2SequenceContainer || !lesson2UnderlineContainer) return;

    const currentKeys = Array.from(lesson2SequenceContainer.children).map(el => el.textContent).join('');
    const requiresRebuild = keysToDisplay.join('') !== currentKeys;
    
    if (requiresRebuild) {
        lesson2SequenceContainer.innerHTML = '';
        lesson2UnderlineContainer.innerHTML = '';
        keysToDisplay.forEach((keyChar, idx) => {
            const keyEl = document.createElement('span');
            keyEl.classList.add('lesson-keyboard-key', 'slide-down-fade-in');
            keyEl.textContent = keyChar;
            lesson2SequenceContainer.appendChild(keyEl);
            const underlineEl = document.createElement('span');
            underlineEl.classList.add('lesson-keyboard-underline-item');
            lesson2UnderlineContainer.appendChild(underlineEl);
        });
    }
    
    const keyElements = lesson2SequenceContainer.children;
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
    
    updateUnderlineStatus(lesson2SequenceContainer, lesson2UnderlineContainer, activeIndex);
    clearKeyboardHighlights(keyboardContainer);
    if (highlightedKey) {
        highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
        if (setAnimatingKey) setAnimatingKey(keyboardContainer.querySelector(`[data-key="${highlightedKey.toLowerCase()}"]`));
        if (renderHandVisualizer) renderHandVisualizer(highlightedKey);
    }
}

function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null || !lesson2SequenceContainer) return;
    const keyElements = lesson2SequenceContainer.children;
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

export function cleanupLesson2Elements(lessonInstruction) {
    if (lesson2SequenceContainer && lesson2SequenceContainer.parentNode) {
        lesson2SequenceContainer.remove();
        lesson2SequenceContainer = null;
    }
    if (lesson2UnderlineContainer && lesson2UnderlineContainer.parentNode) {
        lesson2UnderlineContainer.remove();
        lesson2UnderlineContainer = null;
    }
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.remove();
        }
    });
}

export function handleLesson2Input({ e, doRenderAndHighlight, dispatchLesson2FinishedEvent, lessonInstructionEl, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, animateJellyEffect, animateAllBordersOnCorrectInput }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }
    let lesson2State = getState('lesson2State');
    let lesson2SequenceIndex = getState('lesson2SequenceIndex');

    const totalSequences = lessons[1].sequences.length;
    if (lesson2State % 2 === 0 && lesson2State < totalSequences * 2) {
        const sequence = getSequenceForState(lesson2State);
        const expectedKey = sequence[lesson2SequenceIndex];
        const correctKeyEl = lesson2SequenceContainer ? lesson2SequenceContainer.children[lesson2SequenceIndex] : null;

        if (e.key.toLowerCase() === expectedKey) {
            clearWrongInputFeedback();
            
            const nextSequenceIndex = lesson2SequenceIndex + 1;
            const isSequenceComplete = nextSequenceIndex >= sequence.length;

            const keyElement = keyboardContainer.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
            if (keyElement) {
                if (animateJellyEffect) {
                    const onAnimationEnd = () => {
                        if (isSequenceComplete && getState('lesson2State') >= totalSequences * 2) {
                            dispatchLesson2FinishedEvent(new Event('lesson2-finished'));
                        }
                    };
                    animateJellyEffect(keyElement, onAnimationEnd);
                }
            } else {
                if (isSequenceComplete && getState('lesson2State') >= totalSequences * 2) {
                    dispatchLesson2FinishedEvent(new Event('lesson2-finished'));
                }
            }

            if (animateAllBordersOnCorrectInput) {
                animateAllBordersOnCorrectInput(lesson2SequenceContainer);
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
                updateState('lesson2SequenceIndex', 0);
                updateState('lesson2State', lesson2State + 2);
            } else {
                updateState('lesson2SequenceIndex', nextSequenceIndex);
            }

            const currentLessonIndex = getState('currentLessonIndex');
            const progress = calculateLessonProgress(lessons[currentLessonIndex]);
            updateProgressBar(progress);
            
            doRenderAndHighlight();

        } else {
            let feedbackIndex = lesson2SequenceIndex;
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