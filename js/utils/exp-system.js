// js/utils/exp-system.js
//
// SATU-SATUNYA sumber logic perhitungan EXP (dan statistik AFK) untuk
// TypingCore. Dipakai oleh:
//   - js/game/game-logic.js (calculateAndDisplayFinalResults — tiap tes selesai)
//   - profile.html / profile-stats.js (menampilkan rincian EXP & AFK)
//   - js/history/statistics-panel.js (kartu EXP & AFK di panel statistik)
//
// KENAPA MODUL INI ADA:
// Rumus XP lama hanya `WPM × akurasi × menit` (hardcoded di game-logic.js),
// sehingga:
//   1. Jeda/AFK 2-30 detik di tengah tetap dihargai penuh (timer tes jalan,
//      tapi user tidak mengetik apa pun) — EXP bisa "difarming" dengan
//      mengetik sebentar lalu menunggu.
//   2. Kata benar/salah, karakter salah, dan konsistensi sama sekali tidak
//      dihitung, padahal datanya sudah tersedia di gameState.
//
// RUMUS BARU (komponen dijumlahkan, lihat calculateEarnedXP):
//   base              = (karakterBENAR / 5) × rasioAktif × (akurasi/100)
//   bonusKonsistensi  = base × (konsistensi/100) × 0.10   (maks +10%)
//   bonusKata         = kataBenar × 0.2 − kataSalah × 0.5
//   penaltiKarakter   = karakterSALAH × 0.25
//   pengaliKesulitan  = 1 + 0.10 (punctuation) + 0.10 (numbers) + 0.05 (quotes)
//   bonusSempurna     = +25 XP flat (akurasi 100%, ada ketikan)
//   bonusMaraton      = +50 XP flat (durasi ≥ 10 menit)
//   TOTAL             = round(max(0, base + bonusKonsistensi + bonusKata −
//                            penaltiKarakter) × pengaliKesulitan) +
//                       bonusSempurna + bonusMaraton
//
// Skala total sengaja disamakan dengan rumus lama (±sama untuk tes 60 detik
// normal) supaya level yang sudah dicapai user tidak tiba-tiba melompat,
// tapi sekarang lebih adil: AFK mengurangi, konsistensi & mode sulit menambah.

// ==================== Konstanta AFK ====================

// Jeda antar keystroke di atas nilai ini mulai dihitung sebagai AFK
// (mengikuti konvensi umum aplikasi typing test: idle > 2 detik = jeda).
export const AFK_GAP_THRESHOLD_MS = 2000;

// Batas maksimum AFK yang dihitung per jeda. Timer inaktivitas aplikasi
// membatalkan tes setelah 30 detik tanpa keystroke (lihat
// startInactivityTimer() di game-logic.js), jadi jeda real tidak akan lebih
// panjang dari itu — cap ini hanya pengaman untuk data replay lama/anomali.
export const AFK_GAP_CAP_MS = 30000;

// Durasi minimum (detik) sebelum AFK dihitung — tes super pendek (< 5 detik)
// terlalu bising secara statistik.
export const AFK_MIN_TEST_SECONDS = 5;

// ==================== Konstanta EXP ====================

export const EXP_RULES = {
  CONSISTENCY_BONUS_MAX: 0.1, // maks +10% dari base
  WORD_CORRECT_BONUS: 0.2,    // per kata benar
  WORD_INCORRECT_PENALTY: 0.5, // per kata salah
  CHAR_ERROR_PENALTY: 0.25,   // per karakter salah
  PUNCTUATION_BONUS: 0.1,     // +10% mode punctuation
  NUMBERS_BONUS: 0.1,         // +10% mode numbers
  QUOTES_BONUS: 0.05,         // +5% mode quotes
  PERFECT_ACCURACY_BONUS: 25, // flat, akurasi 100%
  MARATHON_BONUS: 50,         // flat, durasi >= MARATHON_SECONDS
  MARATHON_SECONDS: 10 * 60,  // sinkron dengan all-time-stats-logic.js
};

// ==================== Statistik AFK ====================

