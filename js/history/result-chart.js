// js/history/result-chart.js

let resultChartInstance = null;

export function renderResultChart(historyData) {
    const ctx = document.getElementById('resultChart').getContext('2d');

    if (resultChartInstance) {
        resultChartInstance.destroy();
    }

    // Proses data untuk chart
    const labels = historyData.map((_, index) => index + 1); // Sumbu X berdasarkan urutan data
    const wpmData = historyData.map(d => d.wpm);
    const rawWpmData = historyData.map(d => d.rawWpm);
    const errorData = historyData.map(d => d.correct === false ? d.errorPercentage : null);

    // Tentukan batas maksimum WPM untuk sumbu Y
    const maxWpmInTest = Math.max(...wpmData, 0);
    const maxWpmToShow = maxWpmInTest > 200 ? 400 : 200;

    resultChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'WPM',
                    data: wpmData,
                    borderColor: '#333', // Hitam
                    backgroundColor: 'rgba(51, 51, 51, 0.1)',
                    tension: 0.4,
                    yAxisID: 'yWpm',
                },
                {
                    label: 'RAW',
                    data: rawWpmData,
                    borderColor: '#ccc', // Abu-abu
                    backgroundColor: 'rgba(204, 204, 204, 0.1)',
                    tension: 0.4,
                    yAxisID: 'yWpm',
                },
                {
                    label: 'Errors',
                    data: errorData,
                    type: 'scatter',
                    pointStyle: 'crossRot',
                    radius: 5,
                    backgroundColor: 'rgba(255, 99, 132, 1)', // Merah
                    borderColor: 'rgba(255, 99, 132, 1)',
                    yAxisID: 'yErrors', // Gunakan sumbu Y sekunder
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: ''
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            const totalWords = values.length;
                            let step = 1;
                            if (totalWords > 100) {
                                step = 20;
                            } else if (totalWords > 50) {
                                step = 10;
                            } else if (totalWords > 20) {
                                step = 5;
                            } else if (totalWords > 10) {
                                step = 2;
                            }
                            // Tampilkan label hanya jika index adalah kelipatan dari step
                            // dan pastikan label pertama (index 0) selalu tampil
                            if (index % step === 0) {
                                // `value` di sini adalah index, kita ingin menampilkan `index + 1` sebagai jumlah kata
                                return index + 1;
                            }
                            return null; // Sembunyikan label lain
                        },
                        autoSkip: false, // Penting: nonaktifkan auto-skip agar callback kita yang mengontrol
                        maxRotation: 0, // Jaga agar label tetap horizontal
                        minRotation: 0
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
                    max: maxWpmToShow // Batas WPM dinamis
                },
                yErrors: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Errors'
                    },
                    min: 0,
                    max: 100, // Skala persentase
                    grid: {
                        drawOnChartArea: false, // Jangan tumpuk grid
                    }
                }
            }
        }
    });
}