// dom-elements.js

/**
 * Mencari dan mengembalikan semua referensi elemen DOM yang dibutuhkan.
 * Jika hiddenInput belum ada, akan membuatnya secara dinamis.
 * @returns {Object} Objek berisi referensi elemen DOM.
 */
export function getDOMReferences() {
    const keyboardContainer = document.getElementById('virtual-keyboard');
    const lessonTitle = document.getElementById('lesson-title');
    const lessonInstruction = document.getElementById('lesson-instruction');
    const lessonTextDisplay = document.getElementById('lesson-text-display');
    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    const nextLessonBtn = document.getElementById('next-lesson-btn');
    const modal = document.getElementById('lesson-complete-modal');
    const continueBtn = document.getElementById('continue-to-next-lesson-btn');
    const nextLessonPreview = document.getElementById('next-lesson-preview');
    const progressBar = document.getElementById('lesson-progress-bar');
    const progressText = document.getElementById('progress-percentage');

    // **PENTING**: Verifikasi semua elemen DOM ditemukan
    if (!keyboardContainer || !lessonTitle || !lessonInstruction || !lessonTextDisplay || !prevLessonBtn || !nextLessonBtn || !modal || !continueBtn || !progressBar || !progressText) {
        console.error("ERROR: Satu atau lebih elemen DOM tidak ditemukan. Pastikan ID di HTML sudah benar.");
        return null;
    }

    let hiddenInput = document.getElementById('learnTypingHiddenInput');
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
    
    // Pastikan hiddenInput langsung fokus setelah dibuat/ditemukan
    setTimeout(() => hiddenInput.focus(), 0);

    return {
        keyboardContainer,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        modal,
        continueBtn,
        nextLessonPreview,
        hiddenInput,
        progressBar,
        progressText,
    };
}