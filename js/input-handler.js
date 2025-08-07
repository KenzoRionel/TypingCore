// js/input-handler.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import {
    showLessonCompleteNotification,
    highlightWrongKeyOnKeyboard,
    animateJellyEffect,
    // PERBAIKAN: Tambahkan animateAllBordersOnCorrectInput
    animateAllBordersOnCorrectInput,
} from './learn-typing-ui.js';
import { handleLesson2Input } from './lesson2-logic.js';
import { handleLesson3Input } from './lesson3-logic.js';
import { handleLesson4Input } from './lesson4-logic.js';
import { setIsCorrectInputAnimationActive } from './learn-typing.js';

export function handleKeyboardInput(e, domElements, doRenderAndHighlight, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation) {
    const { lessonInstruction, lessonCompleteNotification, continueBtn, hiddenInput, keyboardContainer, lessonTextDisplay } = domElements;

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
                setIsCorrectInputAnimationActive(true);
                setTimeout(() => setIsCorrectInputAnimationActive(false), 50);
            }
            const keyF = keyboardContainer.querySelector('.key[data-key="f"]');
            const onAnimationEnd = () => {
                updateState('waitingForAnim', false);
                updateState('currentStepIndex', 1);
                console.log(`[INPUT] Pelajaran 0: currentStepIndex diperbarui ke:`, getState('currentStepIndex'));
                doRenderAndHighlight();
            };
            if (keyF) {
                animateJellyEffect(keyF, onAnimationEnd);
                updateState('waitingForAnim', true);
            } else {
                onAnimationEnd();
            }
            
            const inlineKeyF = document.getElementById('inlineKeyF');
            if (inlineKeyF) {
                inlineKeyF.classList.add('fade-out');
            }
        } else if (currentStepIndex === 1 && e.key.toLowerCase() === 'j') {
            if (setAnimationSpeed) {
                setAnimationSpeed(15);
                setIsCorrectInputAnimationActive(true);
                setTimeout(() => setIsCorrectInputAnimationActive(false), 50);
            }
            const keyJ = keyboardContainer.querySelector('.key[data-key="j"]');
            const onAnimationEnd = () => {
                updateState('waitingForAnim', false);
                updateState('currentStepIndex', 2);
                console.log(`[INPUT] Pelajaran 0: currentStepIndex diperbarui ke:`, getState('currentStepIndex'));
                doRenderAndHighlight();
                showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
            };
            if (keyJ) {
                animateJellyEffect(keyJ, onAnimationEnd);
                updateState('waitingForAnim', true);
            } else {
                onAnimationEnd();
            }
            
            const inlineKeyJ = document.getElementById('inlineKeyJ');
            if (inlineKeyJ) {
                inlineKeyJ.classList.add('fade-out');
            }
        } else if (e.key.length === 1 && e.key.toLowerCase() !== 'f' && e.key.toLowerCase() !== 'j') {
            if (keyboardContainer && highlightWrongKeyOnKeyboard) {
                highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
            }
            if (lessonInstruction) {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
            }
        } else {
            preventDefault = false;
        }
    // PERBAIKAN: Mengembalikan logika untuk Pelajaran 2
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
            clearAnimation: clearAnimation,
            animateJellyEffect: animateJellyEffect,
            animateAllBordersOnCorrectInput: animateAllBordersOnCorrectInput,
        });
    // PERBAIKAN: Mengembalikan logika untuk Pelajaran 3
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
            clearAnimation: clearAnimation,
            animateJellyEffect: animateJellyEffect,
            animateAllBordersOnCorrectInput: animateAllBordersOnCorrectInput,
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
            clearAnimation: clearAnimation,
            animateJellyEffect: animateJellyEffect,
        });
    } else {
        const currentCharIndex = getState('currentCharIndex');
        if (!currentLesson || !currentLesson.sequence || currentCharIndex >= currentLesson.sequence.length) {
            e.preventDefault();
            return;
        }
        const expectedChar = currentLesson.sequence[currentCharIndex];
        const isSpaceCorrect = e.key === ' ' && expectedChar === ' ';
        const isCharCorrect = e.key.toLowerCase() === expectedChar.toLowerCase();
        
        if (isSpaceCorrect || isCharCorrect) {
            if (setAnimationSpeed) {
                setAnimationSpeed(15);
                setIsCorrectInputAnimationActive(true);
                setTimeout(() => setIsCorrectInputAnimationActive(false), 50);
            }
            
            const keyElement = keyboardContainer.querySelector(`.key[data-key="${(isSpaceCorrect ? ' ' : e.key).toLowerCase()}"]`);
            
            if (keyElement) {
                const onAnimationEnd = () => {
                    updateState('currentCharIndex', currentCharIndex + 1);
                    console.log(`[INPUT] Pelajaran lain: currentCharIndex diperbarui ke:`, getState('currentCharIndex'));
                    doRenderAndHighlight();
                    if (getState('currentCharIndex') >= currentLesson.sequence.length) {
                        showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
                    }
                };
                
                animateJellyEffect(keyElement, onAnimationEnd);
            } else {
                updateState('currentCharIndex', currentCharIndex + 1);
                doRenderAndHighlight();
                if (getState('currentCharIndex') >= currentLesson.sequence.length) {
                    showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
                }
            }
        } else if (e.key === 'Escape') {
            preventDefault = false;
        } else {
            if (lessonInstruction) {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
            }
        }
    }
    if (preventDefault) {
        e.preventDefault();
    }
}