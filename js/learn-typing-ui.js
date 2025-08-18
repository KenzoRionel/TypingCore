// js/learn-typing-ui.js
import { getState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { renderHandVisualizer, resetHandVisualizer } from './hand-visualizer.js';
// Perbaikan: Ganti getGameDOMReferences dengan getLessonDOMReferences
import { getLessonDOMReferences } from './utils/dom-elements.js';
import { cleanupSimpleDrillElements } from './lesson-simple-drill.js';
import { resetCharacterDrillState } from './lesson-character-drill.js';

let animatedKeyElement = null;
let rotation = 0;
const defaultAnimationSpeed = 3;
let animationSpeed = defaultAnimationSpeed;
let lessonSpeedTimeout = null;
export let isCorrectInputAnimationActive = false;
// PERUBAHAN: Tambahkan variabel untuk mengontrol opacity border
let borderOpacity = 0;

export function setAnimationSpeed(speed) {
    if (speed === 15) {
        animationSpeed = speed;
        if (lessonSpeedTimeout) {
            clearTimeout(lessonSpeedTimeout);
        }
        lessonSpeedTimeout = setTimeout(() => {
            animationSpeed = defaultAnimationSpeed;
        }, 50);
    } else {
        animationSpeed = speed;
    }
}

export function setAnimatingKey(keyElement) {
    clearAnimation();
    if (keyElement) {
        animatedKeyElement = keyElement;
        animatedKeyElement.classList.add('is-animating');
        // PERUBAHAN: Reset opacity saat tombol baru diatur
        borderOpacity = 0;
    } else {
        animatedKeyElement = null;
    }
}

export function clearAnimation() {
    if (animatedKeyElement) {
        animatedKeyElement.classList.remove('is-animating');
        animatedKeyElement.style.borderImageSource = '';
    }
    animatedKeyElement = null;
    // PERUBAHAN: Reset opacity
    borderOpacity = 0;
}

export function animateBorder() {
    if (animatedKeyElement) {
        // PERUBAHAN: Dapatkan tipe pelajaran saat ini
        const currentLessonIndex = getState('currentLessonIndex');
        const currentLesson = lessons[currentLessonIndex];
        const isFreeTyping = currentLesson && currentLesson.type === 'free-typing';
        // PERUBAHAN: Cek apakah ini render awal dengan fade-in
        const isInitialFadeIn = document.body.classList.contains('initial-fade-in');

        // PERUBAHAN: Tingkatkan opacity secara bertahap hanya untuk free-typing pada render awal
        if (isFreeTyping && isInitialFadeIn) {
            if (borderOpacity < 1) {
                borderOpacity = Math.min(1, borderOpacity + 0.05); // Kecepatan fade-in
            }
        } else {
            // Untuk pelajaran lain atau interaksi berikutnya, atur opacity ke 1 secara langsung
            borderOpacity = 1;
        }

        rotation += animationSpeed;
        let startColor = `rgba(0, 123, 255, ${0.8 * borderOpacity})`;
        let endColor = `rgba(255, 255, 255, ${1 * borderOpacity})`;
        if (isCorrectInputAnimationActive) {
            startColor = `rgba(253, 216, 53, ${1 * borderOpacity})`;
            endColor = `rgba(200, 255, 0, ${1 * borderOpacity})`;
        }
        const gradient = `conic-gradient(from ${rotation}deg, ${startColor} 0%, ${endColor} 25%, ${startColor} 50%, ${endColor} 75%, ${startColor} 100%)`;
        animatedKeyElement.style.borderImageSource = gradient;
    }
    window.requestAnimationFrame(animateBorder);
}

export function setIsCorrectInputAnimationActive(value) {
    isCorrectInputAnimationActive = value;
}

export function createHandVisualizerElement() {
    const visualizerContainer = document.createElement('div');
    visualizerContainer.id = 'hand-visualizer';
    const handImages = [
        { id: 'hand-f', src: 'img/hand_f.png', alt: 'Tangan untuk tombol F' },
        { id: 'hand-j', src: 'img/hand_j.png', alt: 'Tangan untuk tombol J' },
        { id: 'hand-space', src: 'img/hand_space.png', alt: 'Tangan untuk tombol spasi' },
        { id: 'hand-d', src: 'img/hand_d.png', alt: 'Tangan untuk tombol D' },
        { id: 'hand-k', src: 'img/hand_k.png', alt: 'Tangan untuk tombol K' },
        { id: 'hand-s', src: 'img/hand_s.png', alt: 'Tangan untuk tombol S' },
        { id: 'hand-l', src: 'img/hand_l.png', alt: 'Tangan untuk tombol L' },
        { id: 'hand-a', src: 'img/hand_a.png', alt: 'Tangan untuk tombol A' },
        { id: 'hand-;', src: 'img/hand_;png', alt: 'Tangan untuk tombol ;' }
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
        'ShiftLeft': 'key-wide', 'ShiftRight': 'key-wide', 'Tab': 'key-tab',
        'CapsLock': 'key-medium', 'Backspace': 'key-medium', 'Enter': 'key-medium',
        'Space': 'key-space', 'ControlLeft': 'key-small', 'ControlRight': 'key-small',
        'AltLeft': 'key-small', 'AltRight': 'key-small', 'MetaLeft': 'key-small',
        'MetaRight': 'key-small', 'ContextMenu': 'key-small',
    };
    const keyDisplayNames = {
        'ShiftLeft': 'Shift', 'ShiftRight': 'Shift', 'ControlLeft': 'Ctrl', 'ControlRight': 'Ctrl',
        'AltLeft': 'Alt', 'AltRight': 'Alt', 'MetaLeft': 'Win', 'MetaRight': 'Win',
        'ContextMenu': 'Menu', 'Space': '',
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
    if (!keyboardContainer) {
        // Perbaikan: Ganti getGameDOMReferences dengan getLessonDOMReferences
        const domElements = getLessonDOMReferences();
        if (domElements.keyboardContainer) {
            keyboardContainer = domElements.keyboardContainer;
        } else {
            return;
        }
    }
    keyboardContainer.querySelectorAll('.key').forEach(el => {
        el.classList.remove('next-key', 'correct-key', 'wrong-key', 'wrong-key-flash', 'active');
        if (!el.classList.contains('is-animating')) {
            el.style.borderImageSource = '';
            el.style.border = '';
        }
    });
}

export function highlightKeyOnKeyboard(keyboardContainer, keyChar) {
    if (!keyboardContainer) {
        console.error("ERROR: keyboardContainer tidak ditemukan.");
        return;
    }
    // Hapus highlight dari tombol sebelumnya sebelum menambahkan yang baru
    const previousHighlightedKey = keyboardContainer.querySelector('.next-key');
    if (previousHighlightedKey) {
        previousHighlightedKey.classList.remove('next-key');
    }
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

    const currentLessonIndex = getState('currentLessonIndex');

    if (lesson.sequences && (currentLessonIndex === 0 || currentLessonIndex === 4)) {
        lesson.sequences.forEach(sequence => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('instruction-sequence');

            sequence.forEach(step => {
                const span = document.createElement('span');
                span.textContent = step.char;
                wrapper.appendChild(span);

                if (step.hand) {
                    const inlineKey = document.createElement('div');
                    inlineKey.classList.add('keyboard-inline-key');
                    inlineKey.innerHTML = `<span class="inline-key-char">${step.key}</span><span class="inline-key-hand">${step.hand}</span>`;
                    wrapper.appendChild(inlineKey);
                }
            });
            lessonTextDisplay.appendChild(wrapper);
        });
    } else if (lesson.sequence && lesson.sequence.length > 0) {
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
    }

    if (lesson.sequence && currentCharIndex < lesson.sequence.length) {
        const nextChar = lesson.sequence[currentCharIndex];
        const keyElement = keyboardContainer.querySelector(`[data-key="${nextChar.toLowerCase()}"]`);
        if (keyElement) {
            highlightKeyOnKeyboard(keyboardContainer, nextChar);
            if (setAnimatingKey) setAnimatingKey(keyElement);
        }
    } else {
        if (setAnimatingKey) setAnimatingKey(null);
        clearKeyboardHighlights(keyboardContainer);
    }
}

function cleanupCharacterDrillElements() {
    // Perbaikan: Ganti getGameDOMReferences dengan getLessonDOMReferences
    const domElements = getLessonDOMReferences();
    if (domElements.lessonInstruction) {
        domElements.lessonInstruction.innerHTML = '';
    }
}

export function cleanupAllLessonUI() {
    const domElements = getLessonDOMReferences();
    if (!domElements || !domElements.keyboardContainer) {
        console.error("Gagal mendapatkan referensi DOM di cleanupAllLessonUI.");
        return;
    }
    const keyboardContainer = domElements.keyboardContainer;

    // --- reset semua key ---
    if (keyboardContainer) {
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            key.style.animation = 'none';
            key.classList.remove('next-key', 'correct-key', 'wrong-key', 'wrong-key-flash', 'is-animating', 'active');
            key.style.borderImageSource = 'none';
            key.style.border = '1px solid #444';
        });
    }

    // 🚫 jangan hapus instruksi di sini
    // cleanupSimpleDrillElements(domElements.lessonInstruction);
    // cleanupCharacterDrillElements();
    
    if (domElements.lessonTextDisplay) {
        domElements.lessonTextDisplay.innerHTML = '';
        domElements.lessonTextDisplay.style.display = ''; // pastikan tetap terlihat
    }
    if (domElements.lessonInstruction) {
        domElements.lessonInstruction.style.display = ''; // pastikan tetap terlihat
    }

    clearKeyboardHighlights(domElements.keyboardContainer);
    resetHandVisualizer();

    // ✅ pastikan overlay free-typing selalu disembunyikan
    const overlay = document.getElementById("hold-key-overlay");
    if (overlay) {
        overlay.style.display = "none";
    }
}


