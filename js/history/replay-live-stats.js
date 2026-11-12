/**
 * js/history/replay-live-stats.js
 *
 * Statistik live untuk panel replay mengetik.
 *
 * Semua angka diturunkan dari `score.replayData.keystrokes[]` yang sudah
 * tersimpan (tidak ada perhitungan ulang dari tes asli):
 *  - WPM & akurasi   -> snapshot kumulatif yang direkam saat tes berlangsung
 *  - karakter        -> dihitung dari isi keystroke (benar/salah, minus hapus)
 *  - konsistensi     -> simpangan baku WPM per detik (rumus yang sama dengan
 *                       computeConsistency() di js/game/game-logic.js)
 *
 * Grafik digambar bertahap mengikuti posisi replay, jadi datanya "tumbuh"
 * seiring waktu berjalan.
 */

const DEFAULT_SECONDS = 1;
const MAX_SECONDS = 3600;

function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Rata-rata bergerak simetris (jendela 2*radius+1). Dipakai untuk garis
 * grafik live supaya naik-turun per detik tidak terlihat patah-patah;
 * nilai statistik di kartu tetap memakai data mentah.
 */
function smoothSeries(values, radius = 2) {
    const total = values.length;
    if (total === 0) return [];

    return values.map((_, index) => {
        const start = Math.max(0, index - radius);
        const end = Math.min(total - 1, index + radius);
        let sum = 0;
        for (let i = start; i <= end; i++) sum += values[i];
        return Math.round(sum / (end - start + 1));
    });
}

function cssVar(name, fallback = '') {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    return value || fallback;
}

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

function getColors() {
    return {
        text: cssVar('--text-muted', '#6b6b6b'),
        title: cssVar('--text', '#1a1a1a'),
        border: cssVar('--border', 'rgba(0,0,0,0.12)'),
        grid: toRgba(cssVar('--border', '#e2e2e4'), 0.8),
        accent: cssVar('--accent', '#3e63dd'),
        correct: cssVar('--correct', '#15803d'),
        surface: cssVar('--surface', '#f5f5f6'),
        card: cssVar('--bg', '#ffffff'),
    };
}

// Garis vertikal "sekarang" supaya posisi yang sedang diputar jelas terlihat.
const nowMarkerPlugin = {
    id: 'replayNowMarker',
    afterDatasetsDraw(chart) {
        const second = chart.$replayNowSecond;
        const area = chart.chartArea;
        if (typeof second !== 'number' || second < 0 || !area) return;

        const colors = getColors();
        const x = chart.scales.x.getPixelForValue(second);
        if (!Number.isFinite(x)) return;

        chart.ctx.save();
        chart.ctx.beginPath();
        chart.ctx.setLineDash([4, 4]);
        chart.ctx.strokeStyle = toRgba(colors.text, 0.5);
        chart.ctx.lineWidth = 1;
        chart.ctx.moveTo(x, area.top);
        chart.ctx.lineTo(x, area.bottom);
        chart.ctx.stroke();
        chart.ctx.restore();
    },
};

export class ReplayLiveStats {
    constructor({ root } = {}) {
        this.root = root || null;
        this.data = null;
        this.chart = null;
        this.attached = false;
        this._lastSignature = '';
        this._lastSecond = -1;

        this._onThemeChange = () => this.refreshTheme();
        document.addEventListener('themechange', this._onThemeChange);
    }

    _el(id) {
        return document.getElementById(id);
    }

    _setText(el, value) {
        if (el && el.textContent !== value) el.textContent = value;
    }

