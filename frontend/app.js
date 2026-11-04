/* ═══════════════════════════════════════════════════════════════════════════
   N.I.T.E. — app.js
   Full frontend logic: form submission, what-if, batch, Chart.js
   ═══════════════════════════════════════════════════════════════════════════ */

const API_BASE = "http://127.0.0.1:8000";

/* ── Utilities ─────────────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const fmt = (n) => (n * 100).toFixed(1) + "%";
const fmtNum = (n) => n.toLocaleString();

function tierConfig(tier) {
  switch (tier) {
    case "Normal": return { color: "#10b981", bg: "rgba(16,185,129,0.12)", class: "normal" };
    case "Probe":  return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  class: "probe"  };
    case "DoS":    return { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   class: "dos"    };
    default:       return { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", class: ""       };
  }
}

/* ── API Health Check ──────────────────────────────────────────────────────── */
async function checkAPIStatus() {
  const dot   = $("api-status-dot");
  const label = $("api-status-label");
  try {
    const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      dot.classList.add("online");
      dot.classList.remove("offline");
      label.textContent = "API Online";
    } else { throw new Error(); }
  } catch {
    dot.classList.add("offline");
    dot.classList.remove("online");
    label.textContent = "API Offline";
  }
}
checkAPIStatus();
setInterval(checkAPIStatus, 15000);

/* ── Active nav link on scroll ─────────────────────────────────────────────── */
const sections = ["home", "analyze", "analytics", "compare", "whatif", "batch"];
const navLinks  = {};
sections.forEach((s) => {
  navLinks[s] = document.querySelector(`a[href="#${s}"]`);
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        sections.forEach((s) => navLinks[s]?.classList.remove("active"));
        navLinks[entry.target.id]?.classList.add("active");
      }
    });
  },
  { rootMargin: "-50% 0px -50% 0px" }
);
sections.forEach((s) => {
  const el = document.getElementById(s);
  if (el) observer.observe(el);
});

/* ════════════════════════════════════════════════════════════════════════════
   ANALYZE — Single Record
   ════════════════════════════════════════════════════════════════════════════ */

/* Slider sync */
const slider = $("failed_logins_slider");
const sliderNum = $("failed_logins");

slider.addEventListener("input", () => {
  sliderNum.value = slider.value;
  updateSliderFill(slider);
});
sliderNum.addEventListener("input", () => {
  const v = Math.min(10, Math.max(0, parseInt(sliderNum.value) || 0));
  slider.value = v;
  sliderNum.value = v;
  updateSliderFill(slider);
});

function updateSliderFill(el) {
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty("--val", pct + "%");
}
updateSliderFill(slider);

/* Example loaders */
const EXAMPLES = {
  normal: { connection_duration: 185.3, src_bytes: 12400, dst_bytes: 230000, failed_logins: 0, protocol_type: "TCP" },
  probe:  { connection_duration: 0.8,   src_bytes: 120,   dst_bytes: 0,      failed_logins: 4, protocol_type: "UDP" },
  dos:    { connection_duration: 8.4,   src_bytes: 2800000, dst_bytes: 20,  failed_logins: 0, protocol_type: "ICMP" },
};

function fillForm(example) {
  $("connection_duration").value = example.connection_duration;
  $("src_bytes").value           = example.src_bytes;
  $("dst_bytes").value           = example.dst_bytes;
  $("failed_logins").value       = example.failed_logins;
  slider.value                   = example.failed_logins;
  updateSliderFill(slider);
  $("protocol_type").value       = example.protocol_type;
}

$("fill-normal-btn").addEventListener("click", () => fillForm(EXAMPLES.normal));
$("fill-probe-btn").addEventListener("click",  () => fillForm(EXAMPLES.probe));
$("fill-dos-btn").addEventListener("click",    () => fillForm(EXAMPLES.dos));

/* Form submit */
$("analyze-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    connection_duration: parseFloat($("connection_duration").value),
    src_bytes:           parseInt($("src_bytes").value),
    dst_bytes:           parseInt($("dst_bytes").value),
    failed_logins:       parseInt($("failed_logins").value),
    protocol_type:       $("protocol_type").value,
  };

  showResultLoading();

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    showResultData(data);
  } catch (err) {
    showResultError(err.message);
  }
});

function showResultLoading() {
  $("result-idle").classList.add("hidden");
  $("result-data").classList.add("hidden");
  $("result-loading").classList.remove("hidden");
}

