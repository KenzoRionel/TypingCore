// js/learn-typing.js

import { lessons } from './learn-typing-lessons.js';
import {
    renderLesson,
    resetLesson2State,
    resetLesson3State,
    resetLesson4State,
    resetLesson5State, // ✅ Import fungsi resetLesson5State
    resetLesson6State, // ✅ Import fungsi resetLesson6State
} from './learn-typing-logic.js';
import {
    createKeyboard,
    showLessonCompleteNotification,
    highlightKeyOnKeyboard,
    clearKeyboardHighlights,
    animateAllBordersOnCorrectInput,
} from './learn-typing-ui.js';
import { initDOMAndState, getState, updateState, getHiddenInput } from './learn-typing-state.js';
import { keyLayout } from './keyboard-layout.js';
import { handleKeyboardInput } from './input-handler.js';
import { renderHandVisualizer } from './hand-visualizer.js';
// PERBAIKAN: Import updateProgressBar
import { updateProgressBar } from './progress-bar.js';

let rotation = 0;
const defaultAnimationSpeed = 3;
let animationSpeed = defaultAnimationSpeed;
let animatingKeyElement = null;
let lessonSpeedTimeout = null;
export let isCorrectInputAnimationActive = false;

function setAnimationSpeed(speed) {
    if (speed === 15) {
        animationSpeed = speed;
        if (lessonSpeedTimeout) {
            clearTimeout(lessonSpeedTimeout);
        }
        lessonSpeedTimeout = setTimeout(() => {
            animationSpeed = defaultAnimationSpeed;
        }, 50);
    } else {
        animationSpeed = speed;
    }
}

function setAnimatingKey(keyElement) {
    clearAnimation();
    if (keyElement) {
        animatingKeyElement = keyElement;
        animatingKeyElement.classList.add('is-animating');
    } else {
        animatingKeyElement = null;
    }
}

function clearAnimation() {
    if (animatingKeyElement) {
        animatingKeyElement.classList.remove('is-animating');
        animatingKeyElement.style.borderImageSource = '';
    }
    animatingKeyElement = null;
}

function animateBorder() {
    if (animatingKeyElement) {
        rotation += animationSpeed;

        let startColor = 'rgba(0, 123, 255, 0.8)';
        let endColor = 'rgba(255, 255, 255, 1)';
        
        if (isCorrectInputAnimationActive) {
            startColor = 'rgba(253, 216, 53, 1)';
            endColor = 'rgba(200, 255, 0, 1)';
        }

        const gradient = `conic-gradient(from ${rotation}deg, ${startColor} 0%, ${endColor} 25%, ${startColor} 50%, ${endColor} 75%, ${startColor} 100%)`;
        animatingKeyElement.style.borderImageSource = gradient;
    }
    window.requestAnimationFrame(animateBorder);
}

export function setIsCorrectInputAnimationActive(value) {
    isCorrectInputAnimationActive = value;
}

