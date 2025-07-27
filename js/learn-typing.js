// learn-typing.js (DIUPDATE)

import { lessons } from './learn-typing-lessons.js';
import {
    createKeyboard,
    renderLesson,
    resetLesson2State,
    showLessonCompleteModal // IMPORT FUNGSI INI KEMBALI DI SINI
} from './learn-typing-logic.js';
import { initDOMAndState, getState, updateState, getHiddenInput } from './learn-typing-state.js';
import { keyLayout } from './keyboard-layout.js';
import { handleKeyboardInput } from './input-handler.js';

document.addEventListener('DOMContentLoaded', () => {
    const {
        keyboardContainer,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        modal,
        continueBtn,
        hiddenInput,
    } = initDOMAndState();

    if (!keyboardContainer) {
        return;
    }

    // Buat objek domElements agar mudah diteruskan ke input-handler
    const domElements = {
        keyboardContainer,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        modal,
        continueBtn,
        hiddenInput,
    };

    // Fungsi utama untuk merender pelajaran dan memfokuskan hiddenInput
    function doRenderLessonAndFocus(feedbackIndex = -1, isCorrect = null) {
        const currentLessonIndex = getState('currentLessonIndex');
        const currentStepIndex = getState('currentStepIndex');
        const currentCharIndex = getState('currentCharIndex');
        const waitingForAnim = getState('waitingForAnim');

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

    // Fokus hiddenInput saat jendela kembali aktif
    window.addEventListener('focus', () => {
        const input = getHiddenInput();
        if (input) {
            setTimeout(() => {
                if (document.activeElement !== input) {
                    input.focus();
                }
            }, 10);
        }
    });

    // Fokus hiddenInput saat klik di luar tombol navigasi/modal
    document.addEventListener('mousedown', (e) => {
        const clickedElement = e.target;
        const isDirectlyNavigationButton = clickedElement.tagName === 'BUTTON' && clickedElement.closest('.navigation-buttons');
        const isModalContentActive = clickedElement.closest('.modal-overlay') && modal && modal.style.display === 'flex';

        const isUIElementThatShouldKeepFocus = isDirectlyNavigationButton || isModalContentActive;
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

    // Navigasi pelajaran
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

    // Tombol Lanjutkan di modal
    continueBtn.addEventListener('click', () => {
        if (modal) {
            modal.style.display = 'none';
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

    // Event handler keydown utama pada hidden input
    const input = getHiddenInput();
    if (input) {
        input.addEventListener('keydown', (e) => {
            // Panggil fungsi handleKeyboardInput dari file terpisah
            handleKeyboardInput(e, domElements, doRenderLessonAndFocus);
        });
    }

    if (lessonInstruction) {
        lessonInstruction.addEventListener('lesson2-finished', (event) => {
            updateState('lesson2Finished', true);
            // Panggil showLessonCompleteModal di sini
            showLessonCompleteModal(modal, continueBtn, keyboardContainer);
        });
    }

    createKeyboard(keyboardContainer, keyLayout);
    resetCurrentLessonState();
    doRenderLessonAndFocus();
});