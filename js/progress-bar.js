// progress-bar.js
import { getState } from './learn-typing-state.js';
import { getSequenceForState as getLesson2Sequence } from './lesson2-logic.js';
import { getSequenceForState as getLesson3Sequence } from './lesson3-logic.js';

export function calculateLessonProgress(currentLessonIndex, lesson) {
    let progress = 0;

    switch (currentLessonIndex) {
        case 0:
            const maxStepsForLesson0 = 2;
            const currentStepIndex = getState('currentStepIndex');
            progress = (currentStepIndex / maxStepsForLesson0) * 100;
            break;

        case 1:
            const lesson2State = getState('lesson2State');
            const lesson2SequenceIndex = getState('lesson2SequenceIndex');
            const totalLesson2Sequences = 6;
            const completedPhases2 = Math.floor(lesson2State / 2);
            let totalTypedChars2 = completedPhases2 * getLesson2Sequence(0).length;

            if (lesson2State % 2 === 0 && lesson2State < totalLesson2Sequences * 2) {
                totalTypedChars2 += lesson2SequenceIndex;
            } else if (lesson2State === (totalLesson2Sequences * 2) - 1) {
                totalTypedChars2 = totalLesson2Sequences * getLesson2Sequence(0).length;
            }

            const TOTAL_CHARS_FOR_LESSON2 = totalLesson2Sequences * getLesson2Sequence(0).length;
            progress = (totalTypedChars2 / TOTAL_CHARS_FOR_LESSON2) * 100;
            break;
            
        case 2:
            const lesson3State = getState('lesson3State');
            const lesson3SequenceIndex = getState('lesson3SequenceIndex');
            const totalLesson3Sequences = 6;
            const completedPhases3 = Math.floor(lesson3State / 2);
            let totalTypedChars3 = completedPhases3 * getLesson3Sequence(0).length;

            if (lesson3State % 2 === 0 && lesson3State < totalLesson3Sequences * 2) {
                totalTypedChars3 += lesson3SequenceIndex;
            } else if (lesson3State === (totalLesson3Sequences * 2) - 1) {
                totalTypedChars3 = totalLesson3Sequences * getLesson3Sequence(0).length;
            }

            const TOTAL_CHARS_FOR_LESSON3 = totalLesson3Sequences * getLesson3Sequence(0).length;
            progress = (totalTypedChars3 / TOTAL_CHARS_FOR_LESSON3) * 100;
            break;

        case 3:
            const lesson4CurrentCharIndex = getState('lesson4CurrentCharIndex');
            if (lesson && lesson.sequence && lesson.sequence.length > 0) {
                // Perbaikan: Jika pelajaran selesai, paksa progres menjadi 100%
                if (lesson4CurrentCharIndex >= lesson.sequence.length) {
                    progress = 100;
                } else {
                    progress = (lesson4CurrentCharIndex / lesson.sequence.length) * 100;
                }
            }
            break;
            
        default:
            const currentCharIndex = getState('currentCharIndex');
            if (lesson && lesson.sequence && lesson.sequence.length > 0) {
                progress = (currentCharIndex / lesson.sequence.length) * 100;
            }
            break;
    }

    return Math.min(100, progress);
}

export function updateProgressBar(progress) {
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');
    if (progressBar && progressText) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }
}