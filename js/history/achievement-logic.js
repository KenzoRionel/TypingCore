// js/history/achievement-logic.js
//
// Logic MURNI (tidak bergantung React maupun DOM) untuk section
// "Achievement & Goals": grid 9 badge, kotak "Next Goal", dan kotak
// "Milestone Terdekat". Mengikuti pola yang sama dengan pb-logic.js /
// progress-charts-logic.js — satu sumber logic yang dipakai oleh komponen
// React (AchievementGrid.js), dihitung dari array skor dengan format yang
// SAMA dengan getTypingScores() di score-manager.js (localStorage key
// 'typingScores').
//
// PENTING: definisi achievement (id, nama, icon, deskripsi, syarat unlock)
// SENGAJA disatukan di satu tempat (ACHIEVEMENT_DEFS) supaya tidak ada dua
// daftar achievement yang bisa bercabang/tidak sinkron. Streak & WPM
// terbaik TIDAK dihitung ulang di sini — dipakai ulang dari
// profile-stats.js (getStreakInfo, getAggregateStats) supaya angka yang
// tampil di sini selalu sama dengan yang tampil di Profile Header.

import { getStreakInfo, getAggregateStats } from './profile-stats.js';
import { ensureAccumulatorInitialized } from './all-time-accumulator.js';
import { isNightOwlScore, isMarathonScore, isPerfectScore } from './all-time-stats-logic.js';

const POLYGLOT_LANGUAGE_COUNT = 3;

function countDistinctLanguages(scores) {
  // Skor lama (sebelum field `language` ada) dianggap 'id', konsisten
  // dengan aturan yang sama di pb-logic.js.
  const langs = new Set(scores.map((s) => s.language || 'id'));
  return langs.size;
}

function totalWordsTyped(scores) {
  return scores.reduce(
    (sum, s) => sum + (s.correctWords || 0) + (s.incorrectWords || 0),
    0
  );
}

/**
 * Daftar 9 definisi achievement. Tiap definisi punya:
 *  - id, name, icon (kelas Font Awesome, sudah dimuat lewat CDN di
 *    profile.html), desc (ditampilkan saat hover lewat atribut `title`)
 *  - compute(scores, ctx) -> { unlocked, progress?, target? }
 *    `ctx` berisi agregat yang sudah dihitung sekali (bestWpm, totalTests,
 *    streakBest) supaya tiap compute() tidak menghitung ulang dari nol.
 */
const ACHIEVEMENT_DEFS = [
  {
    id: 'wpm50',
    name: '50 WPM Club',
    icon: 'fa-bolt',
    desc: 'Capai 50 WPM dalam satu tes',
    compute: (scores, ctx) => ({
      unlocked: ctx.bestWpm >= 50,
      progress: ctx.bestWpm,
      target: 50,
    }),
  },
  {
    id: 'wpm100',
    name: '100 WPM Club',
    icon: 'fa-meteor',
    desc: 'Capai 100 WPM dalam satu tes',
    compute: (scores, ctx) => ({
      unlocked: ctx.bestWpm >= 100,
      progress: ctx.bestWpm,
      target: 100,
    }),
  },
  {
    id: 'test100',
    name: '100 Tests',
    icon: 'fa-list-check',
    desc: 'Selesaikan 100 tes mengetik',
    compute: (scores, ctx) => ({
      unlocked: ctx.totalTests >= 100,
      progress: ctx.totalTests,
      target: 100,
    }),
  },
  {
    id: 'streak7',
    name: '7 Day Streak',
    icon: 'fa-fire',
    desc: 'Mengetik 7 hari berturut-turut',
    compute: (scores, ctx) => ({
      unlocked: ctx.streakBest >= 7,
      progress: ctx.streakBest,
      target: 7,
    }),
  },
  {
    id: 'streak30',
    name: '30 Day Streak',
    icon: 'fa-fire-flame-curved',
    desc: 'Mengetik 30 hari berturut-turut',
    compute: (scores, ctx) => ({
      unlocked: ctx.streakBest >= 30,
      progress: ctx.streakBest,
      target: 30,
    }),
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    icon: 'fa-crosshairs',
    desc: '100% acc',
    // ✅ FIX: sebelumnya `scores.some(s => s.accuracy === 100)` — dua masalah:
    // (1) field `accuracy` sudah DIBULATKAN (lihat finalAccuracy di
    //     game-logic.js), jadi tes 99,6% akurasi bisa ikut ke-round jadi 100
    //     dan salah keunlock;
    // (2) `scores` terpotong MAX_SCORES, jadi begitu tes sempurna itu
    //     terdorong keluar dari histori, badge bisa balik terkunci.
    // ctx.perfectAccuracyEver dari accumulator persisten memperbaiki keduanya.
    compute: (scores, ctx) => ({ unlocked: ctx.perfectAccuracyEver }),
  },
  {
    id: 'nightowl',
    name: 'Night Owl',
    icon: 'fa-moon',
    desc: 'Test di jam 12-3 pagi',
    // ✅ FIX: sama seperti Perfectionist — pakai status persisten supaya
    // tidak hilang begitu skor buktinya terbuang dari `scores`.
    compute: (scores, ctx) => ({ unlocked: ctx.nightOwlEver }),
  },
  {
    id: 'marathoner',
    name: 'Marathoner',
    icon: 'fa-person-running',
    desc: 'Test 10 menit',
    // ✅ FIX: sama seperti Perfectionist — pakai status persisten.
    compute: (scores, ctx) => ({ unlocked: ctx.marathonEver }),
  },
  {
    id: 'polyglot',
    name: 'Polyglot',
    icon: 'fa-earth-asia',
    desc: 'Test 3 bahasa',
    // ✅ FIX: sebelumnya dihitung dari daftar bahasa pada `scores` (terpotong
    // MAX_SCORES) — kalau bahasa ke-3 pernah dites tapi buktinya sudah
    // terbuang, progress/unlock bisa turun lagi. ctx.languagesCount dari
    // accumulator.languagesEverUsed tidak pernah berkurang.
    compute: (scores, ctx) => ({
      unlocked: ctx.languagesCount >= POLYGLOT_LANGUAGE_COUNT,
      progress: ctx.languagesCount,
      target: POLYGLOT_LANGUAGE_COUNT,
    }),
  },
];

