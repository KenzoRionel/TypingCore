// js/utils/speedometer.js

// Perbaikan: Ganti `import { DOM }` menjadi `import { getGameDOMReferences }`
import { getGameDOMReferences } from './dom-elements.js';

// Speedometer Constants
const GAUGE_FACE_RADIUS = 80;
const TICK_RADIAL_DISTANCE = 75;

// Tick Definitions for Each Speedometer
const wpmMax = 200;
const wpmTickColors = {
    '0-40': 'green',
    '41-80': 'yellow',
    '81-120': 'orange',
    '121-200': 'red'
};

const accuracyMax = 100;
const accuracyTickColors = {
    '0-70': 'red',
    '71-85': 'orange',
    '86-95': 'yellow',
    '96-100': 'green'
};

export let timerMax = 180;
window.timerMax = timerMax;

// Fungsi untuk menghasilkan warna tick timer secara dinamis
export function getTimerTickColors(max) {
    if (max <= 30) {
        return {
            '0-10': 'red',
            '11-20': 'orange',
            '21-30': 'green'
        };
    } else if (max <= 60) {
        return {
            '0-15': 'red',
            '16-30': 'orange',
            '31-45': 'yellow',
            '46-60': 'green'
        };
    } else if (max <= 120) {
        return {
            '0-30': 'red',
            '31-60': 'orange',
            '61-90': 'yellow',
            '91-120': 'green'
        };
    } else {
        // Untuk 180 detik
        return {
            '0-45': 'red',
            '46-90': 'orange',
            '91-135': 'yellow',
            '136-180': 'green'
        };
    }
}

export function createSpeedometerTicks(container, minVal, maxVal, step, tickColors) {
    if (!container) {
        console.error("Container for speedometer ticks not found.");
        return;
    }
    container.innerHTML = '';

    const totalTicks = (maxVal - minVal) / step;
    const degreesPerTick = 240 / totalTicks;

    for (let i = 0; i <= totalTicks; i++) {
        const tick = document.createElement('div');
        tick.className = 'tick';

        const angle = (i * degreesPerTick) - 120;
        tick.style.transform = `rotate(${angle}deg) translateY(-${TICK_RADIAL_DISTANCE}px)`;

        const tickValue = minVal + (i * step);
        if (tickColors) {
            let colorClass = '';
            for (const range in tickColors) {
                const [min, max] = range.split('-').map(Number);
                if (tickValue >= min && tickValue <= max) {
                    colorClass = tickColors[range];
                    break;
                }
            }
            if (colorClass) {
                tick.classList.add(colorClass);
            }
        }
        container.appendChild(tick);
    }
}

export function setWpmSpeedometer(wpm) {
    // Ganti getDOMReferences()
    const DOM = getGameDOMReferences();
    if (!DOM.wpmNeedle || !DOM.wpmValue) return;
    wpm = Math.max(0, Math.min(wpmMax, wpm));
    const angle = (wpm / wpmMax) * 240 - 120;
    DOM.wpmNeedle.style.setProperty('--needle-angle', `${angle}deg`);
    DOM.wpmValue.textContent = Math.round(wpm);
}

export function setAccuracySpeedometer(accuracy) {
    // Ganti getDOMReferences()
    const DOM = getGameDOMReferences();
    if (!DOM.accuracyNeedle || !DOM.accuracyValue) return;
    accuracy = Math.max(0, Math.min(accuracyMax, accuracy));
    const angle = (accuracy / accuracyMax) * 240 - 120;
    DOM.accuracyNeedle.style.setProperty('--needle-angle', `${angle}deg`);
    DOM.accuracyValue.textContent = `${Math.round(accuracy)}%`;
}

// PERBAIKAN: gauge waktu SENGAJA tidak lagi mengikuti durasi tes yang
// dipilih (30/60/120/180/custom) - baik garis-garis (ticks/warna) maupun
// posisi jarumnya. Sebelumnya, tiap ganti durasi, setTimerSpeedometerMax()
// menggambar ulang ticks dengan skala berbeda TAPI jarum tetap dihitung
// terhadap variabel modul `timerMax` yang (karena bug lama - hanya
// `window.timerMax` yang di-reassign, bukan `timerMax` itu sendiri) selalu
// tetap 180. Akibatnya posisi awal jarum jadi tidak konsisten/berubah-ubah
// tergantung durasi yang dipilih, padahal garis skalanya sendiri sudah
// berubah mengikuti durasi - dua hal ini saling tidak sinkron.
//
// Sekarang gauge waktu SELALU digambar seperti pilihan 180 detik saja
// (lihat createSpeedometerTicks(..., timerMax, ...) yang dipanggil sekali
// di main.js saat load, tidak pernah lagi dipanggil ulang per durasi).
// Untuk jarum, `setTimerSpeedometer` menerima parameter kedua `totalDuration`
// (durasi tes yang sedang dipilih) dan menghitung angle berdasarkan
// PERSENTASE waktu tersisa terhadap durasi itu (timeLeftVal/totalDuration),
// bukan terhadap timerMax. Hasilnya: di awal tes (timeLeftVal === totalDuration)
// jarum SELALU berada di posisi penuh yang sama persis, apa pun durasi yang
// dipilih user - baru bergerak turun ke 0 mengikuti proporsi waktu yang
// sudah berlalu relatif terhadap durasi tes itu sendiri. Teks angka detik
// yang ditampilkan tetap angka detik ASLI (timeLeftVal), bukan angka yang
// diskalakan, supaya tetap akurat.
export function setTimerSpeedometer(timeLeftVal, totalDuration) {
    // Ganti getDOMReferences()
    const DOM = getGameDOMReferences();
    if (!DOM.timerNeedle || !DOM.timerValue) return;

    const duration = (Number.isFinite(totalDuration) && totalDuration > 0) ? totalDuration : timerMax;
    const clampedTime = Math.max(0, Math.min(duration, timeLeftVal));

    const MIN_ANGLE_TIMER = -120;
    const MAX_ANGLE_TIMER = 120;
    const percentageRemaining = clampedTime / duration;
    const angle = MIN_ANGLE_TIMER + (percentageRemaining * (MAX_ANGLE_TIMER - MIN_ANGLE_TIMER));

    DOM.timerNeedle.style.setProperty('--needle-angle', `${angle}deg`);
    DOM.timerValue.textContent = Math.round(clampedTime);
}

// Dipertahankan untuk kompatibilitas (tidak lagi dipanggil ulang tiap ganti
// durasi tes - lihat catatan panjang di atas setTimerSpeedometer), tapi bug
// lama yang hanya meng-update `window.timerMax` (bukan variabel modul
// `timerMax` yang sebenarnya dipakai oleh fungsi-fungsi di file ini)
// sekalian diperbaiki di sini, supaya kalaupun fungsi ini dipanggil secara
// eksplisit di suatu tempat, perilakunya tetap konsisten.
export function setTimerSpeedometerMax(newMax) {
    // Ganti getDOMReferences()
    const DOM = getGameDOMReferences();
    timerMax = newMax;
    window.timerMax = newMax;
    if (DOM.timerTicksContainer) {
        DOM.timerTicksContainer.innerHTML = '';
        const dynamicTickColors = getTimerTickColors(newMax);
        createSpeedometerTicks(DOM.timerTicksContainer, 0, newMax, 5, dynamicTickColors);
    }
}

export { wpmMax, accuracyMax, wpmTickColors, accuracyTickColors };