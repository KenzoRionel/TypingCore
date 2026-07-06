// js/history/typing-replay.js
// Modul untuk menangani fitur replay mengetik dengan sinkronisasi waktu presisi

let replayState = {
    isPlaying: false,
    currentIndex: 0,
    replayData: null,
    text: '',
    container: null,
    playButton: null,
    scoreId: null,
    renderToken: 0,
    totalDuration: 60,
    // Timeline virtual (ms) per keystroke, jeda antar-keystroke sudah di-cap max 2 detik.
    // Dihitung sekali per replayData saat playReplay() pertama kali dipanggil.
    playbackTimestamps: [],
    playStartWallTime: 0,   // performance.now() saat play/resume terakhir dimulai
    playStartVirtualTime: 0, // posisi di playbackTimestamps saat play/resume terakhir dimulai
    firstTimestamp: 0 // Timestamp asli keystroke pertama, untuk hitung "waktu tersisa"
};

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
    replayState.playbackTimestamps = []; // dihitung ulang saat play berikutnya
    replayState.firstTimestamp = score.replayData.keystrokes?.[0]?.timestamp || 0;
    // Gunakan durasi asli dari score (field-nya "time", bukan "duration"), default ke 60
    replayState.totalDuration = score.time || 60;

    updateReplayInfo(score);
    renderReplayText();
    updateProgressBar();
    updateLiveStats();

    if (replayState.playButton) replayState.playButton.disabled = false;
}

// Hitung timeline virtual (ms) tiap keystroke, dengan jeda antar-keystroke
// di-cap maksimum 2 detik supaya jeda panjang (mis. mikir lama) tidak bikin
// replay ikut nunggu lama juga.
function computePlaybackTimestamps(keystrokes) {
    const arr = new Array(keystrokes.length);
    arr[0] = 0;
    for (let i = 1; i < keystrokes.length; i++) {
        const rawDelay = keystrokes[i].timestamp - keystrokes[i - 1].timestamp;
        const delay = Math.min(Math.max(0, rawDelay), 2000);
        arr[i] = arr[i - 1] + delay;
    }
    return arr;
}

function playReplay() {
    if (!replayState.replayData?.keystrokes.length) return;

    const keystrokes = replayState.replayData.keystrokes;

    if (replayState.currentIndex >= keystrokes.length) {
        replayState.currentIndex = 0;
    }

    if (!replayState.playbackTimestamps.length) {
        replayState.playbackTimestamps = computePlaybackTimestamps(keystrokes);
    }

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    const currentToken = ++replayState.renderToken;
    replayState.isPlaying = true;
    updatePlayButton();

    // Titik acuan: jam dinding saat ini vs posisi di timeline virtual saat ini.
    // Semua keystroke berikutnya dibandingkan terhadap titik acuan ini, bukan
    // dijadwalkan satu-satu lewat setTimeout - jadi tidak ada rantai delay
    // yang bisa drift/numpuk kalau ada keystroke yang jaraknya rapat.
    replayState.playStartWallTime = performance.now();
    replayState.playStartVirtualTime = replayState.playbackTimestamps[replayState.currentIndex] || 0;

    console.log('[Replay] Starting replay with', keystrokes.length, 'keystrokes');

    const frame = () => {
        if (currentToken !== replayState.renderToken || !replayState.isPlaying) return;

        const elapsedWall = performance.now() - replayState.playStartWallTime;
        const targetVirtualTime = replayState.playStartVirtualTime + elapsedWall;

        // Majukan currentIndex sebanyak yang "sudah waktunya" tampil di frame ini.
        // Kalau beberapa keystroke jaraknya sangat rapat (< 1 frame), semuanya
        // digabung jadi satu render saja - bukan dipaksa render satu-satu.
        let advanced = false;
        while (
            replayState.currentIndex < keystrokes.length &&
            replayState.playbackTimestamps[replayState.currentIndex] <= targetVirtualTime
        ) {
            replayState.currentIndex++;
            advanced = true;
        }

        if (advanced) {
            updateLiveStats();
            updateProgressBar();
            renderReplayText();
        }

        if (replayState.currentIndex >= keystrokes.length) {
            console.log('[Replay] Reached end of keystrokes');
            replayState.isPlaying = false;
            updatePlayButton();
            showFinalTime();
            rafId = null;
            return;
        }

        rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
}




// Dipanggil saat replay benar-benar mencapai keystroke terakhir.
// Perhitungan "waktu tersisa" per-keystroke dibulatkan ke bawah (flooring detik),
// jadi keystroke terakhir kadang masih menunjukkan sisa 1s padahal tesnya sudah
// selesai. Paksa ke 0s di titik akhir supaya tidak membingungkan.
function showFinalTime() {
    const timeEl = document.getElementById('replay-time');
    if (timeEl) timeEl.textContent = '0s';
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
    wordElements: [],
    lastScrolledWordIdx: -1
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
        // Sebelumnya pakai wordEl.scrollIntoView({behavior:'smooth', block:'center'})
        // yang mencoba me-recenter kata PERSIS di tengah setiap kali kata berganti,
        // termasuk kata-kata yang masih di baris yang sama. Animasi smooth yang
        // terus-menerus dipicu ulang itulah yang terlihat tersendat.
        // Diganti ke pendekatan yang sama seperti scroll di halaman tes utama
        // (utils/text-display.js -> ensureScrollSync): snap langsung tanpa animasi,
        // dan hanya geser saat kata aktif benar-benar pindah ke baris berikutnya.
        if (isCurrentWord && replayTextCache.lastScrolledWordIdx !== wordIdx) {
            ensureReplayScrollSync(wordEl, container);
            replayTextCache.lastScrolledWordIdx = wordIdx;
        }
    }
    
    replayTextCache.lastInput = currentInput;
}

// Snap-scroll instan berbasis baris, meniru ensureScrollSync() di
// utils/text-display.js supaya perilakunya konsisten dengan halaman tes utama
// yang sudah terbukti mulus (tidak pakai animasi smooth yang bisa saling
// menumpuk/menyendat saat kata berganti cepat).
function ensureReplayScrollSync(wordEl, container) {
    if (!wordEl || !container) return;

    const containerRect = container.getBoundingClientRect();
    const wordRect = wordEl.getBoundingClientRect();
    // Posisi kata relatif terhadap konten container (ikut memperhitungkan scroll saat ini)
    const wordTop = (wordRect.top - containerRect.top) + container.scrollTop;
    const lineHeight = wordRect.height || parseFloat(getComputedStyle(container).lineHeight) || 20;

    const topWithinView = wordTop - container.scrollTop;

    if (topWithinView >= lineHeight) {
        // Kata sudah masuk baris ke-2 dari area yang terlihat -> geser satu baris
        container.scrollTop = wordTop - lineHeight;
    } else if (topWithinView < 0) {
        // Render mundur (reset/scrub) -> pastikan kata tetap kelihatan
        container.scrollTop = Math.max(0, wordTop);
    }
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
    replayTextCache.lastScrolledWordIdx = -1;
    
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