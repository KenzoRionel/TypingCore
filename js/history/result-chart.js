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
    bg: getThemeColor("--bg") || "#ffffff",
  };
}

// Chart.js butuh rgba solid, bukan color-mix(), jadi token hex tema
// dikonversi manual - sama seperti yang dipakai grafik replay.
function toRgba(color, alpha) {
  const value = String(color || "").trim();
  if (!value.startsWith("#")) return value;

  let hex = value.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (hex.length !== 6) return value;

  const parsed = parseInt(hex, 16);
  if (!Number.isFinite(parsed)) return value;

  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Scriptable gradient: dihitung saat gambar supaya selalu ikut warna tema
// aktif tanpa perlu rebuild chart. Warna aksen diambil ulang tiap frame.
function accentAreaGradient(topAlpha = 0.3) {
  return (context) => {
    const { ctx, chartArea } = context.chart;
    const accent = getChartThemeColors().accent;

    if (!chartArea) return toRgba(accent, topAlpha * 0.4);

    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, toRgba(accent, topAlpha));
    gradient.addColorStop(0.55, toRgba(accent, topAlpha * 0.35));
    gradient.addColorStop(1, toRgba(accent, 0));
    return gradient;
  };
}

// ✅ BARU: auto-update chart warna saat tema berubah
const _themeObserver = new MutationObserver(() => {
  if (!resultChartInstance) return;
  applyChartTheme(resultChartInstance);
  resultChartInstance.update("none");
});
_themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

// ✅ BARU: state untuk animasi "reveal" (garis bergerak dari kiri ke kanan)
let revealProgress = 0; // 0 -> 1
let revealAnimationId = null;
const REVEAL_DURATION_MS = 2400; // durasi total animasi reveal
const REVEAL_EASING = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic, biar di akhir agak melambat

// ✅ BARU: saat replay panel dibuka di layar hasil, garis grafik digerakkan
// mengikuti posisi replay (bukan animasi reveal sekali jalan). Nilai progress
// datang dari event 'typingreplay:progress' yang dikirim typing-replay.js.
let replayProgressActive = false;

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

/**
 * Gambar persegi panjang dengan sudut membulat (dipakai label PB).
 * ctx.roundRect belum tentu ada di semua browser, jadi fallback manual.
 */
function roundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * Samakan warna seluruh dataset + sumbu dengan tema aktif. Dipakai oleh
 * observer tema dan saat chart pertama dibuat, supaya elemen yang tidak
 * scriptable (mis. borderColor garis) tetap ikut berubah.
 */
