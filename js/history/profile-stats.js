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
import { getLevelInfo as getLevelInfoFromXP, getLevelName } from '../utils/level-system.js';

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
 * Agregat 3 stat utama (WPM Terbaik, Akurasi Rata-rata, Total Test) dari
 * array skor asli.
 */
export function getAggregateStats(scores = []) {
  if (!scores.length) return { bestWpm: 0, avgAcc: 0, totalTests: 0 };

  const bestWpm = Math.max(...scores.map((s) => s.wpm || 0));
  const avgAcc = Math.round(
    scores.reduce((sum, s) => sum + (s.accuracy || 0), 0) / scores.length
  );

  return { bestWpm, avgAcc, totalTests: scores.length };
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