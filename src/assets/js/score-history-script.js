// js/score-history-script.js

document.addEventListener('DOMContentLoaded', () => {
    const scoreHistoryList = document.getElementById('scoreHistoryList'); // Elemen untuk daftar tabel
    const noHistoryMessage = scoreHistoryList.querySelector('.no-history'); // Pesan "belum ada riwayat"
    const wpmProgressChartCanvas = document.getElementById('wpmProgressChart'); // Canvas untuk chart WPM
    const accuracyProgressChartCanvas = document.getElementById('accuracyProgressChart'); // Canvas untuk chart Akurasi

    let wpmChart; // Variabel untuk menyimpan instance chart WPM
    let accuracyChart; // Variabel untuk menyimpan instance chart Akurasi

    // Fungsi untuk menampilkan riwayat skor lengkap (tabel dan grafik)
    window.displayFullScoreHistory = function() { // Dibuat global agar bisa dipanggil dari common-script.js
        const scores = JSON.parse(localStorage.getItem('typingScores') || '[]');

        // Sembunyikan pesan jika ada skor
        if (scores.length > 0) {
            noHistoryMessage.style.display = 'none';
        } else {
            noHistoryMessage.style.display = 'block';
            // Destroy charts if no scores to prevent empty charts
            if (wpmChart) wpmChart.destroy();
            if (accuracyChart) accuracyChart.destroy();
            scoreHistoryList.innerHTML = '<p class="no-history">Belum ada riwayat skor. Mulai mengetik untuk menyimpan skor!</p>';
            return;
        }

        // --- Tampilan Daftar Tabel Skor ---
        // Buat tabel jika belum ada atau kosongkan isinya
        let table = document.getElementById('scoreTable');
        if (!table) {
            table = document.createElement('table');
            table.id = 'scoreTable';
            table.classList.add('score-table'); // Tambahkan kelas untuk styling
            scoreHistoryList.innerHTML = ''; // Kosongkan dulu
            scoreHistoryList.appendChild(table);
        } else {
            // Hapus semua baris kecuali header jika tabel sudah ada
            while (table.rows.length > 1) {
                table.deleteRow(1);
            }
        }

        // Buat header tabel
        if (table.rows.length === 0) {
            const thead = table.createTHead();
            const headerRow = thead.insertRow();
            ['No.', 'Tanggal', 'WPM', 'Akurasi', 'Waktu', 'Salah Karakter', 'Mode', 'Kata Benar', 'Kata Salah'].forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                headerRow.appendChild(th);
            });
        }

        // Tambahkan baris data ke tabel
        scores.forEach((score, index) => {
            const row = table.insertRow();
            row.insertCell().textContent = index + 1;
            row.insertCell().textContent = new Date(score.date).toLocaleString('id-ID', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            row.insertCell().textContent = score.wpm;
            row.insertCell().textContent = score.accuracy + '%';
            row.insertCell().textContent = score.time + 's';
            row.insertCell().textContent = score.errors;
            row.insertCell().textContent = score.type; // Atau score.mode
            row.insertCell().textContent = score.correctWords;
            row.insertCell().textContent = score.incorrectWords;
        });

        // --- Visualisasi Progres dengan Chart.js ---
        // Urutkan skor berdasarkan tanggal secara ascending untuk grafik yang benar
        const sortedScores = [...scores].sort((a, b) => new Date(a.date) - new Date(b.date));

        const labels = sortedScores.map((score, index) => `Tes ${index + 1}`); // Label untuk sumbu X
        const wpmData = sortedScores.map(score => score.wpm);
        const accuracyData = sortedScores.map(score => score.accuracy);

        // Hancurkan instance chart yang ada sebelum membuat yang baru untuk menghindari duplikasi
        if (wpmChart) wpmChart.destroy();
        if (accuracyChart) accuracyChart.destroy();

        // Chart WPM
        wpmChart = new Chart(wpmProgressChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'WPM',
                    data: wpmData,
                    borderColor: '#007bff', // Biru
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.3, // Sedikit kurva
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Penting untuk kontrol ukuran di CSS
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
                        display: false // Tidak perlu legend jika hanya ada 1 dataset
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

        // Chart Akurasi
        accuracyChart = new Chart(accuracyProgressChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Akurasi (%)',
                    data: accuracyData,
                    borderColor: '#28a745', // Hijau
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
                        max: 100, // Akurasi maksimal 100%
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
    };

    // Panggil saat halaman dimuat
    displayFullScoreHistory();
});