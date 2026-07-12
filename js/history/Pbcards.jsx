// js/history/PBCards.jsx
//
// Komponen React untuk section "Personal Best Cards", ditempatkan di bawah
// ProfileHeader. Memakai logic yang SAMA dengan versi vanilla (pb-manager.js)
// lewat pb-logic.js, supaya kedua versi selalu konsisten menghitung PB.
//
// Cara pakai:
//   import PBCards from './PBCards';
//   <PBCards scores={JSON.parse(localStorage.getItem('typingScores') || '[]')} />

import React, { useMemo } from 'react';
import { getPersonalBests, formatPBDate } from './pb-logic';

export default function PBCards({ scores = [], onTryNow }) {
  const personalBests = useMemo(() => getPersonalBests(scores), [scores]);

  const handleTryNow = (modeKey) => {
    if (onTryNow) {
      onTryNow(modeKey);
    } else {
      window.location.href = 'index.html';
    }
  };

  return (
    <section className="pb-section">
      <h3 className="pb-section-title">Personal Best</h3>
      <div className="pb-cards-grid">
        {personalBests.map((pb) => (
          <div
            key={pb.key}
            className={`pb-card${pb.hasData ? '' : ' pb-card--empty'}`}
            data-mode={pb.key}
          >
            <div className="pb-card-mode">{pb.label}</div>

            {pb.hasData ? (
              <>
                <div className="pb-card-wpm">
                  {pb.wpm}
                  <span className="pb-card-wpm-unit">WPM</span>
                </div>
                <div className="pb-card-meta">
                  Acc: {pb.accuracy}% | {formatPBDate(pb.date)}
                </div>
              </>
            ) : (
              <>
                <div className="pb-card-empty-text">Belum ada data</div>
                <button
                  type="button"
                  className="pb-card-cta"
                  onClick={() => handleTryNow(pb.key)}
                >
                  Coba Sekarang
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}