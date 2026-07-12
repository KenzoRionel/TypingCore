// js/history/all-time-stats-logic.js
//
// Logic MURNI (tidak bergantung React/DOM) untuk section "All-Time Stats":
// grid 2x3 ringkasan seumur hidup (total waktu, total kata, karakter, top
// burst, rata-rata 10 tes terakhir, vs all-time). Dihitung dari array skor
// dengan format SAMA seperti getTypingScores() (score-manager.js),
// konsisten dengan pola pb-logic.js / achievement-logic.js.
//
// CATATAN ESTIMASI KARAKTER:
// Skor TIDAK menyimpan jumlah karakter benar secara eksplisit — hanya
// `wpm`, `time`, dan `errors` (= jumlah karakter SALAH; lihat cara
// game-logic.js memanggil saveScore(), parameter `errors` diisi dari
// `finalIncorrectChars`). Karakter BENAR diestimasi balik dari rumus WPM
// yang sama dipakai game-logic.js (wpm = correctChars / 5 / menit), yaitu
// correctChars ≈ wpm * 5 * (time/60). ANGKA INI ESTIMASI (karena `wpm`
// sudah dibulatkan), bukan hitungan karakter yang presisi mutlak.
//
// CATATAN "TOP BURST":
// Kecepatan instan per-detik (rawWpmPerSecond) dihitung real-time saat tes
// berlangsung (lihat game-logic.js) tapi TIDAK ikut disimpan ke
// localStorage (dibuang demi hemat kuota — lihat komentar "REMOVED:
// keystrokeDetails" di game-logic.js). Proxy terdekat yang memang
// tersimpan adalah `replayData.keystrokes[].wpm`, yaitu WPM KUMULATIF
// sejak awal tes. Nilai ini bisa melonjak besar sesaat di awal tes (sedikit
// karakter dibagi waktu yang sangat singkat), sehingga nilai maksimumnya
// dipakai di sini sebagai pendekatan "ledakan kecepatan" tercepat yang
// pernah tercatat — bukan burst-per-detik yang sesungguhnya.

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}j ${minutes}m`;
}

function idNumber(n) {
  return Math.round(n).toLocaleString('id-ID');
}

function estimateCorrectChars(score) {
  const minutes = (Number(score.time) || 0) / 60;
  if (minutes <= 0) return 0;
  return Math.round((score.wpm || 0) * 5 * minutes);
}

function getTopBurst(scores) {
  let best = { wpm: 0, second: 0 };
  scores.forEach((s) => {
    const keystrokes = s && s.replayData && s.replayData.keystrokes;
    if (!Array.isArray(keystrokes)) return;
    keystrokes.forEach((k) => {
      if (!k || typeof k.wpm !== 'number') return;
      if (k.wpm > best.wpm) {
        best = { wpm: k.wpm, second: Math.floor((k.timestamp || 0) / 1000) };
      }
    });
  });
  return best;
}

/**
 * @param {Array} scores - dari getTypingScores() (score-manager.js)
 */
export function getAllTimeStats(scores = []) {
  const totalDurationSeconds = scores.reduce((sum, s) => sum + (Number(s.time) || 0), 0);
  const totalWords = scores.reduce(
    (sum, s) => sum + (s.correctWords || 0) + (s.incorrectWords || 0),
    0
  );
  const incorrectChars = scores.reduce((sum, s) => sum + (Number(s.errors) || 0), 0);
  const correctChars = scores.reduce((sum, s) => sum + estimateCorrectChars(s), 0);

  const topBurst = getTopBurst(scores);

  const last10 = scores.slice(-10);
  const avgLast10Wpm = last10.length
    ? Math.round(last10.reduce((sum, s) => sum + (s.wpm || 0), 0) / last10.length)
    : 0;
  const allTimeAvgWpm = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + (s.wpm || 0), 0) / scores.length)
    : 0;

  return {
    totalDurationSeconds,
    totalDurationLabel: formatDuration(totalDurationSeconds),
    totalWords,
    totalWordsLabel: `${idNumber(totalWords)} kata`,
    correctChars,
    incorrectChars,
    charsLabel: `${idNumber(correctChars)} benar / ${idNumber(incorrectChars)} salah`,
    topBurst,
    topBurstLabel:
      topBurst.wpm > 0 ? `${topBurst.wpm} WPM di detik ${topBurst.second}` : 'Belum ada data',
    avgLast10Wpm,
    allTimeAvgWpm,
    vsAllTimeDiff: avgLast10Wpm - allTimeAvgWpm,
  };
}