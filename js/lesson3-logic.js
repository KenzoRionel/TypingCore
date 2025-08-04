// lesson3-logic.js
import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard } from './learn-typing-ui.js';

let lesson3SequenceContainer = null;
let lesson3UnderlineContainer = null;

export function getSequenceForState(state) {
    switch (state) {
        case 0: return ['f', ' ', 'f', ' ', 'j', ' ', 'j'];
        case 2: return [' ', 'f', 'f', ' ', ' ', 'f', 'f'];
        case 4: return ['j', 'j', ' ', 'j', 'j', ' ', 'f'];
        case 6: return ['j', ' ', 'j', 'f', ' ', 'f', 'f'];
        case 8: return [' ', 'j', 'j', ' ', ' ', 'j', 'j'];
        case 10: return ['f', 'f', ' ', ' ', 'f', 'f', ' '];
        default: return [];
    }
}

export function renderLesson3(lessonInstruction, keyboardContainer, feedbackIndex = -1, isCorrect = null) {
    if (!lessonInstruction) {
        console.error("renderLesson3: lessonInstruction tidak ditemukan.");
        return;
    }

    const lesson3State = getState('lesson3State');
    const lesson3SequenceIndex = getState('lesson3SequenceIndex');

    if (!lesson3SequenceContainer || !lessonInstruction.contains(lesson3SequenceContainer)) {
        lesson3SequenceContainer = document.createElement('div');
        lesson3SequenceContainer.classList.add('lesson-keyboard-sequence');
        const underlineContainer = lessonInstruction.querySelector('.lesson-keyboard-underline');
        lessonInstruction.insertBefore(lesson3SequenceContainer, underlineContainer);
    }
    if (!lesson3UnderlineContainer || !lessonInstruction.contains(lesson3UnderlineContainer)) {
        lesson3UnderlineContainer = document.createElement('div');
        lesson3UnderlineContainer.classList.add('lesson-keyboard-underline');
        lessonInstruction.appendChild(lesson3UnderlineContainer);
    }

    let instructionText = '';
    let keysToDisplay = [];
    let activeIndex = -1;
    let highlightedKey = null;

    const sequence = getSequenceForState(lesson3State);
    if (sequence.length > 0) {
        keysToDisplay = sequence;
        activeIndex = lesson3SequenceIndex;
        highlightedKey = sequence[lesson3SequenceIndex];
    }

    if (lesson3State === 0) instructionText = lessons[2].instruction;
    
    updateInstructionText(lessonInstruction, instructionText);

    if (lesson3State % 2 !== 0 && lesson3State < 12) {
        handleTransitionState();
    } else if (lesson3State < 12) {
        handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex, isCorrect);
    } else {
        cleanupLesson3Elements(lessonInstruction);
    }
}

