// js/history/statistics-panel.js

export let statisticsPanelState = {
  isOpen: false,
  lastTestData: null
};

export function initStatisticsPanel() {
  const statisticsButton = document.getElementById('statisticsButton');
  if (!statisticsButton) return;

  statisticsButton.addEventListener('click', toggleStatisticsPanel);
}

export function toggleStatisticsPanel() {
  const panel = document.getElementById('statisticsPanel');
  const button = document.getElementById('statisticsButton');
  if (!panel || !button) return;

  statisticsPanelState.isOpen = !statisticsPanelState.isOpen;

  if (statisticsPanelState.isOpen) {
    panel.classList.add('expand');
    panel.style.display = 'block';
    button.setAttribute('aria-label', 'Sembunyikan Statistik');
    setTimeout(() => {
      panel.classList.add('visible');
      // Autoscroll ke area panel statistik setelah panel terbuka
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 10);
  } else {
    panel.classList.remove('visible');
    button.setAttribute('aria-label', 'Tampilkan Statistik');
    setTimeout(() => {
      panel.classList.remove('expand');
      panel.style.display = 'none';
    }, 300);
  }
}

export function resetStatisticsPanel() {
  const panel = document.getElementById('statisticsPanel');
  const button = document.getElementById('statisticsButton');

  if (panel) {
    panel.classList.remove('expand', 'visible');
    panel.style.display = 'none';
    panel.innerHTML = '';
  }

  if (button) {
    button.style.display = 'none';
    button.setAttribute('aria-label', 'Tampilkan Statistik');
  }

  statisticsPanelState.isOpen = false;
  statisticsPanelState.lastTestData = null;
}

export function renderStatisticsPanel(historyData, finalWPM, totalTime, testContext) {
  const panel = document.getElementById('statisticsPanel');
  if (!panel) return;

  // Save test data for later use
  statisticsPanelState.lastTestData = {
    historyData,
    finalWPM,
    totalTime,
    testContext
  };

  // Calculate all statistics
  const errorStats = calculateErrorStats(historyData);
  const perfStats = calculatePerformanceStats(historyData, finalWPM, totalTime);
  const contextStats = calculateContextStats(testContext);
  const progressStats = calculateProgressStats(finalWPM, testContext);

  // Render the panel
  const panelHTML = createPanelHTML(errorStats, perfStats, contextStats, progressStats);
  panel.innerHTML = panelHTML;

  // Show statistics button
  const statsButton = document.getElementById('statisticsButton');
  if (statsButton) statsButton.style.display = 'flex';
}

// =============== ERROR STATISTICS ===============

function calculateErrorStats(historyData) {
  const charErrors = {};
  const wordSpeeds = [];
  let totalTypo = 0, totalExtra = 0, totalMissed = 0, totalWrongCase = 0;

  historyData.forEach(data => {
    const word = data.word || '';
    const typed = data.typed || '';
    const duration = (data.endTime - data.startTime) / 1000 || 1;

    // Calculate word speed
    wordSpeeds.push({
      word,
      typed,
      avgTime: duration / Math.max(word.length, 1),
      duration
    });

    // Count character-level errors
    for (let i = 0; i < typed.length; i++) {
      const targetChar = word[i] || '';
      const typedChar = typed[i] || '';

      if (targetChar === typedChar) continue;

      if (typedChar === '') {
        totalMissed++;
        const key = targetChar || '?';
        charErrors[key] = (charErrors[key] || 0) + 1;
      } else if (!targetChar) {
        totalExtra++;
      } else if (typedChar.toLowerCase() === targetChar.toLowerCase()) {
        totalWrongCase++;
        charErrors[targetChar] = (charErrors[targetChar] || 0) + 1;
      } else {
        totalTypo++;
        charErrors[targetChar] = (charErrors[targetChar] || 0) + 1;
      }
    }
  });

  // Top 5 error characters
  const topErrorChars = Object.entries(charErrors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([char, count]) => ({ char, count }));

  // Top 5 slowest words
  const topSlowWords = wordSpeeds
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 5)
    .map(w => ({ word: w.word, avgTime: w.avgTime }));

  // Build keyboard heatmap
  const keyboardHeatmap = buildKeyboardHeatmap(charErrors);

  return {
    topErrorChars,
    topSlowWords,
    errorBreakdown: {
      typo: totalTypo,
      extra: totalExtra,
      missed: totalMissed,
      wrongCase: totalWrongCase
    },
    keyboardHeatmap
  };
}

