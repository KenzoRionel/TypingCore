// js/learn-typing-logic.js
import { lessons } from './learn-typing-lessons.js';
import { updateUnderlineStatus } from './underline-logic.js';
import { getState, updateState, getHiddenInput } from './learn-typing-state.js';
import {
    getSequenceForState,
    renderLesson2,
    cleanupLesson2Elements,
} from './lesson2-logic.js';
import {
    renderLesson3,
    cleanupLesson3Elements,
} from './lesson3-logic.js';
import {
    renderLesson4,
    cleanupLesson4Elements,
} from './lesson4-logic.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';
import { updateHandVisualizer } from './hand-visualizer.js';

let currentHighlightedKeyElement = null;

function createHandVisualizerElement() {
    const visualizerContainer = document.createElement('div');
    visualizerContainer.id = 'hand-visualizer-container';

    const handF = document.createElement('img');
    handF.id = 'hand-f';
    handF.classList.add('hand-image');
    handF.src = 'img/hand_f.png';
    handF.alt = 'Tangan untuk tombol F';

    const handJ = document.createElement('img');
    handJ.id = 'hand-j';
    handJ.classList.add('hand-image');
    handJ.src = 'img/hand_j.png';
    handJ.alt = 'Tangan untuk tombol J';

    const handSpace = document.createElement('img');
    handSpace.id = 'hand-space';
    handSpace.classList.add('hand-image');
    handSpace.src = 'img/hand_space.png';
    handSpace.alt = 'Tangan untuk tombol spasi';

    visualizerContainer.appendChild(handF);
    visualizerContainer.appendChild(handJ);
    visualizerContainer.appendChild(handSpace);
    
    return visualizerContainer;
}

export function resetLesson2State(keyboardContainer) {
    updateState('lesson2State', 0);
    updateState('lesson2SequenceIndex', 0);

    cleanupLesson2Elements(document.getElementById('lesson-instruction'));

    if (keyboardContainer) {
        const highlightedKeys = keyboardContainer.querySelectorAll('.key.next-key, .key.correct-key, .key.wrong-key');
        highlightedKeys.forEach(key => {
            key.classList.remove('next-key', 'correct-key', 'wrong-key');
            key.style.animation = '';
        });
    }

    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key');
        currentHighlightedKeyElement.style.animation = '';
        currentHighlightedKeyElement = null;
    }
}

export function resetLesson3State(keyboardContainer) {
    updateState('lesson3State', 0);
    updateState('lesson3SequenceIndex', 0);
    
    cleanupLesson3Elements(document.getElementById('lesson-instruction'));

    if (keyboardContainer) {
        const highlightedKeys = keyboardContainer.querySelectorAll('.key.next-key, .key.correct-key, .key.wrong-key');
        highlightedKeys.forEach(key => {
            key.classList.remove('next-key', 'correct-key', 'wrong-key');
            key.style.animation = '';
        });
    }

    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key');
        currentHighlightedKeyElement.style.animation = '';
        currentHighlightedKeyElement = null;
    }
}

export function resetLesson4State(keyboardContainer) {
    updateState('lesson4State', 0);
    updateState('lesson4SequenceIndex', 0);
    
    cleanupLesson4Elements(document.getElementById('lesson-instruction'));

    if (keyboardContainer) {
        const highlightedKeys = keyboardContainer.querySelectorAll('.key.next-key, .key.correct-key, .key.wrong-key');
        highlightedKeys.forEach(key => {
            key.classList.remove('next-key', 'correct-key', 'wrong-key');
            key.style.animation = '';
        });
    }

    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key');
        currentHighlightedKeyElement.style.animation = '';
        currentHighlightedKeyElement = null;
    }
}

