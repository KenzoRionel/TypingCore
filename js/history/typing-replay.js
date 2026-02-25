// js/history/typing-replay.js
// Modul untuk menangani fitur replay mengetik dengan sinkronisasi waktu presisi

let replayState = {
    isPlaying: false,
    currentIndex: 0,
    replayData: null,
    text: '',
    intervalId: null,
    container: null,
    playButton: null,
    scoreId: null,
    renderToken: 0,
    totalDuration: 60,
    lastRenderTime: 0,
    renderInterval: 16, // ~60fps for smoother animation
    firstTimestamp: 0 // Timestamp pertama untuk sinkronisasi waktu
};


let pendingRender = false;
let rafId = null;



let isInitialized = false;
let eventListenersAdded = false;

function clearReplayDOM() {
    const dups = document.querySelectorAll('#replay-container');
    dups.forEach(el => el.remove());
}

export function initReplayContainer() {
    if (isInitialized) return;

    let existingContainer = document.getElementById('replay-container');
    if (existingContainer) {
        replayState.container = existingContainer;
        replayState.playButton = document.getElementById('replay-play-btn');
        isInitialized = true;
        return;
    }

    clearReplayDOM();

    const DOM = { scoreHistoryList: document.getElementById('scoreHistoryList') };
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

    if (!eventListenersAdded) {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#replay-play-btn')) toggleReplay();
            if (e.target.closest('#replay-reset-btn')) resetReplay();
        });
        eventListenersAdded = true;
    }

    isInitialized = true;
}

export function loadReplay(scoreId) {
    const scores = JSON.parse(localStorage.getItem('typingScores') || '[]');
    const score = scores[scoreId];

    if (!score || !score.replayData) {
        showNoReplayMessage('Replay tidak tersedia.');
        return;
    }

    stopReplay();

    replayState.scoreId = scoreId;
    replayState.replayData = score.replayData;
    replayState.currentIndex = 0;
    // Gunakan durasi asli dari score, default ke 60
    replayState.totalDuration = score.duration || 60;

    updateReplayInfo(score);
    renderReplayText();
    updateProgressBar();
    updateLiveStats();

    if (replayState.playButton) replayState.playButton.disabled = false;
}

function playReplay() {
    if (!replayState.replayData?.keystrokes.length) return;

    pauseReplay();
    const currentToken = ++replayState.renderToken;
    const keystrokes = replayState.replayData.keystrokes;

    if (replayState.currentIndex >= keystrokes.length) {
        replayState.currentIndex = 0;
    }

    replayState.isPlaying = true;
    updatePlayButton();
    replayState.lastRenderTime = 0;
    
    // Simpan timestamp pertama untuk perhitungan waktu relatif
    replayState.firstTimestamp = keystrokes[0]?.timestamp || 0;
    console.log('[Replay] Starting replay with', keystrokes.length, 'keystrokes');

    console.log('[Replay] First keystroke timestamp:', keystrokes[0]?.timestamp);
    console.log('[Replay] Last keystroke timestamp:', keystrokes[keystrokes.length - 1]?.timestamp);

    const run = () => {
        if (currentToken !== replayState.renderToken || !replayState.isPlaying) return;

        if (replayState.currentIndex >= keystrokes.length) {
            console.log('[Replay] Reached end of keystrokes');
            // Selesai replay - jangan reset, biarkan user melihat hasil akhir
            replayState.isPlaying = false;
            updatePlayButton();
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            if (replayState.intervalId) {
                clearTimeout(replayState.intervalId);
                replayState.intervalId = null;
            }
            return;
        }



        const current = keystrokes[replayState.currentIndex];
        
        // Render UI dengan requestAnimationFrame untuk smoothness maksimal
        scheduleRender();

        replayState.currentIndex++;
        const next = keystrokes[replayState.currentIndex];

        if (next) {
            // Selisih waktu asli antar tekanan tombol
            const rawDelay = next.timestamp - current.timestamp;
            // Cap delay maksimum 2 detik untuk menghindari jeda terlalu lama
            const delay = Math.min(Math.max(0, rawDelay), 2000);
            
            if (rawDelay > 2000) {
                console.log('[Replay] Large delay detected:', rawDelay, 'ms, capped to 2000ms');
            }
            if (rawDelay < 0) {
                console.log('[Replay] Negative delay detected:', rawDelay, 'ms, set to 0');
            }
            
            replayState.intervalId = setTimeout(run, delay);
        } else {
            console.log('[Replay] No more keystrokes, finished - keeping final state visible');
            // Selesai replay - jangan reset, biarkan user melihat hasil akhir
            replayState.isPlaying = false;
            updatePlayButton();
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            if (replayState.intervalId) {
                clearTimeout(replayState.intervalId);
                replayState.intervalId = null;
            }
        }

    };
    run();
}

