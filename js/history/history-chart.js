// js/history/history-chart.js

// Perbaikan: Ganti import { DOM } menjadi import { getHistoryDOMReferences }
import { getHistoryDOMReferences } from '../utils/dom-elements.js';

let wpmChart;
let accuracyChart;

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

    // Ganti nama properti DOM
    wpmChart = new Chart(DOM.wpmProgressChart, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'WPM',
                data: wpmData,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
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
                        text: 'WPM'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jumlah Tes'
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
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
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
                        text: 'Akurasi (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jumlah Tes'
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