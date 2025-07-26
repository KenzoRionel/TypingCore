document.addEventListener('DOMContentLoaded', () => {
    // --- Elemen DOM Spesifik untuk Custom Mode ---
    const textDisplay = document.getElementById('textDisplay');
    // const textInput is not used directly for input, but might be referenced for properties
    const wpmSpan = document.getElementById('wpm');
    const accuracySpan = document.getElementById('accuracy');
    const timerSpan = document.getElementById('timer');
    const restartButton = document.getElementById('restartButton');
    const scoreHistoryList = document.getElementById('scoreHistoryList');

    // --- Variabel State Test ---
    let currentText = '';
    let kalimatLatihan = []; // Array of characters
    let karakterIndeksSaatIni = 0; // Current character position
    let typedCharacters = []; // Array to store typed characters for correctness check
    let totalKarakterTarget = 0;
    let totalKarakterBenar = 0;
    let totalKesalahanKarakter = 0;
    let startTime;
    let timerInterval;
    let updateStatsInterval;

    let timeElapsed = 0; // Timer runs forward for custom mode

    // --- Fungsi Utama Tes Mengetik ---
    function loadText() {
        resetTestState(); // Always reset state when loading new text

        if (window.customTexts.length === 0) {
            textDisplay.innerHTML = '<span>Tidak ada teks buatan Anda. Silakan tambahkan di halaman "Tambah Teks Latihan".</span>';
            restartButton.disabled = true;
            return;
        }

        const randomIndex = Math.floor(Math.random() * window.customTexts.length);
        currentText = window.customTexts[randomIndex].content;
        if (!currentText) { // Fallback
            currentText = 'Tidak ada teks kustom.';
        }
        currentText = currentText.trim(); // Clean up text
        kalimatLatihan = currentText.split(''); // Split into characters

        totalKarakterTarget = currentText.length;

        updateTextDisplay();
        timerSpan.textContent = '0.0';
    }

    function updateTextDisplay() {
        textDisplay.innerHTML = '';
        for (let i = 0; i < kalimatLatihan.length; i++) {
            const char = kalimatLatihan[i];
            let charSpan = document.createElement('span');
            charSpan.textContent = char;

            if (i < karakterIndeksSaatIni) {
                // Character has been typed. Check if it was correct.
                if (typedCharacters[i] === char) {
                    charSpan.classList.add('correct');
                } else {
                    charSpan.classList.add('wrong');
                }
            } else if (i === karakterIndeksSaatIni) {
                // This is the current character to be typed
                charSpan.classList.add('current');
            }
            textDisplay.appendChild(charSpan);
        }

        // Scroll to current character
        const currentCharElement = textDisplay.querySelector('.current');
        if (currentCharElement) {
            currentCharElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function resetTestState() {
        clearInterval(timerInterval);
        clearInterval(updateStatsInterval);
        karakterIndeksSaatIni = 0;
        typedCharacters = [];
        totalKarakterTarget = 0;
        totalKarakterBenar = 0;
        totalKesalahanKarakter = 0;
        startTime = null;
        timeElapsed = 0;

        wpmSpan.textContent = 0;
        accuracySpan.textContent = 0;
        timerSpan.textContent = '0.0';
        restartButton.disabled = false; // Enable restart button
        textDisplay.innerHTML = '';
    }

    // Expose resetTest to global scope for common-script.js modal
    window.resetTest = function() {
        loadText();
    };

    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeElapsed += 0.1;
            timerSpan.textContent = timeElapsed.toFixed(1);
        }, 100);
    }

    function updateRealtimeStats() {
        if (!startTime || timeElapsed <= 0) {
            wpmSpan.textContent = 0;
            accuracySpan.textContent = 0;
            return;
        }

        const netWPM = (totalKarakterBenar / 5) / (timeElapsed / 60);
        const totalAttemptedChars = totalKarakterBenar + totalKesalahanKarakter;
        const accuracy = totalAttemptedChars > 0 ?
            (totalKarakterBenar / totalAttemptedChars) * 100 : 0;

        wpmSpan.textContent = Math.round(Math.max(0, netWPM));
        accuracySpan.textContent = Math.round(Math.max(0, Math.min(100, accuracy)));
    }

    // This function handles key presses directly for custom mode
    function handleKeyPress(key) {
        // Only allow typing if the test is active (not finished)
        if (karakterIndeksSaatIni < currentText.length) {
            const targetCharForStrictMode = currentText[karakterIndeksSaatIni];

            if (!startTime) {
                startTime = new Date().getTime();
                startTimer();
                clearInterval(updateStatsInterval);
                updateStatsInterval = setInterval(updateRealtimeStats, 200);
            }

            if (key === targetCharForStrictMode) {
                typedCharacters.push(key);
                totalKarakterBenar++;
                karakterIndeksSaatIni++;
            } else { // If a character was typed but it's wrong
                totalKesalahanKarakter++;
                textDisplay.classList.add('error-shake'); // Apply shake effect to text display
                setTimeout(() => textDisplay.classList.remove('error-shake'), 200);
            }
        }

        updateTextDisplay();
        updateRealtimeStats();

        // Check if all characters have been typed
        if (karakterIndeksSaatIni >= currentText.length) {
            clearInterval(timerInterval);
            clearInterval(updateStatsInterval);
            calculateResults();
        }
    }

    function calculateResults() {
        // Time is already tracked as timeElapsed for custom mode
        const finalTime = timeElapsed;
        const timeInMinutes = finalTime / 60;

        const netWPM = (totalKarakterBenar / 5) / timeInMinutes;

        const totalAttemptedChars = totalKarakterBenar + totalKesalahanKarakter;
        const accuracy = totalAttemptedChars > 0 ?
            (totalKarakterBenar / totalAttemptedChars) * 100 : 0;

        window.modalWPM.textContent = Math.round(Math.max(0, netWPM));
        window.modalAccuracy.textContent = Math.round(Math.max(0, Math.min(100, accuracy))) + '%';
        window.modalTotalWords.textContent = Math.round(totalKarakterTarget / 5);
        window.modalErrors.textContent = totalKesalahanKarakter;
        window.modalTime.textContent = finalTime.toFixed(1) + ' detik';
        window.resultModal.classList.add('show');

        window.saveScore(Math.round(Math.max(0, netWPM)), Math.round(Math.max(0, Math.min(100, accuracy))), finalTime, totalKesalahanKarakter, currentText, 'custom');
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', (e) => {
        // Prevent backspace in custom mode
        if (e.key === 'Backspace') {
            e.preventDefault();
            return; 
        }
        // Handle only character keys and space
        if (e.key.length === 1 || e.key === ' ') {
            e.preventDefault(); // Prevent default browser behavior
            handleKeyPress(e.key);
        }
    });
    
    restartButton.addEventListener('click', loadText);

    // Initial load
    loadText();
    window.updateScoreHistoryList(scoreHistoryList); // Update mini list on load
});