export function showLessonCompleteNotification(lessons, currentLessonIdx, domElements) {
    const {
        lessonHeader, lessonCompleteNotification, continueBtn, keyboardContainer,
        successAnimationSvg, prevLessonBtn, nextLessonBtn,
        lessonTextDisplay, progressContainerWrapper, retryLessonBtn, lessonListBtn
    } = domElements;

    cleanupAllLessonUI();

    [lessonHeader, keyboardContainer, prevLessonBtn, nextLessonBtn, lessonTextDisplay, progressContainerWrapper].forEach(el => {
        if (el) el.style.display = 'none';
    });

    if (lessonCompleteNotification) {
        lessonCompleteNotification.classList.remove('active');
        lessonCompleteNotification.style.display = 'none';
    }

    if (successAnimationSvg) {
        successAnimationSvg.classList.remove('animate');
        void successAnimationSvg.offsetWidth;
    }
    
    const completionProgressBar = document.getElementById('completion-progress-bar');
    const completionProgressText = document.getElementById('completion-progress-text');
    // PERBAIKAN: Reset progress bar di sini, tapi jangan mulai animasi.
    if (completionProgressBar && completionProgressText) {
        completionProgressBar.style.transition = 'none'; // Hentikan transisi sementara
        completionProgressBar.style.width = '0%';
        completionProgressText.textContent = '0%';
    }
    
    if (lessonCompleteNotification) {
        const h3 = lessonCompleteNotification.querySelector('h3');
        if (h3) h3.textContent = `Pelajaran ${currentLessonIdx + 1} selesai!`;
        
        // Hapus semua logika yang berhubungan dengan nextLessonPreview
        
        lessonCompleteNotification.style.display = 'flex';
        
        // Hapus kelas animasi sebelum menambahkannya lagi
        // START - PERBAIKAN BUG
        [retryLessonBtn, continueBtn, lessonListBtn].forEach(btn => {
            if (btn) btn.classList.remove('pop-in');
        });
        // END - PERBAIKAN BUG

        setTimeout(() => {
            lessonCompleteNotification.classList.add('active');
            if (successAnimationSvg) {
                successAnimationSvg.classList.add('animate');
            }

            // PERBAIKAN: Pindahkan logika animasi progress bar ke sini.
            if (completionProgressBar && completionProgressText) {
                // Paksa reflow agar reset width diterapkan sebelum transisi dimulai
                void completionProgressBar.offsetWidth; 
                completionProgressBar.style.transition = 'width 1.5s ease-out';
                completionProgressBar.style.width = '100%';
                
                let currentPercentage = 0;
                const interval = setInterval(() => {
                    if (currentPercentage < 100) {
                        currentPercentage += 1;
                        completionProgressText.textContent = `${currentPercentage}%`;
                    } else {
                        clearInterval(interval);
                    }
                }, 15);
            }

            // Tambahkan kelas untuk memicu animasi tombol
            if (retryLessonBtn) retryLessonBtn.classList.add('pop-in');
            if (continueBtn) {
                continueBtn.classList.add('pop-in');
                continueBtn.focus();
            }
            // START - PERBAIKAN BUG
            if (lessonListBtn) {
                lessonListBtn.classList.add('pop-in');
            }
            // END - PERBAIKAN BUG
        }, 50);
    } else {
        console.error('ERROR: Elemen notifikasi (#lesson-complete-notification) tidak ditemukan!');
    }
}

export function highlightWrongKeyOnKeyboard(keyboardContainer, keyChar) {
    if (!keyboardContainer || !keyChar) return;
    const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);
    if (targetKeyElement) {
        // Hanya tambahkan kelas kilat tanpa menghapus highlight yang sudah ada
        targetKeyElement.classList.add('wrong-key-flash');
        setTimeout(() => {
            targetKeyElement.classList.remove('wrong-key-flash');
        }, 200);
    }
}

export function animateAllBordersOnCorrectInput(lessonTextDisplay) {
    if (!lessonTextDisplay) return;
    const allTypingChars = lessonTextDisplay.querySelectorAll('.lesson-keyboard-key');
    allTypingChars.forEach(charEl => {
        charEl.classList.add('correct-input-border');
    });
    setTimeout(() => {
        allTypingChars.forEach(charEl => {
            charEl.classList.remove('correct-input-border');
        });
    }, 300);
}

export function animateJellyEffect(keyElement) {
    if (keyElement) {
        keyElement.classList.remove('jelly-effect');
        void keyElement.offsetWidth;
        keyElement.classList.add('jelly-effect');
    }
}