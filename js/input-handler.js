// js/input-handler.js
import { getState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';
import { handleFreeTypingInput } from './lesson-free-typing.js';
import { handleSimpleDrillInput } from './lesson-simple-drill.js';
import { handleCharacterDrillInput } from './lesson-character-drill.js';
import { getDOMReferences } from './dom-elements.js';
import { 
    setIsCorrectInputAnimationActive,
    setAnimationSpeed,
    animateJellyEffect,
    animateAllBordersOnCorrectInput,
} from './learn-typing-ui.js';

export function handleKeyboardInput({ e, animationFunctions }) {
    // Ambil referensi DOM dan status terbaru di awal fungsi
    const domElements = getDOMReferences();
    const currentLessonIndex = getState('currentLessonIndex');
    const isTransitioning = getState('isTransitioning'); // ✅ Perubahan: Ambil status baru
    
    // Cek notifikasi selesai pelajaran aktif, jika ya, hanya tanggapi 'Enter'
    if (domElements.lessonCompleteNotification?.classList.contains('active')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            domElements.continueBtn?.click();
        }
        return;
    }

    // ✅ Perubahan: Hentikan input jika pelajaran sedang dalam transisi atau rendering
    if (isTransitioning) {
        e.preventDefault();
        return;
    }

    const currentLesson = lessons[currentLessonIndex];
    if (!currentLesson) {
        console.error('handleKeyboardInput: Pelajaran tidak ditemukan atau indeks tidak valid.');
        return; 
    }
    
    // Cegah perilaku default browser untuk tombol yang relevan
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    const baseProps = {
        e,
        domElements,
        currentLessonIndex,
        animationFunctions: {
            setIsCorrectInputAnimationActive,
            setAnimationSpeed,
            animateJellyEffect,
            animateAllBordersOnCorrectInput,
        },
    };

    // Alihkan input ke penangan yang sesuai berdasarkan tipe pelajaran
    switch (currentLesson.type) {
        case 'character-drill':
            handleCharacterDrillInput(baseProps); // ✅ Perubahan: Gunakan baseProps untuk konsistensi
            break;
        case 'simple-drill':
            handleSimpleDrillInput(baseProps); // ✅ Perubahan: Gunakan baseProps untuk konsistensi
            break;
        case 'free-typing':
            handleFreeTypingInput(baseProps); // ✅ Perubahan: Gunakan baseProps untuk konsistensi
            break;
        default:
            console.error(`Tipe pelajaran tidak dikenal: ${currentLesson.type}`);
            break;
    }
}