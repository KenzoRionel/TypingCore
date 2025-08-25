// js/lesson3-logic.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard, highlightWrongKeyOnKeyboard, clearKeyboardHighlights, animateJellyEffect, animateAllBordersOnCorrectInput } from './learn-typing-ui.js';
import { setIsCorrectInputAnimationActive } from './learn-typing.js';
// PERBAIKAN: Impor fungsi progress bar
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';

let lesson3SequenceContainer = null;
let lesson3UnderlineContainer = null;

let wrongInputState = {
    el: null,
    originalText: '',
    timeoutId: null
};

// PERBAIKAN: Hapus array yang hard-coded. Data sekarang diambil dari lessons[2].sequences

export function getSequenceForState(state) {
    // PERBAIKAN: Mengambil data dari lessons[2].sequences
    const lesson3Sequences = lessons[2].sequences;
    if (!lesson3Sequences || state % 2 !== 0 || state < 0 || state >= lesson3Sequences.length * 2) {
        return [];
    }
    const index = state / 2;
    return lesson3Sequences[index];
}

export function renderLesson3(lessonInstruction, keyboardContainer, feedbackIndex = -1, isCorrect = null, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect, animateAllBordersOnCorrectInput) {
    if (!lessonInstruction) {
        console.error("renderLesson3: lessonInstruction tidak ditemukan.");
        return;
    }
    const lesson3State = getState('lesson3State');
    const lesson3SequenceIndex = getState('lesson3SequenceIndex');

    if (!lesson3SequenceContainer || !lessonInstruction.contains(lesson3SequenceContainer)) {
        lesson3SequenceContainer = document.createElement('div');
        lesson3SequenceContainer.classList.add('lesson-keyboard-sequence');
        lessonInstruction.prepend(lesson3SequenceContainer);
    }
    if (!lesson3UnderlineContainer || !lessonInstruction.contains(lesson3UnderlineContainer)) {
        lesson3UnderlineContainer = document.createElement('div');
        lesson3UnderlineContainer.classList.add('lesson-keyboard-underline');
        lessonInstruction.appendChild(lesson3UnderlineContainer);
    }
    const sequence = getSequenceForState(lesson3State);
    const highlightedKey = sequence[lesson3SequenceIndex];

    // PERBAIKAN: Mengambil total sequences dari lessons[2].sequences
    const totalSequences = lessons[2].sequences.length;
    if (lesson3State % 2 !== 0 && lesson3State < totalSequences * 2) {
        handleTransitionState();
    } else if (lesson3State < totalSequences * 2) {
        handleActiveState(sequence, lesson3SequenceIndex, highlightedKey, keyboardContainer, setAnimatingKey, renderHandVisualizer);
        applyFeedback(feedbackIndex, isCorrect);
    } else {
        cleanupLesson3Elements(lessonInstruction);
    }
}

function handleTransitionState() {
    if (lesson3SequenceContainer) {
        Array.from(lesson3SequenceContainer.children).forEach(keyEl => {
            keyEl.classList.remove('active', 'slide-down-fade-in', 'no-initial-animation', 'completed-correct', 'input-incorrect', 'wrong-input-overlay');
            keyEl.classList.add('slide-up-fade-out');
            void keyEl.offsetWidth;
            keyEl.addEventListener('animationend', () => keyEl.remove(), { once: true });
        });
    }
    if (lesson3UnderlineContainer) {
        lesson3UnderlineContainer.innerHTML = '';
    }
}

