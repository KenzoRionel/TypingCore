// js/history/history-chart.js
import { getHistoryDOMReferences } from '../utils/dom-elements.js';

let wpmChart = null;
let accuracyChart = null;

function cssVar(name, fallback = '') {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    return value || fallback;
}

// Chart.js butuh warna solid/rgba, bukan color-mix(), jadi token hex dari
// tema dikonversi manual ke rgba untuk area fill dan garis grid.
function toRgba(color, alpha) {
    const value = String(color || '').trim();
    if (!value.startsWith('#')) return value;

    let hex = value.slice(1);
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char + char)
            .join('');
    }
    if (hex.length !== 6) return value;

    const parsed = parseInt(hex, 16);
    if (!Number.isFinite(parsed)) return value;

    const r = (parsed >> 16) & 255;
    const g = (parsed >> 8) & 255;
    const b = parsed & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function getChartColors() {
    const textMuted = cssVar('--text-muted', '#6b6b6b');
    const text = cssVar('--text', '#1a1a1a');
    const border = cssVar('--border', 'rgba(0,0,0,0.12)');
    const accent = cssVar('--accent', '#3e63dd');
    const correct = cssVar('--correct', '#15803d');
    const surface = cssVar('--surface', '#f5f5f6');
    const card = cssVar('--bg', '#ffffff');

    return {
        text,
        textMuted,
        border,
        grid: toRgba(border, 0.85),
        accent,
        accentFill: toRgba(accent, 0.26),
        correct,
        correctFill: toRgba(correct, 0.22),
        surface,
        card,
    };
}

/**
 * Gradient vertikal di bawah garis. Scriptable supaya mengikuti ukuran chart
 * saat pertama kali digambar (chartArea belum ada di call pertama).
 */
function areaGradient(color, topAlpha) {
    return (context) => {
        const { ctx, chartArea } = context.chart;
        if (!chartArea) return toRgba(color, topAlpha * 0.5);

        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, toRgba(color, topAlpha));
        gradient.addColorStop(1, toRgba(color, 0));
        return gradient;
    };
}

/**
 * Rata-rata bergerak 3 titik (kiri-tengah-kanan) untuk garis tren.
 * Membuat naik-turun grafik lebih mudah dibaca dibanding garis mentah saja.
 */
function movingAverage(values) {
    return values.map((_, index) => {
        const start = Math.max(0, index - 1);
        const end = Math.min(values.length - 1, index + 1);
        let sum = 0;
        for (let i = start; i <= end; i++) sum += values[i];
        return Math.round(sum / (end - start + 1));
    });
}

