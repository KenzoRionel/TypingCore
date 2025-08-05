// lesson2-logic.js
import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard } from './learn-typing-ui.js';

let lesson2SequenceContainer = null;
let lesson2UnderlineContainer = null;

const lesson2Sequences = [
    ['f', 'f', 'f', 'f', 'j', 'j'],
    ['j', 'j', 'f', 'f', 'f', 'f'],
    ['j', 'j', 'j', 'j', 'f', 'f'],
    ['j', 'j', 'f', 'f', 'j', 'j'],
    ['f', 'j', 'f', 'j', 'j', 'f'],
    ['j', 'f', 'f', 'j', 'f', 'j'],
];

export function getSequenceForState(state) {
    if (state % 2 !== 0 || state < 0 || state >= lesson2Sequences.length * 2) {
        return [];
    }
    const index = state / 2;
    return lesson2Sequences[index];
}

export function renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex = -1, isCorrect = null) {
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

    if (lesson2State % 2 !== 0 && lesson2State < 12) {
        handleTransitionState();
    } else if (lesson2State < 12) {
        handleActiveState(sequence, lesson2SequenceIndex, highlightedKey, keyboardContainer, feedbackIndex, isCorrect);
    } else {
        cleanupLesson2Elements(lessonInstruction);
    }
}

function handleTransitionState() {
    if (lesson2SequenceContainer) {
        Array.from(lesson2SequenceContainer.children).forEach(keyEl => {
            keyEl.classList.remove('active', 'slide-down-fade-in', 'no-initial-animation', 'completed-correct', 'input-incorrect');
            keyEl.classList.add('slide-up-fade-out');
            void keyEl.offsetWidth;
            keyEl.addEventListener('animationend', () => keyEl.remove(), { once: true });
        });
    }
    if (lesson2UnderlineContainer) {
        lesson2UnderlineContainer.innerHTML = '';
    }
}

function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex = -1, isCorrect = null) {
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
        
        requestAnimationFrame(() => {
            updateUnderlineStatus(lesson2SequenceContainer, lesson2UnderlineContainer, activeIndex);
        });
    } else {
        updateUnderlineStatus(lesson2SequenceContainer, lesson2UnderlineContainer, activeIndex);
    }
    
    applyFeedback(feedbackIndex, isCorrect);
    if (highlightedKey) {
        highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
    }
}

function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null || !lesson2SequenceContainer) return;
    const keyElements = lesson2SequenceContainer.children;
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

export function handleLesson2Input({ e, doRenderAndHighlight, dispatchLesson2FinishedEvent, lessonInstructionEl }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    let feedbackIndex = -1;
    let isCorrect = false;

    let lesson2State = getState('lesson2State');
    let lesson2SequenceIndex = getState('lesson2SequenceIndex');

    if (lesson2State % 2 === 0 && lesson2State < 12) {
        const sequence = getSequenceForState(lesson2State);
        const expectedKey = sequence[lesson2SequenceIndex];

        if (e.key.toLowerCase() === expectedKey) {
            isCorrect = true;
            feedbackIndex = lesson2SequenceIndex;
            updateState('lesson2SequenceIndex', lesson2SequenceIndex + 1);
            
            if (getState('lesson2SequenceIndex') >= sequence.length) {
                updateState('lesson2SequenceIndex', 0);
                updateState('lesson2State', lesson2State + 2);
                
                // PERBAIKAN: Panggil doRenderAndHighlight tanpa feedback
                // agar urutan baru tidak menampilkan umpan balik yang salah.
                doRenderAndHighlight();
            } else {
                doRenderAndHighlight(feedbackIndex, isCorrect);
            }
            
            if (getState('lesson2State') >= 12) {
                dispatchLesson2FinishedEvent(new Event('lesson2-finished'));
            }
        } else {
            feedbackIndex = lesson2SequenceIndex;
            isCorrect = false;
            doRenderAndHighlight(feedbackIndex, isCorrect);

            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    }
}