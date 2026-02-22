// js/history/typing-replay.js
// Modul untuk menangani fitur replay mengetik

let replayState = {
    isPlaying: false,
    currentIndex: 0,
    replayData: null,
    text: '',
    intervalId: null,
    container: null,
    playButton: null,
    scoreId: null,
    lastTimestamp: 0
};

// Initialize replay container in the DOM
export function initReplayContainer() {
    const DOM = getHistoryDOMReferences();
    if (!DOM) {
        console.log('initReplayContainer: DOM references not found');
        return;
    }

    // Check if replay container already exists
    let replayContainer = document.getElementById('replay-container');
    if (!replayContainer) {
        console.log('initReplayContainer: Creating replay container');
        replayContainer = document.createElement('div');
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
        
        // Insert after chart containers, before score list
        const chartContainers = document.querySelectorAll('.chart-container');
        if (chartContainers.length > 0) {
            chartContainers[chartContainers.length - 1].after(replayContainer);
        } else if (DOM.scoreHistoryList) {
            DOM.scoreHistoryList.before(replayContainer);
        }
    }

    replayState.container = replayContainer;
    replayState.playButton = document.getElementById('replay-play-btn');
    
    // Add event listeners
    const playBtn = document.getElementById('replay-play-btn');
    const resetBtn = document.getElementById('replay-reset-btn');
    
    if (playBtn) {
        playBtn.addEventListener('click', toggleReplay);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetReplay);
    }
}

function getHistoryDOMReferences() {
    return {
        wpmProgressChart: document.getElementById('wpmProgressChart'),
        accuracyProgressChart: document.getElementById('accuracyProgressChart'),
        scoreHistoryList: document.getElementById('scoreHistoryList'),
        noHistoryMessage: document.querySelector('.no-history'),
    };
}

// Load replay data for a specific score
export function loadReplay(scoreId) {
    console.log('loadReplay called with scoreId:', scoreId);
    
    const scores = getTypingScores();
    console.log('Total scores:', scores.length);
    
    if (scoreId < 0 || scoreId >= scores.length) {
        console.log('Invalid scoreId');
        showNoReplayMessage('Skor tidak valid');
        return;
    }
    
    const score = scores[scoreId];
    console.log('Selected score:', score);
    console.log('Score keys:', Object.keys(score));
    
    if (!score) {
        console.log('No score found');
        showNoReplayMessage('Skor tidak ditemukan');
        return;
    }
    
    // Check if replayData exists
    console.log('replayData exists:', 'replayData' in score);
    console.log('replayData value:', score.replayData);
    
    if (!score.replayData) {
        console.log('No replayData in score');
        // Try to find scores with replayData
        const scoresWithReplay = scores.filter(s => s.replayData);
        console.log('Scores with replayData:', scoresWithReplay.length);
        
        // Show more helpful message
        if (scoresWithReplay.length > 0) {
            showNoReplayMessage('Skor ini tidak memiliki data replay. Coba skor lain.');
        } else {
            showNoReplayMessage('Replay tidak tersedia. Silakan lakukan test baru.');
        }
        return;
    }

    console.log('replayData:', score.replayData);
    
    // Stop any current replay
    stopReplay();
    
    replayState.scoreId = scoreId;
    replayState.replayData = score.replayData;
    replayState.text = score.replayData.text || '';
    replayState.currentIndex = 0;
    
    console.log('Text for replay:', replayState.text ? replayState.text.substring(0, 100) : 'EMPTY');
    console.log('Keystrokes count:', score.replayData.keystrokes ? score.replayData.keystrokes.length : 0);
    
    // Update UI
    updateReplayInfo(score);
    renderReplayText();
    updateProgressBar();
    updateLiveStats();
    
    // Enable play button
    if (replayState.playButton) {
        replayState.playButton.disabled = false;
    }
}

function getTypingScores() {
    return JSON.parse(localStorage.getItem('typingScores') || '[]');
}

function showNoReplayMessage(message) {
    const textDisplay = document.getElementById('replay-text-display');
    const info = document.getElementById('replay-score-info');
    
    if (textDisplay) {
        textDisplay.innerHTML = `<p class="no-replay">${message || 'Replay tidak tersedia untuk skor ini.'}</p>`;
    }
    if (info) {
        info.textContent = 'Pilih skor untuk melihat replay';
    }
    
    if (replayState.playButton) {
        replayState.playButton.disabled = true;
    }
    
    replayState.replayData = null;
    replayState.text = '';
}

