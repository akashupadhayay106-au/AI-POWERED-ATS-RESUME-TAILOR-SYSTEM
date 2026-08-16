import "./styles.css";
import { parseResumeFile } from "./parser.js";
import { computeAtsScore } from "./atsScorer.js";
import { basicKeywordExtraction } from "./fallbackScorer.js";
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
import { run3DTailorSequence } from "./tailorAnimation.js";

/** @type {{ raw: string, structured: Record<string,string>, meta: { fileName: string } } | null} */
let resumeState = null;
/** @type {ReturnType<typeof computeAtsScore> | null} */
let lastScore = null;

// Upgraded career platform state
let resumeVersions = [];
let currentPreset = "modern";

const DEMO_RESUME = `Alex Mercer
alex.mercer@email.com | (555) 019-2834 | Seattle, WA
linkedin.com/in/alexmercer | github.com/alexmercer

PROFESSIONAL SUMMARY
Dynamic Software Engineer with over 4 years of experience specializing in backend architectures, microservices, and cloud deployments. Proven track record of designing scalable RESTful APIs, optimizing database performance, and collaborating in agile squads to deliver critical products.

PROFESSIONAL EXPERIENCE
Software Engineer | CloudScale Tech | Jan 2022 – Present
• Developed and maintained 12 core microservices using Node.js, Express, and PostgreSQL, supporting over 200k monthly active users.
• Migrated database cluster from a single RDS instance to a read-replica setup, reducing read latency by 35% and improving uptime to 99.95%.
• Collaborated in a team of 6 engineers to redesign the payment processing flow, integrating Stripe and reducing transaction drop-off rate by 18%.
• Wrote automated unit and integration tests using Jest, raising codebase test coverage from 60% to 88%.

Associate Developer | Innovate IT | Jun 2020 – Dec 2021
• Built and documented REST APIs using Python, FastAPI, and MongoDB for internal operations dashboards.
• Implemented automated CI/CD deployment pipelines using GitHub Actions, reducing manual deployment efforts by 4 hours weekly.
• Participated in weekly code reviews and sprint planning sessions, contributing to clean code practices and agile estimation.

EDUCATION
Bachelor of Science in Computer Science | University of Washington | Graduated June 2020

TECHNICAL SKILLS
• Programming Languages: JavaScript (ES6+), Python, SQL (PostgreSQL, MySQL)
• Frameworks & Libraries: Node.js, Express, FastAPI, React (Basic)
• Developer Tools & Cloud: AWS (S3, EC2, RDS), Docker, Git, Jest, GitHub Actions, Stripe API
`;

const DEMO_JD = `Job Title: Backend Engineer (Cloud API & Integration)
Company: NextGen Systems
Location: Seattle, WA (Hybrid)

About the Role:
We are seeking a Backend Engineer to build, scale, and maintain cloud-based API integrations and core services. You will work closely with frontend engineers, product managers, and devops to deliver highly available systems.

Key Responsibilities:
• Design and implement scalable backend APIs using Node.js (Express) or Python (FastAPI).
• Integrate with third-party service providers (payment systems, messaging platforms, auth providers).
• Optimize query performances for relational databases (PostgreSQL/MySQL).
• Containerize services using Docker and manage CI/CD flows to AWS environments.
• Write comprehensive tests to ensure reliability and catch regressions.

Qualifications:
• 3+ years of experience in backend development.
• Strong database experience with PostgreSQL.
• Experience with cloud service platforms (AWS).
• Solid understanding of version control, testing methodologies, and CI/CD pipelines.
• Bachelor’s degree in CS or equivalent experience.
`;

function runTailorStepper(durationMs, onStepChange, onComplete) {
  console.log(`[DEBUG-01] runTailorStepper invoked. Duration: ${durationMs}`);
  const overlay = $("progressOverlay");
  const percentEl = $("progressPercent");
  console.log(`[DEBUG-02] Extracted percentEl:`, !!percentEl, percentEl ? percentEl.textContent : "null");
  
  overlay.hidden = false;
  window.isThreePaused = true; // PAUSE WEBGL RENDERING TO PREVENT DEADLOCK
  console.log(`[DEBUG-03] Modal opened (hidden = false). Current textContent:`, percentEl ? percentEl.textContent : "N/A");
  
  let percent = 0;
  const interval = durationMs / 100;
  console.log(`[DEBUG-04] Calculated interval: ${interval}ms`);
  
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.remove("active", "completed");
  }

  console.log(`[DEBUG-05] About to set setInterval with ${interval}ms`);
  const timer = setInterval(() => {
    percent += 1;
    console.log(`[DEBUG-06] Interval tick! new percent = ${percent}`);
    
    if (percentEl) {
      percentEl.textContent = `${percent}%`;
      console.log(`[DEBUG-07] percentEl.textContent set to ${percent}%`);
    } else {
      console.log(`[DEBUG-07-ERROR] percentEl is completely null during tick!`);
    }
    
    try {
      const step = Math.min(5, Math.floor(percent / 20) + 1);
      onStepChange(step);
    } catch (err) {
      console.error("[runTailorStepper] Error in onStepChange:", err);
    }
    
    if (percent >= 100) {
      console.log("[runTailorStepper] Reached 100%, clearing interval");
      clearInterval(timer);
      setTimeout(() => {
        overlay.hidden = true;
        window.isThreePaused = false; // RESUME WEBGL
        console.log("[runTailorStepper] Modal closed, calling onComplete");
        onComplete();
      }, 400);
    }
  }, interval);
  console.log(`[DEBUG-08] setInterval returned timer ID: ${timer}`);
}

