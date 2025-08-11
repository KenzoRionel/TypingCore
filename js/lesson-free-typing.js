// js/lesson-free-typing.js

import { getState, updateState, initializeLessonState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import {
    highlightKeyOnKeyboard,
    highlightWrongKeyOnKeyboard,
    clearKeyboardHighlights,
    setAnimatingKey,
    clearAnimation
} from './learn-typing-ui.js';
import { updateProgressBar, calculateLessonProgress } from './progress-bar.js';
import { renderHandVisualizer } from './hand-visualizer.js';
import { dispatchFinishedEvent, renderLesson as reRenderLesson } from './learn-typing-logic.js';

let lessonTextDisplayRef = null;

function getLessonState(lessonId) {
    const defaultState = {
        currentCharIndex: 0,
        userTypingHistory: [],
        wrongInputState: { el: null, originalText: '', timeoutId: null }
    };
    let state = getState(lessonId);
    if (!state) {
        initializeLessonState(lessonId, defaultState);
        state = getState(lessonId);
    }
    // PERBAIKAN: Pastikan wrongInputState selalu ada
    if (!state.wrongInputState) {
        state.wrongInputState = defaultState.wrongInputState;
    }
    return state;
}

function clearWrongInputFeedback(lessonId) {
    const lessonState = getLessonState(lessonId);
    // PERBAIKAN: Tambahkan pengecekan yang lebih kuat untuk properti 'wrongInputState'
    if (lessonState && lessonState.wrongInputState && lessonState.wrongInputState.el) {
        clearTimeout(lessonState.wrongInputState.timeoutId);
        lessonState.wrongInputState.el.textContent = lessonState.wrongInputState.originalText;
        lessonState.wrongInputState.el.classList.remove('wrong-char-overlay', 'wrong-char');
        lessonState.wrongInputState = { el: null, originalText: '', timeoutId: null };
        updateState(lessonId, { wrongInputState: lessonState.wrongInputState });
    }
}

// PERBAIKAN: Fungsi baru untuk mengelola scroll
function updateScrollPosition(allChars, currentCharIndex) {
    const scrollContainer = allChars[0]?.parentElement;
    if (!scrollContainer) return;

    // Hitung posisi baris hanya jika diperlukan
    const linePositions = [];
    let lastOffsetTop = -1;
    allChars.forEach(charEl => {
        if (charEl.offsetTop > lastOffsetTop) {
            lastOffsetTop = charEl.offsetTop;
            linePositions.push(lastOffsetTop);
        }
    });

    const totalLines = linePositions.length;
    // Jika total baris kurang dari atau sama dengan 3, tidak perlu scroll.
    if (totalLines <= 3) {
        scrollContainer.style.transform = `translateY(0px)`;
        return;
    }

    const cursorEl = allChars[currentCharIndex];
    let currentLineIndex = 0;
    if (cursorEl) {
        currentLineIndex = linePositions.indexOf(cursorEl.offsetTop);
    } else if (currentCharIndex >= allChars.length) {
        currentLineIndex = totalLines - 1;
    }

    let scrollOffset = 0;
    if (currentLineIndex > 1) { // Mulai scroll setelah baris kedua
        // PERBAIKAN: Tentukan batas scroll agar tidak melewati baris terakhir.
        // Indeks baris teratas yang seharusnya ditampilkan adalah `totalLines - 3`.
        const maxTopLineIndex = totalLines - 3;
        let targetTopLineIndex = currentLineIndex - 1;

        // Jika target scroll sudah melewati batas, gunakan batas maksimal.
        if (targetTopLineIndex > maxTopLineIndex) {
            targetTopLineIndex = maxTopLineIndex;
        }
        
        scrollOffset = linePositions[targetTopLineIndex];
    }
    scrollContainer.style.transform = `translateY(-${scrollOffset}px)`;
}

export function renderFreeTypingLesson({ lesson, lessonInstruction, keyboardContainer, lessonTextDisplay: displayEl }) {
    lessonTextDisplayRef = displayEl;
    const lessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${lessonIndex + 1}`;
    const lessonState = getLessonState(lessonId);
    const { currentCharIndex, userTypingHistory } = lessonState;

    clearWrongInputFeedback(lessonId);

    if (!lessonTextDisplayRef) return;
    if (lessonInstruction) lessonInstruction.textContent = lesson.instruction || '';

    // PERUBAHAN: Tambahkan flag untuk menandai render awal
    const isInitialRender = !lessonTextDisplayRef.querySelector('.scrollable-text-container');

    // PERBAIKAN: Render penuh hanya sekali, lalu update secara dinamis
    if (isInitialRender) {
        lessonTextDisplayRef.innerHTML = '<div class="scrollable-text-container"></div>';
        const scrollContainer = lessonTextDisplayRef.querySelector('.scrollable-text-container');
        lesson.sequence.forEach((char) => {
            const span = document.createElement('span');
            const displayChar = char === ' ' ? '\u00A0' : char;
            span.textContent = displayChar;
            span.classList.add('typing-char');
            scrollContainer.appendChild(span);
        });

        // Sembunyikan semua efek keyboard pada render awal
        clearKeyboardHighlights(keyboardContainer);
        setAnimatingKey(null);
        requestAnimationFrame(() => renderHandVisualizer(null));

        lessonTextDisplayRef.style.height = '0';

        setTimeout(() => {
            // PERUBAHAN: Tambahkan kelas untuk memicu fade-in satu kali
            document.body.classList.add('initial-fade-in');
            lessonTextDisplayRef.classList.add('is-revealing');
            lessonTextDisplayRef.addEventListener('animationend', () => {
                lessonTextDisplayRef.classList.remove('is-revealing');
                lessonTextDisplayRef.style.height = '';

                // Tampilkan efek keyboard HANYA setelah animasi selesai
                if (currentCharIndex < lesson.sequence.length) {
                    const nextChar = lesson.sequence[currentCharIndex];
                    highlightKeyOnKeyboard(keyboardContainer, nextChar);
                    const keyElement = keyboardContainer.querySelector(`[data-key="${nextChar.toLowerCase()}"]`);
                    setAnimatingKey(keyElement);
                    requestAnimationFrame(() => renderHandVisualizer(nextChar));
                }

                // PERUBAHAN: Hapus kelas pemicu setelah animasi fade-in selesai
                setTimeout(() => {
                    document.body.classList.remove('initial-fade-in');
                }, 400); // Durasi harus cocok dengan animasi fade-in di CSS

            }, { once: true });
        }, 300);
    }
    
    const scrollContainer = lessonTextDisplayRef.querySelector('.scrollable-text-container');
    const allChars = Array.from(scrollContainer.children);

    allChars.forEach((span, idx) => {
        span.classList.remove('cursor', 'correct-box', 'corrected-box', 'wrong-char', 'error-char');
        const originalChar = lesson.sequence[idx];
        const displayChar = originalChar === ' ' ? '\u00A0' : originalChar;

        if (idx < currentCharIndex) {
            const historyItem = userTypingHistory[idx];
            if (historyItem?.isCorrect) {
                span.textContent = displayChar;
                span.classList.add(historyItem.wasWrong ? 'corrected-box' : 'correct-box');
            } else if (historyItem) {
                span.textContent = historyItem.key === ' ' ? '\u00A0' : historyItem.key;
                span.classList.add('error-char');
            }
        } else if (idx === currentCharIndex) {
            span.classList.add('cursor');
            span.textContent = displayChar;
        } else {
            span.textContent = displayChar;
        }
    });

    // PERBAIKAN: Panggil fungsi scroll
    updateScrollPosition(allChars, currentCharIndex);

    // PERUBAHAN: Jangan jalankan blok ini pada render awal, karena sudah ditangani di 'animationend'
    if (!isInitialRender && currentCharIndex < lesson.sequence.length) {
        clearKeyboardHighlights(keyboardContainer);
        const nextChar = lesson.sequence[currentCharIndex];
        const keyElement = nextChar ? keyboardContainer.querySelector(`.key[data-key="${nextChar.toLowerCase()}"]`) : null;
        if (keyElement) {
            highlightKeyOnKeyboard(keyboardContainer, nextChar);
            setAnimatingKey(keyElement);
        } else {
            setAnimatingKey(null);
        }
        // PERBAIKAN: Gunakan requestAnimationFrame untuk memastikan posisi elemen sudah benar
        requestAnimationFrame(() => {
            renderHandVisualizer(nextChar);
        });
    } else if (currentCharIndex >= lesson.sequence.length) { // Jalankan ini jika pelajaran selesai atau pada render awal
        clearKeyboardHighlights(keyboardContainer);
        setAnimatingKey(null);
        // PERBAIKAN: Gunakan requestAnimationFrame untuk konsistensi
        requestAnimationFrame(() => {
            renderHandVisualizer(null);
        });
    }
}

export function handleFreeTypingInput({ e, domElements, animationFunctions }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    const { keyboardContainer, lessonInstruction } = domElements;
    const { animateJellyEffect, setAnimationSpeed, setIsCorrectInputAnimationActive } = animationFunctions;

    const currentLessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${currentLessonIndex + 1}`;
    const lesson = lessons[currentLessonIndex];
    let lessonState = getLessonState(lessonId);
    let { currentCharIndex, userTypingHistory } = lessonState;
    const allChars = Array.from(lessonTextDisplayRef.querySelector('.scrollable-text-container').children);

    if (e.key === 'Backspace') {
        if (currentCharIndex > 0) {
            // PERBAIKAN: Update DOM secara langsung, hindari re-render penuh
            const prevCharIndex = currentCharIndex - 1;
            const charToRemoveStyle = allChars[prevCharIndex];
            const originalChar = lesson.sequence[prevCharIndex];

            charToRemoveStyle.textContent = originalChar === ' ' ? '\u00A0' : originalChar;
            charToRemoveStyle.classList.remove('correct-box', 'corrected-box', 'error-char');
            
            if(allChars[currentCharIndex]) allChars[currentCharIndex].classList.remove('cursor');
            charToRemoveStyle.classList.add('cursor');

            currentCharIndex--;
            userTypingHistory.pop();
            updateState(lessonId, { currentCharIndex, userTypingHistory });
            clearWrongInputFeedback(lessonId);
            
            updateScrollPosition(allChars, currentCharIndex);
            // Hapus pemanggilan reRenderLesson()
        }
    } else if (currentCharIndex < lesson.sequence.length) {
        const expectedChar = lesson.sequence[currentCharIndex];
        const isCorrect = (e.key.toLowerCase() === expectedChar.toLowerCase()) || (e.key === ' ' && expectedChar === ' ');
        const typingCharElement = allChars[currentCharIndex];

        if (isCorrect) {
            clearWrongInputFeedback(lessonId);
            const wasWrong = (userTypingHistory[currentCharIndex] && userTypingHistory[currentCharIndex].isCorrect === false) || false;
            userTypingHistory[currentCharIndex] = { key: e.key, isCorrect: true, wasWrong, originalChar: expectedChar };
            
            // PERBAIKAN: Update DOM secara langsung
            typingCharElement.classList.remove('cursor');
            typingCharElement.classList.add(wasWrong ? 'corrected-box' : 'correct-box');
            if (allChars[currentCharIndex + 1]) {
                allChars[currentCharIndex + 1].classList.add('cursor');
            }

            const keyElement = keyboardContainer.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
            if (keyElement && animateJellyEffect) {
                animateJellyEffect(keyElement);
            }

            setAnimationSpeed(15);
            setIsCorrectInputAnimationActive(true);
            setTimeout(() => {
                setAnimationSpeed(3);
                setIsCorrectInputAnimationActive(false);
            }, 50);

            currentCharIndex++;
            updateState(lessonId, { currentCharIndex, userTypingHistory });

            const progressValue = calculateLessonProgress(lesson);
            updateProgressBar(progressValue, domElements.progressText, domElements.progressBar);

            // PERBAIKAN: Panggil scroll update dan highlight, bukan re-render penuh
            updateScrollPosition(allChars, currentCharIndex);
            const nextChar = lesson.sequence[currentCharIndex];
            if (nextChar) {
                highlightKeyOnKeyboard(keyboardContainer, nextChar);
                setAnimatingKey(keyboardContainer.querySelector(`[data-key="${nextChar.toLowerCase()}"]`));
                requestAnimationFrame(() => renderHandVisualizer(nextChar));
            } else {
                clearKeyboardHighlights(keyboardContainer);
                setAnimatingKey(null);
                requestAnimationFrame(() => renderHandVisualizer(null));
            }

            if (currentCharIndex === lesson.sequence.length) {
                dispatchFinishedEvent(currentLessonIndex);
            }
        } else {
            if (typingCharElement) {
                clearWrongInputFeedback(lessonId);
                const wrongInputState = {
                    el: typingCharElement,
                    originalText: typingCharElement.textContent,
                    timeoutId: null
                };

                const displayKey = e.key === ' ' ? '\u00A0' : e.key;
                typingCharElement.textContent = displayKey;
                typingCharElement.classList.add('wrong-char', 'wrong-char-overlay');

                wrongInputState.timeoutId = setTimeout(() => {
                    if (wrongInputState.el === typingCharElement) {
                        typingCharElement.textContent = wrongInputState.originalText;
                        typingCharElement.classList.remove('wrong-char', 'wrong-char-overlay');
                        updateState(lessonId, { wrongInputState: { el: null, originalText: '', timeoutId: null } });
                    }
                }, 200);

                updateState(lessonId, { wrongInputState });
            }
            userTypingHistory[currentCharIndex] = { key: e.key, isCorrect: false, wasWrong: true, originalChar: expectedChar };
            updateState(lessonId, { userTypingHistory });

            if (lessonInstruction) {
                lessonInstruction.classList.add('error-shake');
                setTimeout(() => lessonInstruction.classList.remove('error-shake'), 200);
            }
            highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
        }
    }
}

export function resetFreeTypingState() {
    const currentLessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${currentLessonIndex + 1}`;
    clearWrongInputFeedback(lessonId);
    updateState(lessonId, { currentCharIndex: 0, userTypingHistory: [], finished: false });
    if (lessonTextDisplayRef) {
        lessonTextDisplayRef.innerHTML = '';
        lessonTextDisplayRef.dataset.lessonId = '';
    }
    clearAnimation();
}