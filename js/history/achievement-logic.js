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

const NIGHT_OWL_START_HOUR = 0; // 00:00
const NIGHT_OWL_END_HOUR = 3; // sampai sebelum 03:00 ("jam 12-3 pagi")
const MARATHON_SECONDS = 10 * 60; // tes berdurasi 10 menit
const POLYGLOT_LANGUAGE_COUNT = 3;

function isNightOwlScore(score) {
  if (!score || !score.date) return false;
  const hour = new Date(score.date).getHours();
  return hour >= NIGHT_OWL_START_HOUR && hour < NIGHT_OWL_END_HOUR;
}

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
    compute: (scores) => ({ unlocked: scores.some((s) => s.accuracy === 100) }),
  },
  {
    id: 'nightowl',
    name: 'Night Owl',
    icon: 'fa-moon',
    desc: 'Test di jam 12-3 pagi',
    compute: (scores) => ({ unlocked: scores.some(isNightOwlScore) }),
  },
  {
    id: 'marathoner',
    name: 'Marathoner',
    icon: 'fa-person-running',
    desc: 'Test 10 menit',
    compute: (scores) => ({
      unlocked: scores.some((s) => Number(s.time) >= MARATHON_SECONDS),
    }),
  },
  {
    id: 'polyglot',
    name: 'Polyglot',
    icon: 'fa-earth-asia',
    desc: 'Test 3 bahasa',
    compute: (scores) => {
      const langCount = countDistinctLanguages(scores);
      return {
        unlocked: langCount >= POLYGLOT_LANGUAGE_COUNT,
        progress: langCount,
        target: POLYGLOT_LANGUAGE_COUNT,
      };
    },
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
  const ctx = {
    bestWpm: getAggregateStats(scores).bestWpm,
    totalTests: scores.length,
    streakBest: getStreakInfo(scores).best,
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
 * @param {Array} scores
 * @returns {{totalWords:number, nextMilestone:number, remaining:number}}
 */
export function getWordMilestone(scores = []) {
  const totalWords = totalWordsTyped(scores);
  const nextMilestone =
    (Math.floor(totalWords / WORD_MILESTONE_STEP) + 1) * WORD_MILESTONE_STEP;
  const remaining = nextMilestone - totalWords;
  return { totalWords, nextMilestone, remaining };
}