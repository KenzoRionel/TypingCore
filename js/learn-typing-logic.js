// js/learn-typing-logic.js

import { lessons } from './learn-typing-lessons.js';
import { getState, updateState } from './learn-typing-state.js';
import {
    renderLesson2,
    cleanupLesson2Elements,
    getSequenceForState,
} from './lesson2-logic.js';
import {
    renderLesson3,
    cleanupLesson3Elements,
    getSequenceForState as getSequenceForState3,
} from './lesson3-logic.js';
import {
    renderLesson4,
    cleanupLesson4Elements,
} from './lesson4-logic.js';
import {
    renderLesson6,
    cleanupLesson6Elements,
    getSequenceForState as getSequenceForState6,
}
 from './lesson6-logic.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';
import {
    clearKeyboardHighlights,
    renderOtherLessons,
    showLessonCompleteNotification,
    createKeyboard,
    highlightKeyOnKeyboard,
    animateJellyEffect,
    animateAllBordersOnCorrectInput,
} from './learn-typing-ui.js';
import { renderHandVisualizer } from './hand-visualizer.js';
import {cleanupSimpleDrillElements, renderSimpleDrill} from './simple-drill-logic.js';

export function cleanupSpecialLessons(lessonInstruction) {
    cleanupLesson2Elements(lessonInstruction);
    cleanupLesson3Elements(lessonInstruction);
    cleanupLesson4Elements(lessonInstruction);
    cleanupLesson6Elements(lessonInstruction);
    const keyboardContainerEl = document.getElementById('virtual-keyboard');
    if (keyboardContainerEl) {
        clearKeyboardHighlights(keyboardContainerEl);
    }
}

export function resetLesson2State(clearAnimation) {
    updateState('lesson2State', 0);
    updateState('lesson2SequenceIndex', 0);
    const lessonInstructionEl = document.getElementById('lesson-instruction');
    if (lessonInstructionEl) {
        cleanupLesson2Elements(lessonInstructionEl);
    }
    const keyboardContainerEl = document.getElementById('virtual-keyboard');
    if (keyboardContainerEl) {
        clearKeyboardHighlights(keyboardContainerEl);
    }
    if (clearAnimation) clearAnimation();
}

export function resetLesson3State(clearAnimation) {
    updateState('lesson3State', 0);
    updateState('lesson3SequenceIndex', 0);
    const lessonInstructionEl = document.getElementById('lesson-instruction');
    if (lessonInstructionEl) {
        cleanupLesson3Elements(lessonInstructionEl);
    }
    const keyboardContainerEl = document.getElementById('virtual-keyboard');
    if (keyboardContainerEl) {
        clearKeyboardHighlights(keyboardContainerEl);
    }
    if (clearAnimation) clearAnimation();
}

export function resetLesson4State(clearAnimation) {
    updateState('lesson4CurrentCharIndex', 0);
    updateState('lesson4CharHistory', []);
    const lessonInstructionEl = document.getElementById('lesson-instruction');
    if (lessonInstructionEl) {
        cleanupLesson4Elements(lessonInstructionEl);
    }
    const keyboardContainerEl = document.getElementById('virtual-keyboard');
    if (keyboardContainerEl) {
        clearKeyboardHighlights(keyboardContainerEl);
    }
    if (clearAnimation) clearAnimation();
}

export function resetLesson5State(clearAnimation) {
    updateState('currentStepIndex', 0);
    const keyboardContainerEl = document.getElementById('virtual-keyboard');
    if (keyboardContainerEl) {
        clearKeyboardHighlights(keyboardContainerEl);
    }
    if (clearAnimation) clearAnimation();
}

