// learn-typing.js (Diperbaiki)
import { lessons } from './learn-typing-lessons.js';
import {
    createKeyboard,
    renderLesson,
    resetLesson2State,
    handleLesson2Input
} from './learn-typing-logic.js';
import { initDOMAndState, getState, updateState, getHiddenInput } from './learn-typing-state.js'; // Import dari file baru

document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi semua elemen DOM dan state aplikasi dari learn-typing-state.js
    const {
        keyboardContainer,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        modal,
        continueBtn,
        hiddenInput, // Ambil hiddenInput dari sini
        // Variabel state diambil via getState/updateState, tidak perlu didekonstruksi di sini
    } = initDOMAndState();

    if (!keyboardContainer) {
        // initDOMAndState sudah mencetak error, kita hanya perlu menghentikan eksekusi
        return;
    }

    // 3. INISIALISASI KOMPONEN & FUNGSI PEMBANTU
    const keyLayout = [
        ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
        ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
        ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
        ['ShiftLeft', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'ShiftRight'],
        ['ControlLeft', 'MetaLeft', 'AltLeft', '', 'Space', '', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight']
    ];

    // Fungsi utama untuk merender pelajaran dan memfokuskan hiddenInput
    function doRenderLessonAndFocus(feedbackIndex = -1, isCorrect = null) {
        // Ambil state terbaru dari learn-typing-state
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
        // Pastikan hiddenInput sudah terinisialisasi sebelum fokus
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
        updateState('lesson2Finished', false); // Reset flag saat pindah pelajaran
        // Panggil resetLesson2State selalu untuk memastikan bersih
        resetLesson2State(keyboardContainer);
    }

    // Fungsi untuk menampilkan modal selesai pelajaran
    function showLessonCompleteModal() {
        // Hapus highlight tombol keyboard saat modal muncul
        const keys = document.querySelectorAll('#virtual-keyboard .key');
        keys.forEach(key => {
            key.style.animation = 'none';
            key.classList.remove('next-key', 'correct-key', 'wrong-key'); // Hapus semua kelas highlight
        });

        if (modal) {
            setTimeout(() => {
                modal.style.display = 'flex';
                if (continueBtn) {
                    continueBtn.focus();
                } else {
                    console.error('ERROR: Elemen continueBtn tidak ditemukan saat mencoba fokus!');
                }
            }, 600);
        } else {
            console.error('ERROR: Elemen modal (#lesson-complete-modal) tidak ditemukan!');
        }
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
    const input = getHiddenInput(); // Ambil referensi hiddenInput sekali
    if (input) {
        input.addEventListener('keydown', (e) => {
            const currentLessonIndex = getState('currentLessonIndex');
            const currentStepIndex = getState('currentStepIndex');
            const currentCharIndex = getState('currentCharIndex');
            const waitingForAnim = getState('waitingForAnim');
            const lesson2Finished = getState('lesson2Finished');


            // Mencegah input saat modal terbuka atau animasi sedang berjalan
            if ((modal && modal.style.display === 'flex') || waitingForAnim.value || lesson2Finished) {
                e.preventDefault();
                return;
            }

            const currentLesson = lessons[currentLessonIndex];
            let preventDefault = true; // Default untuk mencegah input di hiddenInput

            if (currentLessonIndex === 0) { // Logika Pelajaran 1 (f dan j)
                if (currentStepIndex === 0 && e.key.toLowerCase() === 'f') {
                    updateState('waitingForAnim', true);
                    const inlineKeyF = document.getElementById('inlineKeyF');
                    if (inlineKeyF) {
                        inlineKeyF.classList.add('fade-out');
                        setTimeout(() => {
                            inlineKeyF.style.display = 'none';
                            updateState('waitingForAnim', false);
                            updateState('currentStepIndex', 1);
                            doRenderLessonAndFocus();
                        }, 300);
                    } else { // Fallback jika inlineKeyF tidak ditemukan
                        updateState('waitingForAnim', false);
                        updateState('currentStepIndex', 1);
                        doRenderLessonAndFocus();
                    }
                } else if (currentStepIndex === 1 && e.key.toLowerCase() === 'j') {
                    updateState('waitingForAnim', true);
                    const inlineKeyJ = document.getElementById('inlineKeyJ');
                    if (inlineKeyJ) {
                        inlineKeyJ.classList.add('fade-out');
                        setTimeout(() => {
                            inlineKeyJ.style.display = 'none';
                            updateState('waitingForAnim', false);
                            updateState('currentStepIndex', 2); // Selesai Pelajaran 1
                            doRenderLessonAndFocus();
                            showLessonCompleteModal(); // Panggil fungsi modal
                        }, 300);
                    } else { // Fallback jika inlineKeyJ tidak ditemukan
                        updateState('waitingForAnim', false);
                        updateState('currentStepIndex', 2);
                        doRenderLessonAndFocus();
                        showLessonCompleteModal(); // Panggil fungsi modal
                    }
                } else if (e.key.length === 1) { // Input salah pada Pelajaran 1
                    lessonInstruction.classList.add('error-shake');
                    setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
                    doRenderLessonAndFocus(); // Re-render untuk memastikan highlight tetap benar
                } else {
                    preventDefault = false; // Izinkan tombol non-karakter seperti Shift, Alt, Ctrl
                }
            } else if (currentLessonIndex === 1) { // Logika Pelajaran 2
                handleLesson2Input({
                    e,
                    doRenderAndHighlight: doRenderLessonAndFocus,
                    dispatchLesson2FinishedEvent: (event) => lessonInstruction.dispatchEvent(event),
                    lessonInstructionEl: lessonInstruction,
                });
                preventDefault = false; // handleLesson2Input sudah menangani preventDefault
            } else { // Logika untuk pelajaran selanjutnya (umum)
                if (!currentLesson || !currentLesson.sequence || currentCharIndex >= currentLesson.sequence.length) {
                    console.warn("Pelajaran tidak valid atau sudah selesai. Mengabaikan input.");
                    e.preventDefault();
                    return;
                }

                const expectedChar = currentLesson.sequence[currentCharIndex];

                if (e.key === ' ' && expectedChar === ' ') {
                    updateState('currentCharIndex', currentCharIndex + 1);
                } else if (e.key === 'Escape') {
                    preventDefault = false;
                } else if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
                    updateState('currentCharIndex', currentCharIndex + 1);
                } else { // Input salah
                    lessonInstruction.classList.add('error-shake');
                    setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
                }

                // Cek apakah pelajaran selesai
                if (getState('currentCharIndex') >= currentLesson.sequence.length) {
                    showLessonCompleteModal();
                }
                doRenderLessonAndFocus();
            }

            if (preventDefault) {
                e.preventDefault();
            }
        });
    }


    // Listener event kustom: untuk menampilkan modal setelah Pelajaran 2 selesai
    if (lessonInstruction) {
        lessonInstruction.addEventListener('lesson2-finished', (event) => {
            updateState('lesson2Finished', true); // Set flag agar input di Pelajaran 2 diabaikan
            showLessonCompleteModal();
        });
    }

    // 5. INISIALISASI AWAL APLIKASI
    // createKeyboard akan tetap di sini karena ia membuat DOM yang tergantung pada keyboardContainer
    createKeyboard(keyboardContainer, keyLayout);
    resetCurrentLessonState();
    doRenderLessonAndFocus();
});