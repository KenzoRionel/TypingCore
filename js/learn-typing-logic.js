// js/learn-typing-logic.js
// Perbaikan: Ganti getGameDOMReferences dengan getLessonDOMReferences
import { getLessonDOMReferences } from './utils/dom-elements.js';
import { lessons } from './learn-typing-lessons.js';
import { getState, updateState, getHiddenInput } from './learn-typing-state.js';
import { calculateLessonProgress, updateProgressBar } from './progress-bar.js';
import {
    renderOtherLessons,
    showLessonCompleteNotification,
    setAnimatingKey,
    setIsCorrectInputAnimationActive,
    setAnimationSpeed,
    animateJellyEffect,
    animateAllBordersOnCorrectInput,
    cleanupAllLessonUI,
    createKeyboard,
    highlightWrongKeyOnKeyboard,
} from './learn-typing-ui.js';
import { renderHandVisualizer } from './hand-visualizer.js';
import { renderFreeTypingLesson, resetFreeTypingState, cleanupFreeTypingOverlay, cleanupTypingStats, hideTypingStats  } from './lesson-free-typing.js';
import { renderSimpleDrillLesson } from './lesson-simple-drill.js';
import { renderCharacterDrillLesson, resetCharacterDrillState } from './lesson-character-drill.js';
import { attachInputHandlers } from './input-handler.js';
import { keyLayout } from './keyboard-layout.js';
import { initDarkMode } from './utils/dark-mode.js'; // Impor modul dark mode

function showLessonElements() {
    // Perbaikan: Gunakan getLessonDOMReferences()
    const domElements = getLessonDOMReferences();
    domElements.lessonHeader.style.display = '';
    domElements.keyboardContainer.style.display = '';
    domElements.prevLessonBtn.style.display = '';
    domElements.nextLessonBtn.style.display = '';
    domElements.progressContainerWrapper.style.display = '';
}

