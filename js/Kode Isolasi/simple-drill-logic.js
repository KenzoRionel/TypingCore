// js/simple-drill-logic.js

import { getState, updateState } from './learn-typing-state.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard, highlightWrongKeyOnKeyboard, clearKeyboardHighlights, animateJellyEffect, animateAllBordersOnCorrectInput } from './learn-typing-ui.js';
import { setIsCorrectInputAnimationActive } from './learn-typing.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';
import { getDOMReferences } from './dom-elements.js';

let sequenceContainer = null;
let underlineContainer = null;

let wrongInputState = {
    el: null,
    originalText: '',
    timeoutId: null
};

function animateDrillBorders(container) {
    if (!container) return;
    const allTypingChars = container.querySelectorAll('.lesson-keyboard-key');
    allTypingChars.forEach(charEl => {
        charEl.classList.add('correct-input-border');
    });

    setTimeout(() => {
        allTypingChars.forEach(charEl => {
            charEl.classList.remove('correct-input-border');
        });
    }, 500);
}

function getSequenceForState(lessonData, state) {
    if (!lessonData || !lessonData.sequences || state % 2 !== 0 || state < 0 || state >= lessonData.sequences.length * 2) {
        return [];
    }
    const index = state / 2;
    return lessonData.sequences[index];
}

function handleTransitionState(container) {
    if (container) {
        Array.from(container.children).forEach(keyEl => {
            keyEl.classList.remove('active', 'slide-down-fade-in', 'no-initial-animation', 'completed-correct', 'input-incorrect', 'wrong-input-overlay');
            keyEl.classList.add('slide-up-fade-out');
            void keyEl.offsetWidth;
            keyEl.addEventListener('animationend', () => keyEl.remove(), { once: true });
        });
    }
    if (underlineContainer) {
        underlineContainer.innerHTML = '';
    }
}

function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, setAnimatingKey, renderHandVisualizer) {
    if (!sequenceContainer || !underlineContainer) return;
    
    const currentDisplayedSequence = Array.from(sequenceContainer.children).map(el => el.textContent === '\u00A0' ? ' ' : el.textContent).join('');
    const requiresRebuild = keysToDisplay.join('') !== currentDisplayedSequence;
    
    if (requiresRebuild) {
        sequenceContainer.innerHTML = '';
        underlineContainer.innerHTML = '';
        keysToDisplay.forEach((keyChar, idx) => {
            const keyEl = document.createElement('span');
            keyEl.classList.add('lesson-keyboard-key', 'slide-down-fade-in');
            keyEl.textContent = keyChar === ' ' ? '\u00A0' : keyChar;
            sequenceContainer.appendChild(keyEl);
            const underlineEl = document.createElement('span');
            underlineEl.classList.add('lesson-keyboard-underline-item');
            underlineContainer.appendChild(underlineEl);
        });
        requestAnimationFrame(() => {
            updateUnderlineStatus(sequenceContainer, underlineContainer, activeIndex);
        });
    } else {
        updateUnderlineStatus(sequenceContainer, underlineContainer, activeIndex);
    }

    const keyElements = sequenceContainer.children;
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
    
    clearKeyboardHighlights(keyboardContainer);
    if (highlightedKey) {
        highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
        if (setAnimatingKey) setAnimatingKey(keyboardContainer.querySelector(`[data-key="${highlightedKey.toLowerCase()}"]`));
        if (renderHandVisualizer) renderHandVisualizer(highlightedKey);
    }
}

function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null || !sequenceContainer) return;
    const keyElements = sequenceContainer.children;
    if (keyElements[feedbackIndex]) {
        keyElements[feedbackIndex].classList.remove('completed-correct', 'input-incorrect');
        if (isCorrect) {
            keyElements[feedbackIndex].classList.add('completed-correct');
        } else {
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
    if (sequenceContainer && sequenceContainer.parentNode) {
        sequenceContainer.remove();
        sequenceContainer = null;
    }
    if (underlineContainer && underlineContainer.parentNode) {
        underlineContainer.remove();
        underlineContainer = null;
    }
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.remove();
        }
    });
}

