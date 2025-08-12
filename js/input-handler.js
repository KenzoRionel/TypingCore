// js/input-handler.js
import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { handleFreeTypingInput } from './lesson-free-typing.js';
import { handleSimpleDrillInput } from './lesson-simple-drill.js';
import { handleCharacterDrillInput } from './lesson-character-drill.js';
import { getDOMReferences } from './utils/dom-elements.js';
import { 
    setIsCorrectInputAnimationActive,
    setAnimationSpeed,
    animateJellyEffect,
    animateAllBordersOnCorrectInput,
    highlightWrongKeyOnKeyboard,
} from './learn-typing-ui.js';

let currentKeyDownHandler = null;
let currentKeyUpHandler = null;

// ✅ Perbaikan: Handler terpisah untuk keydown dan keyup
const handleKeyDown = (e) => {
    const domElements = getDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');
    const isTransitioning = getState('isTransitioning'); 
    
    if (domElements.lessonCompleteNotification?.classList.contains('active')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            domElements.continueBtn?.click();
        }
        return;
    }

    if (isTransitioning) {
        e.preventDefault();
        return;
    }

    const currentLesson = lessons[currentLessonIndex];
    if (!currentLesson) {
        console.error('handleKeyDown: Pelajaran tidak ditemukan atau indeks tidak valid.');
        return; 
    }

    const animationFunctions = {
        setIsCorrectInputAnimationActive,
        setAnimationSpeed,
        animateJellyEffect,
        animateAllBordersOnCorrectInput,
        highlightWrongKeyOnKeyboard,
    };

    // Mencegah perilaku default hanya untuk tombol yang relevan
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ' || (currentLesson.requiredHoldKey && e.key.toLowerCase() === currentLesson.requiredHoldKey)) {
        e.preventDefault();
    }

    const handlerProps = {
        e,
        domElements,
        currentLessonIndex,
        animationFunctions,
        type: 'keydown',
    };

    switch (currentLesson.type) {
        case 'character-drill':
            handleCharacterDrillInput(handlerProps);
            break;
        case 'simple-drill':
            handleSimpleDrillInput(handlerProps);
            break;
        case 'free-typing':
            handleFreeTypingInput(handlerProps);
            break;
        default:
            console.error(`Tipe pelajaran tidak dikenal: ${currentLesson.type}`);
            break;
    }
};

const handleKeyUp = (e) => {
    const domElements = getDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');
    const currentLesson = lessons[currentLessonIndex];

    if (!currentLesson) return;

    if (currentLesson.requiredHoldKey) {
        if (e.key.toLowerCase() === currentLesson.requiredHoldKey) {
            e.preventDefault();
            const handlerProps = {
                e,
                domElements,
                currentLessonIndex,
                animationFunctions: {},
                type: 'keyup',
            };
            handleFreeTypingInput(handlerProps);
        }
    }
};

export function attachInputHandlers() {
    if (currentKeyDownHandler) {
        document.removeEventListener('keydown', currentKeyDownHandler);
    }
    if (currentKeyUpHandler) {
        document.removeEventListener('keyup', currentKeyUpHandler);
    }

    currentKeyDownHandler = handleKeyDown;
    currentKeyUpHandler = handleKeyUp;
    
    document.addEventListener('keydown', currentKeyDownHandler);
    document.addEventListener('keyup', currentKeyUpHandler);
}