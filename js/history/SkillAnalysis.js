// js/history/SkillAnalysis.js
// Data (error rate per huruf, kalimat analisis) diambil lewat
// skill-analysis-logic.js (logic murni, tanpa React/DOM) yang membaca
// `replayData.keystrokes` di tiap skor — lihat catatan keterbatasan data
// di file tersebut.

import React, { useMemo } from 'https://esm.sh/react@18.3.1';
import { getKeyboardHeatmapData, getSkillAnalysisSummary } from './skill-analysis-logic.js';

const h = React.createElement;

// Layout QWERTY: tiap baris digeser (offset) supaya bentuknya "staggered"
// seperti keyboard fisik, bukan grid lurus.
const KEY_ROWS = [
  { keys: 'qwertyuiop'.split(''), offset: 0 },
  { keys: 'asdfghjkl'.split(''), offset: 29 },
  { keys: 'zxcvbnm'.split(''), offset: 58 },
];
const KEY_SIZE = 52;
const KEY_GAP = 6;
const STEP = KEY_SIZE + KEY_GAP;
const ROW1_WIDTH = KEY_ROWS[0].keys.length * STEP - KEY_GAP;
const SPACE_WIDTH = 300;
const SVG_WIDTH = ROW1_WIDTH;
const SVG_HEIGHT = KEY_ROWS.length * STEP + STEP; // +1 baris untuk tombol spasi

const LEVEL_COLOR_VAR = {
  low: 'var(--success)',
  mid: 'var(--warning)',
  high: 'var(--danger)',
  none: 'var(--tc-key-bg)',
};

function keyRect({ x, y, width = KEY_SIZE, char, level, errorRate, attempts }) {
  const tooltip =
    level === 'none'
      ? `${char.toUpperCase()}: belum cukup data`
      : `${char.toUpperCase()}: ${errorRate}% error (${attempts}x diketik)`;

  return h(
    'g',
    { key: `${char}-${x}` },
    h('rect', {
      x,
      y,
      width,
      height: KEY_SIZE,
      rx: 8,
      fill: LEVEL_COLOR_VAR[level],
      stroke: 'var(--tc-key-border)',
      strokeWidth: 1,
    }),
    h(
      'text',
      {
        x: x + width / 2,
        y: y + KEY_SIZE / 2 + 5,
        textAnchor: 'middle',
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        fontSize: 15,
        fill: level === 'none' ? 'var(--text-light)' : '#1a1a1a',
      },
      char.toUpperCase()
    ),
    h('title', null, tooltip)
  );
}

function KeyboardHeatmap({ heatmap }) {
  const rects = [];

  KEY_ROWS.forEach((row, rIdx) => {
    row.keys.forEach((char, i) => {
      const x = row.offset + i * STEP;
      const y = rIdx * STEP;
      const data = heatmap[char] || { level: 'none', errorRate: null, attempts: 0 };
      rects.push(keyRect({ x, y, char, ...data }));
    });
  });

  // Tombol spasi: ditampilkan netral (tidak per-huruf) karena hanya 1 tombol.
  const spaceX = (SVG_WIDTH - SPACE_WIDTH) / 2;
  const spaceY = KEY_ROWS.length * STEP;
  rects.push(
    h(
      'g',
      { key: 'space' },
      h('rect', {
        x: spaceX,
        y: spaceY,
        width: SPACE_WIDTH,
        height: KEY_SIZE,
        rx: 8,
        fill: 'var(--tc-key-light-bg)',
        stroke: 'var(--tc-key-border)',
        strokeWidth: 1,
      }),
      h(
        'text',
        {
          x: spaceX + SPACE_WIDTH / 2,
          y: spaceY + KEY_SIZE / 2 + 5,
          textAnchor: 'middle',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          fill: 'var(--text-light)',
        },
        'SPASI'
      )
    )
  );

  return h(
    'svg',
    {
      viewBox: `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`,
      width: '100%',
      style: { maxWidth: 620, display: 'block', margin: '0 auto' },
    },
    rects
  );
}

function HeatmapLegend() {
  return h(
    'div',
    { className: 'skill-heatmap-legend' },
    h(
      'span',
      { className: 'skill-legend-item' },
      h('span', { className: 'skill-legend-dot', style: { background: 'var(--success)' } }),
      '< 20% error'
    ),
    h(
      'span',
      { className: 'skill-legend-item' },
      h('span', { className: 'skill-legend-dot', style: { background: 'var(--warning)' } }),
      '20-40% error'
    ),
    h(
      'span',
      { className: 'skill-legend-item' },
      h('span', { className: 'skill-legend-dot', style: { background: 'var(--danger)' } }),
      '> 40% error'
    )
  );
}

export default function SkillAnalysis({ scores = [] }) {
  const heatmap = useMemo(() => getKeyboardHeatmapData(scores), [scores]);
  const analysis = useMemo(() => getSkillAnalysisSummary(scores), [scores]);

  return h(
    'section',
    { className: 'skill-analysis-section' },
    h('h3', { className: 'skill-analysis-title' }, 'Analisis Skill'),
    h(
      'div',
      { className: 'skill-analysis-card' },
      h(KeyboardHeatmap, { heatmap }),
      h(HeatmapLegend, null),
      h('p', { className: 'skill-analysis-text' }, analysis.fullText)
    )
  );
}