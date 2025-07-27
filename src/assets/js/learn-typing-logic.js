// Logic terpisah untuk learn-typing - DIPERBAIKI
import {lessons} from './learn-typing-lessons.js';
import { highlightKey } from './keyboard-module.js';

// --- STATE PELAJARAN 2 (MODULE-SCOPED) ---
let lesson2State = 0;
let lesson2FCount = 0;
let lesson2JCount = 0;
let lesson2SequenceIndex = 0;

// Tambahkan variabel untuk menyimpan referensi kontainer Pelajaran 2
let lesson2SequenceContainer = null;
let lesson2UnderlineContainer = null;

// --- PROGRESS BAR UTILITIES ---
export function calculateLessonProgress(currentLessonIndex, currentStepIndex, currentCharIndex, lesson2State, lesson2SequenceIndex, lesson) {
    // Pelajaran 1 (Step-based)
    if (currentLessonIndex === 0) {
        const totalSteps = lesson.steps.length;
        return (currentStepIndex / totalSteps) * 100;
    }
    // Pelajaran 2 (State-based)
    else if (currentLessonIndex === 1) {
        const TOTAL_STATES = 12; // Total state di Pelajaran 2
        const SEQUENCE_PER_STATE = 6; // 6 sequence per state
        const totalSteps = (TOTAL_STATES * SEQUENCE_PER_STATE);
        const currentStepIndex = (lesson2State * SEQUENCE_PER_STATE) + lesson2SequenceIndex;
        return (currentStepIndex / totalSteps) * 100;
    }
    // Pelajaran Lain (Character-based)
    else {
        if (!lesson.sequence) return 0;
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

// --- FUNGSI RESET STATE PELAJARAN 2 ---
// Tambahkan parameter keyboardContainer
export function resetLesson2State(keyboardContainer=null) {
    lesson2State = 0;
    lesson2FCount = 0;
    lesson2JCount = 0;
    lesson2SequenceIndex = 0;

    // Reset kontainer dan highlight
    if (lesson2SequenceContainer?.parentNode) {
        lesson2SequenceContainer.innerHTML = '';
    }
    if (lesson2UnderlineContainer?.parentNode) {
        lesson2UnderlineContainer.innerHTML = '';
    }

    // Reset highlight keyboard (jika container tersedia)
    if (keyboardContainer) {
        const highlightedKeys = keyboardContainer.querySelectorAll('.key.next-key');
        highlightedKeys.forEach(key => {
            key.classList.remove('next-key');
            key.style.animation = '';
        }
        );
    }

    // Reset global highlight
    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key');
        currentHighlightedKeyElement.style.animation = '';
        currentHighlightedKeyElement = null;
    }
}

// --- FUNGSI MENDAPATKAN URUTAN KARAKTER UNTUK PELAJARAN 2 ---
export function getSequenceForState(state) {
    switch (state) {
    case 0:
        return ['f', 'f', 'f', 'f', 'j', 'j'];
    case 2:
        return ['j', 'j', 'f', 'f', 'f', 'f'];
    case 4:
        return ['j', 'j', 'j', 'j', 'f', 'f'];
    case 6:
        return ['j', 'j', 'f', 'f', 'j', 'j'];
    case 8:
        return ['f', 'j', 'f', 'j', 'j', 'f'];
    case 10:
        return ['j', 'f', 'f', 'j', 'f', 'j'];
    default:
        return [];
    }
}

// --- FUNGSI RENDER PELAJARAN ---
export function renderLesson({lessons, currentLessonIndex, currentStepIndex, currentCharIndex, waitingForAnim, keyboardContainer, lessonTitle, lessonInstruction, lessonTextDisplay, feedbackIndex=-1, isCorrect=null}) {
    if (!lessons || !lessons[currentLessonIndex])
        return;

    const lesson = lessons[currentLessonIndex];
    if (lessonTitle)
        lessonTitle.textContent = lesson.title;

    clearKeyboardHighlights(keyboardContainer);

    if (currentLessonIndex === 0) {
        // Pelajaran 1
        if (lessonTextDisplay)
            lessonTextDisplay.style.display = 'none';

        if (currentStepIndex === 0) {
            if (lessonInstruction)
                lessonInstruction.innerHTML = lesson.steps[0].instruction;
            highlightKey( 'f');
        } else if (currentStepIndex === 1) {
            if (lessonInstruction)
                lessonInstruction.innerHTML = lesson.steps[1].instruction;
            highlightKey( 'j');
        } else if (currentStepIndex === 2) {
            if (lessonInstruction)
                lessonInstruction.textContent = 'Pelajaran 1 Selesai! Klik "Lanjutkan" untuk ke pelajaran berikutnya.';
        }
    } else if (currentLessonIndex === 1) {
        // Pelajaran 2
        renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
    } else {
        // Pelajaran lainnya
        cleanupLesson2Elements(lessonInstruction);
        renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer);
        // Update progress untuk pelajaran non-2
    if (currentLessonIndex !== 1) { // Pastikan ini diakses dari parent function
        const progress = calculateLessonProgress(
            currentLessonIndex,
            0, // currentStepIndex tidak digunakan
            currentCharIndex,
            0, // lesson2State tidak digunakan
            0, // lesson2SequenceIndex tidak digunakan
            lesson
        );
        updateProgressBar(progress);
    }
    }

    // Update progress bar
    const progress = calculateLessonProgress(
        currentLessonIndex,
        currentStepIndex,
        currentCharIndex,
        lesson2State,
        lesson2SequenceIndex,
        lessons[currentLessonIndex]
    );
    updateProgressBar(progress);
}