function onStepChange(step) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-${i}`);
    if (!el) continue;
    if (i < step) {
      el.classList.remove("active");
      el.classList.add("completed");
    } else if (i === step) {
      el.classList.add("active");
      el.classList.remove("completed");
    } else {
      el.classList.remove("active", "completed");
    }
  }
}

function updateDials(atsScore, keywordScore, readabilityScore, improvementScore) {
  const atsPath = document.getElementById("dialAtsPath");
  const atsText = document.getElementById("dialAtsText");
  if (atsPath && atsText) {
    const val = Math.round(atsScore);
    atsPath.setAttribute("stroke-dasharray", `${val}, 100`);
    atsText.textContent = `${val}%`;
  }

  const kwPath = document.getElementById("dialKeywordsPath");
  const kwText = document.getElementById("dialKeywordsText");
  if (kwPath && kwText) {
    const val = Math.round(keywordScore);
    kwPath.setAttribute("stroke-dasharray", `${val}, 100`);
    kwText.textContent = `${val}%`;
  }

  const rPath = document.getElementById("dialReadabilityPath");
  const rText = document.getElementById("dialReadabilityText");
  if (rPath && rText) {
    const val = Math.round(readabilityScore);
    rPath.setAttribute("stroke-dasharray", `${val}, 100`);
    rText.textContent = `${val}%`;
  }

  const impPath = document.getElementById("dialImprovementPath");
  const impText = document.getElementById("dialImprovementText");
  if (impPath && impText) {
    const val = Math.round(improvementScore);
    impPath.setAttribute("stroke", val >= 0 ? "#10b981" : "#ef4444");
    impPath.setAttribute("stroke-dasharray", `${Math.abs(val)}, 100`);
    impText.textContent = `${val >= 0 ? "+" : ""}${val}%`;
  }
}

function wireLatexAccordion() {
  const sections = document.querySelectorAll(".latex-accordion-section");
  sections.forEach((sec) => {
    const trigger = sec.querySelector(".latex-accordion-trigger");
    const panel = sec.querySelector(".latex-accordion-panel");
    const icon = sec.querySelector(".accordion-icon");

    if (!trigger || !panel) return;

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const isActive = sec.classList.contains("active");
      
      sections.forEach((otherSec) => {
        if (otherSec !== sec) {
          otherSec.classList.remove("active");
          const otherTrigger = otherSec.querySelector(".latex-accordion-trigger");
          const otherPanel = otherSec.querySelector(".latex-accordion-panel");
          const otherIcon = otherSec.querySelector(".accordion-icon");
          if (otherTrigger) otherTrigger.setAttribute("aria-expanded", "false");
          if (otherPanel) otherPanel.hidden = true;
          if (otherIcon) otherIcon.textContent = "▼";
        }
      });

      if (isActive) {
        sec.classList.remove("active");
        trigger.setAttribute("aria-expanded", "false");
        panel.hidden = true;
        if (icon) icon.textContent = "▼";
      } else {
        sec.classList.add("active");
        trigger.setAttribute("aria-expanded", "true");
        panel.hidden = false;
        if (icon) icon.textContent = "▲";
        
        setTimeout(() => {
          trigger.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
      }
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        trigger.click();
      }
    });
  });
}

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
    
    // Determine icon based on category
    let icon = "💡";
    if (it.category === "keywords") icon = "🔑";
    if (it.category === "structure") icon = "🏗️";
    if (it.category === "format") icon = "📄";
    if (it.category === "experience") icon = "💼";
    if (it.category === "summary") icon = "📝";
    if (it.category === "ai") icon = "🤖";

    li.innerHTML = `
      <div style="display:flex; gap:0.75rem; align-items:flex-start">
        <span style="font-size:1.25rem">${icon}</span>
        <div>
          <div style="margin-bottom:0.35rem">
            <span class="tag">${escapeHtml(it.category || "tip")}</span>
            <span class="tag" style="color: var(--${it.impact === 'critical' ? 'danger' : (it.impact === 'important' ? 'warning' : 'success')})">${escapeHtml(it.impact || "optional")}</span>
          </div>
          <strong style="display:block; margin-bottom:0.25rem; font-size:1rem">${escapeHtml(it.title)}</strong>
          <span style="color:var(--muted); font-size:0.9rem">${escapeHtml(it.detail)}</span>
        </div>
      </div>
    `;
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
  ? "http://127.0.0.1:8088" 
  : "https://resume-ai-backend.onrender.com";

async function backendPost(path, payload) {
  console.log(`[backendPost] Preparing fetch to ${path}`);
  const response = await fetch(`${PY_BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  console.log(`[backendPost] Fetch to ${path} resolved with status ${response.status}`);
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
  return data;
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

async function callBackendChat(message, resumeText, jdText, history, score) {
  const data = await backendPost("/api/ai/chat", { message, resume_text: resumeText, jd_text: jdText, history, score });
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

/** ─── Semantic JD Scoring ──────────────────────────────────────── */
async function callBackendScoreJd(resumeText, jdText) {
  return backendPost("/api/score-jd", { resume_text: resumeText, jd_text: jdText });
}

async function fetchScore(resumeText, jdText) {
  try {
    const response = await fetch(`${PY_BACKEND_URL}/api/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: resumeText, jd_text: jdText }),
    });
    if (!response.ok) throw new Error("Backend error");
    const data = await response.json();
    console.log("Phase 5 fetchScore response: " + JSON.stringify(data));
    lastScore = data;
    return data;
  } catch (error) {
    console.error("fetchScore failed:", error);
    lastScore = { score: 0 };
    return basicKeywordExtraction(jdText, resumeText);
  }
}
window.fetchScore = fetchScore;

/** Render the JD score result bar + keyword pills + low-score CTA */
function renderJdScoreResult(data) {
  const scoreResult = document.getElementById("jdScoreResult");
  const scoreNum    = document.getElementById("jdScoreNum");
  const scoreLabel  = document.getElementById("jdScoreLabel");
  const scoreFill   = document.getElementById("jdScoreBarFill");
  const kwRow       = document.getElementById("jdKwPillsRow");
  const lowScoreBtn = document.getElementById("btnLowScoreTailor");

  if (!scoreResult) return;

  const score = data.score || 0;
  const matched = data.matched_keywords || [];
  const missing = data.missing_keywords || [];

  scoreNum.textContent = `${score}%`;
  scoreFill.style.width = `${score}%`;

  const interpret = score >= 85 ? "Excellent Match 🎯"
    : score >= 70 ? "Good Match ✅"
    : score >= 55 ? "Fair Match ⚠️"
    : "Poor Match ❌";
  scoreLabel.textContent = interpret;

  // Keyword pills
  kwRow.innerHTML = [
    ...matched.slice(0, 6).map(k => `<span class="kw-pill-matched">✓ ${escapeHtml(k)}</span>`),
    ...missing.slice(0, 6).map(k => `<span class="kw-pill-missing">✗ ${escapeHtml(k)}</span>`)
  ].join("");

  // Show result
  scoreResult.classList.add("visible");

  // Update dials
  const bd = data.breakdown || {};
  updateDials(bd.ats || score, bd.keywords || score, bd.readability || score, 0);

  // Low-score CTA
  if (score < 80) {
    lowScoreBtn.classList.add("visible");
    lowScoreBtn.dataset.missingKeywords = JSON.stringify(missing);
  } else {
    lowScoreBtn.classList.remove("visible");
  }
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
  // window.triggerOrbReaction?.('parse');

  let score = null;
  let backendUsed = false;
  let stepperFinished = false;
  let backendFinished = false;
  let parseError = null;

  // Start stepper in parallel
  runTailorStepper(1500, onStepChange, () => {
    stepperFinished = true;
    checkCompletion();
  });

  // Call backend in parallel
  try {
    score = await callBackendAnalyze(resumeState.raw, jd, resumeState.meta.fileName);
    backendUsed = true;
    backendFinished = true;
    checkCompletion();
  } catch (error) {
    console.error("Backend analysis failed, falling back to local:", error);
    basicKeywordExtraction(jd, resumeState.raw);
    parseError = error;
    backendFinished = true;
    checkCompletion();
  }

  function checkCompletion() {
    if (!stepperFinished || !backendFinished) return;

    if (parseError || !score) {
      // window.triggerOrbReaction?.('error');
      setStatus($("jdStatus"), "Analysis service temporarily busy. Please try again in a moment.", "error");
      btnAnalyze.disabled = false;
      btnAnalyze.textContent = originalText;
      return;
    }

    // window.triggerOrbReaction?.('success');
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = originalText;
    lastScore = score;

    $("scoreInterpret").textContent = `${score.overall}/100 — ${score.interpret}`;
    let summaryText = `Matched ${score.matchedKeywords.length} JD keywords. ${score.explanation || ""}`;
    
    // Reveal results container
    $("results-container").hidden = false;
    
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
    
    // Update score dials!
    updateDials(score.overall, score.breakdown.keyword, score.breakdown.readability, 0);

    // Render Weak Bullets if any
    const suggestionsList = $("suggestionsList");
    suggestionsList.querySelectorAll(".weak-bullet-item").forEach(el => el.remove());
    
    if (score.weak_bullets && score.weak_bullets.length > 0) {
      score.weak_bullets.forEach(wb => {
        const li = document.createElement("li");
        li.className = "important weak-bullet-item";
        li.innerHTML = `
          <div style="display:flex; gap:0.75rem; align-items:flex-start">
            <span style="font-size:1.25rem">⚠️</span>
            <div>
              <div style="margin-bottom:0.35rem">
                <span class="tag">intelligence</span>
                <span class="tag" style="color: var(--warning)">important</span>
              </div>
              <strong style="display:block; margin-bottom:0.25rem; font-size:1rem">Weak Bullet Point</strong>
              <span style="color:var(--text); display:block; margin-bottom:0.25rem">"${escapeHtml(wb.bullet)}"</span>
              <small style="color:var(--warning)">Issues: ${wb.issues.join(", ")}</small>
            </div>
          </div>
        `;
        suggestionsList.prepend(li);
      });
    }

    // Refresh history if backend was used
    if (backendUsed) refreshHistory();
  }
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
let isChatting = false;

async function sendChat(text) {
  if (isChatting) return;
  
  const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
  if (!resumeState || !jd) {
    appendChat("assistant", "Please upload a resume and provide a JD before chatting.");
    return;
  }
  
  isChatting = true;
  const chatInput = /** @type {HTMLInputElement} */ ($("chatInput"));
  const chatSend = /** @type {HTMLButtonElement} */ ($("chatSend"));
  chatInput.disabled = true;
  chatSend.disabled = true;

  appendChat("user", text);
  chatHistory.push({ role: "user", text });
  $("chatTyping").hidden = false;
  
  try {
    const formattedHistory = chatHistory.map(h => ({ role: h.role, content: h.text }));
    
    // Timeout promise
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Couldn't get a response, try again")), 15000)
    );
    
    // Race backend against timeout
    const currentScore = lastScore ? (lastScore.score || lastScore) : null;
    const reply = await Promise.race([
      callBackendChat(text, resumeState.raw, jd, formattedHistory, currentScore),
      timeout
    ]);
    
    appendChat("assistant", reply);
    chatHistory.push({ role: "assistant", text: reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Standardize error message for timeout or fetch failure
    const finalMsg = msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Couldn't get a response") 
      ? "Couldn't get a response, try again" 
      : `Error: ${msg}`;
    appendChat("assistant", finalMsg);
  } finally {
    $("chatTyping").hidden = true;
    chatInput.disabled = false;
    chatSend.disabled = false;
    chatInput.focus();
    isChatting = false;
  }
}
window.sendChat = sendChat;

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
    container.innerHTML = news.map((art, idx) => {
      const sourceName = typeof art.source === 'object' ? art.source.name : art.source;
      // Add animation delay for staggered entrance
      const delay = (idx % 6) * 0.1;
      return `
      <div class="news-card" style="animation-delay: ${delay}s">
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

function autoPopulateLatexModal(resume) {
  if (!resume) return;
  const { raw, structured } = resume;
  
  // 1. Name
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  let fullName = lines[0] || "";
  if (fullName.length > 50 || fullName.includes("@")) {
    fullName = "";
  }
  const nameEl = document.getElementById("ltx-name");
  if (nameEl) nameEl.value = fullName;

  // 2. Contact details
  const contactText = structured.contact || "";
  const emailMatch = contactText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = contactText.match(/(\+?\d[\d\s().-]{8,}\d)/);
  
  const emailEl = document.getElementById("ltx-email");
  if (emailEl) emailEl.value = emailMatch ? emailMatch[0] : "";
  const phoneEl = document.getElementById("ltx-phone");
  if (phoneEl) phoneEl.value = phoneMatch ? phoneMatch[0] : "";
  
  const urls = contactText.match(/https?:\/\/[^\s]+/g) || [];
  let linkedin = "";
  let github = "";
  let portfolio = "";
  
  urls.forEach(url => {
    if (url.includes("linkedin.com")) linkedin = url;
    else if (url.includes("github.com")) github = url;
    else portfolio = url;
  });
  
  if (!linkedin) {
    const liMatch = contactText.match(/(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i);
    if (liMatch) linkedin = "https://" + liMatch[0];
  }
  if (!github) {
    const ghMatch = contactText.match(/(github\.com\/[a-zA-Z0-9_-]+)/i);
    if (ghMatch) github = "https://" + ghMatch[0];
  }
  
  const liEl = document.getElementById("ltx-linkedin");
  if (liEl) liEl.value = linkedin;
  const ghEl = document.getElementById("ltx-github");
  if (ghEl) ghEl.value = github;
  const portEl = document.getElementById("ltx-portfolio");
  if (portEl) portEl.value = portfolio;

  // Location
  const contactLines = contactText.split("\n").map(l => l.trim()).filter(Boolean);
  let location = "";
  for (const line of contactLines) {
    if (!line.includes("@") && !phoneMatch?.includes(line) && !line.includes("linkedin.com") && !line.includes("github.com")) {
      location = line;
      break;
    }
  }
  const locEl = document.getElementById("ltx-location");
  if (locEl) locEl.value = location || "Seattle, WA";

  // 3. Summary
  const sumEl = document.getElementById("ltx-summary");
  if (sumEl) sumEl.value = structured.summary || "";

  // 4. Skills
  const skillsText = structured.skills || "";
  const skProg = document.getElementById("ltx-skills-prog");
  if (skProg) skProg.value = skillsText.split("\n")[0] || "";
  const skData = document.getElementById("ltx-skills-data");
  if (skData) skData.value = skillsText.split("\n")[1] || "";
  const skTools = document.getElementById("ltx-skills-tools");
  if (skTools) skTools.value = skillsText.split("\n")[2] || "";

  // Helper local field generators that match main.js local builder patterns
  const makeRemoveBtn = (card) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ltx-remove-btn";
    btn.textContent = "✕ Remove";
    btn.addEventListener("click", () => card.remove());
    return btn;
  };

  const inputRow = (labelText, type, placeholder, name) => {
    const wrap = document.createElement("div");
    wrap.className = "latex-field";
    const lbl = document.createElement("label");
    lbl.textContent = labelText;
    const inp = document.createElement("input");
    inp.type = type;
    inp.placeholder = placeholder;
    inp.dataset.name = name;
    inp.className = "input input-sm";
    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    return wrap;
  };

  const textareaRow = (labelText, placeholder, name) => {
    const wrap = document.createElement("div");
    wrap.className = "latex-field latex-field-full";
    wrap.style.marginTop = "0.5rem";
    const lbl = document.createElement("label");
    lbl.textContent = labelText;
    const ta = document.createElement("textarea");
    ta.placeholder = placeholder;
    ta.dataset.name = name;
    ta.className = "input input-sm";
    ta.rows = 3;
    wrap.appendChild(lbl);
    wrap.appendChild(ta);
    return wrap;
  };

  // 5. Dynamic lists
  // Education
  const eduList = document.getElementById("ltx-education-list");
  if (eduList) {
    eduList.innerHTML = "";
    if (structured.education) {
      const eduLines = structured.education.split("\n").map(l => l.trim()).filter(Boolean);
      const card = document.createElement("div");
      card.className = "ltx-entry-card";
      const grid = document.createElement("div");
      grid.className = "latex-form-grid";
      grid.appendChild(inputRow("Degree / Program *", "text", "B.Tech Computer Science", "degree"));
      grid.appendChild(inputRow("Institution *", "text", "University Name", "institution"));
      grid.appendChild(inputRow("Location", "text", "City, State", "location"));
      grid.appendChild(inputRow("Dates *", "text", "Aug 2020 -- May 2024", "dates"));
      grid.appendChild(inputRow("GPA / CGPA (optional)", "text", "8.5 / 10", "gpa"));
      card.appendChild(grid);
      card.appendChild(makeRemoveBtn(card));
      
      card.querySelector('[data-name="degree"]').value = eduLines[0] || "";
      card.querySelector('[data-name="institution"]').value = eduLines[1] || "";
      card.querySelector('[data-name="dates"]').value = eduLines[2] || "";
      
      eduList.appendChild(card);
    } else {
      const hint = document.createElement("p");
      hint.className = "ltx-empty-hint";
      hint.textContent = "Click '+ Add Education' to add an entry.";
      eduList.appendChild(hint);
    }
  }

  // Experience
  const expList = document.getElementById("ltx-experience-list");
  if (expList) {
    expList.innerHTML = "";
    if (structured.experience) {
      const expLines = structured.experience.split("\n").map(l => l.trim()).filter(Boolean);
      const card = document.createElement("div");
      card.className = "ltx-entry-card";
      const grid = document.createElement("div");
      grid.className = "latex-form-grid";
      grid.appendChild(inputRow("Job Title *", "text", "Job Title", "title"));
      grid.appendChild(inputRow("Company *", "text", "Company Name", "company"));
      grid.appendChild(inputRow("Location", "text", "City, State", "location"));
      grid.appendChild(inputRow("Dates *", "text", "Dates", "dates"));
      card.appendChild(grid);
      card.appendChild(textareaRow("Bullet Points * (one per line)", "• Bullets", "bullets"));
      card.appendChild(makeRemoveBtn(card));
      
      card.querySelector('[data-name="title"]').value = expLines[0] || "";
      card.querySelector('[data-name="company"]').value = expLines[1] || "";
      card.querySelector('[data-name="dates"]').value = expLines[2] || "";
      
      const bullets = expLines.slice(3).join("\n");
      card.querySelector('[data-name="bullets"]').value = bullets || "";
      
      expList.appendChild(card);
    } else {
      const hint = document.createElement("p");
      hint.className = "ltx-empty-hint";
      hint.textContent = "Click '+ Add Experience' to add an entry.";
      expList.appendChild(hint);
    }
  }

  // Projects
  const projList = document.getElementById("ltx-project-list");
  if (projList) {
    projList.innerHTML = "";
    if (structured.projects) {
      const projLines = structured.projects.split("\n").map(l => l.trim()).filter(Boolean);
      const card = document.createElement("div");
      card.className = "ltx-entry-card";
      
      const nameWrap = document.createElement("div");
      nameWrap.className = "latex-field";
      const nameLbl = document.createElement("label");
      nameLbl.textContent = "Project Name *";
      const nameInp = document.createElement("input");
      nameInp.type = "text";
      nameInp.placeholder = "Sales & Inventory Analysis";
      nameInp.dataset.name = "name";
      nameInp.className = "input input-sm";
      nameWrap.appendChild(nameLbl);
      nameWrap.appendChild(nameInp);
      card.appendChild(nameWrap);
      card.appendChild(textareaRow("Description Bullets * (one per line)", "• Bullets", "description"));
      card.appendChild(makeRemoveBtn(card));
      
      card.querySelector('[data-name="name"]').value = projLines[0] || "";
      const desc = projLines.slice(1).join("\n");
      card.querySelector('[data-name="description"]').value = desc || "";
      
      projList.appendChild(card);
    } else {
      const hint = document.createElement("p");
      hint.className = "ltx-empty-hint";
      hint.textContent = "Click '+ Add Project' to add a project.";
      projList.appendChild(hint);
    }
  }

  // Achievements
  const achList = document.getElementById("ltx-achievement-list");
  if (achList) {
    achList.innerHTML = "";
    if (structured.certifications) {
      const lines = structured.certifications.split("\n").map(l => l.trim()).filter(Boolean);
      lines.forEach(l => {
        const card = document.createElement("div");
        card.className = "ltx-entry-card";
        const grid = document.createElement("div");
        grid.className = "latex-form-grid";
        grid.appendChild(inputRow("Achievement", "text", "Achievement", "text"));
        card.appendChild(grid);
        card.appendChild(makeRemoveBtn(card));
        card.querySelector('[data-name="text"]').value = l;
        achList.appendChild(card);
      });
    } else {
      const hint = document.createElement("p");
      hint.className = "ltx-empty-hint";
      hint.textContent = "Click '+ Add Achievement' to add an entry.";
      achList.appendChild(hint);
    }
  }
}

async function handleFile(file) {
  const status = $("uploadStatus");
  const preview = $("resumePreview");
  try {
    setStatus(status, "Parsing…");
    // window.triggerOrbReaction?.('parse');
    resumeState = await parseResumeFile(file);
    preview.hidden = false;
    preview.textContent = resumeState.raw.slice(0, 4000) + (resumeState.raw.length > 4000 ? "\n…" : "");
    setStatus(status, `Loaded ${resumeState.meta.fileName}`, "success");
    
    // Auto-fill split screen and version history
    $("originalResumeText").value = resumeState.raw;
    $("tailoredResume").value = "";
    resumeVersions = [{ version: "v0", label: "Original", text: resumeState.raw }];
    
    const sel = $("selVersionHistory");
    sel.innerHTML = '<option value="v0">Original</option>';
    sel.disabled = false;
    sel.value = "v0";
    
    $("btnRestoreOriginal").disabled = false;
    
    // Auto-populate LaTeX Resume Maker
    autoPopulateLatexModal(resumeState);
    
    // Initialize circular dials to zero
    updateDials(0, 0, 0, 0);
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
        <button type="button" class="btn-select-job btn-select-jd-from-card" data-id="${job.id}">⚡ Select &amp; Score JD</button>
        <button type="button" class="btn btn-primary btn-sm btn-tailor-job" data-id="${job.id}">Tailor Resume</button>
      </div>
    `;

    // "Select & Score JD" — fills JD textarea, auto-scores, scrolls to workspace
    card.querySelector(".btn-select-jd-from-card").addEventListener("click", async () => {
      const btn = card.querySelector(".btn-select-jd-from-card");
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "⏳ Loading...";

      const jdInput = /** @type {HTMLTextAreaElement} */ ($("jdInput"));
      jdInput.value = job.description;
      $("workspace").scrollIntoView({ behavior: "smooth", block: "start" });

      if (resumeState?.raw) {
        try {
          const data = await callBackendScoreJd(resumeState.raw, job.description);
          if (data?.success) {
            renderJdScoreResult(data);
            $("results-container").hidden = false;
            setStatus($("jdStatus"), `JD loaded from job card — Score: ${data.score}%`, "success");
          }
        } catch {
          setStatus($("jdStatus"), "JD loaded. Click '⚡ Score Against This JD' to analyze.", "success");
        }
      } else {
        setStatus($("jdStatus"), "JD loaded. Upload a resume, then click 'Score Against This JD'.", "success");
      }

      btn.disabled = false;
      btn.textContent = origText;
    });

    // Handle tailoring for this specific job
    card.querySelector(".btn-tailor-job").addEventListener("click", async () => {
      const btn = card.querySelector(".btn-tailor-job");
      btn.disabled = true;
      btn.textContent = "Selecting...";
      
      try {
        const jdInput = /** @type {HTMLTextAreaElement} */ ($("jdInput"));
        jdInput.value = job.description;
        
        // Smooth scroll to workspace
        $("workspace").scrollIntoView({ behavior: "smooth" });
        
        // Auto trigger analysis
        await runAnalysis();
      } catch (e) {
        alert("Selection failed: " + e.message);
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
  
  const jdInput = $("jdInput");
  const jdCharCount = $("jdCharCount");
  if (jdInput && jdCharCount) {
    jdInput.addEventListener("input", (e) => {
      const count = e.target.value.trim().length;
      jdCharCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
      if (count > 0 && count < 80) {
        jdCharCount.style.color = "var(--error)";
      } else {
        jdCharCount.style.color = "var(--muted)";
      }
    });
  }
  // ─── Score Against JD button ───────────────────────────────────
  const btnScoreJd = document.getElementById("btnScoreJd");
  if (btnScoreJd) {
    btnScoreJd.addEventListener("click", async () => {
      const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
      if (!resumeState?.raw) {
        setStatus($("jdStatus"), "Upload a resume first.", "error");
        return;
      }
      if (jd.length < 60) {
        setStatus($("jdStatus"), "Paste a fuller job description (60+ characters).", "error");
        return;
      }
      // PHASE 5 Integration
      await fetchScore(resumeState.raw, jd);
      
      const origTxt = btnScoreJd.textContent;
      btnScoreJd.disabled = true;
      btnScoreJd.textContent = "⏳ Scoring...";
      // window.triggerOrbReaction?.('parse');
      try {
        const data = await callBackendScoreJd(resumeState.raw, jd);
        if (data.success) {
          renderJdScoreResult(data);
          // Also reveal results-container so dials are visible
          $("results-container").hidden = false;
          setStatus($("jdStatus"), `Semantic cosine score: ${data.score}% (raw cosine: ${data.cosine_raw ?? "n/a"})`, "success");
          // window.triggerOrbReaction?.('success');
        }
      } catch (e) {
        setStatus($("jdStatus"), `Scoring failed: ${e.message}`, "error");
        // window.triggerOrbReaction?.('error');
      } finally {
        btnScoreJd.disabled = false;
        btnScoreJd.textContent = origTxt;
      }
    });
  }

  // ─── Debounced real-time JD scoring ────────────────────────────
  let jdDebounceTimer = null;
  const jdTextarea = document.getElementById("jdInput");
  if (jdTextarea) {
    jdTextarea.addEventListener("input", () => {
      clearTimeout(jdDebounceTimer);
      jdDebounceTimer = setTimeout(async () => {
        const jd = jdTextarea.value.trim();
        if (!resumeState?.raw || jd.length < 100) return;
        try {
          const data = await callBackendScoreJd(resumeState.raw, jd);
          if (data?.success) renderJdScoreResult(data);
        } catch {
          // Silently ignore debounce errors
        }
      }, 1800);
    });
  }

  // ─── Low-Score Auto-Tailor CTA ─────────────────────────────────
  const btnLowScoreTailor = document.getElementById("btnLowScoreTailor");
  if (btnLowScoreTailor) {
    btnLowScoreTailor.addEventListener("click", async () => {
      const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
      if (!resumeState) {
        setStatus($("jdStatus"), "Upload a resume first.", "error");
        return;
      }

      const rawMissing = btnLowScoreTailor.dataset.missingKeywords;
      const missingKeywords = rawMissing ? JSON.parse(rawMissing) : [];

      // Lock UI
      btnLowScoreTailor.disabled = true;
      btnLowScoreTailor.textContent = "⏳ AI Tailoring in Progress...";

      // Run 3D cinematic animation CONCURRENTLY with the backend call
      let tailorResult = null;
      let tailorError = null;
      let animDone = false;
      let backendDone = false;

      function tryFinish() {
        if (!animDone || !backendDone) return;
        btnLowScoreTailor.disabled = false;
        btnLowScoreTailor.textContent = "🚨 Score Too Low — Auto-Tailor with AI ✨";

        if (tailorError) {
          setStatus($("tailorStatus"), `Tailoring failed: ${tailorError.message}`, "error");
          // window.triggerOrbReaction?.('error');
          return;
        }

        // Show split pane & populate
        $("results-container").hidden = false;
        const out = /** @type {HTMLTextAreaElement} */ ($("tailoredResume"));
        out.value = tailorResult.tailored || "";
        setStatus($("tailorStatus"), "✅ AI tailoring complete — review the Tailored pane below.", "success");
        // window.triggerOrbReaction?.('success');

        // Recalculate score
        const ts = computeAtsScore(tailorResult.tailored, resumeState.structured, jd);
        const originalScore = lastScore ? lastScore.overall : 0;
        updateDials(ts.overall, ts.breakdown.keyword, ts.breakdown.readability, ts.overall - originalScore);

        // Scroll to split pane
        setTimeout(() => {
          document.querySelector('.split-workspace-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);
      }

      // Start 3D animation
      run3DTailorSequence(missingKeywords, () => {
        animDone = true;
        tryFinish();
      });

      // Call backend in parallel
      try {
        tailorResult = await backendPost("/api/ai/auto-tailor", { resume_text: resumeState.raw, jd_text: jd });
        // window.triggerOrbReaction?.('parse');
      } catch (e) {
        tailorError = e;
      } finally {
        backendDone = true;
        tryFinish();
      }
    });
  }

  // Demo Mode
  const demoBtn = document.getElementById("btnDemoMode");
  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      resumeState = {
        raw: DEMO_RESUME,
        structured: {
          contact: "Alex Mercer\nalex.mercer@email.com | Seattle, WA | linkedin.com/in/alexmercer",
          summary: "Dynamic Software Engineer with over 4 years of experience specializing in backend architectures, microservices, and cloud deployments.",
          skills: "Languages: JavaScript (ES6+), Python, SQL\nFrameworks: Node.js, Express, FastAPI\nTools: AWS, Docker, Git, Jest",
          education: "Bachelor of Science in CS --- University of Washington\nGraduated June 2020",
          experience: "Software Engineer --- CloudScale Tech\nDeveloped and maintained 12 core microservices using Node.js.",
          projects: "REST API Development --- Innovate IT",
          certifications: "AWS Certified Developer"
        },
        meta: { fileName: "demo_resume.pdf" }
      };
      $("originalResumeText").value = DEMO_RESUME;
      $("tailoredResume").value = "";
      resumeVersions = [{ version: "v0", label: "Original", text: DEMO_RESUME }];
      
      const sel = $("selVersionHistory");
      sel.innerHTML = '<option value="v0">Original</option>';
      sel.disabled = false;
      sel.value = "v0";
      
      $("btnRestoreOriginal").disabled = false;
      autoPopulateLatexModal(resumeState);
      $("jdInput").value = DEMO_JD;
      
      // Auto trigger analysis
      runAnalysis();
    });
  }

  // Version History Selection
  const verHistory = document.getElementById("selVersionHistory");
  if (verHistory) {
    verHistory.addEventListener("change", (e) => {
      const ver = resumeVersions.find(v => v.version === e.target.value);
      if (ver) {
        $("tailoredResume").value = ver.text;
      }
    });
  }

  // Restore Original Parsed Resume
  const btnRestore = document.getElementById("btnRestoreOriginal");
  if (btnRestore) {
    btnRestore.addEventListener("click", () => {
      if (confirm("Are you sure you want to restore the original parsed resume?")) {
        $("tailoredResume").value = resumeState ? resumeState.raw : "";
        if (verHistory) verHistory.value = "v0";
      }
    });
  }

  // Style Presets Buttons
  document.querySelectorAll(".preset-selector button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".preset-selector button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPreset = btn.dataset.preset || "modern";
    });
  });

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
    console.log(`[DEBUG-00] btnTailor clicked!`);
    const out = /** @type {HTMLTextAreaElement} */ ($("tailoredResume"));
    const st = $("tailorStatus");
    if (!resumeState) {
      console.log(`[DEBUG-00-ERR] resumeState is null, returning.`);
      setStatus(st, "Upload a resume first.", "error");
      return;
    }
    const jd = /** @type {HTMLTextAreaElement} */ ($("jdInput")).value.trim();
    const btn = $("btnTailor");
    btn.disabled = true;
    setStatus(st, "Tailoring with Python backend…");
    // window.triggerOrbReaction?.('parse');
    out.value = "";

    let tailorResult = null;
    let stepperFinished = false;
    let backendFinished = false;
    let parseError = null;

    // Start progress stepper animation
    console.log("[DEBUG-00-A] Calling runTailorStepper");
    runTailorStepper(2000, onStepChange, () => {
      console.log("[DEBUG-10] stepperFinished callback triggered");
      stepperFinished = true;
      checkTailorCompletion();
    });

    // Call backend in parallel
    console.log("[DEBUG-00-B] Calling callBackendTailor");
    try {
      tailorResult = await callBackendTailor(resumeState.raw, jd);
      console.log("[DEBUG-11] callBackendTailor resolved successfully");
      backendFinished = true;
      checkTailorCompletion();
    } catch (e) {
      console.error("[DEBUG-11-ERR] Backend tailoring failed:", e);
      parseError = e;
      backendFinished = true;
      checkTailorCompletion();
    }

    async function checkTailorCompletion() {
      console.log(`[DEBUG-12] checkTailorCompletion invoked. stepperFinished=${stepperFinished}, backendFinished=${backendFinished}`);
      if (!stepperFinished || !backendFinished) return;

      console.log(`[DEBUG-13] Both finished! Unlocking UI.`);
      btn.disabled = false;

      if (parseError || !tailorResult) {
        // window.triggerOrbReaction?.('error');
        const msg = parseError instanceof Error ? parseError.message : String(parseError);
        setStatus(st, msg || "Tailoring service busy. Try again later.", "error");
        return;
      }

      // window.triggerOrbReaction?.('success');
      out.value = tailorResult.tailored;
      setStatus(st, "Tailored resume generated by Python backend.", "success");

      // Recalculate match score for tailored resume
      const tailoredScore = computeAtsScore(tailorResult.tailored, resumeState.structured, jd);
      const originalScore = lastScore ? lastScore.overall : 0;
      const improvement = tailoredScore.overall - originalScore;

      // Update dials with improved score
      updateDials(tailoredScore.overall, tailoredScore.breakdown.keyword, tailoredScore.breakdown.readability, improvement);

      // Append version history
      const verNum = resumeVersions.length;
      resumeVersions.push({
        version: `v${verNum}`,
        label: `Tailored v${verNum} (${currentPreset})`,
        text: tailorResult.tailored,
        latex: tailorResult.latex
      });

      if (verHistory) {
        verHistory.disabled = false;
        const opt = document.createElement("option");
        opt.value = `v${verNum}`;
        opt.textContent = `Tailored v${verNum} (${currentPreset})`;
        verHistory.appendChild(opt);
        verHistory.value = `v${verNum}`;
      }

      // Populate LaTeX editor model fields with tailored text
      const tailoredResumeState = {
        raw: tailorResult.tailored,
        structured: {
          ...resumeState.structured,
          summary: tailorResult.tailored.match(/PROFESSIONAL SUMMARY[\s\S]+?(?=PROFESSIONAL EXPERIENCE|EXPERIENCE|SKILLS|$)/i)?.[0]?.replace(/PROFESSIONAL SUMMARY/i, '')?.trim() || resumeState.structured.summary
        }
      };
      autoPopulateLatexModal(tailoredResumeState);

      // If Cover Letter checkbox checked, auto trigger Cover Letter generation
      const chkCover = document.getElementById("chkCoverLetter");
      if (chkCover && chkCover.checked) {
        $("btnGenerateCoverLetter").click();
      }
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
    out.value = "Generating...";
    try {
      const text = await callBackendCoverLetter(resumeState.raw, jd);
      out.value = text;
    } catch (e) {
      out.value = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  });

  // $("btnCopyCoverLetter").addEventListener("click", async () => {
  //   const out = /** @type {HTMLTextAreaElement} */ ($("coverLetterText"));
  //   await navigator.clipboard.writeText(out.value);
  //   alert("Copied!");
  // });

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

function wireTheme() {
  const btn = $("btnThemeToggle");
  const icon = $("themeIcon");
  const current = localStorage.getItem("theme") || "dark";
  
  const set = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    icon.textContent = theme === "light" ? "☀️" : "🌙";
    localStorage.setItem("theme", theme);
  };

  set(current);
  btn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    set(next);
  });
}

function wireLatexExport() {
  wireLatexAccordion();
  const modal = document.getElementById("latexModal");
  if (!modal) return;

  const open = () => { modal.hidden = false; document.body.style.overflow = "hidden"; };
  const close = () => { modal.hidden = true; document.body.style.overflow = ""; };

  document.getElementById("btnOpenLatexModal")?.addEventListener("click", open);
  document.getElementById("btnCloseLatexModal")?.addEventListener("click", close);
  document.getElementById("btnCloseLatexModal2")?.addEventListener("click", close);

  // Close on backdrop click
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  // Close on Escape
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });

  // --- Dynamic list builders ---
  function makeRemoveBtn(card) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ltx-remove-btn";
    btn.textContent = "✕ Remove";
    btn.addEventListener("click", () => card.remove());
    return btn;
  }

  function addEmptyHint(container, message) {
    const hint = document.createElement("p");
    hint.className = "ltx-empty-hint";
    hint.textContent = message;
    container.appendChild(hint);
  }

  function clearEmptyHints(container) {
    container.querySelectorAll(".ltx-empty-hint").forEach(h => h.remove());
  }

  function inputRow(labelText, type, placeholder, name) {
    const wrap = document.createElement("div");
    wrap.className = "latex-field";
    const lbl = document.createElement("label");
    lbl.textContent = labelText;
    const inp = document.createElement("input");
    inp.type = type;
    inp.placeholder = placeholder;
    inp.dataset.name = name;
    inp.className = "input input-sm";
    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    return wrap;
  }

  function textareaRow(labelText, placeholder, name, hint) {
    const wrap = document.createElement("div");
    wrap.className = "latex-field latex-field-full";
    wrap.style.marginTop = "0.5rem";
    const lbl = document.createElement("label");
    lbl.textContent = labelText;
    const ta = document.createElement("textarea");
    ta.placeholder = placeholder;
    ta.dataset.name = name;
    ta.className = "input input-sm";
    ta.rows = 3;
    if (hint) {
      const small = document.createElement("small");
      small.style.color = "var(--muted)";
      small.textContent = hint;
      wrap.appendChild(lbl);
      wrap.appendChild(ta);
      wrap.appendChild(small);
    } else {
      wrap.appendChild(lbl);
      wrap.appendChild(ta);
    }
    return wrap;
  }

  // Education
  const eduList = document.getElementById("ltx-education-list");
  addEmptyHint(eduList, "Click '+ Add' to add an education entry.");
  document.getElementById("btnAddEducation")?.addEventListener("click", () => {
    clearEmptyHints(eduList);
    const card = document.createElement("div");
    card.className = "ltx-entry-card";
    const grid = document.createElement("div");
    grid.className = "latex-form-grid";
    grid.appendChild(inputRow("Degree / Program *", "text", "B.Tech Computer Science", "degree"));
    grid.appendChild(inputRow("Institution *", "text", "University Name", "institution"));
    grid.appendChild(inputRow("Location", "text", "City, State", "location"));
    grid.appendChild(inputRow("Dates *", "text", "Aug 2020 -- May 2024", "dates"));
    grid.appendChild(inputRow("GPA / CGPA (optional)", "text", "8.5 / 10", "gpa"));
    card.appendChild(grid);
    card.appendChild(makeRemoveBtn(card));
    eduList.appendChild(card);
  });

  // Experience
  const expList = document.getElementById("ltx-experience-list");
  addEmptyHint(expList, "Click '+ Add' to add a work experience entry.");
  document.getElementById("btnAddExperience")?.addEventListener("click", () => {
    clearEmptyHints(expList);
    const card = document.createElement("div");
    card.className = "ltx-entry-card";
    const grid = document.createElement("div");
    grid.className = "latex-form-grid";
    grid.appendChild(inputRow("Job Title *", "text", "Data Analyst Intern", "title"));
    grid.appendChild(inputRow("Company *", "text", "Company Pvt Ltd", "company"));
    grid.appendChild(inputRow("Location", "text", "City, State", "location"));
    grid.appendChild(inputRow("Dates *", "text", "Jun 2023 -- Aug 2023", "dates"));
    card.appendChild(grid);
    card.appendChild(textareaRow(
      "Bullet Points * (one per line)",
      "• Analyzed 10K+ records using Python to identify revenue trends.\n• Built Power BI dashboard used by 5 stakeholders.",
      "bullets",
      "Each line becomes a separate bullet point."
    ));
    card.appendChild(makeRemoveBtn(card));
    expList.appendChild(card);
  });

  // Projects
  const projList = document.getElementById("ltx-project-list");
  addEmptyHint(projList, "Click '+ Add' to add a project.");
  document.getElementById("btnAddProject")?.addEventListener("click", () => {
    clearEmptyHints(projList);
    const card = document.createElement("div");
    card.className = "ltx-entry-card";
    const nameWrap = document.createElement("div");
    nameWrap.className = "latex-field";
    const nameLbl = document.createElement("label");
    nameLbl.textContent = "Project Name *";
    const nameInp = document.createElement("input");
    nameInp.type = "text";
    nameInp.placeholder = "Sales & Inventory Analysis";
    nameInp.dataset.name = "name";
    nameInp.className = "input input-sm";
    nameWrap.appendChild(nameLbl);
    nameWrap.appendChild(nameInp);
    card.appendChild(nameWrap);
    card.appendChild(textareaRow(
      "Description Bullets * (one per line)",
      "• Cleaned 12K+ records using Python (Pandas).\n• Built Power BI dashboards surfacing 3 key business insights.",
      "description",
      "Each line becomes a separate bullet point."
    ));
    card.appendChild(makeRemoveBtn(card));
    projList.appendChild(card);
  });

  // Achievements
  const achList = document.getElementById("ltx-achievement-list");
  addEmptyHint(achList, "Click '+ Add' to add an achievement.");
  document.getElementById("btnAddAchievement")?.addEventListener("click", () => {
    clearEmptyHints(achList);
    const card = document.createElement("div");
    card.className = "ltx-entry-card";
    const grid = document.createElement("div");
    grid.className = "latex-form-grid";
    grid.appendChild(inputRow("Achievement", "text", "Ranked Top 5 in national data hackathon (2023)", "text"));
    card.appendChild(grid);
    card.appendChild(makeRemoveBtn(card));
    achList.appendChild(card);
  });

  // Certifications
  const certList = document.getElementById("ltx-certification-list");
  addEmptyHint(certList, "Click '+ Add' to add a certification.");
  document.getElementById("btnAddCertification")?.addEventListener("click", () => {
    clearEmptyHints(certList);
    const card = document.createElement("div");
    card.className = "ltx-entry-card";
    const grid = document.createElement("div");
    grid.className = "latex-form-grid";
    grid.appendChild(inputRow("Certification", "text", "Google Data Analytics Certificate — Coursera (2023)", "text"));
    card.appendChild(grid);
    card.appendChild(makeRemoveBtn(card));
    certList.appendChild(card);
  });

  // --- Download handler ---
  document.getElementById("btnDownloadLatex")?.addEventListener("click", async () => {
    const statusEl = document.getElementById("latexStatus");
    const btnText = document.getElementById("latexBtnText");
    const downloadBtn = document.getElementById("btnDownloadLatex");

    function setLatexStatus(msg, cls = "") {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = "status-bar" + (cls ? " " + cls : "");
    }

    // Gather & validate required fields
    const fullName = /** @type {HTMLInputElement} */ (document.getElementById("ltx-name")).value.trim();
    const email = /** @type {HTMLInputElement} */ (document.getElementById("ltx-email")).value.trim();
    const phone = /** @type {HTMLInputElement} */ (document.getElementById("ltx-phone")).value.trim();
    const location = /** @type {HTMLInputElement} */ (document.getElementById("ltx-location")).value.trim();
    const summary = /** @type {HTMLTextAreaElement} */ (document.getElementById("ltx-summary")).value.trim();
    const skillsProg = /** @type {HTMLInputElement} */ (document.getElementById("ltx-skills-prog")).value.trim();
    const skillsData = /** @type {HTMLInputElement} */ (document.getElementById("ltx-skills-data")).value.trim();
    const skillsTools = /** @type {HTMLInputElement} */ (document.getElementById("ltx-skills-tools")).value.trim();
    const linkedin = /** @type {HTMLInputElement} */ (document.getElementById("ltx-linkedin")).value.trim();
    const github = /** @type {HTMLInputElement} */ (document.getElementById("ltx-github")).value.trim();
    const portfolio = /** @type {HTMLInputElement} */ (document.getElementById("ltx-portfolio")).value.trim();

    if (!fullName || !email || !phone || !location || !summary) {
      setLatexStatus("Please fill in all required fields (marked with *).", "error");
      return;
    }

    // Gather education
    const education = [];
    document.querySelectorAll("#ltx-education-list .ltx-entry-card").forEach(card => {
      const get = (n) => (card.querySelector(`[data-name="${n}"]`)?.value || "").trim();
      if (get("degree") && get("institution") && get("dates")) {
        education.push({ degree: get("degree"), institution: get("institution"), location: get("location"), dates: get("dates"), gpa: get("gpa") || null });
      }
    });

    // Gather experience
    const experience = [];
    document.querySelectorAll("#ltx-experience-list .ltx-entry-card").forEach(card => {
      const get = (n) => (card.querySelector(`[data-name="${n}"]`)?.value || "").trim();
      if (get("title") && get("company") && get("dates")) {
        const bulletsRaw = get("bullets");
        const bullets = bulletsRaw.split("\n").map(b => b.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean);
        experience.push({ title: get("title"), company: get("company"), location: get("location"), dates: get("dates"), bullets });
      }
    });

    // Gather projects
    const projects = [];
    document.querySelectorAll("#ltx-project-list .ltx-entry-card").forEach(card => {
      const get = (n) => (card.querySelector(`[data-name="${n}"]`)?.value || "").trim();
      if (get("name") && get("description")) {
        const descRaw = get("description");
        const description = descRaw.split("\n").map(d => d.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean);
        projects.push({ name: get("name"), description });
      }
    });

    // Gather achievements
    const achievements = [];
    document.querySelectorAll("#ltx-achievement-list .ltx-entry-card").forEach(card => {
      const val = (card.querySelector(`[data-name="text"]`)?.value || "").trim();
      if (val) achievements.push(val);
    });

    // Gather certifications
    const certifications = [];
    document.querySelectorAll("#ltx-certification-list .ltx-entry-card").forEach(card => {
      const val = (card.querySelector(`[data-name="text"]`)?.value || "").trim();
      if (val) certifications.push(val);
    });

    if (education.length === 0) {
      setLatexStatus("Add at least one education entry.", "error");
      return;
    }
    if (experience.length === 0) {
      setLatexStatus("Add at least one experience entry.", "error");
      return;
    }
    if (projects.length === 0) {
      setLatexStatus("Add at least one project.", "error");
      return;
    }

    // Build payload
    const payload = {
      full_name: fullName,
      email,
      phone,
      location,
      linkedin: linkedin || null,
      github: github || null,
      portfolio: portfolio || null,
      summary,
      skills_programming: skillsProg || "Python, SQL",
      skills_data_analysis: skillsData || "EDA, Data Cleaning",
      skills_tools: skillsTools || "Power BI, Excel",
      education,
      experience,
      projects,
      achievements: achievements.length ? achievements : null,
      certifications: certifications.length ? certifications : null,
      style_preset: currentPreset,
    };

    // Call backend
    setLatexStatus("⏳ Generating LaTeX resume...");
    if (downloadBtn) downloadBtn.disabled = true;
    if (btnText) btnText.textContent = "⏳ Generating...";

    try {
      const response = await fetch(`${PY_BACKEND_URL}/api/generate-latex-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        // Trigger file download
        const blob = new Blob([result.latex_code], { type: "text/plain; charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename || "resume.tex";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setLatexStatus(`✅ Downloaded: ${result.filename}  —  Open in Overleaf or a local LaTeX editor to compile.`, "success");
        if (btnText) btnText.textContent = "✅ Downloaded!";
        setTimeout(() => {
          if (btnText) btnText.textContent = "📥 Download .tex File";
        }, 3500);
      } else {
        setLatexStatus(`❌ Error: ${result.error || "Backend returned failure."}`, "error");
        if (btnText) btnText.textContent = "📥 Download .tex File";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLatexStatus(`❌ Network error: ${msg} — Is the backend running on port 8088?`, "error");
      if (btnText) btnText.textContent = "📥 Download .tex File";
    } finally {
      if (downloadBtn) downloadBtn.disabled = false;
    }
  });
}

/** ─── Standalone Job Search ─────────────────────────────────── */
function renderJobSearchResults(jobs, query, location) {
  const grid = document.getElementById("jobResultsGrid");
  const meta = document.getElementById("jobResultsMeta");
  const countEl = document.getElementById("jobResultsCount");
  if (!grid) return;

  if (!jobs || jobs.length === 0) {
    grid.innerHTML = `<p class="status-bar" style="padding:2rem;text-align:center;color:var(--muted)">No results found for "${escapeHtml(query)}" in ${location.toUpperCase()}. Try a different keyword.</p>`;
    if (meta) meta.style.display = "none";
    return;
  }

  if (meta && countEl) {
    meta.style.display = "block";
    countEl.textContent = `${jobs.length} jobs found for "${query}"`;
  }

  grid.innerHTML = "";
  jobs.forEach(job => {
    const card = document.createElement("div");
    card.className = "job-card";
    const salary = job.salary ? `<span style="color:var(--success);font-size:0.82rem;font-weight:700;">💰 ${escapeHtml(job.salary)}</span>` : "";
    const posted = job.posted_date ? `<span style="font-size:0.78rem;color:var(--muted);">📅 ${job.posted_date}</span>` : "";

    card.innerHTML = `
      <div class="job-card-header">
        <h3 class="job-title">${escapeHtml(job.title)}</h3>
        <span class="badge badge-live" style="font-size:0.7rem;padding:0.2rem 0.6rem;">LIVE</span>
      </div>
      <div class="job-meta">
        <span>🏢</span> <strong>${escapeHtml(job.company)}</strong>
        <span style="margin-left:10px">📍</span> ${escapeHtml(job.location)}
      </div>
      <div class="job-desc" style="margin:0.5rem 0;">${escapeHtml(job.description || "")}</div>
      <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">${salary}${posted}</div>
      <div class="job-actions">
        <a href="${escapeHtml(job.apply_link)}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;">Apply Now</a>
        <button type="button" class="btn-select-job btn-select-jd-search" style="cursor:pointer;">⚡ Select &amp; Score JD</button>
      </div>
    `;

    card.querySelector(".btn-select-jd-search").addEventListener("click", async () => {
      const btn = card.querySelector(".btn-select-jd-search");
      const origTxt = btn.textContent;
      btn.disabled = true;
      btn.textContent = "⏳ Loading...";

      const jdInput = /** @type {HTMLTextAreaElement} */ (document.getElementById("jdInput"));
      if (jdInput) jdInput.value = job.description || job.title;
      
      const workspace = document.getElementById("workspace");
      if (workspace) workspace.scrollIntoView({ behavior: "smooth", block: "start" });

      const status = document.getElementById("jdStatus");
      if (resumeState?.raw && (job.description || job.title)) {
        try {
          const data = await callBackendScoreJd(resumeState.raw, job.description || job.title);
          if (data?.success) {
            renderJdScoreResult(data);
            document.getElementById("results-container").hidden = false;
            if (status) setStatus(status, `JD loaded — Semantic Score: ${data.score}%`, "success");
          }
        } catch {
          if (status) setStatus(status, "JD loaded. Click 'Score Against This JD' to analyze.", "success");
        }
      } else {
        if (status) setStatus(status, "JD loaded. Upload a resume then click '⚡ Score Against This JD'.", "success");
      }

      btn.disabled = false;
      btn.textContent = origTxt;
    });

    grid.appendChild(card);
  });
}

function wireJobSearch() {
  const btn = document.getElementById("btnSearchJobs");
  const btnText = document.getElementById("jobSearchBtnText");
  const status = document.getElementById("jobSearchStatus");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const query = (/** @type {HTMLInputElement} */ (document.getElementById("jobQueryInput")))?.value?.trim() || "Software Engineer";
    const location = (/** @type {HTMLSelectElement} */ (document.getElementById("jobLocationSelect")))?.value || "in";

    btn.disabled = true;
    if (btnText) btnText.textContent = "⏳ Searching...";
    if (status) setStatus(status, `Searching for "${query}" in ${location.toUpperCase()}...`);

    try {
      const data = await backendPost("/api/search-jobs", { query, location, limit: 8 });
      renderJobSearchResults(data.jobs || [], query, location);
      if (status) setStatus(status, data.total ? `Found ${data.total} live jobs.` : "Search complete.", "success");
    } catch (e) {
      if (status) setStatus(status, `Search failed: ${e.message}`, "error");
      renderJobSearchResults([], query, location);
    } finally {
      btn.disabled = false;
      if (btnText) btnText.textContent = "🔍 Search Jobs";
    }
  });

  // Trigger on Enter in search box
  const queryInput = document.getElementById("jobQueryInput");
  if (queryInput) {
    queryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") btn.click();
    });
  }
}

function init() {
  initThreeScene("hero-canvas-container");
  wireTheme();
  // wireTabs(); removed
  wireUpload();
  wireMainActions();
  wireLatexExport();
  wireChat();
  setupQuickActions();
  wireJobSearch();
  
  // Initial data load
  refreshNews();
  refreshHistory();
  
  // Mouse-reactive lighting effect
  document.addEventListener("mousemove", (e) => {
    const cards = document.querySelectorAll(".news-card, .job-card, .panel, .metric-card");
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      /** @type {HTMLElement} */ (card).style.setProperty("--mouse-x", `${x}px`);
      /** @type {HTMLElement} */ (card).style.setProperty("--mouse-y", `${y}px`);
    });
  });

  appendChat(
    "assistant",
    "Hi! I'm your AI career coach. Upload your resume and paste a job description to get started. I can help you analyze your match, optimize for ATS, and even find live jobs!"
  );
}

init();
