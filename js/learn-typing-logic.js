// learn-typing-logic.js (DIUPDATE)

import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { getState, updateState, getHiddenInput } from './learn-typing-state.js';
import {
    getSequenceForState,
    renderLesson2,
    cleanupLesson2Elements,
    // handleLesson2Input tidak digunakan langsung di sini, tapi di input-handler.js
} from './lesson2-logic.js';
// Import fungsi progress bar dari file baru
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';

let currentHighlightedKeyElement = null;

// --- FUNGSI RESET STATE PELAJARAN 2 ---
export function resetLesson2State(keyboardContainer) {
    updateState('lesson2State', 0);
    updateState('lesson2SequenceIndex', 0);

    cleanupLesson2Elements(document.getElementById('lesson-instruction'));

    if (keyboardContainer) {
        const highlightedKeys = keyboardContainer.querySelectorAll('.key.next-key, .key.correct-key, .key.wrong-key');
        highlightedKeys.forEach(key => {
            key.classList.remove('next-key', 'correct-key', 'wrong-key');
            key.style.animation = ''; // Pastikan animasi direset
        });
    }

    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key');
        currentHighlightedKeyElement.style.animation = ''; // Pastikan animasi direset
        currentHighlightedKeyElement = null;
    }
}

// --- FUNGSI UTILITY KEYBOARD ---
export function createKeyboard(keyboardContainer, keyLayout) {
    if (!keyboardContainer) {
        console.error("keyboardContainer tidak ditemukan. Tidak dapat membuat keyboard.");
        return;
    }

    keyboardContainer.innerHTML = '';
    keyLayout.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.classList.add('keyboard-row');
        row.forEach(key => {
            if (key === '') {
                const spacer = document.createElement('div');
                spacer.classList.add('key-spacer');
                rowElement.appendChild(spacer);
                return;
            }
            const keyElement = document.createElement('div');
            keyElement.classList.add('key');
            let lowerKey = key.toLowerCase();
            let displayKey = key;

            // Handle special keys for display
            if (key === 'ShiftLeft' || key === 'ShiftRight') displayKey = 'Shift';
            if (key === 'ControlLeft' || key === 'ControlRight') displayKey = 'Ctrl';
            if (key === 'AltLeft' || key === 'AltRight') displayKey = 'Alt';
            if (key === 'MetaLeft' || key === 'MetaRight') displayKey = 'Win';
            if (key === 'ContextMenu') displayKey = 'Menu';
            if (key === 'Space') {
                displayKey = ''; // Space bar usually doesn't show text
                lowerKey = ' '; // Data key for space is a single space character
            }

            keyElement.textContent = displayKey;
            keyElement.setAttribute('data-key', lowerKey);

            // Add specific classes for styling
            if (['Backspace', 'Tab', 'CapsLock', 'Enter', 'ShiftLeft', 'ShiftRight'].includes(key)) {
                keyElement.classList.add('key-medium');
            }
            if (key === 'Space') {
                keyElement.classList.add('key-space');
            }
            if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu'].includes(key)) {
                keyElement.classList.add('key-small');
            }
            rowElement.appendChild(keyElement);
        });
        keyboardContainer.appendChild(rowElement);
    });
}

function clearKeyboardHighlights(keyboardContainer) {
    if (!keyboardContainer) return;
    keyboardContainer.querySelectorAll('.key.next-key, .key.correct-key, .key.wrong-key').forEach(el => {
        el.classList.remove('next-key', 'correct-key', 'wrong-key');
        el.style.animation = ''; // Pastikan semua animasi dihapus
    });
    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.style.animation = ''; // Clear animation if still active
    }
    currentHighlightedKeyElement = null; // Reset the reference
}

export function highlightKeyOnKeyboard(keyboardContainer, keyChar) {
    if (!keyboardContainer) {
        console.warn("highlightKeyOnKeyboard: keyboardContainer is null or undefined. Cannot highlight.");
        return;
    }

    // Always clear previous highlight before applying new one
    clearKeyboardHighlights(keyboardContainer); // Call the dedicated function

    if (typeof keyChar === 'string' && keyChar.length > 0) {
        const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);
        if (targetKeyElement) {
            targetKeyElement.classList.add('next-key');
            // Force reflow to restart animation if element already has class
            void targetKeyElement.offsetWidth; 
            targetKeyElement.style.animation = 'highlight-move 0.6s ease-out infinite';
            currentHighlightedKeyElement = targetKeyElement;
        }
    }
}