    /**
     * Bangun seluruh seri data dari skor yang dipilih.
     * O(n) sekali per load, update berikutnya cukup O(1) per frame.
     *
     * @param {Array} keystrokes
     * @param {{ timeline?: number[], totalDurationSec?: number, key?: string }} options
     *  `timeline` adalah waktu virtual replay (ms, sudah dinormalisasi
     *  TypingRecorder.computePlaybackTimestamps). Wajib dipakai sebagai basis
     *  waktu karena data skor lama bisa menyimpan timestamp absolut, sehingga
     *  pengelompokan per detik dari timestamp mentah tidak pernah cocok.
     */
    load(keystrokes, { timeline = null, totalDurationSec = 0, key = '' } = {}) {
        const list = Array.isArray(keystrokes) ? keystrokes : [];
        const total = list.length;

        const cumTyped = new Array(total + 1).fill(0);
        const cumCorrect = new Array(total + 1).fill(0);
        const cumWrong = new Array(total + 1).fill(0);
        const charsPerSecond = [];
        const times = new Array(total).fill(0);

        // Basis waktu: timeline replay. Fallback hanya dipakai kalau timeline
        // tidak tersedia -- timestamp dinormalisasi ke keystroke pertama supaya
        // tetap relatif terhadap awal tes.
        let firstTimestamp = null;
        for (let i = 0; i < total; i++) {
            const raw = Number(list[i]?.timestamp);
            if (Number.isFinite(raw)) {
                firstTimestamp = raw;
                break;
            }
        }

        let typed = 0;
        let correct = 0;
        let wrong = 0;

        for (let i = 0; i < total; i++) {
            const entry = list[i] || {};

            const fromTimeline = Number(timeline?.[i]);
            const rawTimestamp = Number(entry.timestamp);
            times[i] = Number.isFinite(fromTimeline)
                ? Math.max(0, fromTimeline)
                : Number.isFinite(rawTimestamp) && Number.isFinite(firstTimestamp)
                    ? Math.max(0, rawTimestamp - firstTimestamp)
                    : i > 0
                        ? times[i - 1]
                        : 0;

            if (!entry.isDeletion) {
                typed += 1;
                if (entry.isCorrect) correct += 1;
                else wrong += 1;

                const second = Math.floor(times[i] / 1000);
                charsPerSecond[second] = (charsPerSecond[second] || 0) + 1;
            }

            cumTyped[i + 1] = typed;
            cumCorrect[i + 1] = correct;
            cumWrong[i + 1] = wrong;
        }

        const maxTime = total > 0 ? Math.max(times[total - 1], 0) : 0;
        const durationFallback = num(totalDurationSec) > 0 ? num(totalDurationSec) * 1000 : 0;
        const totalSeconds = clamp(
            Math.ceil(Math.max(maxTime, durationFallback, 1000) / 1000),
            DEFAULT_SECONDS,
            MAX_SECONDS
        );

        // Grafik WPM memakai kecepatan WINDOW_SECONDS terakhir, bukan WPM
        // kumulatif: WPM kumulatif langsung "mendarat" di satu nilai dan
        // terlihat datar hampir sepanjang replay. Jendela pendek membuat
        // garisnya benar-benar mengikuti kecepatan mengetik.
        const WINDOW_SECONDS = 3;
        const speedSeries = new Array(totalSeconds).fill(0);
        const accuracySeries = new Array(totalSeconds).fill(100);

        let cursor = 0;
        for (let second = 0; second < totalSeconds; second++) {
            const start = Math.max(0, second - (WINDOW_SECONDS - 1));
            let windowChars = 0;
            for (let s = start; s <= second; s++) {
                windowChars += charsPerSecond[s] || 0;
            }
            const windowSeconds = second - start + 1;
            speedSeries[second] = Math.round((windowChars / 5) / (windowSeconds / 60));

            // Akurasi kumulatif sampai akhir detik ini, dihitung dari data
            // keystroke (bukan snapshot lama yang bisa tidak konsisten).
            while (cursor < total && Math.floor(times[cursor] / 1000) <= second) {
                cursor += 1;
            }
            accuracySeries[second] =
                cursor > 0 && cumTyped[cursor] > 0
                    ? Math.round((cumCorrect[cursor] / cumTyped[cursor]) * 100)
                    : 100;
        }

        // Konsistensi live memakai jendela 15 detik terakhir. Versi kumulatif
        // terkunci di satu nilai setelah ~20 detik sehingga terlihat tidak
        // bergerak; jendela bergulir membuat angkanya hidup selama replay.
        const CONSISTENCY_WINDOW_SECONDS = 15;
        const consistencySeries = new Array(totalSeconds).fill(0);

        for (let second = 0; second < totalSeconds; second++) {
            const start = Math.max(0, second - (CONSISTENCY_WINDOW_SECONDS - 1));
            const values = [];
            for (let s = start; s <= second; s++) {
                const wpm = Math.round(((charsPerSecond[s] || 0) / 5) * 60);
                if (wpm > 0) values.push(wpm);
            }
            if (values.length > 1) {
                const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
                const variance =
                    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
                consistencySeries[second] =
                    mean > 0 ? Math.max(0, Math.round((1 - Math.sqrt(variance) / mean) * 100)) : 0;
            }
        }

        // Puncak kecepatan: persentil-95 supaya satu burst tidak menarik
        // seluruh skala Y; tes pendek (< 6 detik) pakai nilai maksimum.
        const positiveSpeeds = speedSeries.filter((value) => value > 0).sort((a, b) => a - b);
        const peakSpeed =
            positiveSpeeds.length === 0
                ? 0
                : positiveSpeeds.length < 6
                    ? positiveSpeeds[positiveSpeeds.length - 1]
                    : positiveSpeeds[
                        Math.min(positiveSpeeds.length - 1, Math.floor(0.95 * positiveSpeeds.length))
                    ];

        this.data = {
            key,
            keystrokes: list,
            times,
            totalSeconds,
            cumTyped,
            cumCorrect,
            cumWrong,
            speedSeries,
            accuracySeries,
            // Garis grafik dihaluskan (rata-rata 5 titik) supaya gerakannya
            // tidak patah-patah; statistik & skala tetap dari data mentah.
            plotSpeedSeries: smoothSeries(speedSeries),
            plotAccuracySeries: smoothSeries(accuracySeries),
            consistencySeries,
            maxSpeed: peakSpeed,
            minAccuracy: Math.min(...accuracySeries, 100),
        };

        this._lastSignature = '';
        this._lastSecond = -1;

        if (this.chart) this._buildChart();
        this.refreshTheme();
    }

