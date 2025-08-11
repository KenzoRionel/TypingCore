// js/learn-typing-logic.js
import { getDOMReferences } from './dom-elements.js';
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
    createKeyboard
} from './learn-typing-ui.js';
import { renderHandVisualizer } from './hand-visualizer.js';
import { renderFreeTypingLesson, resetFreeTypingState } from './lesson-free-typing.js';
import { renderSimpleDrillLesson } from './lesson-simple-drill.js';
import { renderCharacterDrillLesson, resetCharacterDrillState } from './lesson-character-drill.js';
import { handleKeyboardInput } from './input-handler.js';
import { keyLayout } from './keyboard-layout.js';

function showLessonElements() {
    const domElements = getDOMReferences();
    domElements.lessonHeader.style.display = '';
    domElements.keyboardContainer.style.display = '';
    domElements.prevLessonBtn.style.display = '';
    domElements.nextLessonBtn.style.display = '';
    domElements.progressContainerWrapper.style.display = '';
}

export function resetLessonState() {
    const domElements = getDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');
    const lessonId = `lesson${currentLessonIndex + 1}`;
    const lesson = lessons[currentLessonIndex];
    updateState('waitingForAnim', false);

    if (!lesson) return;

    switch(lesson.type) {
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
    const domElements = getDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');

    if (!lessons || !lessons[currentLessonIndex]) {
        console.error("Pelajaran tidak ditemukan atau indeks tidak valid.");
        return;
    }

    const lesson = lessons[currentLessonIndex];

    // PERUBAHAN: Tambahkan kelas ke body berdasarkan tipe pelajaran
    document.body.className = document.body.className.replace(/\blesson-type-\S+/g, '');
    if (lesson.type) {
        document.body.classList.add(`lesson-type-${lesson.type}`);
    }

    if (domElements.prevLessonBtn) {
        domElements.prevLessonBtn.style.visibility = (currentLessonIndex === 0) ? 'hidden' : 'visible';
    }
    if (domElements.lessonTitle) domElements.lessonTitle.textContent = lesson.title;
    if (domElements.lessonTextDisplay) {
        domElements.lessonTextDisplay.style.display = '';
    }

    domElements.lessonTextDisplay.classList.remove('lesson-4-display');

    switch (lesson.type) {
        case 'simple-drill':
            if (domElements.lessonTextDisplay) {
                // PERBAIKAN: Sembunyikan elemen ini untuk pelajaran simple-drill
                domElements.lessonTextDisplay.style.display = 'none';
                domElements.lessonTextDisplay.innerHTML = '';
            }
            renderSimpleDrillLesson(currentLessonIndex, domElements.lessonInstruction, domElements.keyboardContainer);
            break;
        case 'character-drill':
            if (domElements.lessonTextDisplay) {
                // PERBAIKAN: Sembunyikan elemen ini untuk pelajaran character-drill
                domElements.lessonTextDisplay.style.display = 'none';
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
            // PERBAIKAN: Hapus display:flex dari sini, karena container luar tidak lagi flex
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

let currentKeyDownHandler = null; 

function loadLesson() {
    const domElements = getDOMReferences();
    const currentLesson = lessons[getState('currentLessonIndex')];
    
    if (currentKeyDownHandler) {
        document.removeEventListener('keydown', currentKeyDownHandler);
    }
    
    currentKeyDownHandler = (e) => handleKeyboardInput({
        e,
        domElements: getDOMReferences(),
        animationFunctions: {
            setIsCorrectInputAnimationActive,
            setAnimationSpeed,
            animateJellyEffect,
            animateAllBordersOnCorrectInput,
            renderLesson
        },
    });

    document.addEventListener('keydown', currentKeyDownHandler);
    
    // ✅ PERBAIKAN: Memanggil cleanupAllLessonUI tanpa parameter
    cleanupAllLessonUI();
    
    resetLessonState();
    renderLesson();
    showLessonElements();
}

export function goToNextLesson() {
    const domElements = getDOMReferences();
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
    const domElements = getDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');
    if (currentLessonIndex > 0) {
        updateState('currentLessonIndex', currentLessonIndex - 1);
        domElements.lessonCompleteNotification.classList.remove('active');
        loadLesson();
    }
}

export function retryLesson() {
    const domElements = getDOMReferences();
    const { lessonCompleteNotification } = domElements;
    if (lessonCompleteNotification) {
        lessonCompleteNotification.classList.remove('active');
        setTimeout(() => {
            loadLesson();
        }, 50);
    }
}

export function dispatchFinishedEvent(lessonIndex) {
    document.dispatchEvent(new Event(`lesson${lessonIndex + 1}-finished`));
}

export function setupEventListeners() {
    const domElements = getDOMReferences();
    const { nextLessonBtn, prevLessonBtn, retryLessonBtn, continueBtn } = domElements;

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
    lessons.forEach((lesson, index) => {
        document.addEventListener(`lesson${index + 1}-finished`, () => {
            // PERBAIKAN: Tambahkan jeda sebelum menampilkan notifikasi
            setTimeout(() => {
                showLessonCompleteNotification(lessons, getState('currentLessonIndex'), domElements);
            }, 500); // Jeda 500ms
        });
    });

    loadLesson();
}