export function createKeyboard(keyboardContainer, keyLayout) {
    if (!keyboardContainer) {
        console.error("keyboardContainer tidak ditemukan. Tidak dapat membuat keyboard.");
        return;
    }

    let handVisualizer = keyboardContainer.querySelector('#hand-visualizer-container');
    if (!handVisualizer) {
        handVisualizer = createHandVisualizerElement();
        keyboardContainer.prepend(handVisualizer);
    }
    
    const childrenToRemove = Array.from(keyboardContainer.children).filter(child => child.id !== 'hand-visualizer-container');
    childrenToRemove.forEach(child => keyboardContainer.removeChild(child));
    
    keyLayout.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.classList.add('keyboard-row');
        row.forEach(key => {
            if (key === '') {
                return;
            }
            const keyElement = document.createElement('div');
            keyElement.classList.add('key');
            let lowerKey = key.toLowerCase();
            let displayKey = key;

            if (key === 'ShiftLeft' || key === 'ShiftRight') displayKey = 'Shift';
            if (key === 'ControlLeft' || key === 'ControlRight') displayKey = 'Ctrl';
            if (key === 'AltLeft' || key === 'AltRight') displayKey = 'Alt';
            if (key === 'MetaLeft' || key === 'MetaRight') displayKey = 'Win';
            if (key === 'ContextMenu') displayKey = 'Menu';
            if (key === 'Space') {
                displayKey = '';
                lowerKey = ' ';
            }

            keyElement.textContent = displayKey;
            keyElement.setAttribute('data-key', lowerKey);

            if (['ShiftLeft', 'ShiftRight'].includes(key)) {
                keyElement.classList.add('key-wide');
            }
            if (['Tab'].includes(key)) {
                keyElement.classList.add('key-tab');
            }
            if (['CapsLock', 'Backspace', 'Enter'].includes(key)) {
                keyElement.classList.add('key-medium');
            }
            if (key === 'Space') {
                keyElement.classList.add('key-space');
            }
            if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu'].includes(key)) {
                keyElement.classList.add('key-small');
            }
            rowElement.appendChild(keyElement);
        });
        keyboardContainer.appendChild(rowElement);
    });
}

function clearKeyboardHighlights(keyboardContainer) {
    if (!keyboardContainer) return;
    keyboardContainer.querySelectorAll('.key.next-key, .key.correct-key, .key.wrong-key').forEach(el => {
        el.classList.remove('next-key', 'correct-key', 'wrong-key');
        el.style.animation = '';
    });
    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.style.animation = '';
    }
    currentHighlightedKeyElement = null;
}

export function highlightKeyOnKeyboard(keyboardContainer, keyChar) {
    if (!keyboardContainer) {
        console.error("ERROR: keyboardContainer tidak ditemukan.");
        return;
    }
    const handVisualizer = keyboardContainer.querySelector('#hand-visualizer-container');

    clearKeyboardHighlights(keyboardContainer);
    if (typeof keyChar === 'string' && keyChar.length > 0) {
        const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);
        if (targetKeyElement) {
            targetKeyElement.classList.add('next-key');
            void targetKeyElement.offsetWidth;
            targetKeyElement.style.animation = 'highlight-move 0.6s ease-out infinite';
            currentHighlightedKeyElement = targetKeyElement;
        }
    }
    
    updateHandVisualizer(handVisualizer, keyboardContainer, keyChar);
}


export function renderLesson({
    lessons,
    currentLessonIndex,
    currentStepIndex,
    currentCharIndex,
    keyboardContainer,
    lessonTitle,
    lessonInstruction,
    lessonTextDisplay,
    feedbackIndex = -1,
    isCorrect = null
}) {
    if (!lessons || !lessons[currentLessonIndex]) {
        console.error("Pelajaran tidak ditemukan atau indeks tidak valid.");
        return;
    }

    const lesson = lessons[currentLessonIndex];
    if (lessonTitle) lessonTitle.textContent = lesson.title;

    clearKeyboardHighlights(keyboardContainer);

    const lesson2State = getState('lesson2State');
    const lesson2SequenceIndex = getState('lesson2SequenceIndex');
    const lesson3State = getState('lesson3State');
    const lesson3SequenceIndex = getState('lesson3SequenceIndex');
    // Tambahan: Dapatkan status pelajaran 4
    const lesson4State = getState('lesson4State');
    const lesson4SequenceIndex = getState('lesson4SequenceIndex');

    if (currentLessonIndex === 0) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        cleanupLesson2Elements(lessonInstruction);

        if (lessonInstruction) {
            if (currentStepIndex === 0) {
                lessonInstruction.innerHTML = lesson.steps[0].instruction;
                highlightKeyOnKeyboard(keyboardContainer, 'f');
            } else if (currentStepIndex === 1) {
                lessonInstruction.innerHTML = lesson.steps[1].instruction;
                highlightKeyOnKeyboard(keyboardContainer, 'j');
            } else if (currentStepIndex === 2) {
                lessonInstruction.textContent = 'GOOD JOB! Klik "Lanjutkan" untuk ke pelajaran berikutnya.';
                highlightKeyOnKeyboard(keyboardContainer, null);
            }
        }
    } else if (currentLessonIndex === 1) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        renderLesson2(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
    } else if (currentLessonIndex === 2) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        renderLesson3(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
    }
    // Tambahan: Logika untuk Pelajaran 4
    else if (currentLessonIndex === 3) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        renderLesson4(lessonInstruction, keyboardContainer, feedbackIndex, isCorrect);
    } 
    // Logika untuk pelajaran lainnya
    else {
        cleanupLesson2Elements(lessonInstruction);
        renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer);
    }

    const progress = calculateLessonProgress(
        currentLessonIndex,
        currentStepIndex,
        currentCharIndex,
        lesson2State,
        lesson2SequenceIndex,
        lesson3State,
        lesson3SequenceIndex,
        // Tambahan: Kirim status pelajaran 4 ke fungsi progress
        lesson4State,
        lesson4SequenceIndex,
        lessons[currentLessonIndex]
    );
    updateProgressBar(progress);
}

