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

// ==================== Predikat achievement (dipakai bersama) ====================
// Predikat murni per-skor berikut dipakai baik oleh all-time-accumulator.js
// (untuk melacak status "pernah tercapai" secara PERSISTEN, tidak ikut
// terpotong MAX_SCORES seperti array `scores`) maupun achievement-logic.js
// (sebagai fallback kalau accumulator gagal dibaca) — supaya definisi "jam
// malam", "tes maraton", dan "akurasi sempurna" cuma ada di SATU tempat,
// konsisten dengan pola ACHIEVEMENT_DEFS di achievement-logic.js.

export const NIGHT_OWL_START_HOUR = 0; // 00:00
export const NIGHT_OWL_END_HOUR = 3; // sampai sebelum 03:00 ("jam 12-3 pagi")
export const MARATHON_SECONDS = 10 * 60; // tes berdurasi 10 menit

export function isNightOwlScore(score) {
  if (!score || !score.date) return false;
  const hour = new Date(score.date).getHours();
  return hour >= NIGHT_OWL_START_HOUR && hour < NIGHT_OWL_END_HOUR;
}

export function isMarathonScore(score) {
  return !!score && Number(score.time) >= MARATHON_SECONDS;
}

// ✅ Akurasi sempurna dicek dari `errors` (jumlah karakter SALAH yang
// sesungguhnya — lihat finalIncorrectChars di game-logic.js), BUKAN dari
// field `accuracy` yang sudah dibulatkan (Math.round di calculateAndDisplayFinalResults).
// Tes dengan akurasi mis. 99.6% bisa ikut ter-bulatkan jadi "100" kalau
// dicek lewat field accuracy, sehingga salah dianggap sempurna.
export function isPerfectScore(score) {
  if (!score) return false;
  const totalWordsTyped = (score.correctWords || 0) + (score.incorrectWords || 0);
  return totalWordsTyped > 0 && (Number(score.errors) || 0) === 0;
}

function formatDuration(totalSeconds) {
  // Bulatkan ke total menit DULU, baru pecah jadi jam+menit.
  // (Sebelumnya jam & menit dibulatkan terpisah, sehingga kasus seperti
  // 3599 detik bisa menghasilkan "60m" atau 7199 detik jadi "1j 60m" —
  // overflow menit yang seharusnya naik jadi jam.)
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}j ${minutes}m`;
}

function idNumber(n) {
  return Math.round(n).toLocaleString('id-ID');
}

// Diekspor supaya all-time-accumulator.js bisa memakai rumus estimasi yang
// SAMA PERSIS saat mengakumulasi skor satu-per-satu (di saat saveScore()
// dipanggil), jadi tidak ada risiko dua tempat menghitung dengan cara
// berbeda dan hasilnya menyimpang seiring waktu.
export function estimateCorrectChars(score) {
  const minutes = (Number(score.time) || 0) / 60;
  if (minutes <= 0) return 0;
  return Math.round((score.wpm || 0) * 5 * minutes);
}

// Top burst dari SATU skor saja (dipakai baik oleh getTopBurst(scores) di
// bawah, maupun oleh accumulator saat mengakumulasi skor baru satu-per-satu).
export function getScoreTopBurst(score) {
  let best = { wpm: 0, second: 0 };
  const keystrokes = score && score.replayData && score.replayData.keystrokes;
  if (!Array.isArray(keystrokes)) return best;
  keystrokes.forEach((k) => {
    if (!k || typeof k.wpm !== 'number') return;
    if (k.wpm > best.wpm) {
      best = { wpm: k.wpm, second: Math.floor((k.timestamp || 0) / 1000) };
    }
  });
  return best;
}

function getTopBurst(scores) {
  let best = { wpm: 0, second: 0 };
  scores.forEach((s) => {
    const scoreBest = getScoreTopBurst(s);
    if (scoreBest.wpm > best.wpm) best = scoreBest;
  });
  return best;
}

/**
 * @param {Array} scores - dari getTypingScores() (score-manager.js). Array ini
 *   dipotong ke MAX_SCORES entry terbaru (lihat cleanupOldScores di
 *   score-manager.js), jadi TIDAK bisa dipakai sendirian untuk statistik
 *   "seumur hidup" begitu histori sudah lebih dari MAX_SCORES tes.
 * @param {Object} [accumulator] - dari getAllTimeAccumulator()
 *   (all-time-accumulator.js). Accumulator ini di-update satu-per-satu di
 *   setiap saveScore(), SEBELUM entry lama dibuang, jadi field kumulatifnya
 *   (durasi, kata, karakter, top burst, rata-rata all-time) tetap akurat
 *   walau `scores` sudah terpotong. Kalau tidak diberikan, fallback ke
 *   menghitung langsung dari `scores` seperti sebelumnya (mode lama, hanya
 *   akurat selama histori belum melebihi MAX_SCORES).
 */
export function getAllTimeStats(scores = [], accumulator = null) {
  const totalDurationSeconds = accumulator
    ? accumulator.totalDurationSeconds
    : scores.reduce((sum, s) => sum + (Number(s.time) || 0), 0);
  const totalWords = accumulator
    ? accumulator.totalWords
    : scores.reduce((sum, s) => sum + (s.correctWords || 0) + (s.incorrectWords || 0), 0);
  const incorrectChars = accumulator
    ? accumulator.incorrectChars
    : scores.reduce((sum, s) => sum + (Number(s.errors) || 0), 0);
  const correctChars = accumulator
    ? accumulator.correctChars
    : scores.reduce((sum, s) => sum + estimateCorrectChars(s), 0);

  const topBurst = accumulator ? accumulator.topBurst : getTopBurst(scores);

  // Rata-rata 10 tes TERAKHIR selalu dihitung dari `scores` (data live),
  // bukan accumulator — karena secara definisi ini butuh 10 tes yang paling
  // baru, dan itu selalu ada di dalam array `scores` yang masih tersimpan
  // (MAX_SCORES jauh lebih besar dari 10).
  const last10 = scores.slice(-10);
  const avgLast10Wpm = last10.length
    ? Math.round(last10.reduce((sum, s) => sum + (s.wpm || 0), 0) / last10.length)
    : 0;
  const allTimeAvgWpm =
    accumulator && accumulator.testCount
      ? Math.round(accumulator.wpmSum / accumulator.testCount)
      : scores.length
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