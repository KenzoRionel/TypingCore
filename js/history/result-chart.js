//js/history/result-chart.js

let resultChartInstance = null;
let pbLineVisible = true; // toggle state untuk garis PB (persist antar render)
let currentQuoteAuthor = null; // ✅ BARU: author quote aktif (mode Quotes), ditampilkan di legend hasil

// ✅ BARU: baca warna dari CSS variabel tema aktif
function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function getChartThemeColors() {
  return {
    accent: getThemeColor("--accent") || "#f4c20d",
    textMuted: getThemeColor("--text-muted") || "#9aa0a6",
    text: getThemeColor("--text") || "#f1f1f1",
    incorrect: getThemeColor("--incorrect") || "#ff6b6b",
    border: getThemeColor("--border") || "#3f3f3f",
    surface: getThemeColor("--surface") || "#2a2a2a",
  };
}

// ✅ BARU: auto-update chart warna saat tema berubah
const _themeObserver = new MutationObserver(() => {
  if (!resultChartInstance) return;
  const c = getChartThemeColors();
  // update dataset colors
  resultChartInstance.data.datasets[0].borderColor = c.accent;
  resultChartInstance.data.datasets[0].backgroundColor = c.accent;
  resultChartInstance.data.datasets[1].borderColor = c.accent;
  resultChartInstance.data.datasets[1].backgroundColor = c.accent;
  resultChartInstance.data.datasets[2].borderColor = c.textMuted;
  resultChartInstance.data.datasets[2].backgroundColor = c.textMuted;
  resultChartInstance.data.datasets[3].borderColor = c.incorrect;
  resultChartInstance.data.datasets[3].backgroundColor = c.incorrect;
  // update axis & grid
  const x = resultChartInstance.options.scales.x;
  x.title.color = c.textMuted;
  x.ticks.color = c.textMuted;
  x.grid.color = `${c.border}40`;
  const yWpm = resultChartInstance.options.scales.yWpm;
  yWpm.title.color = c.textMuted;
  yWpm.ticks.color = c.textMuted;
  yWpm.grid.color = `${c.border}40`;
  const yErr = resultChartInstance.options.scales.yErr;
  yErr.title.color = c.textMuted;
  yErr.ticks.color = c.textMuted;
  resultChartInstance.update("none");
});
_themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// ✅ BARU: state untuk animasi "reveal" (garis bergerak dari kiri ke kanan)
let revealProgress = 0; // 0 -> 1
let revealAnimationId = null;
const REVEAL_DURATION_MS = 2400; // durasi total animasi reveal
const REVEAL_EASING = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic, biar di akhir agak melambat

// ✅ BARU: plugin yang meng-clip area chart secara horizontal sesuai progress animasi,
// sehingga garis & titik "muncul" dari kiri ke kanan mengikuti bentuknya sendiri.
const revealClipPlugin = {
  id: "revealClip",
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const revealWidth = chartArea.width * revealProgress;
    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top - 20, revealWidth, chartArea.height + 40);
    ctx.clip();
  },
  afterDatasetsDraw(chart) {
    chart.ctx.restore();
  },
};

// ✅ BARU: jalankan loop rAF yang menaikkan revealProgress dari 0 -> 1,
// lalu redraw chart tiap frame (tanpa animasi bawaan Chart.js, biar kita yang kontrol).
function startRevealAnimation(chart) {
  if (revealAnimationId) cancelAnimationFrame(revealAnimationId);
  revealProgress = 0;

  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / REVEAL_DURATION_MS);
    revealProgress = REVEAL_EASING(t);

    // 'none' = update tanpa memicu animasi bawaan Chart.js, cukup redraw
    chart.update("none");

    if (t < 1) {
      revealAnimationId = requestAnimationFrame(step);
    } else {
      revealProgress = 1;
      chart.update("none");
      revealAnimationId = null;
    }
  }

  revealAnimationId = requestAnimationFrame(step);
}

