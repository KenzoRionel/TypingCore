// js/history/all-time-accumulator.js
//
// Accumulator PERSISTEN untuk section "All-Time Stats" (lihat AllTimeStats.js
// dan all-time-stats-logic.js).
//
// KENAPA MODUL INI ADA:
// score-manager.js membatasi penyimpanan skor mentah ke MAX_SCORES entry
// (lihat cleanupOldScores) supaya localStorage tidak penuh — begitu histori
// lebih dari MAX_SCORES tes, entry PALING LAMA dibuang permanen. Kalau
// "All-Time Stats" dihitung langsung dari array skor itu, maka begitu
// pengguna sudah mengetik > MAX_SCORES kali, angkanya diam-diam berhenti
// jadi "seumur hidup" dan malah jadi "MAX_SCORES tes terakhir" — judulnya
// jadi bohong.
//
// Modul ini menyimpan SATU objek kecil terpisah di localStorage
// (bukan array, jadi ukurannya konstan, tidak pernah perlu dipangkas) yang
// di-update dengan cara DITAMBAH (bukan dihitung ulang dari array skor)
// setiap kali saveScore() dipanggil di score-manager.js — termasuk untuk
// entry yang skor mentahnya sendiri nanti akan dibuang oleh cleanupOldScores.
// Jadi field kumulatif (durasi, kata, karakter, top burst, rata-rata WPM
// all-time) tetap akurat walau skor mentahnya sudah lama hilang.
//
// MIGRASI DATA LAMA:
// Untuk pengguna yang sudah punya histori skor SEBELUM modul ini ada, kita
// tidak punya cara mengembalikan skor yang sudah kadung terbuang oleh
// cleanupOldScores di masa lalu. Begitu accumulator ini pertama kali dibaca
// dan ternyata belum pernah ada, ia diinisialisasi dari skor yang MASIH
// tersisa di localStorage saat itu (ensureAccumulatorInitialized) sebagai
// baseline terbaik yang bisa didapat — setelah itu accumulator berjalan
// benar-benar all-time ke depannya, tidak akan pernah kehilangan data lagi.

import {
  estimateCorrectChars,
  getScoreTopBurst,
  isNightOwlScore,
  isMarathonScore,
  isPerfectScore,
} from './all-time-stats-logic.js';

const ACCUMULATOR_KEY = 'typingAllTimeAccumulator';

function defaultAccumulator() {
  return {
    totalDurationSeconds: 0,
    totalWords: 0,
    correctChars: 0,
    incorrectChars: 0,
    testCount: 0,
    wpmSum: 0,
    topBurst: { wpm: 0, second: 0 },
    // ✅ BARU: status "pernah tercapai" untuk achievement yang sifatnya
    // biner (Perfectionist/Night Owl/Marathoner), plus daftar bahasa yang
    // pernah dipakai (Polyglot). Disimpan PERSISTEN di sini (sama seperti
    // field kumulatif lain di atas) supaya begitu pemicunya tercapai SEKALI,
    // achievement tidak bisa "terkunci lagi" hanya karena skor buktinya sudah
    // terbuang dari array `scores` oleh cleanupOldScores (lihat catatan modul
    // di atas — masalah yang sama persis dengan yang dipecahkan accumulator
    // ini untuk field kumulatif lainnya).
    perfectAccuracyEver: false,
    nightOwlEver: false,
    marathonEver: false,
    languagesEverUsed: [],
    // Kapan accumulator ini mulai mencatat (untuk transparansi ke pengguna,
    // misal ditampilkan sebagai "Statistik sejak ..." kalau baseline-nya
    // adalah migrasi, bukan histori penuh).
    trackingSince: null,
  };
}

/**
 * Baca accumulator apa adanya dari localStorage. Mengembalikan null kalau
 * belum pernah dibuat (belum pernah dipanggil ensureAccumulatorInitialized
 * atau addScoreToAccumulator+save).
 */
