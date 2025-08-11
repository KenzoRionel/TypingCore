// js/learn-typing-ui.js

// Impor modul-modul penting untuk manajemen state dan data pelajaran.
// Meskipun tidak semua fungsi di sini menggunakannya, impor ini memastikan
// ketersediaan jika ada logika UI yang memerlukan state atau data pelajaran.
import { updateState } from './learn-typing-state.js';
import { lessons } from './learn-typing-lessons.js';

let currentHighlightedKeyElement = null;

/**
 * Membuat dan mengembalikan elemen container untuk visualisasi tangan.
 * Elemen ini berisi gambar-gambar tangan yang akan ditampilkan atau disembunyikan.
 * @returns {HTMLDivElement} Elemen container visualizer tangan.
 */
export function createHandVisualizerElement() {
    const visualizerContainer = document.createElement('div');
    visualizerContainer.id = 'hand-visualizer';

    // Daftar gambar tangan yang diperlukan.
    const handImages = [
        { id: 'hand-f', src: 'img/hand_f.png', alt: 'Tangan untuk tombol F' },
        { id: 'hand-j', src: 'img/hand_j.png', alt: 'Tangan untuk tombol J' },
        { id: 'hand-space', src: 'img/hand_space.png', alt: 'Tangan untuk tombol spasi' },
        // ✅ Tambahkan gambar tangan untuk tombol 'd' dan 'k'
        { id: 'hand-d', src: 'img/hand_d.png', alt: 'Tangan untuk tombol D' },
        { id: 'hand-k', src: 'img/hand_k.png', alt: 'Tangan untuk tombol K' },
    ];

    // Loop untuk membuat elemen <img> dan menambahkannya ke container.
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

/**
 * Membuat keyboard virtual berdasarkan tata letak yang diberikan.
 * Menghapus konten keyboard yang ada dan membuat ulang dari awal.
 * @param {HTMLElement} keyboardContainer - Elemen DOM tempat keyboard akan dirender.
 * @param {Array<Array<string>>} keyLayout - Array dua dimensi yang mendefinisikan tata letak tombol.
 */
export function createKeyboard(keyboardContainer, keyLayout) {
    if (!keyboardContainer) {
        console.error("keyboardContainer tidak ditemukan. Tidak dapat membuat keyboard.");
        return;
    }
    // Dapatkan atau buat elemen visualizer tangan dan tambahkan ke keyboard.
    const handVisualizer = keyboardContainer.querySelector('#hand-visualizer') || createHandVisualizerElement();
    keyboardContainer.innerHTML = '';
    keyboardContainer.appendChild(handVisualizer);

    // Objek untuk memetakan nama kunci ke kelas CSS untuk lebar khusus.
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

    // Objek untuk memetakan nama kunci ke teks yang akan ditampilkan.
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
    
    // Loop melalui setiap baris dan kunci di tata letak untuk membuat elemen DOM.
    keyLayout.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.classList.add('keyboard-row');
        row.forEach(key => {
            if (key === '') return;
            
            const keyElement = document.createElement('div');
            keyElement.classList.add('key');
            
            // Dapatkan teks yang akan ditampilkan pada tombol.
            const displayKey = keyDisplayNames[key] !== undefined ? keyDisplayNames[key] : key;
            // Dapatkan kunci yang akan digunakan untuk pencocokan (data-key).
            const lowerKey = key === 'Space' ? ' ' : key.toLowerCase();
            
            keyElement.textContent = displayKey;
            keyElement.setAttribute('data-key', lowerKey);
            
            // Tambahkan kelas lebar khusus jika ada.
            const widthClass = keyWidthClasses[key];
            if (widthClass) {
                keyElement.classList.add(widthClass);
            }
            
            rowElement.appendChild(keyElement);
        });
        keyboardContainer.appendChild(rowElement);
    });
}

/**
 * Menghapus semua highlight dari tombol-tombol keyboard.
 * Ini memastikan hanya ada satu tombol yang disorot pada satu waktu.
 * @param {HTMLElement} keyboardContainer - Elemen container keyboard.
 */
export function clearKeyboardHighlights(keyboardContainer) {
    if (!keyboardContainer) return;
    keyboardContainer.querySelectorAll('.key:not(.wrong-key-flash)').forEach(el => {
        el.classList.remove('next-key', 'correct-key', 'wrong-key');
    });
}

/**
 * Menyorot tombol tertentu di keyboard.
 * @param {HTMLElement} keyboardContainer - Elemen container keyboard.
 * @param {string} keyChar - Karakter kunci yang akan disorot.
 */
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

