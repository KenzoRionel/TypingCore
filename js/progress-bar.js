// progress-bar.js
import { getState } from './learn-typing-state.js';

export function calculateLessonProgress(currentLessonIndex, currentStepIndex, currentCharIndex, lesson2State, lesson2SequenceIndex, lesson3State, lesson3SequenceIndex, lesson) {
    if (currentLessonIndex === 0) {
        const maxStepsForLesson0 = 2;
        let progress = (currentStepIndex / maxStepsForLesson0) * 100;
        return Math.min(100, progress);
    }
    else if (currentLessonIndex === 1) {
        const completedPhases = Math.floor(lesson2State / 2);
        let totalTypedChars = completedPhases * 6;
        if (lesson2State % 2 === 0 && lesson2State < 12) {
            totalTypedChars += lesson2SequenceIndex;
        } else if (lesson2State === 11) {
            totalTypedChars = 36;
        }
        const TOTAL_CHARS_FOR_LESSON2 = 36;
        let progress = (totalTypedChars / TOTAL_CHARS_FOR_LESSON2) * 100;
        return Math.min(100, progress);
    }
    // BARIS BARU UNTUK PELAJARAN 3
    else if (currentLessonIndex === 2) {
        const completedPhases = Math.floor(lesson3State / 2);
        let totalTypedChars = completedPhases * 6;
        if (lesson3State % 2 === 0 && lesson3State < 12) {
            totalTypedChars += lesson3SequenceIndex;
        } else if (lesson3State === 11) {
            totalTypedChars = 36;
        }
        const TOTAL_CHARS_FOR_LESSON3 = 36;
        let progress = (totalTypedChars / TOTAL_CHARS_FOR_LESSON3) * 100;
        return Math.min(100, progress);
    }
    // Logika untuk Pelajaran lainnya (indeks > 2)
    else {
        if (!lesson || !lesson.sequence || lesson.sequence.length === 0) return 0;
        let progress = (currentCharIndex / lesson.sequence.length) * 100;
        return Math.min(100, progress);
    }
}

export function updateProgressBar(progress) {
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');
    if (progressBar && progressText) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }
}