// js/lesson4-logic.js
import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { highlightKeyOnKeyboard } from './learn-typing-ui.js';
import { updateProgressBar } from './progress-bar.js'; // Import fungsi updateProgressBar

export function renderLesson4(lessonInstruction, keyboardContainer) {
    if (!lessonInstruction) {
        console.error("renderLesson4: lessonInstruction tidak ditemukan.");
        return;
    }
    
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    if (!lessonTextDisplay) {
        console.error("Elemen #lesson-text-display tidak ditemukan.");
        return;
    }
    
    const lesson = lessons[3];
    const currentCharIndex = getState('lesson4CurrentCharIndex');

    if (lessonInstruction) lessonInstruction.textContent = lessons[3].instruction;
    if (lessonTextDisplay) lessonTextDisplay.innerHTML = '';
    
    if (lesson.sequence && lesson.sequence.length > 0) {
        lesson.sequence.forEach((char, idx) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char; 
            
            if (idx < currentCharIndex) {
                span.classList.add('correct');
            } else if (idx === currentCharIndex && currentCharIndex < lesson.sequence.length) {
                span.classList.add('cursor');
            }
            if (lessonTextDisplay) lessonTextDisplay.appendChild(span);
        });
    }

    if (currentCharIndex < lesson.sequence.length) {
        if (keyboardContainer) highlightKeyOnKeyboard(keyboardContainer, lesson.sequence[currentCharIndex]);
    } else {
        if (keyboardContainer) highlightKeyOnKeyboard(keyboardContainer, null);
    }
}

export function cleanupLesson4Elements(lessonInstruction) {
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    if (lessonTextDisplay) {
        lessonTextDisplay.innerHTML = '';
    }
    if (lessonInstruction) lessonInstruction.textContent = '';
    updateState('lesson4CurrentCharIndex', 0);
}

export function handleLesson4Input({ e, doRenderAndHighlight, dispatchLesson4FinishedEvent, lessonInstructionEl }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    const currentCharIndex = getState('lesson4CurrentCharIndex');
    const lesson = lessons[3];

    if (e.key.toLowerCase() === lesson.sequence[currentCharIndex].toLowerCase()) {
        const newCharIndex = currentCharIndex + 1;
        updateState('lesson4CurrentCharIndex', newCharIndex);

        if (newCharIndex >= lesson.sequence.length) {
            // PERBAIKAN DI SINI:
            // Paksa progres bar ke 100% sebelum notifikasi muncul
            updateProgressBar(100);
            dispatchLesson4FinishedEvent(new Event('lesson4-finished'));
        }
    } else {
        if (lessonInstructionEl) {
            lessonInstructionEl.classList.add('error-shake');
            setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
        }
    }
    
    doRenderAndHighlight();
}