function updateInstructionText(lessonInstruction, text) {
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (!node.classList || (!node.classList.contains('lesson-keyboard-sequence') && !node.classList.contains('lesson-keyboard-underline'))) {
            node.remove();
        }
    });
    if (text) {
        lessonInstruction.prepend(document.createTextNode(text));
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

function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex = -1, isCorrect = null) {
    if (!lesson3SequenceContainer || !lesson3UnderlineContainer) return;

    // LOGIKA PERBAIKAN BUG DI SINI
    const currentDisplayedSequence = Array.from(lesson3SequenceContainer.children).map(el => el.textContent === '\u00A0' ? ' ' : el.textContent).join('');
    const requiresRebuild = lesson3SequenceContainer.children.length === 0 || keysToDisplay.join('') !== currentDisplayedSequence;
    
    if (requiresRebuild) {
        lesson3SequenceContainer.innerHTML = '';
        lesson3UnderlineContainer.innerHTML = '';

        keysToDisplay.forEach((keyChar, idx) => {
            const keyEl = document.createElement('span');
            keyEl.classList.add('lesson-keyboard-key');
            keyEl.textContent = keyChar === ' ' ? '\u00A0' : keyChar; 
            lesson3SequenceContainer.appendChild(keyEl);

            const underlineEl = document.createElement('span');
            underlineEl.classList.add('lesson-keyboard-underline-item');
            lesson3UnderlineContainer.appendChild(underlineEl);

            keyEl.classList.add('slide-down-fade-in');
            void keyEl.offsetWidth;
        });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const keyElements = Array.from(lesson3SequenceContainer.children);
                const underlineElements = Array.from(lesson3UnderlineContainer.children);

                keyElements.forEach((keyEl, idx) => {
                    const underlineEl = underlineElements[idx];
                    if (keyEl && underlineEl) {
                        const keyRect = keyEl.getBoundingClientRect();
                        const underlineRect = underlineEl.getBoundingClientRect();
                        const targetUnderlineCenterX = keyRect.left + (keyRect.width / 2);
                        const currentUnderlineCenterX = underlineRect.left + (underlineRect.width / 2);
                        const translateXValue = targetUnderlineCenterX - currentUnderlineCenterX;
                        underlineEl.style.transform = `translateX(${translateXValue}px)`;
                    }
                });
            });
        });

    }

    updateUnderlineStatus(lesson3SequenceContainer, lesson3UnderlineContainer, activeIndex);
    applyFeedback(feedbackIndex, isCorrect);

    if (highlightedKey) {
        highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
    }
}

// FUNGSI INI SUDAH DIPERBAIKI UNTUK BUG WARNA TIDAK LENGKET
function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null || !lesson3SequenceContainer) return;

    const keyElements = Array.from(lesson3SequenceContainer.children);
    if (keyElements[feedbackIndex]) {
        if (isCorrect) {
            keyElements[feedbackIndex].classList.add('completed-correct');
            keyElements[feedbackIndex].classList.remove('input-incorrect');
        } else {
            keyElements[feedbackIndex].classList.add('input-incorrect');
            keyElements[feedbackIndex].classList.remove('completed-correct');
            setTimeout(() => {
                if (keyElements[feedbackIndex]) {
                    keyElements[feedbackIndex].classList.remove('input-incorrect');
                }
            }, 500);
        }
        void keyElements[feedbackIndex].offsetWidth;
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

export function handleLesson3Input({ e, doRenderAndHighlight, dispatchLesson3FinishedEvent, lessonInstructionEl }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    let isCorrect = false;
    let feedbackIndex = -1;
    let lesson3State = getState('lesson3State');
    let lesson3SequenceIndex = getState('lesson3SequenceIndex');

    if (lesson3State % 2 === 0 && lesson3State < 12) {
        const sequence = getSequenceForState(lesson3State);
        const expectedKey = sequence[lesson3SequenceIndex];

        if (e.key.toLowerCase() === expectedKey) {
            isCorrect = true;
            feedbackIndex = lesson3SequenceIndex;
            updateState('lesson3SequenceIndex', lesson3SequenceIndex + 1);
            lesson3SequenceIndex = getState('lesson3SequenceIndex');

            if (lesson3SequenceIndex >= sequence.length) {
                updateState('lesson3SequenceIndex', 0);
                updateState('lesson3State', lesson3State + 1);
                doRenderAndHighlight(feedbackIndex, isCorrect);

                setTimeout(() => {
                    updateState('lesson3State', getState('lesson3State') + 1);
                    if (getState('lesson3State') >= 12) {
                        dispatchLesson3FinishedEvent(new Event('lesson3-finished'));
                    } else {
                        doRenderAndHighlight();
                    }
                }, 400);
            } else {
                doRenderAndHighlight(feedbackIndex, isCorrect);
            }
        } else {
            feedbackIndex = lesson3SequenceIndex;
            isCorrect = false;
            doRenderAndHighlight(feedbackIndex, isCorrect);

            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    }
}