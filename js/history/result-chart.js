//js/history/result-chart.js

let resultChartInstance = null;
const ROLLING_WINDOW_SECONDS = 5; 

// ✅ PERUBAHAN: Sekarang fungsi menerima `rawWpmPerSecond` DAN `correctCharsPerSecond`
export function renderResultChart(historyData, finalWPM, totalTime, rawWpmPerSecond, correctCharsPerSecond) {
  const canvas = document.getElementById("resultChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (resultChartInstance) {
    resultChartInstance.destroy();
    resultChartInstance = null;
  }
  
  const netWpmData = [];
  const errorCountsBySecond = Array(totalTime).fill(null);
  
  let cumulativeCorrectChars = 0;
  
  // Hitung error untuk setiap detik
  historyData.forEach(data => {
      const endSecond = Math.floor((data.endTime - (historyData[0]?.startTime || 0)) / 1000);
      const errorCount = data.errorCount != null ? data.errorCount : computeErrorCount(data);
      if (errorCount > 0 && endSecond >= 0 && endSecond < totalTime) {
          errorCountsBySecond[endSecond] = (errorCountsBySecond[endSecond] || 0) + errorCount;
      }
  });

  // ✅ PERUBAHAN: Gunakan `correctCharsPerSecond` untuk menghitung Net WPM
  for (let i = 0; i < totalTime; i++) {
      cumulativeCorrectChars += correctCharsPerSecond[i] || 0;

      const cumulativeTimeMs = (i + 1) * 1000;
      const netWpm = cumulativeTimeMs > 0 ? Math.round(cumulativeCorrectChars / 5 / (cumulativeTimeMs / 60000)) : 0;
      netWpmData.push(netWpm);
  }

  const labels = Array.from({ length: totalTime }, (_, i) => String(i + 1));
  
  // Hitung max axis
  const wpmMaxCandidate = Math.max(
    100,
    finalWPM || 0,
    ...rawWpmPerSecond, 
    ...netWpmData
  );
  const yWpmMax = Math.ceil(wpmMaxCandidate / 10) * 10;
  const yErrMax = Math.max(6, ...errorCountsBySecond.filter((v) => v != null));

  const pbLine = {
    id: "pbLine",
    afterDatasetsDraw(chart) {
      const {
        ctx,
        chartArea: { left, right },
        scales: { yWpm },
      } = chart;
      const y = yWpm.getPixelForValue(finalWPM);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#6f6f6f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#bdbdbd";
      ctx.font = "12px sans-serif";
      ctx.fillText(`PB: ${finalWPM}`, right - 70, y - 6);
      ctx.restore();
    },
  };

  const xInterval = Math.ceil(totalTime / 10);

  resultChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Net WPM",
          data: netWpmData, // ✅ Menggunakan data yang baru dihitung
          borderColor: "#f4c20d",
          backgroundColor: "#f4c20d",
          borderWidth: 3,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 3,
          yAxisID: "yWpm",
        },
        {
          label: "RAW WPM",
          data: rawWpmPerSecond, 
          borderColor: "#9aa0a6",
          backgroundColor: "#9aa0a6",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 3,
          yAxisID: "yWpm",
          spanGaps: true,
        },
        {
          label: "Errors",
          data: errorCountsBySecond,
          type: "scatter",
          pointStyle: "crossRot",
          radius: 4,
          borderWidth: 1,
          backgroundColor: "#ff6b6b",
          borderColor: "#ff6b6b",
          yAxisID: "yErr",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          title: { display: true, text: `Waktu (detik)` },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10,
            stepSize: xInterval,
            callback: (value) => `${value + 1}`,
          },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        yWpm: {
          position: "left",
          beginAtZero: true,
          max: yWpmMax,
          title: { display: true, text: "Kata per Menit" },
          ticks: { stepSize: Math.ceil(yWpmMax / 5) },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        yErr: {
          position: "right",
          min: 0,
          max: yErrMax,
          title: { display: true, text: "Eror" },
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        legend: { display: true, labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            title: (context) => {
              const idx = context[0].dataIndex;
              return `Waktu: ${idx + 1}s`;
            },
            label: (context) => {
              const label = context.dataset.label;
              const value = context.parsed.y;
              return `${label}: ${Math.round(value)}`;
            },
          },
        },
      },
    },
    plugins: [pbLine],
  });
}

// Helper
function computeErrorCount(d) {
  const typed = d.typed || "",
    word = d.word || "";
  let inc = 0;
  for (let i = 0; i < typed.length; i++) if (word[i] !== typed[i]) inc++;
  if (typed.length > word.length) inc += typed.length - word.length;
  return inc;
}
function computeCorrectCount(d) {
  const typed = d.typed || "",
    word = d.word || "";
  let cor = 0;
  const n = Math.min(typed.length, word.length);
  for (let i = 0; i < n; i++) if (typed[i] === word[i]) cor++;
  return cor;
}