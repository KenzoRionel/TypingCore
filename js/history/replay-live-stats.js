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

function lerp(from, to, ratio) {
    return from + (to - from) * ratio;
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
        incorrect: cssVar('--incorrect', '#dc2626'),
        surface: cssVar('--surface', '#f5f5f6'),
        card: cssVar('--bg', '#ffffff'),
    };
}

// Garis vertikal "sekarang" supaya posisi yang sedang diputar jelas terlihat.
const nowMarkerPlugin = {
    id: 'replayNowMarker',
    afterDatasetsDraw(chart) {
        const time = chart.$replayNowTime;
        const area = chart.chartArea;
        if (typeof time !== 'number' || !Number.isFinite(time) || !area) return;

        const colors = getColors();
        const x = chart.scales.x.getPixelForValue(time);
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
        this._letterErrorCounts = new Map();
        this._heatIndex = 0;
        this._yAccMin = 0;

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
    load(keystrokes, { timeline = null, totalDurationSec = 0, key = '', targetText = '' } = {}) {
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

        // ---- Kata benar/salah, titik error, dan peta salah ketik ----------
        // Replay mengetik per kata: spasi meng-commit kata yang sedang
        // diketik (lihat processTypedWord() di game-logic.js). Simulasi di
        // bawah meniru urutan itu supaya hitungan kata live konsisten dengan
        // hasil akhir tes, termasuk saat ada backspace sebelum spasi.
        const targetWords = String(targetText || '')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .filter(Boolean);

        const cumWordCorrect = new Array(total + 1).fill(0);
        const cumWordWrong = new Array(total + 1).fill(0);
        const errorLetters = new Array(total).fill(null);
        const errorPoints = [];

        let wordIndex = 0;
        let wordTyped = '';
        let wordCorrect = 0;
        let wordWrong = 0;

        for (let i = 0; i < total; i++) {
            const entry = list[i] || {};

            if (entry.isDeletion) {
                if (wordTyped.length > 0) wordTyped = wordTyped.slice(0, -1);
            } else {
                const ch = typeof entry.char === 'string' ? entry.char : '';

                if (ch === ' ') {
                    if (wordTyped) {
                        const target = targetWords[wordIndex] || '';
                        if (wordTyped === target) wordCorrect += 1;
                        else wordWrong += 1;
                        wordIndex += 1;
                        wordTyped = '';
                    }
                } else if (ch) {
                    const target = targetWords[wordIndex] || '';
                    const expected = target[wordTyped.length] || '';
                    wordTyped += ch;

                    if (!entry.isCorrect) {
                        // Peta keyboard menyorot huruf yang BENAR-BENAR
                        // ditekan saat salah (sama seperti analisis skill di
                        // halaman profil), supaya terlihat tombol mana yang
                        // sering tertekan keliru.
                        const letter = /^[a-z]$/i.test(ch)
                            ? ch.toLowerCase()
                            : /^[a-z]$/i.test(expected)
                                ? expected.toLowerCase()
                                : null;
                        errorLetters[i] = letter;

                        const accuracyAfter =
                            cumTyped[i + 1] > 0
                                ? (cumCorrect[i + 1] / cumTyped[i + 1]) * 100
                                : 100;
                        errorPoints.push({
                            // x mengikuti label sumbu X: detik ke-1..N.
                            x: times[i] / 1000 + 1,
                            y: accuracyAfter,
                            char: ch,
                            expected: expected || null,
                        });
                    }
                }
            }

            cumWordCorrect[i + 1] = wordCorrect;
            cumWordWrong[i + 1] = wordWrong;
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
            cumWordCorrect,
            cumWordWrong,
            errorLetters,
            errorPoints,
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
        this._letterErrorCounts.clear();
        this._heatIndex = 0;

        if (this.chart) this._buildChart();
        this.refreshTheme();
        this._syncKeymap();
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
        const maxTip = Math.max(0, data.totalSeconds - 1);
        // Waktu pecahan (bukan hanya detik bulat) supaya ujung garis bisa
        // bergerak mulus di antara dua titik, bukan meloncat per detik.
        const tipSeconds = clamp(num(timeMs) / 1000, 0, maxTip);
        const second = clamp(Math.floor(tipSeconds), 0, maxTip);

        // ~24 fps: cukup mulus untuk mata, jauh lebih ringan daripada 60 fps.
        const bucket = Math.round(tipSeconds * 24);
        const signature = `${safeIndex}|${second}|${bucket}`;
        if (signature === this._lastSignature) return;
        this._lastSignature = signature;

        const typed = data.cumTyped[safeIndex];
        const correct = data.cumCorrect[safeIndex];
        const wrong = data.cumWrong[safeIndex];
        const wordsCorrect = data.cumWordCorrect[safeIndex] || 0;
        const wordsWrong = data.cumWordWrong[safeIndex] || 0;
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
        this._setText(this._el('replay-live-words-correct'), String(wordsCorrect));
        this._setText(this._el('replay-live-words-wrong'), String(wordsWrong));
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

        const wordsCorrectEl = this._el('replay-live-words-correct');
        if (wordsCorrectEl) wordsCorrectEl.classList.toggle('is-good', wordsCorrect > 0);

        const wordsWrongEl = this._el('replay-live-words-wrong');
        if (wordsWrongEl) wordsWrongEl.classList.toggle('is-bad', wordsWrong > 0);

        const consistencyEl = this._el('replay-live-consistency');
        if (consistencyEl) {
            consistencyEl.classList.toggle('is-good', consistency >= 80);
            consistencyEl.classList.toggle('is-bad', consistency > 0 && consistency < 60);
        }

        this._advanceLetterCounts(safeIndex);

        if (!this.chart) return;
        this._renderChart(tipSeconds);
    }

    /**
     * Bangun ulang data grafik untuk posisi waktu saat ini.
     *
     * Titik data disimpan sebagai {x, y} pada sumbu X linear, dan titik
     * terdepan diberi nilai interpolasi di antara dua detik. Hasilnya ujung
     * garis bergerak kontinu mengikuti waktu replay, bukan melompat dari
     * titik ke titik.
     */
    _renderChart(tipSeconds) {
        const data = this.data;
        const count = data.totalSeconds;
        const lastIndex = count - 1;
        const base = clamp(Math.floor(tipSeconds), 0, lastIndex);
        const frac = clamp(tipSeconds - base, 0, 1);

        const speed = [];
        const accuracy = [];
        for (let i = 0; i <= base; i++) {
            speed.push({ x: i + 1, y: data.plotSpeedSeries[i] });
            accuracy.push({ x: i + 1, y: data.plotAccuracySeries[i] });
        }

        if (frac > 0.002 && base < lastIndex) {
            const tipX = tipSeconds + 1;
            speed.push({
                x: tipX,
                y: lerp(data.plotSpeedSeries[base], data.plotSpeedSeries[base + 1], frac),
            });
            accuracy.push({
                x: tipX,
                y: lerp(data.plotAccuracySeries[base], data.plotAccuracySeries[base + 1], frac),
            });
        }

        // Titik error hanya yang sudah "terjadi" pada posisi replay ini.
        const errors = [];
        for (const point of data.errorPoints) {
            if (point.x > tipSeconds + 1.0001) break;
            errors.push({
                x: point.x,
                // Jaga titik tetap terlihat walau akurasi saat error berada
                // di luar rentang sumbu akurasi (mis. error di detik pertama).
                y: clamp(point.y, this._yAccMin + 1.5, 99.5),
                char: point.char,
                expected: point.expected,
            });
        }

        this.chart.data.datasets[0].data = speed;
        this.chart.data.datasets[1].data = accuracy;
        this.chart.data.datasets[2].data = errors;
        this.chart.$replayTipIndex = speed.length - 1;
        this.chart.$replayNowTime = tipSeconds + 1;
        this.chart.update('none');
    }

    /** Tambah hitungan huruf salah secara inkremental (atau reset saat seek mundur). */
    _advanceLetterCounts(index) {
        if (index === this._heatIndex) return;

        if (index < this._heatIndex) {
            this._letterErrorCounts.clear();
            this._heatIndex = 0;
        }

        for (let i = this._heatIndex; i < index; i++) {
            const letter = this.data.errorLetters[i];
            if (!letter) continue;
            this._letterErrorCounts.set(letter, (this._letterErrorCounts.get(letter) || 0) + 1);
        }

        this._heatIndex = index;
        this._syncKeymap();
    }

    /** Terapkan heat warna ke peta keyboard + daftar huruf paling sering salah. */
    _syncKeymap() {
        const board = this._el('replay-keymap');
        if (!board) return;

        let max = 0;
        for (const count of this._letterErrorCounts.values()) {
            if (count > max) max = count;
        }

        board.querySelectorAll('[data-key]').forEach((el) => {
            const key = el.dataset.key;
            const count = this._letterErrorCounts.get(key) || 0;
            // Akar kuadrat: error yang jarang tetap terlihat, tapi urutan
            // "makin sering = makin pekat" tetap terjaga.
            const ratio = max > 0 && count > 0
                ? Math.max(0.16, Math.sqrt(count / max))
                : 0;

            el.style.setProperty('--heat', `${Math.round(ratio * 100)}%`);
            el.classList.toggle('is-hot', ratio >= 0.6);
            el.title = count > 0
                ? `${key.toUpperCase()}: ${count} salah ketik`
                : `${key.toUpperCase()}: belum ada salah ketik`;
        });

        const top = [...this._letterErrorCounts.entries()]
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        this._setText(
            this._el('replay-keymap-top'),
            top.length > 0
                ? `Sering salah: ${top.map(([key, count]) => `${key.toUpperCase()} (${count})`).join(' · ')}`
                : 'Belum ada salah ketik'
        );
    }

    refreshTheme() {
        if (!this.chart) return;

        const colors = getColors();
        const [wpmDataset, accuracyDataset, errorDataset] = this.chart.data.datasets;

        wpmDataset.borderColor = colors.accent;
        wpmDataset.pointBackgroundColor = colors.card;
        wpmDataset.pointBorderColor = colors.accent;
        accuracyDataset.borderColor = colors.correct;

        if (errorDataset) {
            errorDataset.borderColor = colors.incorrect;
            errorDataset.pointBorderColor = colors.incorrect;
            errorDataset.backgroundColor = 'transparent';
        }

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
        const xMax = Math.max(2, data.totalSeconds);

        const yWpmMax = Math.max(40, Math.ceil((data.maxSpeed * 1.2) / 10) * 10);
        const yAccuracyMin = clamp(
            Math.min(95, Math.floor((data.minAccuracy - 5) / 5) * 5),
            0,
            95
        );
        this._yAccMin = yAccuracyMin;
        // Jaga jumlah label sumbu kanan tetap wajar (maks ~6) dengan langkah
        // "bulat". Tanpa ini, rentang 90%..100% menghasilkan 11 tick sekaligus
        // (setiap 1%) dan deretan tick mark-nya terlihat seperti garis-garis
        // horizontal yang menonjol keluar dari tepi kanan grafik.
        const accRange = Math.max(1, 100 - yAccuracyMin);
        const niceSteps = [1, 2, 5, 10, 20, 25, 50];
        const yAccStep =
            niceSteps.find((step) => accRange / step <= 5) ?? 50;

        this.chart = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'WPM',
                        data: [],
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
                        clip: 10,
                        pointRadius: (context) =>
                            context.dataIndex === context.chart.$replayTipIndex ? 4 : 0,
                        pointBackgroundColor: colors.card,
                        pointBorderColor: colors.accent,
                        pointBorderWidth: 2,
                        pointHitRadius: 10,
                        spanGaps: false,
                        yAxisID: 'yWpm',
                    },
                    {
                        label: 'Akurasi',
                        data: [],
                        borderColor: colors.correct,
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderDash: [5, 4],
                        tension: 0.35,
                        cubicInterpolationMode: 'monotone',
                        clip: 10,
                        pointRadius: 0,
                        pointHitRadius: 10,
                        fill: false,
                        spanGaps: false,
                        yAxisID: 'yAcc',
                    },
                    {
                        // Titik error: tanda x di kurva akurasi pada detik
                        // terjadinya salah ketik.
                        label: 'Error',
                        data: [],
                        borderColor: colors.incorrect,
                        backgroundColor: 'transparent',
                        showLine: false,
                        pointStyle: 'crossRot',
                        pointRadius: 4.5,
                        pointHoverRadius: 7,
                        pointBorderWidth: 1.8,
                        pointBorderColor: colors.incorrect,
                        pointBackgroundColor: 'transparent',
                        pointHitRadius: 10,
                        clip: 12,
                        yAxisID: 'yAcc',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'x', intersect: false },
                layout: { padding: { top: 4, right: 6, left: 2 } },
                scales: {
                    x: {
                        type: 'linear',
                        min: 1,
                        max: xMax,
                        grid: { display: false },
                        border: { color: colors.border },
                        ticks: {
                            color: colors.text,
                            autoSkip: true,
                            maxRotation: 0,
                            maxTicksLimit: 8,
                            precision: 0,
                            font: { size: 10 },
                            padding: 4,
                            callback: (value) => `${Math.round(value)}`,
                        },
                    },
                    yWpm: {
                        position: 'left',
                        beginAtZero: true,
                        max: yWpmMax,
                        // drawTicks: false -> garis grid berhenti tepat di tepi
                        // area grafik, tidak menonjol keluar ke arah label.
                        grid: { color: colors.grid, drawTicks: false, tickLength: 0 },
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
                        // Sumbu kanan tidak menggambar grid di area grafik,
                        // tapi tick mark-nya tetap digambar secara default:
                        // deretan garis horizontal pendek yang menonjol keluar
                        // dari tepi kanan (dan ikut memperpanjang garis dasar
                        // sumbu X) sehingga terlihat tidak menyatu dengan
                        // sumbu. Matikan tick mark-nya.
                        grid: {
                            drawOnChartArea: false,
                            drawTicks: false,
                            tickLength: 0,
                        },
                        border: { display: false },
                        ticks: {
                            color: colors.text,
                            precision: 0,
                            stepSize: yAccStep,
                            maxTicksLimit: 6,
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
                            title: (items) =>
                                `Detik ${Math.round(items[0].parsed.x)}`,
                            label: (context) => {
                                const raw = context.raw || {};

                                if (context.dataset.label === 'Error') {
                                    const expected = raw.expected
                                        ? ` (harusnya "${raw.expected}")`
                                        : '';
                                    return `Salah: "${raw.char}"${expected}`;
                                }

                                return context.dataset.yAxisID === 'yAcc'
                                    ? `Akurasi: ${Math.round(context.parsed.y)}%`
                                    : `WPM: ${Math.round(context.parsed.y)}`;
                            },
                        },
                    },
                },
            },
            plugins: [nowMarkerPlugin],
        });

        this.chart.$replayTipIndex = -1;
        this.chart.$replayNowTime = 1;
    }
}