function formatShortDate(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Chip ringkasan di samping judul grafik: nilai terakhir, terbaik, rata-rata.
 * Dibuat lewat DOM API supaya teks (yang berasal dari data localStorage)
 * tidak pernah ditafsirkan sebagai markup.
 */
function renderChartMeta(container, chips) {
    if (!container) return;

    let head = container.querySelector('.chart-head');
    if (!head) {
        head = document.createElement('div');
        head.className = 'chart-head';

        const title = container.querySelector('h2');
        if (title) {
            title.before(head);
            head.appendChild(title);
        } else {
            container.prepend(head);
        }

        const stats = document.createElement('div');
        stats.className = 'chart-stats';
        head.appendChild(stats);
    }

    const stats = head.querySelector('.chart-stats');
    if (!stats) return;
    stats.textContent = '';

    chips.forEach(({ label, value, tone, title }) => {
        const chip = document.createElement('span');
        chip.className = `chart-stat${tone ? ` is-${tone}` : ''}`;
        if (title) chip.title = title;

        const labelEl = document.createElement('span');
        labelEl.className = 'chart-stat-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('strong');
        valueEl.className = 'chart-stat-value';
        valueEl.textContent = value;

        chip.append(labelEl, valueEl);
        stats.appendChild(chip);
    });
}

/**
 * Catatan kecil di bawah grafik yang menjelaskan garis putus-putus.
 */
function renderChartFootnote(container, text) {
    if (!container) return;

    let foot = container.querySelector('.chart-footnote');
    if (!foot) {
        foot = document.createElement('p');
        foot.className = 'chart-footnote';
        container.appendChild(foot);
    }

    foot.textContent = '';

    const key = document.createElement('span');
    key.className = 'chart-line-key';
    key.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('span');
    copy.textContent = text;

    foot.append(key, copy);
}

function applyChartDefaults(colors) {
    Chart.defaults.color = colors.textMuted;
    Chart.defaults.font.family = '"Manrope", system-ui, sans-serif';
    Chart.defaults.borderColor = colors.grid;
    Chart.defaults.plugins.tooltip.backgroundColor = colors.surface;
    Chart.defaults.plugins.tooltip.titleColor = colors.text;
    Chart.defaults.plugins.tooltip.bodyColor = colors.textMuted;
    Chart.defaults.plugins.tooltip.borderColor = colors.border;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.displayColors = false;
    Chart.defaults.plugins.tooltip.titleFont = { weight: '700', size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
}

/**
 * Opsi skala yang dipakai kedua grafik.
 *
 * `offset: true` memberi jarak setengah kategori di kiri & kanan, sehingga
 * label "Tes 1"/"Tes terakhir" tidak lagi terpotong tepi area gambar.
 */
function buildScales(colors, yAxis) {
    return {
        x: {
            offset: true,
            grid: { display: false },
            border: { color: colors.grid },
            title: {
                display: true,
                text: 'Tes ke-',
                color: colors.textMuted,
                font: { size: 11, weight: '600' },
            },
            ticks: {
                color: colors.textMuted,
                autoSkip: true,
                maxRotation: 0,
                minRotation: 0,
                maxTicksLimit: 8,
                padding: 6,
                font: { size: 11 },
            },
        },
        y: yAxis,
    };
}

export function renderProgressCharts(scores) {
    const DOM = getHistoryDOMReferences();
    if (!DOM || !DOM.wpmProgressChart || !DOM.accuracyProgressChart) {
        console.warn('Chart canvas elements not found. Skipping chart rendering.');
        return;
    }

    const sortedScores = [...scores].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sortedScores.map((_, index) => String(index + 1));
    const wpmData = sortedScores.map((score) => Math.round(toNumber(score.wpm)));
    const accuracyData = sortedScores.map((score) => Math.round(toNumber(score.accuracy)));

    const total = sortedScores.length;
    const bestWpm = Math.max(...wpmData, 0);
    const avgWpm = total ? wpmData.reduce((sum, value) => sum + value, 0) / total : 0;
    const latestWpm = total ? wpmData[total - 1] : 0;
    const prevWpm = total > 1 ? wpmData[total - 2] : null;
    const wpmDelta = prevWpm === null ? null : latestWpm - prevWpm;

    const bestAccuracy = Math.max(...accuracyData, 0);
    const avgAccuracy = total
        ? accuracyData.reduce((sum, value) => sum + value, 0) / total
        : 0;
    const latestAccuracy = total ? accuracyData[total - 1] : 0;
    const prevAccuracy = total > 1 ? accuracyData[total - 2] : null;
    const accuracyDelta = prevAccuracy === null ? null : latestAccuracy - prevAccuracy;

    const trendWpm = total > 2 ? movingAverage(wpmData) : null;
    const trendAccuracy = total > 2 ? movingAverage(accuracyData) : null;

    if (wpmChart) wpmChart.destroy();
    if (accuracyChart) accuracyChart.destroy();
    wpmChart = null;
    accuracyChart = null;

    const colors = getChartColors();
    applyChartDefaults(colors);

    // ---------- WPM ----------
    const wpmContainer = DOM.wpmProgressChart.closest('.chart-container');
    renderChartMeta(wpmContainer, [
        {
            label: 'Terakhir',
            value: `${latestWpm} WPM`,
            tone: wpmDelta === null ? null : wpmDelta > 0 ? 'up' : wpmDelta < 0 ? 'down' : null,
            title:
                wpmDelta === null
                    ? 'Baru satu tes'
                    : `${wpmDelta >= 0 ? '+' : ''}${wpmDelta} WPM dibanding tes sebelumnya`,
        },
        { label: 'Terbaik', value: `${bestWpm} WPM`, tone: 'best' },
        { label: 'Rata-rata', value: `${Math.round(avgWpm)} WPM` },
    ]);
    renderChartFootnote(
        wpmContainer,
        total > 2
            ? 'Garis putus-putus menunjukkan tren rata-rata 3 tes terakhir.'
            : 'Garis putus-putus tren muncul saat sudah ada minimal 3 tes.'
    );

    const wpmDatasets = [
        {
            label: 'WPM',
            data: wpmData,
            borderColor: colors.accent,
            backgroundColor: areaGradient(colors.accent, 0.3),
            fill: true,
            tension: 0.32,
            borderWidth: 2.5,
            pointRadius: total > 24 ? 0 : 4,
            pointHoverRadius: 7,
            pointHitRadius: 16,
            pointBackgroundColor: colors.card,
            pointBorderColor: colors.accent,
            pointBorderWidth: 2.5,
            pointHoverBorderWidth: 3,
        },
    ];

    if (trendWpm) {
        wpmDatasets.push({
            label: 'Tren',
            data: trendWpm,
            borderColor: toRgba(colors.textMuted, 0.75),
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [6, 5],
            tension: 0.35,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
        });
    }

    wpmChart = new Chart(DOM.wpmProgressChart, {
        type: 'line',
        data: { labels, datasets: wpmDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 550, easing: 'easeOutQuart' },
            interaction: { mode: 'index', intersect: false },
            layout: { padding: { top: 6, right: 10, left: 2 } },
            scales: buildScales(colors, {
                beginAtZero: true,
                grace: '12%',
                border: { display: false },
                title: {
                    display: true,
                    text: 'WPM',
                    color: colors.textMuted,
                    font: { size: 11, weight: '600' },
                },
                ticks: {
                    color: colors.textMuted,
                    precision: 0,
                    padding: 6,
                    font: { size: 11 },
                },
                grid: { color: colors.grid },
            }),
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: (item) => item.datasetIndex === 0,
                    callbacks: {
                        title: (items) => {
                            const index = items[0]?.dataIndex ?? 0;
                            return `Tes ${index + 1} · ${formatShortDate(sortedScores[index]?.date)}`;
                        },
                        label: (context) => `WPM: ${Math.round(context.parsed.y)}`,
                        afterBody: (items) => {
                            const score = sortedScores[items[0]?.dataIndex ?? 0];
                            if (!score) return [];
                            const diff = Math.round(toNumber(score.wpm) - avgWpm);
                            return [
                                `Akurasi: ${Math.round(toNumber(score.accuracy))}%`,
                                `Durasi: ${Math.round(toNumber(score.time))}s`,
                                `Salah: ${Math.round(toNumber(score.errors))} karakter`,
                                `${diff >= 0 ? '+' : ''}${diff} dari rata-rata`,
                            ];
                        },
                    },
                },
            },
        },
    });

    // ---------- Akurasi ----------
    const accuracyContainer = DOM.accuracyProgressChart.closest('.chart-container');
    renderChartMeta(accuracyContainer, [
        {
            label: 'Terakhir',
            value: `${latestAccuracy}%`,
            tone:
                accuracyDelta === null
                    ? null
                    : accuracyDelta > 0
                      ? 'up'
                      : accuracyDelta < 0
                        ? 'down'
                        : null,
            title:
                accuracyDelta === null
                    ? 'Baru satu tes'
                    : `${accuracyDelta >= 0 ? '+' : ''}${accuracyDelta}% dibanding tes sebelumnya`,
        },
        { label: 'Terbaik', value: `${bestAccuracy}%`, tone: 'best' },
        { label: 'Rata-rata', value: `${Math.round(avgAccuracy)}%` },
    ]);
    renderChartFootnote(
        accuracyContainer,
        total > 2
            ? 'Garis putus-putus menunjukkan tren rata-rata 3 tes terakhir.'
            : 'Garis putus-putus tren muncul saat sudah ada minimal 3 tes.'
    );

    const accuracyDatasets = [
        {
            label: 'Akurasi',
            data: accuracyData,
            borderColor: colors.correct,
            backgroundColor: areaGradient(colors.correct, 0.26),
            fill: true,
            tension: 0.32,
            borderWidth: 2.5,
            pointRadius: total > 24 ? 0 : 4,
            pointHoverRadius: 7,
            pointHitRadius: 16,
            pointBackgroundColor: colors.card,
            pointBorderColor: colors.correct,
            pointBorderWidth: 2.5,
            pointHoverBorderWidth: 3,
        },
    ];

    if (trendAccuracy) {
        accuracyDatasets.push({
            label: 'Tren',
            data: trendAccuracy,
            borderColor: toRgba(colors.textMuted, 0.75),
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [6, 5],
            tension: 0.35,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
        });
    }

    accuracyChart = new Chart(DOM.accuracyProgressChart, {
        type: 'line',
        data: { labels, datasets: accuracyDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 550, easing: 'easeOutQuart' },
            interaction: { mode: 'index', intersect: false },
            layout: { padding: { top: 6, right: 10, left: 2 } },
            scales: buildScales(colors, {
                // Akurasi jarang turun jauh; mulai dari nilai terendah supaya
                // variasi kecil (95% vs 99%) tetap terlihat sebagai pergerakan.
                suggestedMin: Math.max(0, Math.min(95, Math.floor((Math.min(...accuracyData) - 5) / 5) * 5)),
                suggestedMax: 100,
                border: { display: false },
                title: {
                    display: true,
                    text: 'Akurasi (%)',
                    color: colors.textMuted,
                    font: { size: 11, weight: '600' },
                },
                ticks: {
                    color: colors.textMuted,
                    precision: 0,
                    padding: 6,
                    font: { size: 11 },
                    callback: (value) => `${value}%`,
                },
                grid: { color: colors.grid },
            }),
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: (item) => item.datasetIndex === 0,
                    callbacks: {
                        title: (items) => {
                            const index = items[0]?.dataIndex ?? 0;
                            return `Tes ${index + 1} · ${formatShortDate(sortedScores[index]?.date)}`;
                        },
                        label: (context) => `Akurasi: ${Math.round(context.parsed.y)}%`,
                        afterBody: (items) => {
                            const score = sortedScores[items[0]?.dataIndex ?? 0];
                            if (!score) return [];
                            const diff = Math.round(toNumber(score.accuracy) - avgAccuracy);
                            return [
                                `WPM: ${Math.round(toNumber(score.wpm))}`,
                                `Durasi: ${Math.round(toNumber(score.time))}s`,
                                `Salah: ${Math.round(toNumber(score.errors))} karakter`,
                                `${diff >= 0 ? '+' : ''}${diff}% dari rata-rata`,
                            ];
                        },
                    },
                },
            },
        },
    });
}

export function destroyCharts() {
    if (wpmChart) {
        wpmChart.destroy();
        wpmChart = null;
    }
    if (accuracyChart) {
        accuracyChart.destroy();
        accuracyChart = null;
    }
}
