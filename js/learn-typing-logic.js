// learn-typing-logic.js
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { getState, updateState, getHiddenInput } from './learn-typing-state.js';

let lesson2SequenceContainer = null;
let lesson2UnderlineContainer = null;
let currentHighlightedKeyElement = null;

// --- PROGRESS BAR UTILITIES ---
export function calculateLessonProgress(currentLessonIndex, currentStepIndex, currentCharIndex, lesson2State, lesson2SequenceIndex, lesson) {
    if (currentLessonIndex === 0) {
        const totalSteps = lesson.steps.length;
        return (currentStepIndex / totalSteps) * 100;
    }
    else if (currentLessonIndex === 1) {
        const TOTAL_CHARACTER_STEPS_LESSON2 = 36;
        const currentProgressStep = (lesson2State / 2) * getSequenceForState(0).length + lesson2SequenceIndex;
        return (currentProgressStep / TOTAL_CHARACTER_STEPS_LESSON2) * 100;
    }
    else {
        if (!lesson.sequence || lesson.sequence.length === 0) return 0;
        return (currentCharIndex / lesson.sequence.length) * 100;
    }
}

export function updateProgressBar(progress) {
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');
    if (progressBar && progressText) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }
}

// --- FUNGSI RESET STATE PELAJARAN 2 ---
export function resetLesson2State(keyboardContainer) {
    updateState('lesson2State', 0);
    updateState('lesson2SequenceIndex', 0);

    if (lesson2SequenceContainer && lesson2SequenceContainer.parentNode) {
        lesson2SequenceContainer.remove();
    }
    lesson2SequenceContainer = null;

    if (lesson2UnderlineContainer && lesson2UnderlineContainer.parentNode) {
        lesson2UnderlineContainer.remove();
    }
    lesson2UnderlineContainer = null;

    if (keyboardContainer) {
        const highlightedKeys = keyboardContainer.querySelectorAll('.key.next-key, .key.correct-key, .key.wrong-key');
        highlightedKeys.forEach(key => {
            key.classList.remove('next-key', 'correct-key', 'wrong-key');
            key.style.animation = '';
        });
    }

    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key');
        currentHighlightedKeyElement.style.animation = '';
        currentHighlightedKeyElement = null;
    }
}

// --- FUNGSI UTILITY KEYBOARD ---
export function createKeyboard(keyboardContainer, keyLayout) {
    if (!keyboardContainer) {
        console.error("keyboardContainer tidak ditemukan. Tidak dapat membuat keyboard.");
        return;
    }

    keyboardContainer.innerHTML = '';
    keyLayout.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.classList.add('keyboard-row');
        row.forEach(key => {
            if (key === '') {
                const spacer = document.createElement('div');
                spacer.classList.add('key-spacer');
                rowElement.appendChild(spacer);
                return;
            }
            const keyElement = document.createElement('div');
            keyElement.classList.add('key');
            let lowerKey = key.toLowerCase();
            let displayKey = key;

            if (key === 'ShiftLeft' || key === 'ShiftRight') displayKey = 'Shift';
            if (key === 'ControlLeft' || key === 'ControlRight') displayKey = 'Ctrl';
            if (key === 'AltLeft' || key === 'AltRight') displayKey = 'Alt';
            if (key === 'MetaLeft' || key === 'MetaRight') displayKey = 'Win';
            if (key === 'ContextMenu') displayKey = 'Menu';
            if (key === 'Space') {
                displayKey = '';
                lowerKey = ' ';
            }

            keyElement.textContent = displayKey;
            keyElement.setAttribute('data-key', lowerKey);

            if (['Backspace', 'Tab', 'CapsLock', 'Enter', 'ShiftLeft', 'ShiftRight'].includes(key)) {
                keyElement.classList.add('key-medium');
            }
            if (key === 'Space') {
                keyElement.classList.add('key-space');
            }
            if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu'].includes(key)) {
                keyElement.classList.add('key-small');
            }
            rowElement.appendChild(keyElement);
        });
        keyboardContainer.appendChild(rowElement);
    });
}

function clearKeyboardHighlights(keyboardContainer) {
    if (!keyboardContainer) return;
    keyboardContainer.querySelectorAll('.key.next-key, .key.correct-key, .key.wrong-key').forEach(el => {
        el.classList.remove('next-key', 'correct-key', 'wrong-key');
        el.style.animation = '';
    });
    currentHighlightedKeyElement = null;
}

export function highlightKeyOnKeyboard(keyboardContainer, keyChar) {
    if (!keyboardContainer) {
        console.warn("highlightKeyOnKeyboard: keyboardContainer is null or undefined. Cannot highlight.");
        return;
    }

    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key', 'correct-key', 'wrong-key');
        currentHighlightedKeyElement.style.animation = '';
        currentHighlightedKeyElement = null;
    }

    if (typeof keyChar === 'string' && keyChar.length > 0) {
        const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);
        if (targetKeyElement) {
            targetKeyElement.classList.add('next-key');
            void targetKeyElement.offsetWidth;
            targetKeyElement.style.animation = 'highlight-move 0.6s ease-out infinite';
            currentHighlightedKeyElement = targetKeyElement;
        }
    }
}

// --- FUNGSI MENDAPATKAN URUTAN KARAKTER UNTUK PELAJARAN 2 ---
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

