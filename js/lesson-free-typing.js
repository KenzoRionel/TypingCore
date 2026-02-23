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

// --- Statistik Free Typing ---
let startTime = null;
let correctCount = 0;
let wrongCount = 0;
let wordStartTime = null;
let wordCharCount = 0;
let lastWordShownIndex = -1;
let shownWords = new Set();
let shownShortWordSets = new Set();
let shownExactWords = new Set();
let wordBestWpm = new Map();



function startTimer() {
    if (!startTime) startTime = Date.now();
}

function updateStatsDisplay() {
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    const wpm = elapsedMinutes > 0 ? Math.round((correctCount / 5) / elapsedMinutes) : 0;
    const accuracy = (correctCount + wrongCount) > 0
        ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
        : 100;

    const wpmEl = document.getElementById("wpm");
    const accEl = document.getElementById("accuracy");

    if (wpmEl) wpmEl.textContent = wpm;
    if (accEl) accEl.textContent = accuracy + "%";
}

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
    if (totalLines <= 2) {
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
        const maxTopLineIndex = totalLines - 2;
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

    // Overlay untuk hold key
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
        const statsContainer = document.getElementById("typing-stats");
        if (statsContainer) {
            // reset dulu biar transisi jalan
            statsContainer.classList.remove("show");
            statsContainer.querySelector("#wpm").textContent = "0";
            statsContainer.querySelector("#accuracy").textContent = "0%";

            // kasih waktu 1 frame sebelum fade-in
            requestAnimationFrame(() => {
                statsContainer.classList.add("show");
            });
        }

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

        // Reset stats setiap mulai ulang free typing
        startTime = null;
        correctCount = 0;
        wrongCount = 0;

        const wpmEl = document.getElementById("wpm");
        const accEl = document.getElementById("accuracy");
        if (wpmEl) wpmEl.textContent = "0";
        if (accEl) accEl.textContent = "0%";

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
                document.body.classList.remove('show-hold-key-overlay');
                document.body.classList.remove('lesson-overlay-active');

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
                if (currentCharIndex < lesson.sequence.length) {
                    updateState(lessonId, { isHoldKeyActive: false });
                    document.body.classList.add('show-hold-key-overlay');
                    document.body.classList.add('lesson-overlay-active');
                } else {
                    updateState(lessonId, { isHoldKeyActive: false });
                    document.body.classList.remove('show-hold-key-overlay');
                    document.body.classList.remove('lesson-overlay-active');
                }
            }
            return;
        }

        if (!isHoldKeyActive) {
            if (type === 'keydown' && e.key.length === 1) {
                document.body.classList.add('show-hold-key-overlay');
                document.body.classList.add('lesson-overlay-active');
                highlightWrongKeyOnKeyboard(keyboardContainer, e.key);
                return;
            }
        }
    }

    if (type === 'keydown' && (!lesson.requiredHoldKey || isHoldKeyActive)) {
        if (e.key === ' ') e.preventDefault();
        if (e.key === 'Dead' || e.key.startsWith('Alt') || e.key.startsWith('Control') || e.key.startsWith('Shift') || e.key.startsWith('Meta')) return;

        const allChars = Array.from(lessonTextDisplayRef.querySelector('.scrollable-text-container').children);

        if (e.key === 'Backspace') {
            if (currentCharIndex > 0) {
                const prevCharIndex = currentCharIndex - 1;
                const charToRemoveStyle = allChars[prevCharIndex];
                const originalChar = lesson.sequence[prevCharIndex];

                charToRemoveStyle.textContent = originalChar === ' ' ? '\u00A0' : originalChar;
                charToRemoveStyle.classList.remove('correct-box', 'corrected-box', 'error-char');

                // Hapus kursor dari posisi saat ini sebelum pindah
                if (allChars[currentCharIndex]) {
                    allChars[currentCharIndex].classList.remove('cursor');
                }

                currentCharIndex--;

                if (allChars[currentCharIndex]) {
                    allChars[currentCharIndex].classList.add('cursor');
                }

                userTypingHistory.pop();
                updateState(lessonId, { currentCharIndex, userTypingHistory });
                clearWrongInputFeedback(lessonId);

                updateScrollPosition(allChars, currentCharIndex);
            }
        } else if (currentCharIndex < lesson.sequence.length) {
            const expectedChar = lesson.sequence[currentCharIndex];
            const pressedChar = e.key === ' ' ? ' ' : e.key;
            const normalizedExpected = expectedChar === '\u00A0' ? ' ' : expectedChar;
            const normalizedPressed = pressedChar === '\u00A0' ? ' ' : pressedChar;
            const isCorrect =
                normalizedExpected.toLowerCase() === normalizedPressed.toLowerCase();
            const typingCharElement = allChars[currentCharIndex];
            // --- DEBUG LOG ---
            console.log({
                keyPressed: e.key,
                pressedChar,
                expectedChar,
                normalizedPressed,
                normalizedExpected,
                isCorrect
            });
            // --- END DEBUG LOG ---

            if (isCorrect) {
                startTimer();
                correctCount++;
                updateStatsDisplay();

                const prevIndex = currentCharIndex;

                // === LOGIKA KATA ===
                if (expectedChar === ' ') {
                    if (wordStartTime && wordCharCount > 0) {
                        const elapsed = (Date.now() - wordStartTime) / 60000;
                        const wordWpm = elapsed > 0 ? Math.round((wordCharCount / 5) / elapsed) : 0;

                        if (wordWpm > 0) {
                            const wordStartIdx = currentCharIndex - wordCharCount;
                            const wordEndIdx = currentCharIndex - 1;
                            const anchor = getWordAnchorSpan(allChars, wordStartIdx, wordEndIdx)
                                || allChars[wordStartIdx]
                                || typingCharElement;

                            // Ambil kata persis
                            const wordChars = allChars
                                .slice(wordStartIdx, wordEndIdx + 1)
                                .map(el => el.textContent)
                                .join("")
                                .toLowerCase();

                            const prevBest = wordBestWpm.get(wordChars) || 0;

                            // Tampilkan hanya kalau lebih tinggi dari rekor sebelumnya
                            if (wordWpm > prevBest) {
                                showWordWPM(anchor, wordWpm);
                                wordBestWpm.set(wordChars, wordWpm);
                            }
                        }
                    }
                    wordStartTime = null;
                    wordCharCount = 0;
                }


                else {
                    // mulai timing saat huruf pertama kata
                    if (!wordStartTime) {
                        wordStartTime = Date.now();
                        wordCharCount = 0;
                    }
                    wordCharCount++;
                }

                // === UPDATE DOM UNTUK KARAKTER BENAR ===
                clearWrongInputFeedback(lessonId);
                const wasWrongPrev = userTypingHistory[prevIndex]?.isCorrect === false || false;
                typingCharElement.classList.remove('cursor');
                typingCharElement.classList.add(wasWrongPrev ? 'corrected-box' : 'correct-box');

                userTypingHistory[prevIndex] = {
                    key: (expectedChar === ' ' ? ' ' : e.key),
                    isCorrect: true,
                    wasWrong: wasWrongPrev,
                    originalChar: expectedChar
                };

                // INCREMENT TEPAT SEKALI DI SINI
                currentCharIndex++;

                if (allChars[currentCharIndex]) {
                    allChars[currentCharIndex].classList.add('cursor');
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
                startTimer();
                wrongCount++;
                updateStatsDisplay();

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

    startTime = null;
    correctCount = 0;
    wrongCount = 0;
    wordStartTime = null;
    wordCharCount = 0;
    lastWordShownIndex = -1;
    shownWords.clear();
    shownShortWordSets.clear();
    shownExactWords.clear();
    wordBestWpm.clear();


    const wpmEl = document.getElementById("wpm");
    const accEl = document.getElementById("accuracy");
    if (wpmEl) wpmEl.textContent = "0";
    if (accEl) accEl.textContent = "0%";

    clearWrongInputFeedback(lessonId);
    updateState(lessonId, { currentCharIndex: 0, userTypingHistory: [], finished: false, isHoldKeyActive: false });

    if (lessonTextDisplayRef) {
        lessonTextDisplayRef.innerHTML = '';
        lessonTextDisplayRef.dataset.lessonId = '';
        document.body.classList.remove('lesson-overlay-active');
        document.body.classList.remove('show-hold-key-overlay');
    }
    // Saat reset / skip
    const statsContainer = document.getElementById("typing-stats");
    if (statsContainer) {
        statsContainer.classList.remove("show"); // fade-out
    }
}

export function cleanupFreeTypingOverlay() {
    document.body.classList.remove('lesson-overlay-active');
    document.body.classList.remove('show-hold-key-overlay');

    const overlay = document.querySelector('.lesson-overlay');
    if (overlay) overlay.remove();

    const overlayText = document.getElementById('hold-key-overlay-text');
    if (overlayText) overlayText.remove();
}

export function cleanupTypingStats() {
    const statsContainer = document.getElementById("typing-stats");
    if (statsContainer) {
        statsContainer.remove();
    }
}

export function hideTypingStats() {
    const statsContainer = document.getElementById("typing-stats");
    if (statsContainer) {
        statsContainer.classList.remove("show");
    }
}

function getWordAnchorSpan(allChars, startIdx, endIdx) {
    if (!Array.isArray(allChars) || allChars.length === 0) return null;

    // Normalisasi index
    const len = allChars.length;
    let s = Math.max(0, Math.min(startIdx ?? 0, len - 1));
    // Ambil huruf pertama kata sebagai anchor
    return allChars[s] || null;
}

function showWordWPM(spanEl, wpm) {
    if (!spanEl) return;

    // Hapus SEMUA word-wpm yang masih ada biar tidak nimpa
    document.querySelectorAll('.word-wpm').forEach(el => el.remove());

    const wpmEl = document.createElement('div');
    wpmEl.className = 'word-wpm';

    // angka
    const numEl = document.createElement('span');
    numEl.textContent = wpm;

    // teks "WPM" kecil & naik
    const supEl = document.createElement('span');
    supEl.className = 'wpm-sup';
    supEl.textContent = "WPM";

    // pesan motivasi
    const message = getWpmMessage(wpm);
    const msgEl = document.createElement('span');
    msgEl.textContent = " " + message;

    wpmEl.appendChild(numEl);
    wpmEl.appendChild(supEl);
    wpmEl.appendChild(msgEl);

    spanEl.appendChild(wpmEl);

    // kasih efek fade-out kalau ga ada WPM baru lagi
    setTimeout(() => {
        if (wpmEl && wpmEl.parentElement) {
            wpmEl.classList.add('fade-out');
            setTimeout(() => {
                if (wpmEl && wpmEl.parentElement) {
                    wpmEl.remove();
                }
            }, 600);
        }
    }, 1500);
}

function getWpmMessage(wpm) {
    if (wpm < 20) return "Keep going!";
    if (wpm < 40) return "Good!";
    if (wpm < 60) return "Nice!";
    if (wpm < 120) return "WOW!⭐";
    return "🔥LEGEND!";
}
