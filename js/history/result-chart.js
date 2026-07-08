//js/history/result-chart.js

let resultChartInstance = null;
let pbLineVisible = true; // toggle state untuk garis PB (persist antar render)

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
  const rawCumulativeData = []; // ✅ BARU: "raw" versi kumulatif (mengikuti bentuk "wpm", hanya berbeda saat ada error)
  const errorCountsBySecond = Array(totalTime).fill(null);

  let cumulativeCorrectChars = 0;
  let cumulativeIncorrectChars = 0;

  // Hitung error untuk setiap detik
  historyData.forEach(data => {
      const endSecond = Math.floor((data.endTime - (historyData[0]?.startTime || 0)) / 1000);
      const errorCount = data.errorCount != null ? data.errorCount : computeErrorCount(data);
      if (errorCount > 0 && endSecond >= 0 && endSecond < totalTime) {
          errorCountsBySecond[endSecond] = (errorCountsBySecond[endSecond] || 0) + errorCount;
      }
  });

  // ✅ PERUBAHAN: Gunakan `correctCharsPerSecond` untuk menghitung Net WPM,
  // dan tambahkan karakter salah per detik untuk menghitung "raw" kumulatif
  for (let i = 0; i < totalTime; i++) {
      cumulativeCorrectChars += correctCharsPerSecond[i] || 0;
      cumulativeIncorrectChars += errorCountsBySecond[i] || 0;

      const cumulativeTimeMs = (i + 1) * 1000;
      const elapsedMinutes = cumulativeTimeMs / 60000;

      const netWpm = elapsedMinutes > 0 ? Math.round(cumulativeCorrectChars / 5 / elapsedMinutes) : 0;
      netWpmData.push(netWpm);

      const rawCumulative = elapsedMinutes > 0
        ? Math.round((cumulativeCorrectChars + cumulativeIncorrectChars) / 5 / elapsedMinutes)
        : 0;
      rawCumulativeData.push(rawCumulative);
  }

  const labels = Array.from({ length: totalTime }, (_, i) => String(i + 1));

  // Hitung max axis
  const wpmMaxCandidate = Math.max(
    100,
    finalWPM || 0,
    ...rawWpmPerSecond,
    ...netWpmData,
    ...rawCumulativeData
  );
  const yWpmMax = Math.ceil(wpmMaxCandidate / 10) * 10;
  const yErrMax = Math.max(6, ...errorCountsBySecond.filter((v) => v != null));

  const pbLine = {
    id: "pbLine",
    afterDatasetsDraw(chart) {
      if (!pbLineVisible) return; // ✅ BARU: bisa disembunyikan lewat legend "pb"
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

  // Urutan tooltip mengikuti tampilan pada gambar acuan: errors, wpm, raw, burst
  const tooltipOrder = { errors: 0, wpm: 1, raw: 2, burst: 3 };

  resultChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "wpm",
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
          // ✅ BARU: "raw" sekarang mengikuti bentuk kurva "wpm" (kumulatif),
          // digambar putus-putus dan hanya terlihat renggang saat akurasi turun —
          // persis konsep pada gambar acuan.
          label: "raw",
          data: rawCumulativeData,
          borderColor: "#f4c20d",
          backgroundColor: "#f4c20d",
          borderWidth: 1.5,
          borderDash: [5, 3],
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 2,
          yAxisID: "yWpm",
        },
        {
          // ✅ PERUBAHAN KONSEP: dataset ini (kecepatan per-detik yang naik-turun tajam)
          // sekarang diberi label "burst", bukan lagi "raw"
          label: "burst",
          data: rawWpmPerSecond,
          borderColor: "#9aa0a6",
          backgroundColor: "#9aa0a6",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 3,
          yAxisID: "yWpm",
          spanGaps: true,
        },
        {
          label: "errors",
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
          type: "linear",
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
        // ✅ Legend bawaan Chart.js dimatikan, diganti legend ikon kustom di bawah grafik
        legend: { display: false },
        tooltip: {
          itemSort: (a, b) =>
            (tooltipOrder[a.dataset.label] ?? 99) - (tooltipOrder[b.dataset.label] ?? 99),
          callbacks: {
            title: (context) => {
              const idx = context[0].dataIndex;
              return `${idx + 1}`;
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

  setupCustomLegend(resultChartInstance);
}

// ✅ BARU: legend ikon interaktif (scale, pb, raw, burst, errors) mengikuti konsep pada gambar acuan
function setupCustomLegend(chart) {
  const canvas = document.getElementById("resultChart");
  const chartContainer = canvas ? canvas.closest(".chart-container") : null;
  if (!chartContainer || !chartContainer.parentElement) return;

  injectLegendStyles();

  let legend = chartContainer.parentElement.querySelector(".chart-legend-custom");
  if (!legend) {
    legend = document.createElement("div");
    legend.className = "chart-legend-custom";
    chartContainer.insertAdjacentElement("afterend", legend);
  }

  legend.innerHTML = `
    <button type="button" class="legend-item legend-scale" data-active="false" title="Ubah skala grafik (linear/logaritmik)">
      <i class="fas fa-chart-bar"></i><span>scale</span>
    </button>
    <button type="button" class="legend-item legend-pb" data-active="true" title="Tampilkan/sembunyikan garis PB">
      <i class="fas fa-crown"></i><span>pb</span>
    </button>
    <button type="button" class="legend-item legend-toggle" data-active="true" data-index="1" title="Tampilkan/sembunyikan raw">
      <span class="legend-line legend-line-dashed"></span><span>raw</span>
    </button>
    <button type="button" class="legend-item legend-toggle" data-active="true" data-index="2" title="Tampilkan/sembunyikan burst">
      <span class="legend-line legend-line-solid" style="border-top-color:#9aa0a6"></span><span>burst</span>
    </button>
    <button type="button" class="legend-item legend-toggle" data-active="true" data-index="3" title="Tampilkan/sembunyikan errors">
      <i class="fas fa-times" style="color:#ff6b6b"></i><span>errors</span>
    </button>
  `;

  legend.querySelectorAll(".legend-toggle").forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.index);
      const meta = chart.getDatasetMeta(idx);
      const currentlyVisible = meta.hidden === null ? true : !meta.hidden;
      meta.hidden = currentlyVisible; // toggle: sembunyikan jika sedang terlihat
      btn.dataset.active = (!meta.hidden).toString();
      chart.update();
    };
  });

  legend.querySelector(".legend-pb").onclick = (e) => {
    pbLineVisible = !pbLineVisible;
    e.currentTarget.dataset.active = pbLineVisible.toString();
    chart.update();
  };

  legend.querySelector(".legend-scale").onclick = (e) => {
    const yWpm = chart.options.scales.yWpm;
    const isLog = yWpm.type === "logarithmic";
    if (isLog) {
      yWpm.type = "linear";
      yWpm.beginAtZero = true;
      delete yWpm.min;
    } else {
      yWpm.type = "logarithmic";
      yWpm.beginAtZero = false;
      yWpm.min = 1;
    }
    e.currentTarget.dataset.active = (!isLog).toString();
    chart.update();
  };
}

function injectLegendStyles() {
  if (document.getElementById("chart-legend-custom-style")) return;
  const style = document.createElement("style");
  style.id = "chart-legend-custom-style";
  style.textContent = `
    .chart-legend-custom {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
      margin: 6px 4px 10px;
      font-size: 0.78rem;
      font-family: inherit;
      color: #9aa0a6;
    }
    .chart-legend-custom .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      opacity: 0.45;
      padding: 2px 4px;
      transition: opacity 0.15s ease;
    }
    .chart-legend-custom .legend-item[data-active="true"] {
      opacity: 1;
    }
    .chart-legend-custom .legend-item:hover {
      opacity: 0.85;
    }
    .chart-legend-custom .legend-item i {
      font-size: 0.85rem;
    }
    .chart-legend-custom .legend-line {
      display: inline-block;
      width: 18px;
      height: 0;
      border-top: 2px solid #f4c20d;
    }
    .chart-legend-custom .legend-line-dashed {
      border-top-style: dashed;
    }
    .chart-legend-custom .legend-line-solid {
      border-top-style: solid;
      border-top-width: 3px;
    }
  `;
  document.head.appendChild(style);
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