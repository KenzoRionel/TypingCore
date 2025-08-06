// lesson3-logic.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard, highlightWrongKeyOnKeyboard, clearKeyboardHighlights } from './learn-typing-ui.js';

let lesson3SequenceContainer = null;
let lesson3UnderlineContainer = null;
const lesson3Sequences = [
    ['f', ' ', 'f', ' ', 'j', ' ', 'j'],
    [' ', 'f', 'f', ' ', ' ', 'f', 'f'],
    ['j', 'j', ' ', 'j', 'j', ' ', 'f'],
    ['j', ' ', 'j', 'f', ' ', 'f', 'f'],
    [' ', 'j', 'j', ' ', ' ', 'j', 'j'],
    ['f', 'f', ' ', ' ', 'f', 'f', ' '],
];

export function getSequenceForState(state) {
    if (state % 2 !== 0 || state < 0 || state >= lesson3Sequences.length * 2) {
        return [];
    }
    const index = state / 2;
    return lesson3Sequences[index];
}

// PERBAIKAN: Tambahkan parameter setAnimatingKey dan renderHandVisualizer
export function renderLesson3(lessonInstruction, keyboardContainer, feedbackIndex = -1, isCorrect = null, setAnimatingKey, renderHandVisualizer, clearAnimation) {
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
    if (lesson3State % 2 !== 0 && lesson3State < lesson3Sequences.length * 2) {
        handleTransitionState();
    } else if (lesson3State < lesson3Sequences.length * 2) {
        // PERBAIKAN: Meneruskan parameter
        handleActiveState(sequence, lesson3SequenceIndex, highlightedKey, keyboardContainer, feedbackIndex, isCorrect, setAnimatingKey, renderHandVisualizer, clearAnimation);
    } else {
        cleanupLesson3Elements(lessonInstruction);
    }
}

function handleTransitionState() {
    if (lesson3SequenceContainer) {
        Array.from(lesson3SequenceContainer.children).forEach(keyEl => {
            keyEl.classList.remove('active', 'slide-down-fade-in', 'no-initial-animation', 'completed-correct', 'input-incorrect');
            keyEl.classList.add('slide-up-fade-out');
            void keyEl.offsetWidth;
            keyEl.addEventListener('animationend', () => keyEl.remove(), { once: true });
        });
    }
    if (lesson3UnderlineContainer) {
        lesson3UnderlineContainer.innerHTML = '';
    }
}

// PERBAIKAN: Tambahkan parameter setAnimatingKey, renderHandVisualizer, dan clearAnimation
function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex = -1, isCorrect = null, setAnimatingKey, renderHandVisualizer, clearAnimation) {
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
    applyFeedback(feedbackIndex, isCorrect);
    
    // PERBAIKAN: Selalu bersihkan animasi sebelum memulai yang baru
    if (clearAnimation) {
        clearAnimation();
    }
    clearKeyboardHighlights(keyboardContainer);

    if (highlightedKey) {
        const keyElement = keyboardContainer.querySelector(`.key[data-key="${highlightedKey.toLowerCase()}"]`);
        if (keyElement && setAnimatingKey) {
            setAnimatingKey(keyElement);
        }
        if (renderHandVisualizer) {
            renderHandVisualizer(highlightedKey);
        }
        highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
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
            }, 500);
        }
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

// PERBAIKAN: Tambahkan parameter setAnimationSpeed, setAnimatingKey, dan renderHandVisualizer
export function handleLesson3Input({ e, doRenderAndHighlight, dispatchLesson3FinishedEvent, lessonInstructionEl, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }
    let isCorrect = false;
    let feedbackIndex = -1;
    let lesson3State = getState('lesson3State');
    let lesson3SequenceIndex = getState('lesson3SequenceIndex');

    if (lesson3State % 2 === 0 && lesson3State < lesson3Sequences.length * 2) {
        const sequence = getSequenceForState(lesson3State);
        const expectedKey = sequence[lesson3SequenceIndex];

        if (e.key.toLowerCase() === expectedKey.toLowerCase()) {
            // PERBAIKAN: Kode perubahan kecepatan (setAnimationSpeed)
            if (setAnimationSpeed) {
                setAnimationSpeed(15);
                setTimeout(() => setAnimationSpeed(defaultAnimationSpeed), 100);

            }

            isCorrect = true;
            feedbackIndex = lesson3SequenceIndex;
            updateState('lesson3SequenceIndex', lesson3SequenceIndex + 1);
            
            // PERBAIKAN: Panggil clearAnimation di sini sebelum merender ulang
            if (clearAnimation) {
                clearAnimation();
            }

            if (getState('lesson3SequenceIndex') >= sequence.length) {
                updateState('lesson3SequenceIndex', 0);
                updateState('lesson3State', lesson3State + 2);
                doRenderAndHighlight();
            } else {
                doRenderAndHighlight(feedbackIndex, isCorrect);
            }
            if (getState('lesson3State') >= lesson3Sequences.length * 2) {
                dispatchLesson3FinishedEvent(new Event('lesson3-finished'));
            }
        } else {
            feedbackIndex = lesson3SequenceIndex;
            isCorrect = false;
            highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    }
}