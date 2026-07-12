// js/history/FunStats.js
// Data diambil lewat fun-stats-logic.js (logic murni, tanpa React/DOM).

import React, { useMemo } from 'https://esm.sh/react@18.3.1';
import { getPageTypingEstimate, getProductiveHours, getFastestChar } from './fun-stats-logic.js';

const h = React.createElement;

function FunStatBox({ icon, title, text }) {
  return h(
    'div',
    { className: 'fun-stat-box' },
    h('i', { className: `fas ${icon} fun-stat-icon` }),
    h(
      'div',
      { className: 'fun-stat-body' },
      h('div', { className: 'fun-stat-title' }, title),
      h('div', { className: 'fun-stat-text' }, text)
    )
  );
}

export default function FunStats({ scores = [] }) {
  const pageEstimate = useMemo(() => getPageTypingEstimate(scores), [scores]);
  const productiveHours = useMemo(() => getProductiveHours(scores), [scores]);
  const fastestChar = useMemo(() => getFastestChar(scores), [scores]);

  return h(
    'section',
    { className: 'fun-stats-section' },
    h('h3', { className: 'fun-stats-section-title' }, 'Fun Stats'),
    h(
      'div',
      { className: 'fun-stats-grid' },
      h(FunStatBox, {
        icon: 'fa-file-lines',
        title: 'Setara Dengan',
        text: pageEstimate.label,
      }),
      h(FunStatBox, {
        icon: 'fa-clock',
        title: 'Jam Produktif',
        text: productiveHours.label,
      }),
      h(FunStatBox, {
        icon: 'fa-bolt-lightning',
        title: 'Huruf Tercepat',
        text: fastestChar.label,
      })
    )
  );
}