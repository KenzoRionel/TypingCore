// learn-typing-logic.js (DIUPDATE)

import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { getState, updateState, getHiddenInput } from './learn-typing-state.js';
import {
    getSequenceForState,
    renderLesson2,
    cleanupLesson2Elements,
    handleLesson2Input,
} from './lesson2-logic.js';
// Import fungsi progress bar dari file baru
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';

let currentHighlightedKeyElement = null;

// --- PROGRESS BAR UTILITIES (SUDAH DIPINDAHKAN KE progress-bar.js) ---
// Bagian ini sekarang kosong karena sudah dipindahkan.

// --- FUNGSI RESET STATE PELAJARAN 2 ---
export function resetLesson2State(keyboardContainer) {
    updateState('lesson2State', 0);
    updateState('lesson2SequenceIndex', 0);

    cleanupLesson2Elements(document.getElementById('lesson-instruction'));

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

    // Panggil fungsi calculateLessonProgress dari progress-bar.js
    const progress = calculateLessonProgress(
        currentLessonIndex,
        currentStepIndex,
        currentCharIndex,
        lesson2State,
        lesson2SequenceIndex,
        lessons[currentLessonIndex]
    );
    // Panggil fungsi updateProgressBar dari progress-bar.js
    updateProgressBar(progress);
}

// --- FUNGSI UNTUK MENAMPILKAN MODAL PENYELESAIAN PELAJARAN ---
export function showLessonCompleteModal(modal, continueBtn, keyboardContainer) {
    const keys = keyboardContainer.querySelectorAll('.key');
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