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
import { dispatchFinishedEvent } from './learn-typing-logic.js';

let lessonTextDisplayRef = null;

function getLessonState(lessonId) {
    const defaultState = {
        currentCharIndex: 0,
        userTypingHistory: [],
        wrongInputState: { el: null, originalText: '', timeoutId: null },
        isHoldKeyActive: false,
    };
    let state = getState(lessonId);
    if (!state) {
        initializeLessonState(lessonId, defaultState);
        state = getState(lessonId);
    }
    if (!state.wrongInputState) {
        state.wrongInputState = defaultState.wrongInputState;
    }
    return state;
}

function clearWrongInputFeedback(lessonId) {
    const lessonState = getLessonState(lessonId);
    if (lessonState && lessonState.wrongInputState && lessonState.wrongInputState.el) {
        clearTimeout(lessonState.wrongInputState.timeoutId);
        lessonState.wrongInputState.el.textContent = lessonState.wrongInputState.originalText;
        lessonState.wrongInputState.el.classList.remove('wrong-char-overlay', 'wrong-char');
        lessonState.wrongInputState = { el: null, originalText: '', timeoutId: null };
        updateState(lessonId, { wrongInputState: lessonState.wrongInputState });
    }
}

function updateScrollPosition(allChars, currentCharIndex) {
    const scrollContainer = allChars[0]?.parentElement;
    if (!scrollContainer) return;

    const linePositions = [];
    let lastOffsetTop = -1;
    allChars.forEach(charEl => {
        if (charEl.offsetTop > lastOffsetTop) {
            lastOffsetTop = charEl.offsetTop;
            linePositions.push(lastOffsetTop);
        }
    });

    const totalLines = linePositions.length;
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
    if (currentLineIndex > 1) {
        const maxTopLineIndex = totalLines - 3;
        let targetTopLineIndex = currentLineIndex - 1;

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
    const { currentCharIndex } = lessonState;

    clearWrongInputFeedback(lessonId);

    if (!lessonTextDisplayRef) return;

    if (lessonInstruction) {
        if (lesson.requiredHoldKey) {
            lessonInstruction.style.display = 'none';
        } else {
            lessonInstruction.innerHTML = lesson.instruction || '';
            lessonInstruction.style.display = 'block';
        }
    }
    
    // Perbaikan: Pastikan elemen overlay dan teks instruksi ada di DOM saat pelajaran dimulai
    if (lesson.requiredHoldKey) {
        let overlay = document.querySelector('.lesson-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'lesson-overlay';
            document.body.appendChild(overlay);
        }

        let overlayText = document.getElementById('hold-key-overlay-text');
        if (!overlayText) {
            overlayText = document.createElement('div');
            overlayText.id = 'hold-key-overlay-text';
            document.body.appendChild(overlayText);
        }

        document.body.classList.add('lesson-overlay-active');
        document.body.classList.add('show-hold-key-overlay');
        overlayText.innerHTML = `Tekan dan tahan tombol <span class="keyboard-inline-key">${lesson.requiredHoldKey}</span>.`;
    } else {
        document.body.classList.remove('lesson-overlay-active');
        document.body.classList.remove('show-hold-key-overlay');
    }

    const isInitialRender = !lessonTextDisplayRef.querySelector('.scrollable-text-container');
    
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

        clearKeyboardHighlights(keyboardContainer);
        setAnimatingKey(null);
        requestAnimationFrame(() => renderHandVisualizer(null));

        lessonTextDisplayRef.style.height = '0';

        setTimeout(() => {
            document.body.classList.add('initial-fade-in');
            lessonTextDisplayRef.classList.add('is-revealing');
            lessonTextDisplayRef.addEventListener('animationend', () => {
                lessonTextDisplayRef.classList.remove('is-revealing');
                lessonTextDisplayRef.style.height = '';

                if (currentCharIndex < lesson.sequence.length) {
                    const nextChar = lesson.sequence[currentCharIndex];
                    highlightKeyOnKeyboard(keyboardContainer, nextChar);
                    const keyElement = keyboardContainer.querySelector(`[data-key="${nextChar.toLowerCase()}"]`);
                    setAnimatingKey(keyElement);
                    requestAnimationFrame(() => renderHandVisualizer(nextChar));
                }

                setTimeout(() => {
                    document.body.classList.remove('initial-fade-in');
                }, 400);

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
            const historyItem = lessonState.userTypingHistory[idx];
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

    updateScrollPosition(allChars, currentCharIndex);

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
        requestAnimationFrame(() => {
            renderHandVisualizer(nextChar);
        });
    } else if (currentCharIndex >= lesson.sequence.length) {
        clearKeyboardHighlights(keyboardContainer);
        setAnimatingKey(null);
        requestAnimationFrame(() => {
            renderHandVisualizer(null);
        });
    }
}


export function handleFreeTypingInput({ e, domElements, animationFunctions, type }) {
    const currentLessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${currentLessonIndex + 1}`;
    const lesson = lessons[currentLessonIndex];
    let lessonState = getLessonState(lessonId);
    let { currentCharIndex, userTypingHistory, isHoldKeyActive } = lessonState;
    const { keyboardContainer, lessonInstruction } = domElements;
    const { animateJellyEffect, setAnimationSpeed, setIsCorrectInputAnimationActive } = animationFunctions;

    if (lesson.requiredHoldKey) {
        const lessonCompleteNotification = document.getElementById('lesson-complete-notification');
        const isNotificationActive = lessonCompleteNotification && lessonCompleteNotification.classList.contains('active');
        
        if (isNotificationActive) {
            if (isHoldKeyActive) {
                updateState(lessonId, { isHoldKeyActive: false });
            }
            return;
        }

        const isHoldKey = e.key.toLowerCase() === lesson.requiredHoldKey;
        const currentState = getState(lessonId);
        const prevIsHoldKeyActive = currentState.isHoldKeyActive;

        if (type === 'keydown' && isHoldKey) {
            if (!prevIsHoldKeyActive) {
                updateState(lessonId, { isHoldKeyActive: true });
                // Hapus kedua kelas untuk menghilangkan overlay dan blur
                document.body.classList.remove('show-hold-key-overlay');
                document.body.classList.remove('lesson-overlay-active');

                // PERBAIKAN: Langsung render visualizer tangan saat tombol j ditahan
                const nextChar = lesson.sequence[currentCharIndex];
                const keyElement = keyboardContainer.querySelector(`[data-key="${nextChar.toLowerCase()}"]`);
                if (nextChar && keyElement) {
                    highlightKeyOnKeyboard(keyboardContainer, nextChar);
                    setAnimatingKey(keyElement);
                    requestAnimationFrame(() => renderHandVisualizer(nextChar));
                }
            }
            return;
        }

        if (type === 'keyup' && isHoldKey) {
            if (prevIsHoldKeyActive) {
                // Perbaikan: Hanya tampilkan kembali overlay jika pelajaran belum selesai.
                if (currentCharIndex < lesson.sequence.length) {
                    updateState(lessonId, { isHoldKeyActive: false });
                    document.body.classList.add('show-hold-key-overlay');
                    document.body.classList.add('lesson-overlay-active');
                } else {
                    // Jika pelajaran selesai, kita tidak perlu menampilkan kembali overlay
                    updateState(lessonId, { isHoldKeyActive: false });
                    document.body.classList.remove('show-hold-key-overlay');
                    document.body.classList.remove('lesson-overlay-active');
                }
            }
            return;
        }

        if (!isHoldKeyActive) {
            if (type === 'keydown' && e.key.length === 1) {
                // Saat tombol salah ditekan, pastikan overlay dan blur terlihat
                document.body.classList.add('show-hold-key-overlay');
                document.body.classList.add('lesson-overlay-active');
                animationFunctions.highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
                return;
            }
        }
    }
    
    if (type === 'keydown' && (!lesson.requiredHoldKey || isHoldKeyActive)) {
        
        if (e.key === 'Dead' || e.key.startsWith('Alt') || e.key.startsWith('Control') || e.key.startsWith('Shift') || e.key.startsWith('Meta')) return;

        const allChars = Array.from(lessonTextDisplayRef.querySelector('.scrollable-text-container').children);

        if (e.key === 'Backspace') {
            if (currentCharIndex > 0) {
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
            }
        } else if (currentCharIndex < lesson.sequence.length) {
            const expectedChar = lesson.sequence[currentCharIndex];
            const isCorrect = (e.key.toLowerCase() === expectedChar.toLowerCase()) || (e.key === ' ' && expectedChar === ' ');
            const typingCharElement = allChars[currentCharIndex];

            if (isCorrect) {
                clearWrongInputFeedback(lessonId);
                const wasWrong = (userTypingHistory[currentCharIndex] && userTypingHistory[currentCharIndex].isCorrect === false) || false;
                userTypingHistory[currentCharIndex] = { key: e.key, isCorrect: true, wasWrong, originalChar: expectedChar };
                
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
}

export function resetFreeTypingState() {
    const currentLessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${currentLessonIndex + 1}`;
    clearWrongInputFeedback(lessonId);
    updateState(lessonId, { currentCharIndex: 0, userTypingHistory: [], finished: false, isHoldKeyActive: false });
    if (lessonTextDisplayRef) {
        lessonTextDisplayRef.innerHTML = '';
        lessonTextDisplayRef.dataset.lessonId = '';
        document.body.classList.remove('lesson-overlay-active');
        document.body.classList.remove('show-hold-key-overlay');
    }
    clearAnimation();
}

export function cleanupFreeTypingOverlay() {
    // Hilangkan semua efek overlay
    document.body.classList.remove('lesson-overlay-active');
    document.body.classList.remove('show-hold-key-overlay');

    // Bersihkan elemen overlay
    const overlay = document.querySelector('.lesson-overlay');
    if (overlay) overlay.remove();

    const overlayText = document.getElementById('hold-key-overlay-text');
    if (overlayText) overlayText.remove();
}
