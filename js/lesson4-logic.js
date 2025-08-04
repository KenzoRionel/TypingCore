// js/lesson4-logic.js
import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard } from './learn-typing-logic.js';

let lesson4SequenceContainer = null;
let lesson4UnderlineContainer = null;

export function getSequenceForState(state) {
    switch (state) {
        case 0: return ['g', ' ', 'g', ' ', 'h', ' ', 'h'];
        case 2: return [' ', 'g', 'g', ' ', ' ', 'h', 'h'];
        case 4: return ['h', 'h', ' ', 'h', 'h', ' ', 'g'];
        case 6: return ['h', ' ', 'h', 'g', ' ', 'g', 'g'];
        case 8: return [' ', 'h', 'h', ' ', ' ', 'h', 'h'];
        case 10: return ['g', 'g', ' ', ' ', 'g', 'g', ' '];
        default: return [];
    }
}

export function renderLesson4(lessonInstruction, keyboardContainer, feedbackIndex = -1, isCorrect = null) {
    if (!lessonInstruction) {
        console.error("renderLesson4: lessonInstruction tidak ditemukan.");
        return;
    }

    const lesson4State = getState('lesson4State');
    const lesson4SequenceIndex = getState('lesson4SequenceIndex');

    if (!lesson4SequenceContainer || !lessonInstruction.contains(lesson4SequenceContainer)) {
        lesson4SequenceContainer = document.createElement('div');
        lesson4SequenceContainer.classList.add('lesson-keyboard-sequence');
        const underlineContainer = lessonInstruction.querySelector('.lesson-keyboard-underline');
        lessonInstruction.insertBefore(lesson4SequenceContainer, underlineContainer);
    }
    if (!lesson4UnderlineContainer || !lessonInstruction.contains(lesson4UnderlineContainer)) {
        lesson4UnderlineContainer = document.createElement('div');
        lesson4UnderlineContainer.classList.add('lesson-keyboard-underline');
        lessonInstruction.appendChild(lesson4UnderlineContainer);
    }

    let instructionText = '';
    let keysToDisplay = [];
    let activeIndex = -1;
    let highlightedKey = null;

    const sequence = getSequenceForState(lesson4State);
    if (sequence.length > 0) {
        keysToDisplay = sequence;
        activeIndex = lesson4SequenceIndex;
        highlightedKey = sequence[lesson4SequenceIndex];
    }

    if (lesson4State === 0) instructionText = lessons[3].instruction;
    if (lesson4State === 11) instructionText = 'Bagus! Pelajaran G dan H selesai!';
    
    updateInstructionText(lessonInstruction, instructionText);

    if (lesson4State % 2 !== 0 && lesson4State < 12) {
        handleTransitionState();
    } else if (lesson4State < 12) {
        handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex, isCorrect);
    } else {
        cleanupLesson4Elements(lessonInstruction);
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
    if (lesson4SequenceContainer) {
        Array.from(lesson4SequenceContainer.children).forEach(keyEl => {
            keyEl.classList.remove('active', 'slide-down-fade-in', 'no-initial-animation', 'completed-correct', 'input-incorrect');
            keyEl.classList.add('slide-up-fade-out');
            void keyEl.offsetWidth;
            keyEl.addEventListener('animationend', () => keyEl.remove(), { once: true });
        });
    }
    if (lesson4UnderlineContainer) {
        lesson4UnderlineContainer.innerHTML = '';
    }
}

function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex = -1, isCorrect = null) {
    if (!lesson4SequenceContainer || !lesson4UnderlineContainer) return;

    const currentDisplayedSequence = Array.from(lesson4SequenceContainer.children).map(el => el.textContent === '\u00A0' ? ' ' : el.textContent).join('');
    const requiresRebuild = lesson4SequenceContainer.children.length === 0 || keysToDisplay.join('') !== currentDisplayedSequence;
    
    if (requiresRebuild) {
        lesson4SequenceContainer.innerHTML = '';
        lesson4UnderlineContainer.innerHTML = '';

        keysToDisplay.forEach((keyChar, idx) => {
            const keyEl = document.createElement('span');
            keyEl.classList.add('lesson-keyboard-key');
            keyEl.textContent = keyChar === ' ' ? '\u00A0' : keyChar; 
            lesson4SequenceContainer.appendChild(keyEl);

            const underlineEl = document.createElement('span');
            underlineEl.classList.add('lesson-keyboard-underline-item');
            lesson4UnderlineContainer.appendChild(underlineEl);

            keyEl.classList.add('slide-down-fade-in');
            void keyEl.offsetWidth;
        });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const keyElements = Array.from(lesson4SequenceContainer.children);
                const underlineElements = Array.from(lesson4UnderlineContainer.children);

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

    updateUnderlineStatus(lesson4SequenceContainer, lesson4UnderlineContainer, activeIndex);
    applyFeedback(feedbackIndex, isCorrect);

    if (highlightedKey) {
        highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
    }
}

function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null || !lesson4SequenceContainer) return;

    const keyElements = Array.from(lesson4SequenceContainer.children);
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

export function cleanupLesson4Elements(lessonInstruction) {
    if (lesson4SequenceContainer && lesson4SequenceContainer.parentNode) {
        lesson4SequenceContainer.remove();
        lesson4SequenceContainer = null;
    }
    if (lesson4UnderlineContainer && lesson4UnderlineContainer.parentNode) {
        lesson4UnderlineContainer.remove();
        lesson4UnderlineContainer = null;
    }
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.remove();
        }
    });
}

export function handleLesson4Input({ e, doRenderAndHighlight, dispatchLesson4FinishedEvent, lessonInstructionEl }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    let isCorrect = false;
    let feedbackIndex = -1;
    let lesson4State = getState('lesson4State');
    let lesson4SequenceIndex = getState('lesson4SequenceIndex');

    if (lesson4State % 2 === 0 && lesson4State < 12) {
        const sequence = getSequenceForState(lesson4State);
        const expectedKey = sequence[lesson4SequenceIndex];

        if (e.key.toLowerCase() === expectedKey) {
            isCorrect = true;
            feedbackIndex = lesson4SequenceIndex;
            updateState('lesson4SequenceIndex', lesson4SequenceIndex + 1);
            lesson4SequenceIndex = getState('lesson4SequenceIndex');

            if (lesson4SequenceIndex >= sequence.length) {
                updateState('lesson4SequenceIndex', 0);
                updateState('lesson4State', lesson4State + 1);
                doRenderAndHighlight(feedbackIndex, isCorrect);

                setTimeout(() => {
                    updateState('lesson4State', getState('lesson4State') + 1);
                    if (getState('lesson4State') >= 12) {
                        dispatchLesson4FinishedEvent(new Event('lesson4-finished'));
                    } else {
                        doRenderAndHighlight();
                    }
                }, 400);
            } else {
                doRenderAndHighlight(feedbackIndex, isCorrect);
            }
        } else {
            feedbackIndex = lesson4SequenceIndex;
            isCorrect = false;
            doRenderAndHighlight(feedbackIndex, isCorrect);

            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    }
}