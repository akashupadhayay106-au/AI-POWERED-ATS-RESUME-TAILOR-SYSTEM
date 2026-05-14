import "./styles.css";
import { parseResumeFile } from "./parser.js";
import { computeAtsScore } from "./atsScorer.js";
import {
  renderGauge,
  renderKeywordBars,
  renderRadar,
  renderKeywordGapChart,
  renderBenchmarkChart,
  renderDensityChart,
} from "./charts.js";
import { fetchJdFromUrl } from "./jdFetch.js";
import { computeReadability } from "./textUtils.js";
import { initThreeScene } from "./threeScene.js";

/** @type {{ raw: string, structured: Record<string,string>, meta: { fileName: string } } | null} */
let resumeState = null;
/** @type {ReturnType<typeof computeAtsScore> | null} */
let lastScore = null;

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};

function setStatus(el, text, cls = "") {
  el.textContent = text;
  el.className = "status-bar" + (cls ? " " + cls : "");
}

function buildLocalSuggestions(score) {
  const items = [];
  const miss = score.missingKeywords.slice(0, 8);
  if (miss.length) {
    items.push({
      title: "Close keyword gaps",
      detail: `Weave these JD terms where truthful: ${miss.join(", ")}.`,
      impact: "critical",
      category: "keywords",
    });
  }
  if (score.breakdown.sections < 70) {
    items.push({
      title: "Strengthen section coverage",
      detail: "Ensure clear Experience, Education, and Skills blocks with standard headings.",
      impact: "important",
      category: "structure",
    });
  }
  if (score.breakdown.format < 75) {
    items.push({
      title: "Simplify formatting",
      detail: "Avoid unusual symbols, dense tables, and emoji-like characters for safer ATS parsing.",
      impact: "important",
      category: "format",
    });
  }
  if (score.breakdown.experience < 65) {
    items.push({
      title: "Align achievements to the JD",
      detail: "Mirror responsibilities with quantified bullets using strong verbs.",
      impact: "important",
      category: "experience",
    });
  }
  items.push({
    title: "Add a tight summary",
    detail: "3–4 sentences mapping your top strengths to the role’s core needs.",
    impact: "optional",
    category: "summary",
  });
  return items;
}

function renderSuggestions(items) {
  const ul = $("suggestionsList");
  ul.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    li.className = it.impact || "optional";
    li.innerHTML = `<span class="tag">${escapeHtml(it.category || "tip")}</span><span class="tag">${escapeHtml(it.impact || "optional")}</span><strong>${escapeHtml(it.title)}</strong><br/>${escapeHtml(it.detail)}`;
    ul.appendChild(li);
  }
}

function renderJobSuggestions(data) {
  const container = $("jobSuggestions");
  if (!data || (!data.technical_skills?.length && !data.soft_skills?.length && !data.tools?.length)) {
    container.innerHTML = `<p class="status-bar">Run an analysis with the Python backend to see intelligence classification.</p>`;
    return;
  }
  const tech = (data.technical_skills || []).map((s) => `<span class="job-pill">${escapeHtml(s)}</span>`).join("");
  const soft = (data.soft_skills || []).map((s) => `<span class="job-pill job-pill-skill">${escapeHtml(s)}</span>`).join("");
  const tools = (data.tools || []).map((s) => `<span class="job-pill job-pill-accent">${escapeHtml(s)}</span>`).join("");
  
  container.innerHTML = `
    <div class="job-card">
      <div class="job-card-row"><strong>Technical skills</strong><div class="job-pill-row">${tech || "None detected"}</div></div>
      <div class="job-card-row"><strong>Soft skills</strong><div class="job-pill-row">${soft || "None detected"}</div></div>
      <div class="job-card-row"><strong>Tools & tech</strong><div class="job-pill-row">${tools || "None detected"}</div></div>
    </div>
  `;
}

function renderTailorMeta(score) {
  const meta = $("tailorMeta");
  if (!score) {
    meta.innerHTML = "";
    return;
  }
  const missingTop = score.missingKeywords
    .slice(0, 8)
    .map((kw) => `<span class="keyword-pill">${escapeHtml(kw)}</span>`)
    .join("");
  meta.innerHTML = `<p class="status-bar"><strong>Tailor preview:</strong> Top missing JD keywords to integrate: ${missingTop}</p>`;
}