// ✅ PERUBAHAN: Sekarang fungsi menerima `rawWpmPerSecond` DAN `correctCharsPerSecond`,
// serta (opsional) `quoteAuthor` - nama sumber quote yang sedang aktif (mode Quotes),
// ditampilkan sebagai item non-interaktif di legend hasil, di samping tombol
// scale/pb/raw/burst/errors. `null`/`undefined` berarti bukan sesi mode Quotes,
// sehingga item author tidak ditampilkan sama sekali.
export function renderResultChart(historyData, finalWPM, totalTime, rawWpmPerSecond, correctCharsPerSecond, quoteAuthor = null) {
  const canvas = document.getElementById("resultChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  currentQuoteAuthor = quoteAuthor;

  if (resultChartInstance) {
    resultChartInstance.destroy();
    resultChartInstance = null;
  }
  if (revealAnimationId) {
    cancelAnimationFrame(revealAnimationId);
    revealAnimationId = null;
  }
  revealProgress = 0; // mulai dari 0 lagi tiap render baru

  const netWpmData = [];
  const rawCumulativeData = []; // ✅ BARU: "raw" versi kumulatif (mengikuti bentuk "wpm", hanya berbeda saat ada error)
  const errorCountsBySecond = Array(totalTime).fill(null);

  let cumulativeCorrectChars = 0;
  let cumulativeIncorrectChars = 0;

  // ✅ FIX: Error ditempatkan di detik saat word DIMULAI (bukan selesai).
  // Sebelumnya menggunakan data.endTime, yang menyebabkan error muncul
  // di detik yang terlambat dibandingkan keystroke benar (correctCharsPerSecond
  // di-update saat keystroke terjadi). Dengan menggunakan data.startTime,
  // error dan karakter benar kini berada di basis waktu yang selaras,
  // sehingga garis raw WPM kumulatif lebih akurat.
  historyData.forEach(data => {
      const startSecond = Math.floor((data.startTime - (historyData[0]?.startTime || 0)) / 1000);
      const errorCount = data.errorCount != null ? data.errorCount : computeErrorCount(data);
      if (errorCount > 0 && startSecond >= 0 && startSecond < totalTime) {
          errorCountsBySecond[startSecond] = (errorCountsBySecond[startSecond] || 0) + errorCount;
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

  const themeColors = getChartThemeColors();

  const pbLine = {
    id: "pbLine",
    afterDatasetsDraw(chart) {
      if (!pbLineVisible) return;
      const {
        ctx,
        chartArea: { left, right },
        scales: { yWpm },
      } = chart;
      const colors = getChartThemeColors();
      const y = yWpm.getPixelForValue(finalWPM);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = colors.textMuted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors.textMuted;
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
          data: netWpmData,
          borderColor: themeColors.accent,
          backgroundColor: themeColors.accent,
          borderWidth: 3,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 3,
          yAxisID: "yWpm",
        },
        {
          label: "raw",
          data: rawCumulativeData,
          borderColor: themeColors.accent,
          backgroundColor: themeColors.accent,
          borderWidth: 1.5,
          borderDash: [5, 3],
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 2,
          yAxisID: "yWpm",
        },
        {
          label: "burst",
          data: rawWpmPerSecond,
          borderColor: themeColors.textMuted,
          backgroundColor: themeColors.textMuted,
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
          backgroundColor: themeColors.incorrect,
          borderColor: themeColors.incorrect,
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
          title: { display: true, text: `Waktu (detik)`, color: themeColors.textMuted },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10,
            stepSize: xInterval,
            callback: (value) => `${value + 1}`,
            color: themeColors.textMuted,
          },
          grid: { color: `${themeColors.border}40` },
        },
        yWpm: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          max: yWpmMax,
          title: { display: true, text: "Kata per Menit", color: themeColors.textMuted },
          ticks: { stepSize: Math.ceil(yWpmMax / 5), color: themeColors.textMuted },
          grid: { color: `${themeColors.border}40` },
        },
        yErr: {
          position: "right",
          min: 0,
          max: yErrMax,
          title: { display: true, text: "Eror", color: themeColors.textMuted },
          ticks: { color: themeColors.textMuted },
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
    plugins: [revealClipPlugin, pbLine],
  });

  setupCustomLegend(resultChartInstance);

  // ✅ BARU: mulai animasi garis bergerak dari kiri ke kanan
  startRevealAnimation(resultChartInstance);
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

  // ✅ BARU: item author quote (mode Quotes) - non-interaktif (bukan <button>,
  // tidak toggle apa-apa), murni label. Hanya dirender kalau currentQuoteAuthor
  // terisi (yaitu hasil dari sesi mode Quotes); disembunyikan total untuk sesi
  // mode biasa. Ditaruh di ujung kanan, sejajar tombol scale/pb/raw/burst/errors,
  // sesuai permintaan supaya author tidak lagi mengambang di atas area teks
  // selama mengetik.
  const authorItemHtml = currentQuoteAuthor
    ? `<span class="legend-item legend-quote-author" title="Sumber kutipan">
         <i class="fas fa-quote-right"></i><span>${escapeHtml(currentQuoteAuthor)}</span>
       </span>`
    : "";

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
      <span class="legend-line legend-line-solid legend-line-burst"></span><span>burst</span>
    </button>
    <button type="button" class="legend-item legend-toggle" data-active="true" data-index="3" title="Tampilkan/sembunyikan errors">
      <i class="fas fa-times legend-icon-errors"></i><span>errors</span>
    </button>
    ${authorItemHtml}
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
      color: var(--text-muted, #9aa0a6);
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
      border-top: 2px solid var(--accent, #f4c20d);
    }
    .chart-legend-custom .legend-line-dashed {
      border-top-style: dashed;
    }
    .chart-legend-custom .legend-line-solid {
      border-top-style: solid;
      border-top-width: 3px;
    }
    .chart-legend-custom .legend-line-burst {
      border-top-color: var(--text-muted, #9aa0a6);
    }
    .chart-legend-custom .legend-icon-errors {
      color: var(--incorrect, #ff6b6b);
    }
    .chart-legend-custom .legend-quote-author {
      opacity: 0.85;
      cursor: default;
      font-style: italic;
      margin-left: auto;
      padding-left: 10px;
      border-left: 1px solid var(--border, rgba(255,255,255,0.12));
    }
    .chart-legend-custom .legend-quote-author i {
      font-size: 0.75rem;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);
}

// Helper: escape teks author sebelum disisipkan lewat innerHTML, supaya
// karakter seperti < > & tidak dianggap markup HTML kalau suatu saat nama
// author mengandung karakter tsb.
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
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