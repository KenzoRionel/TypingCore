// js/lesson-simple-drill.js
import { lessons } from './learn-typing-lessons.js';
import { getState, updateState, initializeLessonState } from './learn-typing-state.js';
import {
    highlightKeyOnKeyboard,
    clearKeyboardHighlights,
    highlightWrongKeyOnKeyboard,
    animateAllBordersOnCorrectInput,
    setAnimatingKey,
    clearAnimation
} from './learn-typing-ui.js';

import { renderHandVisualizer } from './hand-visualizer.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';
import { dispatchFinishedEvent, renderLesson } from './learn-typing-logic.js';
import { updateUnderlineStatus } from './underline-logic.js';

let lessonSequenceContainer = null;
let lessonUnderlineContainer = null;
let wrongInputState = { el: null, originalText: '', timeoutId: null };

function getSequenceForState(lessonIndex, sequenceIndex) {
    const lesson = lessons[lessonIndex];
    if (!lesson || !lesson.sequences || sequenceIndex < 0 || sequenceIndex >= lesson.sequences.length) {
        return null;
    }
    const index = Math.floor(sequenceIndex);
    return lesson.sequences[index];
}

function handleTransitionState(callback) {
    if (lessonSequenceContainer) {
        let completedAnimations = 0;
        const totalElements = lessonSequenceContainer.children.length;

        if (totalElements === 0) {
            if (callback) callback();
            return;
        }

        Array.from(lessonSequenceContainer.children).forEach(keyEl => {
            keyEl.classList.remove('active', 'slide-down-fade-in', 'no-initial-animation', 'completed-correct', 'input-incorrect', 'wrong-input-overlay');
            keyEl.classList.add('slide-up-fade-out');
            keyEl.addEventListener('animationend', () => {
                keyEl.remove();
                completedAnimations++;
                if (completedAnimations === totalElements) {
                    if (lessonUnderlineContainer) {
                        lessonUnderlineContainer.innerHTML = '';
                    }
                    if (callback) callback();
                }
            }, { once: true });
        });
    }
}

function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer) {
    if (!lessonSequenceContainer || !lessonUnderlineContainer) return;

    const currentKeys = Array.from(lessonSequenceContainer.children).map(el => el.textContent).join('');
    const requiresRebuild = keysToDisplay.join('') !== currentKeys;

    if (requiresRebuild) {
        lessonSequenceContainer.innerHTML = '';
        lessonUnderlineContainer.innerHTML = '';
        keysToDisplay.forEach((keyChar) => {
            const keyEl = document.createElement('span');
            keyEl.classList.add('lesson-keyboard-key', 'slide-down-fade-in');
            keyEl.textContent = keyChar;
            lessonSequenceContainer.appendChild(keyEl);
            const underlineEl = document.createElement('span');
            underlineEl.classList.add('lesson-keyboard-underline-item');
            lessonUnderlineContainer.appendChild(underlineEl);
        });
    }

    const keyElements = lessonSequenceContainer.children;
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

    updateUnderlineStatus(lessonSequenceContainer, lessonUnderlineContainer, activeIndex);
    clearKeyboardHighlights(keyboardContainer);
    if (highlightedKey) {
        highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
        setAnimatingKey(keyboardContainer.querySelector(`[data-key="${highlightedKey.toLowerCase()}"]`));
        window.requestAnimationFrame(() => {
            renderHandVisualizer(highlightedKey);
        });
    }
}

function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null || !lessonSequenceContainer) return;
    const keyElements = lessonSequenceContainer.children;
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

export function cleanupSimpleDrillElements(lessonInstruction) {
    if (lessonSequenceContainer && lessonSequenceContainer.parentNode) {
        lessonSequenceContainer.remove();
        lessonSequenceContainer = null;
    }
    if (lessonUnderlineContainer && lessonUnderlineContainer.parentNode) {
        lessonUnderlineContainer.remove();
        lessonUnderlineContainer = null;
    }
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.remove();
        }
    });
}