function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, setAnimatingKey, renderHandVisualizer) {
    if (!lesson3SequenceContainer || !lesson3UnderlineContainer) return;
    const currentDisplayedSequence = Array.from(lesson3SequenceContainer.children).map(el => el.textContent === '\u00A0' ? ' ' : el.textContent).join('');
    const requiresRebuild = keysToDisplay.join('') !== currentDisplayedSequence;
    if (requiresRebuild) {
        lesson3SequenceContainer.innerHTML = '';
        lesson3UnderlineContainer.innerHTML = '';
        keysToDisplay.forEach((keyChar, idx) => {
            const keyEl = document.createElement('span');
            keyEl.classList.add('lesson-keyboard-key', 'slide-down-fade-in');
            keyEl.textContent = keyChar === ' ' ? '\u00A0' : keyChar;
            lesson3SequenceContainer.appendChild(keyEl);
            const underlineEl = document.createElement('span');
            underlineEl.classList.add('lesson-keyboard-underline-item');
            lesson3UnderlineContainer.appendChild(underlineEl);
        });
        requestAnimationFrame(() => {
            updateUnderlineStatus(lesson3SequenceContainer, lesson3UnderlineContainer, activeIndex);
        });
    } else {
        updateUnderlineStatus(lesson3SequenceContainer, lesson3UnderlineContainer, activeIndex);
    }

    const keyElements = lesson3SequenceContainer.children;
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
    if (feedbackIndex < 0 || isCorrect === null || !lesson3SequenceContainer) return;
    const keyElements = lesson3SequenceContainer.children;
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

export function cleanupLesson3Elements(lessonInstruction) {
    if (lesson3SequenceContainer && lesson3SequenceContainer.parentNode) {
        lesson3SequenceContainer.remove();
        lesson3SequenceContainer = null;
    }
    if (lesson3UnderlineContainer && lesson3UnderlineContainer.parentNode) {
        lesson3UnderlineContainer.remove();
        lesson3UnderlineContainer = null;
    }
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.remove();
        }
    });
}

export function handleLesson3Input({ e, doRenderAndHighlight, dispatchLesson3FinishedEvent, lessonInstructionEl, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, animateJellyEffect, animateAllBordersOnCorrectInput }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }
    let lesson3State = getState('lesson3State');
    let lesson3SequenceIndex = getState('lesson3SequenceIndex');

    // PERBAIKAN: Ambil total sequences dari lessons[2].sequences
    const totalSequences = lessons[2].sequences.length;
    if (lesson3State % 2 === 0 && lesson3State < totalSequences * 2) {
        const sequence = getSequenceForState(lesson3State);
        const expectedKey = sequence[lesson3SequenceIndex];
        const correctKeyEl = lesson3SequenceContainer ? lesson3SequenceContainer.children[lesson3SequenceIndex] : null;

        if (e.key.toLowerCase() === expectedKey.toLowerCase()) {
            clearWrongInputFeedback();
            clearKeyboardHighlights(keyboardContainer);
            
            const keyElement = keyboardContainer.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
            if (keyElement) {
                if (animateJellyEffect) {
                    animateJellyEffect(keyElement);
                }
            }

            if (animateAllBordersOnCorrectInput) {
                animateAllBordersOnCorrectInput(lesson3SequenceContainer);
            }
            
            if (setAnimationSpeed) {
                setAnimationSpeed(15);
                setIsCorrectInputAnimationActive(true);
                setTimeout(() => {
                    setAnimationSpeed(3);
                    setIsCorrectInputAnimationActive(false);
                }, 50);
            }
            
            const nextSequenceIndex = lesson3SequenceIndex + 1;
            if (nextSequenceIndex >= sequence.length) {
                updateState('lesson3SequenceIndex', 0);
                updateState('lesson3State', lesson3State + 2);
            } else {
                updateState('lesson3SequenceIndex', nextSequenceIndex);
            }

            // PERBAIKAN: Panggil calculateLessonProgress dengan argumen yang benar
            const currentLessonIndex = getState('currentLessonIndex');
            const progress = calculateLessonProgress(lessons[currentLessonIndex]);
            updateProgressBar(progress);

            doRenderAndHighlight();

            if (getState('lesson3State') >= totalSequences * 2) {
                dispatchLesson3FinishedEvent(new Event('lesson3-finished'));
            }
        } else {
            applyFeedback(lesson3SequenceIndex, false);
            
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