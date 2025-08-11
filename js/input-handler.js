// js/input-handler.js
import { getState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { handleFreeTypingInput } from './lesson-free-typing.js';
import { handleSimpleDrillInput } from './lesson-simple-drill.js';
import { handleCharacterDrillInput } from './lesson-character-drill.js';
import { renderHandVisualizer } from './hand-visualizer.js';
import { getDOMReferences } from './dom-elements.js';
import { 
    setIsCorrectInputAnimationActive,
    setAnimationSpeed,
    animateJellyEffect,
    animateAllBordersOnCorrectInput,
} from './learn-typing-ui.js';

export function handleKeyboardInput({ e, domElements, animationFunctions }) {
    // Perbaikan: Selalu ambil referensi DOM terbaru di sini
    const updatedDomElements = getDOMReferences();

    const { lessonCompleteNotification, continueBtn } = updatedDomElements;
    const currentLessonIndex = getState('currentLessonIndex');
    const currentLesson = lessons[currentLessonIndex];
    const waitingForAnim = getState('waitingForAnim');

    if (lessonCompleteNotification && lessonCompleteNotification.classList.contains('active')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (continueBtn) continueBtn.click();
        }
        return;
    }

    if (waitingForAnim) {
        e.preventDefault();
        return;
    }

    if (!currentLesson) {
        console.error('handleKeyboardInput: Pelajaran tidak ditemukan atau indeks tidak valid.');
        return; 
    }

    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    const baseProps = {
        e,
        domElements: updatedDomElements, // Gunakan referensi DOM yang terbaru
        animationFunctions,
    };

    switch (currentLesson.type) {
        case 'character-drill':
            handleCharacterDrillInput({
                e,
                domElements: updatedDomElements, // Gunakan referensi DOM yang terbaru
                animationFunctions: {
                    setIsCorrectInputAnimationActive,
                    setAnimationSpeed,
                    animateJellyEffect,
                    animateAllBordersOnCorrectInput,
                }
            });
            break;
        case 'simple-drill':
            handleSimpleDrillInput({ ...baseProps, currentLessonIndex });
            break;
        case 'free-typing':
            handleFreeTypingInput(baseProps);
            break;
        default:
            console.error(`Tipe pelajaran tidak dikenal: ${currentLesson.type}`);
            break;
    }
}