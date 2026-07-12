// js/history/fun-stats-logic.js
//
// Logic MURNI (tidak bergantung React/DOM) untuk section "Fun Stats": 3
// fakta ringan dari histori mengetik user (estimasi "setara dengan", jam
// paling produktif, dan huruf tercepat). Dihitung dari array skor format
// SAMA seperti getTypingScores() (score-manager.js) dan
// `replayData.keystrokes` (lihat catatan keterbatasan data replay di
// skill-analysis-logic.js — berlaku sama di sini).

const AVG_WORDS_PER_A4_PAGE = 500; // asumsi kasar: 1 halaman A4 teks ≈ 500 kata
const MIN_TESTS_FOR_PRODUCTIVE_HOUR = 3; // minimal tes dalam 1 jendela jam supaya tidak menyimpulkan dari 1 tes
const MIN_GAP_MS_FOR_FASTEST_CHAR = 30; // buang gap super kecil (kemungkinan anomali timestamp)

function idNumber(n) {
  return Math.round(n).toLocaleString('id-ID');
}

function getAllTimeAvgWpm(scores) {
  if (!scores.length) return 0;
  return Math.round(scores.reduce((sum, s) => sum + (s.wpm || 0), 0) / scores.length);
}

/**
 * "Setara dengan": berapa lama (menit + detik) untuk mengetik 1 halaman
 * A4 (~500 kata) pada WPM rata-rata seumur hidup user.
 */
export function getPageTypingEstimate(scores = []) {
  const avgWpm = getAllTimeAvgWpm(scores);
  if (avgWpm <= 0) {
    return { avgWpm: 0, minutes: 0, seconds: 0, label: 'Belum ada data' };
  }
  const totalMinutes = AVG_WORDS_PER_A4_PAGE / avgWpm;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);
  return {
    avgWpm,
    minutes,
    seconds,
    label: `${avgWpm} WPM = 1 halaman A4 dalam ${minutes}m ${seconds}d`,
  };
}

/**
 * Cari jendela 2 jam (mis. 21:00-23:00) dengan performa mengetik terbaik
 * (rata-rata WPM), disyaratkan minimal beberapa tes di jendela tsb supaya
 * satu tes kebetulan tinggi tidak "menang" begitu saja.
 */
export function getProductiveHours(scores = [], minTests = MIN_TESTS_FOR_PRODUCTIVE_HOUR) {
  const buckets = Array.from({ length: 24 }, () => ({ count: 0, totalWpm: 0 }));

  scores.forEach((s) => {
    if (!s || !s.date) return;
    const hour = new Date(s.date).getHours();
    buckets[hour].count += 1;
    buckets[hour].totalWpm += s.wpm || 0;
  });

  let best = { startHour: null, score: -1, count: 0 };

  for (let hour = 0; hour < 24; hour++) {
    const next = (hour + 1) % 24;
    const count = buckets[hour].count + buckets[next].count;
    if (count < minTests) continue;
    const totalWpm = buckets[hour].totalWpm + buckets[next].totalWpm;
    const avgWpm = totalWpm / count;
    if (avgWpm > best.score) {
      best = { startHour: hour, score: avgWpm, count };
    }
  }

  if (best.startHour === null) {
    return { startHour: null, endHour: null, label: 'Belum cukup data' };
  }

  const endHour = (best.startHour + 2) % 24;
  const fmt = (h) => `${String(h).padStart(2, '0')}:00`;
  return {
    startHour: best.startHour,
    endHour,
    avgWpm: Math.round(best.score),
    label: `${fmt(best.startHour)} - ${fmt(endHour)}`,
  };
}

/**
 * Cari huruf yang diketik paling cepat: jarak waktu terpendek antara dua
 * keystroke berurutan yang berakhir BENAR (bukan penghapusan), dari
 * seluruh `replayData.keystrokes` yang tersedia.
 */
export function getFastestChar(scores = [], minGapMs = MIN_GAP_MS_FOR_FASTEST_CHAR) {
  let best = null; // { char, gapMs }

  scores.forEach((s) => {
    const keystrokes = s && s.replayData && s.replayData.keystrokes;
    if (!Array.isArray(keystrokes) || keystrokes.length < 2) return;

    for (let i = 1; i < keystrokes.length; i++) {
      const prev = keystrokes[i - 1];
      const cur = keystrokes[i];
      if (!cur || cur.isDeletion || !cur.isCorrect) continue;
      if (!cur.char || cur.char.length !== 1) continue;
      const gap = (cur.timestamp || 0) - (prev.timestamp || 0);
      if (gap < minGapMs) continue; // buang gap yang tidak wajar (anomali timestamp)
      if (best === null || gap < best.gapMs) {
        best = { char: cur.char, gapMs: gap };
      }
    }
  });

  if (best === null) {
    return { char: null, seconds: null, label: 'Belum cukup data' };
  }

  const seconds = Math.round((best.gapMs / 1000) * 100) / 100;
  return {
    char: best.char,
    seconds,
    label: `'${best.char}' - ${seconds}s/char`,
  };
}