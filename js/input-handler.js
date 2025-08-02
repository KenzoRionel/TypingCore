// input-handler.js (PERBAIKAN LENGKAP)

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import {
    showLessonCompleteNotification
} from './learn-typing-logic.js';
import { handleLesson2Input } from './lesson2-logic.js';

export function handleKeyboardInput(e, domElements, doRenderAndHighlight) {
    const { lessonInstruction, lessonCompleteNotification, continueBtn } = domElements; 

    const currentLessonIndex = getState('currentLessonIndex');
    const currentStepIndex = getState('currentStepIndex');
    const currentCharIndex = getState('currentCharIndex');
    const waitingForAnim = getState('waitingForAnim');
    const lesson2Finished = getState('lesson2Finished');

    if ((lessonCompleteNotification && lessonCompleteNotification.classList.contains('active')) || waitingForAnim.value || lesson2Finished) {
        e.preventDefault();
        return;
    }

    const currentLesson = lessons[currentLessonIndex];
    let preventDefault = true;

    if (currentLessonIndex === 0) {
        if (currentStepIndex === 0 && e.key.toLowerCase() === 'f') {
            updateState('waitingForAnim', true);
            const inlineKeyF = document.getElementById('inlineKeyF');
            if (inlineKeyF) {
                inlineKeyF.classList.add('fade-out');
                setTimeout(() => {
                    inlineKeyF.style.display = 'none';
                    updateState('waitingForAnim', false);
                    updateState('currentStepIndex', 1);
                    doRenderAndHighlight();
                }, 300);
            } else {
                updateState('waitingForAnim', false);
                updateState('currentStepIndex', 1);
                doRenderAndHighlight();
            }
        } else if (currentStepIndex === 1 && e.key.toLowerCase() === 'j') {
            updateState('waitingForAnim', true);
            const inlineKeyJ = document.getElementById('inlineKeyJ');
            if (inlineKeyJ) {
                inlineKeyJ.classList.add('fade-out');
                setTimeout(() => {
                    inlineKeyJ.style.display = 'none';
                    updateState('waitingForAnim', false);
                    updateState('currentStepIndex', 2);
                    doRenderAndHighlight();
                    // PERBAIKAN: Memanggil fungsi dengan parameter yang benar
                    showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
                }, 300);
            } else {
                updateState('waitingForAnim', false);
                updateState('currentStepIndex', 2);
                doRenderAndHighlight();
                // PERBAIKAN: Memanggil fungsi dengan parameter yang benar
                showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
            }
        } else if (e.key.length === 1) {
            if (lessonInstruction) {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
            }
            doRenderAndHighlight();
        } else {
            preventDefault = false;
        }
    } else if (currentLessonIndex === 1) {
        handleLesson2Input({
            e,
            doRenderAndHighlight: doRenderAndHighlight,
            dispatchLesson2FinishedEvent: (event) => lessonInstruction.dispatchEvent(event),
            lessonInstructionEl: lessonInstruction,
        });
        preventDefault = false;
    } else {
        if (!currentLesson || !currentLesson.sequence || currentCharIndex >= currentLesson.sequence.length) {
            console.warn("Pelajaran tidak valid atau sudah selesai. Mengabaikan input.");
            e.preventDefault();
            return;
        }

        const expectedChar = currentLesson.sequence[currentCharIndex];

        if (e.key === ' ' && expectedChar === ' ') {
            updateState('currentCharIndex', currentCharIndex + 1);
        } else if (e.key === 'Escape') {
            preventDefault = false;
        } else if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
            updateState('currentCharIndex', currentCharIndex + 1);
        } else {
            if (lessonInstruction) {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
            }
        }

        if (getState('currentCharIndex') >= currentLesson.sequence.length) {
            // PERBAIKAN: Memanggil fungsi dengan parameter yang benar
            showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
        }
        doRenderAndHighlight();
    }

    if (preventDefault) {
        e.preventDefault();
    }
}