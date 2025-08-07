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

export function cleanupSpecialLessons(lessonInstruction) {
    cleanupLesson2Elements(lessonInstruction);
    cleanupLesson3Elements(lessonInstruction);
    cleanupLesson4Elements(lessonInstruction);
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
    
    // Perbaikan ini memastikan objek pelajaran yang benar
    // digunakan di seluruh fungsi ini.
    
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
             renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect, animateAllBordersOnCorrectInput);

             const lesson2State = getState('lesson2State');
             const lesson2SequenceIndex = getState('lesson2SequenceIndex');
             const sequence = getSequenceForState(lesson2State);
             const highlightedKey = sequence[lesson2SequenceIndex];

             if (highlightedKey) {
                 const keyElement = keyboardContainer.querySelector(`.key[data-key="${highlightedKey.toLowerCase()}"]`);
                 if (keyElement && setAnimatingKey) {
                     setAnimatingKey(keyElement);
                 }
                 if (renderHandVisualizer) {
                     renderHandVisualizer(highlightedKey);
                 }
                 highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
             }
           },
           2: () => {
             if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
             renderLesson3(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect, animateAllBordersOnCorrectInput);

             const lesson3State = getState('lesson3State');
             const lesson3SequenceIndex = getState('lesson3SequenceIndex');
             const sequence = getSequenceForState3(lesson3State);
             const highlightedKey = sequence[lesson3SequenceIndex];

             if (highlightedKey) {
                 const keyElement = keyboardContainer.querySelector(`.key[data-key="${highlightedKey.toLowerCase()}"]`);
                 if (keyElement && setAnimatingKey) {
                     setAnimatingKey(keyElement);
                 }
                 if (renderHandVisualizer) {
                     renderHandVisualizer(highlightedKey);
                 }
                 highlightKeyOnKeyboard(keyboardContainer, highlightedKey);
             }
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
        renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer, animateJellyEffect);
    }

    const progress = calculateLessonProgress(lesson);
    // PERBAIKAN: Memanggil updateProgressBar dengan satu parameter
    updateProgressBar(progress);
}

export { showLessonCompleteNotification };