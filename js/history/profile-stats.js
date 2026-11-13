// js/history/profile-stats.js
//
// Logic MURNI (tidak bergantung DOM) untuk mengganti `userData` dummy yang
// sebelumnya hardcoded di profile.html. Mengikuti pola yang sama dengan
// pb-logic.js / progress-charts-logic.js: satu sumber logic yang bisa dipakai
// ulang, supaya profile.html tidak lagi punya angka rekaan sendiri.
//
// PENTING — konsistensi level/XP:
// Level & nama level ("Typing Journey") sekarang dihitung lewat modul
// BERSAMA js/utils/level-system.js, yang juga dipakai oleh animateXPBar()
// (js/game/game-logic.js). Dulu ada 2 tabel level yang disalin manual di
// dua file (gampang out-of-sync) — sekarang cuma ada SATU sumber logic.
// Jangan tambahkan tabel level baru di file ini; ubah level-system.js saja.
//
// ✅ AKURASI DATA (perbaikan): 3 stat utama profil (WPM Terbaik, Akurasi
// Rata-rata, Total Test) dulu dihitung dari array `typingScores` yang
// DIPOTONG ke MAX_SCORES (50) entry oleh cleanupOldScores() — artinya setelah
// 50 tes, "Total Test" macet di 50 dan WPM terbaik lama bisa hilang. Sekarang
// angka-angka itu diambil dari accumulator All-Time PERSISTEN
// (all-time-accumulator.js) yang di-update di SETIAP saveScore() SEBELUM entry
// lama dibuang, dengan fallback ke cara lama kalau accumulator gagal dibaca.
import { getLevelInfo as getLevelInfoFromXP, getLevelName } from '../utils/level-system.js';
import { ensureAccumulatorInitialized } from './all-time-accumulator.js';
import { getAllTimeStats } from './all-time-stats-logic.js';
import { estimateLegacyXP } from '../utils/exp-system.js';

export { getLevelName };

/**
 * Ambil total XP asli dari localStorage (ditulis oleh
 * calculateAndDisplayFinalResults() di game-logic.js setiap tes selesai).
 */
export function getTotalXP() {
  return parseInt(localStorage.getItem('userXP'), 10) || 0;
}

/**
 * @param {number} totalXP
 * @returns {{level:number, levelName:string, xp:number, xpToNext:number}}
 *   `xp`       = XP yang sudah terkumpul DI DALAM level saat ini (bukan total)
 *   `xpToNext` = XP yang dibutuhkan untuk naik dari level saat ini ke level
 *                berikutnya (level * 100 — lihat level-system.js)
 */