export function showLessonCompleteNotification(lessons, currentLessonIdx, domElements) {
    const {
        lessonHeader,
        lessonCompleteNotification,
        continueBtn,
        keyboardContainer,
        nextLessonPreview,
        successAnimationSvg,
        prevLessonBtn,
        nextLessonBtn,
        hiddenInput
    } = domElements;

    if (lessonHeader) {
        lessonHeader.style.display = 'none';
    }

    if (keyboardContainer) {
        keyboardContainer.style.display = 'none';
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            key.style.animation = 'none';
            key.classList.remove('next-key', 'correct-key', 'wrong-key');
        });
    }

    if (prevLessonBtn) prevLessonBtn.style.display = 'none';
    if (nextLessonBtn) nextLessonBtn.style.display = 'none';

    if (lessonCompleteNotification) {
        const currentLesson = lessons[currentLessonIdx];

        const h2 = lessonCompleteNotification.querySelector('h2');
        if (h2) {
            h2.textContent = `Pelajaran ${currentLessonIdx + 1} selesai!`;
        }
        
        if (successAnimationSvg) {
            successAnimationSvg.classList.remove('animate-circle', 'animate-check');
            void successAnimationSvg.offsetWidth; 
            successAnimationSvg.classList.add('animate-circle');
            
            setTimeout(() => {
                successAnimationSvg.classList.add('animate-check');
            }, 1000);
        }

        if (nextLessonPreview) {
            const nextLessonIndex = currentLessonIdx + 1;
            if (nextLessonIndex < lessons.length) {
                const nextLesson = lessons[nextLessonIndex];
                let previewText = '';
                if (nextLessonIndex === 0) {
                    previewText = `Ketik huruf: <span class="highlight-key-modal">F</span> dan <span class="highlight-key-modal">J</span>`;
                } else if (nextLessonIndex === 1) {
                    previewText = `Latihan: <span class="highlight-key-modal">F</span> dan <span class="highlight-key-modal">J</span> berulang.`;
                } else if (nextLessonIndex === 2) {
                    previewText = `Lanjutan latihan: <span class="highlight-key-modal">F</span> dan <span class="highlight-key-modal">J</span> acak.`;
                } else if (nextLessonIndex === 3) {
                    previewText = `Lanjutan latihan: <span class="highlight-key-modal">G</span> dan <span class="highlight-key-modal">H</span>.`;
                } else {
                    const previewChars = nextLesson.sequence ? nextLesson.sequence.slice(0, 5).join('') : 'Latihan Baru';
                    previewText = `Ketik: <span class="highlight-key-modal">${previewChars}...</span>`;
                }
                nextLessonPreview.innerHTML = previewText;
            } else {
                nextLessonPreview.textContent = "Anda telah menyelesaikan semua pelajaran!";
            }
        }
        
        lessonCompleteNotification.style.display = 'flex';
        setTimeout(() => {
            lessonCompleteNotification.classList.add('active');
            if (continueBtn) {
                continueBtn.focus();
            } else {
                console.error('ERROR: Elemen continueBtn tidak ditemukan saat mencoba fokus!');
            }
        }, 50);
    } else {
        console.error('ERROR: Elemen notifikasi (#lesson-complete-notification) tidak ditemukan!');
    }
}

function renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer) {
    if (!lessonTextDisplay || !lessonInstruction) return;

    lessonTextDisplay.style.display = '';
    lessonInstruction.textContent = lesson.instruction || '';

    lessonTextDisplay.innerHTML = '';

    if (lesson.sequence && lesson.sequence.length > 0) {
        lesson.sequence.forEach((char, idx) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char; 
            if (idx < currentCharIndex) {
                span.classList.add('correct');
            } else if (idx === currentCharIndex) {
                span.classList.add('cursor');
            }
            lessonTextDisplay.appendChild(span);
        });
        if (currentCharIndex < lesson.sequence.length) {
            highlightKeyOnKeyboard(keyboardContainer, lesson.sequence[currentCharIndex]);
        } else {
            highlightKeyOnKeyboard(keyboardContainer, null);
        }
    }
}