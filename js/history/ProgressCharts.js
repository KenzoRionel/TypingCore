// js/history/ProgressCharts.js

// Versi React/Recharts di URL berikut SENGAJA dipin sama persis dengan yang
// dipakai di profile.html, supaya tidak ada dua instance React berbeda
// ter-load bersamaan (penyebab umum error "Invalid hook call").
//
// Data diambil lewat progress-charts-logic.js (logic murni, tanpa
// React/DOM) yang membaca array skor dengan format SAMA seperti
// getTypingScores() di score-manager.js.

import React, { useMemo, useState } from 'https://esm.sh/react@18.3.1';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'https://esm.sh/recharts@2.15.0?deps=react@18.3.1,react-dom@18.3.1';
import { getWpmHistory, getActivityHeatmap } from './progress-charts-logic.js';

const h = React.createElement;

const DAY_ROW_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
// Hanya tampilkan label di baris Sen/Rab/Jum (index 1,3,5) biar rapi & tidak
// penuh, mirip GitHub.
const VISIBLE_ROW_LABEL_INDEXES = new Set([1, 3, 5]);

function WpmTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  if (point.wpm === null || point.wpm === undefined) return null;
  return h(
    'div',
    { className: 'progress-chart-tooltip' },
    h('div', { className: 'progress-chart-tooltip-date' }, label),
    h('div', { className: 'progress-chart-tooltip-wpm' }, `${point.wpm} WPM`)
  );
}

function ActivityHeatmap({ scores }) {
  const columns = useMemo(() => getActivityHeatmap(scores, 5), [scores]);
  const [hovered, setHovered] = useState(null);

  return h(
    'div',
    { className: 'heatmap-wrap' },
    h(
      'div',
      { className: 'heatmap-body' },
      h(
        'div',
        { className: 'heatmap-row-labels' },
        DAY_ROW_LABELS.map((text, i) =>
          h(
            'span',
            { key: i, className: 'heatmap-row-label' },
            VISIBLE_ROW_LABEL_INDEXES.has(i) ? text : ''
          )
        )
      ),
      h(
        'div',
        { className: 'heatmap-scroll' },
        h(
          'div',
          { className: 'heatmap-grid' },
          columns.map((column, wIdx) =>
            h(
              'div',
              { className: 'heatmap-column', key: wIdx },
              column.map((cell, dIdx) =>
                h('div', {
                  key: dIdx,
                  className: 'heatmap-cell',
                  'data-level': cell ? cell.level : 'none',
                  title: cell ? `${cell.count} test, ${cell.label}` : '',
                  onMouseEnter: () => cell && setHovered(cell),
                  onMouseLeave: () => setHovered((hCur) => (hCur === cell ? null : hCur)),
                })
              )
            )
          )
        )
      )
    ),
    h(
      'div',
      { className: 'heatmap-footer' },
      h(
        'div',
        { className: `heatmap-hint${hovered ? ' is-active' : ''}` },
        hovered ? `${hovered.count} test, ${hovered.label}` : 'Arahkan kursor ke kotak untuk detail'
      ),
      h(
        'div',
        { className: 'heatmap-legend' },
        h('span', null, 'Sedikit'),
        [0, 1, 2, 3].map((lvl) =>
          h('span', { key: lvl, className: 'heatmap-cell heatmap-legend-cell', 'data-level': lvl })
        ),
        h('span', null, 'Banyak')
      )
    )
  );
}

export default function ProgressCharts({ scores = [] }) {
  const wpmHistory = useMemo(() => getWpmHistory(scores, 30), [scores]);
  const totalTests = scores.length;
  const HAS_ENOUGH_DATA = totalTests >= 5;

  if (!HAS_ENOUGH_DATA) {
    const progressPercent = Math.min(100, Math.round((totalTests / 5) * 100));
    return h(
      'section',
      { className: 'progress-section' },
      h('h3', { className: 'progress-section-title' }, 'Grafik Progress'),
      h(
        'div',
        { className: 'progress-locked' },
        h(
          'p',
          { className: 'progress-locked-text' },
          'Selesaikan 5 test untuk membuka grafik progress'
        ),
        h(
          'div',
          { className: 'progress-locked-bar' },
          h('div', {
            className: 'progress-locked-bar-fill',
            style: { width: `${progressPercent}%` },
          })
        ),
        h('span', { className: 'progress-locked-count' }, `${totalTests}/5 test`)
      )
    );
  }

  const average = wpmHistory[0]?.average ?? 0;
  const tickInterval = Math.max(0, Math.ceil(wpmHistory.length / 6) - 1);

  return h(
    'section',
    { className: 'progress-section' },
    h('h3', { className: 'progress-section-title' }, 'Grafik Progress'),
    h(
      'div',
      { className: 'progress-charts-grid' },
      h(
        'div',
        { className: 'progress-chart-card' },
        h('div', { className: 'progress-chart-card-title' }, 'WPM 30 Hari Terakhir'),
        h(
          'div',
          { className: 'wpm-chart-container' },
          h(
            ResponsiveContainer,
            { width: '100%', height: 220 },
            h(
              LineChart,
              { data: wpmHistory, margin: { top: 8, right: 12, left: -16, bottom: 0 } },
              h(CartesianGrid, {
                strokeDasharray: '3 3',
                stroke: 'var(--tc-key-border)',
                vertical: false,
              }),
              h(XAxis, {
                dataKey: 'label',
                tick: { fontSize: 11, fill: 'var(--text-light)' },
                interval: tickInterval,
                axisLine: { stroke: 'var(--tc-key-border)' },
                tickLine: false,
              }),
              h(YAxis, {
                tick: { fontSize: 11, fill: 'var(--text-light)' },
                axisLine: false,
                tickLine: false,
                width: 32,
                domain: ['dataMin - 5', 'dataMax + 5'],
              }),
              h(Tooltip, { content: h(WpmTooltip) }),
              h(ReferenceLine, {
                y: average,
                stroke: 'var(--tc-amber)',
                strokeDasharray: '6 4',
                strokeWidth: 1.5,
                label: {
                  value: `Rata-rata ${average} WPM`,
                  position: 'insideTopRight',
                  fill: 'var(--tc-amber)',
                  fontSize: 11,
                },
              }),
              h(Line, {
                type: 'monotone',
                dataKey: 'wpm',
                stroke: 'var(--tc-tier-speedster)',
                strokeWidth: 2.5,
                dot: false,
                connectNulls: true,
                activeDot: { r: 4 },
              })
            )
          )
        )
      ),
      h(
        'div',
        { className: 'progress-chart-card' },
        h('div', { className: 'progress-chart-card-title' }, 'Aktivitas Mengetik'),
        h(ActivityHeatmap, { scores })
      )
    )
  );
}