/**
 * Hitung seberapa lama user "AFK" (tidak mengetik) selama tes berlangsung,
 * dari log timestamp keystroke (gameState.keystrokeLog — hanya keystroke
 * karakter, bukan Backspace).
 *
 * Aturan: setiap jeda antar keystroke > AFK_GAP_THRESHOLD_MS dihitung AFK
 * sebesar (jeda − threshold), masing-masing di-cap AFK_GAP_CAP_MS. Jeda
 * setelah keystroke TERAKHIR sampai tes berakhir dihitung juga (user berhenti
 * mengetik tapi timer masih jalan).
 *
 * @param {number[]} keystrokeLog - timestamp (Date.now()) per keystroke
 * @param {number|null} startTime - timestamp awal tes
 * @param {number} endTime - timestamp akhir tes (Date.now() saat tes selesai)
 * @param {number} durationSeconds - durasi resmi tes (untuk quoteMode: durasi
 *   aktual; untuk mode waktu: TIMED_TEST_DURATION)
 * @returns {{afkSeconds:number, activeSeconds:number, afkPercent:number,
 *   activePercent:number}}
 *   `activeSeconds` = durasi − afkSeconds (tidak pernah negatif).
 *   Persen dibulatkan ke integer, di-clamp 0..100.
 */
export function computeAfkStats(keystrokeLog, startTime, endTime, durationSeconds) {
  const duration = Math.max(0, Number(durationSeconds) || 0);
  if (!startTime || !endTime || endTime <= startTime || duration <= 0) {
    return { afkSeconds: 0, activeSeconds: duration, afkPercent: 0, activePercent: 100 };
  }

  const stamps = (Array.isArray(keystrokeLog) ? keystrokeLog : [])
    .filter((ts) => typeof ts === 'number' && ts >= startTime && ts <= endTime)
    .sort((a, b) => a - b);

  let afkMs = 0;

  // Jeda sebelum keystroke pertama: timer dimulai saat keydown pertama, jadi
  // normalnya ~0 — tetap dihitung untuk keamanan (mis. startTime didorong
  // lebih awal oleh jalannya event lain).
  const first = stamps.length > 0 ? stamps[0] : null;
  if (first !== null) {
    afkMs += clampAfkGap(first - startTime);
  }

  // Jeda antar keystroke.
  for (let i = 1; i < stamps.length; i++) {
    afkMs += clampAfkGap(stamps[i] - stamps[i - 1]);
  }

  // Jeda setelah keystroke terakhir sampai tes berakhir.
  const last = stamps.length > 0 ? stamps[stamps.length - 1] : startTime;
  afkMs += clampAfkGap(endTime - last);

  const afkSeconds = Math.min(duration, Math.floor(afkMs / 1000));
  const activeSeconds = Math.max(0, duration - afkSeconds);

  return {
    afkSeconds,
    activeSeconds,
    afkPercent: clampPercent((afkSeconds / duration) * 100),
    activePercent: clampPercent((activeSeconds / duration) * 100),
  };
}