// Schedule render menggunakan requestAnimationFrame untuk smoothness
function scheduleRender() {
    // Selalu update stats (ringan) setiap keystroke
    updateLiveStats();
    updateProgressBar();
    
    // Cancel pending RAF jika ada
    if (rafId) {
        cancelAnimationFrame(rafId);
    }
    
    const now = performance.now();
    const timeSinceLastRender = now - replayState.lastRenderTime;
    
    if (timeSinceLastRender >= replayState.renderInterval) {
        // Render langsung dengan RAF untuk sync dengan refresh rate monitor
        rafId = requestAnimationFrame(() => {
            renderReplayText();
            replayState.lastRenderTime = performance.now();
        });
    } else {
        // Delay render untuk mencapai target frame rate
        const waitTime = replayState.renderInterval - timeSinceLastRender;
        setTimeout(() => {
            if (replayState.isPlaying) {
                rafId = requestAnimationFrame(() => {
                    renderReplayText();
                    replayState.lastRenderTime = performance.now();
                });
            }
        }, waitTime);
    }
}




function updateLiveStats() {
    const keystrokes = replayState.replayData?.keystrokes || [];
    const data = keystrokes[Math.max(0, replayState.currentIndex - 1)];

    const wpmEl = document.getElementById('replay-wpm');
    const accEl = document.getElementById('replay-accuracy');
    const timeEl = document.getElementById('replay-time');

    if (data) {
        if (wpmEl) wpmEl.textContent = data.wpm || 0;
        if (accEl) accEl.textContent = (data.accuracy || 0) + '%';
        
        // SINKRONISASI WAKTU REAL-TIME
        // Hitung waktu mundur dari timestamp relatif terhadap timestamp pertama
        // Ini memastikan waktu dimulai dari totalDuration (misal: 60s) dan berkurang secara akurat
        const relativeTimestamp = data.timestamp - replayState.firstTimestamp;
        const elapsedSeconds = Math.floor(relativeTimestamp / 1000);
        const remaining = Math.max(0, replayState.totalDuration - elapsedSeconds);
        if (timeEl) timeEl.textContent = remaining + 's';

        
        // Console log setiap 20 keystroke untuk debugging (kurangi frekuensi)
        if (replayState.currentIndex % 20 === 0) {
            console.log('[Replay Stats] Index:', replayState.currentIndex, 
                        'timeElapsed:', data.timeElapsed, 
                        'timestamp:', data.timestamp,
                        'displayed:', remaining + 's');
        }
    } else {
        if (timeEl) timeEl.textContent = replayState.totalDuration + 's';
    }
}




// Cache untuk incremental updates
let replayTextCache = {
    lastInput: null,
    lastTargetWords: null,
    container: null,
    wordElements: []
};

