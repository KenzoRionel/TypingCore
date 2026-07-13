// js/utils/level-system.js
//
// Sistem Level "Typing Journey" — SATU-SATUNYA sumber logic untuk level & nama
// level, dipakai bareng oleh:
//   - js/game/game-logic.js  (animateXPBar, dipanggil tiap tes selesai)
//   - js/history/profile-stats.js (buildUserData, dipakai profile.html)
//
// Menggantikan tabel LEVELS lama (Sight Seeker, Key Finder, dst.) yang
// sebelumnya di-duplikasi persis di dua file berbeda. Sekarang levelnya
// dihitung dari RUMUS, bukan tabel threshold XP hardcoded per level:
//
//   XP dibutuhkan untuk naik dari Level N ke Level N+1 = N * 100
//
// Jadi Level 34 -> 35 butuh 34 * 100 = 3.400 XP, dst. Level tetap dihitung
// dari total XP kumulatif ('userXP' di localStorage) — cara XP itu sendiri
// didapat/dihitung SAMA SEKALI TIDAK diubah oleh modul ini.
//
// Nama level (tier) terpisah dari itu — murni berdasarkan RANGE level,
// tema "Typing Journey":
export const LEVEL_NAME_RANGES = [
  { max: 5, name: 'Newbie Typer' },
  { max: 10, name: 'Key Toucher' },
  { max: 20, name: 'Word Crafter' },
  { max: 30, name: 'Sentence Slinger' },
  { max: 40, name: 'Paragraph Pro' },
  { max: 50, name: 'Essay Elite' },
  { max: 70, name: 'Manuscript Master' },
  { max: 99, name: 'Keyboard Legend' },
  { max: Infinity, name: 'Typing God' }, // Level 100+
];

/**
 * @param {number} level
 * @returns {string} nama level sesuai range, mis. getLevelName(34) => "Paragraph Pro"
 */
export function getLevelName(level) {
  const lvl = Math.max(1, Math.floor(level || 1));
  const match = LEVEL_NAME_RANGES.find((range) => lvl <= range.max);
  return match ? match.name : LEVEL_NAME_RANGES[LEVEL_NAME_RANGES.length - 1].name;
}

/**
 * XP kumulatif yang dibutuhkan untuk MENCAPAI awal `level` (yaitu total XP
 * yang sudah terkumpul setelah menyelesaikan level 1..level-1).
 * Rumus tertutup dari deret 100 + 200 + ... + (level-1)*100:
 *   sum_{i=1}^{level-1} (i * 100) = 50 * level * (level - 1)
 */
export function xpForLevelStart(level) {
  const lvl = Math.max(1, Math.floor(level || 1));
  return 50 * lvl * (lvl - 1);
}

/** XP yang dibutuhkan untuk naik SATU level dari `level` ke `level + 1`. */
export function xpToNextFromLevel(level) {
  return Math.max(1, Math.floor(level || 1)) * 100;
}

/**
 * Hitung level dari total XP kumulatif (mis. dari localStorage 'userXP').
 * @param {number} totalXP
 * @returns {number}
 */
export function getLevelFromXP(totalXP) {
  const xp = Math.max(0, totalXP || 0);
  // Estimasi awal via rumus kuadrat terbalik dari xpForLevelStart, lalu
  // dikoreksi dengan loop kecil untuk menjaga presisi terhadap pembulatan.
  let level = Math.floor((50 + Math.sqrt(2500 + 200 * xp)) / 100);
  if (level < 1) level = 1;
  while (xpForLevelStart(level + 1) <= xp) level++;
  while (level > 1 && xpForLevelStart(level) > xp) level--;
  return level;
}

/**
 * Rakit info level lengkap dari total XP kumulatif.
 * @param {number} totalXP
 * @returns {{level:number, levelName:string, xp:number, xpToNext:number}}
 *   `xp`       = XP yang sudah terkumpul DI DALAM level saat ini (bukan total)
 *   `xpToNext` = XP yang dibutuhkan untuk naik ke level berikutnya (level * 100)
 */
export function getLevelInfo(totalXP = 0) {
  const level = getLevelFromXP(totalXP);
  const xpAtLevelStart = xpForLevelStart(level);
  return {
    level,
    levelName: getLevelName(level),
    xp: Math.max(0, (totalXP || 0) - xpAtLevelStart),
    xpToNext: xpToNextFromLevel(level),
  };
}