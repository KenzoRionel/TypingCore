// Logic terpisah untuk learn-typing
import { lessons } from './learn-typing-lessons.js';

// --- STATE PELAJARAN 2 (MODULE-SCOPED) ---
let lesson2State = 0; // State mesin untuk pelajaran 2 (0:f, 1:f-fade, 2:j, 3:j-fade, 4:ffjj, ...)
let lesson2FCount = 0;
let lesson2JCount = 0;
let lesson2SequenceIndex = 0; // Index dalam urutan kombinasi (untuk state 4, 6, 8, 10)

// --- FUNGSI RESET STATE PELAJARAN 2 ---
export function resetLesson2State() {
    lesson2State = 0;
    lesson2FCount = 0;
    lesson2JCount = 0;
    lesson2SequenceIndex = 0;
}

// --- FUNGSI UTILITY KEYBOARD ---
export function createKeyboard(keyboardContainer, keyLayout) {
    keyboardContainer.innerHTML = '';
    keyLayout.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.classList.add('keyboard-row');
        row.forEach(key => {
            if (key === '') {
                const spacer = document.createElement('div');
                spacer.classList.add('key-spacer');
                rowElement.appendChild(spacer);
                return;
            }
            const keyElement = document.createElement('div');
            keyElement.classList.add('key');
            let lowerKey = key.toLowerCase();
            let displayKey = key;

            if (key === 'ShiftLeft' || key === 'ShiftRight') displayKey = 'Shift';
            if (key === 'ControlLeft' || key === 'ControlRight') displayKey = 'Ctrl';
            if (key === 'AltLeft' || key === 'AltRight') displayKey = 'Alt';
            if (key === 'MetaLeft' || key === 'MetaRight') displayKey = 'Win';
            if (key === 'ContextMenu') displayKey = 'Menu';
            if (key === 'Space') {
                displayKey = '';
                lowerKey = ' ';
            }

            keyElement.textContent = displayKey;
            keyElement.setAttribute('data-key', lowerKey);

            if (['Backspace', 'Tab', 'CapsLock', 'Enter', 'ShiftLeft', 'ShiftRight'].includes(key)) {
                keyElement.classList.add('key-medium');
            }
            if (key === 'Space') {
                keyElement.classList.add('key-space');
            }
            if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu'].includes(key)) {
                keyElement.classList.add('key-small');
            }
            rowElement.appendChild(keyElement);
        });
        keyboardContainer.appendChild(rowElement);
    });
}

function clearKeyboardHighlights(keyboardContainer) {
    keyboardContainer.querySelectorAll('.key.next-key').forEach(el => {
        el.classList.remove('next-key');
        el.classList.remove('key-highlight-animation');
    });
}

function highlightKeyOnKeyboard(keyboardContainer, keyChar) {
    clearKeyboardHighlights(keyboardContainer); // Pastikan ini dipanggil setiap kali highlight

    const keyElement = keyboardContainer.querySelector(`.key[data-key="${keyChar.toLowerCase()}"]`);
    if (keyElement) {
        keyElement.classList.add('next-key');
        keyElement.classList.add('key-highlight-animation');
    }
}

// --- FUNGSI MENDAPATKAN URUTAN KARAKTER UNTUK PELAJARAN 2 ---
export function getSequenceForState(state) {
    switch (state) {
        case 4: return ['f', 'f', 'j', 'j'];
        case 6: return ['j', 'j', 'f', 'f'];
        case 8: return ['f', 'j', 'f', 'j'];
        case 10: return ['j', 'f', 'j', 'f'];
        default: return [];
    }
}

