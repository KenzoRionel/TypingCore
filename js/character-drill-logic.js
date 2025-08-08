// js/character-drill-logic.js

import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { highlightKeyOnKeyboard, clearKeyboardHighlights } from './learn-typing-ui.js';

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