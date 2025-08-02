// js/learn-typing-logic.js
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { getState, updateState, getHiddenInput } from './learn-typing-state.js';
import {
    getSequenceForState,
    renderLesson2,
    cleanupLesson2Elements,
} from './lesson2-logic.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';

let currentHighlightedKeyElement = null;

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

            if (['ShiftLeft', 'ShiftRight'].includes(key)) {
                keyElement.classList.add('key-wide');
            }
            if (['Tab'].includes(key)) {
                keyElement.classList.add('key-tab');
            }
            if (['CapsLock', 'Backspace', 'Enter'].includes(key)) {
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
    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.style.animation = '';
    }
    currentHighlightedKeyElement = null;
}

export function highlightKeyOnKeyboard(keyboardContainer, keyChar) {
    if (!keyboardContainer) {
        console.warn("highlightKeyOnKeyboard: keyboardContainer is null or undefined. Cannot highlight.");
        return;
    }

    clearKeyboardHighlights(keyboardContainer);

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
                lessonInstruction.textContent = 'GOOD JOB! Klik "Lanjutkan" untuk ke pelajaran berikutnya.';
                highlightKeyOnKeyboard(keyboardContainer, null);
            }
        }
    } else if (currentLessonIndex === 1 || currentLessonIndex === 2) {
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

export function showLessonCompleteNotification(lessons, currentLessonIdx, domElements) {
    const {
        lessonHeader,
        lessonCompleteNotification,
        continueBtn,
        keyboardContainer,
        nextLessonPreview,
        successAnimationSvg,
        prevLessonBtn,
        nextLessonBtn,
        hiddenInput
    } = domElements;

    if (lessonHeader) {
        lessonHeader.style.display = 'none';
    }

    if (keyboardContainer) {
        keyboardContainer.style.display = 'none';
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            key.style.animation = 'none';
            key.classList.remove('next-key', 'correct-key', 'wrong-key');
        });
    }

    if (prevLessonBtn) prevLessonBtn.style.display = 'none';
    if (nextLessonBtn) nextLessonBtn.style.display = 'none';

    if (lessonCompleteNotification) {
        const currentLesson = lessons[currentLessonIdx];

        const h2 = lessonCompleteNotification.querySelector('h2');
        if (h2) {
            h2.textContent = `Pelajaran ${currentLessonIdx + 1} selesai!`;
        }
        
        if (successAnimationSvg) {
            successAnimationSvg.classList.remove('animate-circle', 'animate-check');
            void successAnimationSvg.offsetWidth; 
            successAnimationSvg.classList.add('animate-circle');
            
            setTimeout(() => {
                successAnimationSvg.classList.add('animate-check');
            }, 1000);
        }

        if (nextLessonPreview) {
            const nextLessonIndex = currentLessonIdx + 1;
            if (nextLessonIndex < lessons.length) {
                const nextLesson = lessons[nextLessonIndex];
                let previewText = '';
                if (nextLessonIndex === 0) {
                    previewText = `Ketik huruf: <span class="highlight-key-modal">F</span> dan <span class="highlight-key-modal">J</span>`;
                } else if (nextLessonIndex === 1) {
                    previewText = `Ketik kata acak: <span class="highlight-key-modal">huruf acak</span>`;
                } else {
                    const previewChars = nextLesson.sequence ? nextLesson.sequence.slice(0, 5).join('') : '';
                    previewText = `Ketik: <span class="highlight-key-modal">${previewChars}...</span>`;
                }
                nextLessonPreview.innerHTML = previewText;
            } else {
                nextLessonPreview.textContent = "Anda telah menyelesaikan semua pelajaran!";
            }
        }
        
        lessonCompleteNotification.style.display = 'flex';
        setTimeout(() => {
            lessonCompleteNotification.classList.add('active');
            // PERBAIKAN: Fokus pada hiddenInput dihapus dari sini
            // dan akan ditangani oleh event listener "continueBtn" di learn-typing.js
            if (continueBtn) {
                continueBtn.focus();
            } else {
                console.error('ERROR: Elemen continueBtn tidak ditemukan saat mencoba fokus!');
            }
        }, 50);
    } else {
        console.error('ERROR: Elemen notifikasi (#lesson-complete-notification) tidak ditemukan!');
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