export function getAllTimeAccumulator() {
  try {
    const raw = localStorage.getItem(ACCUMULATOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Guard ringan terhadap data korup/format lama.
    if (!parsed || typeof parsed !== 'object') return null;
    return { ...defaultAccumulator(), ...parsed };
  } catch (e) {
    console.error('Gagal membaca all-time accumulator:', e);
    return null;
  }
}

export function saveAllTimeAccumulator(accumulator) {
  try {
    localStorage.setItem(ACCUMULATOR_KEY, JSON.stringify(accumulator));
    return true;
  } catch (e) {
    // Ukurannya konstan (bukan array), jadi QuotaExceededError di sini
    // seharusnya sangat jarang — tapi tetap jangan sampai melempar error
    // yang menghentikan alur saveScore().
    console.error('Gagal menyimpan all-time accumulator:', e);
    return false;
  }
}

/**
 * Tambahkan SATU skor ke accumulator (pure function — tidak menyentuh
 * localStorage). Dipanggil setiap kali saveScore() menerima skor baru.
 */
export function addScoreToAccumulator(accumulator, score) {
  const acc = accumulator ? { ...accumulator } : defaultAccumulator();

  acc.totalDurationSeconds += Number(score.time) || 0;
  acc.totalWords += (score.correctWords || 0) + (score.incorrectWords || 0);
  acc.incorrectChars += Number(score.errors) || 0;
  acc.correctChars += estimateCorrectChars(score);
  acc.testCount += 1;
  acc.wpmSum += Number(score.wpm) || 0;

  const scoreBurst = getScoreTopBurst(score);
  if (scoreBurst.wpm > (acc.topBurst ? acc.topBurst.wpm : 0)) {
    acc.topBurst = scoreBurst;
  }

  // ✅ BARU: update status achievement biner. Sekali `true`/pernah dipakai,
  // TIDAK PERNAH di-reset ke false lagi oleh skor berikutnya — konsisten
  // dengan sifat achievement yang seharusnya permanen begitu tercapai.
  if (isPerfectScore(score)) acc.perfectAccuracyEver = true;
  if (isNightOwlScore(score)) acc.nightOwlEver = true;
  if (isMarathonScore(score)) acc.marathonEver = true;
  const scoreLanguage = score.language || 'id';
  if (!acc.languagesEverUsed.includes(scoreLanguage)) {
    acc.languagesEverUsed = [...acc.languagesEverUsed, scoreLanguage];
  }

  if (!acc.trackingSince) {
    acc.trackingSince = score.date || new Date().toISOString();
  }

  return acc;
}

/**
 * Pastikan accumulator sudah ada. Kalau belum pernah dibuat sama sekali
 * (pengguna lama / pertama kali fitur ini aktif), inisialisasi dari skor
 * yang MASIH tersimpan saat ini sebagai baseline (lihat catatan migrasi di
 * atas), simpan, lalu kembalikan. Kalau sudah ada, kembalikan apa adanya
 * tanpa menyentuh apa pun (supaya tidak menghitung ulang/dobel).
 *
 * @param {Array} currentScores - hasil getTypingScores() SAAT INI (dipakai
 *   hanya untuk baseline migrasi satu kali, bukan untuk hitungan rutin).
 */
export function ensureAccumulatorInitialized(currentScores = []) {
  const existing = getAllTimeAccumulator();
  if (existing) return existing;

  let baseline = defaultAccumulator();
  currentScores.forEach((s) => {
    baseline = addScoreToAccumulator(baseline, s);
  });
  // Kalau ini migrasi (bukan pengguna baru), trackingSince baseline dari
  // skor tersisa TIDAK mencerminkan tanggal mulai sesungguhnya — beri tahu
  // secara implisit dengan tetap memakai tanggal skor tersisa yang paling
  // lama (lebih jujur daripada "hari ini", walau tetap bukan tanggal asli).
  saveAllTimeAccumulator(baseline);
  return baseline;
}