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
    const {
        keyboardContainer,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        // Hapus 'modal' dari destructuring karena kita tidak lagi menggunakan elemen modal itu
        // Tambahkan elemen notifikasi baru
        lessonCompleteNotification,
        continueBtn, // ContinueBtn masih relevan karena ada di dalam notifikasi
        nextLessonPreview, // Pastikan ini juga diambil dari initDOMAndState
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
        // UBAH: Gunakan lessonCompleteNotification, bukan modal
        lessonCompleteNotification,
        continueBtn,
        nextLessonPreview, // Pastikan ini ada di domElements
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
            lessonCompleteNotification.style.display = 'none'; // Sembunyikan secara eksplisit
        }
        // Pastikan keyboard ditampilkan kembali
        if (keyboardContainer) {
            keyboardContainer.style.display = ''; // Reset ke default display (biasanya block atau flex)
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

    // Fokus hiddenInput saat jendela kembali aktif
    window.addEventListener('focus', () => {
        const input = getHiddenInput();
        // Hanya fokus jika notifikasi tidak aktif
        if (input && (!lessonCompleteNotification || !lessonCompleteNotification.classList.contains('active'))) {
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
        // UBAH: Cek notifikasi baru, bukan modal
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

    // Tombol Lanjutkan di notifikasi
    continueBtn.addEventListener('click', () => {
        // UBAH: Sembunyikan notifikasi dengan menghapus class 'active'
        if (lessonCompleteNotification) {
            lessonCompleteNotification.classList.remove('active');
            // Sedikit delay untuk animasi, lalu set display none
            setTimeout(() => {
                lessonCompleteNotification.style.display = 'none';
            }, 500); // Sesuaikan dengan durasi transisi CSS
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
            // Panggil showLessonCompleteNotification di sini
            const currentLessonIndex = getState('currentLessonIndex');
            showLessonCompleteNotification(
                lessonCompleteNotification,
                continueBtn,
                keyboardContainer,
                lessons,
                currentLessonIndex,
                nextLessonPreview
            );
        });
    }

    createKeyboard(keyboardContainer, keyLayout);
    resetCurrentLessonState();
    doRenderLessonAndFocus();
});