function renderReplayText() {
    const container = document.getElementById('replay-text-display');
    if (!container || !replayState.replayData) return;

    const targetText = replayState.replayData.targetText || "";
    const keystrokes = replayState.replayData.keystrokes || [];
    const currentInput = replayState.currentIndex > 0 
        ? (keystrokes[replayState.currentIndex - 1]?.inputState || "") 
        : "";

    const targetWords = targetText.split(' ');
    const currentWords = currentInput.split(' ');
    const currentWordIdx = Math.max(0, currentWords.length - 1);

    // 1. INITIAL BUILD (Hanya jika belum ada atau ganti pelajaran)
    if (!replayTextCache.container || replayTextCache.lastTargetWords !== targetWords.join(' ')) {
        container.innerHTML = '';
        replayTextCache.wordElements = [];
        
        const wordsWrapper = document.createElement('div');
        wordsWrapper.className = 'replay-words-container';
        
        targetWords.forEach((targetWord, wordIdx) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'replay-word';
            wordSpan.id = `replay-word-${wordIdx}`; // ID untuk referensi scroll
            
            for (let i = 0; i < targetWord.length; i++) {
                const charSpan = document.createElement('span');
                charSpan.className = 'replay-char untyped';
                charSpan.textContent = targetWord[i];
                wordSpan.appendChild(charSpan);
            }
            wordsWrapper.appendChild(wordSpan);
            replayTextCache.wordElements[wordIdx] = wordSpan;

            if (wordIdx < targetWords.length - 1) {
                const spaceSpan = document.createElement('span');
                spaceSpan.className = 'replay-char space-char untyped';
                spaceSpan.textContent = ' ';
                wordsWrapper.appendChild(spaceSpan);
            }
        });
        container.appendChild(wordsWrapper);
        replayTextCache.container = container;
        replayTextCache.lastTargetWords = targetWords.join(' ');
    }

    // 2. INCREMENTAL UPDATE (Hanya update kata yang terdampak)
    // Kita update dari kata sebelumnya sampai kata saat ini
    const startIndex = Math.max(0, currentWordIdx - 1);
    const endIndex = Math.min(targetWords.length - 1, currentWordIdx);

    for (let wordIdx = startIndex; wordIdx <= endIndex; wordIdx++) {
        const wordEl = replayTextCache.wordElements[wordIdx];
        if (!wordEl) continue;

        const targetWord = targetWords[wordIdx];
        const typedWord = currentWords[wordIdx] || "";
        const isCurrentWord = (wordIdx === currentWordIdx);

        // Update status aktif
        wordEl.classList.toggle('active-word', isCurrentWord);

        // Bersihkan extra characters (karakter berlebih)
        const existingExtras = wordEl.querySelectorAll('.wrong-extra');
        existingExtras.forEach(el => el.remove());

        const charSpans = wordEl.querySelectorAll('.replay-char');
        
        // Loop karakter target
        for (let i = 0; i < targetWord.length; i++) {
            const charSpan = charSpans[i];
            if (i < typedWord.length) {
                const isCorrect = typedWord[i] === targetWord[i];
                charSpan.className = `replay-char ${isCorrect ? 'correct' : 'wrong'}`;
            } else {
                charSpan.className = 'replay-char untyped';
            }
            
            // Cursor logic: kursor berada di karakter yang akan diketik
            charSpan.classList.toggle('cursor', isCurrentWord && i === typedWord.length);
        }

        // Handle Extra Characters (Jika user ngetik kepanjangan)
        if (typedWord.length > targetWord.length) {
            for (let i = targetWord.length; i < typedWord.length; i++) {
                const extraSpan = document.createElement('span');
                extraSpan.className = 'replay-char wrong wrong-extra';
                extraSpan.textContent = typedWord[i];
                // Kursor di karakter ekstra terakhir jika ini kata aktif
                if (isCurrentWord && i === typedWord.length - 1) {
                    extraSpan.classList.add('cursor');
                }
                wordEl.appendChild(extraSpan);
            }
        }

        // Update spasi setelah kata
        const nextEl = wordEl.nextElementSibling;
        if (nextEl && nextEl.classList.contains('space-char')) {
            const isPassed = wordIdx < currentWordIdx;
            nextEl.className = `replay-char space-char ${isPassed ? 'correct' : 'untyped'}`;
            // Kursor di spasi jika user baru saja menyelesaikan kata tapi belum pencet spasi
            // (Tergantung logika inputState aplikasi lo)
        }

        // 3. AUTO-SCROLL LOGIC
        if (isCurrentWord) {
            wordEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center' // Scroll agar kata aktif ada di tengah container
            });
        }
    }
    
    replayTextCache.lastInput = currentInput;
}


function appendChars(parent, text, className) {
    for (const char of text) {
        const span = document.createElement('span');
        span.className = `replay-char ${className}`;
        span.textContent = char;
        parent.appendChild(span);
    }
}

function pauseReplay() {
    replayState.isPlaying = false;
    updatePlayButton();
    if (replayState.intervalId) {
        clearTimeout(replayState.intervalId);
        replayState.intervalId = null;
    }
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}


function stopReplay() {
    pauseReplay();
    replayState.renderToken++;
    replayState.currentIndex = 0;
    
    // Reset cache untuk replay berikutnya
    replayTextCache.lastInput = null;
    replayTextCache.lastTargetWords = null;
    replayTextCache.container = null;
    replayTextCache.wordElements = [];
    
    renderReplayText();
    updateProgressBar();
    updateLiveStats();
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

function updateReplayInfo(score) {
    const info = document.getElementById('replay-score-info');
    if (info) {
        const date = new Date(score.date).toLocaleString('id-ID', {
            year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        info.textContent = `WPM: ${score.wpm} | Akurasi: ${score.accuracy}% | ${date}`;
    }
}

function showNoReplayMessage(message) {
    const textDisplay = document.getElementById('replay-text-display');
    if (textDisplay) textDisplay.innerHTML = `<p class="no-replay">${message}</p>`;
}

window.loadReplay = loadReplay;
window.initReplayContainer = initReplayContainer;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReplayContainer, { once: true });
} else {
    initReplayContainer();
}
