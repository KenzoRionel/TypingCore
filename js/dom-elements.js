// dom-elements.js (DIUPDATE)

/**
 * Mencari dan mengembalikan semua referensi elemen DOM yang dibutuhkan.
 * Jika hiddenInput belum ada, akan membuatnya secara dinamis.
 * @returns {Object|null} Objek berisi referensi elemen DOM, atau null jika ada elemen kunci yang tidak ditemukan.
 */
export function getDOMReferences() {
    const keyboardContainer = document.getElementById('virtual-keyboard');
    if (!keyboardContainer) {
        console.error("ERROR: Elemen DOM penting #virtual-keyboard tidak ditemukan.");
        return null;
    }

    const lessonHeader = document.getElementById('lesson-header');
    if (!lessonHeader) {
        console.error("ERROR: Elemen DOM penting #lesson-header tidak ditemukan.");
        return null;
    }

    const lessonTitle = document.getElementById('lesson-title');
    if (!lessonTitle) {
        console.error("ERROR: Elemen DOM penting #lesson-title tidak ditemukan.");
        return null;
    }

    const lessonInstruction = document.getElementById('lesson-instruction');
    if (!lessonInstruction) {
        console.error("ERROR: Elemen DOM penting #lesson-instruction tidak ditemukan.");
        return null;
    }

    const lessonTextDisplay = document.getElementById('lesson-text-display');
    if (!lessonTextDisplay) {
        console.error("ERROR: Elemen DOM penting #lesson-text-display tidak ditemukan.");
        return null;
    }

    const prevLessonBtn = document.getElementById('prev-lesson-btn');
    if (!prevLessonBtn) {
        console.error("ERROR: Elemen DOM penting #prev-lesson-btn tidak ditemukan.");
        return null;
    }

    const nextLessonBtn = document.getElementById('next-lesson-btn');
    if (!nextLessonBtn) {
        console.error("ERROR: Elemen DOM penting #next-lesson-btn tidak ditemukan.");
        return null;
    }

    const lessonCompleteNotification = document.getElementById('lesson-complete-notification');
    if (!lessonCompleteNotification) {
        console.error("ERROR: Elemen DOM penting #lesson-complete-notification tidak ditemukan.");
        return null;
    }

    const continueBtn = document.getElementById('continue-to-next-lesson-btn');
    if (!continueBtn) {
        console.error("ERROR: Elemen DOM penting #continue-to-next-lesson-btn tidak ditemukan.");
        return null;
    }

    const nextLessonPreview = document.getElementById('next-lesson-preview');
    // nextLessonPreview bisa null untuk pelajaran awal, jadi tidak perlu divalidasi
    
    const progressBar = document.getElementById('lesson-progress-bar');
    if (!progressBar) {
        console.error("ERROR: Elemen DOM penting #lesson-progress-bar tidak ditemukan.");
        return null;
    }

    const progressText = document.getElementById('progress-percentage');
    if (!progressText) {
        console.error("ERROR: Elemen DOM penting #progress-percentage tidak ditemukan.");
        return null;
    }

    const thumbAnimationContainer = document.getElementById('thumb-animation-container');
    if (!thumbAnimationContainer) {
        console.error("ERROR: Elemen DOM penting #thumb-animation-container tidak ditemukan.");
        return null;
    }

    const successAnimationSvg = document.getElementById('success-animation-svg');
    if (!successAnimationSvg) {
        console.error("ERROR: Elemen DOM penting #success-animation-svg tidak ditemukan.");
        return null;
    }

    const circlePath = document.getElementById('circle-path');
    if (!circlePath) {
        console.error("ERROR: Elemen DOM penting #circle-path tidak ditemukan.");
        return null;
    }

    const checkPath = document.getElementById('check-path');
    if (!checkPath) {
        console.error("ERROR: Elemen DOM penting #check-path tidak ditemukan.");
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
        hiddenInput.style.width = '1px';
        hiddenInput.style.height = '1px';
        hiddenInput.style.top = '-9999px';
        hiddenInput.style.left = '-9999px';
        hiddenInput.autocapitalize = 'off';
        hiddenInput.autocomplete = 'off';
        hiddenInput.spellcheck = false;
        document.body.appendChild(hiddenInput);
    }

    return {
        keyboardContainer,
        lessonHeader,
        lessonTitle,
        lessonInstruction,
        lessonTextDisplay,
        prevLessonBtn,
        nextLessonBtn,
        lessonCompleteNotification,
        continueBtn,
        nextLessonPreview,
        hiddenInput,
        progressBar,
        progressText,
        thumbAnimationContainer,
        successAnimationSvg,
        circlePath,
        checkPath,
    };
}