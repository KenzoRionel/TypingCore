// learn-typing-ui.js

import { updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';

let currentHighlightedKeyElement = null;

export function createHandVisualizerElement() {
    const visualizerContainer = document.createElement('div');
    visualizerContainer.id = 'hand-visualizer';

    const handImages = [
        { id: 'hand-f', src: 'img/hand_f.png', alt: 'Tangan untuk tombol F' },
        { id: 'hand-j', src: 'img/hand_j.png', alt: 'Tangan untuk tombol J' },
        { id: 'hand-space', src: 'img/hand_space.png', alt: 'Tangan untuk tombol spasi' },
        { id: 'hand-d', src: 'img/hand_d.png', alt: 'Tangan untuk tombol D' },
        { id: 'hand-k', src: 'img/hand_k.png', alt: 'Tangan untuk tombol K' },
    ];

    handImages.forEach(hand => {
        const img = document.createElement('img');
        img.id = hand.id;
        img.classList.add('hand-image');
        img.src = hand.src;
        img.alt = hand.alt;
        visualizerContainer.appendChild(img);
    });

    return visualizerContainer;
}

export function createKeyboard(keyboardContainer, keyLayout) {
    if (!keyboardContainer) {
        console.error("keyboardContainer tidak ditemukan. Tidak dapat membuat keyboard.");
        return;
    }
    const handVisualizer = keyboardContainer.querySelector('#hand-visualizer') || createHandVisualizerElement();
    keyboardContainer.innerHTML = '';
    keyboardContainer.appendChild(handVisualizer);

    const keyWidthClasses = {
        'ShiftLeft': 'key-wide',
        'ShiftRight': 'key-wide',
        'Tab': 'key-tab',
        'CapsLock': 'key-medium',
        'Backspace': 'key-medium',
        'Enter': 'key-medium',
        'Space': 'key-space',
        'ControlLeft': 'key-small',
        'ControlRight': 'key-small',
        'AltLeft': 'key-small',
        'AltRight': 'key-small',
        'MetaLeft': 'key-small',
        'MetaRight': 'key-small',
        'ContextMenu': 'key-small',
    };

    const keyDisplayNames = {
        'ShiftLeft': 'Shift',
        'ShiftRight': 'Shift',
        'ControlLeft': 'Ctrl',
        'ControlRight': 'Ctrl',
        'AltLeft': 'Alt',
        'AltRight': 'Alt',
        'MetaLeft': 'Win',
        'MetaRight': 'Win',
        'ContextMenu': 'Menu',
        'Space': '',
    };
    
    keyLayout.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.classList.add('keyboard-row');
        row.forEach(key => {
            if (key === '') return;
            
            const keyElement = document.createElement('div');
            keyElement.classList.add('key');
            
            const displayKey = keyDisplayNames[key] !== undefined ? keyDisplayNames[key] : key;
            const lowerKey = key === 'Space' ? ' ' : key.toLowerCase();
            
            keyElement.textContent = displayKey;
            keyElement.setAttribute('data-key', lowerKey);
            
            const widthClass = keyWidthClasses[key];
            if (widthClass) {
                keyElement.classList.add(widthClass);
            }
            
            rowElement.appendChild(keyElement);
        });
        keyboardContainer.appendChild(rowElement);
    });
}

export function clearKeyboardHighlights(keyboardContainer) {
    if (!keyboardContainer) return;
    keyboardContainer.querySelectorAll('.key:not(.wrong-key-flash)').forEach(el => {
        el.classList.remove('next-key', 'correct-key', 'wrong-key');
    });
}

export function highlightKeyOnKeyboard(keyboardContainer, keyChar) {
    if (!keyboardContainer) {
        console.error("ERROR: keyboardContainer tidak ditemukan.");
        return;
    }
    clearKeyboardHighlights(keyboardContainer);
    if (typeof keyChar === 'string' && keyChar.length > 0) {
        const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);
        if (targetKeyElement) {
            targetKeyElement.classList.add('next-key');
        }
    }
}

