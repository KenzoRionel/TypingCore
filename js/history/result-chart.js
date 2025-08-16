// js/history/result-chart.js
let resultChartInstance = null;

export function renderResultChart(historyData) {
    const canvas = document.getElementById('resultChart');
    if (!canvas) return; // Guard biar nggak error kalau elemen nggak ada
    const ctx = canvas.getContext('2d');

    if (resultChartInstance) {
        resultChartInstance.destroy();
        resultChartInstance = null;
    }

    const labels = historyData.map((_, index) => index + 1);
    const wpmData = historyData.map(d => d.wpm);
    const rawWpmData = historyData.map(d => {
        if (typeof d.rawWpm === 'number') return d.rawWpm;
        const totalWordsTyped = (d.correctWords || 0) + (d.incorrectWords || 0);
        const minutes = (d.time || 60) / 60;
        return minutes > 0 ? Math.round(totalWordsTyped / minutes) : 0;
    });
    const errorData = historyData.map(d => d.correct === false ? d.errorPercentage : null);

    const maxWpmInTest = Math.max(...wpmData, ...rawWpmData, 0);
    const maxWpmToShow = maxWpmInTest > 200 ? 400 : 200;

    resultChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'WPM',
                    data: wpmData,
                    borderColor: '#333',
                    backgroundColor: 'rgba(51,51,51,0.1)',
                    tension: 0.4,
                    yAxisID: 'yWpm'
                },
                {
                    label: 'RAW',
                    data: rawWpmData,
                    borderColor: '#ccc',
                    backgroundColor: 'rgba(204,204,204,0.1)',
                    tension: 0.4,
                    yAxisID: 'yWpm'
                },
                {
                    label: 'Errors',
                    data: errorData,
                    type: 'scatter',
                    pointStyle: 'crossRot',
                    radius: 5,
                    backgroundColor: 'rgba(255,99,132,1)',
                    borderColor: 'rgba(255,99,132,1)',
                    yAxisID: 'yErrors'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0,
                        callback: function (value, index, values) {
                            const totalWords = values.length;
                            let step = 1;
                            if (totalWords > 100) step = 20;
                            else if (totalWords > 50) step = 10;
                            else if (totalWords > 20) step = 5;
                            else if (totalWords > 10) step = 2;
                            return index % step === 0 ? index + 1 : null;
                        }
                    }
                },
                yWpm: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'WPM'
                    },
                    beginAtZero: true,
                    max: maxWpmToShow
                },
                yErrors: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Errors'
                    },
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}
