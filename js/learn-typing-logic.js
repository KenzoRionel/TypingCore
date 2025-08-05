// learn-typing-logic.js
import { lessons } from './learn-typing-lessons.js';
import { getState, updateState } from './learn-typing-state.js';
import {
    renderLesson2,
    cleanupLesson2Elements,
} from './lesson2-logic.js';
import {
    renderLesson3,
    cleanupLesson3Elements,
} from './lesson3-logic.js';
import {
    renderLesson4,
    cleanupLesson4Elements
} from './lesson4-logic.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';
import {
    clearKeyboardHighlights,
    renderOtherLessons,
    showLessonCompleteNotification,
    createKeyboard,
    highlightKeyOnKeyboard,
} from './learn-typing-ui.js';

function cleanupSpecialLessons(lessonInstruction) {
    cleanupLesson2Elements(lessonInstruction);
    cleanupLesson3Elements(lessonInstruction);
    cleanupLesson4Elements(lessonInstruction);
}

// PERBAIKAN: Fungsi ini sekarang akan memanggil cleanupSpecialLessons
function resetSpecialLessonState() {
    updateState('lesson2State', 0);
    updateState('lesson2SequenceIndex', 0);
    updateState('lesson3State', 0);
    updateState('lesson3SequenceIndex', 0);
    updateState('lesson4CurrentCharIndex', 0);
    
    const lessonInstructionEl = document.getElementById('lesson-instruction');
    if (lessonInstructionEl) {
        // Panggil fungsi cleanup di sini
        cleanupSpecialLessons(lessonInstructionEl);
    }
    const keyboardContainerEl = document.getElementById('virtual-keyboard');
    if (keyboardContainerEl) {
        clearKeyboardHighlights(keyboardContainerEl);
    }
}

export { resetSpecialLessonState as resetLesson2State };
export { resetSpecialLessonState as resetLesson3State };
export { resetSpecialLessonState as resetLesson4State };

export { createKeyboard };

export function renderLesson({
    lessons,
    currentLessonIndex,
    currentStepIndex,
    currentCharIndex,
    keyboardContainer,
    lessonTitle,
    lessonInstruction,
    lessonTextDisplay,
    feedbackIndex = -1,
    isCorrect = null,
    navigationButtonsContainer,
    lessonHeader
}) {
    if (!lessons || !lessons[currentLessonIndex]) {
        console.error("Pelajaran tidak ditemukan atau indeks tidak valid.");
        return;
    }
    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    if (prevLessonBtn) {
        if (currentLessonIndex === 0) {
            // Sembunyikan tombol 'Sebelumnya' di pelajaran pertama
            prevLessonBtn.style.visibility = 'hidden';
        } else {
            // Tampilkan kembali tombol 'Sebelumnya' di pelajaran selanjutnya
            prevLessonBtn.style.visibility = 'visible';
        }
    }

    const lesson = lessons[currentLessonIndex];
    if (lessonTitle) lessonTitle.textContent = lesson.title;
    
    clearKeyboardHighlights(keyboardContainer);

    const progressBarContainerEl = document.getElementById('progress-container-wrapper');
    const learnTypingSectionEl = document.getElementById('learn-typing-section');
    const virtualKeyboardEl = document.getElementById('virtual-keyboard');
    
    

    if (lessonTextDisplay) {
        if (currentLessonIndex === 3) {
            lessonTextDisplay.classList.add('lesson-4-display');
        } else {
            lessonTextDisplay.classList.remove('lesson-4-display');
        }
    }
    
    // Perbaikan utama: Panggil cleanup setiap kali render dimulai
    if (lessonTextDisplay) lessonTextDisplay.innerHTML = ''; //
    // Akhir perbaikan

    const specialRenderers = {
        0: () => {
            if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
            if (lessonInstruction) {
                if (currentStepIndex === 0) {
                    lessonInstruction.innerHTML = lesson.steps[0].instruction;
                    highlightKeyOnKeyboard(keyboardContainer, 'f');
                } else if (currentStepIndex === 1) {
                    lessonInstruction.innerHTML = lesson.steps[1].instruction;
                    highlightKeyOnKeyboard(keyboardContainer, 'j');
                } else if (currentStepIndex === 2) {
                    highlightKeyOnKeyboard(keyboardContainer, null);
                }
            }
        },
        1: () => {
            if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
            renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
        },
        2: () => {
            if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
            renderLesson3(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
        },
        3: () => {
            if (lessonTextDisplay) lessonTextDisplay.style.display = '';
            renderLesson4(lessonInstruction, keyboardContainer);
        },
    };

    if (specialRenderers[currentLessonIndex]) {
        specialRenderers[currentLessonIndex]();
    } else {
        if (lessonTextDisplay) lessonTextDisplay.style.display = '';
        renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer);
    }
    
    const progress = calculateLessonProgress(
        currentLessonIndex,
        lessons[currentLessonIndex]
    );
    updateProgressBar(progress);
}

export { showLessonCompleteNotification };