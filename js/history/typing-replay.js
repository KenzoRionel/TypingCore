// js/history/typing-replay.js
// Modul untuk menangani fitur replay mengetik

let replayState = {
    isPlaying: false,
    currentIndex: 0,
    replayData: null,
    text: '',
    intervalId: null,
    timerIntervalId: null,
    container: null,
    playButton: null,
    scoreId: null,
    lastTimestamp: 0,
    renderToken: 0,
    startTime: 0,
    totalDuration: 0
};


// Flag to prevent multiple initialization
let isInitialized = false;

// Flag to prevent duplicate event listeners
let eventListenersAdded = false;



function clearReplayDOM() {
    const dups = document.querySelectorAll('#replay-container');
    if (dups.length > 1) console.warn(`[REPLAY] Ditemukan ${dups.length} container duplikat! Menghapus...`);
    dups.forEach(el => el.remove());
}

export function initReplayContainer() {
    console.log('[REPLAY] initReplayContainer dipanggil');
    
    // Prevent multiple initialization
    if (isInitialized) {
        console.log('[REPLAY] Already initialized, skipping.');
        return;
    }
    
    let existingContainer = document.getElementById('replay-container');
    if (existingContainer) {
        console.log('[REPLAY] Container sudah ada, skipping creation.');
        replayState.container = existingContainer;
        replayState.playButton = document.getElementById('replay-play-btn');
        isInitialized = true;
        return;
    }

    clearReplayDOM();


    const DOM = getHistoryDOMReferences();
    if (!DOM || (!DOM.scoreHistoryList && !document.querySelectorAll('.chart-container').length)) {
        console.error('[REPLAY] DOM Reference tidak ditemukan, gagal init.');
        return;
    }

    const replayContainer = document.createElement('div');
    replayContainer.id = 'replay-container';
    replayContainer.className = 'replay-container';
    replayContainer.innerHTML = `
        <div class="replay-header">
            <h3>Tonton Replay Mengetik</h3>
            <div class="replay-controls">
                <button id="replay-play-btn" class="replay-btn" title="Play/Pause">
                    <i class="fas fa-play"></i>
                </button>
                <button id="replay-reset-btn" class="replay-btn" title="Reset">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        </div>
        <div class="replay-stats">
            <div class="replay-stat-item">
                <span class="replay-stat-label">WPM</span>
                <span id="replay-wpm" class="replay-stat-value">0</span>
            </div>
            <div class="replay-stat-item">
                <span class="replay-stat-label">Akurasi</span>
                <span id="replay-accuracy" class="replay-stat-value">0%</span>
            </div>
            <div class="replay-stat-item">
                <span class="replay-stat-label">Waktu</span>
                <span id="replay-time" class="replay-stat-value">0s</span>
            </div>
        </div>
        <div class="replay-info">
            <span id="replay-score-info">Pilih skor untuk melihat replay</span>
        </div>
        <div id="replay-text-display" class="replay-text-display"></div>
        <div class="replay-progress">
            <div id="replay-progress-bar" class="replay-progress-bar"></div>
        </div>
    `;
    
    const chartContainers = document.querySelectorAll('.chart-container');
    if (chartContainers.length > 0) {
        chartContainers[chartContainers.length - 1].after(replayContainer);
    } else if (DOM.scoreHistoryList) {
        DOM.scoreHistoryList.before(replayContainer);
    }

    replayState.container = replayContainer;
    replayState.playButton = document.getElementById('replay-play-btn');
    
    // Only add event listeners once
    if (!eventListenersAdded) {
        const playBtn = document.getElementById('replay-play-btn');
        const resetBtn = document.getElementById('replay-reset-btn');
        if (playBtn) playBtn.addEventListener('click', toggleReplay);
        if (resetBtn) resetBtn.addEventListener('click', resetReplay);
        eventListenersAdded = true;
    }
    
    // Mark as initialized
    isInitialized = true;
    
    console.log('[REPLAY] Container berhasil dibuat dan event listener dipasang.');

}


function getHistoryDOMReferences() {
    return { scoreHistoryList: document.getElementById('scoreHistoryList') };
}

