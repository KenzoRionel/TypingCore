// dom-elements.js (DIUPDATE)

/**
 * Mencari dan mengembalikan semua referensi elemen DOM yang dibutuhkan.
 * Jika hiddenInput belum ada, akan membuatnya secara dinamis.
 * @returns {Object|null} Objek berisi referensi elemen DOM, atau null jika ada elemen kunci yang tidak ditemukan.
 */
export function getDOMReferences() {
    const keyboardContainer = document.getElementById('virtual-keyboard');
    const lessonTitle = document.getElementById('lesson-title');
    const lessonInstruction = document.getElementById('lesson-instruction');
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    const nextLessonBtn = document.getElementById('next-lesson-btn');
    // UBAH: Mengambil elemen notifikasi yang baru, bukan modal
    const lessonCompleteNotification = document.getElementById('lesson-complete-notification');
    const continueBtn = document.getElementById('continue-to-next-lesson-btn');
    const nextLessonPreview = document.getElementById('next-lesson-preview');
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');

    // **PENTING**: Verifikasi semua elemen DOM ditemukan
    // nextLessonPreview bisa jadi null jika belum ada di HTML untuk pelajaran awal,
    // tapi itu akan diisi nanti. Jadi, tidak perlu divalidasi ketat.
    if (!keyboardContainer || !lessonTitle || !lessonInstruction || !lessonTextDisplay || !prevLessonBtn || !nextLessonBtn || !lessonCompleteNotification || !continueBtn || !progressBar || !progressText) {
        console.error("ERROR: Satu atau lebih elemen DOM penting tidak ditemukan. Pastikan ID di HTML sudah benar.");
        // Log elemen yang hilang untuk debugging yang lebih mudah
        if (!keyboardContainer) console.error("Missing: #virtual-keyboard");
        if (!lessonTitle) console.error("Missing: #lesson-title");
        if (!lessonInstruction) console.error("Missing: #lesson-instruction");
        if (!lessonTextDisplay) console.error("Missing: #lesson-text-display");
        if (!prevLessonBtn) console.error("Missing: #prev-lesson-btn");
        if (!nextLessonBtn) console.error("Missing: #next-lesson-btn");
        // UBAH: Log notifikasi yang hilang
        if (!lessonCompleteNotification) console.error("Missing: #lesson-complete-notification");
        if (!continueBtn) console.error("Missing: #continue-to-next-lesson-btn");
        if (!progressBar) console.error("Missing: #lesson-progress-bar");
        if (!progressText) console.error("Missing: #progress-percentage");
        return null;
    }

    let hiddenInput = document.getElementById('learnTypingHiddenInput');
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'text';
        hiddenInput.id = 'learnTypingHiddenInput';
        // Atur styling untuk membuatnya tidak terlihat dan tidak mengganggu layout
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';
        hiddenInput.style.pointerEvents = 'none';
        hiddenInput.style.width = '1px'; // Minimal width/height agar bisa difokuskan di beberapa browser
        hiddenInput.style.height = '1px';
        hiddenInput.style.top = '-9999px'; // Pindahkan jauh dari layar
        hiddenInput.style.left = '-9999px';
        
        // Atribut untuk pengalaman mengetik yang lebih baik
        hiddenInput.autocapitalize = 'off';
        hiddenInput.autocomplete = 'off';
        hiddenInput.spellcheck = false;
        hiddenInput.setAttribute('aria-hidden', 'true'); // Sembunyikan dari screen reader jika tidak relevan
        document.body.appendChild(hiddenInput);
    }

    return {
        keyboardContainer,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        // UBAH: Mengembalikan elemen notifikasi yang baru
        lessonCompleteNotification,
        continueBtn,
        nextLessonPreview,
        hiddenInput,
        progressBar,
        progressText,
    };
}