function showResultData(data) {
  $("result-loading").classList.add("hidden");
  $("result-idle").classList.add("hidden");
  const panel = $("result-data");
  panel.classList.remove("hidden");

  const cfg = tierConfig(data.predicted_tier);

  // Tier card
  const tierCard = $("tier-card");
  tierCard.style.background   = cfg.bg;
  tierCard.style.borderColor  = cfg.color + "44";
  $("tier-icon").style.color  = cfg.color;
  $("tier-value").textContent = data.predicted_tier;
  $("tier-value").style.color = cfg.color;
  const badge = $("tier-badge");
  badge.textContent           = data.predicted_tier.toUpperCase();
  badge.style.background      = cfg.bg;
  badge.style.color           = cfg.color;

  // Probability bars
  renderProbBars($("prob-bars"), data.probabilities);

  // Advisory
  $("advisory-text").textContent = data.advisory;
}

function showResultError(msg) {
  $("result-loading").classList.add("hidden");
  $("result-data").classList.add("hidden");
  const idle = $("result-idle");
  idle.classList.remove("hidden");
  idle.querySelector("p").textContent = `⚠ Error: ${msg}`;
  idle.querySelector("p").style.color = "#ef4444";
}

function renderProbBars(container, probs) {
  container.innerHTML = "";
  const ordered = ["Normal", "Probe", "DoS"].filter((k) => k in probs);
  ordered.forEach((cls) => {
    const p   = probs[cls] ?? 0;
    const cfg = tierConfig(cls);
    const row = document.createElement("div");
    row.className = "prob-bar-row";
    row.innerHTML = `
      <span class="prob-bar-label" style="color:${cfg.color}">${cls}</span>
      <div class="prob-bar-track">
        <div class="prob-bar-fill" style="background:${cfg.color}; width:0%"
             data-target="${p * 100}"></div>
      </div>
      <span class="prob-bar-pct" style="color:${cfg.color}">${fmt(p)}</span>
    `;
    container.appendChild(row);
    // animate after paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.querySelector(".prob-bar-fill").style.width = p * 100 + "%";
      });
    });
  });
}

/* ════════════════════════════════════════════════════════════════════════════
   ANALYTICS — Chart.js
   ════════════════════════════════════════════════════════════════════════════ */
const BENCHMARK_DATA = {
  labels: ["Random Forest", "Gradient Boosting", "Decision Tree", "K-Nearest Neighbors", "Logistic Regression"],
  cv:     [0.952, 0.948, 0.894, 0.876, 0.812],
  test:   [0.951, 0.947, 0.887, 0.874, 0.809],
};

const ctx = $("benchmarkChart").getContext("2d");

Chart.defaults.color = "#94a3b8";
Chart.defaults.font.family = "'Inter', sans-serif";

const benchmarkChart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: BENCHMARK_DATA.labels,
    datasets: [
      {
        label: "5-Fold CV Macro-F1",
        data: BENCHMARK_DATA.cv,
        backgroundColor: "rgba(99,102,241,0.75)",
        borderColor: "#6366f1",
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: "Test Macro-F1",
        data: BENCHMARK_DATA.test,
        backgroundColor: "rgba(6,182,212,0.65)",
        borderColor: "#06b6d4",
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 1200, easing: "easeOutQuart" },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(13,21,41,0.95)",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx) => `  ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.05)", drawTicks: false },
        ticks: { font: { size: 11 }, maxRotation: 20 },
      },
      y: {
        min: 0.75,
        max: 1.0,
        grid: { color: "rgba(255,255,255,0.05)", drawTicks: false },
        ticks: {
          stepSize: 0.05,
          callback: (v) => v.toFixed(2),
          font: { size: 11, family: "'JetBrains Mono', monospace" },
        },
      },
    },
  },
});

/* ════════════════════════════════════════════════════════════════════════════
   WHAT-IF
   ════════════════════════════════════════════════════════════════════════════ */
let wiProtocol = "TCP";

// Slider labels
const wiSliders = [
  { sliderId: "wi-duration", valId: "wi-dur-val", fmt: (v) => v },
  { sliderId: "wi-src",      valId: "wi-src-val", fmt: (v) => fmtNum(Number(v)) },
  { sliderId: "wi-dst",      valId: "wi-dst-val", fmt: (v) => fmtNum(Number(v)) },
  { sliderId: "wi-fl",       valId: "wi-fl-val",  fmt: (v) => v },
];

wiSliders.forEach(({ sliderId, valId, fmt: fmtFn }) => {
  const el = $(sliderId);
  const lbl = $(valId);
  el.addEventListener("input", () => {
    lbl.textContent = fmtFn(el.value);
    updateSliderFill(el);
  });
  updateSliderFill(el);
  lbl.textContent = fmtFn(el.value);
});

