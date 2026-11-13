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
 * akurasi live supaya naik-turun per detik tidak terlihat patah-patah;
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

/**
 * Langkah label "bulat" (1/2/2,5/5 x 10^n).
 *
 * Dipakai untuk menentukan langkah tick sekaligus batas sumbu, supaya batas
 * sumbu selalu kelipatan langkah itu. Kalau keduanya dihitung terpisah,
 * Chart.js menambahkan satu tick parsial di ujung (mis. 0,20,...,100,110)
 * sehingga jarak antar label tidak seragam.
 *
 * `halves` menyalakan kelipatan 2,5 (jadi 25, 250, ...) yang membuat sumbu
 * lebih rapat di kecepatan tinggi: tanpa itu, puncak 117 WPM berakhir dengan
 * langkah 50 dan batas atas 200, sehingga separuh grafik kosong. Jangan
 * dipakai untuk sumbu persen (labelnya jadi 92,5%).
 */
function niceStep(range, targetTicks = 5, halves = false) {
    const safeRange = Number.isFinite(range) && range > 0 ? range : 1;
    const raw = safeRange / Math.max(1, targetTicks);
    const power = 10 ** Math.floor(Math.log10(raw));
    const norm = raw / power;
    const mult =
        norm <= 1 ? 1 : norm <= 2 ? 2 : halves && norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return mult * power;
}

/**
 * Persentil-95 dari nilai positif (tes pendek < 6 titik pakai nilai maksimum).
 * Dipakai untuk burst WPM: satu detik yang luar biasa cepat tidak boleh
 * menarik seluruh skala sumbu Y.
 */
