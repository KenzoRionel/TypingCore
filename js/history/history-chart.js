// js/history/history-chart.js

// Perbaikan: Ganti import { DOM } menjadi import { getHistoryDOMReferences }
import { getHistoryDOMReferences } from '../utils/dom-elements.js';

let wpmChart;
let accuracyChart;

// Ambil nilai token warna dari tema aktif (css/theme.css). Dengan cara ini
// grafik ikut berubah untuk SEMUA tema, bukan cuma light/dark.
function cssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    return value || fallback;
}

// Chart.js butuh warna solid/rgba, bukan color-mix(), jadi token hex dari
// tema dikonversi manual ke rgba untuk area fill dan garis grid.
function toRgba(color, alpha) {
    const value = (color || '').trim();
    if (!value.startsWith('#')) return value;

    let hex = value.slice(1);
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char + char)
            .join('');
    }
    if (hex.length !== 6) return value;

    const num = parseInt(hex, 16);
    if (!Number.isFinite(num)) return value;

    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getChartColors() {
    const textColor = cssVar('--text-muted', '#666666');
    const titleColor = cssVar('--text', '#333333');
    const borderColor = cssVar('--border', 'rgba(0,0,0,0.1)');
    const accent = cssVar('--accent', '#3e63dd');
    const correct = cssVar('--correct', '#15803d');
    const surface = cssVar('--bg', '#ffffff');

    return {
        textColor,
        titleColor,
        gridColor: toRgba(borderColor, 0.75),
        wpmColor: accent,
        wpmFill: toRgba(accent, 0.14),
        accuracyColor: correct,
        accuracyFill: toRgba(correct, 0.14),
        pointFill: surface,
        tooltipBg: surface,
        tooltipText: titleColor,
        tooltipBorder: borderColor,
    };
}


export function renderProgressCharts(scores) {
    // Perbaikan: Panggil getHistoryDOMReferences()
    const DOM = getHistoryDOMReferences();
    // Ganti nama properti DOM
    if (!DOM.wpmProgressChart || !DOM.accuracyProgressChart) {
        console.warn("Chart canvas elements not found. Skipping chart rendering.");
        return;
    }

    const sortedScores = [...scores].sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = sortedScores.map((score, index) => `Tes ${index + 1}`);
    const wpmData = sortedScores.map(score => score.wpm);
    const accuracyData = sortedScores.map(score => score.accuracy);

    if (wpmChart) wpmChart.destroy();
    if (accuracyChart) accuracyChart.destroy();

    const colors = getChartColors();

    // Default Chart.js juga diturunkan dari tema supaya tooltip/teks tidak
    // tetap memakai warna bawaan (hitam/putih) di tema tertentu.
    Chart.defaults.color = colors.textColor;
    Chart.defaults.borderColor = colors.gridColor;
    Chart.defaults.plugins.tooltip.backgroundColor = colors.tooltipBg;
    Chart.defaults.plugins.tooltip.titleColor = colors.tooltipText;
    Chart.defaults.plugins.tooltip.bodyColor = colors.tooltipText;
    Chart.defaults.plugins.tooltip.borderColor = colors.tooltipBorder;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.displayColors = false;

    // Ganti nama properti DOM
	wpmChart = new Chart(DOM.wpmProgressChart, {

        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'WPM',
                data: wpmData,
                borderColor: colors.wpmColor,
                backgroundColor: colors.wpmFill,
                pointBackgroundColor: colors.pointFill,
                pointBorderColor: colors.wpmColor,
                pointBorderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'WPM',
                        color: colors.titleColor
                    },
                    ticks: {
                        color: colors.textColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jumlah Tes',
                        color: colors.titleColor
                    },
                    ticks: {
                        color: colors.textColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Tanggal: ${new Date(sortedScores[context[0].dataIndex].date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`;
                        },
                        label: function(context) {
                            return `WPM: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });

    // Ganti nama properti DOM
	accuracyChart = new Chart(DOM.accuracyProgressChart, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Akurasi (%)',
                data: accuracyData,
                borderColor: colors.accuracyColor,
                backgroundColor: colors.accuracyFill,
                pointBackgroundColor: colors.pointFill,
                pointBorderColor: colors.accuracyColor,
                pointBorderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Akurasi (%)',
                        color: colors.titleColor
                    },
                    ticks: {
                        color: colors.textColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jumlah Tes',
                        color: colors.titleColor
                    },
                    ticks: {
                        color: colors.textColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Tanggal: ${new Date(sortedScores[context[0].dataIndex].date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`;
                        },
                        label: function(context) {
                            return `Akurasi: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

export function destroyCharts() {
    // Perbaikan: Panggil getHistoryDOMReferences()
    const DOM = getHistoryDOMReferences();
    if (wpmChart) {
        wpmChart.destroy();
        wpmChart = null; // Penting untuk me-reset referensi
    }
    if (accuracyChart) {
        accuracyChart.destroy();
        accuracyChart = null;
    }
}