document.addEventListener('DOMContentLoaded', () => {
    const domElements = initDOMAndState();
    const {
        keyboardContainer,
        lessonHeader,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        lessonCompleteNotification,
        continueBtn,
        nextLessonPreview,
        progressBar,
        progressText,
        progressContainerWrapper,
        thumbAnimationContainer,
        successAnimationSvg,
        circlePath,
        checkPath,
        hiddenInput,
        retryLessonBtn
    } = domElements;

    if (!keyboardContainer || !lessonCompleteNotification) {
        console.error("ERROR: Elemen DOM kunci (keyboard atau notifikasi) tidak ditemukan. Aplikasi tidak dapat berjalan.");
        return;
    }

    window.requestAnimationFrame(animateBorder);

    function doRenderLessonAndFocus(feedbackIndex = -1, isCorrect = null) {
        const currentLessonIndex = getState('currentLessonIndex');
        const currentStepIndex = getState('currentStepIndex');
        const currentCharIndex = getState('currentCharIndex');
        const waitingForAnim = getState('waitingForAnim');

        const isLessonFinished = (currentLessonIndex === 1 && getState('lesson2Finished')) ||
            (currentLessonIndex === 2 && getState('lesson3Finished')) ||
            (currentLessonIndex === 3 && getState('lesson4Finished')) ||
            (currentLessonIndex === 4 && getState('lesson5Finished')) || // ✅ Tambahkan pengecekan untuk Pelajaran 5
            (currentLessonIndex === 5 && getState('lesson6Finished')); // ✅ Tambahkan pengecekan untuk Pelajaran 6

        if (isLessonFinished) {
            return;
        }

        renderLesson({
            lessons,
            currentLessonIndex,
            currentStepIndex,
            currentCharIndex,
            waitingForAnim,
            keyboardContainer,
            lessonTitle,
            lessonInstruction,
            lessonTextDisplay,
            feedbackIndex,
            isCorrect,
            navigationButtonsContainer: domElements.navigationButtonsContainer,
            lessonHeader: domElements.lessonHeader,
            setAnimatingKey,
            clearAnimation,
            renderHandVisualizer,
        });

        const input = getHiddenInput();
        if (input) {
            input.focus();
        }
    }

    // PERBAIKAN: Tambahkan parameter domElements
    function resetCurrentLessonState(domElements) {
        updateState('currentCharIndex', 0);
        updateState('currentStepIndex', 0);
        updateState('waitingForAnim', false);
        updateState('lesson2Finished', false);
        updateState('lesson3Finished', false);
        updateState('lesson4Finished', false);
        updateState('lesson5Finished', false); // ✅ Reset state pelajaran 5
        updateState('lesson6Finished', false); // ✅ Reset state pelajaran 6
        setIsCorrectInputAnimationActive(false);

        resetLesson2State(clearAnimation);
        resetLesson3State(clearAnimation);
        resetLesson4State(clearAnimation);
        resetLesson5State(clearAnimation); // ✅ Panggil fungsi resetLesson5State
        resetLesson6State(clearAnimation); // ✅ Panggil fungsi resetLesson6State

        createKeyboard(keyboardContainer, keyLayout);

        // PERBAIKAN: Reset progress bar
        updateProgressBar(0, domElements.progressText, domElements.progressBar);
    }

    function goToNextLesson() {
        let currentLessonIndex = getState('currentLessonIndex');
        if (currentLessonIndex < lessons.length - 1) {
            updateState('currentLessonIndex', currentLessonIndex + 1);
            // PERBAIKAN: Teruskan domElements ke resetCurrentLessonState
            resetCurrentLessonState(domElements);
            clearAnimation();
            clearKeyboardHighlights(keyboardContainer);
            doRenderLessonAndFocus();
        } else {
            console.log("Semua pelajaran selesai!");
        }
    }

    function showLessonElements() {
        if (domElements.lessonHeader) domElements.lessonHeader.style.display = '';
        if (domElements.prevLessonBtn) domElements.prevLessonBtn.style.display = '';
        if (domElements.nextLessonBtn) domElements.nextLessonBtn.style.display = '';
        if (domElements.keyboardContainer) domElements.keyboardContainer.style.display = '';
        if (domElements.lessonTextDisplay) domElements.lessonTextDisplay.style.display = '';
        if (domElements.progressContainerWrapper) domElements.progressContainerWrapper.style.display = '';
        const input = getHiddenInput();
        if (input) {
            input.style.display = '';
            input.focus();
        }
    }

    createKeyboard(keyboardContainer, keyLayout);

    // PERBAIKAN: Teruskan domElements ke resetCurrentLessonState
    resetCurrentLessonState(domElements);
    doRenderLessonAndFocus();

    const input = getHiddenInput();
    if (input) {
        input.addEventListener('keydown', (e) => {
            handleKeyboardInput(
                e,
                domElements,
                doRenderLessonAndFocus,
                setAnimationSpeed,
                setAnimatingKey,
                renderHandVisualizer,
                clearAnimation,
                animateAllBordersOnCorrectInput
            );
        });
    }

    document.body.addEventListener('click', () => {
        const input = getHiddenInput();
        if (input && document.activeElement !== input) {
            input.focus();
        }
    });

    prevLessonBtn.addEventListener('click', () => {
        let currentLessonIndex = getState('currentLessonIndex');
        if (currentLessonIndex > 0) {
            updateState('currentLessonIndex', currentLessonIndex - 1);
            // PERBAIKAN: Teruskan domElements ke resetCurrentLessonState
            resetCurrentLessonState(domElements);
            doRenderLessonAndFocus();
        }
    });

    nextLessonBtn.addEventListener('click', goToNextLesson);

    continueBtn.addEventListener('click', () => {
        if (lessonCompleteNotification) {
            lessonCompleteNotification.classList.remove('active');
            clearAnimation();
            clearKeyboardHighlights(domElements.keyboardContainer);
            setTimeout(() => {
                lessonCompleteNotification.style.display = 'none';
                showLessonElements();
                goToNextLesson();
            }, 500);
        }
    });

    if (retryLessonBtn) {
        retryLessonBtn.addEventListener('click', () => {
            if (lessonCompleteNotification) {
                lessonCompleteNotification.classList.remove('active');
                // PERBAIKAN: Teruskan domElements ke resetCurrentLessonState
                resetCurrentLessonState(domElements);
                setTimeout(() => {
                    lessonCompleteNotification.style.display = 'none';
                    showLessonElements();
                    doRenderLessonAndFocus();
                }, 500);
            }
        });
    }

    if (lessonInstruction) {
        const handleLessonFinished = (event) => {
            const lessonNumber = parseInt(event.type.replace('lesson', '').replace('-finished', ''), 10);
            updateState(`lesson${lessonNumber}Finished`, true);
            const currentLessonIndex = getState('currentLessonIndex');
            showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
        };
        lessonInstruction.addEventListener('lesson2-finished', handleLessonFinished);
        lessonInstruction.addEventListener('lesson3-finished', handleLessonFinished);
        lessonInstruction.addEventListener('lesson4-finished', handleLessonFinished);
        lessonInstruction.addEventListener('lesson6-finished', handleLessonFinished); // ✅ Tambahkan listener untuk Pelajaran 6
    }
});