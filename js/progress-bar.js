// progress-bar.js (DIUPDATE)

import { getState } from './learn-typing-state.js';
import { getSequenceForState } from './lesson2-logic.js';

export function calculateLessonProgress(currentLessonIndex, currentStepIndex, currentCharIndex, lesson2State, lesson2SequenceIndex, lesson) {
    if (currentLessonIndex === 0) {
        const totalSteps = lesson.steps.length; // totalSteps akan 2 (step0, step1)
        // Jika Pelajaran 1 selesai di currentStepIndex 2 (artinya sudah menyelesaikan step0 dan step1)
        // Total "titik" progress adalah 3 (awal, selesai step0, selesai step1)
        return (currentStepIndex / totalSteps) * 100;
    }
    else if (currentLessonIndex === 1) {
        // Pelajaran 2 memiliki 6 fase pengetikan, masing-masing 6 karakter.
        // Total karakter yang harus diketik adalah 6 * 6 = 36 karakter.
        // Progres dihitung berdasarkan karakter yang sudah diketik.

        // lesson2State 0, 2, 4, 6, 8, 10 adalah fase pengetikan.
        // lesson2SequenceIndex berjalan dari 0 sampai 5 untuk setiap fase.
        
        // Kita hitung jumlah karakter yang sudah selesai di state sebelumnya
        const completedPhases = lesson2State / 2; // Misalnya, jika lesson2State = 4, berarti 2 fase sudah selesai
        let totalTypedChars = completedPhases * 6; // Setiap fase 6 karakter

        // Tambahkan karakter yang sudah diketik di fase saat ini
        if (lesson2State % 2 === 0 && lesson2State < 12) { // Jika sedang dalam fase pengetikan (state genap dan belum selesai)
            totalTypedChars += lesson2SequenceIndex;
        } else if (lesson2State === 11) { // Jika sudah di state "selesai" Pelajaran 2
            totalTypedChars = 36; // Langsung set ke total penuh
        }

        const TOTAL_CHARS_FOR_LESSON2 = 36; // Total karakter keseluruhan untuk Pelajaran 2

        // Pastikan progres tidak melebihi 100%
        let progress = (totalTypedChars / TOTAL_CHARS_FOR_LESSON2) * 100;
        return Math.min(100, progress); // Kembalikan progres, maksimal 100
    }
    else {
        if (!lesson.sequence || lesson.sequence.length === 0) return 0;
        return (currentCharIndex / lesson.sequence.length) * 100;
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