export function renderSimpleDrillLesson(lessonIndex, lessonInstruction, keyboardContainer) {
    if (!lessonInstruction) {
        console.error("renderSimpleDrillLesson: lessonInstruction tidak ditemukan.");
        return;
    }
    
    const lessonId = `lesson${lessonIndex + 1}`;
    const lessonState = getState(lessonId) || { sequenceIndex: 0, finished: false };
    
    if (!lessonSequenceContainer || !lessonInstruction.contains(lessonSequenceContainer)) {
        lessonInstruction.innerHTML = '';
        lessonSequenceContainer = document.createElement('div');
        lessonSequenceContainer.classList.add('lesson-keyboard-sequence');
        lessonInstruction.prepend(lessonSequenceContainer);
    }
    if (!lessonUnderlineContainer || !lessonInstruction.contains(lessonUnderlineContainer)) {
        lessonUnderlineContainer = document.createElement('div');
        lessonUnderlineContainer.classList.add('lesson-keyboard-underline');
        lessonInstruction.appendChild(lessonUnderlineContainer);
    }

    const totalSequences = lessons[lessonIndex].sequences.length;
    if (lessonState.sequenceIndex < totalSequences) {
        const sequence = getSequenceForState(lessonIndex, lessonState.sequenceIndex);
        const nextCharIndex = lessonState.nextCharIndex || 0;
        const highlightedKey = sequence[nextCharIndex];
        handleActiveState(sequence, nextCharIndex, highlightedKey, keyboardContainer);
    } else {
        cleanupSimpleDrillElements(lessonInstruction);
    }
}

export function handleSimpleDrillInput({ e, domElements, animationFunctions, currentLessonIndex }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    const lessonId = `lesson${currentLessonIndex + 1}`;
    let lessonState = getState(lessonId);

    if (!lessonState) {
        lessonState = { sequenceIndex: 0, nextCharIndex: 0, finished: false };
        initializeLessonState(lessonId, lessonState);
    }
    
    const totalSequences = lessons[currentLessonIndex].sequences.length;
    if (lessonState.sequenceIndex >= totalSequences) return;
    
    const sequence = getSequenceForState(currentLessonIndex, lessonState.sequenceIndex);
    
    if (!sequence) {
        console.error('Data urutan pelajaran tidak valid atau tidak ditemukan.');
        return;
    }
    
    const nextCharIndex = lessonState.nextCharIndex || 0;
    const expectedKey = sequence[nextCharIndex];
    
    if (!expectedKey) {
        console.error('Karakter yang diharapkan tidak ditemukan. Membatalkan input.');
        return;
    }

    const correctKeyEl = lessonSequenceContainer ? lessonSequenceContainer.children[nextCharIndex] : null;

    if (e.key.toLowerCase() === expectedKey.toLowerCase()) {
        clearWrongInputFeedback();
        
        const keyboardKeyEl = domElements.keyboardContainer.querySelector(`[data-key="${expectedKey.toLowerCase()}"]`);

        if (keyboardKeyEl && animationFunctions?.animateJellyEffect) {
            animationFunctions.animateJellyEffect(keyboardKeyEl);
        }
        
        if (animationFunctions?.setAnimationSpeed) {
            animationFunctions.setAnimationSpeed(15);
            animationFunctions.setIsCorrectInputAnimationActive(true);
            setTimeout(() => {
                animationFunctions.setIsCorrectInputAnimationActive(false);
            }, 50);
        }

        const nextIndex = nextCharIndex + 1;
        const isSequenceComplete = nextIndex >= sequence.length;

        if (isSequenceComplete) {
            lessonState.sequenceIndex += 1;
            lessonState.nextCharIndex = 0;
        } else {
            lessonState.nextCharIndex = nextIndex;
        }
        updateState(lessonId, lessonState);
        
        if (lessonSequenceContainer) {
            animateAllBordersOnCorrectInput(lessonSequenceContainer);
        }
        
        setTimeout(() => {
            if (isSequenceComplete && lessonState.sequenceIndex < totalSequences) {
                handleTransitionState(() => {
                    renderLesson();
                });
            } else if (lessonState.sequenceIndex >= totalSequences) {
                dispatchFinishedEvent(currentLessonIndex);
            } else {
                renderSimpleDrillLesson(currentLessonIndex, domElements.lessonInstruction, domElements.keyboardContainer);
            }
        }, 100);

        const progress = calculateLessonProgress(lessons[currentLessonIndex]);
        updateProgressBar(progress, domElements.progressText, domElements.progressBar);
        
    } else {
        const feedbackIndex = lessonState.nextCharIndex;
        const isCorrect = false;

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
        highlightWrongKeyOnKeyboard(domElements.keyboardContainer, e.key);

        if (domElements.lessonInstruction) {
            domElements.lessonInstruction.classList.add('error-shake');
            setTimeout(() => domElements.lessonInstruction.classList.remove('error-shake'), 200);
        }
    }
}