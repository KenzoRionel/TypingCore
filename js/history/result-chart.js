// js/history/result-chart.js
let resultChartInstance = null;

export function renderResultChart(historyData, finalWPM, totalTime) {
  const canvas = document.getElementById("resultChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (resultChartInstance) {
    resultChartInstance.destroy();
    resultChartInstance = null;
  }

  // Buat array waktu dari 0 sampai totalTime (dalam detik)
  const labels = Array.from({length: totalTime + 1}, (_, i) => i);
  
  // Mapping data ke interval waktu yang sesuai
  let cumulativeTime = 0;
  const rawWpmBySecond = Array(totalTime + 1).fill(null);
  const errorCountsBySecond = Array(totalTime + 1).fill(null);
  const netWpmBySecond = Array(totalTime + 1).fill(null);
  
  // Hitung Net WPM kumulatif per detik
  let cumCorrect = 0;
  let cumMs = 0;
  
  // Mapping data ke interval waktu yang lebih akurat
  historyData.forEach((data, index) => {
    const durationMs = data.durationMs || 0;
    const startSecond = Math.floor(cumulativeTime / 1000);
    cumulativeTime += durationMs;
    const endSecond = Math.floor(cumulativeTime / 1000);
    
    // Raw WPM untuk kata ini
    const rawWpm = data.rawWpm ?? 0;
    
    // Error count untuk kata ini
    const errorCount = (data.errorCount != null) ? data.errorCount : computeErrorCount(data);
    
    // Net WPM kumulatif
    const corr = (data.correctCount != null) ? data.correctCount : computeCorrectCount(data);
    const ms = (data.endTime && data.startTime) ? (data.endTime - data.startTime) : (data.durationMs ?? 0);
    cumCorrect += corr;
    cumMs += ms;
    const minutes = cumMs / 60000;
    const netWpm = minutes > 0 ? +(((cumCorrect / 5) / minutes).toFixed(2)) : 0;
    
    // Distribusikan data ke detik-detik yang sesuai
    for (let second = startSecond; second <= endSecond && second <= totalTime; second++) {
      if (second >= 0) {
        rawWpmBySecond[second] = rawWpm;
        netWpmBySecond[second] = netWpm;
        if (errorCount > 0) {
          // Untuk error, hanya set pada detik terakhir kata ini
          if (second === endSecond) {
            errorCountsBySecond[second] = errorCount;
          }
        }
      }
    }
  });
  
  // Isi data yang kosong dengan nilai 0 untuk menghindari line chart putus
  for (let i = 0; i <= totalTime; i++) {
    if (rawWpmBySecond[i] === null) rawWpmBySecond[i] = 0;
    if (netWpmBySecond[i] === null) netWpmBySecond[i] = 0;
  }

  // Skala WPM kiri: default 100, kalau lewat naikkan otomatis
  const wpmMaxCandidate = Math.max(
    0,
    finalWPM || 0,
    ...rawWpmBySecond.filter(v => v != null),
    ...netWpmBySecond.filter(v => v != null)
  );
  const yWpmMax = Math.max(100, Math.ceil(wpmMaxCandidate / 10) * 10);

  // Errors scale
  const maxErrObserved = Math.max(0, ...errorCountsBySecond.map(v => v ?? 0));
  const yErrMax = Math.max(6, maxErrObserved);

  // Plugin: garis PB (Net WPM akhir) putus-putus + label
  const pbLine = {
    id: 'pbLine',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea: { left, right }, scales: { yWpm } } = chart;
      const y = yWpm.getPixelForValue(finalWPM);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#6f6f6f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#bdbdbd';
      ctx.font = '12px sans-serif';
      ctx.fillText(`PB: ${finalWPM}`, right - 70, y - 6);
      ctx.restore();
    }
  };

  resultChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Raw WPM (per kata)',
          data: rawWpmBySecond,
          borderColor: '#9aa0a6',
          backgroundColor: 'rgba(154,160,166,0.15)',
          tension: 0.35,
          pointRadius: 0,
          yAxisID: 'yWpm'
        },
        {
          label: 'Net WPM (kumulatif)',
          data: netWpmBySecond,
          borderColor: '#f4c20d',
          backgroundColor: 'rgba(244,194,13,0.10)',
          borderWidth: 3,
          tension: 0.2,
          pointRadius: 2,
          pointHoverRadius: 3,
          yAxisID: 'yWpm'
        },
        {
          label: 'Errors (char)',
          data: errorCountsBySecond,
          type: 'scatter',
          pointStyle: 'crossRot',
          radius: 4,
          borderWidth: 1,
          backgroundColor: '#ff6b6b',
          borderColor: '#ff6b6b',
          yAxisID: 'yErr'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          title: { display: true, text: `Time (seconds) - Total: ${totalTime}` },
          beginAtZero: true,
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            callback: function (value, index, values) {
              // Tampilkan semua waktu dalam detik pada sumbu x
              const timeValue = labels[index];
              if (timeValue === undefined) return null;
              
              // Tampilkan semua label waktu
              return timeValue;
            }
          },
          grid: { color: 'rgba(255,255,255,0.06)' }
        },
        yWpm: {
          position: 'left',
          beginAtZero: true,
          max: yWpmMax,
          title: { display: true, text: 'words per minute' },
          grid: { color: 'rgba(255,255,255,0.06)' }
        },
        yErr: {
          position: 'right',
          min: 0,
          max: yErrMax,
          title: { display: true, text: 'Errors' },
          grid: { drawOnChartArea: false }
        }
      },
      plugins: {
        legend: { display: true, labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            afterBody: () => [`PB: ${finalWPM}`]
          }
        }
      }
    },
    plugins: [pbLine]
  });
}

/* ===== Helper buat fallback hitung benar/salah kalau field nggak ada ===== */
function computeErrorCount(d) {
  const typed = d.typed || '';
  const word = d.word || '';
  let inc = 0;
  for (let i = 0; i < typed.length; i++) {
    if (word[i] !== typed[i]) inc++;
  }
  if (typed.length > word.length) inc += typed.length - word.length;
  return inc;
}
function computeCorrectCount(d) {
  const typed = d.typed || '';
  const word = d.word || '';
  let cor = 0;
  const n = Math.min(typed.length, word.length);
  for (let i = 0; i < n; i++) if (typed[i] === word[i]) cor++;
  return cor;
}