/**
 * Merender UI untuk pelajaran yang berbasis urutan karakter (non-khusus).
 * Menampilkan teks pelajaran, kursor, dan menyorot tombol yang akan ditekan selanjutnya.
 * @param {object} lesson - Objek data pelajaran.
 * @param {number} currentCharIndex - Indeks karakter yang sedang diketik.
 * @param {HTMLElement} lessonTextDisplay - Elemen DOM untuk menampilkan teks pelajaran.
 * @param {HTMLElement} lessonInstruction - Elemen DOM untuk menampilkan instruksi.
 * @param {HTMLElement} keyboardContainer - Elemen container keyboard.
 * @param {Function} setAnimatingKey - Fungsi untuk mengaktifkan animasi pada tombol.
 * @param {Function} renderHandVisualizer - Fungsi untuk menampilkan visualisasi tangan.
 */
export function renderOtherLessons(lesson, currentCharIndex, lessonTextDisplay, lessonInstruction, keyboardContainer, setAnimatingKey, renderHandVisualizer) {
    if (!lessonTextDisplay || !lessonInstruction) return;
    lessonTextDisplay.style.display = '';
    lessonInstruction.textContent = lesson.instruction || '';
    lessonTextDisplay.innerHTML = '';
    
    if (lesson.sequence && lesson.sequence.length > 0) {
        // Buat elemen <span> untuk setiap karakter dalam urutan.
        lessonTextDisplay.innerHTML = lesson.sequence.map((char, idx) => {
            const displayChar = char === ' ' ? '\u00A0' : char; // Gunakan &nbsp; untuk spasi.
            let className = 'typing-char';
            
            if (idx < currentCharIndex) {
                className += ' correct';
            } else if (idx === currentCharIndex) {
                className += ' cursor';
            }
            
            return `<span class="${className}">${displayChar}</span>`;
        }).join('');

        // Sorot tombol keyboard dan tampilkan visualizer tangan untuk karakter berikutnya.
        if (currentCharIndex < lesson.sequence.length) {
            const nextChar = lesson.sequence[currentCharIndex];
            const keyElement = keyboardContainer.querySelector(`[data-key="${nextChar.toLowerCase()}"]`);

            if (keyElement) {
                keyElement.classList.add('next-key');
                if (setAnimatingKey) setAnimatingKey(keyElement);
                if (renderHandVisualizer) renderHandVisualizer(nextChar);
            }
        } else {
            // Jika pelajaran selesai, nonaktifkan animasi.
            if (setAnimatingKey) setAnimatingKey(null);
            if (renderHandVisualizer) renderHandVisualizer(null);
            clearKeyboardHighlights(keyboardContainer);
        }
    }
}

/**
 * Menampilkan notifikasi "Pelajaran Selesai".
 * Menyembunyikan elemen UI pelajaran dan menampilkan overlay notifikasi.
 * @param {Array<object>} lessons - Array data pelajaran.
 * @param {number} currentLessonIdx - Indeks pelajaran yang baru selesai.
 * @param {object} domElements - Objek yang berisi semua referensi elemen DOM.
 */
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

    // Sembunyikan semua elemen UI pelajaran.
    [lessonHeader, keyboardContainer, prevLessonBtn, nextLessonBtn, lessonTextDisplay, progressContainerWrapper].forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Hentikan semua animasi pada tombol keyboard.
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

    // Animasi progress bar dalam notifikasi.
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
        // Perbarui teks notifikasi dan mulai animasi SVG.
        const h2 = lessonCompleteNotification.querySelector('h3');
        if (h2) h2.textContent = `Pelajaran ${currentLessonIdx + 1} selesai!`;
        if (successAnimationSvg) {
            successAnimationSvg.classList.remove('animate');
            void successAnimationSvg.offsetWidth;
            successAnimationSvg.classList.add('animate');
        }

        // Tampilkan pratinjau pelajaran berikutnya.
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
        
        // Tampilkan notifikasi dengan animasi fade-in.
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

/**
 * Menyorot tombol keyboard untuk sementara sebagai umpan balik jika input salah.
 * @param {HTMLElement} keyboardContainer - Elemen container keyboard.
 * @param {string} keyChar - Karakter kunci yang salah.
 */
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

/**
 * Memicu animasi border untuk semua tombol yang relevan pada input yang benar.
 * PERHATIAN: Selektor kelas `.lesson-keyboard-key` mungkin perlu disesuaikan
 * jika struktur HTML diubah.
 * @param {HTMLElement} lessonTextDisplay - Elemen DOM untuk menampilkan teks pelajaran.
 */
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

/**
 * Menerapkan efek "jelly" atau getar pada tombol.
 * @param {HTMLElement} keyElement - Elemen tombol yang akan dianimasikan.
 * @param {Function} callback - Fungsi yang akan dipanggil setelah animasi selesai.
 */
export function animateJellyEffect(keyElement, callback) {
    if (keyElement) {
        keyElement.classList.add('jelly-effect');
        // Mendengarkan event 'animationend' untuk menghapus kelas dan memanggil callback.
        keyElement.addEventListener('animationend', () => {
            keyElement.classList.remove('jelly-effect');
            if (callback && typeof callback === 'function') {
                callback();
            }
        }, { once: true }); // Opsi { once: true } memastikan event listener dihapus setelah satu kali pemicuan.
    }
}