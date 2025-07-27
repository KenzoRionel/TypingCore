// progress-bar.js

import { getState } from './learn-typing-state.js'; // Perlu getState untuk mendapatkan state pelajaran
import { getSequenceForState } from './lesson2-logic.js'; // Perlu ini untuk kalkulasi progress Pelajaran 2

/**
 * Menghitung persentase progress untuk pelajaran saat ini.
 * @param {number} currentLessonIndex - Indeks pelajaran saat ini.
 * @param {number} currentStepIndex - Indeks langkah (untuk pelajaran 0).
 * @param {number} currentCharIndex - Indeks karakter saat ini (untuk pelajaran > 1).
 * @param {number} lesson2State - State khusus untuk Pelajaran 2.
 * @param {number} lesson2SequenceIndex - Indeks urutan karakter untuk Pelajaran 2.
 * @param {object} lesson - Objek pelajaran saat ini dari data lessons.
 * @returns {number} Persentase progress (0-100).
 */
export function calculateLessonProgress(currentLessonIndex, currentStepIndex, currentCharIndex, lesson2State, lesson2SequenceIndex, lesson) {
    if (currentLessonIndex === 0) {
        const totalSteps = lesson.steps.length;
        // Kita tambahkan 1 karena currentStepIndex berbasis 0, dan total langkah termasuk langkah terakhir (selesai)
        return ((currentStepIndex + 1) / (totalSteps + 1)) * 100; // Contoh: 0/3, 1/3, 2/3
    }
    else if (currentLessonIndex === 1) {
        const TOTAL_CHARACTER_STEPS_LESSON2 = 36; // Total karakter untuk semua fase f-j
        const currentProgressStep = (lesson2State / 2) * getSequenceForState(0).length + lesson2SequenceIndex;
        return (currentProgressStep / TOTAL_CHARACTER_STEPS_LESSON2) * 100;
    }
    else {
        if (!lesson.sequence || lesson.sequence.length === 0) return 0;
        return (currentCharIndex / lesson.sequence.length) * 100;
    }
}

/**
 * Memperbarui lebar progress bar dan teks persentase.
 * @param {number} progress - Nilai progress dalam persentase (0-100).
 */
export function updateProgressBar(progress) {
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');
    if (progressBar && progressText) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }
}