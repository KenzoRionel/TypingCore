// js/history/pb-logic.js
//
// Logic MURNI (tidak bergantung React maupun DOM) untuk menghitung Personal
// Best (PB) per mode dari array skor (format sama dengan localStorage
// 'typingScores', lihat score-manager.js). Modul ini dipakai oleh DUA
// implementasi:
//   - Vanilla: js/history/pb-manager.js (render ke profile.html)
//   - React:   js/history/PBCards.jsx
// Supaya keduanya selalu konsisten, jangan duplikasi rumus PB di tempat lain.

/**
 * Definisi 4 mode yang ditampilkan sebagai Personal Best Card.
 * `time`     : durasi tes dalam detik (cocok dengan field `score.time`)
 * `language` : 'id' | 'en' (lihat catatan di bawah)
 * `quote`    : true untuk mode Quotes (tidak berbasis durasi/bahasa)
 */
export const PB_MODES = [
  { key: '60-id', label: '60s Indonesia', time: 60, language: 'id' },
  { key: '30-id', label: '30s Indonesia', time: 30, language: 'id' },
  { key: '15-en', label: '15s English', time: 15, language: 'en' },
  { key: 'quotes', label: 'Quotes', quote: true },
];

// CATATAN PENTING:
// Sebelum perubahan ini, entry skor (lihat score-manager.js) TIDAK menyimpan
// bahasa tes sama sekali. Field `language` baru ditambahkan di saveScore()
// dan diisi oleh game-logic.js saat menyimpan skor. Untuk skor LAMA yang
// sudah tersimpan di localStorage sebelum perubahan ini, field `language`
// akan undefined — pada kasus itu kita anggap 'id' (default), karena Bahasa
// Indonesia adalah pilihan bawaan aplikasi saat ini.
//
// Mode "Quotes" dideteksi lewat teks pada field `mode`/`type`, karena file
// logic untuk mode Quotes belum ada di antara file yang diedit di sini. Jika
// nanti mode Quotes dibuat, pastikan ia mengisi mode/type dengan kata
// "quote" atau "kutipan" (case-insensitive), atau sesuaikan isQuoteScore().

function isQuoteScore(score) {
  const haystack = `${score.mode || ''} ${score.type || ''}`.toLowerCase();
  return haystack.includes('quote') || haystack.includes('kutipan');
}

function matchesMode(score, modeDef) {
  if (modeDef.quote) return isQuoteScore(score);
  if (isQuoteScore(score)) return false;
  const scoreLanguage = score.language || 'id';
  return Number(score.time) === modeDef.time && scoreLanguage === modeDef.language;
}

/**
 * Hitung Personal Best untuk keempat mode di PB_MODES.
 * @param {Array} scores - array skor dari getTypingScores()
 * @returns {Array} salah satu dari:
 *   { key, label, hasData: false }
 *   { key, label, hasData: true, wpm, accuracy, date }
 */
export function getPersonalBests(scores = []) {
  return PB_MODES.map((modeDef) => {
    const candidates = scores.filter((s) => matchesMode(s, modeDef));

    if (candidates.length === 0) {
      return { key: modeDef.key, label: modeDef.label, hasData: false };
    }

    const best = candidates.reduce((a, b) => (b.wpm > a.wpm ? b : a));

    return {
      key: modeDef.key,
      label: modeDef.label,
      hasData: true,
      wpm: best.wpm,
      accuracy: best.accuracy,
      date: best.date,
    };
  });
}

/**
 * Format tanggal PB menjadi "12 Jul 2026" (locale id-ID).
 */
export function formatPBDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}