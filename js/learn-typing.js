// learn-typing.js (DIUPDATE)

import { lessons } from './learn-typing-lessons.js';
import {
    createKeyboard,
    renderLesson,
    resetLesson2State,
    showLessonCompleteNotification // UBAH IMPORT DARI showLessonCompleteModal
} from './learn-typing-logic.js';
import { initDOMAndState, getState, updateState, getHiddenInput } from './learn-typing-state.js';
import { keyLayout } from './keyboard-layout.js';
import { handleKeyboardInput } from './input-handler.js';

document.addEventListener('DOMContentLoaded', () => {
    // TAMBAH: Destructuring semua elemen baru dari initDOMAndState
    const {
        keyboardContainer,
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
        successAnimationSvg, // TAMBAHKAN INI
        circlePath,          // TAMBAHKAN INI
        checkPath,           // TAMBAHKAN INI
        hiddenInput,
    } = initDOMAndState();

    // Verifikasi penting: Pastikan semua elemen kunci ada
    if (!keyboardContainer || !lessonCompleteNotification) {
        console.error("ERROR: Elemen DOM kunci (keyboard atau notifikasi) tidak ditemukan. Aplikasi tidak dapat berjalan.");
        return;
    }

    // Buat objek domElements yang lengkap
    const domElements = {
        keyboardContainer,
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
        successAnimationSvg, // TAMBAHKAN INI
        circlePath,          // TAMBAHKAN INI
        checkPath,           // TAMBAHKAN INI
        hiddenInput,
    };

    // Fungsi utama untuk merender pelajaran dan memfokuskan hiddenInput
    function doRenderLessonAndFocus(feedbackIndex = -1, isCorrect = null) {
        const currentLessonIndex = getState('currentLessonIndex');
        const currentStepIndex = getState('currentStepIndex');
        const currentCharIndex = getState('currentCharIndex');
        const waitingForAnim = getState('waitingForAnim');

        // PASTIKAN NOTIFIKASI DISEMBUNYIKAN SAAT MERENDER PELAJARAN BARU
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
        if (input) {
            setTimeout(() => input.focus(), 0);
        }
    }

    // Fungsi untuk mereset state pelajaran saat ini
    function resetCurrentLessonState() {
        updateState('currentCharIndex', 0);
        updateState('currentStepIndex', 0);
        updateState('waitingForAnim', false);
        updateState('lesson2Finished', false);
        resetLesson2State(keyboardContainer);
    }

    // 4. EVENT LISTENERS UTAMA
    window.addEventListener('focus', () => {
        const input = getHiddenInput();
        if (input && (!lessonCompleteNotification || !lessonCompleteNotification.classList.contains('active'))) {
            setTimeout(() => {
                if (document.activeElement !== input) {
                    input.focus();
                }
            }, 10);
        }
    });

    document.addEventListener('mousedown', (e) => {
        const clickedElement = e.target;
        const isDirectlyNavigationButton = clickedElement.tagName === 'BUTTON' && clickedElement.closest('.navigation-buttons');
        const isNotificationActive = clickedElement.closest('.lesson-complete-notification') && lessonCompleteNotification && lessonCompleteNotification.classList.contains('active');

        const isUIElementThatShouldKeepFocus = isDirectlyNavigationButton || isNotificationActive;
        const input = getHiddenInput();

        if (!isUIElementThatShouldKeepFocus) {
            if (input) {
                setTimeout(() => {
                    if (document.activeElement !== input) {
                        input.focus();
                    }
                }, 0);
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
        const input = getHiddenInput();
        if (input) {
            setTimeout(() => input.focus(), 0);
        }
    });

    nextLessonBtn.addEventListener('click', () => {
        let currentLessonIndex = getState('currentLessonIndex');
        if (currentLessonIndex < lessons.length - 1) {
            updateState('currentLessonIndex', currentLessonIndex + 1);
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        }
        const input = getHiddenInput();
        if (input) {
            setTimeout(() => input.focus(), 0);
        }
    });

    continueBtn.addEventListener('click', () => {
        if (lessonCompleteNotification) {
            lessonCompleteNotification.classList.remove('active');
            setTimeout(() => {
                lessonCompleteNotification.style.display = 'none';
            }, 500);
        }
        let currentLessonIndex = getState('currentLessonIndex');
        if (currentLessonIndex < lessons.length - 1) {
            updateState('currentLessonIndex', currentLessonIndex + 1);
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        } else {
            console.log("Semua pelajaran selesai!");
        }
        const input = getHiddenInput();
        if (input) {
            setTimeout(() => input.focus(), 0);
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
    }

    createKeyboard(keyboardContainer, keyLayout);
    resetCurrentLessonState();
    doRenderLessonAndFocus();
});