// Protocol buttons
document.querySelectorAll(".proto-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".proto-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    wiProtocol = btn.dataset.proto;
  });
});

$("whatif-submit-btn").addEventListener("click", async () => {
  const payload = {
    connection_duration: parseFloat($("wi-duration").value),
    src_bytes:           parseInt($("wi-src").value),
    dst_bytes:           parseInt($("wi-dst").value),
    failed_logins:       parseInt($("wi-fl").value),
    protocol_type:       wiProtocol,
  };

  $("wi-idle").classList.add("hidden");
  const output = $("wi-output");
  output.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const cfg = tierConfig(data.predicted_tier);
    const tierBadge = $("wi-tier-badge");
    tierBadge.textContent        = data.predicted_tier;
    tierBadge.style.color        = cfg.color;
    tierBadge.style.background   = cfg.bg;
    tierBadge.style.borderRadius = "12px";

    renderProbBars($("wi-prob-bars"), data.probabilities);
    $("wi-advisory-text").textContent = data.advisory;

    output.classList.remove("hidden");
  } catch (err) {
    $("wi-idle").classList.remove("hidden");
    $("wi-idle").textContent = `⚠ ${err.message}`;
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   BATCH
   ════════════════════════════════════════════════════════════════════════════ */
const batchInput = $("batch-input");
const batchCount = $("batch-count");

batchInput.addEventListener("input", updateBatchCount);

function parseBatchLines() {
  return batchInput.value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean);
}

function updateBatchCount() {
  const records = parseBatchLines();
  batchCount.textContent = `${records.length} record${records.length !== 1 ? "s" : ""} ready`;
}

const BATCH_EXAMPLE = [
  `{"connection_duration": 185.3, "src_bytes": 12400, "dst_bytes": 230000, "failed_logins": 0, "protocol_type": "TCP"}`,
  `{"connection_duration": 0.8, "src_bytes": 120, "dst_bytes": 0, "failed_logins": 4, "protocol_type": "UDP"}`,
  `{"connection_duration": 8.4, "src_bytes": 2800000, "dst_bytes": 20, "failed_logins": 0, "protocol_type": "ICMP"}`,
  `{"connection_duration": 45.0, "src_bytes": 500, "dst_bytes": 300, "failed_logins": 0, "protocol_type": "TCP"}`,
  `{"connection_duration": 1.2, "src_bytes": 200, "dst_bytes": 0, "failed_logins": 7, "protocol_type": "UDP"}`,
].join("\n");

$("batch-load-example-btn").addEventListener("click", () => {
  batchInput.value = BATCH_EXAMPLE;
  updateBatchCount();
});

let batchResultsData = [];

$("batch-submit-btn").addEventListener("click", async () => {
  const records = parseBatchLines();
  if (!records.length) return;

  const list = $("batch-results-list");
  const resultsPanel = $("batch-results");
  list.innerHTML = "";
  resultsPanel.classList.remove("hidden");
  batchResultsData = [];

  for (let i = 0; i < records.length; i++) {
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(records[i]),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      batchResultsData.push({ index: i + 1, ...data });

      const cfg  = tierConfig(data.predicted_tier);
      const probaStr = Object.entries(data.probabilities)
        .map(([k, v]) => `${k}: ${fmt(v)}`)
        .join(" · ");

      const row = document.createElement("div");
      row.className = "batch-result-row";
      row.style.animationDelay = `${i * 60}ms`;
      row.innerHTML = `
        <span class="batch-idx">#${i + 1}</span>
        <span class="batch-tier-badge ${cfg.class}">${data.predicted_tier}</span>
        <span class="batch-proba-mini">${probaStr}</span>
      `;
      list.appendChild(row);
    } catch (err) {
      const row = document.createElement("div");
      row.className = "batch-result-row";
      row.innerHTML = `<span class="batch-idx">#${i + 1}</span><span style="color:#ef4444;font-size:12px">Error: ${err.message}</span>`;
      list.appendChild(row);
    }
  }
});

$("batch-export-btn").addEventListener("click", () => {
  if (!batchResultsData.length) return;
  const header = "index,predicted_tier,prob_Normal,prob_Probe,prob_DoS,advisory";
  const rows = batchResultsData.map((d) => [
    d.index,
    d.predicted_tier,
    d.probabilities["Normal"] ?? "",
    d.probabilities["Probe"] ?? "",
    d.probabilities["DoS"] ?? "",
    `"${d.advisory}"`,
  ].join(","));

  const csv  = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "nite_batch_results.csv";
  a.click();
  URL.revokeObjectURL(url);
});
