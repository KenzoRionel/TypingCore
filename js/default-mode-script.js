// js/default-mode-script.js (Gabungan dengan Speedometer)

document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    // Elemen Input/Display Utama
    const textDisplay = document.getElementById('textDisplay');
    const hiddenTextInput = document.getElementById('hiddenTextInput'); // Ganti 'textInput'
    const restartButton = document.getElementById('restartButton'); // Tombol restart utama (di kontrol panel)

    // Elemen Span yang mungkin tidak lagi digunakan untuk display angka, tapi tetap di-referensi jika CSS/HTML masih punya
    const accuracySpan = document.getElementById('accuracy');
    const timerSpan = document.getElementById('timer');

    // Elemen Speedometer WPM
    const wpmValueText = document.getElementById('wpmValue');
    const wpmNeedle = document.getElementById('wpmNeedle');
    const wpmTicksContainer = document.getElementById('wpmTicks');

    // Accuracy Speedometer Elements
    const accuracyValueText = document.getElementById('accuracyValue');
    const accuracyNeedle = document.getElementById('accuracyNeedle');
    const accuracyTicksContainer = document.getElementById('accuracyTicks');

    // Timer Speedometer Elements
    const timerValueText = document.getElementById('timerValue');
    const timerNeedle = document.getElementById('timerNeedle');
    const timerTicksContainer = document.getElementById('timerTicks');

    // ========================================================
    // MODIFIKASI: Elemen untuk menampilkan hasil (bukan modal)
    const resultsDisplayArea = document.getElementById('resultsDisplayArea'); // Area utama hasil

    // Elemen-elemen individu di dalam resultsDisplayArea (pastikan ID ini ada di HTML Anda)
    const finalWPMText = document.getElementById('finalWPM');
    const finalAccuracyText = document.getElementById('finalAccuracy');
    const finalTimeText = document.getElementById('finalTime');
    const finalErrorsText = document.getElementById('finalErrors');
    const finalTotalWordsText = document.getElementById('finalTotalWords');
    const finalCorrectWordsText = document.getElementById('finalCorrectWords');
    const finalIncorrectWordsText = document.getElementById('finalIncorrectWords');

    // Elemen modal yang mungkin masih ada, kita akan pastikan disembunyikan
    const resultModal = document.getElementById('resultModal');
    // ========================================================

    // Objek modalElements tidak diperlukan lagi jika tidak ada modal
    // const modalElements = { ... }; // Hapus ini atau komentar

    // === Game State Variables ===
    let fullTextWords = [];
    let typedWordIndex = 0;
    let correctChars = 0;
    let incorrectChars = 0;
    let startTime;
    let timerInterval;
    let updateStatsInterval;

    // Replay data - keystroke logging
    let keystrokeLog = [];

    let totalCorrectWords = 0;
    let totalIncorrectWords = 0;

    let typedWordCorrectness = [];
    let userTypedWords = [];

    const TIMED_TEST_DURATION = 60;
    let timeRemaining = TIMED_TEST_DURATION;

    const WORDS_PER_LOGICAL_LINE = 10;
    const DISPLAY_LOGICAL_LINES_COUNT = 3;
    const INITIAL_WORD_BUFFER = WORDS_PER_LOGICAL_LINE * (DISPLAY_LOGICAL_LINES_COUNT + 5);
    const WORDS_TO_GENERATE_ON_REFILL = WORDS_PER_LOGICAL_LINE * 3;
    const MAX_OVERTYPED_CHARS_HIGHLIGHT = 5; // Batas karakter berlebih yang disorot


    let currentLogicalLineOffset = 0;

    // === Speedometer Constants ===
    const GAUGE_FACE_RADIUS = 80;
    const TICK_RADIAL_DISTANCE = 75;

    // === Tick Definitions for Each Speedometer ===
    const wpmMax = 200;
    const wpmTickColors = {
        '0-40': 'green',
        '41-80': 'yellow',
        '81-120': 'orange',
        '121-200': 'red'
    };

    const accuracyMax = 100;
    const accuracyTickColors = {
        '0-70': 'red',
        '71-85': 'orange',
        '86-95': 'yellow',
        '96-100': 'green'
    };

    const timerMax = 60;
    const timerTickColors = {
        '0-10': 'red',
        '11-30': 'orange',
        '31-50': 'yellow',
        '51-60': 'green'
    };

    // === Functions ===

    function generateAndAppendWords(numWords) {
        if (!window.defaultKataKata || window.defaultKataKata.length === 0) {
            console.error("Tidak dapat menghasilkan kata baru: window.defaultKataKata kosong atau tidak terdefinisi.");
            for (let i = 0; i < numWords; i++) {
                fullTextWords.push("placeholder");
            }
            return;
        }
        for (let i = 0; i < numWords; i++) {
            const randomIndex = Math.floor(Math.random() * window.defaultKataKata.length);
            fullTextWords.push(window.defaultKataKata[randomIndex]);
        }
    }

    function processTypedWord() {
        const currentWordTyped = hiddenTextInput.value;
        const targetWord = fullTextWords[typedWordIndex];

        userTypedWords[typedWordIndex] = currentWordTyped;

        if (!targetWord) {
            typedWordCorrectness[typedWordIndex] = false;
            totalIncorrectWords++;
            return;
        }

        let wordCorrectCharsTemp = 0;
        let wordIncorrectCharsTemp = 0;
        let isWordCorrect = true;

        for (let i = 0; i < Math.max(currentWordTyped.length, targetWord.length); i++) {
            if (i < currentWordTyped.length && i < targetWord.length) {
                if (currentWordTyped[i] === targetWord[i]) {
                    wordCorrectCharsTemp++;
                } else {
                    wordIncorrectCharsTemp++;
                    isWordCorrect = false;
                }
            } else if (i < currentWordTyped.length) {
                wordIncorrectCharsTemp++;
                isWordCorrect = false;
            } else {
                wordIncorrectCharsTemp++;
                isWordCorrect = false;
            }
        }

        if (currentWordTyped.length !== targetWord.length || wordIncorrectCharsTemp > 0) {
            isWordCorrect = false;
        }

        correctChars += wordCorrectCharsTemp;
        incorrectChars += wordIncorrectCharsTemp;

        typedWordCorrectness[typedWordIndex] = isWordCorrect;

        if (isWordCorrect) {
            totalCorrectWords++;
        } else {
            totalIncorrectWords++;
        }
    }

    function renderAndUpdateTextDisplay() {
        textDisplay.innerHTML = '';

        for (let lineOffset = 0; lineOffset < DISPLAY_LOGICAL_LINES_COUNT; lineOffset++) {
            const currentBlockLineIndex = currentLogicalLineOffset + lineOffset;
            const lineStartIndex = currentBlockLineIndex * WORDS_PER_LOGICAL_LINE;
            const lineEndIndex = Math.min(lineStartIndex + WORDS_PER_LOGICAL_LINE, fullTextWords.length);

            if (lineStartIndex >= fullTextWords.length) {
                break;
            }

            const lineContainer = document.createElement('div');
            lineContainer.classList.add('text-line');

            for (let i = lineStartIndex; i < lineEndIndex; i++) {
                const wordContainer = document.createElement('span');
                wordContainer.classList.add('word-container');
                wordContainer.id = `word-${i}`;

                // --- MODIFIKASI DIMULAI DI SINI ---
                // Saat render awal, kita hanya menampilkan teks target
                // Highlighting akan ditangani oleh updateWordHighlighting()
                const word = fullTextWords[i];
                word.split('').forEach((char) => {
                    const charSpan = document.createElement('span');
                    charSpan.textContent = char;
                    wordContainer.appendChild(charSpan);
                });

                if (i < fullTextWords.length - 1 && (i + 1) % WORDS_PER_LOGICAL_LINE !== 0) {
                    const spaceSpan = document.createElement('span');
                    spaceSpan.textContent = ' ';
                    spaceSpan.classList.add('space-char');
                    wordContainer.appendChild(spaceSpan);
                }
                // --- MODIFIKASI BERAKHIR DI SINI ---

                lineContainer.appendChild(wordContainer);
            }
            textDisplay.appendChild(lineContainer);
        }

        updateWordHighlighting(); // Panggil ini setelah semua elemen kata dibuat
        scrollToCurrentLine();
    }

    function scrollToCurrentLine() {
        const currentWordElement = document.getElementById(`word-${typedWordIndex}`);
        if (currentWordElement) {
            const currentLine = currentWordElement.closest('.text-line');
            if (currentLine) {
                const textDisplayRect = textDisplay.getBoundingClientRect();
                const currentLineRect = currentLine.getBoundingClientRect();

                if (currentLineRect.bottom > textDisplayRect.bottom || currentLineRect.top < textDisplayRect.top) {
                    textDisplay.scrollTo({
                        top: currentLine.offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }

    // ========================================================
    // --- FUNGSI UPDATEWORDHIGHLIGHTING YANG DIMODIFIKASI ---
    // ========================================================
    function updateWordHighlighting() {
        const allWordContainers = textDisplay.querySelectorAll('.word-container');
        allWordContainers.forEach(wc => {
            wc.classList.remove('current-word-target');
            const wordIndex = parseInt(wc.id.replace('word-', ''));
            if (wordIndex < typedWordIndex) {
                if (typedWordCorrectness[wordIndex]) {
                    wc.classList.add('word-correct');
                    wc.classList.remove('word-incorrect');
                } else {
                    wc.classList.add('word-incorrect');
                    wc.classList.remove('word-correct');
                }
            } else {
                wc.classList.remove('word-correct', 'word-incorrect');
            }
        });

        const currentWordElement = document.getElementById(`word-${typedWordIndex}`);
        if (currentWordElement) {
            currentWordElement.classList.add('current-word-target');
            currentWordElement.classList.remove('word-correct', 'word-incorrect');

            const targetWord = fullTextWords[typedWordIndex] || '';
            const currentWordTypedValue = hiddenTextInput.value;

            currentWordElement.innerHTML = '';

            for (let j = 0; j < targetWord.length; j++) {
                const charSpan = document.createElement('span');
                charSpan.textContent = targetWord[j];
                if (j < currentWordTypedValue.length) {
                    if (currentWordTypedValue[j] === targetWord[j]) {
                        charSpan.classList.add('correct');
                    } else {
                        charSpan.classList.add('wrong');
                    }
                }
                currentWordElement.appendChild(charSpan);
            }

            const startIndexForOvertyped = targetWord.length;
            const endIndexForOvertyped = Math.min(
                currentWordTypedValue.length,
                startIndexForOvertyped + MAX_OVERTYPED_CHARS_HIGHLIGHT
            );

            for (let j = startIndexForOvertyped; j < endIndexForOvertyped; j++) {
                const charSpan = document.createElement('span');
                charSpan.textContent = currentWordTypedValue[j];
                charSpan.classList.add('wrong');
                currentWordElement.appendChild(charSpan);
            }

            if ((typedWordIndex + 1) % WORDS_PER_LOGICAL_LINE !== 0 && typedWordIndex < fullTextWords.length - 1) {
                const spaceSpan = document.createElement('span');
                spaceSpan.textContent = ' ';
                spaceSpan.classList.add('space-char');
                if (currentWordTypedValue.length > targetWord.length) {
                    spaceSpan.classList.add('wrong');
                }
                currentWordElement.appendChild(spaceSpan);
            }
        }


        // --- Pembaruan untuk KATA-KATA YANG SUDAH SELESAI (sebelum typedWordIndex) ---
        // Kita juga perlu me-render ulang kata-kata yang sudah selesai jika ada perubahan state
        // Ini memastikan highlight akhir untuk kata yang sudah selesai (correct/incorrect)
        for (let i = 0; i < typedWordIndex; i++) {
            const wordElement = document.getElementById(`word-${i}`);
            if (wordElement) {
                const isWordCorrect = typedWordCorrectness[i];

                wordElement.classList.remove('current-word-target');
                if (isWordCorrect) {
                    wordElement.classList.add('word-correct');
                    wordElement.classList.remove('word-incorrect');
                } else {
                    wordElement.classList.add('word-incorrect');
                    wordElement.classList.remove('word-correct');
                }

                const targetWord = fullTextWords[i] || '';
                const userWord = userTypedWords[i] || '';

                wordElement.innerHTML = '';

                for (let j = 0; j < targetWord.length; j++) {
                    const charSpan = document.createElement('span');
                    charSpan.textContent = targetWord[j];
                    if (j < userWord.length) {
                        if (userWord[j] === targetWord[j]) {
                            charSpan.classList.add('correct');
                        } else {
                            charSpan.classList.add('wrong');
                        }
                    } else {
                        charSpan.classList.add('wrong');
                    }
                    wordElement.appendChild(charSpan);
                }

                const startIndexForOvertypedCompleted = targetWord.length;
                const endIndexForOvertypedCompleted = Math.min(
                    userWord.length,
                    startIndexForOvertypedCompleted + MAX_OVERTYPED_CHARS_HIGHLIGHT
                );

                for (let j = startIndexForOvertypedCompleted; j < endIndexForOvertypedCompleted; j++) {
                    const charSpan = document.createElement('span');
                    charSpan.textContent = userWord[j];
                    charSpan.classList.add('wrong');
                    wordElement.appendChild(charSpan);
                }

                if ((i + 1) % WORDS_PER_LOGICAL_LINE !== 0 && i < fullTextWords.length - 1) {
                    const spaceSpan = document.createElement('span');
                    spaceSpan.textContent = ' ';
                    spaceSpan.classList.add('space-char');
                    if (!isWordCorrect) {
                        spaceSpan.classList.add('wrong');
                    }
                    wordElement.appendChild(spaceSpan);
                }
            }
        }
    }
    // ========================================================

    function triggerShakeAnimation() {
        if (!textDisplay.classList.contains('error-shake')) {
            textDisplay.classList.add('error-shake');
            setTimeout(() => {
                textDisplay.classList.remove('error-shake');
            }, 200);
        }
    }

    function createSpeedometerTicks(container, minVal, maxVal, step, tickColors) {
        if (!container) {
            console.error("Container for speedometer ticks not found.");
            return;
        }
        container.innerHTML = '';

        const totalTicks = (maxVal - minVal) / step;
        const degreesPerTick = 240 / totalTicks;

        for (let i = 0; i <= totalTicks; i++) {
            const tick = document.createElement('div');
            tick.className = 'tick';

            const angle = (i * degreesPerTick) - 120;
            tick.style.transform = `rotate(${angle}deg) translateY(-${TICK_RADIAL_DISTANCE}px)`;

            const tickValue = minVal + (i * step);
            if (tickColors) {
                let colorClass = '';
                for (const range in tickColors) {
                    const [min, max] = range.split('-').map(Number);
                    if (tickValue >= min && tickValue <= max) {
                        colorClass = tickColors[range];
                        break;
                    }
                }
                if (colorClass) {
                    tick.classList.add(colorClass);
                }
            }
            container.appendChild(tick);
        }
    }

    function setWpmSpeedometer(wpm) {
        if (!wpmNeedle || !wpmValueText) return;
        wpm = Math.max(0, Math.min(wpmMax, wpm));
        const angle = (wpm / wpmMax) * 240 - 120;
        wpmNeedle.style.setProperty('--needle-angle', `${angle}deg`);
        wpmValueText.textContent = Math.round(wpm);
    }

    function setAccuracySpeedometer(accuracy) {
        if (!accuracyNeedle || !accuracyValueText) return;
        accuracy = Math.max(0, Math.min(accuracyMax, accuracy));
        const angle = (accuracy / accuracyMax) * 240 - 120;
        accuracyNeedle.style.setProperty('--needle-angle', `${angle}deg`);
        accuracyValueText.textContent = `${Math.round(accuracy)}%`;
    }

    function setTimerSpeedometer(timeLeftVal) {
        if (!timerNeedle || !timerValueText) return;
        timeLeftVal = Math.max(0, Math.min(timerMax, timeLeftVal));

        const MIN_ANGLE_TIMER = -120;
        const MAX_ANGLE_TIMER = 120;
        const percentageRemaining = timeLeftVal / timerMax;
        const angle = MIN_ANGLE_TIMER + (percentageRemaining * (MAX_ANGLE_TIMER - MIN_ANGLE_TIMER));

        timerNeedle.style.setProperty('--needle-angle', `${angle}deg`);
        timerValueText.textContent = Math.round(timeLeftVal);
    }

    function updateRealtimeStats() {
        if (!startTime) {
            setWpmSpeedometer(0);
            setAccuracySpeedometer(0);
            return;
        }

        const elapsedTime = (new Date().getTime() - startTime) / 1000;

        let totalCorrectCharsCalculated = correctChars;
        let totalIncorrectCharsCalculated = incorrectChars;

        const currentWordTypedValue = hiddenTextInput.value;
        const targetWordForTyping = fullTextWords[typedWordIndex];

        if (targetWordForTyping) {
            for (let i = 0; i < Math.min(currentWordTypedValue.length, targetWordForTyping.length); i++) {
                if (currentWordTypedValue[i] === targetWordForTyping[i]) {
                    totalCorrectCharsCalculated++;
                } else {
                    totalIncorrectCharsCalculated++;
                }
            }
            // Tambahkan karakter berlebih dari kata yang sedang diketik sebagai salah
            totalIncorrectCharsCalculated += Math.max(0, currentWordTypedValue.length - targetWordForTyping.length);
        } else {
            // Jika tidak ada targetWord, semua yang diketik salah
            totalIncorrectCharsCalculated += currentWordTypedValue.length;
        }

        const wpm = elapsedTime > 0 ? Math.round((totalCorrectCharsCalculated / 5) / (elapsedTime / 60)) : 0;
        setWpmSpeedometer(wpm);

        const totalTypedCharsForAccuracy = totalCorrectCharsCalculated + totalIncorrectCharsCalculated;
        const accuracy = totalTypedCharsForAccuracy > 0 ? Math.round((totalCorrectCharsCalculated / totalTypedCharsForAccuracy) * 100) : 0;
        setAccuracySpeedometer(accuracy);
    }

    function calculateAndDisplayFinalResults() {
        let finalCorrectChars = correctChars;
        let finalIncorrectChars = incorrectChars;

        const currentWordTypedValue = hiddenTextInput.value;
        const targetWord = fullTextWords[typedWordIndex];

        if (targetWord && currentWordTypedValue.length > 0) { // Pastikan currentWordTypedValue tidak kosong
            let currentWordCharCorrect = 0;
            let currentWordCharIncorrect = 0;

            for (let i = 0; i < Math.max(currentWordTypedValue.length, targetWord.length); i++) {
                if (i < currentWordTypedValue.length && i < targetWord.length) {
                    if (currentWordTypedValue[i] === targetWord[i]) {
                        currentWordCharCorrect++;
                    } else {
                        currentWordCharIncorrect++;
                    }
                } else if (i < currentWordTypedValue.length) {
                    currentWordCharIncorrect++;
                } else if (i < targetWord.length) {
                    currentWordCharIncorrect++;
                }
            }
            finalCorrectChars += currentWordCharCorrect;
            finalIncorrectChars += currentWordCharIncorrect;
        }

        const finalTimeTaken = TIMED_TEST_DURATION;
        const finalWPM = finalTimeTaken > 0 ? Math.round((finalCorrectChars / 5) / (finalTimeTaken / 60)) : 0;
        const totalActualTypedChars = finalCorrectChars + finalIncorrectChars;
        const finalAccuracy = totalActualTypedChars > 0 ? Math.round((finalCorrectChars / totalActualTypedChars) * 100) : 0;

        // ========================================================

        // Perbarui textContent dari elemen-elemen hasil di dalam resultsDisplayArea
        if (finalWPMText) finalWPMText.textContent = Math.max(0, finalWPM);
        if (finalAccuracyText) finalAccuracyText.textContent = Math.max(0, Math.min(100, finalAccuracy)) + '%';
        if (finalTimeText) finalTimeText.textContent = `${finalTimeTaken.toFixed(1)} detik`;
        if (finalErrorsText) finalErrorsText.textContent = finalIncorrectChars;
        if (finalTotalWordsText) finalTotalWordsText.textContent = totalCorrectWords + totalIncorrectWords;
        if (finalCorrectWordsText) finalCorrectWordsText.textContent = totalCorrectWords;
        if (finalIncorrectWordsText) finalIncorrectWordsText.textContent = totalIncorrectWords;

        // ========================================================

        setWpmSpeedometer(finalWPM);
        setAccuracySpeedometer(finalAccuracy);

        // MODIFIKASI: Tampilkan area hasil setelah perhitungan selesai
        if (resultsDisplayArea) {
            resultsDisplayArea.style.display = 'block'; // Atau 'flex'/'grid' tergantung tata letak Anda
        }

        // Prepare replay data with complete keystroke details including timeElapsed
        // Calculate running correct/incorrect chars for each keystroke
        const keystrokeDetails = [];
        let runningCorrectChars = 0;
        let runningIncorrectChars = 0;
        
        // We need to track character correctness per keystroke
        // Reconstruct from keystrokeLog and userTypedWords
        keystrokeLog.forEach((timestamp, index) => {
            const elapsedMs = timestamp - startTime;
            const elapsedSeconds = elapsedMs / 1000;
            const elapsedMinutes = elapsedMs / 60000;
            
            // Calculate correct chars at this point - we need to estimate based on time
            // Since we don't have per-keystroke correctness in default mode,
            // we'll use an approximation based on final stats
            const progressRatio = (index + 1) / keystrokeLog.length;
            const estimatedCorrectChars = Math.round(correctChars * progressRatio);
            const estimatedIncorrectChars = Math.round(incorrectChars * progressRatio);
            const totalChars = estimatedCorrectChars + estimatedIncorrectChars;
            
            keystrokeDetails.push({
                timestamp: elapsedMs,
                index: index,
                wpm: elapsedMinutes > 0 ? Math.round((estimatedCorrectChars / 5) / elapsedMinutes) : 0,
                accuracy: totalChars > 0 ? Math.round((estimatedCorrectChars / totalChars) * 100) : 100,
                timeElapsed: Math.round(elapsedSeconds)
            });
        });
        
        const replayData = {
            text: fullTextWords.join(' '),
            keystrokes: keystrokeDetails
        };

        if (typeof window.saveScore === 'function') {
            window.saveScore(
                finalWPM,
                finalAccuracy,
                finalTimeTaken,
                finalIncorrectChars,
                "Tes Kata Umum (Acak)",
                'default',
                totalCorrectWords,
                totalIncorrectWords,
                replayData
            );
        }
    }

    function endTest() {
        clearInterval(timerInterval);
        clearInterval(updateStatsInterval);
        hiddenTextInput.disabled = true;
        calculateAndDisplayFinalResults();
        setTimerSpeedometer(0);
    }

    function resetTestState() {
        clearInterval(timerInterval);
        clearInterval(updateStatsInterval);
        typedWordIndex = 0;
        correctChars = 0;
        incorrectChars = 0;
        startTime = null;
        timeRemaining = TIMED_TEST_DURATION;
        
        // Reset keystroke log
        keystrokeLog = [];

        totalCorrectWords = 0;
        totalIncorrectWords = 0;
        typedWordCorrectness = [];
        userTypedWords = [];
        currentLogicalLineOffset = 0;

        if (accuracySpan) accuracySpan.textContent = '0%';
        if (timerSpan) timerSpan.textContent = TIMED_TEST_DURATION;

        hiddenTextInput.value = '';
        hiddenTextInput.disabled = false;
        hiddenTextInput.focus();
        fullTextWords = [];
        textDisplay.innerHTML = '';
        textDisplay.scrollTop = 0;
        textDisplay.classList.remove('error-shake');

        setWpmSpeedometer(0);
        setAccuracySpeedometer(0);
        setTimerSpeedometer(timerMax);

        // MODIFIKASI: Sembunyikan area hasil
        if (resultsDisplayArea) {
            resultsDisplayArea.style.display = 'none'; // Sembunyikan area hasil
        }

        // ========================================================
        // MODIFIKASI: Reset konten area hasil dan sembunyikan tombol
        if (finalWPMText) finalWPMText.textContent = '--';
        if (finalAccuracyText) finalAccuracyText.textContent = '--%';
        if (finalTimeText) finalTimeText.textContent = `-- detik`;
        if (finalErrorsText) finalErrorsText.textContent = '--';
        if (finalTotalWordsText) finalTotalWordsText.textContent = '--';
        if (finalCorrectWordsText) finalCorrectWordsText.textContent = '--';
        if (finalIncorrectWordsText) finalIncorrectWordsText.textContent = '--';

        generateAndAppendWords(INITIAL_WORD_BUFFER);
        renderAndUpdateTextDisplay();
        hiddenTextInput.focus(); // Gunakan hiddenTextInput
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeRemaining--;
            setTimerSpeedometer(timeRemaining);

            if (timeRemaining <= 0) {
                endTest();
            }
        }, 1000);

        updateStatsInterval = setInterval(() => {
            updateRealtimeStats();
        }, 100);
    }

    window.resetTest = function() {
        resetTestState();
    };

    function handleKeydown(e) {
        if (timeRemaining <= 0) {
            e.preventDefault();
            return;
        }

        // Jangan izinkan spasi jika input kosong dan ini kata pertama
        if (e.key === ' ' && hiddenTextInput.value.length === 0 && typedWordIndex === 0) {
            e.preventDefault();
            return;
        }

        // Mulai timer pada karakter pertama yang valid (bukan spasi/backspace/tombol kontrol)
        if (!startTime && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== 'Backspace' && e.key !== ' ') {
            startTime = new Date().getTime();
            startTimer();
        }
        
        // Log keystroke for replay
        if (startTime && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            keystrokeLog.push(Date.now());
        }

        const targetWord = fullTextWords[typedWordIndex] || '';
        const currentTypedLength = hiddenTextInput.value.length;

        // Logika untuk membatasi karakter berlebih
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== 'Backspace' && e.key !== ' ') {
            // Jika panjang teks yang diketik saat ini sudah lebih dari atau sama dengan panjang target
            // DAN jumlah karakter berlebih (currentTypedLength - targetWord.length) sudah mencapai batas
            if (currentTypedLength >= targetWord.length &&
                (currentTypedLength - targetWord.length) >= MAX_OVERTYPED_CHARS_HIGHLIGHT) {
                e.preventDefault(); // Hentikan input karakter
                triggerShakeAnimation(); // Beri umpan balik visual
                return; // Keluar dari fungsi, tidak perlu memproses event ini lebih lanjut
            }
        }

        // --- Logika untuk event keydown lainnya (spasi, backspace, karakter normal) ---
        if (e.key === ' ') {
            e.preventDefault();

            // Hanya proses kata jika ada sesuatu yang diketik atau ini bukan Kata pertama
            if (hiddenTextInput.value.length > 0 || typedWordIndex > 0) {
                processTypedWord();
            }

            typedWordIndex++;
            userTypedWords[typedWordIndex] = ""; // Penting: Set kata yang diketik pengguna untuk kata berikutnya menjadi kosong
            hiddenTextInput.value = '';

            // Periksa apakah perlu menggulir atau menambahkan kata baru
            if (typedWordIndex > 0 && typedWordIndex % WORDS_PER_LOGICAL_LINE === 0) {
                currentLogicalLineOffset++;
                renderAndUpdateTextDisplay(); // Ini akan memanggil updateWordHighlighting()
                if (fullTextWords.length - typedWordIndex < WORDS_PER_LOGICAL_LINE * DISPLAY_LOGICAL_LINES_COUNT * 2) {
                    generateAndAppendWords(WORDS_TO_GENERATE_ON_REFILL);
                }
            } else {
                updateWordHighlighting(); // Cukup update highlighting untuk kata saat ini dan sebelumnya
            }
            updateRealtimeStats();
            scrollToCurrentLine();

        } else if (e.key === 'Backspace') {
            // Biarkan Backspace berfungsi secara default.
            // Setelah Backspace diproses, update highlighting.
            // Gunakan setTimeout 0 untuk memastikan DOM diperbarui terlebih dahulu.
            setTimeout(() => {
                // userTypedWords[typedWordIndex] tidak perlu dimodifikasi di sini karena itu akan disinkronkan oleh event 'input'
                // atau ketika spasi ditekan.
                updateWordHighlighting();
                updateRealtimeStats();
                scrollToCurrentLine();
            }, 0);

        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            // Untuk karakter normal lainnya, update setelah browser memprosesnya.
            // Ini akan memastikan hiddenTextInput.value sudah diperbarui.
            setTimeout(() => {
                userTypedWords[typedWordIndex] = hiddenTextInput.value; // Simpan nilai terbaru setelah input
                updateWordHighlighting();
                updateRealtimeStats();
                scrollToCurrentLine();
            }, 0);
        }
    }

    // --- Initial Setup ---
    createSpeedometerTicks(wpmTicksContainer, 0, wpmMax, 10, wpmTickColors);
    createSpeedometerTicks(accuracyTicksContainer, 0, accuracyMax, 10, accuracyTickColors);
    createSpeedometerTicks(timerTicksContainer, 0, timerMax, 5, timerTickColors);

    if (restartButton) {
        restartButton.addEventListener('click', window.resetTest);
    }

    // Event listener 'input' juga penting untuk visual highlighting karena menangani paste, drag-and-drop, dll.
    hiddenTextInput.addEventListener('input', updateWordHighlighting);
    hiddenTextInput.addEventListener('keydown', handleKeydown);

    resetTestState(); // Panggil ini untuk inisialisasi awal
});
