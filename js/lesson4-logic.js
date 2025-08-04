// js/lesson4-logic.js
import { getState, updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { highlightKeyOnKeyboard } from './learn-typing-logic.js';

export function renderLesson4(lessonInstruction, keyboardContainer) {
    if (!lessonInstruction) {
        console.error("renderLesson4: lessonInstruction tidak ditemukan.");
        return;
    }
    
    // PERBAIKAN: Reset state saat pelajaran dimulai
    if (getState('currentLessonIndex') === 3 && getState('lesson4CurrentCharIndex') === null) {
        updateState('lesson4CurrentCharIndex', 0);
    }
    
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    if (!lessonTextDisplay) {
        console.error("Elemen #lesson-text-display tidak ditemukan.");
        return;
    }
    
    lessonInstruction.textContent = lessons[3].instruction;

    const lesson = lessons[3];
    const currentCharIndex = getState('lesson4CurrentCharIndex');

    lessonTextDisplay.innerHTML = '';
    
    if (lesson.sequence && lesson.sequence.length > 0) {
        lesson.sequence.forEach((char, idx) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char; 
            
            if (idx < currentCharIndex) {
                span.classList.add('correct');
            } else if (idx === currentCharIndex) {
                span.classList.add('cursor');
            }
            lessonTextDisplay.appendChild(span);
        });
    }

    if (currentCharIndex < lesson.sequence.length) {
        highlightKeyOnKeyboard(keyboardContainer, lesson.sequence[currentCharIndex]);
    } else {
        highlightKeyOnKeyboard(keyboardContainer, null);
    }
}

export function cleanupLesson4Elements(lessonInstruction) {
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    if (lessonTextDisplay) {
        lessonTextDisplay.innerHTML = '';
    }
    lessonInstruction.textContent = '';
    updateState('lesson4CurrentCharIndex', 0);
}

export function handleLesson4Input({ e, doRenderAndHighlight, dispatchLesson4FinishedEvent, lessonInstructionEl }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    let currentCharIndex = getState('lesson4CurrentCharIndex');
    const lesson = lessons[3];
    
    if (e.key.toLowerCase() === lesson.sequence[currentCharIndex]) {
        updateState('lesson4CurrentCharIndex', currentCharIndex + 1);
        currentCharIndex = getState('lesson4CurrentCharIndex');
        
        if (currentCharIndex >= lesson.sequence.length) {
            // PERBAIKAN: Pastikan event dipicu di sini
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