export function renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer) {
    if (!lessonTextDisplay || !lessonInstruction) return;
    lessonTextDisplay.style.display = '';
    lessonInstruction.textContent = lesson.instruction || '';
    lessonTextDisplay.innerHTML = '';
    
    if (lesson.sequence && lesson.sequence.length > 0) {
        lessonTextDisplay.innerHTML = lesson.sequence.map((char, idx) => {
            const displayChar = char === ' ' ? '\u00A0' : char;
            let className = 'typing-char';
            
            if (idx < currentCharIndex) {
                className += ' correct';
            } else if (idx === currentCharIndex) {
                className += ' cursor';
            }
            
            return `<span class="${className}">${displayChar}</span>`;
        }).join('');

        if (currentCharIndex < lesson.sequence.length) {
            const nextChar = lesson.sequence[currentCharIndex];
            const keyElement = keyboardContainer.querySelector(`[data-key="${nextChar.toLowerCase()}"]`);

            if (keyElement) {
                keyElement.classList.add('next-key');
                if (setAnimatingKey) setAnimatingKey(keyElement);
                if (renderHandVisualizer) renderHandVisualizer(nextChar);
            }
        } else {
            if (setAnimatingKey) setAnimatingKey(null);
            if (renderHandVisualizer) renderHandVisualizer(null);
            clearKeyboardHighlights(keyboardContainer);
        }
    }
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
        lessonTextDisplay,
        progressContainerWrapper
    } = domElements;

    [lessonHeader, keyboardContainer, prevLessonBtn, nextLessonBtn, lessonTextDisplay, progressContainerWrapper].forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    if (keyboardContainer) {
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            key.style.animation = 'none';
            key.classList.remove('next-key', 'correct-key', 'wrong-key', 'wrong-key-flash');
            key.style.borderImageSource = 'none';
            key.style.border = '1px solid #444';
        });
    }
    
    const completionProgressBar = document.getElementById('completion-progress-bar');
    const completionProgressText = document.getElementById('completion-progress-text');

    if (completionProgressBar && completionProgressText) {
        completionProgressBar.style.width = '0%';
        completionProgressText.textContent = '0%';

        setTimeout(() => {
            completionProgressBar.style.width = '100%';
        }, 100);

        let currentPercentage = 0;
        const interval = setInterval(() => {
            currentPercentage += 1;
            completionProgressText.textContent = `${currentPercentage}%`;
            if (currentPercentage >= 100) {
                clearInterval(interval);
            }
        }, 15);
    }

    if (lessonCompleteNotification) {
        const h2 = lessonCompleteNotification.querySelector('h3');
        if (h2) h2.textContent = `Pelajaran ${currentLessonIdx + 1} selesai!`;
        if (successAnimationSvg) {
            successAnimationSvg.classList.remove('animate');
            void successAnimationSvg.offsetWidth;
            successAnimationSvg.classList.add('animate');
        }

        if (nextLessonPreview) {
            const nextLessonIndex = currentLessonIdx + 1;
            if (nextLessonIndex < lessons.length) {
                const nextLesson = lessons[nextLessonIndex];
                let previewText;
                if (nextLesson.type === 'simple-drill' && nextLesson.keys) {
                    previewText = `Latihan: <span class="highlight-key-modal">${nextLesson.keys.join(', ')}</span>.`;
                } else if (nextLesson.type === 'free-typing' && nextLesson.sequence) {
                    const previewChars = nextLesson.sequence.slice(0, 5).join('');
                    previewText = `Ketik: <span class="highlight-key-modal">${previewChars}...</span>`;
                } else if (nextLesson.type === 'character-drill' && nextLesson.sequence) {
                    const uniqueChars = [...new Set(nextLesson.sequence.join(''))].join('');
                    previewText = `Ketik huruf: <span class="highlight-key-modal">${uniqueChars}</span>.`;
                } else {
                    previewText = 'Latihan Baru';
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

export function highlightWrongKeyOnKeyboard(keyboardContainer, keyChar) {
    if (!keyboardContainer || !keyChar) return;

    const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);

    if (targetKeyElement) {
        targetKeyElement.classList.add('wrong-key-flash');
        setTimeout(() => {
            targetKeyElement.classList.remove('wrong-key-flash');
        }, 200);
    }
}

export function animateAllBordersOnCorrectInput(lessonTextDisplay) {
    if (!lessonTextDisplay) return;
    // PERBAIKAN: Mengubah selektor kelas dari '.typing-char' menjadi '.lesson-keyboard-key'
    const allTypingChars = lessonTextDisplay.querySelectorAll('.lesson-keyboard-key');
    allTypingChars.forEach(charEl => {
        charEl.classList.add('correct-input-border');
    });

    setTimeout(() => {
        allTypingChars.forEach(charEl => {
            charEl.classList.remove('correct-input-border');
        });
    }, 500);
}

export function animateJellyEffect(keyElement, callback) {
    if (keyElement) {
        keyElement.classList.add('jelly-effect');
        keyElement.addEventListener('animationend', () => {
            keyElement.classList.remove('jelly-effect');
            if (callback && typeof callback === 'function') {
                callback();
            }
        }, { once: true });
    }
}