function clampAfkGap(gapMs) {
  if (!Number.isFinite(gapMs) || gapMs <= AFK_GAP_THRESHOLD_MS) return 0;
  return Math.min(gapMs - AFK_GAP_THRESHOLD_MS, AFK_GAP_CAP_MS);
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

// ==================== Perhitungan EXP ====================

/**
 * Hitung EXP yang didapat dari satu tes mengetik.
 *
 * @param {Object} p - parameter tes
 * @param {number} p.correctChars - jumlah karakter benar (tanpa spasi)
 * @param {number} p.incorrectChars - jumlah karakter salah
 * @param {number} p.correctWords - jumlah kata lengkap yang benar
 * @param {number} p.incorrectWords - jumlah kata yang salah
 * @param {number} p.accuracy - akurasi akhir 0-100 (sudah dibulatkan)
 * @param {number} p.consistency - konsistensi 0-100 (bisa 0 jika data kurang)
 * @param {number} p.durationSeconds - durasi tes (detik)
 * @param {number} p.activeSeconds - detik AKTIF mengetik (dari computeAfkStats)
 * @param {boolean} [p.punctuationMode]
 * @param {boolean} [p.numberMode]
 * @param {boolean} [p.quoteMode]
 * @returns {{total:number, breakdown:Object}} `breakdown` berisi semua
 *   komponen (sudah dibulatkan untuk display) + afkPercent — dipakai UI
 *   rincian EXP di layar hasil & profil.
 */
export function calculateEarnedXP(p = {}) {
  const correctChars = Math.max(0, Number(p.correctChars) || 0);
  const incorrectChars = Math.max(0, Number(p.incorrectChars) || 0);
  const correctWords = Math.max(0, Number(p.correctWords) || 0);
  const incorrectWords = Math.max(0, Number(p.incorrectWords) || 0);
  const accuracy = clampPercent(p.accuracy);
  const consistency = clampPercent(p.consistency);
  const durationSeconds = Math.max(0, Number(p.durationSeconds) || 0);
  const totalTypedChars = correctChars + incorrectChars;

  // Rasio waktu AKTIF mengetik (0..1) — AFK tidak boleh menghasilkan EXP.
  const activeRatio =
    durationSeconds > 0
      ? Math.max(0, Math.min(1, (Number(p.activeSeconds) || 0) / durationSeconds))
      : 0;

  // Komponen utama: "kata standar" (5 karakter) yang benar-benar diketik
  // selama waktu aktif, dikali faktor akurasi.
  const baseXP = (correctChars / 5) * activeRatio * (accuracy / 100);

  // Bonus konsistensi: ketikan yang stabil dihargai, maks +10% dari base.
  const consistencyBonus =
    baseXP * (consistency / 100) * EXP_RULES.CONSISTENCY_BONUS_MAX;

  // Bonus/kurangan kata: kata lengkap yang benar +, kata salah −.
  const wordBonus =
    correctWords * EXP_RULES.WORD_CORRECT_BONUS -
    incorrectWords * EXP_RULES.WORD_INCORRECT_PENALTY;

  // Penalti eksplisit per karakter salah (di atas penalti akurasi di base).
  const errorPenalty = incorrectChars * EXP_RULES.CHAR_ERROR_PENALTY;

  // Pengali kesulitan mode.
  let difficultyMultiplier = 1;
  if (p.punctuationMode) difficultyMultiplier += EXP_RULES.PUNCTUATION_BONUS;
  if (p.numberMode) difficultyMultiplier += EXP_RULES.NUMBERS_BONUS;
  if (p.quoteMode) difficultyMultiplier += EXP_RULES.QUOTES_BONUS;

  // Bonus flat.
  const perfectBonus =
    accuracy === 100 && totalTypedChars > 0 ? EXP_RULES.PERFECT_ACCURACY_BONUS : 0;
  const marathonBonus =
    durationSeconds >= EXP_RULES.MARATHON_SECONDS ? EXP_RULES.MARATHON_BONUS : 0;

  const core =
    (baseXP + consistencyBonus + wordBonus - errorPenalty) * difficultyMultiplier;
  const total = Math.max(0, Math.round(core)) + perfectBonus + marathonBonus;

  return {
    total,
    breakdown: {
      // Angka display (dibulatkan 1 desimal untuk komponen pecahan).
      baseXP: round1(baseXP),
      activePercent: clampPercent(activeRatio * 100),
      afkPercent: clampPercent((1 - activeRatio) * 100),
      consistencyBonus: round1(consistencyBonus),
      wordBonus: round1(wordBonus),
      errorPenalty: round1(errorPenalty),
      difficultyMultiplier: round2(difficultyMultiplier),
      perfectBonus,
      marathonBonus,
      // Konteks untuk tooltip/profil.
      correctChars,
      incorrectChars,
      correctWords,
      incorrectWords,
      accuracy,
      consistency,
      durationSeconds,
    },
  };
}

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Fallback: perkirakan EXP untuk entry skor LAMA (sebelum field `xp` tersimpan
 * di skor) supaya tabel riwayat/profile tetap bisa menampilkan angka yang
 * munasabah. Rumus sengaja dibuat SAMA dengan rumus lama di game-logic.js
 * (`wpm × akurasi × menit`) karena itulah rumus yang benar-benar dipakai saat
 * entry tersebut disimpan.
 *
 * @param {{wpm?:number, accuracy?:number, time?:number}} score
 * @returns {number}
 */
export function estimateLegacyXP(score = {}) {
  const wpm = Number(score.wpm) || 0;
  const accuracy = Math.max(0, Math.min(100, Number(score.accuracy) || 0));
  const minutes = (Number(score.time) || 0) / 60;
  return Math.round(wpm * (accuracy / 100) * minutes);
}
