import {
    lessons
} from './learn-typing-lessons.js';
import { 
    renderLesson,
    handleLesson2Input,
    resetLesson2State,
    getSequenceForState 
} from './learn-typing-logic.js';
import { 
    initKeyboard,
    highlightKey,
    focusKeyboard,
    setupFocusHandlers
} from './keyboard-module.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inisialisasi Keyboard
    initKeyboard();
    setupFocusHandlers();

    // 2. DEKLARASI ELEMEN DOM
    const lessonTitle = document.getElementById('lesson-title');
    const lessonInstruction = document.getElementById('lesson-instruction');
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    const nextLessonBtn = document.getElementById('next-lesson-btn');
    const modal = document.getElementById('lesson-complete-modal');
    const continueBtn = document.getElementById('continue-to-next-lesson-btn');
    const nextLessonPreview = document.getElementById('next-lesson-preview'); // Pertahankan jika digunakan di HTML

    // 3. DEKLARASI STATE APLIKASI UTAMA
    let currentLessonIndex = 0;
    let currentStepIndex = 0;
    let currentCharIndex = 0;
    let waitingForAnim = {
        value: false
    }; // Masih ok karena reference type
    let lesson2Finished = false; // Flag untuk menandai apakah pelajaran 2 sudah selesai

    // 4. Event Listeners (tanpa keyboard handlers)
    prevLessonBtn.addEventListener('click', () => {
        if (currentLessonIndex > 0) {
            currentLessonIndex--;
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        }
        focusKeyboard();
    });

    // Fungsi utama untuk merender pelajaran dan memfokuskan hiddenInput
    function doRenderLessonAndFocus(feedbackIndex = -1, isCorrect = null) {
        renderLesson({
            lessons,
            currentLessonIndex,
            currentStepIndex,
            currentCharIndex,
            waitingForAnim,
            lessonTitle,
            lessonInstruction,
            lessonTextDisplay,
            feedbackIndex,
            isCorrect
        });
        setTimeout(() => focusKeyboard(), 0);
    }

    // Di dalam fungsi resetCurrentLessonState:
    function resetCurrentLessonState() {
        currentCharIndex = 0;
        currentStepIndex = 0;
        waitingForAnim.value = false;
        lesson2Finished = false;
        resetLesson2State(); // Reset state Pelajaran 2
    }
    
    prevLessonBtn.addEventListener('click', () => {
        if (currentLessonIndex > 0) {
            currentLessonIndex--;
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        }
        setTimeout(() => focusKeyboard(), 0);
    });

    nextLessonBtn.addEventListener('click', () => {
        if (currentLessonIndex < lessons.length - 1) {
            currentLessonIndex++;
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        }
        setTimeout(() => focusKeyboard(), 0);
    });

    continueBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (currentLessonIndex < lessons.length - 1) {
            currentLessonIndex++;
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        }
        setTimeout(() => focusKeyboard(), 0);
    });


    // Event handler keydown utama pada hidden input
    hiddenInput.addEventListener('keydown', (e) => {
        if (lesson2Finished) {
            e.preventDefault();
            return;
        }

        if (currentLessonIndex === 0) {
            // Logika Pelajaran 1
            const currentLesson = lessons[currentLessonIndex];
            if (currentStepIndex === 0 && e.key.toLowerCase() === 'f' && !waitingForAnim.value) {
                waitingForAnim.value = true; // Set waiting for animation
                const inlineKeyF = document.getElementById('inlineKeyF');
                if (inlineKeyF) {
                    inlineKeyF.classList.add('fade-out');
                    setTimeout(() => {
                        inlineKeyF.style.display = 'none';
                        waitingForAnim.value = false;
                        currentStepIndex = 1;
                        doRenderLessonAndFocus();
                    }, 300); // Sesuai dengan durasi CSS fade-out
                } else { // Fallback jika elemen tidak ditemukan
                    waitingForAnim.value = false;
                    currentStepIndex = 1;
                    doRenderLessonAndFocus();
                }
                e.preventDefault();
                return;
            } else if (currentStepIndex === 1 && !waitingForAnim.value && e.key.toLowerCase() === 'j') {
                waitingForAnim.value = true; // Set waiting for animation
                const inlineKeyJ = document.getElementById('inlineKeyJ');
                if (inlineKeyJ) {
                    inlineKeyJ.classList.add('fade-out');
                    setTimeout(() => {
                        inlineKeyJ.style.display = 'none';
                        waitingForAnim.value = false;
                        currentStepIndex = 2;
                        doRenderLessonAndFocus(); // Ini akan merender instruksi akhir
                        setTimeout(() => { // Tampilkan modal setelah sedikit delay
                            modal.style.display = 'flex';
                            if (continueBtn) {
                                continueBtn.focus();
                            }
                        }, 800); // Tambahan delay untuk modal muncul
                    }, 300); // Sesuai dengan durasi CSS fade-out
                } else { // Fallback
                    waitingForAnim.value = false;
                    currentStepIndex = 2;
                    doRenderLessonAndFocus();
                    setTimeout(() => {
                        modal.style.display = 'flex';
                        if (continueBtn) {
                            continueBtn.focus();
                        }
                    }, 800);
                }
                e.preventDefault();
                return;
            }
            // Tangani input salah pada Pelajaran 1
            if (e.key.length === 1 && ((currentStepIndex === 0 && !waitingForAnim.value) || (currentStepIndex === 1 && !waitingForAnim.value))) {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
                e.preventDefault();
                doRenderLessonAndFocus(); // Re-render untuk memastikan highlight tetap benar
                return;
            }
        } else if (currentLessonIndex === 1) {
            // Pelajaran 2: Delegasikan ke fungsi handler baru di learn-typing-logic.js
            handleLesson2Input({
                e,
                doRenderAndHighlight: doRenderLessonAndFocus, // Kirim fungsi untuk merender dan fokus
                dispatchLesson2FinishedEvent: (event) => lessonInstruction.dispatchEvent(event), // Kirim dispatchEvent dari lessonInstruction
                lessonInstructionEl: lessonInstruction // Kirim elemen instruksi untuk error shake
            });
            // Tidak perlu preventDefault di sini karena sudah ditangani di handleLesson2Input
            // dan doRenderLessonAndFocus akan dipanggil oleh handler Pelajaran 2
        } else {
            // Logika untuk pelajaran selanjutnya (saat ini hanya karakter biasa)
            const currentLesson = lessons[currentLessonIndex];
            const expectedChar = currentLesson.sequence[currentCharIndex];

            if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
                currentCharIndex++;
                if (currentCharIndex >= currentLesson.sequence.length) {
                    // Pelajaran Selesai
                    setTimeout(() => {
                        modal.style.display = 'flex';
                        if (continueBtn) {
                            continueBtn.focus();
                        }
                    }, 400); // Delay sebelum modal muncul
                }
                doRenderLessonAndFocus();
            } else {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
            }
            e.preventDefault(); // Mencegah input muncul di hidden input
        }
    });

    // Listener event kustom: untuk menampilkan modal setelah Pelajaran 2 selesai
    lessonInstruction.addEventListener('lesson2-finished', () => {

        // console.log('--- EVENT LESSON2-FINISHED DITERIMA (di lessonInstruction) ---');
        lesson2Finished = true; // Set flag agar input di Pelajaran 2 diabaikan

        if (modal) {
            console.log('Modal ditemukan. Menyiapkan tampilan dan fokus tombol Lanjutkan...');
            // Menggunakan setTimeout untuk memberi waktu modal muncul dan dirender
            setTimeout(() => {
                modal.style.display = 'flex'; // Tampilkan modal
                console.log('Modal display diatur ke flex.');

                if (continueBtn) {
                    console.log('Mencoba fokus ke tombol Lanjutkan di dalam modal...');
                    continueBtn.focus(); // Fokus tombol di dalam modal

                    // Opsional: Cek apakah fokus benar-benar berpindah
                    if (document.activeElement === continueBtn) {
                        console.log('Fokus berhasil diatur ke tombol Lanjutkan di modal.');
                    } else {
                        console.log('Fokus GAGAL berpindah ke tombol Lanjutkan di modal. Elemen aktif saat ini:', document.activeElement);
                    }
                } else {
                    console.error('ERROR: Elemen continueBtn tidak ditemukan di dalam modal!');
                }
            }, 600); // <-- MENAIKKAN DURASI TIMEOUT menjadi 600ms (dari 400ms).
            // Jika modal ada animasi pembuka, sesuaikan durasi ini agar lebih panjang dari animasi.
        } else {
            console.error('ERROR: Elemen modal (#lesson-complete-modal atau id lainnya) tidak ditemukan!');
        }
        const keys = document.querySelectorAll('#virtual-keyboard .key');
        keys.forEach(key => {
            key.style.animation = 'none';
            key.classList.remove('next-key');
        });

        // 2. Reset state
        lesson2Finished = true;

        // 3. Tampilkan modal
        modal.style.display = 'flex';
        continueBtn.focus();

    });

    // 5. INISIALISASI AWAL APLIKASI
    resetCurrentLessonState();
    doRenderLessonAndFocus()
});