// --- FUNGSI RENDER KHUSUS PELAJARAN 2 ---
function renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex=-1, isCorrect=null) {
    if (!lessonInstruction)
        return;

    // Inisialisasi kontainer jika belum ada
    if (!lesson2SequenceContainer || !lessonInstruction.contains(lesson2SequenceContainer)) {
        lesson2SequenceContainer = document.createElement('div');
        lesson2SequenceContainer.classList.add('lesson-keyboard-sequence');
        lessonInstruction.appendChild(lesson2SequenceContainer);
    }
    if (!lesson2UnderlineContainer || !lessonInstruction.contains(lesson2UnderlineContainer)) {
        lesson2UnderlineContainer = document.createElement('div');
        lesson2UnderlineContainer.classList.add('lesson-keyboard-underline');
        lessonInstruction.appendChild(lesson2UnderlineContainer);
    }

    let instructionText = '';
    let keysToDisplay = [];
    let activeIndex = -1;
    let highlightedKey = null;

    const isTransitionState = [1, 3, 5, 7, 9, 11].includes(lesson2State);
    // Tentukan konten berdasarkan state
    switch (lesson2State) {
    case 0:
    case 2:
    case 4:
    case 6:
    case 8:
    case 10:
        const sequence = getSequenceForState(lesson2State);
        keysToDisplay = sequence;
        activeIndex = lesson2SequenceIndex;
        highlightedKey = sequence[lesson2SequenceIndex];
        break;
    case 1:
        instructionText = '';
        break;
    case 3:
        instructionText = '';
        break;
    case 5:
    case 7:
    case 9:
    case 11:
        instructionText = (lesson2State === 11) ? '' : '';
        break;
    default:
        instructionText = '';
        break;
    }

    // Update teks instruksi
    updateInstructionText(lessonInstruction, instructionText);

    // Handle tampilan berdasarkan state
    if (isTransitionState) {
        handleTransitionState();
    } else {
        handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex, isCorrect);
    }
}

// --- FUNGSI HELPER UNTUK PELAJARAN 2 ---
function updateInstructionText(lessonInstruction, text) {
    Array.from(lessonInstruction.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('lesson-keyboard-sequence') && !node.classList.contains('lesson-keyboard-underline'))) {
            node.remove();
        }
    }
    );
    lessonInstruction.prepend(document.createTextNode(text));
}