/**
 * Hitung status 9 achievement dari array skor asli.
 * @param {Array} scores - dari getTypingScores() (score-manager.js)
 * @returns {Array<{id:string, name:string, icon:string, desc:string,
 *   unlocked:boolean, progress?:number, target?:number}>}
 *   `progress`/`target` hanya diisi untuk achievement yang BELUM unlocked
 *   dan punya progress bar (perfectionist/nightowl/marathoner murni
 *   biner, jadi tidak punya progress bar).
 */
export function getAchievements(scores = []) {
  // ✅ FIX: sumber untuk totalTests & status achievement biner sekarang
  // accumulator persisten (all-time-accumulator.js) — bukan `scores` yang
  // dipotong ke MAX_SCORES entry oleh cleanupOldScores() di score-manager.js.
  // Kalau gagal dibaca (mis. localStorage error), fallback ke cara lama
  // (tetap berfungsi, hanya kembali punya keterbatasan lama) daripada
  // melempar error dan menggagalkan seluruh Achievement & Goals.
  let accumulator = null;
  try {
    accumulator = ensureAccumulatorInitialized(scores);
  } catch (e) {
    console.error('Gagal membaca all-time accumulator untuk achievement:', e);
  }

  const ctx = {
    bestWpm: getAggregateStats(scores).bestWpm,
    totalTests: accumulator ? accumulator.testCount : scores.length,
    streakBest: getStreakInfo(scores).best,
    perfectAccuracyEver: accumulator
      ? accumulator.perfectAccuracyEver
      : scores.some(isPerfectScore),
    nightOwlEver: accumulator ? accumulator.nightOwlEver : scores.some(isNightOwlScore),
    marathonEver: accumulator ? accumulator.marathonEver : scores.some(isMarathonScore),
    languagesCount: accumulator
      ? accumulator.languagesEverUsed.length
      : countDistinctLanguages(scores),
  };

  return ACHIEVEMENT_DEFS.map((def) => {
    const result = def.compute(scores, ctx);
    const unlocked = !!result.unlocked;
    return {
      id: def.id,
      name: def.name,
      icon: def.icon,
      desc: def.desc,
      unlocked,
      progress: unlocked ? undefined : result.progress,
      target: unlocked ? undefined : result.target,
    };
  });
}

// ==================== Next Goal (WPM) ====================

// Tangga target WPM berikutnya: kelipatan 10 sampai 100 (rentang yang
// paling relevan buat sebagian besar user), lalu makin jarang di atas itu.
const WPM_GOAL_LADDER = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200, 250, 300];

/**
 * Tentukan target WPM berikutnya berdasarkan PB WPM tertinggi saat ini
 * (sama seperti `stats.bestWpm` di Profile Header / getAggregateStats()).
 *
 * @param {Array} scores
 * @returns {{currentBest:number, nextTarget:number|null, remaining:number}}
 *   `nextTarget` bernilai `null` jika sudah melampaui seluruh tangga target
 *   (kasus sangat jarang: PB di atas 300 WPM).
 */
export function getNextWpmGoal(scores = []) {
  const currentBest = getAggregateStats(scores).bestWpm;
  const nextTarget = WPM_GOAL_LADDER.find((t) => t > currentBest) ?? null;
  const remaining = nextTarget !== null ? nextTarget - currentBest : 0;
  return { currentBest, nextTarget, remaining };
}

// ==================== Milestone Kata Total ====================

const WORD_MILESTONE_STEP = 100000;

/**
 * Hitung milestone total kata terdekat (kelipatan 100.000 kata
 * berikutnya). Total kata dihitung dari `correctWords + incorrectWords`
 * tiap skor, yaitu seluruh kata yang benar-benar diketik user (bukan
 * hanya yang benar).
 *
 * ✅ FIX: sebelumnya total kata dihitung ulang dari `scores` (terpotong
 * MAX_SCORES oleh cleanupOldScores), sehingga begitu histori > MAX_SCORES
 * tes, angka "Milestone Terdekat" di sini TIDAK SINKRON dengan "Total Kata"
 * di All-Time Stats (yang sudah benar memakai accumulator persisten sejak
 * awal — lihat all-time-accumulator.js). Sekarang keduanya pakai sumber
 * yang sama.
 *
 * @param {Array} scores
 * @returns {{totalWords:number, nextMilestone:number, remaining:number}}
 */
export function getWordMilestone(scores = []) {
  let totalWords;
  try {
    totalWords = ensureAccumulatorInitialized(scores).totalWords;
  } catch (e) {
    console.error('Gagal membaca all-time accumulator untuk milestone:', e);
    totalWords = totalWordsTyped(scores);
  }
  const nextMilestone =
    (Math.floor(totalWords / WORD_MILESTONE_STEP) + 1) * WORD_MILESTONE_STEP;
  const remaining = nextMilestone - totalWords;
  return { totalWords, nextMilestone, remaining };
}