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
            const progressCharacter = (currentCharIndex / totalSteps) * 100;
            return Math.min(progressCharacter, 100);
        case 'simple-drill':
            if (!lesson.sequences) return 0;
            const totalSequences = lesson.sequences.length;
            const progressSimple = (sequenceIndex / totalSequences) * 100;
            return Math.min(progressSimple, 100);
        default: // Termasuk type 'free-typing' atau lainnya
            if (!lesson.sequences) return 0;
            const totalCharacters = lesson.sequences.length;
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