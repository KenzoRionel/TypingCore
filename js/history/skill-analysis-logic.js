// js/history/skill-analysis-logic.js
//
// Logic MURNI (tidak bergantung React/DOM) untuk section "Analisis Skill":
// keyboard heatmap error-rate per huruf + 1 kalimat analisis kekuatan/
// kelemahan/saran. Dihitung dari `replayData.keystrokes` yang tersimpan di
// tiap entry skor (lihat game-logic.js -> calculateAndDisplayFinalResults()
// -> keystrokesForReplay, dan score-manager.js -> saveScore()).
//
// CATATAN PENTING (keterbatasan data):
// - `replayData` HANYA ada pada skor yang keystroke-nya berhasil disimpan.
//   Skor lama (sebelum fitur replay ada) atau skor yang "dibuang" oleh
//   cleanupOldScores()/quota-fallback di score-manager.js TIDAK punya
//   `replayData`. Modul ini otomatis mengabaikan skor semacam itu — artinya
//   analisis di sini dihitung dari SEBAGIAN riwayat (yang masih punya
//   replay), bukan seluruh riwayat mengetik user.
// - `keystroke.wpm` yang disimpan adalah WPM KUMULATIF sejak awal tes
//   (bukan kecepatan instan per detik), jadi TIDAK dipakai di sini untuk
//   analisis error per huruf — hanya `char` dan `isCorrect` yang dipakai.

const MIN_ATTEMPTS_FOR_KEY = 3; // minimal berapa kali huruf diketik supaya error rate-nya dianggap valid
const MIN_ATTEMPTS_FOR_WEAKNESS = 5; // minimal sampel untuk masuk daftar "huruf sering typo"
const MIN_KEYSTROKES_FOR_ANALYSIS = 50; // minimal total keystroke sebelum berani menyimpulkan pola

function collectKeystrokes(scores) {
  const all = [];
  scores.forEach((s) => {
    const keystrokes = s && s.replayData && s.replayData.keystrokes;
    if (!Array.isArray(keystrokes)) return;
    keystrokes.forEach((k) => {
      if (!k || k.isDeletion) return; // hapus tidak dihitung sebagai "ketikan" huruf
      if (!k.char || k.char.length !== 1) return; // abaikan tombol non-karakter (mis. 'Backspace')
      all.push(k);
    });
  });
  return all;
}

/**
 * Hitung attempts & errors per huruf (huruf a-z, case-insensitive; spasi
 * dihitung terpisah dengan key ' ').
 */
export function getKeyStats(scores = []) {
  const keystrokes = collectKeystrokes(scores);
  const stats = {};

  keystrokes.forEach((k) => {
    const char = k.char === ' ' ? ' ' : k.char.toLowerCase();
    if (!/^[a-z ]$/.test(char)) return; // fokus ke huruf QWERTY + spasi saja
    if (!stats[char]) stats[char] = { attempts: 0, errors: 0 };
    stats[char].attempts += 1;
    if (!k.isCorrect) stats[char].errors += 1;
  });

  return stats;
}

function errorRateOf(entry) {
  return entry.attempts > 0 ? Math.round((entry.errors / entry.attempts) * 100) : 0;
}

/**
 * Data siap-pakai untuk keyboard heatmap: tiap huruf dapat `level`
 * ('low' | 'mid' | 'high' | 'none') berdasarkan error rate:
 *   > 40%   -> 'high' (merah / --danger)
 *   20-40%  -> 'mid'  (kuning / --warning)
 *   < 20%   -> 'low'  (hijau / --success)
 *   data < MIN_ATTEMPTS_FOR_KEY -> 'none' (netral, belum cukup data)
 */
export function getKeyboardHeatmapData(scores = []) {
  const stats = getKeyStats(scores);
  const result = {};

  'abcdefghijklmnopqrstuvwxyz'.split('').forEach((char) => {
    const entry = stats[char];
    if (!entry || entry.attempts < MIN_ATTEMPTS_FOR_KEY) {
      result[char] = { level: 'none', errorRate: null, attempts: entry ? entry.attempts : 0 };
      return;
    }
    const errorRate = errorRateOf(entry);
    const level = errorRate > 40 ? 'high' : errorRate >= 20 ? 'mid' : 'low';
    result[char] = { level, errorRate, attempts: entry.attempts };
  });

  return result;
}

