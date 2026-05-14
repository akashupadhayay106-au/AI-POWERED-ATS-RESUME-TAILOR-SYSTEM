import Chart from "chart.js/auto";

/** @type {import("chart.js").Chart | null} */
let gaugeChart = null;
/** @type {import("chart.js").Chart | null} */
let radarChart = null;
/** @type {import("chart.js").Chart | null} */
let kwChart = null;
/** @type {import("chart.js").Chart | null} */
let gapChart = null;
/** @type {import("chart.js").Chart | null} */
let benchmarkChart = null;
/** @type {import("chart.js").Chart | null} */
let densityChart = null;

/**
 * @param {import("chart.js").Chart | null} ch
 */
function destroyChart(ch) {
  if (ch) {
    ch.destroy();
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} score
 */
export function renderGauge(canvas, score) {
  destroyChart(gaugeChart);
  const s = Math.max(0, Math.min(100, score));
  gaugeChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Score", "Remaining"],
      datasets: [
        {
          data: [s, 100 - s],
          backgroundColor: ["#6366f1", "#1f2937"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ctx.dataIndex === 0 ? `ATS score: ${s}` : "";
            },
          },
        },
      },
    },
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} userScore
 * @param {number} avgScore
 */
export function renderBenchmarkChart(canvas, userScore, avgScore) {
  destroyChart(benchmarkChart);
  benchmarkChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Your resume", "Industry average", "Top candidates"],
      datasets: [
        {
          label: "ATS score",
          data: [userScore, avgScore, 92],
          backgroundColor: ["#6366f1", "#4b5563", "#10b981"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100, ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } },
        x: { ticks: { color: "#f3f4f6" }, grid: { display: false } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, number>} densityData
 */
export function renderDensityChart(canvas, densityData) {
  destroyChart(densityChart);
  const labels = Object.keys(densityData).slice(0, 10);
  const values = labels.map((l) => densityData[l]);
  densityChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Keyword frequency",
          data: values,
          backgroundColor: "#6366f1",
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } },
        y: { ticks: { color: "#f3f4f6" }, grid: { display: false } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ keyword: number, format: number, sections: number, experience: number, skills: number }} breakdown
 */
export function renderRadar(canvas, breakdown) {
  destroyChart(radarChart);
  radarChart = new Chart(canvas, {
    type: "radar",
    data: {
      labels: ["Keywords", "Format", "Sections", "Experience", "Skills"],
      datasets: [
        {
          label: "Your resume",
          data: [
            breakdown.keyword,
            breakdown.format,
            breakdown.sections,
            breakdown.experience,
            breakdown.skills,
          ],
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,0.25)",
        },
        {
          label: "Target",
          data: [85, 85, 85, 85, 85],
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.08)",
          borderDash: [4, 4],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, color: "#9ca3af" },
          grid: { color: "#1f2937" },
          angleLines: { color: "#1f2937" },
          pointLabels: { color: "#f3f4f6" },
        },
      },
      plugins: { legend: { labels: { color: "#f3f4f6" } } },
    },
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string[]} jdKeywords
 * @param {string[]} matched
 */
export function renderKeywordBars(canvas, jdKeywords, matched) {
  destroyChart(kwChart);
  const top = jdKeywords.slice(0, 14);
  const matchSet = new Set(matched);
  const values = top.map((k) => (matchSet.has(k) ? 100 : 35));
  kwChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: top,
      datasets: [
        {
          label: "Match strength",
          data: values,
          backgroundColor: top.map((k) => (matchSet.has(k) ? "#10b981" : "#f59e0b")),
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: { color: "#9ca3af" },
          grid: { color: "#1f2937" },
        },
        y: {
          ticks: { color: "#f3f4f6", font: { size: 10 } },
          grid: { display: false },
        },
      },
      plugins: { legend: { display: false } },
    },
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string[]} jdKeywords
 * @param {string[]} matched
 */
export function renderKeywordGapChart(canvas, jdKeywords, matched) {
  destroyChart(gapChart);
  const top = jdKeywords.slice(0, 12);
  const matchSet = new Set(matched);
  const values = top.map((k) => (matchSet.has(k) ? 100 : 50));
  const colors = top.map((k) => (matchSet.has(k) ? "#10b981" : "#ef4444"));
  gapChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: top,
      datasets: [
        {
          label: "Keyword gap indicator",
          data: values,
          backgroundColor: colors,
          borderRadius: 10,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: { color: "#9ca3af" },
          grid: { color: "#1f2937" },
        },
        y: {
          ticks: { color: "#f3f4f6", font: { size: 10 } },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const key = top[ctx.dataIndex];
              return `${key}: ${matchSet.has(key) ? "present" : "missing"}`;
            },
          },
        },
      },
    },
  });
}