// --- FUNGSI UTAMA RENDER PELAJARAN ---
export function renderLesson({
    lessons,
    currentLessonIndex,
    currentStepIndex,
    currentCharIndex,
    waitingForAnim, // Pastikan ini hanya diisi dengan true/false, bukan objek Ref
    keyboardContainer,
    lessonTitle,
    lessonInstruction,
    lessonTextDisplay,
    feedbackIndex = -1,
    isCorrect = null
}) {
    if (!lessons || !lessons[currentLessonIndex]) {
        console.error("Pelajaran tidak ditemukan atau indeks tidak valid.");
        return;
    }

    const lesson = lessons[currentLessonIndex];
    if (lessonTitle) lessonTitle.textContent = lesson.title;

    clearKeyboardHighlights(keyboardContainer); // Bersihkan highlight setiap render

    const lesson2State = getState('lesson2State');
    const lesson2SequenceIndex = getState('lesson2SequenceIndex');

    if (currentLessonIndex === 0) { // Pelajaran 1: F dan J
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        cleanupLesson2Elements(lessonInstruction); // Pastikan elemen pelajaran 2 dibersihkan

        if (lessonInstruction) {
            if (currentStepIndex === 0) {
                lessonInstruction.innerHTML = lesson.steps[0].instruction;
                highlightKeyOnKeyboard(keyboardContainer, 'f');
            } else if (currentStepIndex === 1) {
                lessonInstruction.innerHTML = lesson.steps[1].instruction;
                highlightKeyOnKeyboard(keyboardContainer, 'j');
            } else if (currentStepIndex === 2) {
                // Ini adalah state setelah F dan J berhasil diketik
                lessonInstruction.textContent = 'Pelajaran 1 Selesai! Klik "Lanjutkan" untuk ke pelajaran berikutnya.';
                highlightKeyOnKeyboard(keyboardContainer, null); // Hapus highlight keyboard
            }
        }
    } else if (currentLessonIndex === 1) { // Pelajaran 2
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
    } else { // Pelajaran lainnya (umum)
        cleanupLesson2Elements(lessonInstruction); // Pastikan elemen pelajaran 2 dibersihkan
        renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer);
    }

    // Panggil fungsi calculateLessonProgress dari progress-bar.js
    const progress = calculateLessonProgress(
        currentLessonIndex,
        currentStepIndex,
        currentCharIndex,
        lesson2State,
        lesson2SequenceIndex,
        lessons[currentLessonIndex] // Berikan objek pelajaran saat ini
    );
    // Panggil fungsi updateProgressBar dari progress-bar.js
    updateProgressBar(progress);
}

// --- FUNGSI UNTUK MENAMPILKAN MODAL PENYELESAIAN PELAJARAN ---
export function showLessonCompleteNotification(lessons, currentLessonIdx, domElements) {
    const {
        lessonHeader,
        lessonCompleteNotification,
        continueBtn,
        keyboardContainer,
        nextLessonPreview,
        successAnimationSvg,
        circlePath
    } = domElements;

    // Tambahkan baris ini untuk menyembunyikan header pelajaran
    if (lessonHeader) {
        lessonHeader.style.display = 'none';
    }

    // Sembunyikan keyboard virtual
    if (keyboardContainer) {
        keyboardContainer.style.display = 'none';
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            key.style.animation = 'none';
            key.classList.remove('next-key', 'correct-key', 'wrong-key');
        });
    }

    if (lessonCompleteNotification) {
        const currentLesson = lessons[currentLessonIdx];

        // Ganti judul notifikasi
        const h2 = lessonCompleteNotification.querySelector('h2');
        if (h2) {
            h2.textContent = `Pelajaran ${currentLessonIdx + 1} selesai!`;
        }
        
        // Reset dan jalankan animasi SVG
        if (successAnimationSvg && circlePath) {
            successAnimationSvg.classList.remove('animate-circle', 'animate-check');
            // Pastikan animasi di-reset dengan memaksa browser untuk merender ulang
            void successAnimationSvg.offsetWidth; 
            successAnimationSvg.classList.add('animate-circle');
            
            // Gunakan setTimeout untuk memulai animasi ceklis setelah animasi lingkaran selesai
            setTimeout(() => {
                successAnimationSvg.classList.add('animate-check');
            }, 1000); // Durasi animasi lingkaran di CSS adalah 1 detik (1000ms)
        }

        // Tampilkan pratinjau pelajaran berikutnya
        if (nextLessonPreview) {
            const nextLessonIndex = currentLessonIdx + 1;
            if (nextLessonIndex < lessons.length) {
                const nextLesson = lessons[nextLessonIndex];
                let previewText = '';
                if (nextLessonIndex === 0) {
                    previewText = `Ketik huruf: <span class="highlight-key-modal">F</span> dan <span class="highlight-key-modal">J</span>`;
                } else if (nextLessonIndex === 1) {
                    previewText = `Ketik kata acak: <span class="highlight-key-modal">huruf acak</span>`;
                } else {
                    const previewChars = nextLesson.sequence ? nextLesson.sequence.slice(0, 5).join('') : '';
                    previewText = `Ketik: <span class="highlight-key-modal">${previewChars}...</span>`;
                }
                nextLessonPreview.innerHTML = previewText;
            } else {
                nextLessonPreview.textContent = "Anda telah menyelesaikan semua pelajaran!";
            }
        }
        
        lessonCompleteNotification.style.display = 'flex';
        setTimeout(() => {
            lessonCompleteNotification.classList.add('active');
            if (continueBtn) {
                continueBtn.focus();
            } else {
                console.error('ERROR: Elemen continueBtn tidak ditemukan saat mencoba fokus!');
            }
        }, 50);
    } else {
        console.error('ERROR: Elemen notifikasi (#lesson-complete-notification) tidak ditemukan!');
    }
}

function renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer) {
    if (!lessonTextDisplay || !lessonInstruction) return;

    lessonTextDisplay.style.display = ''; // Pastikan display text lessons terlihat
    lessonInstruction.textContent = lesson.instruction || ''; // Set instruksi pelajaran

    lessonTextDisplay.innerHTML = ''; // Kosongkan tampilan teks pelajaran

    if (lesson.sequence && lesson.sequence.length > 0) {
        lesson.sequence.forEach((char, idx) => {
            const span = document.createElement('span');
            // Untuk spasi, gunakan non-breaking space agar terlihat
            span.textContent = char === ' ' ? '\u00A0' : char; 
            if (idx < currentCharIndex) {
                span.classList.add('correct');
            } else if (idx === currentCharIndex) {
                span.classList.add('cursor');
            }
            lessonTextDisplay.appendChild(span);
        });
        // Highlight karakter berikutnya yang harus diketik
        if (currentCharIndex < lesson.sequence.length) {
            highlightKeyOnKeyboard(keyboardContainer, lesson.sequence[currentCharIndex]);
        } else {
            highlightKeyOnKeyboard(keyboardContainer, null); // Hapus highlight jika pelajaran selesai
        }
    }
}