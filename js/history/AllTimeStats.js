// js/history/AllTimeStats.js
// Data diambil lewat all-time-stats-logic.js (logic murni, tanpa
// React/DOM), dihitung dari array skor format SAMA seperti
// getTypingScores() (score-manager.js).

import React, { useMemo } from 'https://esm.sh/react@18.3.1';
import { getAllTimeStats } from './all-time-stats-logic.js';
import { ensureAccumulatorInitialized } from './all-time-accumulator.js';

const h = React.createElement;

function StatCell({ label, value }) {
  return h(
    'div',
    { className: 'ats-cell' },
    h('div', { className: 'ats-cell-label' }, label),
    h('div', { className: 'ats-cell-value' }, value)
  );
}

export default function AllTimeStats({ scores = [] }) {
  const stats = useMemo(() => {
    // ensureAccumulatorInitialized aman dipanggil berulang kali: kalau
    // accumulator sudah ada, ia hanya membaca (tidak menulis ulang) —
    // hanya melakukan migrasi/baseline sekali di percobaan pertama.
    const accumulator = ensureAccumulatorInitialized(scores);
    return getAllTimeStats(scores, accumulator);
  }, [scores]);

  const diffLabel =
    stats.vsAllTimeDiff === 0
      ? '±0 WPM'
      : `${stats.vsAllTimeDiff > 0 ? '+' : ''}${stats.vsAllTimeDiff} WPM`;

  return h(
    'section',
    { className: 'ats-section' },
    h('h3', { className: 'ats-section-title' }, 'All-Time Stats'),
    h(
      'div',
      { className: 'ats-grid' },
      h(StatCell, { label: 'Total Waktu Latihan', value: stats.totalDurationLabel }),
      h(StatCell, { label: 'Total Kata', value: stats.totalWordsLabel }),
      h(StatCell, { label: 'Karakter', value: stats.charsLabel }),
      h(StatCell, { label: 'Top Burst', value: stats.topBurstLabel }),
      h(StatCell, { label: 'Rata-rata 10 Test', value: `${stats.avgLast10Wpm} WPM` }),
      h(StatCell, { label: 'vs All-time', value: diffLabel })
    )
  );
}