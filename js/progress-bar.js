// js/progress-bar.js

import { getState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';

export function calculateLessonProgress(lesson) {
    if (!lesson) {
        return 0;
    }

    const currentLessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${currentLessonIndex + 1}`;
    const lessonState = getState(lessonId) || { currentCharIndex: 0, sequenceIndex: 0 };
    const { currentCharIndex, sequenceIndex } = lessonState;

    switch (lesson.type) {
        case 'character-drill':
            if (!lesson.steps) return 0;
            const totalSteps = lesson.steps.length;
            // Pastikan currentCharIndex tidak melebihi totalSteps
            const currentStep = Math.min(currentCharIndex, totalSteps);
            const progressCharacter = (currentStep / totalSteps) * 100;
            return Math.min(progressCharacter, 100);
        case 'simple-drill':
            if (!lesson.sequences || lesson.sequences.length === 0) return 0;
            const { sequenceIndex: currentSequenceIndex, nextCharIndex } = lessonState;
            
            const totalCharsInDrill = lesson.sequences.reduce((sum, seq) => sum + seq.length, 0);
            if (totalCharsInDrill === 0) return 0;

            let charsTyped = 0;
            for (let i = 0; i < currentSequenceIndex; i++) {
                charsTyped += lesson.sequences[i].length;
            }
            charsTyped += nextCharIndex;

            const progressSimple = (charsTyped / totalCharsInDrill) * 100;
            return Math.min(progressSimple, 100);
        default: // Termasuk type 'free-typing' atau lainnya
            // PERBAIKAN: Gunakan lesson.sequence untuk free-typing, bukan lesson.sequences
            if (!lesson.sequence) return 0;
            const totalCharacters = lesson.sequence.length;
            const progressDefault = (currentCharIndex / totalCharacters) * 100;
            return Math.min(progressDefault, 100);
    }
}

export function updateProgressBar(progress, progressTextEl, progressBarEl) {
    if (progressBarEl && progressTextEl) {
        progressBarEl.style.width = `${progress}%`;
        progressTextEl.textContent = `${Math.round(progress)}%`;
    }
}