/**
 * Bandingkan error rate paruh awal vs paruh akhir tiap tes (dibagi dari
 * `keystroke.timestamp`, elapsed ms sejak tes mulai) untuk melihat pola
 * konsistensi: apakah user lebih akurat di awal atau di akhir tes.
 */
function getTimeSegmentErrorRates(scores) {
  const firstHalf = { attempts: 0, errors: 0 };
  const secondHalf = { attempts: 0, errors: 0 };

  scores.forEach((s) => {
    const keystrokes = s && s.replayData && s.replayData.keystrokes;
    if (!Array.isArray(keystrokes) || keystrokes.length === 0) return;
    const valid = keystrokes.filter((k) => k && !k.isDeletion && k.char && k.char.length === 1);
    if (valid.length === 0) return;

    const maxTs = Math.max(...valid.map((k) => k.timestamp || 0));
    if (maxTs <= 0) return;
    const midpoint = maxTs / 2;

    valid.forEach((k) => {
      const bucket = (k.timestamp || 0) <= midpoint ? firstHalf : secondHalf;
      bucket.attempts += 1;
      if (!k.isCorrect) bucket.errors += 1;
    });
  });

  return {
    firstHalfRate: errorRateOf(firstHalf),
    secondHalfRate: errorRateOf(secondHalf),
    sampleSize: firstHalf.attempts + secondHalf.attempts,
  };
}

/**
 * Ambil N huruf dengan error rate tertinggi (sampel cukup) untuk
 * ditampilkan sebagai "kelemahan".
 */
function getWeakestKeys(scores, count = 2) {
  const stats = getKeyStats(scores);
  return Object.keys(stats)
    .filter((char) => char !== ' ' && stats[char].attempts >= MIN_ATTEMPTS_FOR_WEAKNESS)
    .map((char) => ({ char, errorRate: errorRateOf(stats[char]), attempts: stats[char].attempts }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, count);
}

/**
 * Rakit 1 kalimat analisis: Kekuatan / Kelemahan / Saran.
 *
 * @param {Array} scores - dari getTypingScores() (score-manager.js)
 * @returns {{hasEnoughData:boolean, strength:string, weakness:string, suggestion:string, fullText:string}}
 */
export function getSkillAnalysisSummary(scores = []) {
  const segments = getTimeSegmentErrorRates(scores);
  const weakest = getWeakestKeys(scores, 2);

  // Butuh cukup KEYSTROKE (bukan cuma cukup tes) supaya analisis tidak
  // menyesatkan dari sampel yang terlalu kecil.
  const hasEnoughData = segments.sampleSize >= MIN_KEYSTROKES_FOR_ANALYSIS;

  if (!hasEnoughData) {
    return {
      hasEnoughData: false,
      strength: '',
      weakness: '',
      suggestion: '',
      fullText: 'Belum cukup data replay untuk analisis skill. Selesaikan beberapa tes lagi.',
    };
  }

  const strength =
    segments.firstHalfRate <= segments.secondHalfRate
      ? 'Konsisten di paruh awal test'
      : 'Meningkat di paruh akhir test setelah pemanasan';

  const weakness =
    weakest.length > 0
      ? `Huruf ${weakest.map((w) => w.char.toUpperCase()).join(', ')} sering typo`
      : 'Belum ada huruf spesifik yang menonjol seringnya typo';

  const bigram =
    weakest.length >= 2
      ? `${weakest[0].char}${weakest[1].char}`
      : weakest.length === 1
      ? `${weakest[0].char}a`
      : null;

  const suggestion = bigram
    ? `Latihan bigram '${bigram}'`
    : 'Terus latihan rutin untuk memperkuat konsistensi';

  return {
    hasEnoughData: true,
    strength,
    weakness,
    suggestion,
    fullText: `Kekuatan: ${strength}. Kelemahan: ${weakness}. Saran: ${suggestion}.`,
  };
}