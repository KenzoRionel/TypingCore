// learn-typing.js
import { lessons } from './learn-typing-lessons.js';
import {
    renderLesson,
    resetLesson2State,
    resetLesson3State,
    resetLesson4State,
} from './learn-typing-logic.js';
import {
    createKeyboard,
    showLessonCompleteNotification,
    highlightKeyOnKeyboard,
} from './learn-typing-ui.js';
import { initDOMAndState, getState, updateState, getHiddenInput } from './learn-typing-state.js';
import { keyLayout } from './keyboard-layout.js';
import { handleKeyboardInput } from './input-handler.js';
import { handleLesson3Input } from './lesson3-logic.js';
import { handleLesson4Input } from './lesson4-logic.js';

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
        progressContainerWrapper, // Ditambahkan: Wadah progress bar utama
        thumbAnimationContainer,
        successAnimationSvg,
        circlePath,
        checkPath,
        hiddenInput,
        navigationButtonsContainer
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
        progressContainerWrapper, // Ditambahkan: Sekarang ada di objek
        thumbAnimationContainer,
        successAnimationSvg,
        circlePath,
        checkPath,
        hiddenInput,
        navigationButtonsContainer,
    };

    function doRenderLessonAndFocus(feedbackIndex = -1, isCorrect = null) {
        const currentLessonIndex = getState('currentLessonIndex');
        const currentStepIndex = getState('currentStepIndex');
        const currentCharIndex = getState('currentCharIndex');
        const waitingForAnim = getState('waitingForAnim');

        const isLessonFinished = (currentLessonIndex === 1 && getState('lesson2Finished')) || 
                                     (currentLessonIndex === 2 && getState('lesson3Finished')) || 
                                     (currentLessonIndex === 3 && getState('lesson4Finished'));

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
        });
        
        const input = getHiddenInput();
        if (input) {
            input.focus();
        }
    }

    function resetCurrentLessonState() {
        updateState('currentCharIndex', 0);
        updateState('currentStepIndex', 0);
        updateState('waitingForAnim', false);
        updateState('lesson2Finished', false);
        updateState('lesson3Finished', false);
        updateState('lesson4Finished', false);
        
        resetLesson2State(keyboardContainer);
        resetLesson3State(keyboardContainer);
        resetLesson4State(keyboardContainer);
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

    function showLessonElements() {
        if (domElements.lessonHeader) domElements.lessonHeader.style.display = '';
        if (domElements.prevLessonBtn) domElements.prevLessonBtn.style.display = '';
        if (domElements.nextLessonBtn) domElements.nextLessonBtn.style.display = '';
        if (domElements.keyboardContainer) domElements.keyboardContainer.style.display = '';
        if (domElements.lessonTextDisplay) domElements.lessonTextDisplay.style.display = '';
        if (domElements.progressContainerWrapper) domElements.progressContainerWrapper.style.display = ''; // Ditambahkan: Tampilkan kembali progress bar
        const input = getHiddenInput();
        if (input) {
            input.style.display = '';
            input.focus();
        }
    }
    
    // --- SETUP AWAL APLIKASI, HANYA DIPANGGIL SEKALI ---
    createKeyboard(keyboardContainer, keyLayout);

    resetCurrentLessonState();
    doRenderLessonAndFocus();
    
    const input = getHiddenInput();
    if (input) {
        input.addEventListener('keydown', (e) => {
            handleKeyboardInput(e, domElements, doRenderLessonAndFocus);
        });
    }
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
                input.focus();
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

    nextLessonBtn.addEventListener('click', goToNextLesson);

    continueBtn.addEventListener('click', () => {
        if (lessonCompleteNotification) {
            lessonCompleteNotification.classList.remove('active');
            setTimeout(() => {
                lessonCompleteNotification.style.display = 'none';
                showLessonElements();
                goToNextLesson();
            }, 500);
        }
    });

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
    }
});