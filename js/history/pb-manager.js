// js/history/pb-manager.js
//
// Versi vanilla dari komponen Personal Best Cards. Pakai logic yang sama
// dengan PBCards.jsx (lihat pb-logic.js) supaya rumus PB tidak pernah
// bercabang antara dua implementasi.

import { getPersonalBests, formatPBDate } from './pb-logic.js';

function cardHTML(pb) {
  if (!pb.hasData) {
    return `
      <div class="pb-card pb-card--empty" data-mode="${pb.key}">
        <div class="pb-card-mode">${pb.label}</div>
        <div class="pb-card-empty-text">Belum ada data</div>
        <button type="button" class="pb-card-cta" data-pb-try="${pb.key}">
          Coba Sekarang
        </button>
      </div>
    `;
  }

  return `
    <div class="pb-card" data-mode="${pb.key}">
      <div class="pb-card-mode">${pb.label}</div>
      <div class="pb-card-wpm">${pb.wpm}<span class="pb-card-wpm-unit">WPM</span></div>
      <div class="pb-card-meta">Acc: ${pb.accuracy}% | ${formatPBDate(pb.date)}</div>
    </div>
  `;
}

/**
 * Render 4 PB Card ke dalam elemen dengan id="pbCardsGrid".
 * @param {Array} scores - array skor (biasanya dari getTypingScores())
 */
export function renderPBCards(scores) {
  const container = document.getElementById('pbCardsGrid');
  if (!container) return;

  const personalBests = getPersonalBests(scores);
  container.innerHTML = personalBests.map(cardHTML).join('');

  container.querySelectorAll('[data-pb-try]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Arahkan user langsung ke halaman tes untuk mulai mengisi PB ini
      window.location.href = 'index.html';
    });
  });
}