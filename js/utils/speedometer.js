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
    if (!DOM.wpmNeedle || !DOM.wpmValueText) return;
    wpm = Math.max(0, Math.min(wpmMax, wpm));
    const angle = (wpm / wpmMax) * 240 - 120;
    DOM.wpmNeedle.style.setProperty('--needle-angle', `${angle}deg`);
    DOM.wpmValueText.textContent = Math.round(wpm);
}

export function setAccuracySpeedometer(accuracy) {
    // Ganti getDOMReferences()
    const DOM = getGameDOMReferences();
    if (!DOM.accuracyNeedle || !DOM.accuracyValueText) return;
    accuracy = Math.max(0, Math.min(accuracyMax, accuracy));
    const angle = (accuracy / accuracyMax) * 240 - 120;
    DOM.accuracyNeedle.style.setProperty('--needle-angle', `${angle}deg`);
    DOM.accuracyValueText.textContent = `${Math.round(accuracy)}%`;
}

export function setTimerSpeedometer(timeLeftVal) {
    // Ganti getDOMReferences()
    const DOM = getGameDOMReferences();
    if (!DOM.timerNeedle || !DOM.timerValueText) return;
    timeLeftVal = Math.max(0, Math.min(timerMax, timeLeftVal));

    const MIN_ANGLE_TIMER = -120;
    const MAX_ANGLE_TIMER = 120;
    const percentageRemaining = timeLeftVal / timerMax;
    const angle = MIN_ANGLE_TIMER + (percentageRemaining * (MAX_ANGLE_TIMER - MIN_ANGLE_TIMER));

    DOM.timerNeedle.style.setProperty('--needle-angle', `${angle}deg`);
    DOM.timerValueText.textContent = Math.round(timeLeftVal);
}

// Modifikasi setTimerSpeedometerMax agar menggunakan warna dinamis
export function setTimerSpeedometerMax(newMax) {
    // Ganti getDOMReferences()
    const DOM = getGameDOMReferences();
    window.timerMax = newMax;
    if (DOM.timerTicksContainer) {
        DOM.timerTicksContainer.innerHTML = '';
        const dynamicTickColors = getTimerTickColors(newMax);
        createSpeedometerTicks(DOM.timerTicksContainer, 0, newMax, 5, dynamicTickColors);
    }
}

export { wpmMax, accuracyMax, wpmTickColors, accuracyTickColors };