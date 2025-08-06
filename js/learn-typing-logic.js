// learn-typing-logic.js
import { lessons } from './learn-typing-lessons.js';
import { getState, updateState } from './learn-typing-state.js';
import {
    renderLesson2,
    cleanupLesson2Elements,
} from './lesson2-logic.js';
import {
    renderLesson3,
    cleanupLesson3Elements,
} from './lesson3-logic.js';
import {
    renderLesson4,
    cleanupLesson4Elements
} from './lesson4-logic.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';
import {
    clearKeyboardHighlights,
    renderOtherLessons,
    showLessonCompleteNotification,
    createKeyboard,
    highlightKeyOnKeyboard,
} from './learn-typing-ui.js';

function cleanupSpecialLessons(lessonInstruction) {
    cleanupLesson2Elements(lessonInstruction);
    cleanupLesson3Elements(lessonInstruction);
    cleanupLesson4Elements(lessonInstruction);
}

function resetSpecialLessonState(clearAnimation) {
    updateState('lesson2State', 0);
    updateState('lesson2SequenceIndex', 0);
    updateState('lesson3State', 0);
    updateState('lesson3SequenceIndex', 0);
    updateState('lesson4CurrentCharIndex', 0);

    const lessonInstructionEl = document.getElementById('lesson-instruction');
    if (lessonInstructionEl) {
        cleanupSpecialLessons(lessonInstructionEl);
    }
    const keyboardContainerEl = document.getElementById('virtual-keyboard');
    if (keyboardContainerEl) {
        clearKeyboardHighlights(keyboardContainerEl);
    }
    // PERBAIKAN: Pastikan animasi juga dimatikan saat reset
    if (clearAnimation) clearAnimation();
}

export { resetSpecialLessonState as resetLesson2State };
export { resetSpecialLessonState as resetLesson3State };
export { resetSpecialLessonState as resetLesson4State };

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
    renderHandVisualizer
}) {
    if (!lessons || !lessons[currentLessonIndex]) {
        console.error("Pelajaran tidak ditemukan atau indeks tidak valid.");
        return;
    }
    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    if (prevLessonBtn) {
        if (currentLessonIndex === 0) {
            prevLessonBtn.style.visibility = 'hidden';
        } else {
            prevLessonBtn.style.visibility = 'visible';
        }
    }

    const lesson = lessons[currentLessonIndex];
    if (lessonTitle) lessonTitle.textContent = lesson.title;

    clearKeyboardHighlights(keyboardContainer);
    
    // PERBAIKAN: Hapus panggilan clearAnimation() yang berlebihan dari sini
    // if (clearAnimation) clearAnimation(); 

    const progressBarContainerEl = document.getElementById('progress-container-wrapper');
    const learnTypingSectionEl = document.getElementById('learn-typing-section');
    const virtualKeyboardEl = document.getElementById('virtual-keyboard');

    if (lessonTextDisplay) {
        if (currentLessonIndex === 3) {
            lessonTextDisplay.classList.add('lesson-4-display');
        } else {
            lessonTextDisplay.classList.remove('lesson-4-display');
        }
    }

    if (lessonTextDisplay) lessonTextDisplay.innerHTML = '';

    const specialRenderers = {
        0: () => {
            if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
            if (lessonInstruction) {
                if (currentStepIndex === 0) {
                    lessonInstruction.innerHTML = lesson.steps[0].instruction;
                    const keyF = keyboardContainer.querySelector('.key[data-key="f"]');
                    if (keyF) {
                        keyF.classList.add('next-key');
                    }
                    if (keyF && setAnimatingKey) {
                        setAnimatingKey(keyF);
                    }
                    if (renderHandVisualizer) renderHandVisualizer('f');
                } else if (currentStepIndex === 1) {
                    lessonInstruction.innerHTML = lesson.steps[1].instruction;
                    const keyJ = keyboardContainer.querySelector('.key[data-key="j"]');
                    if (keyJ) {
                        keyJ.classList.add('next-key');
                    }
                    if (keyJ && setAnimatingKey) {
                        setAnimatingKey(keyJ);
                    }
                    if (renderHandVisualizer) renderHandVisualizer('j');
                } else if (currentStepIndex === 2) {
                    if (setAnimatingKey) setAnimatingKey(null);
                    if (renderHandVisualizer) renderHandVisualizer(null);
                }
            }
        },
        1: () => {
            if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
            renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect, setAnimatingKey, renderHandVisualizer);
        },
        2: () => {
            if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
            renderLesson3(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect, setAnimatingKey, renderHandVisualizer);
        },
        3: () => {
            if (lessonTextDisplay) lessonTextDisplay.style.display = '';
            renderLesson4(lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer);
        },
    };

    if (specialRenderers[currentLessonIndex]) {
        specialRenderers[currentLessonIndex]();
    } else {
        if (lessonTextDisplay) lessonTextDisplay.style.display = '';
        renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer);
    }

    const progress = calculateLessonProgress(
        currentLessonIndex,
        lessons[currentLessonIndex]
    );
    updateProgressBar(progress);
}

export { showLessonCompleteNotification };