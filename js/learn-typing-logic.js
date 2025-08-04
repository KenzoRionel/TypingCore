// learn-typing-logic.js
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { getState, updateState, getHiddenInput } from './learn-typing-state.js';
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

export function resetLesson2State(keyboardContainer) {
    updateState('lesson2State', 0);
    updateState('lesson2SequenceIndex', 0);
    cleanupSpecialLessons(document.getElementById('lesson-instruction'));
    clearKeyboardHighlights(keyboardContainer);
}

export function resetLesson3State(keyboardContainer) {
    updateState('lesson3State', 0);
    updateState('lesson3SequenceIndex', 0);
    cleanupSpecialLessons(document.getElementById('lesson-instruction'));
    clearKeyboardHighlights(keyboardContainer);
}

export function resetLesson4State(keyboardContainer) {
    updateState('lesson4State', 0);
    updateState('lesson4SequenceIndex', 0);
    updateState('lesson4CurrentCharIndex', 0);
    cleanupSpecialLessons(document.getElementById('lesson-instruction'));
    clearKeyboardHighlights(keyboardContainer);
}

export { createKeyboard };

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
    const lesson3State = getState('lesson3State');
    const lesson3SequenceIndex = getState('lesson3SequenceIndex');

    if (lessonTextDisplay) {
        if (currentLessonIndex === 3) {
            lessonTextDisplay.classList.add('lesson-4-display');
        } else {
            lessonTextDisplay.classList.remove('lesson-4-display');
        }
    }

    if (currentLessonIndex === 0) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        if (lessonInstruction) {
            if (currentStepIndex === 0) {
                lessonInstruction.innerHTML = lesson.steps[0].instruction;
                highlightKeyOnKeyboard(keyboardContainer, 'f');
            } else if (currentStepIndex === 1) {
                lessonInstruction.innerHTML = lesson.steps[1].instruction;
                highlightKeyOnKeyboard(keyboardContainer, 'j');
            } else if (currentStepIndex === 2) {
                highlightKeyOnKeyboard(keyboardContainer, null);
            }
        }
    } else if (currentLessonIndex === 1) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
    } else if (currentLessonIndex === 2) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        renderLesson3(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
    } else if (currentLessonIndex === 3) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = '';
        renderLesson4(lessonInstruction, keyboardContainer);
    } else {
        if (lessonTextDisplay) lessonTextDisplay.style.display = '';
        renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer);
    }

    const progress = calculateLessonProgress(
        currentLessonIndex,
        currentStepIndex,
        currentCharIndex,
        lesson2State,
        lesson2SequenceIndex,
        lesson3State,
        lesson3SequenceIndex,
        getState('lesson4CurrentCharIndex'),
        lessons[currentLessonIndex]
    );
    updateProgressBar(progress);
}

export { showLessonCompleteNotification };