    attach() {
        if (this.attached) return;
        this.attached = true;
        if (this.data) this._buildChart();
    }

    detach() {
        this.attached = false;
        this.chart?.destroy();
        this.chart = null;
        this._lastSignature = '';
        this._lastSecond = -1;
    }

    destroy() {
        this.detach();
        document.removeEventListener('themechange', this._onThemeChange);
    }

    /**
     * @param {number} index posisi keystroke saat ini (sama dengan player)
     * @param {number} timeMs waktu virtual replay (ms)
     */
    update(index, timeMs) {
        if (!this.attached || !this.data) return;

        const data = this.data;
        const safeIndex = clamp(Math.round(num(index)), 0, data.keystrokes.length);
        const second = clamp(
            Math.floor(num(timeMs) / 1000),
            0,
            data.totalSeconds - 1
        );

        const signature = `${safeIndex}|${second}`;
        if (signature === this._lastSignature) return;
        this._lastSignature = signature;

        const typed = data.cumTyped[safeIndex];
        const correct = data.cumCorrect[safeIndex];
        const wrong = data.cumWrong[safeIndex];
        const last = safeIndex > 0 ? data.keystrokes[safeIndex - 1] : null;

        // WPM kumulatif memakai snapshot recorder; kalau snapshot kosong/0
        // (data lama), hitung ulang dari karakter benar dan waktu berjalan.
        let wpm = Math.round(num(last?.wpm));
        if (wpm <= 0 && correct > 0 && safeIndex > 0) {
            const elapsedMs = data.times[safeIndex - 1] || 0;
            const elapsedMinutes = elapsedMs / 60000;
            if (elapsedMinutes > 0.00833) {
                wpm = Math.round(correct / 5 / elapsedMinutes);
            }
        }

        const accuracy = typed > 0 ? Math.round((correct / typed) * 100) : 100;
        const consistency = data.consistencySeries[second] || 0;

        this._setText(this._el('replay-live-wpm'), String(wpm));
        this._setText(this._el('replay-live-accuracy'), `${accuracy}%`);
        this._setText(this._el('replay-live-typed'), String(typed));
        this._setText(this._el('replay-live-correct'), String(correct));
        this._setText(this._el('replay-live-wrong'), String(wrong));
        this._setText(this._el('replay-live-consistency'), `${consistency}%`);
        this._setText(
            this._el('replay-live-clock'),
            `${Math.min(data.totalSeconds, second + 1)}s / ${data.totalSeconds}s`
        );

        const accuracyEl = this._el('replay-live-accuracy');
        if (accuracyEl) {
            accuracyEl.classList.toggle('is-good', accuracy >= 95);
            accuracyEl.classList.toggle('is-bad', accuracy < 85);
        }

        const wrongEl = this._el('replay-live-wrong');
        if (wrongEl) wrongEl.classList.toggle('is-bad', wrong > 0);

        const consistencyEl = this._el('replay-live-consistency');
        if (consistencyEl) {
            consistencyEl.classList.toggle('is-good', consistency >= 80);
            consistencyEl.classList.toggle('is-bad', consistency > 0 && consistency < 60);
        }

        if (!this.chart) return;
        if (second === this._lastSecond) return;
        this._lastSecond = second;

        const speedData = data.plotSpeedSeries.map((value, i) => (i <= second ? value : null));
        const accuracyData = data.plotAccuracySeries.map((value, i) =>
            i <= second ? value : null
        );

        this.chart.data.datasets[0].data = speedData;
        this.chart.data.datasets[1].data = accuracyData;
        this.chart.$replayNowSecond = second;
        this.chart.update('none');
    }

