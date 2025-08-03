// js/learn-typing.js
import { lessons } from './learn-typing-lessons.js';
import {
    createKeyboard,
    renderLesson,
    resetLesson2State,
    resetLesson3State,
    showLessonCompleteNotification,
    highlightKeyOnKeyboard,
} from './learn-typing-logic.js';
import { initDOMAndState, getState, updateState, getHiddenInput } from './learn-typing-state.js';
import { keyLayout } from './keyboard-layout.js';
import { handleKeyboardInput } from './input-handler.js';
import { handleLesson3Input } from './lesson3-logic.js';

document.addEventListener('DOMContentLoaded', () => {
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
        thumbAnimationContainer,
        successAnimationSvg,
        circlePath,
        checkPath,
        hiddenInput,
    } = initDOMAndState();

    if (!keyboardContainer || !lessonCompleteNotification) {
        console.error("ERROR: Elemen DOM kunci (keyboard atau notifikasi) tidak ditemukan. Aplikasi tidak dapat berjalan.");
        return;
    }

    const domElements = {
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
        thumbAnimationContainer,
        successAnimationSvg,
        circlePath,
        checkPath,
        hiddenInput,
    };

    function doRenderLessonAndFocus(feedbackIndex = -1, isCorrect = null) {
        const currentLessonIndex = getState('currentLessonIndex');
        const currentStepIndex = getState('currentStepIndex');
        const currentCharIndex = getState('currentCharIndex');
        const waitingForAnim = getState('waitingForAnim');

        if (lessonCompleteNotification) {
            lessonCompleteNotification.classList.remove('active');
            lessonCompleteNotification.style.display = 'none';
        }
        if (keyboardContainer) {
            keyboardContainer.style.display = '';
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
            isCorrect
        });

        const input = getHiddenInput();
        if (input && !lessonCompleteNotification.classList.contains('active')) {
            setTimeout(() => input.focus(), 0);
        }
    }

    function resetCurrentLessonState() {
        updateState('currentCharIndex', 0);
        updateState('currentStepIndex', 0);
        updateState('waitingForAnim', false);
        updateState('lesson2Finished', false);
        updateState('lesson3Finished', false);
        
        resetLesson2State(keyboardContainer);
        resetLesson3State(keyboardContainer);
    }
    
    function goToNextLesson() {
        let currentLessonIndex = getState('currentLessonIndex');
        if (currentLessonIndex < lessons.length - 1) {
            updateState('currentLessonIndex', currentLessonIndex + 1);
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        } else {
            console.log("Semua pelajaran selesai!");
        }
    }
    
    // --- SETUP AWAL APLIKASI, HANYA DIPANGGIL SEKALI ---
    createKeyboard(keyboardContainer, keyLayout); // MENGGUNAKAN keyLayout YANG DI-IMPORT

    resetCurrentLessonState();
    doRenderLessonAndFocus();
    // ---------------------------------------------------

    window.addEventListener('focus', () => {
        const input = getHiddenInput();
        if (input && !lessonCompleteNotification.classList.contains('active')) {
            if (document.activeElement !== input) {
                input.focus();
            }
        }
    });

    document.addEventListener('mousedown', (e) => {
        const clickedElement = e.target;
        const isNavigationButton = clickedElement.closest('.navigation-buttons') !== null;
        const isNotificationActive = lessonCompleteNotification && lessonCompleteNotification.classList.contains('active');

        if (!isNotificationActive && !isNavigationButton && clickedElement.closest('#virtual-keyboard') === null) {
            const input = getHiddenInput();
            if (input && document.activeElement !== input) {
                setTimeout(() => {
                    input.focus();
                }, 10);
            }
        }
    });

    prevLessonBtn.addEventListener('click', () => {
        let currentLessonIndex = getState('currentLessonIndex');
        if (currentLessonIndex > 0) {
            updateState('currentLessonIndex', currentLessonIndex - 1);
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        }
    });

    nextLessonBtn.addEventListener('click', () => {
        setTimeout(() => {
            goToNextLesson();
        }, 50);
    });

    continueBtn.addEventListener('click', () => {
        if (lessonCompleteNotification) {
            lessonCompleteNotification.classList.remove('active');
            setTimeout(() => {
                lessonCompleteNotification.style.display = 'none';
                if (domElements.lessonHeader) {
                    domElements.lessonHeader.style.display = '';
                }
                
                if (domElements.prevLessonBtn) domElements.prevLessonBtn.style.display = '';
                if (domElements.nextLessonBtn) domElements.nextLessonBtn.style.display = '';
                
                const input = getHiddenInput();
                if (input) {
                    input.style.display = '';
                    input.focus();
                }

                goToNextLesson();
            }, 500);
        }
    });

    const input = getHiddenInput();
    if (input) {
        input.addEventListener('keydown', (e) => {
            handleKeyboardInput(e, domElements, doRenderLessonAndFocus);
        });
    }

    if (lessonInstruction) {
        lessonInstruction.addEventListener('lesson2-finished', (event) => {
            updateState('lesson2Finished', true);
            const currentLessonIndex = getState('currentLessonIndex');
            showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
        });
        
        lessonInstruction.addEventListener('lesson3-finished', (event) => {
            updateState('lesson3Finished', true);
            const currentLessonIndex = getState('currentLessonIndex');
            showLessonCompleteNotification(lessons, currentLessonIndex, domElements);
        });
    }
});