// =============== PERFORMANCE STATISTICS ===============

function calculatePerformanceStats(historyData, finalWPM, totalTime) {
  const keystrokesPerSecond = new Array(totalTime).fill(0);
  const correctCharsPerSecond = new Array(totalTime).fill(0);
  const errorCharsPerSecond = new Array(totalTime).fill(0);

  // ✅ FIX: gunakan satu basis waktu (relatif terhadap awal tes) secara konsisten.
  // Bug sebelumnya: `sec` dihitung relatif (0..totalTime), tapi lalu dipakai bersama
  // `data.startTime` yang absolut (epoch ms, ~1.7 triliun), sehingga
  // `(sec + 1) * 1000 - data.startTime` menghasilkan angka negatif raksasa dan
  // proportion meledak jadi miliaran, membuat Raw/Net/Adjusted WPM jadi angka
  // negatif astronomis serta merusak Burst/Lowest WPM & Std Dev (semua terfilter
  // habis karena hasilnya selalu negatif).
  const testStartTime = historyData[0]?.startTime || 0;

  historyData.forEach(data => {
    const duration = data.endTime - data.startTime;
    if (duration <= 0) return; // hindari pembagian dengan 0/negatif

    const relStart = data.startTime - testStartTime;
    const relEnd = data.endTime - testStartTime;
    const startSecond = Math.max(0, Math.floor(relStart / 1000));
    const endSecond = Math.floor(relEnd / 1000);

    for (let sec = startSecond; sec <= endSecond && sec < totalTime; sec++) {
      // Overlap antara rentang waktu kata ini dengan jendela detik `sec`,
      // semuanya dalam basis waktu relatif yang sama.
      const windowStart = sec * 1000;
      const windowEnd = (sec + 1) * 1000;
      const overlapStart = Math.max(relStart, windowStart);
      const overlapEnd = Math.min(relEnd, windowEnd);
      const overlap = Math.max(0, overlapEnd - overlapStart);
      const proportion = overlap / duration;

      keystrokesPerSecond[sec] += (data.typed?.length || 0) * proportion;
      correctCharsPerSecond[sec] += (data.correctCount || 0) * proportion;
      errorCharsPerSecond[sec] += (data.errorCount || 0) * proportion;
    }
  });

  // Calculate WPM variants
  const wpmVariants = calculateWPMVariants(keystrokesPerSecond, correctCharsPerSecond, totalTime);

  // Find burst and lowest WPM with timing
  const wpmPerSecond = keystrokesPerSecond.map((k, idx) => {
    const timeMs = (idx + 1) * 1000;
    const minutes = timeMs / 60000;
    return minutes > 0 ? Math.round(k / 5 / minutes) : 0;
  });

  const nonZeroWPM = wpmPerSecond.map((w, idx) => ({ wpm: w, second: idx + 1 }))
    .filter(w => w.wpm > 0);

  const burstWPM = nonZeroWPM.length > 0
    ? nonZeroWPM.reduce((max, w) => w.wpm > max.wpm ? w : max)
    : { wpm: 0, second: 0 };

  const lowestWPM = nonZeroWPM.length > 0
    ? nonZeroWPM.reduce((min, w) => w.wpm < min.wpm ? w : min)
    : { wpm: 0, second: 0 };

  // Calculate standard deviation of WPM
  const stdDev = calculateStdDev(wpmPerSecond.filter(w => w > 0));

  // Accuracy per 10 seconds
  const accuracyTimeline = calculateAccuracyTimeline(historyData, totalTime);

  return {
    wpmVariants,
    burstWPM,
    lowestWPM,
    stdDev,
    accuracyTimeline
  };
}

