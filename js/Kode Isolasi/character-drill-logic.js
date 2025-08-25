// js/character-drill-logic.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { highlightKeyOnKeyboard, clearKeyboardHighlights } from './learn-typing-ui.js';
// Tambahkan impor yang diperlukan untuk fungsi reset
import {
    animateJellyEffect,
    showLessonCompleteNotification,
    highlightWrongKeyOnKeyboard,
} from './learn-typing-ui.js';
import { setIsCorrectInputAnimationActive } from './learn-typing.js';

let inlineKeyElements = [];

function createInlineKeyElement(keyChar, instructionContainer) {
    const keyEl = document.createElement('span');
    keyEl.classList.add('instruction-key', 'fade-in');
    keyEl.id = `inlineKey${keyChar.toUpperCase()}`;
    keyEl.textContent = keyChar;
    instructionContainer.appendChild(keyEl);
    return keyEl;
}

export function renderCharacterDrill(lessonData, lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer, currentStepIndex) {
    if (!lessonData || !lessonInstruction) return;

    lessonInstruction.innerHTML = '';
    const currentStep = lessonData.steps[currentStepIndex];
    if (!currentStep) return;

    const instructionParts = currentStep.instruction.split(/({{.*?}})/g);
    inlineKeyElements = [];

    instructionParts.forEach(part => {
        const match = part.match(/{{(.*?)}}/);
        if (match) {
            const keyChar = match[1];
            const inlineKeyEl = createInlineKeyElement(keyChar, lessonInstruction);
            inlineKeyElements.push(inlineKeyEl);

            clearKeyboardHighlights(keyboardContainer);
            highlightKeyOnKeyboard(keyboardContainer, keyChar);
            if (setAnimatingKey) {
                setAnimatingKey(keyboardContainer.querySelector(`.key[data-key="${keyChar.toLowerCase()}"]`));
            }
            if (renderHandVisualizer) {
                renderHandVisualizer(keyChar);
            }
        } else {
            const textNode = document.createTextNode(part);
            lessonInstruction.appendChild(textNode);
        }
    });
}

export function cleanupCharacterDrillElements(lessonInstruction) {
    inlineKeyElements = [];
    lessonInstruction.innerHTML = '';
}

export function handleCharacterDrillInput({
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

export function resetCharacterDrillState() {
    const lessonInstruction = document.getElementById('lesson-instruction');
    if (lessonInstruction) {
        cleanupCharacterDrillElements(lessonInstruction);
    }
}