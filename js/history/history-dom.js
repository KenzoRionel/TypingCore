// js/history/history-dom.js
import { getHistoryDOMReferences } from '../utils/dom-elements.js';
import { loadReplay } from './typing-replay.js';

const MODE_LABELS = {
    default: 'Standar',
    quotes: 'Kutipan',
};

const LANGUAGE_LABELS = {
    id: 'ID',
    en: 'EN',
};

/* -------------------------------------------------------------------------
 * Helper kecil untuk membangun elemen. Semua teks masuk lewat textContent
 * (bukan innerHTML) supaya data dari localStorage tidak pernah ditafsirkan
 * sebagai markup.
 * ---------------------------------------------------------------------- */
function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
}

function createIcon(className, extraClass) {
    const icon = document.createElement('i');
    icon.className = extraClass ? `${className} ${extraClass}` : className;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function wpmTier(wpm) {
    if (wpm >= 80) return 'is-high';
    if (wpm >= 50) return 'is-mid';
    return 'is-low';
}

function accuracyTier(accuracy) {
    if (accuracy >= 95) return 'is-high';
    if (accuracy >= 85) return 'is-mid';
    return 'is-low';
}

/* -------------------------------------------------------------------------
 * Ringkasan di atas daftar: total tes, WPM terbaik, rata-rata akurasi.
 * ---------------------------------------------------------------------- */
function updateSummary(scores) {
    const total = scores.length;

    const countEl = document.getElementById('historyCount');
    if (countEl) countEl.textContent = `${total} tes`;

    const summaryEl = document.getElementById('historySummary');
    if (summaryEl) summaryEl.hidden = total === 0;

    const totalEl = document.getElementById('summaryTotal');
    if (totalEl) totalEl.textContent = String(total);

    const bestWpmEl = document.getElementById('summaryBestWpm');
    if (bestWpmEl) {
        const bestWpm = scores.reduce(
            (best, score) => Math.max(best, toNumber(score.wpm)),
            0
        );
        bestWpmEl.textContent = String(Math.round(bestWpm));
    }

    const avgAccEl = document.getElementById('summaryAvgAccuracy');
    if (avgAccEl) {
        const avgAccuracy = total
            ? scores.reduce((sum, score) => sum + toNumber(score.accuracy), 0) / total
            : 0;
        avgAccEl.textContent = `${Math.round(avgAccuracy)}%`;
    }
}

/* -------------------------------------------------------------------------
 * Satu kartu skor. Kartu bisa diklik (dan diaktifkan lewat keyboard) kalau
 * skor tersebut punya replayData.
 * ---------------------------------------------------------------------- */
function createScoreCard(score, { index, isBest, formatDate }) {
    const wpm = Math.round(toNumber(score.wpm));
    const accuracy = Math.max(0, Math.min(100, toNumber(score.accuracy)));
    const time = Math.round(toNumber(score.time));
    const errors = toNumber(score.errors);
    const correctWords = toNumber(score.correctWords);
    const incorrectWords = toNumber(score.incorrectWords);
    const hasReplay = Boolean(score.replayData);

    const dateText = formatDate(score.date);
    const typeText = score.type || 'Tes Mengetik';
    const modeText = MODE_LABELS[score.mode] || score.mode || 'Standar';
    const languageText = LANGUAGE_LABELS[score.language] || null;

    const card = createEl('li', 'score-card');
    if (hasReplay) card.classList.add('is-clickable');
    if (isBest) card.classList.add('is-best');

    card.setAttribute(
        'aria-label',
        `Tes ${index + 1}, ${wpm} WPM, akurasi ${Math.round(accuracy)} persen, ${dateText}. ${
            hasReplay ? 'Klik untuk memutar replay.' : 'Replay tidak tersedia.'
        }`
    );

    // ---- Nomor urut tes (urutan kronologis, bukan urutan tampil) ----
    const rank = createEl('div', 'score-rank');
    rank.appendChild(createEl('span', 'score-rank-number', index + 1));
    rank.appendChild(createEl('span', 'score-rank-label', 'Tes'));
    card.appendChild(rank);

    // ---- WPM + akurasi ----
    const main = createEl('div', 'score-main');

    const wpmWrap = createEl('div', 'score-wpm');
    const wpmValue = createEl('span', `score-wpm-value ${wpmTier(wpm)}`, wpm);
    wpmWrap.appendChild(wpmValue);
    wpmWrap.appendChild(createEl('span', 'score-wpm-unit', 'WPM'));

    if (isBest) {
        const bestBadge = createEl('span', 'score-badge score-badge--best');
        bestBadge.appendChild(createIcon('fa-solid fa-crown'));
        bestBadge.appendChild(createEl('span', null, 'Terbaik'));
        wpmWrap.appendChild(bestBadge);
    }
    main.appendChild(wpmWrap);

    const accWrap = createEl('div', 'score-accuracy');
    const accHead = createEl('div', 'score-accuracy-head');
    accHead.appendChild(createEl('span', 'score-accuracy-label', 'Akurasi'));
    accHead.appendChild(
        createEl('span', `score-accuracy-value ${accuracyTier(accuracy)}`, `${Math.round(accuracy)}%`)
    );
    accWrap.appendChild(accHead);

    const bar = createEl('div', 'score-bar');
    const barFill = createEl('span', `score-bar-fill ${accuracyTier(accuracy)}`);
    barFill.style.width = `${accuracy}%`;
    bar.appendChild(barFill);
    accWrap.appendChild(bar);
    main.appendChild(accWrap);

    card.appendChild(main);

    // ---- Detail angka ----
    const details = createEl('div', 'score-details');

    const detailItems = [
        { icon: 'fa-regular fa-clock', text: `${time}s`, title: 'Durasi tes' },
        { icon: 'fa-solid fa-xmark', text: `${errors} salah`, title: 'Karakter salah' },
        {
            icon: 'fa-solid fa-check',
            text: `${correctWords} kata benar`,
            title: 'Kata benar',
        },
        {
            icon: 'fa-solid fa-triangle-exclamation',
            text: `${incorrectWords} kata salah`,
            title: 'Kata salah',
        },
    ];

    detailItems.forEach(({ icon, text, title }) => {
        const item = createEl('span', 'score-detail');
        item.title = title;
        item.appendChild(createIcon(icon));
        item.appendChild(createEl('span', null, text));
        details.appendChild(item);
    });

    card.appendChild(details);

    // ---- Tanggal + tag jenis tes/mode/bahasa ----
    const meta = createEl('div', 'score-meta');

    const dateEl = createEl('span', 'score-date');
    dateEl.appendChild(createIcon('fa-regular fa-calendar'));
    dateEl.appendChild(createEl('span', null, dateText));
    meta.appendChild(dateEl);

    const tags = createEl('div', 'score-tags');
    tags.appendChild(createEl('span', 'score-tag', typeText));
    tags.appendChild(createEl('span', 'score-tag score-tag--muted', modeText));
    if (languageText) {
        tags.appendChild(createEl('span', 'score-tag score-tag--muted', languageText));
    }
    meta.appendChild(tags);

    card.appendChild(meta);

    // ---- Aksi replay ----
    const action = createEl(
        'span',
        `score-action ${hasReplay ? 'is-available' : 'is-unavailable'}`
    );
    action.title = hasReplay ? 'Putar replay tes ini' : 'Replay tidak tersedia';
    action.appendChild(
        createIcon(hasReplay ? 'fa-solid fa-circle-play' : 'fa-solid fa-ban')
    );
    action.appendChild(createEl('span', 'score-action-text', hasReplay ? 'Replay' : 'Tanpa replay'));
    card.appendChild(action);

    if (hasReplay) {
        card.tabIndex = 0;
        card.setAttribute('role', 'button');

        const activate = () => {
            loadReplay(index);
            const replayContainer = document.getElementById('replay-container');
            if (replayContainer) {
                replayContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        card.addEventListener('click', activate);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                event.preventDefault();
                activate();
            }
        });
    }

    return card;
}