function calculateWPMVariants(keystrokesPerSecond, correctCharsPerSecond, totalTime) {
  let cumulativeTyped = 0;
  let cumulativeCorrect = 0;

  keystrokesPerSecond.forEach((k, idx) => {
    cumulativeTyped += k;
    cumulativeCorrect += correctCharsPerSecond[idx];
  });

  const timeMinutes = totalTime / 60;
  const rawWPM = timeMinutes > 0 ? Math.round(cumulativeTyped / 5 / timeMinutes) : 0;
  const netWPM = timeMinutes > 0 ? Math.round(cumulativeCorrect / 5 / timeMinutes) : 0;

  // Adjusted WPM = Net WPM, but could be further adjusted based on penalty
  const adjustedWPM = netWPM;

  return { rawWPM, netWPM, adjustedWPM };
}

function calculateStdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.round(Math.sqrt(variance));
}

function calculateAccuracyTimeline(historyData, totalTime) {
  const timeline = [];
  const interval = 10; // 10 seconds per bucket

  // ✅ FIX: kalau historyData kosong atau entri pertama tidak punya startTime yang valid,
  // anchor waktu jatuh ke 0 (epoch 1970) sehingga TIDAK ADA kata yang overlap dengan bucket
  // manapun -> semua bucket keliru tampil "0%" (padahal sebenarnya "tidak ada data").
  // Deteksi kondisi ini lebih awal supaya tidak menyesatkan.
  const anchor = historyData[0]?.startTime;
  if (!historyData.length || typeof anchor !== 'number' || Number.isNaN(anchor)) {
    if (typeof console !== 'undefined') {
      console.warn(
        '[statistics-panel] Accuracy Timeline: historyData kosong atau startTime entri pertama tidak valid.',
        { length: historyData.length, firstEntry: historyData[0] }
      );
    }
    for (let i = 0; i < totalTime; i += interval) {
      timeline.push({ range: `${i}-${i + interval}s`, accuracy: null });
    }
    return timeline;
  }

  for (let i = 0; i < totalTime; i += interval) {
    const bucketEnd = anchor + (i + interval) * 1000;
    const bucketStart = anchor + i * 1000;

    let correct = 0, total = 0;

    historyData.forEach(data => {
      if (data.endTime == null || data.startTime == null) return;
      const wordDuration = data.endTime - data.startTime;
      if (data.endTime <= bucketStart || wordDuration <= 0) return; // hindari div/0 -> NaN

      const dataStart = Math.max(data.startTime, bucketStart);
      const dataEnd = Math.min(data.endTime, bucketEnd);
      const proportion = Math.max(0, (dataEnd - dataStart) / wordDuration);

      correct += (data.correctCount || 0) * proportion;
      total += ((data.correctCount || 0) + (data.errorCount || 0)) * proportion;
    });

    // total === 0 di sini berarti memang tidak ada kata yang diketik di rentang waktu
    // ini (mis. user jeda lama) -> tampilkan null ("-"), BUKAN "0%" yang berarti "semua salah".
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;
    timeline.push({ range: `${i}-${i + interval}s`, accuracy });
  }

  return timeline;
}

// =============== CONTEXT STATISTICS ===============

function calculateContextStats(testContext) {
  return {
    mode: testContext?.mode || '-',
    difficulty: testContext?.difficulty || '-',
    includeNumbers: testContext?.includeNumbers || false,
    includePunctuation: testContext?.includePunctuation || false,
    charCount: testContext?.charCount || '-'
  };
}

// =============== PROGRESS STATISTICS ===============

function calculateProgressStats(finalWPM, testContext) {
  // ✅ FIX: score-manager.js menyimpan riwayat di key 'typingScores' (array of
  // {date, wpm, accuracy, time, errors, type, mode, correctWords, incorrectWords, replayData}),
  // BUKAN di 'personalBest'/'testHistory' (key itu tidak pernah ditulis di manapun).
  const historyRecords = localStorage.getItem('typingScores');
  const history = historyRecords ? JSON.parse(historyRecords) : [];

  // Personal Best = entry dengan WPM tertinggi dari riwayat (di titik ini, riwayat
  // BELUM termasuk tes yang baru saja selesai, karena saveScore() dipanggil setelah
  // renderStatisticsPanel() — jadi ini memang PB "sebelum" tes sekarang, cocok untuk
  // dibandingkan dengan hasil tes yang baru saja selesai).
  const pb = history.length > 0
    ? history.reduce((best, r) => ((r.wpm || 0) > (best.wpm || 0) ? r : best), history[0])
    : null;

  const last10 = history.slice(-10);
  const avgWPM = last10.length > 0
    ? Math.round(last10.reduce((sum, r) => sum + (r.wpm || 0), 0) / last10.length)
    : 0;

  return {
    pb: pb
      ? { wpm: pb.wpm || 0, accuracy: pb.accuracy || 0, date: formatShortDate(pb.date) }
      : { wpm: 0, accuracy: 0, date: '-' },
    avgLast10WPM: avgWPM,
    last10Tests: last10.slice().reverse()
  };
}

