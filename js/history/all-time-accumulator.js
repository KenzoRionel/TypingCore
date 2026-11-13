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
import { estimateLegacyXP } from '../utils/exp-system.js';

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
    // ✅ SCHEMA v2 — agregat tambahan untuk Profile & EXP:
    //  - bestWpm/bestWpmDate: WPM terbaik SEUMUR HIDUP. Sebelumnya profil
    //    menghitungnya dari `scores` yang terpotong MAX_SCORES, jadi PB lama
    //    bisa "hilang" begitu terdorong keluar dari histori.
    //  - accuracySum/consistencySum: jumlah akurasi & konsistensi mentah
    //    (untuk rata-rata all-time yang berbobot semua tes, bukan 50 terakhir).
    //  - correctWordsSum/incorrectWordsSum: kata benar/salah terpisah.
    //  - afkSecondsSum: total waktu AFK seumur hidup (dari exp-system.js).
    //  - xpTotal: total XP yang benar-benar diterima user (field `xp` per
    //    skor, ditulis game-logic.js sejak exp-system.js diperkenalkan).
    //  - bestConsistency: konsistensi tertinggi yang pernah dicapai.
    //  - schemaVersion: penanda format; dipakai ensureAccumulatorInitialized
    //    untuk migrasi satu kali dari format lama (v1) ke v2.
    bestWpm: 0,
    bestWpmDate: null,
    bestConsistency: 0,
    accuracySum: 0,
    consistencySum: 0,
    correctWordsSum: 0,
    incorrectWordsSum: 0,
    afkSecondsSum: 0,
    xpTotal: 0,
    schemaVersion: 2,
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
    const merged = { ...defaultAccumulator(), ...parsed };
    // ✅ Penanda RUNTIME (tidak ikut tersimpan): accumulator yang tidak punya
    // field `schemaVersion` berarti format lama v1 — default `schemaVersion: 2`
    // dari defaultAccumulator() TIDAK BOLEH menutupi itu, kalau tidak migrasi
    // v1->v2 di ensureAccumulatorInitialized() akan terlewat.
    if (parsed.schemaVersion === undefined) {
      merged.__legacySchema = true;
    }
    return merged;
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
  // Penanda runtime __legacySchema tidak boleh ikut tersimpan.
  delete acc.__legacySchema;

  acc.totalDurationSeconds += Number(score.time) || 0;
  acc.totalWords += (score.correctWords || 0) + (score.incorrectWords || 0);
  // ✅ Karakter SALAH: entry baru (sejak exp-system.js) menyimpan
  // `incorrectChars` EKSAK dari game-logic.js; entry lama hanya punya `errors`
  // (yang ternyata juga karakter salah — lihat pemanggilan saveScore), jadi
  // keduanya aman dipakai. Tetap prioritaskan field eksak bila ada.
  acc.incorrectChars += Number(
    score.incorrectChars !== undefined ? score.incorrectChars : score.errors
  ) || 0;
  // ✅ Karakter BENAR: kalau entry menyimpan `correctChars` eksak, pakai itu
  // (persis, bukan perkiraan). Entry lama tetap diestimasi dari rumus WPM.
  acc.correctChars +=
    score.correctChars !== undefined && score.correctChars !== null
      ? Number(score.correctChars) || 0
      : estimateCorrectChars(score);
  acc.testCount += 1;
  acc.wpmSum += Number(score.wpm) || 0;

  // ✅ SCHEMA v2: agregat tambahan. Semua dengan fallback supaya entry skor
  // lama (tanpa field baru) tetap bisa diakumulasi tanpa error.
  const scoreWpm = Number(score.wpm) || 0;
  if (scoreWpm > (acc.bestWpm || 0)) {
    acc.bestWpm = scoreWpm;
    acc.bestWpmDate = score.date || null;
  }

  acc.accuracySum += Number(score.accuracy) || 0;
  acc.correctWordsSum += Number(score.correctWords) || 0;
  acc.incorrectWordsSum += Number(score.incorrectWords) || 0;
  acc.afkSecondsSum += Number(score.afkSeconds) || 0;
  acc.xpTotal += Number(score.xp) || 0;

  const scoreConsistency = Number(score.consistency);
  if (Number.isFinite(scoreConsistency)) {
    acc.consistencySum += scoreConsistency;
    if (scoreConsistency > (acc.bestConsistency || 0)) {
      acc.bestConsistency = scoreConsistency;
    }
  }

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
  // Sudah format v2 (dan bukan hasil merge format lama yang ditandai
  // __legacySchema) -> pakai apa adanya, jangan hitung ulang/dobel.
  if (existing && existing.schemaVersion === 2 && !existing.__legacySchema) {
    return existing;
  }

  // ✅ MIGRASI v1 -> v2 (satu kali): accumulator lama sudah punya field
  // kumulatif v1 (durasi, kata, karakter, dsb.) tapi TIDAK punya bestWpm,
  // accuracySum, xpTotal, dst. Skor yang sudah terbuang dari `scores` tidak
  // bisa dikembalikan, jadi field v2 di-backfill dari skor yang MASIH
  // tersimpan saat ini (baseline terbaik yang mungkin), sementara angka v1
  // dibiarkan apa adanya supaya tidak ada dobel hitung.
  if (existing) {
    const upgraded = { ...defaultAccumulator(), ...existing, schemaVersion: 2 };
    delete upgraded.__legacySchema;

    // bestWpm/bestConsistency: maksimum dari skor yang MASIH tersimpan
    // (skor yang sudah terbuang tidak bisa dipulihkan — di-dokumentasikan
    // di komentar modul).
    currentScores.forEach((s) => {
      const sWpm = Number(s.wpm) || 0;
      if (sWpm > (upgraded.bestWpm || 0)) {
        upgraded.bestWpm = sWpm;
        upgraded.bestWpmDate = s.date || null;
      }
      upgraded.bestConsistency = Math.max(
        upgraded.bestConsistency || 0,
        Number(s.consistency) || 0
      );
    });

    // accuracySum/consistencySum TIDAK boleh dijumlahkan langsung dari
    // `currentScores` — testCount accumulator (v1) mewakili populasi tes yang
    // BERBEDA dari skor yang tersisa sekarang, jadi menjumlahkannya lalu
    // membagi dengan testCount bisa menghasilkan rata-rata > 100%. Aproksimasi
    // terbaik: rata-rata sampel yang terlihat × testCount (bobot all-time),
    // lalu biarkan tiap tes baru menambah keduanya secara konsisten.
    const testCountV1 = Math.max(0, Number(upgraded.testCount) || 0);
    if (currentScores.length > 0 && testCountV1 > 0) {
      const avgAccuracy =
        currentScores.reduce((sum, s) => sum + (Number(s.accuracy) || 0), 0) /
        currentScores.length;
      upgraded.accuracySum = Math.round(avgAccuracy * testCountV1);

      const consistencySamples = currentScores.filter((s) =>
        Number.isFinite(Number(s.consistency))
      );
      if (consistencySamples.length > 0) {
        const avgConsistency =
          consistencySamples.reduce((sum, s) => sum + Number(s.consistency), 0) /
          consistencySamples.length;
        upgraded.consistencySum = Math.round(avgConsistency * testCountV1);
      }
    }

    // correctWordsSum/incorrectWordsSum/afkSecondsSum: jumlahkan dari skor
    // tersisa (field ini tidak "membagi" dengan testCount, jadi aman —
    // hanya undercount untuk skor yang sudah terbuang, bukan salah rasio).
    currentScores.forEach((s) => {
      upgraded.correctWordsSum += Number(s.correctWords) || 0;
      upgraded.incorrectWordsSum += Number(s.incorrectWords) || 0;
      upgraded.afkSecondsSum += Number(s.afkSeconds) || 0;
      // XP: entry baru punya field `xp` eksak; entry lama dipakai rumus lama
      // (wpm × akurasi × menit) yang memang dipakai saat entry itu dibuat.
      const exactXp = Number(s.xp);
      upgraded.xpTotal += Number.isFinite(exactXp) ? exactXp : estimateLegacyXP(s);
    });

    saveAllTimeAccumulator(upgraded);
    return upgraded;
  }

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