export function getLevelInfo(totalXP = 0) {
  return getLevelInfoFromXP(totalXP);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date) {
  // 'YYYY-MM-DD' berdasarkan waktu LOKAL, konsisten dengan pola yang sama
  // dipakai di progress-charts-logic.js.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Hitung streak (hari beruntun) dari tanggal-tanggal skor.
 * "Current" tetap dihitung jika hari ini BELUM ada tes tapi kemarin ada
 * (streak belum putus, tinggal user belum sempat tes hari ini).
 *
 * @param {Array} scores
 * @returns {{current:number, best:number}}
 */
export function getStreakInfo(scores = []) {
  const dayKeys = new Set(
    scores.filter((s) => s && s.date).map((s) => toDateKey(new Date(s.date)))
  );
  if (dayKeys.size === 0) return { current: 0, best: 0 };

  const sortedKeys = [...dayKeys].sort();

  // Best streak: jalur terpanjang dari tanggal-tanggal yang berurutan.
  let best = 1;
  let run = 1;
  for (let i = 1; i < sortedKeys.length; i++) {
    const prevTime = new Date(sortedKeys[i - 1]).getTime();
    const curTime = new Date(sortedKeys[i]).getTime();
    run = curTime - prevTime === DAY_MS ? run + 1 : 1;
    if (run > best) best = run;
  }

  // Current streak: mundur dari hari ini (atau dari kemarin, jika hari ini
  // belum ada tes) selama tanggalnya berurutan tanpa putus.
  const today = startOfDay(new Date());
  let cursor = dayKeys.has(toDateKey(today)) ? today : new Date(today.getTime() - DAY_MS);
  let current = 0;
  while (dayKeys.has(toDateKey(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return { current, best: Math.max(best, current) };
}

/**
 * Agregat 3 stat utama profil (WPM Terbaik, Akurasi Rata-rata, Total Test).
 *
 * ✅ SUMBER DATA UTAMA sekarang accumulator All-Time (seumur hidup, tidak
 * terpotong MAX_SCORES):
 *   - bestWpm   : accumulator.bestWpm (+ bestWpmDate)
 *   - totalTests: accumulator.testCount
 *   - avgAcc    : accumulator.accuracySum / testCount (berbobot SEMUA tes)
 * Fallback ke perhitungan dari `scores` hanya kalau accumulator gagal dibaca.
 *
 * @param {Array} scores - dari getTypingScores() (score-manager.js)
 * @returns {{bestWpm:number, bestWpmDate:string|null, avgAcc:number,
 *   totalTests:number}}
 */
export function getAggregateStats(scores = []) {
  let accumulator = null;
  try {
    accumulator = ensureAccumulatorInitialized(scores);
  } catch (e) {
    console.error('Gagal membaca all-time accumulator untuk profil:', e);
  }

  if (accumulator && accumulator.testCount > 0) {
    return {
      bestWpm: accumulator.bestWpm || 0,
      bestWpmDate: accumulator.bestWpmDate || null,
      avgAcc:
        accumulator.accuracySum > 0 && accumulator.testCount > 0
          ? Math.round(accumulator.accuracySum / accumulator.testCount)
          : 0,
      totalTests: accumulator.testCount,
    };
  }

  // Fallback mode lama (accumulator tidak tersedia).
  if (!scores.length) {
    return { bestWpm: 0, bestWpmDate: null, avgAcc: 0, totalTests: 0 };
  }
  const best = scores.reduce(
    (b, s) => ((s.wpm || 0) > (b.wpm || 0) ? s : b),
    scores[0]
  );
  const avgAcc = Math.round(
    scores.reduce((sum, s) => sum + (s.accuracy || 0), 0) / scores.length
  );
  return {
    bestWpm: best.wpm || 0,
    bestWpmDate: best.date || null,
    avgAcc,
    totalTests: scores.length,
  };
}

// ==================== Statistik Detail (section baru di profil) ====================

function idNumber(n) {
  return Math.round(n).toLocaleString('id-ID');
}

function formatDuration(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}j ${minutes}m`;
}

/**
 * Statistik detail lanjutan untuk section "Statistik Detail" di profile.html:
 * tren performa, distribusi kata/karakter, kebiasaan latihan, dan ringkasan
 * EXP. Semua dihitung dari data ASLI (accumulator all-time + array skor).
 *
 * @param {Array} scores - dari getTypingScores()
 * @returns {Object} kelompok stat siap render:
 *   - performance: rata-rata WPM/akurasi/konsistensi all-time + form 10 vs 10
 *   - volume: total kata/karakter benar-salah, durasi, AFK
 *   - practice: hari aktif, tes/hari, jam paling sering, streak
 *   - exp: total XP, XP 7/30 hari terakhir, rata-rata XP per tes, tes
 *     terbaik berdasarkan XP
 */
export function getExtendedStats(scores = []) {
  let accumulator = null;
  try {
    accumulator = ensureAccumulatorInitialized(scores);
  } catch (e) {
    console.error('Gagal membaca all-time accumulator untuk statistik detail:', e);
  }
  const allTime = getAllTimeStats(scores, accumulator);

  // ---- Performa: rata-rata all-time + "form" (10 terakhir vs 10 sebelumnya)
  const validScores = scores.filter((s) => s && s.date);
  const last10 = scores.slice(-10);
  const prev10 = scores.slice(-20, -10);
  const avg = (arr, pick) =>
    arr.length ? arr.reduce((sum, s) => sum + pick(s), 0) / arr.length : 0;
  const last10AvgWpm = Math.round(avg(last10, (s) => s.wpm || 0));
  const prev10AvgWpm = Math.round(avg(prev10, (s) => s.wpm || 0));
  const last10AvgAcc = Math.round(avg(last10, (s) => s.accuracy || 0));
  const prev10AvgAcc = Math.round(avg(prev10, (s) => s.accuracy || 0));
  // Konsistensi hanya dari skor yang menyimpan field-nya (skor lama tidak punya).
  const consistencyScores = scores.filter((s) => Number.isFinite(Number(s.consistency)));
  const avgConsistency = consistencyScores.length
    ? Math.round(
        consistencyScores.reduce((sum, s) => sum + Number(s.consistency), 0) /
          consistencyScores.length
      )
    : 0;

  // ---- Kebiasaan latihan
  const dayMap = new Map(); // 'YYYY-MM-DD' -> { tests, wpmSum }
  const hourMap = new Array(24).fill(0);
  validScores.forEach((s) => {
    const d = new Date(s.date);
    if (Number.isNaN(d.getTime())) return;
    const key = toDateKey(d);
    if (!dayMap.has(key)) dayMap.set(key, { tests: 0, wpmSum: 0 });
    const entry = dayMap.get(key);
    entry.tests += 1;
    entry.wpmSum += s.wpm || 0;
    hourMap[d.getHours()] += 1;
  });
  let mostActiveDay = null; // { date, tests, avgWpm }
  dayMap.forEach((entry, key) => {
    if (!mostActiveDay || entry.tests > mostActiveDay.tests) {
      mostActiveDay = {
        date: key,
        tests: entry.tests,
        avgWpm: Math.round(entry.wpmSum / entry.tests),
      };
    }
  });
  const mostActiveHour = hourMap.indexOf(Math.max(...hourMap)) >= 0 && Math.max(...hourMap) > 0
    ? hourMap.indexOf(Math.max(...hourMap))
    : null;
  const activeDays = dayMap.size;
  const avgTestsPerActiveDay = activeDays > 0 ? validScores.length / activeDays : 0;

  // Rentang latihan: dari tes pertama sampai terakhir (kalau data ada).
  const firstTest = validScores.length
    ? validScores.reduce((a, b) => (new Date(a.date) < new Date(b.date) ? a : b))
    : null;

  // ---- EXP
  const now = Date.now();
  const xpLast7 = validScores
    .filter((s) => now - new Date(s.date).getTime() <= 7 * DAY_MS)
    .reduce((sum, s) => sum + (Number(s.xp) >= 0 ? Number(s.xp) || 0 : estimateLegacyXP(s)), 0);
  const xpLast30 = validScores
    .filter((s) => now - new Date(s.date).getTime() <= 30 * DAY_MS)
    .reduce((sum, s) => sum + (Number(s.xp) >= 0 ? Number(s.xp) || 0 : estimateLegacyXP(s)), 0);
  const xpTotal = allTime.xpTotal || 0;
  const avgXpPerTest =
    allTime.testCount > 0 ? Math.round(xpTotal / allTime.testCount) : 0;
  // Tes dengan XP terbesar yang masih tersimpan (skor lama dipakai rumus lama).
  let bestXpTest = null;
  validScores.forEach((s) => {
    const xp = Number(s.xp) >= 0 ? Number(s.xp) || 0 : estimateLegacyXP(s);
    if (!bestXpTest || xp > bestXpTest.xp) {
      bestXpTest = { xp, wpm: s.wpm || 0, accuracy: s.accuracy || 0, date: s.date };
    }
  });

  return {
    performance: {
      avgWpm: allTime.allTimeAvgWpm,
      bestWpm: allTime.bestWpm || 0,
      bestWpmDate: allTime.bestWpmDate || null,
      avgAccuracy: allTime.allTimeAvgAccuracy,
      avgConsistency,
      bestConsistency: allTime.bestConsistency || 0,
      last10AvgWpm,
      prev10AvgWpm,
      wpmTrend: last10AvgWpm - prev10AvgWpm, // + berarti membaik
      last10AvgAcc,
      prev10AvgAcc,
      accTrend: last10AvgAcc - prev10AvgAcc,
    },
    volume: {
      testCount: allTime.testCount,
      totalDurationSeconds: allTime.totalDurationSeconds,
      durationLabel: allTime.totalDurationLabel,
      correctWords: allTime.correctWords || 0,
      incorrectWords: allTime.incorrectWords || 0,
      correctChars: allTime.correctChars || 0,
      incorrectChars: allTime.incorrectChars || 0,
      afkSeconds: allTime.afkSeconds || 0,
      afkLabel: allTime.afkLabel,
    },
    practice: {
      activeDays,
      avgTestsPerActiveDay: Math.round(avgTestsPerActiveDay * 10) / 10,
      mostActiveDay,
      mostActiveHour,
      firstTestDate: firstTest ? firstTest.date : null,
    },
    exp: {
      xpTotal,
      xpLast7,
      xpLast30,
      avgXpPerTest,
      bestXpTest,
    },
  };
}

/**
 * Rakit objek `userData` lengkap (bentuknya SAMA seperti yang dipakai
 * renderProfileHeader() di profile.html), tapi seluruh isinya dari data asli.
 *
 * @param {Array} scores - dari getTypingScores() (score-manager.js)
 * @param {string} username
 */
export function buildUserData(scores = [], username = 'Guest') {
  const levelInfo = getLevelInfo(getTotalXP());
  const streak = getStreakInfo(scores);
  const stats = getAggregateStats(scores);

  return {
    username,
    level: levelInfo.level,
    levelName: levelInfo.levelName,
    xp: levelInfo.xp,
    xpToNext: levelInfo.xpToNext,
    streak,
    stats,
  };
}