export function resetLessonState() {
    const domElements = getLessonDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${currentLessonIndex + 1}`;
    const lesson = lessons[currentLessonIndex];
    updateState('waitingForAnim', false);

    // ✅ Selalu reset overlay hold-key sebelum masuk ke lesson baru
    const holdOverlay = document.getElementById("hold-key-overlay");
    if (holdOverlay) {
        holdOverlay.style.display = "none";
    }
    updateState("isHoldKeyActive", false); // pastikan state-nya ikut mati

    if (!lesson) return;

    switch (lesson.type) {
        case 'simple-drill':
            updateState(lessonId, { sequenceIndex: 0, nextCharIndex: 0, finished: false });
            break;
        case 'character-drill':
            resetCharacterDrillState();
            break;
        case 'free-typing':
            resetFreeTypingState();
            break;
        default:
            updateState(lessonId, { currentCharIndex: 0, sequenceIndex: 0, isFinished: false });
            break;
    }
}

export function renderLesson() {
    // Perbaikan: Gunakan getLessonDOMReferences()
    const domElements = getLessonDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');

    if (!lessons || !lessons[currentLessonIndex]) {
        console.error("Pelajaran tidak ditemukan atau indeks tidak valid.");
        return;
    }

    const lesson = lessons[currentLessonIndex];

    if (lesson.type === 'free-typing') {
        domElements.lessonTextDisplay.style.display = '';
        const stats = document.getElementById("typing-stats");
        if (stats) stats.style.display = "block"; // ✅ tampilkan kalau free typing
    } else {
        domElements.lessonTextDisplay.style.display = 'none';
        const stats = document.getElementById("typing-stats");
        if (stats) stats.style.display = "none"; // ✅ sembunyikan kalau bukan free typing
    }

    document.body.className = document.body.className.replace(/\blesson-type-\S+/g, '');
    if (lesson.type) {
        document.body.classList.add(`lesson-type-${lesson.type}`);
    }

    // Tambahkan pengecekan null sebelum mengakses properti
    if (!domElements) {
        console.error("Gagal mendapatkan referensi DOM untuk pelajaran.");
        return;
    }

    if (domElements.prevLessonBtn) {
        domElements.prevLessonBtn.style.visibility = (currentLessonIndex === 0) ? 'hidden' : 'visible';
    }
    if (domElements.lessonTitle) domElements.lessonTitle.textContent = lesson.title;

    domElements.lessonTextDisplay.classList.remove('lesson-4-display');

    switch (lesson.type) {
        case 'simple-drill':
            renderSimpleDrillLesson(
                currentLessonIndex,
                domElements.lessonInstruction,
                domElements.keyboardContainer
            );
            break;

        case 'character-drill':
            if (domElements.lessonTextDisplay) {
                domElements.lessonTextDisplay.innerHTML = '';
            }
            renderCharacterDrillLesson({
                lesson,
                lessonInstruction: domElements.lessonInstruction,
                keyboardContainer: domElements.keyboardContainer,
                lessonTextDisplay: domElements.lessonTextDisplay,
            });
            break;

        case 'free-typing':
            domElements.lessonTextDisplay.classList.add('lesson-4-display');
            renderFreeTypingLesson({
                lesson,
                lessonInstruction: domElements.lessonInstruction,
                keyboardContainer: domElements.keyboardContainer,
                lessonTextDisplay: domElements.lessonTextDisplay,
            });
            break;
        default:
            const lessonId = `lesson${currentLessonIndex + 1}`;
            const lessonState = getState(lessonId) || { currentCharIndex: 0, sequenceIndex: 0 };
            renderOtherLessons(lesson, lessonState.currentCharIndex, domElements.lessonTextDisplay, domElements.lessonInstruction, domElements.keyboardContainer, setAnimatingKey, renderHandVisualizer);
            break;
    }

    const progress = calculateLessonProgress(lesson);
    updateProgressBar(progress, domElements.progressText, domElements.progressBar);
}

function loadLesson() {
    cleanupAllLessonUI();
    cleanupFreeTypingOverlay();
    resetLessonState();
    renderLesson();
    showLessonElements();

}

export function goToNextLesson() {
    // Perbaikan: Gunakan getLessonDOMReferences()
    const domElements = getLessonDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');
    if (currentLessonIndex < lessons.length - 1) {
        updateState('currentLessonIndex', currentLessonIndex + 1);
        domElements.lessonCompleteNotification.classList.remove('active');
        loadLesson();
    } else {
        console.log("Semua pelajaran selesai.");
    }
}

export function goToPreviousLesson() {
    // Perbaikan: Gunakan getLessonDOMReferences()
    const domElements = getLessonDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');
    if (currentLessonIndex > 0) {
        updateState('currentLessonIndex', currentLessonIndex - 1);
        domElements.lessonCompleteNotification.classList.remove('active');
        loadLesson();
    }
}

export function retryLesson() {
    // Perbaikan: Gunakan getLessonDOMReferences()
    const domElements = getLessonDOMReferences();
    const { lessonCompleteNotification } = domElements;
    if (lessonCompleteNotification) {
        lessonCompleteNotification.classList.remove('active');
        setTimeout(() => {
            loadLesson();
        }, 50);
    }
}

export function dispatchFinishedEvent(lessonIndex) {
    // 🚀 Sembunyikan stats biar ga ikut tampil di notifikasi
    const stats = document.getElementById("typing-stats");
    if (stats) stats.style.display = "none";

    // Tetap trigger event selesai
    document.dispatchEvent(new Event(`lesson${lessonIndex + 1}-finished`));
}


export function setupEventListeners() {
    // Perbaikan: Gunakan getLessonDOMReferences()
    const domElements = getLessonDOMReferences();
    if (!domElements) {
        console.error("Gagal mendapatkan referensi DOM di setupEventListeners.");
        return;
    }

    const { nextLessonBtn, prevLessonBtn, retryLessonBtn, continueBtn, lessonListBtn } = domElements;

    createKeyboard(domElements.keyboardContainer, keyLayout);

    if (nextLessonBtn) {
        nextLessonBtn.addEventListener('click', goToNextLesson);
    }
    if (prevLessonBtn) {
        prevLessonBtn.addEventListener('click', goToPreviousLesson);
    }
    if (retryLessonBtn) {
        retryLessonBtn.addEventListener('click', retryLesson);
    }
    if (continueBtn) {
        continueBtn.addEventListener('click', goToNextLesson);
    }

    // Panggil modul dark mode yang baru
    initDarkMode(domElements.darkModeToggle);

    lessons.forEach((lesson, index) => {
        document.addEventListener(`lesson${index + 1}-finished`, () => {
            setTimeout(() => {
                showLessonCompleteNotification(lessons, getState('currentLessonIndex'), domElements);
            }, 500);
        });
    });

    attachInputHandlers(loadLesson);

    // START - PERBAIKAN BUG
    if (lessonListBtn) {
        lessonListBtn.addEventListener('click', () => {
            window.location.href = 'lessons.html';
        });
    }
    // END - PERBAIKAN BUG

    // PERBAIKAN: Baca lesson index dari URL saat halaman dimuat
    const urlParams = new URLSearchParams(window.location.search);
    const lessonIndexFromUrl = urlParams.get('lessonIndex');

    if (lessonIndexFromUrl !== null) {
        // Set state dengan lesson index dari URL
        const parsedIndex = parseInt(lessonIndexFromUrl, 10);
        if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < lessons.length) {
            updateState('currentLessonIndex', parsedIndex);
        } else {
            console.error('Invalid lesson index from URL. Loading default lesson.');
            updateState('currentLessonIndex', 0); // Default ke pelajaran pertama jika index tidak valid
        }
    } else {
        updateState('currentLessonIndex', 0); // Default ke pelajaran pertama jika tidak ada parameter
    }

    // Initial load
    loadLesson();
}