function percentile95(values) {
    const list = Array.isArray(values) ? values.filter((value) => value > 0).sort((a, b) => a - b) : [];
    if (list.length === 0) return 0;
    if (list.length < 6) return list[list.length - 1];
    return list[Math.min(list.length - 1, Math.floor(0.95 * list.length))];
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
        const correctPerSecond = [];
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
                if (entry.isCorrect) {
                    correctPerSecond[second] = (correctPerSecond[second] || 0) + 1;
                }
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

        // Grafik WPM memakai WPM KUMULATIF yang sama dengan angka di kartu:
        // untuk tiap detik diambil keystroke terakhir pada detik itu (snapshot
        // `wpm` dari recorder, dengan fallback hitung ulang seperti update()),
        // lalu nilainya dibawa terus sampai keystroke berikutnya. Jadi titik
        // garis dan angka kartu selalu menunjukkan angka yang sama, termasuk
        // saat pemain berhenti sejenak.
        const speedSeries = new Array(totalSeconds).fill(0);
        const rawSeries = new Array(totalSeconds).fill(0);
        const burstSeries = new Array(totalSeconds).fill(0);
        const accuracySeries = new Array(totalSeconds).fill(100);

        let cursor = 0;
        let accCursor = 0;
        let runningWpm = 0;
        let runningRaw = 0;
        for (let second = 0; second < totalSeconds; second++) {
            // Nilai pada AWAL detik ini (t = second * 1000), karena titik
            // x = second + 1 memang digambar di waktu itu. Dengan begitu
            // garis tidak "mendahului" replay satu detik.
            const limit = second * 1000;
            while (cursor < total && times[cursor] <= limit) {
                let value = Math.round(num(list[cursor]?.wpm));
                if (value <= 0) {
                    const correctSoFar = cumCorrect[cursor + 1];
                    const minutes = (times[cursor] || 0) / 60000;
                    value =
                        correctSoFar > 0 && minutes > 0.00833
                            ? Math.round(correctSoFar / 5 / minutes)
                            : 0;
                }
                if (value > 0) runningWpm = value;

                // Raw WPM = semua karakter yang diketik (benar + salah) dibagi
                // waktu, dihitung pada keystroke yang sama dengan WPM net
                // supaya kedua garis selalu bersisian.
                const typedSoFar = cumTyped[cursor + 1];
                const rawMinutes = (times[cursor] || 0) / 60000;
                if (typedSoFar > 0 && rawMinutes > 0.00833) {
                    runningRaw = Math.round(typedSoFar / 5 / rawMinutes);
                }

                cursor += 1;
            }
            speedSeries[second] = runningWpm;
            rawSeries[second] = runningRaw;

            // Burst = WPM dari karakter BENAR pada detik itu saja (rumus yang
            // sama dengan burstWPM di game-logic.js).
            burstSeries[second] = Math.round(((correctPerSecond[second] || 0) / 5) * 60);

            // Akurasi kumulatif sampai akhir detik ini, dihitung dari data
            // keystroke (bukan snapshot lama yang bisa tidak konsisten).
            while (accCursor < total && Math.floor(times[accCursor] / 1000) <= second) {
                accCursor += 1;
            }
            accuracySeries[second] =
                accCursor > 0 && cumTyped[accCursor] > 0
                    ? Math.round((cumCorrect[accCursor] / cumTyped[accCursor]) * 100)
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
            rawSeries,
            burstSeries,
            accuracySeries,
            // Akurasi dihaluskan (rata-rata 5 titik) supaya garisnya tidak
            // patah-patah. WPM tidak dihaluskan: garisnya harus sama persis
            // dengan angka kartu, dan seri kumulatifnya sudah mulus.
            plotSpeedSeries: speedSeries,
            plotAccuracySeries: smoothSeries(accuracySeries),
            consistencySeries,
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

        // Raw WPM saat ini: semua karakter yang diketik (benar + salah),
        // dihitung pada waktu yang sama dengan WPM di atas.
        let rawWpm = 0;
        if (typed > 0 && safeIndex > 0) {
            const rawMinutes = (data.times[safeIndex - 1] || 0) / 60000;
            if (rawMinutes > 0.00833) {
                rawWpm = Math.round(typed / 5 / rawMinutes);
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
        this._renderChart(tipSeconds, wpm, rawWpm);
    }

    /**
     * Bangun ulang data grafik untuk posisi waktu saat ini.
     *
     * Titik data disimpan sebagai {x, y} pada sumbu X linear (x = detik + 1).
     * Titik terdepan WPM memakai `tipWpm` dan raw memakai `tipRawWpm`, yaitu
     * angka saat ini, supaya ujung garis sama dengan angka yang ditampilkan.
     * Burst hanya digambar untuk detik yang sudah selesai, karena nilainya
     * dihitung dari seluruh detik itu.
     */
    _renderChart(tipSeconds, tipWpm = null, tipRawWpm = null) {
        const data = this.data;
        const count = data.totalSeconds;
        const lastIndex = count - 1;
        const base = clamp(Math.floor(tipSeconds), 0, lastIndex);
        const frac = clamp(tipSeconds - base, 0, 1);
        const hasTipWpm = Number.isFinite(tipWpm);
        const hasTipRaw = Number.isFinite(tipRawWpm);

        const speed = [];
        const raw = [];
        const burst = [];
        const accuracy = [];
        for (let i = 0; i <= base; i++) {
            speed.push({ x: i + 1, y: data.plotSpeedSeries[i] });
            raw.push({ x: i + 1, y: data.rawSeries[i] });
            accuracy.push({ x: i + 1, y: data.plotAccuracySeries[i] });
            burst.push({ x: i + 1, y: data.burstSeries[i] });
        }

        if (frac > 0.002 && base < lastIndex) {
            const tipX = tipSeconds + 1;
            speed.push({
                x: tipX,
                y: hasTipWpm
                    ? tipWpm
                    : lerp(data.plotSpeedSeries[base], data.plotSpeedSeries[base + 1], frac),
            });
            raw.push({
                x: tipX,
                y: hasTipRaw
                    ? tipRawWpm
                    : lerp(data.rawSeries[base], data.rawSeries[base + 1], frac),
            });
            burst.push({
                x: tipX,
                y: lerp(data.burstSeries[base], data.burstSeries[base + 1], frac),
            });
            accuracy.push({
                x: tipX,
                y: lerp(data.plotAccuracySeries[base], data.plotAccuracySeries[base + 1], frac),
            });
        } else if (hasTipWpm) {
            // Di ujung replay titik terakhir diganti angka saat ini, supaya
            // ujung garis tidak tertinggal dari angka akhir.
            speed[speed.length - 1] = { x: base + 1, y: tipWpm };
            if (hasTipRaw) raw[raw.length - 1] = { x: base + 1, y: tipRawWpm };
            // Burst juga diperbarui di ujung replay (gunakan nilai detik terakhir yang selesai)
            if (burst.length > 0) burst[burst.length - 1] = { x: base + 1, y: data.burstSeries[base] };
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
        this.chart.data.datasets[1].data = raw;
        this.chart.data.datasets[2].data = burst;
        this.chart.data.datasets[3].data = accuracy;
        this.chart.data.datasets[4].data = errors;
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
        const [wpmDataset, rawDataset, burstDataset, accuracyDataset, errorDataset] =
            this.chart.data.datasets;

        wpmDataset.borderColor = colors.accent;
        wpmDataset.pointBackgroundColor = colors.card;
        wpmDataset.pointBorderColor = colors.accent;
        if (rawDataset) {
            rawDataset.borderColor = toRgba(colors.accent, 0.65);
            rawDataset.backgroundColor = toRgba(colors.accent, 0.65);
        }
        if (burstDataset) {
            burstDataset.borderColor = toRgba(colors.text, 0.85);
            burstDataset.backgroundColor = toRgba(colors.text, 0.85);
        }
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

        // ---- Skala sumbu --------------------------------------------------
        // Batas sumbu di-snap ke kelipatan langkah labelnya, dan dihitung dari
        // seri yang benar-benar digambar -- bukan dari data mentah lain. Dulu
        // batas atas WPM (mis. 110 dengan langkah 20) tidak kelipatan langkah
        // sehingga label teratas jadi setengah langkah (0,20,...,100,110), dan
        // batas bawah akurasi bisa 10 poin di bawah garis sehingga garisnya
        // menempel di atap grafik.
        const plotSpeed = data.plotSpeedSeries;
        const plotAccuracy = data.plotAccuracySeries;
        const speedPeak = plotSpeed.length > 0 ? Math.max(...plotSpeed) : 0;
        const rawPeak = data.rawSeries.length > 0 ? Math.max(...data.rawSeries) : 0;
        // Burst boleh punya satu-dua detik outlier (mis. 17 huruf dalam 1 detik
        // = ~200 WPM). Seperti grafik hasil tes, burst diwakili persentil-95
        // supaya satu titik tidak menarik seluruh skala.
        const burstPeak = percentile95(data.burstSeries);
        const wpmPeak = Math.max(speedPeak, rawPeak, burstPeak);
        const accuracyFloor = plotAccuracy.length > 0 ? Math.min(...plotAccuracy) : 100;

        // Batas atas: langkah bulat terdekat, lalu batas di-snap ke kelipatan
        // langkah itu. Minimal 3 langkah supaya sumbu tidak tinggal dua label
        // saat kecepatannya sangat rendah.
        const yWpmStep = niceStep(Math.max(40, wpmPeak * 1.05), 5, true);
        const yWpmMax = Math.max(
            yWpmStep * 3,
            Math.ceil((wpmPeak * 1.05) / yWpmStep) * yWpmStep
        );

        // Padding 1 poin di bawah akurasi terendah, lalu snap ke bawah ke
        // kelipatan langkah. Minimal 4 langkah supaya labelnya tidak tinggal
        // dua (mis. akurasi 100% -> 99..100).
        const accFloor = Math.max(0, Math.floor(accuracyFloor - 1));
        const yAccStep = niceStep(Math.max(5, 100 - accFloor));
        const accSteps = Math.max(4, Math.ceil((100 - accFloor) / yAccStep));
        const yAccuracyMin = Math.max(0, 100 - accSteps * yAccStep);
        this._yAccMin = yAccuracyMin;

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
                        // Raw WPM: semua karakter yang diketik (benar + salah)
                        // dibagi waktu berjalan. Warnanya senada dengan WPM
                        // tetapi putus-putus, sama seperti grafik hasil tes.
                        label: 'Raw',
                        data: [],
                        borderColor: toRgba(colors.accent, 0.65),
                        backgroundColor: toRgba(colors.accent, 0.65),
                        borderWidth: 1.5,
                        borderDash: [5, 4],
                        tension: 0.35,
                        cubicInterpolationMode: 'monotone',
                        pointRadius: 0,
                        pointHitRadius: 10,
                        fill: false,
                        spanGaps: false,
                        yAxisID: 'yWpm',
                    },
                    {
                        // Burst WPM: kecepatan pada detik itu saja (karakter
                        // benar per detik), jadi garisnya naik-turun tajam.
                        label: 'Burst',
                        data: [],
                        borderColor: toRgba(colors.text, 0.85),
                        backgroundColor: toRgba(colors.text, 0.85),
                        borderWidth: 1.5,
                        tension: 0.35,
                        cubicInterpolationMode: 'monotone',
                        pointRadius: 0,
                        pointHitRadius: 10,
                        fill: false,
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
                            // Langkah tetap supaya label seragam dari 0 sampai
                            // yWpmMax (yang juga kelipatan langkah ini).
                            stepSize: yWpmStep,
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

                                if (context.dataset.yAxisID === 'yAcc') {
                                    return `Akurasi: ${Math.round(context.parsed.y)}%`;
                                }

                                const value = Math.round(context.parsed.y);
                                if (context.dataset.label === 'Raw') return `Raw: ${value} WPM`;
                                if (context.dataset.label === 'Burst') return `Burst: ${value} WPM`;
                                return `WPM: ${value}`;
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
