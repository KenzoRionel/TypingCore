// js/input-handler.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import {
    showLessonCompleteNotification,
    highlightWrongKeyOnKeyboard,
    animateJellyEffect,
    animateAllBordersOnCorrectInput,
} from './learn-typing-ui.js';
import { handleLesson4Input } from './lesson4-logic.js';
import { setIsCorrectInputAnimationActive } from './learn-typing.js';
import { handleSimpleDrillInput } from './simple-drill-logic.js';
import { handleCharacterDrillInput } from './character-drill-logic.js';

// --- Fungsi baru untuk menangani input pelajaran character-drill (Pelajaran 0 & 4) ---
function handleCharacterDrillInput({
    e,
    doRenderAndHighlight,
    setAnimationSpeed,
    domElements,
}) {
    const { keyboardContainer, lessonInstruction } = domElements;
    const currentLessonIndex = getState('currentLessonIndex');
    const currentStepIndex = getState('currentStepIndex');
    const currentLesson = lessons[currentLessonIndex];

    const expectedKey = currentLesson.steps[currentStepIndex]?.key;

    if (!expectedKey) {
        return;
    }

    if (e.key.toLowerCase() === expectedKey.toLowerCase()) {
        if (setAnimationSpeed) {
            setAnimationSpeed(15);
            setIsCorrectInputAnimationActive(true);
            setTimeout(() => setIsCorrectInputAnimationActive(false), 50);
        }
        
        const keyElement = keyboardContainer.querySelector(`.key[data-key="${expectedKey.toLowerCase()}"]`);
        const onAnimationEnd = () => {
            updateState('waitingForAnim', false);
            updateState('currentStepIndex', currentStepIndex + 1);
            doRenderAndHighlight();
            if (getState('currentStepIndex') >= currentLesson.steps.length) {
                showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
            }
        };

        if (keyElement) {
            animateJellyEffect(keyElement, onAnimationEnd);
            updateState('waitingForAnim', true);
        } else {
            onAnimationEnd();
        }
        
        const inlineKeyEl = document.getElementById(`inlineKey${expectedKey.toUpperCase()}`);
        if (inlineKeyEl) {
            inlineKeyEl.classList.add('fade-out');
        }

    } else if (e.key.length === 1 && e.key.toLowerCase() !== expectedKey.toLowerCase()) {
        if (keyboardContainer && highlightWrongKeyOnKeyboard) {
            highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
        }
        if (lessonInstruction) {
            lessonInstruction.classList.add('error-shake');
            setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
        }
    }
}

export function handleKeyboardInput(e, domElements, doRenderAndHighlight, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation) {
    const { lessonInstruction, lessonCompleteNotification, continueBtn, hiddenInput, keyboardContainer, lessonTextDisplay } = domElements;
// Mengecek apakah ada pelajaran yang selesai dengan cara yang lebih fleksibel
    const isAnyLessonFinished = [
        getState('lesson2Finished'),
        getState('lesson3Finished'),
        getState('lesson4Finished'),
        getState('lesson5Finished'),
        getState('lesson6Finished')
    ].some(status => status);

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
    
    let preventDefault = true;
    const lessonType = currentLesson.type;

    if (lessonType === 'character-drill') {
        handleCharacterDrillInput({
            e,
            doRenderAndHighlight,
            setAnimationSpeed,
            domElements,
        });
    } else if (lessonType === 'simple-drill') {
        // Mengarahkan ke handler yang sesuai
        if (currentLessonIndex === 1) {
            handleLesson2Input({ e, doRenderAndHighlight, lessonInstructionEl: lessonInstruction, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect, animateAllBordersOnCorrectInput });
        } else if (currentLessonIndex === 2) {
            handleLesson3Input({ e, doRenderAndHighlight, lessonInstructionEl: lessonInstruction, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect, animateAllBordersOnCorrectInput });
        } else if (currentLessonIndex === 5) {
            handleLesson6Input({ e, doRenderAndHighlight, lessonInstructionEl: lessonInstruction, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect, animateAllBordersOnCorrectInput });
        }
    } else if (lessonType === 'simple-drill') {
        // Mengarahkan ke handler generik
        const lessonStateKey = `lesson${currentLessonIndex + 1}State`;
        const lessonSequenceIndexKey = `lesson${currentLessonIndex + 1}SequenceIndex`;
        const lessonState = getState(lessonStateKey);
        const lessonSequenceIndex = getState(lessonSequenceIndexKey);

        handleSimpleDrillInput({ 
            e, 
            doRenderAndHighlight, 
            dispatchLessonFinishedEvent: (event) => lessonInstruction.dispatchEvent(event), 
            lessonInstructionEl: lessonInstruction, 
            keyboardContainer, 
            setAnimationSpeed, 
            animateJellyEffect, 
            animateAllBordersOnCorrectInput, 
            lessonData: currentLesson,
            lessonState,
            lessonSequenceIndex,
            lessonStateKey,
            lessonSequenceIndexKey
        });
    } else if (lessonType === 'free-typing') {
        handleLesson4Input({ e, doRenderAndHighlight, lessonInstructionEl: lessonInstruction, keyboardContainer, setAnimationSpeed, setAnimatingKey, renderHandVisualizer, clearAnimation, animateJellyEffect });
    } else {
        // Logika Fallback
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

    if (e.key.length === 1 || e.key === 'Backspace') {
        e.preventDefault();
    }
}