function formatShortDate(isoDate) {
  if (!isoDate) return '-';
  try {
    return new Date(isoDate).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch {
    return '-';
  }
}

// =============== KEYBOARD HEATMAP ===============

function buildKeyboardHeatmap(charErrors) {
  const keyboardLayout = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  const heatmapData = {};
  Object.entries(charErrors).forEach(([char, count]) => {
    const lowerChar = char.toLowerCase();
    heatmapData[lowerChar] = count;
  });

  return { layout: keyboardLayout, data: heatmapData };
}

// =============== UI RENDERING ===============

function createPanelHTML(errorStats, perfStats, contextStats, progressStats) {
  return `
    <div class="statistics-content">
      <h3 class="stats-section-title">Statistik Rinci</h3>

      <!-- Error Analysis Section -->
      <div class="stats-section">
        <h4 class="stats-section-header">Analisis Error</h4>
        <div class="stats-grid">
          ${createErrorAnalysisCards(errorStats)}
        </div>
      </div>

      <!-- Performance Details Section -->
      <div class="stats-section">
        <h4 class="stats-section-header">Detail Performa</h4>
        <div class="stats-grid">
          ${createPerformanceCards(perfStats)}
        </div>
      </div>

      <!-- Test Context Section -->
      <div class="stats-section">
        <h4 class="stats-section-header">Konteks Test</h4>
        <div class="stats-grid">
          ${createContextCards(contextStats)}
        </div>
      </div>

      <!-- Progress Section -->
      <div class="stats-section">
        <h4 class="stats-section-header">Progress</h4>
        <div class="stats-grid">
          ${createProgressCards(progressStats)}
        </div>
      </div>
    </div>
  `;
}

function createErrorAnalysisCards(errorStats) {
  const { topErrorChars, topSlowWords, errorBreakdown, keyboardHeatmap } = errorStats;

  return `
    <div class="stat-card">
      <h5>Top 5 Huruf Sering Salah</h5>
      <div class="stat-list">
        ${topErrorChars.length > 0
          ? topErrorChars.map(item => `
              <div class="stat-row">
                <span class="stat-label">
                  <code>${escapeHtml(item.char === ' ' ? '␣' : item.char)}</code>
                </span>
                <span class="stat-value">${item.count}x</span>
              </div>
            `).join('')
          : '<div class="stat-empty">-</div>'
        }
      </div>
    </div>

    <div class="stat-card">
      <h5>Top 5 Kata Lambat</h5>
      <div class="stat-list">
        ${topSlowWords.length > 0
          ? topSlowWords.map(item => `
              <div class="stat-row">
                <span class="stat-label">${escapeHtml(item.word)}</span>
                <span class="stat-value">${item.avgTime.toFixed(2)}s</span>
              </div>
            `).join('')
          : '<div class="stat-empty">-</div>'
        }
      </div>
    </div>

    <div class="stat-card">
      <h5>Error Breakdown</h5>
      <div class="stat-list">
        <div class="stat-row">
          <span class="stat-label">Typo</span>
          <span class="stat-value">${errorBreakdown.typo}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Extra</span>
          <span class="stat-value">${errorBreakdown.extra}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Missed</span>
          <span class="stat-value">${errorBreakdown.missed}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Wrong Case</span>
          <span class="stat-value">${errorBreakdown.wrongCase}</span>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <h5>Keyboard Heatmap</h5>
      <div class="keyboard-heatmap">
        ${createKeyboardHeatmapHTML(keyboardHeatmap)}
      </div>
    </div>
  `;
}

function createKeyboardHeatmapHTML(heatmapData) {
  const { layout, data } = heatmapData;
  const maxError = Math.max(...Object.values(data), 3);

  let html = '';
  layout.forEach(row => {
    html += '<div class="keyboard-row">';
    row.forEach(key => {
      const errorCount = data[key] || 0;
      const intensity = Math.min(1, errorCount / maxError);
      const backgroundColor = intensity > 0
        ? `rgba(255, ${Math.round(107 * (1 - intensity))}, ${Math.round(107 * (1 - intensity))}, ${0.3 + intensity * 0.5})`
        : 'transparent';
      html += `
        <div class="keyboard-key" style="background-color: ${backgroundColor};">
          ${key}${errorCount > 0 ? `<span class="error-count">${errorCount}</span>` : ''}
        </div>
      `;
    });
    html += '</div>';
  });

  return html;
}

function createPerformanceCards(perfStats) {
  const { wpmVariants, burstWPM, lowestWPM, stdDev, accuracyTimeline } = perfStats;

  return `
    <div class="stat-card">
      <h5>WPM Variants</h5>
      <div class="stat-list">
        <div class="stat-row">
          <span class="stat-label">Raw WPM</span>
          <span class="stat-value">${wpmVariants.rawWPM}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Net WPM</span>
          <span class="stat-value">${wpmVariants.netWPM}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Adjusted WPM</span>
          <span class="stat-value">${wpmVariants.adjustedWPM}</span>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <h5>WPM Extremes</h5>
      <div class="stat-list">
        <div class="stat-row">
          <span class="stat-label">Burst WPM</span>
          <span class="stat-value">${burstWPM.wpm} @ ${burstWPM.second}s</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Lowest WPM</span>
          <span class="stat-value">${lowestWPM.wpm} @ ${lowestWPM.second}s</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Std Dev</span>
          <span class="stat-value">${stdDev}</span>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <h5>Accuracy Timeline</h5>
      <div class="stat-list">
        ${accuracyTimeline.map(item => `
          <div class="stat-row">
            <span class="stat-label">${item.range}</span>
            <span class="stat-value">${item.accuracy === null ? '-' : item.accuracy + '%'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function createContextCards(contextStats) {
  return `
    <div class="stat-card">
      <h5>Mode & Kesulitan</h5>
      <div class="stat-list">
        <div class="stat-row">
          <span class="stat-label">Mode</span>
          <span class="stat-value">${escapeHtml(contextStats.mode)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Difficulty</span>
          <span class="stat-value">${escapeHtml(contextStats.difficulty)}</span>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <h5>Opsi Test</h5>
      <div class="stat-list">
        <div class="stat-row">
          <span class="stat-label">Numbers</span>
          <span class="stat-value">${contextStats.includeNumbers ? 'Ya' : 'Tidak'}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Punctuation</span>
          <span class="stat-value">${contextStats.includePunctuation ? 'Ya' : 'Tidak'}</span>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <h5>Character Count</h5>
      <div class="stat-list">
        <div class="stat-row">
          <span class="stat-label">Total</span>
          <span class="stat-value">${escapeHtml(String(contextStats.charCount))}</span>
        </div>
      </div>
    </div>
  `;
}

function createProgressCards(progressStats) {
  const { pb, avgLast10WPM, last10Tests } = progressStats;

  return `
    <div class="stat-card">
      <h5>Personal Best</h5>
      <div class="stat-list">
        <div class="stat-row">
          <span class="stat-label">WPM</span>
          <span class="stat-value">${pb.wpm}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Accuracy</span>
          <span class="stat-value">${pb.accuracy}%</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Date</span>
          <span class="stat-value">${escapeHtml(String(pb.date))}</span>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <h5>Average (10 Last)</h5>
      <div class="stat-list">
        <div class="stat-row">
          <span class="stat-label">Avg WPM</span>
          <span class="stat-value">${avgLast10WPM}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Tests</span>
          <span class="stat-value">${last10Tests.length}/10</span>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <h5>Recent Tests (WPM)</h5>
      <div class="stat-list">
        ${last10Tests.length > 0
          ? last10Tests.map((test, idx) => `
              <div class="stat-row">
                <span class="stat-label">#${idx + 1}</span>
                <span class="stat-value">${test.wpm || '-'}</span>
              </div>
            `).join('')
          : '<div class="stat-empty">-</div>'
        }
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return '-';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"'"]/g, m => map[m]);
}