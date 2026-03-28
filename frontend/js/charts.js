// ═══════════════════════════════════════
// charts.js
// Draws charts using Chart.js library
// Depends on: csvParser.js
// ═══════════════════════════════════════

// Stores current chart instance
let currentChart = null;

// Chart color palette
let chartColors = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#14B8A6",
];

// Main function — draws chart on canvas
function drawChart(canvasId, chartType) {
  let labels = getLabels();
  let values = getValues();
  let headers = parsedData.headers;

  // Destroy existing chart before drawing new one
  if (currentChart) {
    currentChart.destroy();
  }

  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error("Canvas element not found: " + canvasId);
    return;
  }

  let ctx = canvas.getContext("2d");

  if (chartType === "bar") {
    currentChart = drawBarChart(ctx, labels, values, headers);
  } else if (chartType === "pie") {
    currentChart = drawPieChart(ctx, labels, values, headers);
  } else if (chartType === "line") {
    currentChart = drawLineChart(ctx, labels, values, headers);
  }
}

// Draw Bar Chart
function drawBarChart(ctx, labels, values, headers) {
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: headers[1] || "Value",
          data: values,
          backgroundColor: chartColors[0],
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: (headers[0] || "Label") + " vs " + (headers[1] || "Value"),
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

// Draw Pie Chart
function drawPieChart(ctx, labels, values, headers) {
  return new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          label: headers[1] || "Value",
          data: values,
          backgroundColor: chartColors,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "right" },
        title: {
          display: true,
          text: (headers[1] || "Value") + " Distribution",
        },
      },
    },
  });
}

// Draw Line Chart
function drawLineChart(ctx, labels, values, headers) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: headers[1] || "Value",
          data: values,
          borderColor: chartColors[0],
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          borderWidth: 2,
          pointBackgroundColor: chartColors[0],
          pointRadius: 5,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: (headers[0] || "Label") + " vs " + (headers[1] || "Value"),
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

// Update chart type without re-parsing CSV
function updateChartType(canvasId, newType) {
  if (parsedData.rows.length === 0) {
    console.warn("No data to draw chart. Parse CSV first.");
    return;
  }
  drawChart(canvasId, newType);
}