export function resetLesson6State(clearAnimation) {
    updateState('lesson6State', 0);
    updateState('lesson6SequenceIndex', 0);
    const lessonInstructionEl = document.getElementById('lesson-instruction');
    if (lessonInstructionEl) {
        cleanupLesson6Elements(lessonInstructionEl);
    }
    const keyboardContainerEl = document.getElementById('virtual-keyboard');
    if (keyboardContainerEl) {
        clearKeyboardHighlights(keyboardContainerEl);
    }
    if (clearAnimation) clearAnimation();
}


export { createKeyboard };

export function renderLesson({
    lessons,
    currentLessonIndex,
    currentStepIndex,
    currentCharIndex,
    keyboardContainer,
    lessonTitle,
    lessonInstruction,
    lessonTextDisplay,
    feedbackIndex = -1,
    isCorrect = null,
    navigationButtonsContainer,
    lessonHeader,
    setAnimatingKey,
    clearAnimation,
    renderHandVisualizer,
    animateJellyEffect,
    animateAllBordersOnCorrectInput,
}) {
    if (!lessons || !lessons[currentLessonIndex]) {
        console.error("Pelajaran tidak ditemukan atau indeks tidak valid.");
        return;
    }

    const lesson = lessons[currentLessonIndex];

    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    if (prevLessonBtn) {
        if (currentLessonIndex === 0) {
            prevLessonBtn.style.visibility = 'hidden';
        } else {
            prevLessonBtn.style.visibility = 'visible';
        }
    }
    
    if (lessonTitle) lessonTitle.textContent = lesson.title;

    clearKeyboardHighlights(keyboardContainer);

    const progressBarContainerEl = document.getElementById('progress-container-wrapper');

    // Bersihkan elemen-elemen dari pelajaran sebelumnya untuk mencegah tumpang tindih
    cleanupSimpleDrillElements(lessonInstruction);
    cleanupCharacterDrillElements(lessonInstruction);
    cleanupLesson4Elements(lessonInstruction, lessonTextDisplay);

    if (lessonTextDisplay) {
        // Hapus kelas khusus untuk memastikan tampilan default
        lessonTextDisplay.classList.remove('lesson-4-display');
        lessonTextDisplay.innerHTML = '';
        lessonTextDisplay.style.display = '';
    }

    // Gunakan switch case atau if/else if berdasarkan tipe pelajaran, bukan indeks
    switch (lesson.type) {
        case 'simple-drill':
            const lessonStateKey = `lesson${currentLessonIndex + 1}State`;
            const lessonSequenceIndexKey = `lesson${currentLessonIndex + 1}SequenceIndex`;
            const lessonState = getState(lessonStateKey);
            const lessonSequenceIndex = getState(lessonSequenceIndexKey);
            
            if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';

            renderSimpleDrill(lesson, lessonInstruction, keyboardContainer, lessonState, lessonSequenceIndex, setAnimatingKey, renderHandVisualizer);
            
            // Logika untuk menampilkan notifikasi selesai
            const totalSequences = lesson.sequences.length;
            if (lessonState >= totalSequences * 2) {
                const domElements = {
                    lessonHeader,
                    lessonCompleteNotification: document.getElementById('lesson-complete-notification'),
                    continueBtn: document.getElementById('continue-btn'),
                    keyboardContainer,
                    nextLessonPreview: document.getElementById('next-lesson-preview'),
                    successAnimationSvg: document.getElementById('success-animation-svg'),
                    prevLessonBtn: document.getElementById('prev-lesson-btn'),
                    nextLessonBtn: document.getElementById('next-lesson-btn'),
                    lessonTextDisplay,
                    progressContainerWrapper: progressBarContainerEl
                };
                showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
            }
            break;

        case 'character-drill':
            if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
            renderCharacterDrill(lesson, lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer, currentStepIndex);
            break;

        case 'free-typing':
            lessonTextDisplay.classList.add('lesson-4-display');
            renderLesson4(lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer);
            break;

        default:
            renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer, animateJellyEffect);
            break;
    }

    const progress = calculateLessonProgress(lesson);
    updateProgressBar(progress);
}

export { showLessonCompleteNotification };