export function loadReplay(scoreId) {
    console.log(`[REPLAY] Memuat skor ID: ${scoreId}`);
    const scores = JSON.parse(localStorage.getItem('typingScores') || '[]');
    const score = scores[scoreId];
    
    if (!score || !score.replayData) {
        console.error('[REPLAY] Data replay tidak ditemukan di localStorage.');
        showNoReplayMessage('Replay tidak tersedia.');
        return;
    }

    stopReplay();

    // Gunakan data replay asli tanpa filter duplikat yang bermasalah
    const rawKeystrokes = score.replayData.keystrokes || [];
    
    console.log(`[REPLAY] Data keystrokes: ${rawKeystrokes.length}`);
    
    // Update replayData dengan data asli
    replayState.scoreId = scoreId;
    replayState.replayData = {
        ...score.replayData,
        keystrokes: rawKeystrokes
    };
    replayState.currentIndex = 0;
    
    updateReplayInfo(score);
    renderReplayText(); 
    updateProgressBar();
    updateLiveStats();
    
    if (replayState.playButton) replayState.playButton.disabled = false;
}


function renderReplayText() {
    const textDisplay = document.getElementById('replay-text-display');
    if (!textDisplay || !replayState.replayData) return;
    
    const targetText = replayState.replayData.targetText || "";
    const keystrokes = replayState.replayData.keystrokes || [];

    let currentInput = "";
    if (replayState.currentIndex > 0) {
        const idx = Math.min(replayState.currentIndex - 1, keystrokes.length - 1);
        currentInput = keystrokes[idx]?.inputState || "";
    }

    console.log(`[RENDER] Index: ${replayState.currentIndex}, Input: "${currentInput}"`);
    renderReplayCore(textDisplay, targetText, currentInput);
}

function renderReplayCore(container, targetText, currentInput) {
    // MENGHAPUS SEMUA CHILD SECARA TOTAL
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    const fragment = document.createDocumentFragment();
    const wordsWrapper = document.createElement('div');
    wordsWrapper.className = 'replay-words-container';

    const targetWords = targetText.split(' ');
    const currentWords = currentInput.split(' ');
    const currentWordIdx = Math.max(0, currentWords.length - 1);

    targetWords.forEach((targetWord, wordIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'replay-word';

        const typedWord = currentWords[wordIdx] || "";
        const isWordStarted = wordIdx < currentWords.length;
        const isCurrentWord = (wordIdx === currentWordIdx);

        if (!isWordStarted) {
            appendChars(wordSpan, targetWord, 'untyped');
        } else {
            const typedChars = typedWord.split('');
            typedChars.forEach((char, i) => {
                const charSpan = document.createElement('span');
                charSpan.className = 'replay-char';
                if (i < targetWord.length) {
                    charSpan.classList.add(char === targetWord[i] ? 'correct' : 'wrong');
                } else {
                    charSpan.classList.add('wrong', 'wrong-extra');
                }
                charSpan.textContent = char;
                wordSpan.appendChild(charSpan);
            });

            const remaining = targetWord.slice(typedChars.length);
            appendChars(wordSpan, remaining, 'untyped');

            if (isCurrentWord) {
                wordSpan.classList.add('active-word');
                const cursorTarget = wordSpan.children[typedChars.length] || wordSpan.lastElementChild;
                if (cursorTarget) cursorTarget.classList.add('cursor');
            }
        }
        wordsWrapper.appendChild(wordSpan);

        if (wordIdx < targetWords.length - 1) {
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'replay-char space-char';
            spaceSpan.classList.add(wordIdx < currentWordIdx ? 'correct' : 'untyped');
            spaceSpan.textContent = ' ';
            wordsWrapper.appendChild(spaceSpan);
        }
    });

    fragment.appendChild(wordsWrapper);
    container.appendChild(fragment);
}

function appendChars(parent, text, className) {
    for (const char of text) {
        const span = document.createElement('span');
        span.className = `replay-char ${className}`;
        span.textContent = char;
        parent.appendChild(span);
    }
}