export function renderSimpleDrill(lessonData, lessonInstruction, keyboardContainer, lessonState, lessonSequenceIndex, setAnimatingKey, renderHandVisualizer) {
    if (!lessonInstruction) return;

    if (!sequenceContainer || !lessonInstruction.contains(sequenceContainer)) {
        sequenceContainer = document.createElement('div');
        sequenceContainer.classList.add('lesson-keyboard-sequence');
        lessonInstruction.prepend(sequenceContainer);
    }
    if (!underlineContainer || !lessonInstruction.contains(underlineContainer)) {
        underlineContainer = document.createElement('div');
        underlineContainer.classList.add('lesson-keyboard-underline');
        lessonInstruction.appendChild(underlineContainer);
    }

    const sequence = getSequenceForState(lessonData, lessonState);
    const highlightedKey = sequence[lessonSequenceIndex];
    const totalSequences = lessonData.sequences.length;
    
    if (lessonState % 2 !== 0 && lessonState < totalSequences * 2) {
        handleTransitionState(sequenceContainer);
    } else if (lessonState < totalSequences * 2) {
        handleActiveState(sequence, lessonSequenceIndex, highlightedKey, keyboardContainer, setAnimatingKey, renderHandVisualizer);
    } else {
        cleanupSimpleDrillElements(lessonInstruction);
    }
}

export function handleSimpleDrillInput({ e, doRenderAndHighlight, dispatchLessonFinishedEvent, lessonInstructionEl, keyboardContainer, setAnimationSpeed, animateJellyEffect, animateAllBordersOnCorrectInput, lessonData, lessonState, lessonSequenceIndex, lessonStateKey, lessonSequenceIndexKey }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    const totalSequences = lessonData.sequences.length;
    if (lessonState % 2 === 0 && lessonState < totalSequences * 2) {
        const sequence = getSequenceForState(lessonData, lessonState);
        const expectedKey = sequence[lessonSequenceIndex];
        const correctKeyEl = sequenceContainer ? sequenceContainer.children[lessonSequenceIndex] : null;

        if (e.key.toLowerCase() === expectedKey.toLowerCase()) {
            clearWrongInputFeedback();
            clearKeyboardHighlights(keyboardContainer);
            
            const keyElement = keyboardContainer.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
            if (keyElement) {
                if (animateJellyEffect) {
                    animateJellyEffect(keyElement);
                }
            }

            if (sequenceContainer) {
                animateAllBordersOnCorrectInput(sequenceContainer);
            }
            
            if (setAnimationSpeed) {
                setAnimationSpeed(15);
                setIsCorrectInputAnimationActive(true);
                setTimeout(() => {
                    setAnimationSpeed(3);
                    setIsCorrectInputAnimationActive(false);
                }, 50);
            }
            
            const nextSequenceIndex = lessonSequenceIndex + 1;
            if (nextSequenceIndex >= sequence.length) {
                updateState(lessonSequenceIndexKey, 0);
                updateState(lessonStateKey, lessonState + 2);
            } else {
                updateState(lessonSequenceIndexKey, nextSequenceIndex);
            }

            const currentLessonIndex = getState('currentLessonIndex');
            const progress = calculateLessonProgress(lessonData);
            updateProgressBar(progress);

            doRenderAndHighlight();

            if (getState(lessonStateKey) >= totalSequences * 2) {
                dispatchLessonFinishedEvent(new Event('lesson-finished'));
            }
        } else {
            applyFeedback(lessonSequenceIndex, false);
            
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

            highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
            
            setTimeout(() => {
                highlightWrongKeyOnKeyboard(keyboardContainer, e.key, false);
            }, 200);

            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    }
}

export function resetSimpleDrillState() {
    const { lessonInstruction } = getDOMReferences();
    cleanupSimpleDrillElements(lessonInstruction);
}