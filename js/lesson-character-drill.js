// js/lesson-character-drill.js
import { getState, updateState } from './learn-typing-state.js';
import { clearKeyboardHighlights, highlightKeyOnKeyboard, highlightWrongKeyOnKeyboard, setAnimatingKey, animateJellyEffect } from './learn-typing-ui.js';
import { lessons } from './learn-typing-lessons.js';
import { renderHandVisualizer as renderHand } from './hand-visualizer.js';
import { dispatchFinishedEvent } from './learn-typing-logic.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';

function handleNextStep({ currentLessonIndex, lesson, domElements }) {
    const lessonId = `lesson${currentLessonIndex + 1}`;
    const currentState = getState(lessonId);

    if (currentState && !currentState.isFinished) {
        const nextCharIndex = currentState.currentCharIndex + 1;
        updateState(lessonId, { currentCharIndex: nextCharIndex });
        
        // Perbarui progress bar
        const progress = calculateLessonProgress(lesson);
        updateProgressBar(progress, domElements.progressText, domElements.progressBar);

        if (nextCharIndex >= lesson.steps.length) {
            dispatchFinishedEvent(currentLessonIndex);
        } else {
            renderCharacterDrillLesson({
                keyboardContainer: domElements.keyboardContainer,
                lessonInstruction: domElements.lessonInstruction,
                lessonTextDisplay: domElements.lessonTextDisplay
            });
        }
    }
}

function handleIncorrectInput({ e, domElements, expectedKey }) {
    if (e.key?.length === 1 && domElements.keyboardContainer) {
        highlightWrongKeyOnKeyboard(domElements.keyboardContainer, e.key);
    }
    if (domElements.lessonInstruction) {
        domElements.lessonInstruction.classList.add('error-shake');
        setTimeout(() => {
            domElements.lessonInstruction.classList.remove('error-shake');
            renderCharacterDrillLesson({
                keyboardContainer: domElements.keyboardContainer,
                lessonInstruction: domElements.lessonInstruction,
                lessonTextDisplay: domElements.lessonTextDisplay
            });
        }, 200);
    } else {
        renderCharacterDrillLesson({
            keyboardContainer: domElements.keyboardContainer,
            lessonInstruction: domElements.lessonInstruction,
            lessonTextDisplay: domElements.lessonTextDisplay
        });
    }
}

export function renderCharacterDrillLesson({ keyboardContainer, lessonInstruction, lessonTextDisplay }) {
    if (!lessonInstruction || !lessonTextDisplay || !keyboardContainer) return;
    
    const currentLessonIndex = getState('currentLessonIndex');
    const lesson = lessons[currentLessonIndex];
    if (!lesson || !lesson.steps) return;

    const lessonId = `lesson${currentLessonIndex + 1}`;
    const lessonState = getState(lessonId) || { currentCharIndex: 0 };
    const { currentCharIndex } = lessonState;

    try {
        clearKeyboardHighlights(keyboardContainer);
        setAnimatingKey(null);
        
        lessonTextDisplay.innerHTML = '';
        const currentStep = lesson.steps[currentCharIndex];
        
        if (currentStep) {
            const currentKey = currentStep.key;
            
            // ✅ PERBAIKAN: Gunakan requestAnimationFrame untuk memastikan posisi dihitung dengan benar.
            requestAnimationFrame(() => {
                renderHand(currentKey);
            });
            
            if (lessonInstruction) {
                const displayText = currentStep?.instruction || currentKey;
                lessonInstruction.innerHTML = displayText || '';
            }

            highlightKeyOnKeyboard(keyboardContainer, currentKey);
            const keyElement = keyboardContainer.querySelector(`[data-key="${currentKey.toLowerCase()}"]`);
            setAnimatingKey(keyElement);
        } else {
            if (lessonInstruction) {
                lessonInstruction.innerHTML = '';
            }
            renderHand(null);

            const currentLessonFinishedState = getState(lessonId)?.isFinished;
            if (!currentLessonFinishedState) {
                dispatchFinishedEvent(getState('currentLessonIndex'));
                updateState(lessonId, { isFinished: true });
            }
        }
    } catch (error) {
        console.error("Error rendering instruction:", error);
    }
}

export function handleCharacterDrillInput({
    e,
    domElements,
    animationFunctions
}) {
    if (!e || !domElements) return {};

    const currentLessonIndex = getState('currentLessonIndex');
    const lesson = lessons[currentLessonIndex];
    const lessonId = `lesson${currentLessonIndex + 1}`;
    
    const currentState = getState(lessonId) || { currentCharIndex: 0, isFinished: false };

    if (!lesson?.steps || currentState.currentCharIndex >= lesson.steps.length || currentState.isFinished) return {};

    const expectedKey = lesson.steps[currentState.currentCharIndex]?.key?.toLowerCase() || '';
    const pressedKey = e.key?.toLowerCase() || '';

    if (pressedKey === expectedKey) {
        // PERBAIKAN: Blokir input dan tunda langkah berikutnya untuk memberi waktu pada animasi.
        updateState('isTransitioning', true);

        const inlineKey = domElements.lessonInstruction.querySelector('.keyboard-inline-key');
        if (inlineKey) {
            inlineKey.classList.add('fade-out');
        }

        const keyElement = domElements.keyboardContainer?.querySelector(`.key[data-key="${pressedKey}"]`);
        
        if (keyElement && animationFunctions?.animateJellyEffect) {
            animationFunctions.animateJellyEffect(keyElement);
        }

        if (animationFunctions?.setAnimationSpeed) {
            animationFunctions.setAnimationSpeed(15);
            animationFunctions.setIsCorrectInputAnimationActive(true);
            setTimeout(() => {
                animationFunctions.setIsCorrectInputAnimationActive(false);
            }, 50);
        }
        
        // Tunda langkah berikutnya agar animasi fade-out terlihat.
        setTimeout(() => {
            handleNextStep({ currentLessonIndex, lesson, domElements });
            updateState('isTransitioning', false);
        }, 400); // Sesuaikan dengan durasi animasi fade-out (0.4s)

        return {};

    } else {
        handleIncorrectInput({
            e,
            domElements,
            expectedKey
        });
        
        return {};
    }
}

export function resetCharacterDrillState() {
    const lessonId = `lesson${getState('currentLessonIndex') + 1}`;
    updateState(lessonId, { currentCharIndex: 0, isFinished: false });
}