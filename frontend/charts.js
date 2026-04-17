/* ═══════════════════════════════════════════════════
   charts.js — Chart Rendering Module
   InsightMail
   ═══════════════════════════════════════════════════ */

const Charts = (() => {

  // Chart instances registry
  const registry = {};

  // Color palette for donut chart segments
  const PALETTE = [
    '#6366f1','#8b5cf6','#06b6d4','#22c55e',
    '#f59e0b','#ef4444','#ec4899','#14b8a6',
    '#f97316','#a3e635','#fb7185','#38bdf8',
  ];

  /* ── Destroy existing chart ────────────────────── */
  function destroyChart(id) {
    if (registry[id]) {
      registry[id].destroy();
      delete registry[id];
    }
  }

  /* ── Reset zoom on a chart ─────────────────────── */
  window.resetZoom = function(id) {
    if (registry[id]) registry[id].resetZoom();
  };

  /* ── Download chart as PNG ─────────────────────── */
  window.downloadChart = function(id, filename) {
    const chart = registry[id];
    if (!chart) return;
    const url = chart.toBase64Image('image/png', 1);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.png';
    a.click();
  };

  /* ── Get chart as base64 ───────────────────────── */
  function getChartBase64(id) {
    const chart = registry[id];
    if (!chart) return null;
    return chart.toBase64Image('image/png', 1);
  }

  /* ── Shared chart options base ─────────────────── */
  function baseOptions(isDark) {
    const textColor   = isDark ? '#94a3b8' : '#64748b';
    const gridColor   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: "'Inter'", size: 12 },
            boxWidth: 12, boxHeight: 12,
            padding: 16,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor      : isDark ? '#f1f5f9' : '#1e293b',
          bodyColor       : isDark ? '#94a3b8' : '#64748b',
          borderColor     : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          borderWidth     : 1,
          padding         : 12,
          cornerRadius    : 8,
          titleFont: { family: "'Inter'", size: 13, weight: '600' },
          bodyFont : { family: "'Inter'", size: 12 },
          callbacks: {},
        },
        zoom: {
          zoom : { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
          pan  : { enabled: true, mode: 'x' },
        },
        datalabels: { display: false }, // off by default
      },
      scales: {
        x: {
          ticks : { color: textColor, font: { family: "'Inter'", size: 11 }, maxRotation: 30 },
          grid  : { color: gridColor, drawBorder: false },
        },
        y: {
          ticks : { color: textColor, font: { family: "'Inter'", size: 11 },
            callback(v) { return CSVParser.formatNumber(v); }
          },
          grid  : { color: gridColor, drawBorder: false },
        },
      },
    };
  }

  /* ══════════════════════════════════════════════
     1. BAR CHART — Period Comparison
     ══════════════════════════════════════════════ */
  function renderBarChart({ labels, analysis, filterMode, isDark }) {
    destroyChart('barChart');

    const filteredData = filterMode === 'both'
      ? analysis
      : analysis.filter(a => a.status === filterMode);

    const filteredLabels = filterMode === 'both'
      ? labels
      : labels.filter((_, i) => analysis[i].status === filterMode);

    const currColors = filteredData.map(a => a.barColor);
    const prevColors = filteredData.map(() =>
      isDark ? 'rgba(100,116,139,0.6)' : 'rgba(148,163,184,0.5)'
    );

    const currBorder = filteredData.map(a =>
      a.status === 'profit'
        ? '#16a34a'
        : '#dc2626'
    );

    const opts = baseOptions(isDark);

    // Zero-line annotation
    opts.plugins.annotation = {
      annotations: {
        zeroLine: {
          type: 'line',
          yMin: 0, yMax: 0,
          borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
          borderWidth: 1.5,
          borderDash: [5, 4],
          label: {
            display: true,
            content: 'Break-even',
            font: { size: 10, family: "'Inter'" },
            color: isDark ? '#94a3b8' : '#64748b',
            position: 'end',
          },
        },
      },
    };

    opts.plugins.tooltip.callbacks.label = function(ctx) {
      const a = filteredData[ctx.dataIndex];
      if (!a) return '';
      if (ctx.datasetIndex === 0) {
        return [
          ` Current: ${CSVParser.formatCurrency(a.current)}`,
          ` Status: ${a.status === 'profit' ? '▲ Profit' : '▼ Loss'}`,
          ` Δ vs Previous: ${a.difference >= 0 ? '+' : ''}${CSVParser.formatCurrency(a.difference)}`,
          ` % Change: ${a.percentChange}%`,
        ];
      }
      return ` Previous: ${CSVParser.formatCurrency(a.previous)}`;
    };

    const ctx = document.getElementById('barChart').getContext('2d');
    registry['barChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: filteredLabels,
        datasets: [
          {
            label          : 'Current',
            data           : filteredData.map(a => a.current),
            backgroundColor: currColors,
            borderColor    : currBorder,
            borderWidth    : 1.5,
            borderRadius   : 5,
            borderSkipped  : false,
          },
          {
            label          : 'Previous',
            data           : filteredData.map(a => a.previous),
            backgroundColor: prevColors,
            borderColor    : isDark ? 'rgba(100,116,139,0.8)' : 'rgba(148,163,184,0.7)',
            borderWidth    : 1,
            borderRadius   : 5,
            borderSkipped  : false,
          },
        ],
      },
      options: opts,
    });
  }

  /* ══════════════════════════════════════════════
     2. LINE CHART — Trend Over Time
     ══════════════════════════════════════════════ */
  function renderLineChart({ labels, analysis, isDark }) {
    destroyChart('lineChart');

    const currVals = analysis.map(a => a.current);
    const prevVals = analysis.map(a => a.previous);

    const profitColor = '#22c55e';
    const prevColor   = isDark ? '#818cf8' : '#6366f1';

    // Gradient for current line
    const canvas = document.getElementById('lineChart');
    const ctx    = canvas.getContext('2d');
    const h      = canvas.offsetHeight || 280;

    const gradProfit = ctx.createLinearGradient(0, 0, 0, h);
    gradProfit.addColorStop(0, 'rgba(34,197,94,0.25)');
    gradProfit.addColorStop(1, 'rgba(34,197,94,0)');

    const gradPrev = ctx.createLinearGradient(0, 0, 0, h);
    gradPrev.addColorStop(0, 'rgba(99,102,241,0.15)');
    gradPrev.addColorStop(1, 'rgba(99,102,241,0)');

    const opts = baseOptions(isDark);
    opts.plugins.tooltip.callbacks.label = function(ctx) {
      const label = ctx.dataset.label || '';
      const value = CSVParser.formatCurrency(ctx.parsed.y);
      return ` ${label}: ${value}`;
    };

    registry['lineChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label          : 'Current Period',
            data           : currVals,
            borderColor    : profitColor,
            backgroundColor: gradProfit,
            borderWidth    : 2.5,
            pointRadius    : 4,
            pointHoverRadius:6,
            pointBackgroundColor: profitColor,
            tension        : 0.4,
            fill           : true,
          },
          {
            label          : 'Previous Period',
            data           : prevVals,
            borderColor    : prevColor,
            backgroundColor: gradPrev,
            borderWidth    : 2,
            pointRadius    : 3,
            pointHoverRadius:5,
            pointBackgroundColor: prevColor,
            borderDash     : [5, 4],
            tension        : 0.4,
            fill           : true,
          },
        ],
      },
      options: opts,
    });
  }

  /* ══════════════════════════════════════════════
     3. DONUT CHART — Category Distribution
     ══════════════════════════════════════════════ */
  function renderDonutChart({ labels, analysis, isDark }) {
    destroyChart('donutChart');

    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Use absolute values for donut (all positive)
    const data   = analysis.map(a => Math.abs(a.current));
    const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);
    const borders = colors.map(c => c + 'aa');

    const ctx = document.getElementById('donutChart').getContext('2d');
    registry['donutChart'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor    : 'transparent',
          hoverOffset    : 8,
          borderWidth    : 2,
        }],
      },
      options: {
        responsive         : true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeInOutQuart' },
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color    : textColor,
              font     : { family: "'Inter'", size: 11 },
              boxWidth : 10, boxHeight: 10,
              padding  : 10,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            titleColor     : isDark ? '#f1f5f9' : '#1e293b',
            bodyColor      : isDark ? '#94a3b8' : '#64748b',
            borderColor    : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderWidth    : 1,
            padding        : 12,
            cornerRadius   : 8,
            titleFont: { family: "'Inter'", size: 13, weight: '600' },
            bodyFont : { family: "'Inter'", size: 12 },
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                const pct   = ((ctx.parsed / total) * 100).toFixed(1);
                return ` ${CSVParser.formatCurrency(ctx.parsed)} (${pct}%)`;
              },
            },
          },
          datalabels: { display: false },
        },
      },
    });
  }

  /* ══════════════════════════════════════════════
     4. AREA / DELTA CHART — Profit/Loss Delta
     ══════════════════════════════════════════════ */
  function renderAreaChart({ labels, analysis, isDark }) {
    destroyChart('areaChart');

    const deltas = analysis.map(a => a.difference);

    const canvas = document.getElementById('areaChart');
    const ctx    = canvas.getContext('2d');
    const h      = canvas.offsetHeight || 280;

    // Split gradient: green above 0, red below
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0,    'rgba(34,197,94,0.4)');
    grad.addColorStop(0.45, 'rgba(34,197,94,0.05)');
    grad.addColorStop(0.55, 'rgba(239,68,68,0.05)');
    grad.addColorStop(1,    'rgba(239,68,68,0.3)');

    // Per-point colors
    const pointColors = deltas.map(d => d >= 0 ? '#22c55e' : '#ef4444');
    const lineColor   = isDark ? '#818cf8' : '#6366f1';

    const opts = baseOptions(isDark);

    // Zero-line annotation
    opts.plugins.annotation = {
      annotations: {
        zeroLine: {
          type: 'line',
          yMin: 0, yMax: 0,
          borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
          borderWidth: 2,
          borderDash: [6, 3],
          label: {
            display: true,
            content: '0 (Break-even)',
            font: { size: 10, family: "'Inter'" },
            color: isDark ? '#94a3b8' : '#64748b',
            position: 'end',
          },
        },
      },
    };

    opts.plugins.tooltip.callbacks.label = function(ctx) {
      const a = analysis[ctx.dataIndex];
      const sign = a.difference >= 0 ? '+' : '';
      return [
        ` Δ: ${sign}${CSVParser.formatCurrency(a.difference)}`,
        ` Status: ${a.status === 'profit' ? '▲ Profit' : '▼ Loss'}`,
        ` % Change: ${a.percentChange}%`,
      ];
    };

    registry['areaChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label              : 'Profit / Loss Delta',
          data               : deltas,
          borderColor        : lineColor,
          backgroundColor    : grad,
          borderWidth        : 2.5,
          pointRadius        : 5,
          pointHoverRadius   : 7,
          pointBackgroundColor: pointColors,
          pointBorderColor   : 'transparent',
          tension            : 0.35,
          fill               : true,
        }],
      },
      options: opts,
    });
  }

  /* ══════════════════════════════════════════════
     Master render function
     ══════════════════════════════════════════════ */
  function renderAll({ labels, analysis, filterMode, isDark }) {
    renderBarChart ({ labels, analysis, filterMode, isDark });
    renderLineChart ({ labels, analysis, isDark });
    renderDonutChart({ labels, analysis, isDark });
    renderAreaChart ({ labels, analysis, isDark });
  }

  /* ── Update filter without reloading data ────── */
  function applyFilter(filterMode, { labels, analysis, isDark }) {
    renderBarChart({ labels, analysis, filterMode, isDark });
  }

  /* ── Destroy all ─────────────────────────────── */
  function destroyAll() {
    ['barChart','lineChart','donutChart','areaChart'].forEach(destroyChart);
  }

  /* ── Get all chart images ────────────────────── */
  function getAllBase64() {
    return {
      barChart   : getChartBase64('barChart'),
      lineChart  : getChartBase64('lineChart'),
      donutChart : getChartBase64('donutChart'),
      areaChart  : getChartBase64('areaChart'),
    };
  }

  return {
    renderAll,
    renderBarChart,
    renderLineChart,
    renderDonutChart,
    renderAreaChart,
    applyFilter,
    destroyAll,
    getAllBase64,
  };

})();