function applyChartTheme(chart) {
  if (!chart || !chart.data || !Array.isArray(chart.data.datasets)) return;

  const colors = getChartThemeColors();
  const [wpmDataset, rawDataset, burstDataset, errorDataset] = chart.data.datasets;

  if (wpmDataset) {
    wpmDataset.borderColor = colors.accent;
    wpmDataset.backgroundColor = accentAreaGradient(0.3);
    wpmDataset.pointBackgroundColor = colors.bg;
    wpmDataset.pointBorderColor = colors.accent;
    wpmDataset.pointHoverBackgroundColor = colors.accent;
  }
  if (rawDataset) {
    rawDataset.borderColor = toRgba(colors.accent, 0.65);
    rawDataset.backgroundColor = toRgba(colors.accent, 0.65);
  }
  if (burstDataset) {
    burstDataset.borderColor = toRgba(colors.textMuted, 0.85);
    burstDataset.backgroundColor = toRgba(colors.textMuted, 0.85);
  }
  if (errorDataset) {
    errorDataset.borderColor = colors.incorrect;
    errorDataset.backgroundColor = colors.incorrect;
  }

  const scales = chart.options.scales || {};

  if (scales.x) {
    scales.x.title.color = colors.textMuted;
    scales.x.ticks.color = colors.textMuted;
    if (scales.x.border) scales.x.border.color = toRgba(colors.border, 0.9);
  }
  if (scales.yWpm) {
    scales.yWpm.title.color = colors.textMuted;
    scales.yWpm.ticks.color = colors.textMuted;
    scales.yWpm.grid.color = toRgba(colors.border, 0.55);
  }
  if (scales.yErr) {
    scales.yErr.title.color = colors.textMuted;
    scales.yErr.ticks.color = colors.textMuted;
  }

  const tooltip = chart.options.plugins && chart.options.plugins.tooltip;
  if (tooltip) {
    tooltip.backgroundColor = colors.surface;
    tooltip.titleColor = colors.text;
    tooltip.bodyColor = colors.textMuted;
    tooltip.borderColor = toRgba(colors.border, 0.9);
  }
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
  // Clean up replay progress listener if chart is being re-rendered
  if (window._typingReplayProgressHandler) {
    window.removeEventListener('typingreplay:progress', window._typingReplayProgressHandler);
    window._typingReplayProgressHandler = null;
  }
  revealProgress = 0; // mulai dari 0 lagi tiap render baru
  replayProgressActive = false;

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
  historyData.forEach((data) => {
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

  // Hitung max axis secara robust: garis burst per-detik boleh punya satu-dua
  // titik outlier (mis. 17 char dalam 1 detik = ~200 WPM) yang tidak boleh
  // menarik seluruh skala sumbu-Y. Karena itu burst diwakili persentil-95
  // (stabil untuk tes >= 6 detik; tes pendek tetap pakai max), sedangkan garis
  // kumulatif (net/raw) yang stabil tetap pakai max. Headroom 15% di atasnya.
  const netMax = netWpmData.length ? Math.max(...netWpmData) : 0;
  const rawCumMax = rawCumulativeData.length ? Math.max(...rawCumulativeData) : 0;
  const burstP95 = percentile95(rawWpmPerSecond || []);
  const wpmMaxCandidate = Math.max(100, finalWPM || 0, netMax, rawCumMax, burstP95);
  const yWpmMax = Math.ceil((wpmMaxCandidate * 1.15) / 10) * 10;
  const yErrMax = Math.max(6, ...errorCountsBySecond.filter((v) => v != null));

  const themeColors = getChartThemeColors();

  const pbLine = {
    id: "pbLine",
    afterDatasetsDraw(chart) {
      if (!pbLineVisible) return;
      const chartArea = chart.chartArea;
      const yWpm = chart.scales && chart.scales.yWpm;
      if (!chartArea || !yWpm) return;

      const colors = getChartThemeColors();
      const y = yWpm.getPixelForValue(finalWPM);
      if (!Number.isFinite(y)) return;

      const { ctx } = chart;
      const { left, right, top } = chartArea;

      ctx.save();
      // Garis putus-putus tipis penanda rekor pribadi.
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = toRgba(colors.textMuted, 0.75);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label "PB xxx" dalam pill kecil di ujung kanan, senada dengan
      // chip legend supaya terlihat menyatu dengan desain.
      const label = `PB ${finalWPM}`;
      ctx.font = "700 10px 'JetBrains Mono', monospace";
      const textWidth = ctx.measureText(label).width;
      const pillWidth = textWidth + 12;
      const pillHeight = 17;
      const pillX = right - pillWidth - 2;
      let pillY = y - pillHeight - 5;
      if (pillY < top + 2) pillY = y + 5;

      roundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 8);
      ctx.fillStyle = colors.surface;
      ctx.fill();
      ctx.strokeStyle = toRgba(colors.textMuted, 0.4);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = toRgba(colors.textMuted, 0.95);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(label, pillX + pillWidth / 2, pillY + pillHeight / 2 + 0.5);
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
          backgroundColor: accentAreaGradient(0.3),
          borderWidth: 2.6,
          tension: 0.35,
          // Monotone: kurva mulus lewat tiap titik tanpa overshoot, sama
          // seperti grafik replay supaya tidak terlihat "patah".
          cubicInterpolationMode: "monotone",
          clip: 10,
          fill: true,
          // Titik hanya muncul di ujung garis (tip), mengikuti referensi.
          pointRadius: (context) =>
            context.dataIndex === context.dataset.data.length - 1 ? 4 : 0,
          pointHoverRadius: 6,
          pointHitRadius: 12,
          pointBackgroundColor: themeColors.bg,
          pointBorderColor: themeColors.accent,
          pointBorderWidth: 2,
          pointHoverBorderWidth: 2.5,
          pointHoverBackgroundColor: themeColors.accent,
          yAxisID: "yWpm",
        },
        {
          label: "raw",
          data: rawCumulativeData,
          borderColor: toRgba(themeColors.accent, 0.65),
          backgroundColor: toRgba(themeColors.accent, 0.65),
          borderWidth: 1.5,
          borderDash: [5, 4],
          tension: 0.35,
          cubicInterpolationMode: "monotone",
          pointRadius: 0,
          pointHoverRadius: 3,
          pointHitRadius: 10,
          fill: false,
          yAxisID: "yWpm",
        },
        {
          label: "burst",
          data: rawWpmPerSecond,
          borderColor: toRgba(themeColors.textMuted, 0.85),
          backgroundColor: toRgba(themeColors.textMuted, 0.85),
          borderWidth: 1.5,
          tension: 0.35,
          cubicInterpolationMode: "monotone",
          pointRadius: 0,
          pointHoverRadius: 3,
          pointHitRadius: 10,
          fill: false,
          yAxisID: "yWpm",
          spanGaps: true,
        },
        {
          label: "errors",
          data: errorCountsBySecond,
          type: "scatter",
          pointStyle: "crossRot",
          radius: 4.5,
          pointHoverRadius: 7,
          borderWidth: 1.8,
          backgroundColor: themeColors.incorrect,
          borderColor: themeColors.incorrect,
          pointHitRadius: 10,
          clip: 12,
          yAxisID: "yErr",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 8, right: 6, left: 2 } },
      scales: {
        x: {
          offset: false,
          title: {
            display: true,
            text: `Waktu (detik)`,
            color: themeColors.textMuted,
            font: { size: 11, weight: "600" },
          },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10,
            maxRotation: 0,
            stepSize: xInterval,
            callback: (value) => `${value + 1}`,
            color: themeColors.textMuted,
            padding: 6,
            font: { size: 10 },
          },
          grid: { display: false },
          border: { color: toRgba(themeColors.border, 0.9) },
        },
        yWpm: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          max: yWpmMax,
          title: {
            display: true,
            text: "Kata per Menit",
            color: themeColors.textMuted,
            font: { size: 11, weight: "600" },
          },
          ticks: {
            stepSize: Math.ceil(yWpmMax / 5),
            color: themeColors.textMuted,
            padding: 6,
            font: { size: 10 },
          },
          grid: { color: toRgba(themeColors.border, 0.55) },
          border: { display: false },
        },
        yErr: {
          position: "right",
          min: 0,
          max: yErrMax,
          title: {
            display: true,
            text: "Eror",
            color: themeColors.textMuted,
            font: { size: 11, weight: "600" },
          },
          ticks: {
            color: themeColors.textMuted,
            padding: 6,
            font: { size: 10 },
          },
          grid: { drawOnChartArea: false },
          border: { display: false },
        },
      },
      plugins: {
        // ✅ Legend bawaan Chart.js dimatikan, diganti legend chip kustom di atas grafik
        legend: { display: false },
        tooltip: {
          backgroundColor: themeColors.surface,
          titleColor: themeColors.text,
          bodyColor: themeColors.textMuted,
          borderColor: toRgba(themeColors.border, 0.9),
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          titleFont: { weight: "700", size: 12 },
          bodyFont: { size: 12 },
          itemSort: (a, b) =>
            (tooltipOrder[a.dataset.label] ?? 99) - (tooltipOrder[b.dataset.label] ?? 99),
          callbacks: {
            title: (context) => {
              const idx = context[0].dataIndex;
              return `Detik ${idx + 1}`;
            },
            label: (context) => {
              const labelsMap = {
                wpm: "WPM",
                raw: "Raw",
                burst: "Burst",
                errors: "Error",
              };
              const label = labelsMap[context.dataset.label] || context.dataset.label;
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

  // ✅ BARU: listener untuk event replay progress dari typing-replay.js
  // Saat replay aktif, garis grafik mengikuti progress replay real-time.
  // Saat replay nonaktif, kembali ke animasi reveal normal.
  if (!window._typingReplayProgressHandler) {
    window._typingReplayProgressHandler = (e) => {
      const { active, progress } = e.detail || {};
      if (resultChartInstance) {
        replayProgressActive = Boolean(active);
        if (replayProgressActive) {
          // Hentikan animasi reveal kalau sedang jalan
          if (revealAnimationId) {
            cancelAnimationFrame(revealAnimationId);
            revealAnimationId = null;
          }
          // Gunakan progress replay langsung (0-1)
          revealProgress = Math.min(1, Math.max(0, Number(progress) || 0));
          resultChartInstance.update('none');
        } else {
          // Replay ditutup: reset ke reveal penuh (progress = 1)
          revealProgress = 1;
          resultChartInstance.update('none');
        }
      }
    };
    window.addEventListener('typingreplay:progress', window._typingReplayProgressHandler);
  }
}

// ✅ BARU: legend chip interaktif (scale, pb, raw, burst, errors) di header
// kartu grafik - bahasa visualnya mengikuti chip legend grafik replay.
function setupCustomLegend(chart) {
  const canvas = document.getElementById("resultChart");
  const card = canvas ? canvas.closest(".result-chart-card") : null;
  if (!card) return;

  injectLegendStyles();

  let legend = card.querySelector(".chart-legend-custom");
  if (!legend) {
    // Fallback kalau markup lama dipakai: tetap tampilkan legend di bawah chart.
    const chartContainer = canvas.closest(".chart-container");
    if (!chartContainer || !chartContainer.parentElement) return;
    legend = chartContainer.parentElement.querySelector(".chart-legend-custom");
    if (!legend) {
      legend = document.createElement("div");
      legend.className = "chart-legend-custom";
      chartContainer.insertAdjacentElement("afterend", legend);
    }
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
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      margin: 0;
      font-size: 0.62rem;
      font-family: "JetBrains Mono", monospace;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted, #9aa0a6);
    }
    .chart-legend-custom .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 9px;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      font: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
      cursor: pointer;
      opacity: 0.45;
      transition: opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
    }
    .chart-legend-custom .legend-item[data-active="true"] {
      opacity: 1;
      border-color: var(--border, rgba(255,255,255,0.12));
      background: color-mix(in srgb, var(--text) 7%, transparent);
    }
    .chart-legend-custom .legend-item:hover {
      opacity: 0.9;
    }
    .chart-legend-custom .legend-item:focus-visible {
      outline: 2px solid var(--accent, #f4c20d);
      outline-offset: 1px;
    }
    .chart-legend-custom .legend-item i {
      font-size: 0.72rem;
    }
    .chart-legend-custom .legend-line {
      display: inline-block;
      width: 14px;
      height: 0;
      border-top: 2px solid var(--accent, #f4c20d);
    }
    .chart-legend-custom .legend-line-dashed {
      border-top-style: dashed;
      opacity: 0.7;
    }
    .chart-legend-custom .legend-line-solid {
      border-top-style: solid;
      border-top-width: 2px;
    }
    .chart-legend-custom .legend-line-burst {
      border-top-color: var(--text-muted, #9aa0a6);
    }
    .chart-legend-custom .legend-icon-errors {
      color: var(--incorrect, #ff6b6b);
    }
    .chart-legend-custom .legend-quote-author {
      cursor: default;
      font-style: italic;
      text-transform: none;
      letter-spacing: 0.01em;
      padding: 3px 2px;
      margin-left: 2px;
    }
    .chart-legend-custom .legend-quote-author i {
      font-size: 0.7rem;
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

// Helper: persentil-95 dari array angka (abaikan null/undefined/NaN).
// Untuk sampel kecil (< 6 titik) fallback ke max biasa karena persentil
// tidak stabil. Dipakai agar satu titik burst outlier tidak menarik skala Y.
function percentile95(arr) {
  const vals = (arr || []).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return 0;
  if (vals.length < 6) return Math.max(...vals);
  const sorted = vals.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length));
  return sorted[idx];
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