// --- FUNGSI RENDER PELAJARAN (HANYA MERENDER, TIDAK MENGUBAH STATE) ---
export function renderLesson({
    lessons,
    currentLessonIndex,
    currentStepIndex,
    currentCharIndex,
    waitingForAnim,
    keyboardContainer,
    lessonTitle,
    lessonInstruction,
    lessonTextDisplay
}) {
    const lesson = lessons[currentLessonIndex];
    if (lessonTitle) lessonTitle.textContent = lesson.title;

    clearKeyboardHighlights(keyboardContainer); // Bersihkan highlight keyboard di awal setiap render

    if (currentLessonIndex === 0) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';
        if (currentStepIndex === 0) {
            if (lessonInstruction) lessonInstruction.innerHTML = lesson.steps[0].instruction;
            highlightKeyOnKeyboard(keyboardContainer, 'f');
        } else if (currentStepIndex === 1) {
            const prevKeyF = document.getElementById('inlineKeyF');
            if (prevKeyF && !prevKeyF.classList.contains('fade-out')) {
                // Biarkan fade-out terjadi di main.js
            } else {
                if (lessonInstruction) lessonInstruction.innerHTML = lesson.steps[1].instruction;
                highlightKeyOnKeyboard(keyboardContainer, 'j');
            }
        } else if (currentStepIndex === 2) {
            const prevKeyJ = document.getElementById('inlineKeyJ');
            if (prevKeyJ && !prevKeyJ.classList.contains('fade-out')) {
                // Biarkan fade-out terjadi di main.js
            } else {
                if (lessonInstruction) lessonInstruction.textContent = 'Pelajaran 1 Selesai! Klik "Lanjutkan" untuk ke pelajaran berikutnya.';
                // Tidak perlu highlight lagi setelah selesai
            }
        }
    } else if (currentLessonIndex === 1) {
        if (lessonTextDisplay) lessonTextDisplay.style.display = 'none';

        let instruction = '';
        let htmlSequence = '';
        let underlineSequence = '';
        let highlightedKey = null; // Variabel untuk menyimpan key yang akan di-highlight

        switch (lesson2State) {
            case 0:
                instruction = 'Ketik "f" empat kali:';
                for (let i = 0; i < 4; i++) {
                    const isActive = i === lesson2FCount;
                    htmlSequence += `<span class="lesson-keyboard-key${isActive ? ' active' : ''}" id="lesson2KeyF${i}">f</span>`;
                    underlineSequence += `<span class="lesson-keyboard-underline-item${isActive ? ' active' : ''}"></span>`;
                }
                highlightedKey = 'f'; // Highlight 'f'
                break;
            case 1:
                instruction = 'Bagus! Lanjutkan...';
                for (let i = 0; i < 4; i++) {
                    htmlSequence += `<span class="lesson-keyboard-key fade-out" id="lesson2KeyF${i}">f</span>`;
                    underlineSequence += `<span class="lesson-keyboard-underline-item"></span>`;
                }
                // highlightedKey = 'f'; // Opsional: tetap highlight 'f' sampai animasi selesai
                break;
            case 2:
                instruction = 'Sekarang ketik "j" empat kali:';
                for (let i = 0; i < 4; i++) {
                    const isActive = i === lesson2JCount;
                    htmlSequence += `<span class="lesson-keyboard-key${isActive ? ' active' : ''}" id="lesson2KeyJ${i}">j</span>`;
                    underlineSequence += `<span class="lesson-keyboard-underline-item${isActive ? ' active' : ''}"></span>`;
                }
                highlightedKey = 'j'; // Highlight 'j'
                break;
            case 3:
                instruction = 'Luar biasa! Persiapan kombinasi...';
                for (let i = 0; i < 4; i++) {
                    htmlSequence += `<span class="lesson-keyboard-key fade-out" id="lesson2KeyJ${i}">j</span>`;
                    underlineSequence += `<span class="lesson-keyboard-underline-item"></span>`;
                }
                // highlightedKey = 'j'; // Opsional: tetap highlight 'j' sampai animasi selesai
                break;
            case 4:
            case 6:
            case 8:
            case 10:
                const sequence = getSequenceForState(lesson2State);
                instruction = `Ketik "${sequence.join(' ')}" empat kali:`;
                for (let i = 0; i < 4; i++) {
                    const key = sequence[i];
                    const isActive = i === lesson2SequenceIndex;
                    htmlSequence += `<span class="lesson-keyboard-key${isActive ? ' active' : ''}" id="lesson2KeySeq${i}">${key}</span>`;
                    underlineSequence += `<span class="lesson-keyboard-underline-item${isActive ? ' active' : ''}"></span>`;
                }
                highlightedKey = sequence[lesson2SequenceIndex]; // Highlight kunci sesuai sequence dan index
                break;
            case 5:
            case 7:
            case 9:
            case 11:
                const prevSequence = getSequenceForState(lesson2State - 1);
                instruction = (lesson2State === 11) ? 'Pelajaran 2 Selesai!' : 'Terus berlatih...';
                for (let i = 0; i < 4; i++) {
                    htmlSequence += `<span class="lesson-keyboard-key fade-out" id="lesson2KeySeq${i}">${prevSequence[i]}</span>`;
                    underlineSequence += `<span class="lesson-keyboard-underline-item"></span>`;
                }
                // highlightedKey = prevSequence[lesson2SequenceIndex]; // Opsional: tetap highlight sampai animasi selesai
                break;
            default:
                instruction = 'Pelajaran 2 Selesai!';
                break;
        }

        if (lessonInstruction) {
            lessonInstruction.innerHTML =
                `<div class="lesson-keyboard-sequence">${htmlSequence}</div>
                <div class="lesson-keyboard-underline">${underlineSequence}</div>`;
        }

        if (highlightedKey) {
            highlightKeyOnKeyboard(keyboardContainer, highlightedKey); // Panggil highlight di sini
        }
    } else {
        if (lessonTextDisplay) lessonTextDisplay.style.display = '';
        if (lessonInstruction) lessonInstruction.textContent = lesson.instruction || '';
        if (lessonTextDisplay) lessonTextDisplay.innerHTML = '';
        if (lesson.sequence && lessonTextDisplay) {
            lesson.sequence.forEach((char, idx) => {
                const span = document.createElement('span');
                span.textContent = char;
                if (idx < currentCharIndex) {
                    span.classList.add('correct');
                } else if (idx === currentCharIndex) {
                    span.classList.add('cursor');
                }
                lessonTextDisplay.appendChild(span);
                if (idx < lesson.sequence.length - 1 && char !== ' ') {
                    lessonTextDisplay.appendChild(document.createTextNode(' '));
                }
            });
            if (currentCharIndex < lesson.sequence.length) {
                highlightKeyOnKeyboard(keyboardContainer, lesson.sequence[currentCharIndex]);
            }
        }
    }
}

