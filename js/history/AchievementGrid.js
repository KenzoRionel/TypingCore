// js/history/AchievementGrid.js
// Versi React di URL berikut SENGAJA dipin sama persis dengan yang dipakai
// di ProgressCharts.js / profile.html, supaya tidak ada dua instance React
// berbeda ter-load bersamaan (penyebab umum error "Invalid hook call").
//
// Data (status unlock 9 badge, Next Goal WPM, Milestone kata total)
// diambil lewat achievement-logic.js (logic murni, tanpa React/DOM) yang
// membaca array skor dengan format SAMA seperti getTypingScores() di
// score-manager.js.

import React, { useMemo } from 'https://esm.sh/react@18.3.1';
import { getAchievements, getNextWpmGoal, getWordMilestone } from './achievement-logic.js';

const h = React.createElement;

function AchievementBadge({ achievement }) {
  const { name, icon, desc, unlocked, progress, target } = achievement;
  const hasProgressBar = !unlocked && progress !== undefined && target !== undefined;
  const progressPercent = hasProgressBar
    ? Math.min(100, Math.round((progress / target) * 100))
    : null;

  return h(
    'div',
    {
      className: `achievement-card${unlocked ? '' : ' achievement-card--locked'}`,
      // Hover tampilkan deskripsi lewat native tooltip browser (title),
      // konsisten dengan pola yang sudah dipakai di history-dom.js.
      title: desc || name,
    },
    h('div', { className: 'achievement-icon' }, h('i', { className: `fas ${icon}` })),
    h('div', { className: 'achievement-name' }, name),
    unlocked
      ? h(
          'div',
          { className: 'achievement-status' },
          h('i', { className: 'fas fa-check' }),
          ' Unlocked'
        )
      : h(
          'div',
          { className: 'achievement-progress-wrap' },
          hasProgressBar
            ? h(
                'div',
                { className: 'achievement-progress-bar' },
                h('div', {
                  className: 'achievement-progress-fill',
                  style: { width: `${progressPercent}%` },
                })
              )
            : null,
          h(
            'div',
            { className: 'achievement-progress-text' },
            hasProgressBar ? `${progress}/${target}` : 'Terkunci'
          )
        )
  );
}

function NextGoalBox({ scores }) {
  const goal = useMemo(() => getNextWpmGoal(scores), [scores]);

  const text =
    goal.nextTarget === null
      ? `Kamu sudah melampaui semua target WPM (PB: ${goal.currentBest})!`
      : `Target berikutnya: ${goal.nextTarget} WPM. Kurang ${goal.remaining} WPM lagi`;

  return h(
    'div',
    { className: 'goal-box' },
    h('i', { className: 'fas fa-bullseye goal-box-icon' }),
    h(
      'div',
      { className: 'goal-box-body' },
      h('div', { className: 'goal-box-title' }, 'Next Goal'),
      h('div', { className: 'goal-box-text' }, text)
    )
  );
}

function MilestoneBox({ scores }) {
  const milestone = useMemo(() => getWordMilestone(scores), [scores]);
  const text = `${milestone.remaining.toLocaleString('id-ID')} kata lagi menuju ${milestone.nextMilestone.toLocaleString(
    'id-ID'
  )} kata total`;

  return h(
    'div',
    { className: 'goal-box' },
    h('i', { className: 'fas fa-flag-checkered goal-box-icon' }),
    h(
      'div',
      { className: 'goal-box-body' },
      h('div', { className: 'goal-box-title' }, 'Milestone Terdekat'),
      h('div', { className: 'goal-box-text' }, text)
    )
  );
}

export default function AchievementGrid({ scores = [] }) {
  const achievements = useMemo(() => getAchievements(scores), [scores]);

  return h(
    'section',
    { className: 'achievement-section' },
    h('h3', { className: 'achievement-section-title' }, 'Achievement & Goals'),
    h(
      'div',
      { className: 'achievement-grid' },
      achievements.map((a) => h(AchievementBadge, { key: a.id, achievement: a }))
    ),
    h(
      'div',
      { className: 'goal-boxes-grid' },
      h(NextGoalBox, { scores }),
      h(MilestoneBox, { scores })
    )
  );
}