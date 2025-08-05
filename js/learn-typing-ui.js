// learn-typing-ui.js
import { updateHandVisualizer } from './hand-visualizer.js';
import { updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';

let currentHighlightedKeyElement = null;

export function createHandVisualizerElement() {
    const visualizerContainer = document.createElement('div');
    visualizerContainer.id = 'hand-visualizer-container';

    const handImages = [
        { id: 'hand-f', src: 'img/hand_f.png', alt: 'Tangan untuk tombol F' },
        { id: 'hand-j', src: 'img/hand_j.png', alt: 'Tangan untuk tombol J' },
        { id: 'hand-space', src: 'img/hand_space.png', alt: 'Tangan untuk tombol spasi' },
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
    const handVisualizer = keyboardContainer.querySelector('#hand-visualizer-container') || createHandVisualizerElement();
    keyboardContainer.innerHTML = ''; // Membersihkan konten sebelum membuat ulang
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

export function renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer) {
    if (!lessonTextDisplay || !lessonInstruction) return;
    lessonTextDisplay.style.display = '';
    lessonInstruction.textContent = lesson.instruction || '';
    lessonTextDisplay.innerHTML = '';
    if (lesson.sequence && lesson.sequence.length > 0) {
        const textContent = lesson.sequence.join('');
        lessonTextDisplay.innerHTML = textContent.split('').map((char, idx) => {
            const displayChar = char === ' ' ? '\u00A0' : char;
            let className = '';
            if (idx < currentCharIndex) {
                className = 'correct';
            } else if (idx === currentCharIndex) {
                className = 'cursor';
            }
            return `<span class="${className}">${displayChar}</span>`;
        }).join('');
        if (currentCharIndex < lesson.sequence.length) {
            highlightKeyOnKeyboard(keyboardContainer, lesson.sequence[currentCharIndex]);
        } else {
            highlightKeyOnKeyboard(keyboardContainer, null);
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
        progressContainerWrapper // Ditambahkan: Elemen progress bar dari pelajaran
    } = domElements;

    // Sembunyikan elemen-elemen pelajaran, termasuk progress bar
    [lessonHeader, keyboardContainer, prevLessonBtn, nextLessonBtn, lessonTextDisplay, progressContainerWrapper].forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Hentikan animasi keyboard
    if (keyboardContainer) {
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            key.style.animation = 'none';
            key.classList.remove('next-key', 'correct-key', 'wrong-key');
        });
    }
    
    // LOGIKA ANIMASI PROGRESS BAR BARU
    const completionProgressBar = document.getElementById('completion-progress-bar');
    const completionProgressText = document.getElementById('completion-progress-text');

    if (completionProgressBar && completionProgressText) {
        // Reset progress bar
        completionProgressBar.style.width = '0%';
        completionProgressText.textContent = '0%';

        // Mulai animasi
        setTimeout(() => {
            completionProgressBar.style.width = '100%';
        }, 100);

        // Animasikan teks persentase
        let currentPercentage = 0;
        const interval = setInterval(() => {
            currentPercentage += 1;
            completionProgressText.textContent = `${currentPercentage}%`;
            if (currentPercentage >= 100) {
                clearInterval(interval);
            }
        }, 15);
    }
    // AKHIR LOGIKA ANIMASI PROGRESS BAR

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