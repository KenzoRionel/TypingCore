// input-handler.js
import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import {
    showLessonCompleteNotification,
    highlightWrongKeyOnKeyboard
} from './learn-typing-ui.js';
import { handleLesson2Input } from './lesson2-logic.js';
import { handleLesson3Input } from './lesson3-logic.js';
import { handleLesson4Input } from './lesson4-logic.js';

export function handleKeyboardInput(e, domElements, doRenderAndHighlight, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation) {
    const { lessonInstruction, lessonCompleteNotification, continueBtn, hiddenInput, keyboardContainer } = domElements;

    const currentLessonIndex = getState('currentLessonIndex');
    const waitingForAnim = getState('waitingForAnim');
    const lesson2Finished = getState('lesson2Finished');
    const lesson3Finished = getState('lesson3Finished');
    const lesson4Finished = getState('lesson4Finished');

    const isAnyLessonFinished = [lesson2Finished, lesson3Finished, lesson4Finished].some(status => status);

    if (lessonCompleteNotification && lessonCompleteNotification.classList.contains('active')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (continueBtn) {
                continueBtn.click();
            }
        }
        return;
    }
    if (waitingForAnim || isAnyLessonFinished) {
        e.preventDefault();
        return;
    }
    if (hiddenInput && hiddenInput.style.display === 'none') {
        hiddenInput.style.display = '';
        setTimeout(() => hiddenInput.focus(), 0);
    }
    const currentLesson = lessons[currentLessonIndex];
    let preventDefault = true;

    if (currentLessonIndex === 0) {
        const currentStepIndex = getState('currentStepIndex');
        if (currentStepIndex === 0 && e.key.toLowerCase() === 'f') {
            if (setAnimationSpeed) {
                setAnimationSpeed(15);
            }
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
            if (setAnimationSpeed) {
                setAnimationSpeed(15);
            }
            updateState('waitingForAnim', true);
            const inlineKeyJ = document.getElementById('inlineKeyJ');
            if (inlineKeyJ) {
                inlineKeyJ.classList.add('fade-out');
                setTimeout(() => {
                    inlineKeyJ.style.display = 'none';
                    updateState('waitingForAnim', false);
                    updateState('currentStepIndex', 2);
                    doRenderAndHighlight();
                    showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
                }, 300);
            } else {
                updateState('waitingForAnim', false);
                updateState('currentStepIndex', 2);
                doRenderAndHighlight();
                showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
            }
        } else if (e.key.length === 1 && e.key !== 'F' && e.key !== 'f' && e.key !== 'J' && e.key !== 'j') {
            if (keyboardContainer && highlightWrongKeyOnKeyboard) {
                highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
            }
            if (lessonInstruction) {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
            }
            // PERBAIKAN: Hapus doRenderAndHighlight() di sini
        } else {
            preventDefault = false;
        }
    } else if (currentLessonIndex === 1) {
        handleLesson2Input({
            e,
            doRenderAndHighlight: doRenderAndHighlight,
            dispatchLesson2FinishedEvent: (event) => lessonInstruction.dispatchEvent(event),
            lessonInstructionEl: lessonInstruction,
            keyboardContainer: keyboardContainer,
            setAnimationSpeed: setAnimationSpeed,
            setAnimatingKey: setAnimatingKey,
            renderHandVisualizer: renderHandVisualizer,
            clearAnimation: clearAnimation
        });
    } else if (currentLessonIndex === 2) {
        handleLesson3Input({
            e,
            doRenderAndHighlight: doRenderAndHighlight,
            dispatchLesson3FinishedEvent: (event) => lessonInstruction.dispatchEvent(event),
            lessonInstructionEl: lessonInstruction,
            keyboardContainer: keyboardContainer,
            setAnimationSpeed: setAnimationSpeed,
            setAnimatingKey: setAnimatingKey,
            renderHandVisualizer: renderHandVisualizer,
            clearAnimation: clearAnimation
        });
    } else if (currentLessonIndex === 3) {
        handleLesson4Input({
            e,
            doRenderAndHighlight: doRenderAndHighlight,
            dispatchLesson4FinishedEvent: (event) => {
                lessonInstruction.dispatchEvent(event);
            },
            lessonInstructionEl: lessonInstruction,
            keyboardContainer: keyboardContainer,
            setAnimationSpeed: setAnimationSpeed,
            setAnimatingKey: setAnimatingKey,
            renderHandVisualizer: renderHandVisualizer,
            clearAnimation: clearAnimation
        });
    } else {
        const currentCharIndex = getState('currentCharIndex');
        if (!currentLesson || !currentLesson.sequence || currentCharIndex >= currentLesson.sequence.length) {
            e.preventDefault();
            return;
        }
        const expectedChar = currentLesson.sequence[currentCharIndex];
        if (e.key === ' ' && expectedChar === ' ') {
            if (setAnimationSpeed) {
                setAnimationSpeed(15);
            }
            updateState('currentCharIndex', currentCharIndex + 1);
            doRenderAndHighlight();
        } else if (e.key === 'Escape') {
            preventDefault = false;
        } else if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
            if (setAnimationSpeed) {
                setAnimationSpeed(15);
            }
            updateState('currentCharIndex', currentCharIndex + 1);
            doRenderAndHighlight();
        } else {
            if (lessonInstruction) {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
            }
            // PERBAIKAN: Hapus doRenderAndHighlight() di sini
        }
        if (getState('currentCharIndex') >= currentLesson.sequence.length) {
            showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
        }
    }
    if (preventDefault) {
        e.preventDefault();
    }
}