function playReplay() {
    if (!replayState.replayData?.keystrokes) return;
    
    pauseReplay(); 
    
    const currentToken = ++replayState.renderToken;
    const keystrokes = replayState.replayData.keystrokes;
    
    console.log(`[PLAY] Memulai sesi replay baru. Token: ${currentToken}`);
    
    if (replayState.currentIndex >= keystrokes.length) {
        replayState.currentIndex = 0;
    }
    
    // Get total duration from first keystroke's timeElapsed (countdown start value)
    const firstKeystroke = keystrokes[0];
    replayState.totalDuration = firstKeystroke?.timeElapsed || 60;
    
    replayState.isPlaying = true;
    replayState.startTime = Date.now();
    updatePlayButton();
    
    // Start continuous timer for smooth time display
    startContinuousTimer();

    
    const run = () => {
        if (currentToken !== replayState.renderToken) {
            console.log(`[PLAY] Token ${currentToken} sudah tidak valid. Memberhentikan rekursi.`);
            return;
        }

        if (!replayState.isPlaying || replayState.currentIndex >= keystrokes.length) {
            if (replayState.currentIndex >= keystrokes.length) stopReplay();
            return;
        }

        const current = keystrokes[replayState.currentIndex];
        replayState.currentIndex++;
        
        renderReplayText();
        updateProgressBar();
        updateLiveStats();

        const next = keystrokes[replayState.currentIndex];
        if (next) {
            const delay = Math.max(10, Math.min(1500, next.timestamp - current.timestamp));
            replayState.intervalId = setTimeout(run, delay);
        } else {
            stopReplay();
        }
    };
    run();
}

function pauseReplay() {
    replayState.isPlaying = false;
    updatePlayButton();
    if (replayState.intervalId) {
        clearTimeout(replayState.intervalId);
        replayState.intervalId = null;
    }
    // Stop continuous timer
    if (replayState.timerIntervalId) {
        clearInterval(replayState.timerIntervalId);
        replayState.timerIntervalId = null;
    }
}


function stopReplay() {
    console.log('[REPLAY] Replay dihentikan/reset.');
    pauseReplay();
    replayState.renderToken++; 
    replayState.currentIndex = 0;
    replayState.startTime = 0;
    // Reset time display to total duration
    const time = document.getElementById('replay-time');
    if (time && replayState.totalDuration) {
        time.textContent = replayState.totalDuration + 's';
    }
    renderReplayText();
}

function startContinuousTimer() {
    // Clear any existing timer
    if (replayState.timerIntervalId) {
        clearInterval(replayState.timerIntervalId);
    }
    
    // Update time display every 100ms for smooth countdown
    replayState.timerIntervalId = setInterval(() => {
        if (!replayState.isPlaying) return;
        
        const elapsedMs = Date.now() - replayState.startTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        
        // Calculate remaining time (countdown)
        const remainingTime = Math.max(0, replayState.totalDuration - elapsedSeconds);
        
        // Update time display
        const time = document.getElementById('replay-time');
        if (time) {
            time.textContent = remainingTime + 's';
        }
    }, 100);
}


function resetReplay() { stopReplay(); }

function toggleReplay() {
    if (!replayState.replayData) return;
    replayState.isPlaying ? pauseReplay() : playReplay();
}

function updatePlayButton() {
    const btn = document.getElementById('replay-play-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon) icon.className = replayState.isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

function updateProgressBar() {
    const progressBar = document.getElementById('replay-progress-bar');
    if (!progressBar || !replayState.replayData?.keystrokes) return;
    const total = replayState.replayData.keystrokes.length;
    const progress = total > 0 ? (replayState.currentIndex / total) * 100 : 0;
    progressBar.style.width = `${progress}%`;
}

function updateLiveStats() {
    if (!replayState.replayData?.keystrokes) return;
    const keystrokes = replayState.replayData.keystrokes;
    const data = keystrokes[Math.max(0, replayState.currentIndex - 1)];
    if (data) {
        const wpm = document.getElementById('replay-wpm');
        const acc = document.getElementById('replay-accuracy');
        
        // Display WPM with real-time value from keystroke data
        if (wpm) wpm.textContent = data.wpm || 0;
        
        // Display accuracy percentage
        if (acc) acc.textContent = (data.accuracy || 0) + '%';
        
        // Note: Time is now updated continuously by startContinuousTimer()
        // This ensures smooth countdown display independent of keystroke timing
    }
}



function showNoReplayMessage(message) {
    const textDisplay = document.getElementById('replay-text-display');
    if (textDisplay) textDisplay.innerHTML = `<p class="no-replay">${message}</p>`;
}

function updateReplayInfo(score) {
    const info = document.getElementById('replay-score-info');
    if (info) {
        const date = new Date(score.date).toLocaleString('id-ID', {
            year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        info.textContent = `WPM: ${score.wpm} | Akurasi: ${score.accuracy}% | ${date}`;
    }
}

window.loadReplay = loadReplay;
window.initReplayContainer = initReplayContainer;

// Auto-initialization with guard to prevent multiple calls
function setupAutoInitialization() {
    if (isInitialized) return;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReplayContainer, { once: true });
    } else {
        initReplayContainer();
    }
}

setupAutoInitialization();