function updateReplayInfo(score) {
    const info = document.getElementById('replay-score-info');
    if (info) {
        const date = new Date(score.date).toLocaleString('id-ID', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        info.textContent = `WPM: ${score.wpm} | Akurasi: ${score.accuracy}% | ${date}`;
    }
}

function renderReplayText() {
    const textDisplay = document.getElementById('replay-text-display');
    if (!textDisplay) return;
    
    // Clear previous content
    textDisplay.innerHTML = '';
    
    // Get keystrokes from replayData
    const keystrokes = replayState.replayData?.keystrokes || [];
    
    if (!keystrokes.length) {
        textDisplay.innerHTML = '<p class="no-replay">Tidak ada data replay</p>';
        return;
    }
    
    const targetText = replayState.replayData?.targetText || '';
    
    // Handle initial state (currentIndex === 0)
    if (replayState.currentIndex === 0) {
        renderUntypedText(textDisplay, targetText);
        return;
    }
    
    // Get current typed input at current index
    const currentIndex = Math.min(replayState.currentIndex, keystrokes.length);
    const currentKeystroke = keystrokes[currentIndex - 1];
    const currentInput = currentKeystroke?.inputState || '';
    
    if (!currentInput) {
        // Fallback: use replayState.text if available
        if (replayState.text && replayState.currentIndex > 0) {
            const charCount = replayState.currentIndex;
            const partialInput = replayState.text.substring(0, charCount);
            renderTypedText(textDisplay, targetText, partialInput);
            return;
        }
        textDisplay.innerHTML = '';
        return;
    }
    
    // Render the text with typed characters
    renderTypedText(textDisplay, targetText, currentInput);
}

// Render untyped target text (initial state)
function renderUntypedText(container, targetText) {
    if (!targetText) return;
    
    const words = targetText.split(' ');
    const wordsContainer = document.createElement('div');
    wordsContainer.className = 'replay-words-container';
    
    words.forEach((word, wordIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'replay-word';
        
        // Render each character as untyped
        for (let i = 0; i < word.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.className = 'replay-char untyped';
            charSpan.textContent = word[i];
            wordSpan.appendChild(charSpan);
        }
        
        wordsContainer.appendChild(wordSpan);
        
        // Add space between words
        if (wordIdx < words.length - 1) {
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'replay-char space-char';
            spaceSpan.textContent = ' ';
            wordsContainer.appendChild(spaceSpan);
        }
    });
    
    container.appendChild(wordsContainer);
}

// Render text with typed input
function renderTypedText(container, targetText, currentInput) {
    const targetWords = targetText.split(' ');
    const currentWords = currentInput.split(' ');
    
    const wordsContainer = document.createElement('div');
    wordsContainer.className = 'replay-words-container';
    
    // Process all target words
    targetWords.forEach((targetWord, wordIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'replay-word';
        
        const typedWord = currentWords[wordIdx] || '';
        const isWordStarted = wordIdx < currentWords.length;
        const isCurrentWord = (wordIdx === currentWords.length - 1);
        const isWordCompleted = typedWord.length > 0 && (typedWord.length >= targetWord.length || wordIdx < currentWords.length - 1);
        
        if (!isWordStarted) {
            // Word not yet typed - show as untyped
            for (let i = 0; i < targetWord.length; i++) {
                const charSpan = document.createElement('span');
                charSpan.className = 'replay-char untyped';
                charSpan.textContent = targetWord[i];
                wordSpan.appendChild(charSpan);
            }
        } else {
            const typed = typedWord.split('');
            
            // Render typed characters
            for (let i = 0; i < typed.length; i++) {
                const charSpan = document.createElement('span');
                charSpan.className = 'replay-char';
                
                if (i < targetWord.length) {
                    if (typed[i] === targetWord[i]) {
                        charSpan.classList.add('correct');
                    } else {
                        charSpan.classList.add('wrong');
                    }
                } else {
                    charSpan.classList.add('wrong', 'wrong-extra');
                }
                
                charSpan.textContent = typed[i];
                wordSpan.appendChild(charSpan);
                
                // Add cursor after last typed character in current word
                if (isCurrentWord && i === typed.length - 1) {
                    charSpan.classList.add('cursor');
                }
            }
            
            // Show remaining untyped characters
            for (let i = typed.length; i < targetWord.length; i++) {
                const charSpan = document.createElement('span');
                charSpan.className = 'replay-char untyped';
                charSpan.textContent = targetWord[i];
                wordSpan.appendChild(charSpan);
            }
            
            // Only add completed-wrong class when the word is fully typed and has errors
            if (isWordCompleted && typedWord !== targetWord) {
                wordSpan.classList.add('completed-wrong');
            }
        }
        
        wordsContainer.appendChild(wordSpan);
        
        // Add space between words
        if (wordIdx < targetWords.length - 1) {
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'replay-char space-char';
            spaceSpan.textContent = ' ';
            wordsContainer.appendChild(spaceSpan);
        }
    });
    
    container.appendChild(wordsContainer);
    
    // Auto-scroll to keep current word visible
    scrollToCurrentWord(container, currentWords.length);
}

// Auto-scroll function to keep current word visible
function scrollToCurrentWord(container, currentWordIndex) {
    if (!container) return;
    
    const currentWordElements = container.querySelectorAll('.replay-word');
    if (currentWordIndex > 0 && currentWordIndex <= currentWordElements.length) {
        const currentWordEl = currentWordElements[currentWordIndex - 1];
        if (currentWordEl) {
            currentWordEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('replay-progress-bar');
    if (!progressBar) return;
    
    if (!replayState.replayData || !replayState.replayData.keystrokes) {
        progressBar.style.width = '0%';
        return;
    }
    
    const total = replayState.replayData.keystrokes.length;
    const progress = total > 0 ? (replayState.currentIndex / total) * 100 : 0;
    progressBar.style.width = `${progress}%`;
}

function updateLiveStats() {
    const wpmEl = document.getElementById('replay-wpm');
    const accuracyEl = document.getElementById('replay-accuracy');
    const timeEl = document.getElementById('replay-time');
    
    if (!replayState.replayData || !replayState.replayData.keystrokes) {
        if (wpmEl) wpmEl.textContent = '0';
        if (accuracyEl) accuracyEl.textContent = '0%';
        if (timeEl) timeEl.textContent = '0s';
        return;
    }
    
    const keystrokes = replayState.replayData.keystrokes;
    const currentIndex = replayState.currentIndex - 1;
    
    if (currentIndex >= 0 && currentIndex < keystrokes.length) {
        const keystroke = keystrokes[currentIndex];
        if (wpmEl) wpmEl.textContent = keystroke.wpm || 0;
        if (accuracyEl) accuracyEl.textContent = (keystroke.accuracy || 0) + '%';
        if (timeEl) timeEl.textContent = (keystroke.timeElapsed || 0) + 's';
    } else {
        if (wpmEl) wpmEl.textContent = '0';
        if (accuracyEl) accuracyEl.textContent = '0%';
        if (timeEl) timeEl.textContent = '0s';
    }
}

function toggleReplay() {
    console.log('toggleReplay called, replayData:', replayState.replayData);
    
    if (!replayState.replayData || !replayState.replayData.keystrokes) {
        console.log('No replay data available');
        return;
    }
    
    if (replayState.isPlaying) {
        pauseReplay();
    } else {
        playReplay();
    }
}

function playReplay() {
    if (!replayState.replayData || !replayState.replayData.keystrokes) return;
    
    const keystrokes = replayState.replayData.keystrokes;
    if (replayState.currentIndex >= keystrokes.length) {
        // Reset to beginning if at end
        replayState.currentIndex = 0;
    }
    
    replayState.isPlaying = true;
    updatePlayButton();
    
    // Use actual timestamps for accurate replay timing
    function processNextKeystroke() {
        if (!replayState.isPlaying) return;
        
        const keystrokes = replayState.replayData.keystrokes;
        
        const currentKeystroke = keystrokes[replayState.currentIndex];
        
        // Move to next character FIRST, then check if we should stop
        replayState.currentIndex++;
        renderReplayText();
        updateProgressBar();
        updateLiveStats();
        
        // Stop if we've reached the end of keystrokes (after rendering current character)
        if (replayState.currentIndex >= keystrokes.length) {
            stopReplay();
            return;
        }
        
        const nextKeystroke = keystrokes[replayState.currentIndex];
        
        // Calculate time until next keystroke
        if (nextKeystroke && currentKeystroke) {
            const timeDiff = nextKeystroke.timestamp - currentKeystroke.timestamp;
            // Minimum 50ms, maximum 2000ms between characters
            const delay = Math.max(50, Math.min(2000, timeDiff));
            replayState.intervalId = setTimeout(processNextKeystroke, delay);
        } else {
            // No more keystrokes
            stopReplay();
        }
    }
    
    processNextKeystroke();
}

function pauseReplay() {
    replayState.isPlaying = false;
    updatePlayButton();
    
    if (replayState.intervalId) {
        clearTimeout(replayState.intervalId);
        replayState.intervalId = null;
    }
}

function stopReplay() {
    pauseReplay();
    replayState.currentIndex = 0;
    renderReplayText();
    updateProgressBar();
}

function resetReplay() {
    stopReplay();
}

function updatePlayButton() {
    if (!replayState.playButton) return;
    
    const icon = replayState.playButton.querySelector('i');
    if (icon) {
        if (replayState.isPlaying) {
            icon.className = 'fas fa-pause';
        } else {
            icon.className = 'fas fa-play';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing replay container');
    initReplayContainer();
});

// Make functions available globally for table row clicks
window.loadReplay = loadReplay;
window.initReplayContainer = initReplayContainer;