// --- FUNGSI UTAMA RENDER PELAJARAN ---
export function renderLesson({
    lessons,
    currentLessonIndex,
    currentStepIndex,
    currentCharIndex,
    waitingForAnim,
    keyboardContainer,
    lessonTitle,
    lessonInstruction,
    lessonTextDisplay,
    feedbackIndex = -1,
    isCorrect = null
}) {
    if (!lessons || !lessons[currentLessonIndex]) {
        console.error("Pelajaran tidak ditemukan atau indeks tidak valid.");
        return;
    }

    const lesson = lessons[currentLessonIndex];
    if (lessonTitle) lessonTitle.textContent = lesson.title;

    clearKeyboardHighlights(keyboardContainer);

    const lesson2State = getState('lesson2State');
    const lesson2SequenceIndex = getState('lesson2SequenceIndex');

    if (currentLessonIndex === 0) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        cleanupLesson2Elements(lessonInstruction);

        if (lessonInstruction) {
            if (currentStepIndex === 0) {
                lessonInstruction.innerHTML = lesson.steps[0].instruction;
                highlightKeyOnKeyboard(keyboardContainer, 'f');
            } else if (currentStepIndex === 1) {
                lessonInstruction.innerHTML = lesson.steps[1].instruction;
                highlightKeyOnKeyboard(keyboardContainer, 'j');
            } else if (currentStepIndex === 2) {
                lessonInstruction.textContent = 'Pelajaran 1 Selesai! Klik "Lanjutkan" untuk ke pelajaran berikutnya.';
                highlightKeyOnKeyboard(keyboardContainer, null);
            }
        }
    } else if (currentLessonIndex === 1) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
    } else {
        cleanupLesson2Elements(lessonInstruction);
        renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer);
    }

    const progress = calculateLessonProgress(
        currentLessonIndex,
        currentStepIndex,
        currentCharIndex,
        lesson2State,
        lesson2SequenceIndex,
        lessons[currentLessonIndex]
    );
    updateProgressBar(progress);
}

// --- FUNGSI RENDER KHUSUS PELAJARAN 2 ---
function renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex = -1, isCorrect = null) {
    if (!lessonInstruction) {
        console.error("renderLesson2: lessonInstruction tidak ditemukan.");
        return;
    }

    const lesson2State = getState('lesson2State');
    const lesson2SequenceIndex = getState('lesson2SequenceIndex');

    if (!lesson2SequenceContainer || !lessonInstruction.contains(lesson2SequenceContainer)) {
        lesson2SequenceContainer = document.createElement('div');
        lesson2SequenceContainer.classList.add('lesson-keyboard-sequence');
        lessonInstruction.insertBefore(lesson2SequenceContainer, lessonInstruction.firstChild);
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

    if (lesson2State === 0) instructionText = lessons[1].instruction || 'Tekan tombol f dan j secara bergantian sesuai urutan.';
    if (lesson2State === 11) instructionText = 'Hebat! Pelajaran F dan J selesai!';

    updateInstructionText(lessonInstruction, instructionText);

    if (lesson2State % 2 !== 0 && lesson2State < 12) {
        handleTransitionState();
    } else if (lesson2State < 12) {
        handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex, isCorrect);
    } else {
        cleanupLesson2Elements(lessonInstruction);
    }
}

// --- FUNGSI HELPER UNTUK PELAJARAN 2 ---
function updateInstructionText(lessonInstruction, text) {
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('lesson-keyboard-sequence') && !node.classList.contains('lesson-keyboard-underline'))) {
            node.remove();
        }
    });
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

export function showLessonCompleteModal(modal, continueBtn, keyboardContainer) {
    // Hapus highlight tombol keyboard saat modal muncul
    const keys = keyboardContainer.querySelectorAll('.key'); // Ganti dengan .key saja
    keys.forEach(key => {
        key.style.animation = 'none';
        key.classList.remove('next-key', 'correct-key', 'wrong-key');
    });

    if (modal) {
        setTimeout(() => {
            modal.style.display = 'flex';
            if (continueBtn) {
                continueBtn.focus();
            } else {
                console.error('ERROR: Elemen continueBtn tidak ditemukan saat mencoba fokus!');
            }
        }, 600);
    } else {
        console.error('ERROR: Elemen modal (#lesson-complete-modal) tidak ditemukan!');
    }
}


function cleanupLesson2Elements(lessonInstruction) {
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

    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key', 'correct-key', 'wrong-key');
        currentHighlightedKeyElement.style.animation = '';
        currentHighlightedKeyElement = null;
    }
}

function renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer) {
    if (!lessonTextDisplay || !lessonInstruction) return;

    lessonTextDisplay.style.display = '';
    lessonInstruction.textContent = lesson.instruction || '';

    lessonTextDisplay.innerHTML = '';

    if (lesson.sequence && lesson.sequence.length > 0) {
        lesson.sequence.forEach((char, idx) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char;
            if (idx < currentCharIndex) {
                span.classList.add('correct');
            } else if (idx === currentCharIndex) {
                span.classList.add('cursor');
            }
            lessonTextDisplay.appendChild(span);
        });
        if (currentCharIndex < lesson.sequence.length) {
            highlightKeyOnKeyboard(keyboardContainer, lesson.sequence[currentCharIndex]);
        } else {
            highlightKeyOnKeyboard(keyboardContainer, null);
        }
    }
}

export function highlightNextKey({ keyboardContainer }) {
    console.warn("highlightNextKey is a placeholder and its logic is now managed by renderLesson. Consider removing if not needed.");
}

// --- FUNGSI INPUT HANDLER UNTUK PELAJARAN 2 ---
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