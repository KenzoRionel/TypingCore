// lesson3-logic.js
import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard } from './learn-typing-logic.js';

let lesson3SequenceContainer = null;
let lesson3UnderlineContainer = null;

export function getSequenceForState(state) {
    switch (state) {
        case 0: return ['f', ' ', 'j', ' ', 'f', ' '];
        case 2: return ['j', ' ', 'f', ' ', 'j', ' '];
        case 4: return ['f', ' ', 'j', ' ', 'j', ' '];
        case 6: return ['j', ' ', 'f', ' ', 'f', ' '];
        case 8: return ['f', ' ', 'f', ' ', 'j', ' '];
        case 10: return ['j', ' ', 'j', ' ', 'f', ' '];
        default: return [];
    }
}

export function renderLesson3(lessonInstruction, keyboardContainer, feedbackIndex = -1, isCorrect = null) {
    if (!lessonInstruction) {
        console.error("renderLesson3: lessonInstruction tidak ditemukan.");
        return;
    }

    const lesson2State = getState('lesson2State');
    const lesson2SequenceIndex = getState('lesson2SequenceIndex');

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

    const sequence = getSequenceForState(lesson2State);
    if (sequence.length > 0) {
        keysToDisplay = sequence;
        activeIndex = lesson2SequenceIndex;
        highlightedKey = sequence[lesson2SequenceIndex];
    }

    if (lesson2State === 0) instructionText = lessons[2].instruction;
    if (lesson2State === 11) instructionText = 'Hebat! Pelajaran F dan J selesai!';
    
    updateInstructionText(lessonInstruction, instructionText);

    if (lesson2State % 2 !== 0 && lesson2State < 12) {
        handleTransitionState();
    } else if (lesson2State < 12) {
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

    const requiresRebuild = lesson3SequenceContainer.children.length === 0 || keysToDisplay.join('') !== Array.from(lesson3SequenceContainer.children).map(el => el.textContent).join('');

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

function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null || !lesson3SequenceContainer) return;

    const keyElements = Array.from(lesson3SequenceContainer.children);
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
    let lesson2State = getState('lesson2State');
    let lesson2SequenceIndex = getState('lesson2SequenceIndex');

    if (lesson2State % 2 === 0 && lesson2State < 12) {
        const sequence = getSequenceForState(lesson2State);
        const expectedKey = sequence[lesson2SequenceIndex];

        if (e.key.toLowerCase() === expectedKey) {
            isCorrect = true;
            feedbackIndex = lesson2SequenceIndex;
            updateState('lesson2SequenceIndex', lesson2SequenceIndex + 1);
            lesson2SequenceIndex = getState('lesson2SequenceIndex');

            if (lesson2SequenceIndex >= sequence.length) {
                updateState('lesson2SequenceIndex', 0);
                updateState('lesson2State', lesson2State + 1);
                doRenderAndHighlight(feedbackIndex, isCorrect);

                setTimeout(() => {
                    updateState('lesson2State', getState('lesson2State') + 1);
                    if (getState('lesson2State') >= 12) {
                        dispatchLesson3FinishedEvent(new Event('lesson3-finished'));
                    } else {
                        doRenderAndHighlight();
                    }
                }, 400);
            } else {
                doRenderAndHighlight(feedbackIndex, isCorrect);
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