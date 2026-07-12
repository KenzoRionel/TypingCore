// js/history/progress-charts-logic.js
//
// Logic MURNI (tidak bergantung React maupun DOM) untuk data section
// "Grafik Progress": line chart WPM harian + heatmap aktivitas gaya GitHub.
// Dihitung dari array skor dengan format yang SAMA dengan getTypingScores()
// di score-manager.js (localStorage key 'typingScores'), konsisten dengan
// pola pb-logic.js — supaya logic ini bisa dites/dipakai terpisah dari
// rendering, dan tetap "terhubung" dengan sumber data vanilla yang sama.
//
// Dipakai oleh: js/history/ProgressCharts.js

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date) {
  // 'YYYY-MM-DD' berdasarkan waktu LOKAL (bukan UTC), supaya konsisten
  // dengan skor yang disimpan pakai new Date().toISOString() lalu dibaca
  // ulang di timezone user.
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
 * Kelompokkan skor per hari (key 'YYYY-MM-DD'): total WPM & jumlah tes.
 * Skor tanpa `date` atau `wpm` valid diabaikan.
 */
function groupScoresByDay(scores) {
  const map = new Map();
  scores.forEach((s) => {
    if (!s || !s.date || typeof s.wpm !== 'number') return;
    const key = toDateKey(new Date(s.date));
    if (!map.has(key)) map.set(key, { totalWpm: 0, count: 0 });
    const entry = map.get(key);
    entry.totalWpm += s.wpm;
    entry.count += 1;
  });
  return map;
}

/**
 * Data untuk Line Chart "WPM N Hari Terakhir sampai hari ini".
 *
 * @param {Array} scores - array skor (biasanya dari getTypingScores())
 * @param {number} days - jumlah hari ke belakang (default 30)
 * @returns {Array<{date: string, label: string, wpm: number|null, average: number}>}
 *   - wpm: rata-rata WPM pada hari itu (dibulatkan), atau `null` jika tidak
 *     ada tes di hari tsb. Dibiarkan `null` (bukan 0) supaya saat dirender
 *     dengan `connectNulls` di Recharts, garis mengikuti naik-turun data
 *     ASLI antar hari yang ada tes, tidak drop palsu ke nol.
 *   - average: rata-rata keseluruhan WPM pada rentang `days` hari (nilai
 *     sama di setiap titik) — dipakai untuk garis rata-rata putus-putus.
 */
export function getWpmHistory(scores = [], days = 30) {
  const dayMap = groupScoresByDay(scores);
  const today = startOfDay(new Date());

  const points = [];
  let sum = 0;
  let count = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = toDateKey(d);
    const entry = dayMap.get(key);
    const wpm = entry ? Math.round(entry.totalWpm / entry.count) : null;

    if (wpm !== null) {
      sum += wpm;
      count += 1;
    }

    points.push({
      date: key,
      label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      wpm,
    });
  }

  const average = count > 0 ? Math.round(sum / count) : 0;
  return points.map((p) => ({ ...p, average }));
}

function getHeatmapLevel(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1; // 1-2 test
  if (count <= 4) return 2; // 3-4 test
  return 3; // 5+ test
}

/**
 * Data untuk Heatmap Aktivitas gaya GitHub: grid 7 baris (Minggu..Sabtu) x
 * `weeks` kolom (minggu), berakhir di minggu berjalan (hari ini).
 *
 * @param {Array} scores - array skor
 * @param {number} weeks - jumlah kolom/minggu ditampilkan (default 5)
 * @returns {Array<Array<{date, label, count, level}|null>>}
 *   Array kolom (per minggu, urut lama->baru), tiap kolom berisi 7 sel
 *   (Minggu..Sabtu). Sel `null` dipakai untuk hari yang belum terjadi
 *   (bagian minggu berjalan yang masih di masa depan), supaya grid tetap
 *   rapi 7 baris tapi sel itu tidak ikut digambar berwarna.
 */
export function getActivityHeatmap(scores = [], weeks = 5) {
  const dayMap = groupScoresByDay(scores);
  const today = startOfDay(new Date());
  const todayDow = today.getDay(); // 0 = Minggu

  const currentWeekSunday = new Date(today.getTime() - todayDow * DAY_MS);
  const alignedStart = new Date(currentWeekSunday.getTime() - (weeks - 1) * 7 * DAY_MS);

  const columns = [];
  for (let w = 0; w < weeks; w++) {
    const column = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(alignedStart.getTime() + (w * 7 + d) * DAY_MS);
      if (cellDate > today) {
        column.push(null);
        continue;
      }
      const key = toDateKey(cellDate);
      const entry = dayMap.get(key);
      const count = entry ? entry.count : 0;
      column.push({
        date: key,
        label: cellDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        count,
        level: getHeatmapLevel(count),
      });
    }
    columns.push(column);
  }
  return columns;
}