    refreshTheme() {
        if (!this.chart) return;

        const colors = getColors();
        const [wpmDataset, accuracyDataset] = this.chart.data.datasets;

        wpmDataset.borderColor = colors.accent;
        wpmDataset.pointBackgroundColor = colors.card;
        wpmDataset.pointBorderColor = colors.accent;
        accuracyDataset.borderColor = colors.correct;

        const { x, yWpm, yAcc } = this.chart.options.scales;
        x.ticks.color = colors.text;
        yWpm.ticks.color = colors.text;
        yWpm.grid.color = colors.grid;
        yAcc.ticks.color = colors.text;

        const tooltip = this.chart.options.plugins.tooltip;
        tooltip.backgroundColor = colors.surface;
        tooltip.titleColor = colors.title;
        tooltip.bodyColor = colors.text;
        tooltip.borderColor = colors.border;

        this.chart.update('none');
    }

    _buildChart() {
        const canvas = this._el('replay-live-chart');
        if (!canvas || !this.data) return;
        if (typeof Chart === 'undefined') return;

        this.chart?.destroy();
        this.chart = null;

        const colors = getColors();
        const data = this.data;
        const labels = Array.from({ length: data.totalSeconds }, (_, index) =>
            String(index + 1)
        );

        const yWpmMax = Math.max(40, Math.ceil((data.maxSpeed * 1.2) / 10) * 10);
        const yAccuracyMin = clamp(
            Math.min(95, Math.floor((data.minAccuracy - 5) / 5) * 5),
            0,
            95
        );

        this.chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'WPM',
                        data: new Array(data.totalSeconds).fill(null),
                        borderColor: colors.accent,
                        backgroundColor: (context) => {
                            const { ctx, chartArea } = context.chart;
                            const accent = getColors().accent;
                            if (!chartArea) return toRgba(accent, 0.18);

                            const gradient = ctx.createLinearGradient(
                                0,
                                chartArea.top,
                                0,
                                chartArea.bottom
                            );
                            gradient.addColorStop(0, toRgba(accent, 0.3));
                            gradient.addColorStop(1, toRgba(accent, 0));
                            return gradient;
                        },
                        fill: true,
                        borderWidth: 2.5,
                        tension: 0.35,
                        // Monotone: kurva mulus lewat tiap titik tanpa
                        // overshoot, jadi tidak terlihat patah/patah.
                        cubicInterpolationMode: 'monotone',
                        pointRadius: (context) =>
                            context.dataIndex === context.chart.$replayNowSecond ? 4 : 0,
                        pointBackgroundColor: colors.card,
                        pointBorderColor: colors.accent,
                        pointBorderWidth: 2,
                        pointHitRadius: 10,
                        spanGaps: false,
                        yAxisID: 'yWpm',
                    },
                    {
                        label: 'Akurasi',
                        data: new Array(data.totalSeconds).fill(null),
                        borderColor: colors.correct,
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderDash: [5, 4],
                        tension: 0.35,
                        cubicInterpolationMode: 'monotone',
                        pointRadius: 0,
                        pointHitRadius: 10,
                        fill: false,
                        spanGaps: false,
                        yAxisID: 'yAcc',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'index', intersect: false },
                layout: { padding: { top: 4, right: 4 } },
                scales: {
                    x: {
                        offset: true,
                        grid: { display: false },
                        border: { color: colors.border },
                        ticks: {
                            color: colors.text,
                            autoSkip: true,
                            maxRotation: 0,
                            maxTicksLimit: 8,
                            font: { size: 10 },
                            padding: 4,
                        },
                    },
                    yWpm: {
                        position: 'left',
                        beginAtZero: true,
                        max: yWpmMax,
                        grid: { color: colors.grid },
                        border: { display: false },
                        ticks: {
                            color: colors.text,
                            precision: 0,
                            font: { size: 10 },
                            padding: 4,
                        },
                    },
                    yAcc: {
                        position: 'right',
                        min: yAccuracyMin,
                        max: 100,
                        grid: { drawOnChartArea: false },
                        border: { display: false },
                        ticks: {
                            color: colors.text,
                            precision: 0,
                            font: { size: 10 },
                            padding: 4,
                            callback: (value) => `${value}%`,
                        },
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: colors.surface,
                        titleColor: colors.title,
                        bodyColor: colors.text,
                        borderColor: colors.border,
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (items) => `Detik ${items[0].dataIndex + 1}`,
                            label: (context) =>
                                context.dataset.yAxisID === 'yAcc'
                                    ? `Akurasi: ${Math.round(context.parsed.y)}%`
                                    : `WPM: ${Math.round(context.parsed.y)}`,
                        },
                    },
                },
            },
            plugins: [nowMarkerPlugin],
        });

        this.chart.$replayNowSecond = -1;
    }
}
