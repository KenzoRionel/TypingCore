import {
    lessons
} from './learn-typing-lessons.js';
import {
    createKeyboard,
    renderLesson,
    resetLesson2State,
    handleLesson2Input
} from './learn-typing-logic.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. DEKLARASI ELEMEN DOM
    const keyboardContainer = document.getElementById('virtual-keyboard');
    const lessonTitle = document.getElementById('lesson-title');
    const lessonInstruction = document.getElementById('lesson-instruction');
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    const nextLessonBtn = document.getElementById('next-lesson-btn');
    const modal = document.getElementById('lesson-complete-modal');
    const continueBtn = document.getElementById('continue-to-next-lesson-btn');
    const nextLessonPreview = document.getElementById('next-lesson-preview'); // Pertahankan jika digunakan di HTML

    let hiddenInput; // Deklarasi di sini agar bisa diakses di seluruh scope DOMContentLoaded

    // **PENTING**: Verifikasi semua elemen DOM ditemukan
    if (!keyboardContainer || !lessonTitle || !lessonInstruction || !lessonTextDisplay || !prevLessonBtn || !nextLessonBtn || !modal || !continueBtn) {
        console.error("ERROR: Satu atau lebih elemen DOM tidak ditemukan. Pastikan ID di HTML sudah benar.");
        // Anda bisa menambahkan logika untuk menghentikan eksekusi atau menampilkan pesan kesalahan ke pengguna
        return; // Menghentikan eksekusi script jika ada elemen vital yang hilang
    }

    // 2. DEKLARASI STATE APLIKASI UTAMA
    let currentLessonIndex = 0;
    let currentStepIndex = 0;
    let currentCharIndex = 0;
    let waitingForAnim = {
        value: false
    }; // Masih ok karena reference type
    let lesson2Finished = false; // Flag untuk menandai apakah pelajaran 2 sudah selesai

    // 3. INISIALISASI KOMPONEN & FUNGSI PEMBANTU
    const initHiddenInput = () => {
        hiddenInput = document.getElementById('learnTypingHiddenInput');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'text';
            hiddenInput.id = 'learnTypingHiddenInput';
            hiddenInput.style.position = 'absolute';
            hiddenInput.style.opacity = '0';
            hiddenInput.style.pointerEvents = 'none';
            hiddenInput.autocapitalize = 'off';
            hiddenInput.autocomplete = 'off';
            hiddenInput.spellcheck = false;
            document.body.appendChild(hiddenInput);
        }
        hiddenInput.focus();
    };

    const keyLayout = [
        ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
        ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
        ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
        ['ShiftLeft', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'ShiftRight'],
        ['ControlLeft', 'MetaLeft', 'AltLeft', '', 'Space', '', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight']
    ];

    // Fungsi utama untuk merender pelajaran dan memfokuskan hiddenInput
    function doRenderLessonAndFocus(feedbackIndex = -1, isCorrect = null) {
        renderLesson({
            lessons,
            currentLessonIndex,
            currentStepIndex,
            currentCharIndex,
            waitingForAnim,
            keyboardContainer,
            lessonTitle,
            lessonInstruction,
            lessonTextDisplay,
            feedbackIndex,
            isCorrect
        });
        // Pastikan hiddenInput sudah terinisialisasi sebelum fokus
        if (hiddenInput) {
            setTimeout(() => hiddenInput.focus(), 0);
        }
    }

    // Fungsi untuk mereset state pelajaran saat ini
    function resetCurrentLessonState() {
        currentCharIndex = 0;
        currentStepIndex = 0;
        waitingForAnim.value = false;
        lesson2Finished = false; // Reset flag saat pindah pelajaran
        // Panggil resetLesson2State selalu untuk memastikan bersih
        resetLesson2State(keyboardContainer);
    }

    // Fungsi untuk menampilkan modal selesai pelajaran
    function showLessonCompleteModal() {
        // Hapus highlight tombol keyboard saat modal muncul
        const keys = document.querySelectorAll('#virtual-keyboard .key');
        keys.forEach(key => {
            key.style.animation = 'none';
            key.classList.remove('next-key', 'correct-key', 'wrong-key'); // Hapus semua kelas highlight
        });

        // Pastikan modal ditemukan sebelum menampilkan dan fokus
        if (modal) {
            // Menggunakan setTimeout untuk memberi waktu browser merender perubahan display
            setTimeout(() => {
                modal.style.display = 'flex';
                // Cek ulang continueBtn sebelum fokus
                if (continueBtn) {
                    continueBtn.focus();
                } else {
                    console.error('ERROR: Elemen continueBtn tidak ditemukan saat mencoba fokus!');
                }
            }, 600); // Durasi timeout bisa disesuaikan dengan animasi modal
        } else {
            console.error('ERROR: Elemen modal (#lesson-complete-modal) tidak ditemukan!');
        }
    }

    // 4. EVENT LISTENERS UTAMA

    // Fokus hiddenInput saat jendela kembali aktif
    window.addEventListener('focus', () => {
        if (hiddenInput) { // Cek hiddenInput sebelum fokus
            setTimeout(() => {
                if (document.activeElement !== hiddenInput) {
                    hiddenInput.focus();
                }
            }, 10);
        }
    });

    // Fokus hiddenInput saat klik di luar tombol navigasi/modal
    document.addEventListener('mousedown', (e) => {
        const clickedElement = e.target;
        const isDirectlyNavigationButton = clickedElement.tagName === 'BUTTON' && clickedElement.closest('.navigation-buttons');
        const isModalContentActive = clickedElement.closest('.modal-overlay') && modal && modal.style.display === 'flex'; // Tambahkan cek `modal`

        const isUIElementThatShouldKeepFocus = isDirectlyNavigationButton || isModalContentActive;

        if (!isUIElementThatShouldKeepFocus) {
            if (hiddenInput) { // Cek hiddenInput sebelum fokus
                setTimeout(() => {
                    if (document.activeElement !== hiddenInput) {
                        hiddenInput.focus();
                    }
                }, 0);
            }
        }
    });

    // Navigasi pelajaran
    prevLessonBtn.addEventListener('click', () => {
        if (currentLessonIndex > 0) {
            currentLessonIndex--;
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        }
        if (hiddenInput) { // Cek hiddenInput sebelum fokus
            setTimeout(() => hiddenInput.focus(), 0);
        }
    });

    nextLessonBtn.addEventListener('click', () => {
        if (currentLessonIndex < lessons.length - 1) {
            currentLessonIndex++;
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        }
        if (hiddenInput) { // Cek hiddenInput sebelum fokus
            setTimeout(() => hiddenInput.focus(), 0);
        }
    });

    // Tombol Lanjutkan di modal
    continueBtn.addEventListener('click', () => {
        if (modal) { // Pastikan modal ditemukan sebelum diinteraksi
            modal.style.display = 'none';
        }

        if (currentLessonIndex < lessons.length - 1) {
            currentLessonIndex++;
            resetCurrentLessonState();
            doRenderLessonAndFocus();
        } else {
            console.log("Semua pelajaran selesai!");
        }
        if (hiddenInput) { // Cek hiddenInput sebelum fokus
            setTimeout(() => hiddenInput.focus(), 0);
        }
    });

    // Event handler keydown utama pada hidden input
    // Pastikan hiddenInput diinisialisasi sebelum menambahkan listener ini
    initHiddenInput(); // Panggil di sini atau di awal DOMContentLoaded
    if (hiddenInput) { // Tambahkan cek if (hiddenInput)
        hiddenInput.addEventListener('keydown', (e) => {
            // Mencegah input saat modal terbuka atau animasi sedang berjalan
            if ((modal && modal.style.display === 'flex') || waitingForAnim.value) { // Tambahkan cek `modal`
                e.preventDefault();
                return;
            }

            const currentLesson = lessons[currentLessonIndex];
            let preventDefault = true; // Default untuk mencegah input di hiddenInput

            if (currentLessonIndex === 0) { // Logika Pelajaran 1 (f dan j)
                if (currentStepIndex === 0 && e.key.toLowerCase() === 'f') {
                    waitingForAnim.value = true;
                    const inlineKeyF = document.getElementById('inlineKeyF');
                    if (inlineKeyF) {
                        inlineKeyF.classList.add('fade-out');
                        setTimeout(() => {
                            inlineKeyF.style.display = 'none';
                            waitingForAnim.value = false;
                            currentStepIndex = 1;
                            doRenderLessonAndFocus();
                        }, 300);
                    } else { // Fallback jika inlineKeyF tidak ditemukan
                        waitingForAnim.value = false;
                        currentStepIndex = 1;
                        doRenderLessonAndFocus();
                    }
                } else if (currentStepIndex === 1 && e.key.toLowerCase() === 'j') {
                    waitingForAnim.value = true;
                    const inlineKeyJ = document.getElementById('inlineKeyJ');
                    if (inlineKeyJ) {
                        inlineKeyJ.classList.add('fade-out');
                        setTimeout(() => {
                            inlineKeyJ.style.display = 'none';
                            waitingForAnim.value = false;
                            currentStepIndex = 2; // Selesai Pelajaran 1
                            doRenderLessonAndFocus();
                            showLessonCompleteModal(); // Panggil fungsi modal
                        }, 300);
                    } else { // Fallback jika inlineKeyJ tidak ditemukan
                        waitingForAnim.value = false;
                        currentStepIndex = 2;
                        doRenderLessonAndFocus();
                        showLessonCompleteModal(); // Panggil fungsi modal
                    }
                } else if (e.key.length === 1) { // Input salah pada Pelajaran 1
                    lessonInstruction.classList.add('error-shake');
                    setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
                    doRenderLessonAndFocus(); // Re-render untuk memastikan highlight tetap benar
                } else {
                    preventDefault = false; // Izinkan tombol non-karakter seperti Shift, Alt, Ctrl
                }
            } else if (currentLessonIndex === 1) { // Logika Pelajaran 2
                // Delegasikan ke fungsi handler baru di learn-typing-logic.js
                handleLesson2Input({
                    e,
                    doRenderAndHighlight: doRenderLessonAndFocus, // Kirim fungsi untuk merender dan fokus
                    dispatchLesson2FinishedEvent: (event) => lessonInstruction.dispatchEvent(event), // Kirim dispatchEvent
                    lessonInstructionEl: lessonInstruction, // Kirim elemen instruksi untuk error shake
                    currentStepIndex: currentStepIndex, // Kirim state currentStepIndex Pelajaran 2
                    setStepIndex: (newIndex) => currentStepIndex = newIndex, // Fungsi untuk update currentStepIndex
                    setLesson2Finished: (status) => lesson2Finished = status // Fungsi untuk update lesson2Finished
                });
                preventDefault = false; // handleLesson2Input sudah menangani preventDefault
            } else { // Logika untuk pelajaran selanjutnya (umum)
                // Pastikan currentLesson dan sequence ada
                if (!currentLesson || !currentLesson.sequence || currentCharIndex >= currentLesson.sequence.length) {
                    console.warn("Pelajaran tidak valid atau sudah selesai. Mengabaikan input.");
                    e.preventDefault();
                    return;
                }

                const expectedChar = currentLesson.sequence[currentCharIndex];

                // Handle khusus untuk ' ' (spasi) dan tombol Escape
                if (e.key === ' ' && expectedChar === ' ') {
                    currentCharIndex++;
                } else if (e.key === 'Escape') {
                    // Biarkan default
                    preventDefault = false;
                } else if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
                    currentCharIndex++;
                } else { // Input salah
                    lessonInstruction.classList.add('error-shake');
                    setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
                }

                // Cek apakah pelajaran selesai
                if (currentCharIndex >= currentLesson.sequence.length) {
                    showLessonCompleteModal(); // Panggil fungsi modal
                }
                doRenderLessonAndFocus();
            }

            if (preventDefault) {
                e.preventDefault(); // Mencegah input muncul di hidden input kecuali di kasus tertentu
            }
        });
    }


    // Listener event kustom: untuk menampilkan modal setelah Pelajaran 2 selesai
    // Ini dipicu dari learn-typing-logic.js
    if (lessonInstruction) { // Tambahkan cek if (lessonInstruction)
        lessonInstruction.addEventListener('lesson2-finished', (event) => {
            lesson2Finished = true; // Set flag agar input di Pelajaran 2 diabaikan
            showLessonCompleteModal(); // Panggil fungsi modal
        });
    }

    // 5. INISIALISASI AWAL APLIKASI
    // initHiddenInput(); // Sudah dipanggil di atas sebelum event listener keydown
    createKeyboard(keyboardContainer, keyLayout); // Buat keyboard
    resetCurrentLessonState(); // Reset state awal
    doRenderLessonAndFocus(); // Render pelajaran pertama

});