// --- FUNGSI UNTUK MENGHIGHLIGHT KUNCI BERIKUTNYA (Ini tidak lagi melakukan apa-apa di sini) ---
export function highlightNextKey({ keyboardContainer }) {
    // Logika highlight sekarang ditangani langsung di `renderLesson`
    // Fungsi ini bisa tetap ada sebagai placeholder atau dihapus jika tidak ada kegunaan lain.
    // Jika Anda ingin animasi highlight yang terpisah dari render utama, Anda bisa menaruhnya di sini.
    // Untuk tujuan ini, saya sudah memindahkan highlight ke dalam renderLesson.
}

// --- FUNGSI INPUT HANDLER UNTUK PELAJARAN 2 ---
export function handleLesson2Input({ e, doRenderAndHighlight, dispatchLesson2FinishedEvent, lessonInstructionEl }) {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
    } else {
        return;
    }

    let shouldRender = false; // Flag untuk melacak apakah render perlu dilakukan

    if (lesson2State === 0) {
        if (e.key.toLowerCase() === 'f') {
            lesson2FCount++;
            if (lesson2FCount >= 4) {
                lesson2State = 1;
                shouldRender = true; // Akan render dan memicu timeout
            } else {
                shouldRender = true; // Render untuk update active class
            }
        } else {
            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    } else if (lesson2State === 1) {
        if (lessonInstructionEl) {
            lessonInstructionEl.classList.add('error-shake');
            setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
        }
    } else if (lesson2State === 2) {
        if (e.key.toLowerCase() === 'j') {
            lesson2JCount++;
            if (lesson2JCount >= 4) {
                lesson2State = 3;
                shouldRender = true; // Akan render dan memicu timeout
            } else {
                shouldRender = true; // Render untuk update active class
            }
        } else {
            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    } else if (lesson2State === 3) {
        if (lessonInstructionEl) {
            lessonInstructionEl.classList.add('error-shake');
            setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
        }
    } else if ([4, 6, 8, 10].includes(lesson2State)) {
        const sequence = getSequenceForState(lesson2State);
        const expectedKey = sequence[lesson2SequenceIndex];

        if (e.key.toLowerCase() === expectedKey) {
            lesson2SequenceIndex++;
            shouldRender = true; // Render untuk update active class dan highlight
            if (lesson2SequenceIndex >= 4) {
                lesson2SequenceIndex = 0;
                lesson2State++; // Pindah ke state fade out
                if (lesson2State === 11) {
                    dispatchLesson2FinishedEvent(new Event('lesson2-finished'));
                }
            }
        } else {
            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    } else if ([5, 7, 9, 11].includes(lesson2State)) {
        if (e.key.length === 1 || e.key === ' ') {
            if (lessonInstructionEl) {
                lessonInstructionEl.classList.add('error-shake');
                setTimeout(() => lessonInstructionEl.classList.remove('error-shake'), 200);
            }
        }
    }

    if (shouldRender) {
        doRenderAndHighlight();
        // Untuk state fade-out, kita perlu setTimeout untuk memicu transisi ke state berikutnya
        if ([1, 3, 5, 7, 9, 11].includes(lesson2State) && lesson2State < 11) {
            setTimeout(() => {
                lesson2State++; // Pindah ke state non-fade out berikutnya
                doRenderAndHighlight(); // Render ulang setelah state berubah
            }, 100);
        }
    }
}