function handleTransitionState() {
    if (lesson2SequenceContainer) {
        Array.from(lesson2SequenceContainer.children).forEach(keyEl => {
            keyEl.classList.remove('active', 'slide-down-fade-in', 'no-initial-animation');
            keyEl.classList.add('slide-up-fade-out');
            void keyEl.offsetWidth;
            keyEl.addEventListener('animationend', () => keyEl.remove(), {
                once: true
            });
        }
        );
    }
    if (lesson2UnderlineContainer) {
        lesson2UnderlineContainer.innerHTML = '';
    }
    highlightKeyOnKeyboard(null, null);
}

function handleActiveState(keysToDisplay, activeIndex, highlightedKey, keyboardContainer, feedbackIndex=-1, isCorrect=null) {
    if (!lesson2SequenceContainer || !lesson2UnderlineContainer)
        return;

    const requiresRebuild = lesson2SequenceContainer.children.length === 0;

    if (requiresRebuild) {
        lesson2SequenceContainer.innerHTML = '';
        lesson2UnderlineContainer.innerHTML = '';

        keysToDisplay.forEach( (keyChar, idx) => {
            const keyEl = document.createElement('span');
            keyEl.classList.add('lesson-keyboard-key');
            keyEl.textContent = keyChar;
            lesson2SequenceContainer.appendChild(keyEl);

            const underlineEl = document.createElement('span');
            underlineEl.classList.add('lesson-keyboard-underline-item');
            lesson2UnderlineContainer.appendChild(underlineEl);

            keyEl.classList.add('slide-down-fade-in');
            void keyEl.offsetWidth;
        }
        );
    }

    // Update status aktif dan feedback
    updateActiveStatus(activeIndex);
    applyFeedback(feedbackIndex, isCorrect);

    if (highlightedKey) {
        highlightKey( highlightedKey);
    }
}

function updateActiveStatus(activeIndex) {
    if (!lesson2SequenceContainer || !lesson2UnderlineContainer)
        return;

    const keyElements = Array.from(lesson2SequenceContainer.children);
    const underlineElements = Array.from(lesson2UnderlineContainer.children);

    keyElements.forEach( (keyEl, idx) => {
        keyEl.classList.toggle('active', idx === activeIndex);
    }
    );

    underlineElements.forEach( (underlineEl, idx) => {
        underlineEl.classList.toggle('active', idx === activeIndex);
    }
    );
}

function applyFeedback(feedbackIndex, isCorrect) {
    if (feedbackIndex < 0 || isCorrect === null)
        return;

    const keyElements = Array.from(lesson2SequenceContainer.children);
    if (keyElements[feedbackIndex]) {
        // Hapus class feedback sebelumnya
        keyElements[feedbackIndex].classList.remove('completed-correct', 'input-incorrect');

        // Jika benar, tambahkan class hijau permanen
        if (isCorrect) {
            keyElements[feedbackIndex].classList.add('completed-correct');
        }// Jika salah, tambahkan class merah sementara
        else {
            keyElements[feedbackIndex].classList.add('input-incorrect');

            // Hapus class merah setelah animasi selesai (1 detik)
            setTimeout( () => {
                keyElements[feedbackIndex].classList.remove('input-incorrect');
            }
            , 500);
        }

        void keyElements[feedbackIndex].offsetWidth;
        // Force re-render
    }
}

function cleanupLesson2Elements(lessonInstruction) {
    if (lesson2SequenceContainer && lesson2SequenceContainer.parentNode) {
        lesson2SequenceContainer.remove();
        lesson2SequenceContainer = null;
    }
    if (lesson2UnderlineContainer && lesson2UnderlineContainer.parentNode) {
        lesson2UnderlineContainer.remove();
        lesson2UnderlineContainer = null;
    }
    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key');
        currentHighlightedKeyElement.style.animation = '';
        currentHighlightedKeyElement = null;
    }
}

function renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer) {
    if (lessonTextDisplay)
        lessonTextDisplay.style.display = '';
    if (lessonInstruction)
        lessonInstruction.textContent = lesson.instruction || '';
    if (lessonTextDisplay)
        lessonTextDisplay.innerHTML = '';

    if (lesson.sequence && lessonTextDisplay) {
        lesson.sequence.forEach( (char, idx) => {
            const span = document.createElement('span');
            span.textContent = char;
            if (idx < currentCharIndex) {
                span.classList.add('correct');
            } else if (idx === currentCharIndex) {
                span.classList.add('cursor');
            }
            lessonTextDisplay.appendChild(span);
            if (idx < lesson.sequence.length - 1 && char !== ' ') {
                lessonTextDisplay.appendChild(document.createTextNode(' '));
            }
        }
        );
        if (currentCharIndex < lesson.sequence.length) {
            highlightKey( lesson.sequence[currentCharIndex]);
        }
    }
}

// --- FUNGSI UNTUK MENGHIGHLIGHT KUNCI BERIKUTNYA ---
export function highlightNextKey({keyboardContainer}) {// Placeholder - logika highlight sudah ditangani di renderLesson
}

// --- FUNGSI INPUT HANDLER UNTUK PELAJARAN 2 - DIPERBAIKI ---
export function handleLesson2Input({e, doRenderAndHighlight, dispatchLesson2FinishedEvent, lessonInstructionEl}) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    let isCorrect = false;
    let feedbackIndex = -1;
    let oldState = lesson2State;

    // Logika untuk setiap state
    switch (lesson2State) {
    case 0:
    case 2:
    case 4:
    case 6:
    case 8:
    case 10:
        const sequence = getSequenceForState(lesson2State);
        const expectedKey = sequence[lesson2SequenceIndex];
        if (e.key.toLowerCase() === expectedKey) {
            isCorrect = true;
            feedbackIndex = lesson2SequenceIndex;
            lesson2SequenceIndex++;
            if (lesson2State !== oldState || isCorrect) {
        const progress = calculateLessonProgress(
            1, // currentLessonIndex untuk Pelajaran 2
            0, // currentStepIndex tidak digunakan
            0, // currentCharIndex tidak digunakan
            lesson2State,
            lesson2SequenceIndex,
            lessons[1] // Ambil data Pelajaran 2
        );
        updateProgressBar(progress);
    }
            if (lesson2SequenceIndex >= 6) {
                lesson2SequenceIndex = 0;
                lesson2State++;
                // Tambahkan setelah lesson2State++ atau sequence update
                if (lesson2State === 11) {
                    setTimeout( () => {
                        dispatchLesson2FinishedEvent(new Event('lesson2-finished'));
                    }
                    , 300);
                }
            }
        } else {
            feedbackIndex = lesson2SequenceIndex;
        }
        break;
    }

    // Error shake jika input salah
    if (!isCorrect && lessonInstructionEl) {
        lessonInstructionEl.classList.add('error-shake');
        setTimeout( () => lessonInstructionEl.classList.remove('error-shake'), 200);
    }

    // Re-render dengan feedback
    if (lesson2State !== oldState || feedbackIndex !== -1) {
        doRenderAndHighlight(feedbackIndex, isCorrect);
    }

    // Handle transisi state
    if ([1, 3, 5, 7, 9, 11].includes(lesson2State) && lesson2State !== oldState) {
        setTimeout( () => {
            if (lesson2SequenceContainer)
                lesson2SequenceContainer.innerHTML = '';
            if (lesson2UnderlineContainer)
                lesson2UnderlineContainer.innerHTML = '';
            if (lesson2State < 12)
                lesson2State++;
            doRenderAndHighlight();
        }
        , 400);
    }
}
