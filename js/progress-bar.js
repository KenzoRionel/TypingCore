// js/progress-bar.js

import { getState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { getDOMReferences } from './dom-elements.js';

export function calculateLessonProgress(lesson) {
    if (!lesson) {
        return 0;
    }

    const currentLessonIndex = getState('currentLessonIndex');
    let totalCharacters, typedCharacters;
    
    if (currentLessonIndex === 0) {
        if (!lesson.steps) return 0;
        const totalSteps = lesson.steps.length;
        const currentIndex = getState('currentStepIndex');
        if (totalSteps === 0) return 0;
        const progress = (currentIndex / totalSteps) * 100;
        return Math.min(progress, 100);
    } else if (currentLessonIndex === 1 || currentLessonIndex === 2) {
        // PERBAIKAN: Hitung progres berdasarkan karakter yang diketik
        if (!lesson.sequences) return 0;
        
        let totalChars = 0;
        for (const seq of lesson.sequences) {
            totalChars += seq.length;
        }

        const completedSequencesCount = (currentLessonIndex === 1) ? (getState('lesson2State') / 2) : (getState('lesson3State') / 2);
        const currentSequenceIndex = (currentLessonIndex === 1) ? getState('lesson2SequenceIndex') : getState('lesson3SequenceIndex');

        let typedChars = 0;
        for (let i = 0; i < completedSequencesCount; i++) {
            typedChars += lesson.sequences[i].length;
        }
        typedChars += currentSequenceIndex;

        if (totalChars === 0) return 0;
        const progress = (typedChars / totalChars) * 100;
        return Math.min(progress, 100);
    } else {
        if (!lesson.sequence) return 0;
        const totalSteps = lesson.sequence.length;
        const currentIndex = getState('currentCharIndex');
        if (totalSteps === 0) return 0;
        const progress = (currentIndex / totalSteps) * 100;
        return Math.min(progress, 100);
    }
}

export function updateProgressBar(progress) {
    const dom = getDOMReferences();
    if (dom.progressBar && dom.progressText) {
        dom.progressBar.style.width = `${progress}%`;
        dom.progressText.textContent = `${Math.round(progress)}%`;
    }
}