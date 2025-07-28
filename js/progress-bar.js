// progress-bar.js (DIUPDATE)

import { getState } from './learn-typing-state.js';
// import { getSequenceForState } from './lesson2-logic.js'; // TIDAK DIGUNAKAN, BISA DIHAPUS

export function calculateLessonProgress(currentLessonIndex, currentStepIndex, currentCharIndex, lesson2State, lesson2SequenceIndex, lesson) {
    // Logika untuk Pelajaran 1 (indeks 0: F dan J)
    if (currentLessonIndex === 0) {
        // Pelajaran ini memiliki 2 langkah utama: mengetik 'f' dan mengetik 'j'.
        // Jika currentStepIndex 0 (awal), 1 (setelah 'f'), 2 (setelah 'j').
        // Kita anggap total "titik" progress adalah 3 (awal, setelah f, setelah j selesai).
        // Jadi progress akan 0%, 50%, 100%.
        const maxStepsForLesson0 = 2; // f dan j
        // currentStepIndex akan mencapai 2 saat pelajaran selesai (setelah 'j')
        // Jadi (0/2)*100 = 0%
        // (1/2)*100 = 50%
        // (2/2)*100 = 100%
        // Pastikan currentStepIndex tidak melebihi maxStepsForLesson0 untuk perhitungan persentase
        let progress = (currentStepIndex / maxStepsForLesson0) * 100;
        return Math.min(100, progress); // Pastikan tidak lebih dari 100%
    }
    // Logika untuk Pelajaran 2 (indeks 1: Kata acak)
    else if (currentLessonIndex === 1) {
        // Pelajaran 2 memiliki 6 fase pengetikan, masing-masing 6 karakter.
        // Total karakter yang harus diketik adalah 6 * 6 = 36 karakter.
        // Progres dihitung berdasarkan karakter yang sudah diketik.

        // lesson2State 0, 2, 4, 6, 8, 10 adalah fase pengetikan (0-5).
        // lesson2SequenceIndex berjalan dari 0 sampai 5 untuk setiap fase.

        // Hitung jumlah karakter yang sudah selesai di fase-fase sebelumnya
        const completedPhases = Math.floor(lesson2State / 2); // Misalnya, jika lesson2State = 4, berarti 2 fase sudah selesai
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
        return Math.min(100, progress); // Kembalikan progres, maksimal 100%
    }
    // Logika untuk Pelajaran lainnya (indeks > 1)
    else {
        // Progres dihitung berdasarkan currentCharIndex terhadap total panjang sequence pelajaran.
        if (!lesson || !lesson.sequence || lesson.sequence.length === 0) return 0;
        let progress = (currentCharIndex / lesson.sequence.length) * 100;
        return Math.min(100, progress); // Pastikan tidak lebih dari 100%
    }
}

export function updateProgressBar(progress) {
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');
    if (progressBar && progressText) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`; // Pembulatan untuk tampilan yang rapi
    }
}