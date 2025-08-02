//lesson2-logic.js
import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { highlightKeyOnKeyboard } from './learn-typing-logic.js';

let lesson2SequenceContainer = null;
let lesson2UnderlineContainer = null;

export function getSequenceForState(state) {
    switch (state) {
        case 0: return ['f', 'f', 'f', 'f', 'j', 'j'];
        case 2: return ['j', 'j', 'f', 'f', 'f', 'f'];
        case 4: return ['j', 'j', 'j', 'j', 'f', 'f'];
        case 6: return ['j', 'j', 'f', 'f', 'j', 'j'];
        case 8: return ['f', 'j', 'f', 'j', 'j', 'f'];
        case 10: return ['j', 'f', 'f', 'j', 'f', 'j'];
        default: return [];
    }
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
        // Masukkan kontainer ini sebelum kontainer underline
        const underlineContainer = lessonInstruction.querySelector('.lesson-keyboard-underline');
        lessonInstruction.insertBefore(lesson2SequenceContainer, underlineContainer);
    }
    if (!lesson2UnderlineContainer || !lessonInstruction.contains(lesson2UnderlineContainer)) {
        lesson2UnderlineContainer = document.createElement('div');
        lesson2UnderlineContainer.classList.add('lesson-keyboard-underline');
        lessonInstruction.appendChild(lesson2UnderlineContainer);
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

    // --- BARIS PERBAIKAN ---
    // Sekarang kita bisa mengambil instruksi langsung dari data lessons,
    // karena properti tersebut sudah ditambahkan di file lessons.js.
    if (lesson2State === 0) instructionText = lessons[1].instruction;
    if (lesson2State === 11) instructionText = 'Hebat! Pelajaran F dan J selesai!';
    // --- AKHIR BARIS PERBAIKAN ---

    updateInstructionText(lessonInstruction, instructionText);

    if (lesson2State % 2 !== 0 && lesson2State < 12) {
        handleTransitionState();
    } else if (lesson2State < 12) {
        handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex, isCorrect);
    } else {
        cleanupLesson2Elements(lessonInstruction);
    }
}

function updateInstructionText(lessonInstruction, text) {
    // --- BARIS PERBAIKAN ---
    // Bersihkan semua node anak, kecuali kontainer sequence dan underline
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (!node.classList || (!node.classList.contains('lesson-keyboard-sequence') && !node.classList.contains('lesson-keyboard-underline'))) {
            node.remove();
        }
    });
    // --- AKHIR BARIS PERBAIKAN ---
    if (text) {
        lessonInstruction.prepend(document.createTextNode(text));
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

    const requiresRebuild = lesson2SequenceContainer.children.length === 0 || keysToDisplay.join('') !== Array.from(lesson2SequenceContainer.children).map(el => el.textContent).join('');

    if (requiresRebuild) {
        lesson2SequenceContainer.innerHTML = '';
        lesson2UnderlineContainer.innerHTML = '';

        keysToDisplay.forEach((keyChar, idx) => {
            const keyEl = document.createElement('span');
            keyEl.classList.add('lesson-keyboard-key');
            keyEl.textContent = keyChar;
            lesson2SequenceContainer.appendChild(keyEl);

            const underlineEl = document.createElement('span');
            underlineEl.classList.add('lesson-keyboard-underline-item');
            lesson2UnderlineContainer.appendChild(underlineEl);

            keyEl.classList.add('slide-down-fade-in');
            void keyEl.offsetWidth;
        });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const keyElements = Array.from(lesson2SequenceContainer.children);
                const underlineElements = Array.from(lesson2UnderlineContainer.children);

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

    updateUnderlineStatus(lesson2SequenceContainer, lesson2UnderlineContainer, activeIndex);
    applyFeedback(feedbackIndex, isCorrect);

    if (highlightedKey) {
        highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
    }
}

function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null || !lesson2SequenceContainer) return;

    const keyElements = Array.from(lesson2SequenceContainer.children);
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
                        dispatchLesson2FinishedEvent(new Event('lesson2-finished'));
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