function renderKeywordGapLegend(jdKeywords, matched) {
  const legend = $("keywordGapLegend");
  const missing = jdKeywords.filter((k) => !matched.includes(k));
  legend.textContent = `${matched.length} matched, ${missing.length} missing of top ${Math.min(jdKeywords.length, 12)} JD keywords.`;
}

const PY_BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
  ? "http://127.0.0.1:8001" 
  : "https://resume-ai-backend.onrender.com";

async function backendPost(path, payload) {
  const response = await fetch(`${PY_BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || `Backend error ${response.status}`);
  }
  return response.json();
}

async function backendGet(path) {
  const response = await fetch(`${PY_BACKEND_URL}${path}`);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || `Backend error ${response.status}`);
  }
  return response.json();
}

async function callBackendAnalyze(resumeText, jdText, filename) {
  return backendPost("/api/analyze-resume", { resume_text: resumeText, jd_text: jdText, filename });
}

async function callBackendTailor(resumeText, jdText) {
  const data = await backendPost("/api/ai/auto-tailor", { resume_text: resumeText, jd_text: jdText });
  return data.tailored;
}

async function callBackendCoverLetter(resumeText, jdText) {
  const data = await backendPost("/api/ai/cover-letter", { resume_text: resumeText, jd_text: jdText });
  return data.cover_letter;
}

async function callBackendHistory() {
  return backendGet("/api/history");
}

async function callBackendNews(role, domain) {
  if (role && domain) {
    return backendPost("/api/news/personalized", { role, domain });
  }
  return backendGet("/api/news/top");
}

async function callBackendSuggestions(resumeText, jdText, score) {
  const data = await backendPost("/api/ai/suggestions", { resume_text: resumeText, jd_text: jdText, score });
  return data.suggestions || [];
}

async function callBackendChat(message, resumeText, jdText, history) {
  const data = await backendPost("/api/ai/chat", { message, resume_text: resumeText, jd_text: jdText, history });
  return data.reply;
}

async function callBackendLinkedIn(resumeText) {
  const data = await backendPost("/api/ai/linkedin-optimize", { resume_text: resumeText });
  return data.summary;
}

async function callBackendQuestions(resumeText, jdText) {
  const data = await backendPost("/api/ai/interview-questions", { resume_text: resumeText, jd_text: jdText });
  return data.questions;
}

async function callBackendEnhanceProjects(projectText) {
  const data = await backendPost("/api/ai/enhance-projects", { project_text: projectText });
  return data.bullets;
}

async function callBackendJobRecommendations(resumeText, location) {
  return backendPost("/api/jobs/recommendations", { resume_text: resumeText, location });
}

async function callBackendTailorForJob(resumeText, jobId, jobDescription) {
  const data = await backendPost("/api/jobs/tailor", { resume_text: resumeText, job_id: jobId, job_description: jobDescription });
  return data.tailored;
}

function renderBreakdownTable(score) {
  const tbody = $("breakdownTable").querySelector("tbody");
  if (!tbody) return;
  const rows = [
    ["Keyword match", "35%", score.breakdown.keyword],
    ["Format compliance", "15%", score.breakdown.format],
    ["Section completeness", "15%", score.breakdown.sections],
    ["Experience relevance", "20%", score.breakdown.experience],
    ["Skills alignment", "15%", score.breakdown.skills],
  ];
  tbody.innerHTML = rows
    .map(
      ([label, w, val]) =>
        `<tr><td>${escapeHtml(String(label))}</td><td>${w}</td><td>${escapeHtml(String(val))}</td></tr>`
    )
    .join("");
}

function escapeHtml(s) {
  if (typeof s !== "string") return String(s);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function runAnalysis() {
  const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
  if (!resumeState?.raw) {
    setStatus($("uploadStatus"), "Upload a resume first.", "error");
    return;
  }
  if (jd.length < 80) {
    setStatus($("jdStatus"), "Paste a fuller job description (80+ characters) for meaningful scoring.", "error");
    return;
  }

  // Show loading state
  const btnAnalyze = $("btnAnalyze");
  const originalText = btnAnalyze.textContent;
  btnAnalyze.disabled = true;
  btnAnalyze.textContent = "Analyzing...";
  setStatus($("jdStatus"), "Running deep analysis with Python AI engine...");

  let score = null;
  let backendUsed = false;
  try {
    score = await callBackendAnalyze(resumeState.raw, jd, resumeState.meta.fileName);
    backendUsed = true;
  } catch (error) {
    console.error("Backend analysis failed, falling back to local:", error);
    setStatus($("jdStatus"), "Analysis service temporarily busy. Please try again in a moment.", "error");
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = originalText;
    return;
  }
  
  btnAnalyze.disabled = false;
  btnAnalyze.textContent = originalText;
  lastScore = score;

  $("scoreInterpret").textContent = `${score.overall}/100 — ${score.interpret}`;
  let summaryText = `Matched ${score.matchedKeywords.length} JD keywords. ${score.explanation || ""}`;
  
  setStatus($("analysisSummary"), summaryText, "success");
  setStatus(
    $("jdStatus"),
    backendUsed
      ? "Analysis powered by the Python backend."
      : "Python backend unavailable; using local analysis.",
    backendUsed ? "success" : "warning"
  );

  renderBreakdownTable(score);
  renderGauge(/** @type {HTMLCanvasElement} */ ($("chartGauge")), score.overall);
  renderRadar(/** @type {HTMLCanvasElement} */ ($("chartRadar")), score.breakdown);
  renderKeywordBars(
    /** @type {HTMLCanvasElement} */ ($("chartKeywords")),
    score.jd.keywords,
    score.matchedKeywords
  );
  renderKeywordGapChart(
    /** @type {HTMLCanvasElement} */ ($("chartKeywordGap")),
    score.jd.keywords,
    score.matchedKeywords
  );
  renderKeywordGapLegend(score.jd.keywords, score.matchedKeywords);
  renderTailorMeta(score);
  renderJobSuggestions(score.jd_intelligence); // Use the JD classification intelligence
  runExtraAnalytics(resumeState.raw, score);
  renderSuggestions(buildLocalSuggestions(score));
  
  // Render Weak Bullets if any
  const suggestionsList = $("suggestionsList");
  if (score.weak_bullets && score.weak_bullets.length > 0) {
    score.weak_bullets.forEach(wb => {
      const li = document.createElement("li");
      li.className = "important";
      li.innerHTML = `<span class="tag">intelligence</span><span class="tag">weak-bullet</span><strong>Weak Bullet Detected</strong><br/>${escapeHtml(wb.bullet)}<br/><small style="color:var(--warning)">${wb.issues.join(", ")}</small>`;
      suggestionsList.prepend(li);
    });
  }

  // Refresh history if backend was used
  if (backendUsed) refreshHistory();

  setupQuickActions();
}

function runExtraAnalytics(resumeText, score) {
  // Readability
  const read = computeReadability(resumeText);
  $("fleschScore").textContent = read.score;
  $("avgSentenceLength").textContent = read.avgSentenceLength;
  $("readabilityInterpret").textContent = `Flesch-Kincaid: ${read.interpret}`;

  // Benchmark
  renderBenchmarkChart($("chartBenchmark"), score.overall, 72);
  $("benchmarkSummary").textContent =
    score.overall > 72
      ? "Your resume is above the industry average (72)."
      : "Your resume is below the industry average (72). Aim for 80+.";

  // Density
  const words = resumeText.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freq = {};
  for (const w of words) {
    if (w.length > 3) freq[w] = (freq[w] || 0) + 1;
  }
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const densityData = Object.fromEntries(sorted);
  renderDensityChart($("chartDensity"), densityData);

  // Format Checklist
  renderFormatChecklist(resumeText, score.breakdown.format);
}

function renderFormatChecklist(text, formatScore) {
  const ul = $("formatChecklist");
  ul.innerHTML = "";
  const checks = [
    { label: "Standard headings used", pass: !text.includes("??") },
    { label: "No unusual symbols (█, ▓, etc.)", pass: !/[█▓▒░]/.test(text) },
    { label: "Safe length (12-250 lines)", pass: text.split("\n").length >= 12 && text.split("\n").length <= 250 },
    { label: "No complex tables (detected via tabs)", pass: !text.includes("\t") },
    { label: "Clean character encoding", pass: !/[^\x00-\x7F]/.test(text.slice(0, 1000)) },
  ];

  for (const c of checks) {
    const li = document.createElement("li");
    li.className = c.pass ? "pass" : "fail";
    li.innerHTML = `<span>${c.pass ? "✓" : "✗"}</span> ${c.label}`;
    ul.appendChild(li);
  }
}

function setupQuickActions() {
  const wrap = $("quickActions");
  wrap.innerHTML = "";
  const presets = [
    "Explain my score",
    "Top missing keywords",
    "Improve my summary",
    "What should I fix first?",
  ];
  for (const label of presets) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => sendChat(label));
    wrap.appendChild(b);
  }
}

/** @type {Array<{ role: string, text: string }>} */
const chatHistory = [];

async function sendChat(text) {
  const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
  if (!resumeState || !jd) {
    appendChat("assistant", "Please upload a resume and provide a JD before chatting.");
    return;
  }
  
  appendChat("user", text);
  chatHistory.push({ role: "user", text });
  $("chatTyping").hidden = false;
  try {
    // Convert history for backend: content instead of text
    const formattedHistory = chatHistory.map(h => ({ role: h.role, content: h.text }));
    const reply = await callBackendChat(text, resumeState.raw, jd, formattedHistory);
    appendChat("assistant", reply);
    chatHistory.push({ role: "assistant", text: reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    appendChat("assistant", `Error: ${msg}`);
  } finally {
    $("chatTyping").hidden = true;
  }
}

function appendChat(role, text) {
  const body = $("chatBody");
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  div.appendChild(bubble);
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

async function refreshNews() {
  const container = $("newsFeed");
  try {
    const role = lastScore?.fit_prediction || "technology";
    const news = await callBackendNews(role, "career");
    if (!news || news.length === 0) {
      container.innerHTML = `<p class="status-bar">Insights temporarily unavailable. Please try again later.</p>`;
      return;
    }
    container.innerHTML = news.map(art => {
      const sourceName = typeof art.source === 'object' ? art.source.name : art.source;
      return `
      <div class="news-card">
        ${art.urlToImage ? `<img src="${art.urlToImage}" class="news-img" alt="News" onerror="this.style.display='none'">` : ""}
        <div class="news-body">
          <h3 class="news-title">${escapeHtml(art.title)}</h3>
          <div class="news-meta">
            ${escapeHtml(sourceName || "Unknown Source")} | ${art.published_at ? new Date(art.published_at).toLocaleDateString() : (art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : "Recently")}
          </div>
          <p class="news-desc">${escapeHtml(art.description || "")}</p>
          <div class="news-footer">
            <a href="${art.url}" target="_blank" class="btn btn-ghost btn-sm" style="text-decoration:none">Read More</a>
          </div>
        </div>
      </div>
    `}).join("");
  } catch (e) {
    container.innerHTML = `<p class="status-bar error">Failed to load career insights: ${e.message}</p>`;
  }
}

function wireTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = {
    overview: $("panel-overview"),
    charts: $("panel-charts"),
    suggestions: $("panel-suggestions"),
    analytics: $("panel-analytics"),
    tailor: $("panel-tailor"),
    career: $("panel-career"),
    livejobs: $("panel-livejobs"),
    insights: $("panel-insights"),
    history: $("panel-history"),
  };
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.getAttribute("data-tab");
      if (!name) return;

      // Handle tab-specific data refreshing
      if (name === "history") refreshHistory();
      if (name === "insights") refreshNews();

      tabs.forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      Object.entries(panels).forEach(([key, panel]) => {
        const on = key === name;
        panel.classList.toggle("active", on);
        panel.toggleAttribute("hidden", !on);
      });
    });
  });
}

function wireUpload() {
  const dz = $("dropzone");
  const input = /** @type {HTMLInputElement} */ ($("fileInput"));

  dz.addEventListener("click", () => input.click());
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });

  ["dragenter", "dragover"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove("dragover");
    })
  );

  dz.addEventListener("drop", async (e) => {
    const dt = e.dataTransfer;
    const file = dt?.files?.[0];
    if (file) await handleFile(file);
  });

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (file) await handleFile(file);
    input.value = "";
  });
}

async function handleFile(file) {
  const status = $("uploadStatus");
  const preview = $("resumePreview");
  try {
    setStatus(status, "Parsing…");
    resumeState = await parseResumeFile(file);
    preview.hidden = false;
    preview.textContent = resumeState.raw.slice(0, 4000) + (resumeState.raw.length > 4000 ? "\n…" : "");
    setStatus(status, `Loaded ${resumeState.meta.fileName}`, "success");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setStatus(status, msg, "error");
    preview.hidden = true;
    resumeState = null;
  }
}

function renderJobs(jobs) {
  const container = $("liveJobsList");
  if (!jobs || jobs.length === 0) {
    container.innerHTML = `<p class="status-bar">No matching jobs found at the moment. Try a different location or update your resume.</p>`;
    return;
  }

  container.innerHTML = "";
  jobs.forEach((job) => {
    const card = document.createElement("div");
    card.className = "job-card";
    
    const matchScore = job.match_info?.match_percentage || 0;
    
    card.innerHTML = `
      <div class="job-card-header">
        <h3 class="job-title">${escapeHtml(job.title)}</h3>
        <div class="match-container">
           <div class="match-meter">
              <div class="match-fill" style="width: ${matchScore}%"></div>
           </div>
           <span class="match-badge">${Math.round(matchScore)}% Match</span>
        </div>
      </div>
      <div class="job-meta">
        <span class="icon">🏢</span> <strong>${escapeHtml(job.company)}</strong> 
        <span class="icon" style="margin-left:10px">📍</span> ${escapeHtml(job.location)}
      </div>
      <div class="job-desc">${escapeHtml(job.description)}</div>
      <div class="job-insights">
        <div class="insight-item">
          <span class="insight-icon">💡</span>
          <span class="insight-text">${job.match_info?.why_it_matches || "Good match for your skills."}</span>
        </div>
      </div>
      <div class="job-actions">
        <a href="${job.apply_link}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none;">View Job</a>
        <button type="button" class="btn btn-primary btn-sm btn-tailor-job" data-id="${job.id}">Tailor Resume</button>
        <button type="button" class="btn btn-ghost btn-sm">Save Job</button>
      </div>
    `;

    // Handle tailoring for this specific job
    card.querySelector(".btn-tailor-job").addEventListener("click", async () => {
      const btn = card.querySelector(".btn-tailor-job");
      btn.disabled = true;
      btn.textContent = "Tailoring...";
      
      try {
        // Set JD input to this job's description (or fetch full if available)
        const jdInput = /** @type {HTMLTextAreaElement} */ ($("jdInput"));
        jdInput.value = job.description;
        
        // Switch to Tailor tab
        document.querySelector('[data-tab="tailor"]').click();
        
        // Trigger tailoring
        $("btnTailor").click();
      } catch (e) {
        alert("Tailoring failed: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Tailor Resume";
      }
    });

    container.appendChild(card);
  });
}

async function refreshHistory() {
  const container = $("historyList");
  try {
    const history = await callBackendHistory();
    if (!history || history.length === 0) {
      container.innerHTML = `<p class="status-bar">No history yet.</p>`;
      return;
    }
    container.innerHTML = history
      .map(
        (item) => `
      <div class="history-item">
        <div class="history-main">
          <strong>${escapeHtml(item.filename)}</strong>
          <span class="score-pill ${item.overall_score >= 70 ? "high" : "low"}">${item.overall_score}</span>
        </div>
        <div class="history-meta">
          ${new Date(item.created_at).toLocaleString()}
        </div>
      </div>
    `
      )
      .join("");
  } catch (e) {
    container.innerHTML = `<p class="status-bar error">Failed to load history: ${e.message}</p>`;
  }
}

function wireMainActions() {
  refreshHistory();
  $("btnAnalyze").addEventListener("click", () => runAnalysis());

  $("btnFetchJd").addEventListener("click", async () => {
    const urlInp = /** @type {HTMLInputElement} */ ($("jdUrlInput"));
    const jdTa = /** @type {HTMLTextAreaElement} */ ($("jdInput"));
    const url = urlInp.value.trim();
    if (!url) {
      setStatus($("jdStatus"), "Enter a job posting URL first.", "error");
      return;
    }
    setStatus($("jdStatus"), "Fetching via dev proxy…");
    try {
      const text = await fetchJdFromUrl(url);
      jdTa.value = text;
      setStatus($("jdStatus"), "Fetched into JD box. Trim noise if needed, then Run analysis.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus($("jdStatus"), msg, "error");
    }
  });

  $("btnSaveJd").addEventListener("click", () => {
    const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
    if (jd.length < 20) {
      setStatus($("jdStatus"), "Nothing to save.", "error");
      return;
    }
    try {
      const key = "resumeai_jd_history";
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      prev.unshift({ at: new Date().toISOString(), snippet: jd.slice(0, 120) + (jd.length > 120 ? "…" : "") });
      localStorage.setItem(key, JSON.stringify(prev.slice(0, 12)));
      setStatus($("jdStatus"), "JD saved to local history.", "success");
    } catch {
      setStatus($("jdStatus"), "Could not save JD history.", "error");
    }
  });

  $("btnAiSuggestions").addEventListener("click", async () => {
    if (!resumeState || !lastScore) {
      $("suggestionsHint").textContent = "Run analysis after uploading a resume and pasting a JD.";
      return;
    }
    const btn = $("btnAiSuggestions");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Generating...";
    $("suggestionsHint").textContent = "Calling AI career assistant...";
    try {
      const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
      const items = await callBackendSuggestions(resumeState.raw, jd, lastScore.overall);
      const merged = [...buildLocalSuggestions(lastScore)];
      for (const it of items) {
        merged.push({
          title: it.title || "Suggestion",
          detail: it.detail || "",
          impact: it.impact || "optional",
          category: it.category || "ai",
        });
      }
      renderSuggestions(merged.slice(0, 14));
      $("suggestionsHint").textContent = items.length 
        ? "AI suggestions merged with local heuristics." 
        : "AI suggestions temporarily unavailable; showing local heuristics only.";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      $("suggestionsHint").textContent = msg;
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  $("btnTailor").addEventListener("click", async () => {
    const out = /** @type {HTMLTextAreaElement} */ ($("tailoredResume"));
    const st = $("tailorStatus");
    if (!resumeState) {
      setStatus(st, "Upload a resume first.", "error");
      return;
    }
    const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
    if (jd.length < 80) {
      setStatus(st, "Paste a fuller job description.", "error");
      return;
    }
    const btn = $("btnTailor");
    btn.disabled = true;
    setStatus(st, "Tailoring with Python backend…");
    out.value = "";
    try {
      const text = await callBackendTailor(resumeState.raw, jd);
      out.value = text;
      setStatus(st, "Tailored resume generated by Python backend.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(st, msg, "error");
    } finally {
      btn.disabled = false;
    }
  });

  $("btnCopyTailored").addEventListener("click", async () => {
    const out = /** @type {HTMLTextAreaElement} */ ($("tailoredResume"));
    await navigator.clipboard.writeText(out.value);
    setStatus($("tailorStatus"), "Copied to clipboard.", "success");
  });

  $("btnGenerateCoverLetter").addEventListener("click", async () => {
    const out = /** @type {HTMLTextAreaElement} */ ($("coverLetterText"));
    if (!resumeState) {
      alert("Upload a resume first.");
      return;
    }
    const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
    if (jd.length < 50) {
      alert("Provide a JD first.");
      return;
    }
    out.value = "Generating...";
    try {
      const text = await callBackendCoverLetter(resumeState.raw, jd);
      out.value = text;
    } catch (e) {
      out.value = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  });

  $("btnCopyCoverLetter").addEventListener("click", async () => {
    const out = /** @type {HTMLTextAreaElement} */ ($("coverLetterText"));
    await navigator.clipboard.writeText(out.value);
    alert("Copied!");
  });

  $("btnOptimizeLinkedIn").addEventListener("click", async () => {
    const out = /** @type {HTMLTextAreaElement} */ ($("linkedinOutput"));
    if (!resumeState) return alert("Upload resume first");
    out.value = "Generating...";
    try {
      out.value = await callBackendLinkedIn(resumeState.raw);
    } catch (e) {
      out.value = `Error: ${e.message}`;
    }
  });

  $("btnGenQuestions").addEventListener("click", async () => {
    const out = $("interviewQuestions");
    if (!resumeState) return alert("Upload resume first");
    const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
    out.innerHTML = "Generating...";
    try {
      const qs = await callBackendQuestions(resumeState.raw, jd);
      out.innerHTML = `<ul style="margin:0; padding-left:1.2rem;">${qs.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ul>`;
    } catch (e) {
      out.textContent = `Error: ${e.message}`;
    }
  });

  $("btnEnhanceProjects").addEventListener("click", async () => {
    const inp = /** @type {HTMLTextAreaElement} */ ($("projectInput"));
    const out = $("enhancedProjects");
    if (!inp.value.trim()) return alert("Paste project description first");
    out.innerHTML = "Enhancing...";
    try {
      const bullets = await callBackendEnhanceProjects(inp.value.trim());
      out.innerHTML = `<ul style="margin:0; padding-left:1.2rem;">${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;
    } catch (e) {
      out.textContent = `Error: ${e.message}`;
    }
  });

  $("btnFetchLiveJobs").addEventListener("click", async () => {
    if (!resumeState) return alert("Upload resume first");
    const container = $("liveJobsList");
    const location = /** @type {HTMLSelectElement} */ ($("jobLocation")).value;
    container.innerHTML = `<p class="status-bar">Finding matches for your profile in ${location.toUpperCase()}...</p>`;
    try {
      const jobs = await callBackendJobRecommendations(resumeState.raw, location);
      renderJobs(jobs);
    } catch (e) {
      container.innerHTML = `<p class="status-bar error">Failed to fetch jobs: ${e.message}</p>`;
    }
  });

  $("btnExportPdf").addEventListener("click", () => {
    const out = /** @type {HTMLTextAreaElement} */ ($("tailoredResume")).value;
    if (!out.trim()) {
      setStatus($("tailorStatus"), "Nothing to export. Run auto-tailor first.", "error");
      return;
    }
    const jspdf = globalThis.jspdf;
    if (!jspdf?.jsPDF) {
      setStatus($("tailorStatus"), "jsPDF failed to load.", "error");
      return;
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    
    // Better PDF generation
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Optimized Resume", 48, 48);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(out, 500);
    let y = 70;
    const lh = 14;
    for (const line of lines) {
      if (y > 750) {
        doc.addPage();
        y = 48;
      }
      doc.text(line, 48, y);
      y += lh;
    }
    doc.save("tailored_resume.pdf");
    setStatus($("tailorStatus"), "PDF Exported!", "success");
  });

  $("btnClearData").addEventListener("click", () => {
    localStorage.removeItem("resumeai_jd_history");
    resumeState = null;
    lastScore = null;
    $("resumePreview").hidden = true;
    /** @type {HTMLTextAreaElement} */ ($("jdInput")).value = "";
    /** @type {HTMLInputElement} */ ($("jdUrlInput")).value = "";
    $("tailoredResume").value = "";
    $("chatBody").innerHTML = "";
    chatHistory.length = 0;
    setStatus(
      $("uploadStatus"),
      "Cleared resume, JD, URL field, tailored output, and chat. API key unchanged.",
      "success"
    );
  });
}

function wireChat() {
  const widget = $("chatWidget");
  let collapsed = false;
  $("chatToggle").addEventListener("click", () => {
    collapsed = !collapsed;
    widget.classList.toggle("collapsed", collapsed);
    $("chatChevron").textContent = collapsed ? "▲" : "▼";
  });

  $("chatSend").addEventListener("click", () => {
    const inp = /** @type {HTMLInputElement} */ ($("chatInput"));
    const v = inp.value.trim();
    if (!v) return;
    inp.value = "";
    void sendChat(v);
  });

  /** @type {HTMLInputElement} */ ($("chatInput")).addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("chatSend").click();
    }
  });
}

function init() {
  initThreeScene("hero-canvas-container");
  wireTabs();
  wireUpload();
  wireMainActions();
  wireChat();
  setupQuickActions();
  appendChat(
    "assistant",
    "Hi! I'm your AI career coach. Upload your resume and paste a job description to get started. I can help you analyze your match, optimize for ATS, and even find live jobs!"
  );
}

init();