/**
 * Render daftar skor sebagai kartu (terbaru di atas). Nomor "Tes" tetap
 * memakai urutan kronologis asli, dan index asli tetap dipakai saat memanggil
 * loadReplay() supaya replay tidak tertukar.
 */
export function renderScoreList(scores, formatDate) {
    const DOM = getHistoryDOMReferences();
    if (!DOM || !DOM.scoreHistoryList) return;

    const list = DOM.scoreHistoryList;
    list.innerHTML = '';

    updateSummary(scores);

    if (!scores.length) {
        renderEmptyScoreState();
        return;
    }

    const bestWpm = scores.reduce(
        (best, score) => Math.max(best, toNumber(score.wpm)),
        0
    );

    const cards = createEl('ul', 'score-cards');

    scores
        .map((score, index) => ({ score, index }))
        .reverse() // terbaru di atas; index tetap index asli
        .forEach(({ score, index }) => {
            const isBest = toNumber(score.wpm) === bestWpm && bestWpm > 0;
            cards.appendChild(createScoreCard(score, { index, isBest, formatDate }));
        });

    list.appendChild(cards);
}

/**
 * Empty state dengan CTA ke halaman tes. Dipakai saat belum ada skor sama
 * sekali, dan juga oleh markup awal score-history.html.
 */
export function renderEmptyScoreState(
    message = 'Selesaikan satu tes mengetik untuk mulai mengisi riwayatmu.'
) {
    const DOM = getHistoryDOMReferences();
    if (!DOM || !DOM.scoreHistoryList) return;

    const list = DOM.scoreHistoryList;
    list.innerHTML = '';

    const empty = createEl('div', 'score-empty');
    empty.appendChild(createIcon('fa-solid fa-keyboard'));

    empty.appendChild(createEl('h3', null, 'Belum ada riwayat skor'));
    empty.appendChild(createEl('p', null, message));

    const cta = createEl('a', 'score-empty-cta');
    cta.href = 'index.html';
    cta.appendChild(createIcon('fa-solid fa-play'));
    cta.appendChild(createEl('span', null, 'Mulai Mengetik'));
    empty.appendChild(cta);

    list.appendChild(empty);

    const countEl = document.getElementById('historyCount');
    if (countEl) countEl.textContent = '0 tes';

    const summaryEl = document.getElementById('historySummary');
    if (summaryEl) summaryEl.hidden = true;
}
