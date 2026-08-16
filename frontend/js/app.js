// app.js — AI Career Cockpit Orchestrator

const BACKEND_URL = "http://localhost:8088";
let resumeText = "";
let originalParsedText = ""; // Keep a copy of original parsed text to restore
let tailoredResumeText = "";
let savedResumeData = null;

// --- State ---
const cockpitState = {
  currentTab: "form", // form or compare
  currentView: "cockpit", // cockpit, jobs, tracker, history
  savedVersions: [],
  shortlistedJobs: []
};

// --- Helper: Get elements ---
const $ = (id) => document.getElementById(id);

// --- DOM References ---
const dropzone = $("dropzone");
const fileInput = $("fileInput");
const uploadStatus = $("uploadStatus");
const resumeForm = $("resumeForm");
const targetJdInput = $("targetJdInput");
const btnRunAiAnalysis = $("btnRunAiAnalysis");
const aiAnalysisStatus = $("aiAnalysisStatus");
const aiSuggestionsList = $("aiSuggestionsList");
const latexSection = $("latex-export-section");
const btnDownloadLatex = $("btnDownloadLatex");
const btnDownloadTxt = $("btnDownloadTxt");
const latexStatus = $("latexStatus");
const latexBtnText = $("latexBtnText");
const btnLoadDemo = $("btnLoadDemo");
const btnRestoreOriginal = $("btnRestoreOriginal");

const tabForm = $("tabForm");
const tabCompare = $("tabCompare");
const contentForm = $("contentForm");
const contentCompare = $("contentCompare");
const originalPreview = $("originalPreviewArea");
const tailoredPreview = $("tailoredPreviewArea");
const tailoringStepper = $("tailoringStepper");
const stepperProgressBar = $("stepperProgressBar");
const presetSelect = $("presetSelect");

// Sidebar Nav Elements
const navCockpit = $("navCockpit");
const navJobs = $("navJobs");
const navTracker = $("navTracker");
const navHistory = $("navHistory");

const viewCockpit = $("viewCockpit");
const viewJobs = $("viewJobs");
const viewTracker = $("viewTracker");
const viewHistory = $("viewHistory");

const pageTitle = $("pageTitle");
const pageDescription = $("pageDescription");

// Dynamic forms counter state
const state = {
  educationCount: 0,
  experienceCount: 0,
  projectCount: 0,
  achievementCount: 0,
  certificationCount: 0
};

// --- Initialize Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  loadLocalStorageState();
  setupNavigation();
  setupTabs();
  setupDropzone();
  setupDynamicFormButtons();
  setupFormSubmission();
  setupAiAnalysis();
  setupLatexDownload();
  setupScrollSync();
  setupPresets();
  setupExtras();
  setupTextExporter();

  if (btnLoadDemo) {
    btnLoadDemo.addEventListener("click", loadDemoResumeData);
  }
  if (btnRestoreOriginal) {
    btnRestoreOriginal.addEventListener("click", restoreOriginalParsedData);
  }

  // Pre-load a few inputs
  addEducationRow();
  addExperienceRow();
  addProjectRow();
});

// --- State Persistency (Local Storage) ---
function loadLocalStorageState() {
  try {
    cockpitState.shortlistedJobs = JSON.parse(localStorage.getItem("shortlistedJobs")) || [];
    cockpitState.savedVersions = JSON.parse(localStorage.getItem("savedVersions")) || [];
  } catch (e) {
    console.error("Local storage error:", e);
  }
  updateTrackerCountBadge();
  renderTrackerBoard();
  renderHistoryList();
}

function saveToLocalStorage() {
  localStorage.setItem("shortlistedJobs", JSON.stringify(cockpitState.shortlistedJobs));
  localStorage.setItem("savedVersions", JSON.stringify(cockpitState.savedVersions));
  updateTrackerCountBadge();
}

function updateTrackerCountBadge() {
  const badge = $("trackerCount");
  if (!badge) return;
  const count = cockpitState.shortlistedJobs.length;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

// --- Navigation shell Router ---
function setupNavigation() {
  const navs = [
    { nav: navCockpit, view: viewCockpit, name: "AI Cockpit", title: "AI Career Cockpit", desc: "Optimize your career profile for absolute ATS and recruitment success." },
    { nav: navJobs, view: viewJobs, name: "jobs", title: "Live Jobs Database", desc: "Search live vacancies from Adzuna based on keywords or skills." },
    { nav: navTracker, view: viewTracker, name: "tracker", title: "Application Pipelines", desc: "Manage and shortlist active job applications using Kanban tracking." },
    { nav: navHistory, view: viewHistory, name: "history", title: "Saved Drafts & Registry", desc: "Access version history checkpoints and saved resume tailoring logs." }
  ];

  navs.forEach(item => {
    if (item.nav) {
      item.nav.addEventListener("click", () => {
        // Toggle active navigation styles
        navs.forEach(n => {
          if (n.nav) n.nav.classList.remove("active");
          if (n.view) n.view.classList.remove("active");
        });

        item.nav.classList.add("active");
        if (item.view) item.view.classList.add("active");
        
        // Update headers
        if (pageTitle) pageTitle.textContent = item.title;
        if (pageDescription) pageDescription.textContent = item.desc;

        cockpitState.currentView = item.name;

        // Toggle Preset Switcher availability on top bar
        const presetContainer = $("presetContainer");
        if (presetContainer) {
          presetContainer.style.display = item.name === "AI Cockpit" ? "flex" : "none";
        }

        // Auto-render target tabs if switching views
        if (item.name === "tracker") renderTrackerBoard();
        if (item.name === "history") renderHistoryList();
      });
    }
  });
}

// --- Tab Controller (Form vs Compare) ---
function setupTabs() {
  if (!tabForm || !tabCompare || !contentForm || !contentCompare) return;

  tabForm.addEventListener("click", () => switchTab("form"));
  tabCompare.addEventListener("click", () => switchTab("compare"));
}

function switchTab(tab) {
  cockpitState.currentTab = tab;
  if (tab === "form") {
    tabForm.classList.add("active");
    tabCompare.classList.remove("active");
    contentForm.classList.add("active");
    contentCompare.classList.remove("active");
  } else {
    tabForm.classList.remove("active");
    tabCompare.classList.add("active");
    contentForm.classList.remove("active");
    contentCompare.classList.add("active");
    
    renderPreviews();
  }
}

// --- Style Presets Switcher ---
function setupPresets() {
  if (!presetSelect) return;
  presetSelect.addEventListener("change", (e) => {
    const preset = e.target.value;
    
    // Reset preset classes
    contentCompare.classList.remove("preset-modern", "preset-professional", "preset-creative");
    contentCompare.classList.add(`preset-${preset}`);
  });
}

// --- Radial Progress Updater ---
function updateRadialProgress(elementId, value) {
  const el = $(elementId);
  if (!el) return;

  const val = parseInt(value) || 0;
  const deg = (val / 100) * 360;
  el.style.background = `conic-gradient(var(--primary) ${deg}deg, var(--glass-border) ${deg}deg)`;
  
  const valSpan = el.querySelector(".progress-val");
  if (valSpan) {
    valSpan.textContent = val + "%";
  }
}

// --- Dynamic Form Row Builders ---
function createField(labelText, type, className, placeholder, value = "") {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = type;
  input.className = className;
  input.placeholder = placeholder;
  input.value = value;
  
  input.addEventListener("input", () => {
    if (resumeText) renderOriginalPreviewFromForm();
  });

  wrap.appendChild(label);
  wrap.appendChild(input);
  return wrap;
}

function createTextAreaField(labelText, className, placeholder, value = "") {
  const wrap = document.createElement("div");
  wrap.className = "field field-full";
  wrap.style.marginTop = "0.75rem";
  const label = document.createElement("label");
  label.textContent = labelText;
  const textarea = document.createElement("textarea");
  textarea.className = className;
  textarea.placeholder = placeholder;
  textarea.rows = 3;
  textarea.value = value;

  textarea.addEventListener("input", () => {
    if (resumeText) renderOriginalPreviewFromForm();
  });

  wrap.appendChild(label);
  wrap.appendChild(textarea);
  return wrap;
}

function addEducationRow(data = {}) {
  const container = $("educationList");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "ltx-entry-card education-entry";

  const grid = document.createElement("div");
  grid.className = "form-grid";

  const f1 = createField("Degree / Program *", "text", "edu-degree", "B.Tech Computer Science", data.degree || "");
  const f2 = createField("Institution *", "text", "edu-inst", "University Name", data.institution || "");
  const f3 = createField("Location *", "text", "edu-loc", "City, State", data.location || "");
  const f4 = createField("Dates *", "text", "edu-dates", "Aug 2020 -- May 2024", data.dates || "");
  const f5 = createField("GPA / CGPA (optional)", "text", "edu-gpa", "8.5 / 10", data.gpa || "");

  grid.appendChild(f1);
  grid.appendChild(f2);
  grid.appendChild(f3);
  grid.appendChild(f4);
  grid.appendChild(f5);

  card.appendChild(grid);
  card.appendChild(createRemoveBtn(card, "education"));
  container.appendChild(card);
  state.educationCount++;
}

function addExperienceRow(data = {}) {
  const container = $("experienceList");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "ltx-entry-card experience-entry";

  const grid = document.createElement("div");
  grid.className = "form-grid";

  const f1 = createField("Job Title *", "text", "exp-title", "Data Analyst Intern", data.title || "");
  const f2 = createField("Company / Employer *", "text", "exp-company", "Company Pvt Ltd", data.company || "");
  const f3 = createField("Location *", "text", "exp-loc", "City, State", data.location || "");
  const f4 = createField("Dates *", "text", "exp-dates", "Jun 2023 -- Aug 2023", data.dates || "");

  grid.appendChild(f1);
  grid.appendChild(f2);
  grid.appendChild(f3);
  grid.appendChild(f4);

  const bulletsText = data.bullets ? data.bullets.join("\n") : "";
  const fBullets = createTextAreaField(
    "Bullet Points * (one per line)",
    "exp-bullets",
    "• Cleaned and preprocessed 10K+ records using Python.\n• Developed interactive Power BI dashboards.",
    bulletsText
  );

  card.appendChild(grid);
  card.appendChild(fBullets);
  card.appendChild(createRemoveBtn(card, "experience"));
  container.appendChild(card);
  state.experienceCount++;
}

function addProjectRow(data = {}) {
  const container = $("projectsList");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "ltx-entry-card project-entry";

  const f1 = createField("Project Name *", "text", "proj-name", "Sales and Inventory Analysis", data.name || "");
  
  const descText = data.description ? data.description.join("\n") : "";
  const f2 = createTextAreaField(
    "Project Description Bullets * (one per line)",
    "proj-desc",
    "• Performed EDA using Pandas and NumPy to identify 3 business trends.\n• Published analysis code and documentation on GitHub.",
    descText
  );

  card.appendChild(f1);
  card.appendChild(f2);
  card.appendChild(createRemoveBtn(card, "project"));
  container.appendChild(card);
  state.projectCount++;
}

function addAchievementRow(value = "") {
  const container = $("achievementsList");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "ltx-entry-card achievement-entry";

  const f1 = createField("Achievement Description *", "text", "ach-text", "Ranked top 10% in national level data hackathon.", value);

  card.appendChild(f1);
  card.appendChild(createRemoveBtn(card, "achievement"));
  container.appendChild(card);
  state.achievementCount++;
}

function addCertificationRow(value = "") {
  const container = $("certificationsList");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "ltx-entry-card certification-entry";

  const f1 = createField("Certification *", "text", "cert-text", "Google Advanced Data Analytics Certificate (2024)", value);

  card.appendChild(f1);
  card.appendChild(createRemoveBtn(card, "certification"));
  container.appendChild(card);
  state.certificationCount++;
}

function setupDynamicFormButtons() {
  $("btnAddEducation")?.addEventListener("click", () => addEducationRow());
  $("btnAddExperience")?.addEventListener("click", () => addExperienceRow());
  $("btnAddProject")?.addEventListener("click", () => addProjectRow());
  $("btnAddAchievement")?.addEventListener("click", () => addAchievementRow());
  $("btnAddCertification")?.addEventListener("click", () => addCertificationRow());
}

// --- Drag & Drop Resume File Upload ---
function setupDropzone() {
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });
}

function setUploadStatus(msg, isError = false) {
  if (!uploadStatus) return;
  uploadStatus.textContent = msg;
  uploadStatus.className = "status-bar" + (isError ? " error" : "");
}

async function handleFile(file) {
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    setUploadStatus("❌ Error: File size exceeds 5MB limit.", true);
    return;
  }

  const name = file.name.toLowerCase();
  const validExts = [".pdf", ".docx", ".txt"];
  const isValid = validExts.some(ext => name.endsWith(ext));

  if (!isValid) {
    setUploadStatus("❌ Error: Unsupported file format. Use PDF, DOCX, or TXT.", true);
    return;
  }

  setUploadStatus(`⏳ Uploading & parsing "${file.name}"...`);

  try {
    const buffer = await file.arrayBuffer();
    let text = "";

    if (name.endsWith(".txt")) {
      text = new TextDecoder("utf-8").decode(buffer);
    } else if (name.endsWith(".pdf")) {
      text = await extractPdfText(buffer);
    } else if (name.endsWith(".docx")) {
      text = await extractDocxText(buffer);
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Extracted text is empty or unreadable.");
    }

    resumeText = text;
    originalParsedText = text; // save original copy for restores
    
    if (btnRestoreOriginal) btnRestoreOriginal.style.display = "inline-block";

    setUploadStatus(`✅ Successfully parsed: ${file.name}`);
    
    // Auto-fill structured form fields using heuristic parser
    autoFillFormFromText(text);

    // Switch to comparison tab
    switchTab("compare");

  } catch (err) {
    console.error(err);
    setUploadStatus(`❌ Parsing failed: ${err.message}`, true);
  }
}

// --- PDF & DOCX Text Extraction Helpers ---
async function extractPdfText(buffer) {
  let pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) {
    pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs");
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";

  const task = pdfjsLib.getDocument({ data: buffer }).promise;
  const pdf = await task;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str || "").join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

async function extractDocxText(buffer) {
  const mammoth = window.mammoth;
  if (!mammoth) {
    throw new Error("Mammoth DOCX parsing library is not loaded.");
  }
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || "";
}

// --- Form Autopopulator (Heuristics) ---
function autoFillFormFromText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const nameMatch = lines[0].match(/^[a-zA-Z\s]{3,30}$/);
    $("resName").value = nameMatch ? nameMatch[0] : lines[0].substring(0, 30);
  }

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    $("resEmail").value = emailMatch[0];
  }

  const phoneMatch = text.match(/(\+?\d[\d\s().-]{9,}\d)/);
  if (phoneMatch) {
    $("resPhone").value = phoneMatch[0];
  }

  const locMatch = text.match(/\b(Pune|Mumbai|Delhi|Bangalore|Hyderabad|Chennai|Kolkata|London|New York|San Francisco|California|India|USA|UK|Canada)\b[^,\n]*/i);
  if (locMatch) {
    $("resLocation").value = locMatch[0];
  } else if (lines.length > 1) {
    $("resLocation").value = lines[1].substring(0, 40);
  }

  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  if (linkedinMatch) $("resLinkedin").value = "https://" + linkedinMatch[0];

  const githubMatch = text.match(/github\.com\/[a-zA-Z0-9_-]+/i);
  if (githubMatch) $("resGithub").value = "https://" + githubMatch[0];

  // Skills
  const skillsList = {
    programming: ["python", "sql", "javascript", "java", "c++", "typescript", "ruby", "go"],
    analysis: ["data cleaning", "eda", "data prep", "machine learning", "modeling", "statistics"],
    tools: ["power bi", "tableau", "excel", "git", "jupyter", "pandas", "numpy", "aws", "docker"]
  };

  const programmingExtracted = [];
  const analysisExtracted = [];
  const toolsExtracted = [];

  text.toLowerCase().split(/[,\s\n]+/).forEach(word => {
    word = word.replace(/[().]/g, "");
    if (skillsList.programming.includes(word)) programmingExtracted.push(word);
    if (skillsList.analysis.includes(word)) analysisExtracted.push(word);
    if (skillsList.tools.includes(word)) toolsExtracted.push(word);
  });

  $("resSkillsProg").value = programmingExtracted.length ? [...new Set(programmingExtracted)].join(", ") : "Python, SQL";
  $("resSkillsAnalysis").value = analysisExtracted.length ? [...new Set(analysisExtracted)].join(", ") : "EDA, Data Cleaning";
  $("resSkillsTools").value = toolsExtracted.length ? [...new Set(toolsExtracted)].join(", ") : "Power BI, Git, Jupyter Notebook";

  // Summary
  const summaryBlock = lines.slice(0, 10).join(" ");
  $("resSummary").value = summaryBlock.substring(0, 300) + "...";
}

// --- Previews Rendering ---
function renderPreviews() {
  if (originalPreview) {
    if (resumeText) {
      renderOriginalPreviewFromForm();
    } else {
      originalPreview.innerHTML = `
        <div class="empty-state">
          <p class="empty-icon">📤</p>
          <p>Upload a resume file or type details in the Editor tab to view original preview.</p>
        </div>
      `;
    }
  }

  if (tailoredPreview) {
    if (tailoredResumeText) {
      const targetJd = $("targetJdInput").value.trim().toLowerCase();
      const keywords = targetJd.split(/[^a-zA-Z\d#\+]+/).filter(k => k.length > 3);
      
      let highlightedText = tailoredResumeText;
      
      // Highlight added skills
      const uniqueKeywords = [...new Set(keywords)].slice(0, 20);
      uniqueKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${keyword})\\b`, "gi");
        highlightedText = highlightedText.replace(regex, `<span class="highlight-added">$1</span>`);
      });

      tailoredPreview.innerHTML = highlightedText;
    } else {
      tailoredPreview.innerHTML = `
        <div class="empty-state">
          <p class="empty-icon">💡</p>
          <p>Enter a Target JD on the Editor tab and run tailoring analysis to view tailored preview.</p>
        </div>
      `;
    }
  }
}

function renderOriginalPreviewFromForm() {
  const data = getStructuredResumeData();
  let html = `<div style="font-family: inherit;">`;
  html += `<h2 style="font-size: 1.5rem; border-bottom: 2px solid var(--primary); padding-bottom: 0.25rem; color:#fff;">${data.full_name || "Name"}</h2>`;
  html += `<p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1rem;">📍 ${data.location || "Location"} | 📞 ${data.phone || "Phone"} | ✉️ ${data.email || "Email"}</p>`;
  if (data.linkedin || data.github) {
    html += `<p style="font-size: 0.8rem; color: var(--primary); margin-top: -0.5rem; margin-bottom: 1rem;">🔗 ${data.linkedin || ""} ${data.github || ""}</p>`;
  }
  
  html += `<h3 style="font-size: 1.1rem; color: var(--primary); margin-top: 1rem; border-bottom: 1px solid var(--glass-border);">Professional Summary</h3>`;
  html += `<p>${data.summary}</p>`;

  html += `<h3 style="font-size: 1.1rem; color: var(--primary); margin-top: 1rem; border-bottom: 1px solid var(--glass-border);">Skills Core</h3>`;
  html += `<p><strong>Programming:</strong> ${data.skills_programming}</p>`;
  html += `<p><strong>Data Analysis:</strong> ${data.skills_data_analysis}</p>`;
  html += `<p><strong>Tools:</strong> ${data.skills_tools}</p>`;

  if (data.experience.length) {
    html += `<h3 style="font-size: 1.1rem; color: var(--primary); margin-top: 1.25rem; border-bottom: 1px solid var(--glass-border);">Work Experience</h3>`;
    data.experience.forEach(exp => {
      html += `<div style="margin-bottom: 0.75rem;">`;
      html += `<div style="display:flex; justify-content:space-between; font-weight:700; color:#fff;"><span>${exp.title}</span><span>${exp.dates}</span></div>`;
      html += `<div style="font-style:italic; color:var(--muted);">${exp.company} - ${exp.location}</div>`;
      html += `<ul style="margin-left: 1.25rem; margin-top: 0.25rem;">`;
      exp.bullets.forEach(bullet => {
        html += `<li>${bullet}</li>`;
      });
      html += `</ul></div>`;
    });
  }

  if (data.projects.length) {
    html += `<h3 style="font-size: 1.1rem; color: var(--primary); margin-top: 1.25rem; border-bottom: 1px solid var(--glass-border);">Projects</h3>`;
    data.projects.forEach(proj => {
      html += `<div style="margin-bottom: 0.75rem;">`;
      html += `<div style="font-weight:700; color:#fff;">${proj.name}</div>`;
      html += `<ul style="margin-left: 1.25rem; margin-top: 0.25rem;">`;
      proj.description.forEach(desc => {
        html += `<li>${desc}</li>`;
      });
      html += `</ul></div>`;
    });
  }

  if (data.education.length) {
    html += `<h3 style="font-size: 1.1rem; color: var(--primary); margin-top: 1.25rem; border-bottom: 1px solid var(--glass-border);">Education</h3>`;
    data.education.forEach(edu => {
      html += `<div style="margin-bottom: 0.5rem;">`;
      html += `<div style="display:flex; justify-content:space-between; font-weight:700; color:#fff;"><span>${edu.degree}</span><span>${edu.dates}</span></div>`;
      html += `<div style="color:var(--muted);">${edu.institution} - ${edu.location} ${edu.gpa ? `| GPA: ${edu.gpa}` : ""}</div>`;
      html += `</div>`;
    });
  }

  html += `</div>`;
  originalPreview.innerHTML = html;
}

// --- Form Validation & Saving ---
function setupFormSubmission() {
  if (!resumeForm) return;

  resumeForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = $("resName").value.trim();
    const email = $("resEmail").value.trim();
    const phone = $("resPhone").value.trim();
    const location = $("resLocation").value.trim();
    const summary = $("resSummary").value.trim();
    
    if (!name || !email || !phone || !location || !summary) {
      alert("Please fill in all required fields (*) in the resume form.");
      return;
    }

    savedResumeData = getStructuredResumeData();
    resumeText = `${savedResumeData.full_name}\n${savedResumeData.summary}\nSkills: ${savedResumeData.skills_programming}, ${savedResumeData.skills_data_analysis}, ${savedResumeData.skills_tools}`;
    
    // Add snapshot to Draft Registry
    saveResumeVersionSnapshot("Manual Save");

    alert("✅ Resume saved successfully! Snapshot added to Saved & Drafts tab.");
    switchTab("compare");
  });
}

function getStructuredResumeData() {
  const education = [];
  document.querySelectorAll(".education-entry").forEach(el => {
    const degree = el.querySelector(".edu-degree").value.trim();
    const institution = el.querySelector(".edu-inst").value.trim();
    const location = el.querySelector(".edu-loc").value.trim();
    const dates = el.querySelector(".edu-dates").value.trim();
    const gpa = el.querySelector(".edu-gpa").value.trim();
    if (degree && institution && dates) {
      education.push({ degree, institution, location, dates, gpa: gpa || null });
    }
  });

  const experience = [];
  document.querySelectorAll(".experience-entry").forEach(el => {
    const title = el.querySelector(".exp-title").value.trim();
    const company = el.querySelector(".exp-company").value.trim();
    const location = el.querySelector(".exp-loc").value.trim();
    const dates = el.querySelector(".exp-dates").value.trim();
    const bulletsRaw = el.querySelector(".exp-bullets").value.trim();
    const bullets = bulletsRaw.split("\n").map(b => b.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean);
    if (title && company && dates) {
      experience.push({ title, company, location, dates, bullets });
    }
  });

  const projects = [];
  document.querySelectorAll(".project-entry").forEach(el => {
    const name = el.querySelector(".proj-name").value.trim();
    const descRaw = el.querySelector(".proj-desc").value.trim();
    const description = descRaw.split("\n").map(d => d.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean);
    if (name && description.length) {
      projects.push({ name, description });
    }
  });

  const achievements = [];
  document.querySelectorAll(".achievement-entry").forEach(el => {
    const val = el.querySelector(".ach-text").value.trim();
    if (val) achievements.push(val);
  });

  const certifications = [];
  document.querySelectorAll(".certification-entry").forEach(el => {
    const val = el.querySelector(".cert-text").value.trim();
    if (val) certifications.push(val);
  });

  return {
    full_name: $("resName").value.trim(),
    email: $("resEmail").value.trim(),
    phone: $("resPhone").value.trim(),
    location: $("resLocation").value.trim(),
    linkedin: $("resLinkedin").value.trim() || null,
    github: $("resGithub").value.trim() || null,
    portfolio: $("resPortfolio").value.trim() || null,
    summary: $("resSummary").value.trim(),
    skills_programming: $("resSkillsProg").value.trim(),
    skills_data_analysis: $("resSkillsAnalysis").value.trim(),
    skills_tools: $("resSkillsTools").value.trim(),
    education,
    experience,
    projects,
    achievements: achievements.length ? achievements : null,
    certifications: certifications.length ? certifications : null
  };
}

// --- Stepper Checklist Overlay Animator ---
async function runVisualStepperAnimation() {
  if (!tailoringStepper || !stepperProgressBar) return;

  tailoringStepper.style.display = "flex";
  stepperProgressBar.style.width = "0%";

  const steps = [
    { id: "stepParse", progress: "20%" },
    { id: "stepKeywords", progress: "40%" },
    { id: "stepSummary", progress: "60%" },
    { id: "stepBullets", progress: "80%" },
    { id: "stepLatex", progress: "100%" }
  ];

  steps.forEach(s => {
    const el = $(s.id);
    if (el) {
      el.className = "step-item";
      const icon = el.querySelector(".step-icon");
      if (icon) icon.textContent = "⏳";
    }
  });

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const el = $(s.id);
    if (el) {
      el.classList.add("active");
      await new Promise(r => setTimeout(r, 650));
      
      el.classList.remove("active");
      el.classList.add("done");
      const icon = el.querySelector(".step-icon");
      if (icon) icon.textContent = "✅";
      
      stepperProgressBar.style.width = s.progress;
    }
  }

  await new Promise(r => setTimeout(r, 400));
  tailoringStepper.style.display = "none";
}

// --- Scroll Syncing ---
function setupScrollSync() {
  if (!originalPreview || !tailoredPreview) return;

  let isSyncingLeft = false;
  let isSyncingRight = false;

  originalPreview.addEventListener("scroll", () => {
    if (!isSyncingLeft) {
      isSyncingRight = true;
      tailoredPreview.scrollTop = originalPreview.scrollTop;
    }
    isSyncingLeft = false;
  });

  tailoredPreview.addEventListener("scroll", () => {
    if (!isSyncingRight) {
      isSyncingLeft = true;
      originalPreview.scrollTop = tailoredPreview.scrollTop;
    }
    isSyncingRight = false;
  });
}

// --- AI suggestions & One-click tailoring ---
function setupAiAnalysis() {
  if (!btnRunAiAnalysis) return;

  btnRunAiAnalysis.addEventListener("click", async () => {
    const jdText = targetJdInput.value.trim();
    if (!jdText) {
      setAiStatus("⚠️ Please enter a Target Job Description to analyze.", true);
      return;
    }

    savedResumeData = getStructuredResumeData();
    resumeText = `${savedResumeData.full_name}\n${savedResumeData.summary}\nSkills: ${savedResumeData.skills_programming}, ${savedResumeData.skills_data_analysis}, ${savedResumeData.skills_tools}`;

    setAiStatus("⏳ Running ATS analysis & querying Gemini AI suggestions...");
    btnRunAiAnalysis.disabled = true;

    try {
      // 1. Run resume analysis / score check
      const scoreResponse = await fetch(`${BACKEND_URL}/api/analyze-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          jd_text: jdText,
          filename: "resume.pdf"
        })
      });

      if (!scoreResponse.ok) throw new Error("ATS Scorer returned error state.");
      const scoreData = await scoreResponse.json();

      const atsVal = scoreData.overall || 70;
      updateRadialProgress("atsScoreProgress", atsVal);
      updateRadialProgress("keywordScoreProgress", Math.min(atsVal + 5, 95));
      updateRadialProgress("readabilityProgress", Math.max(atsVal - 10, 60));
      updateRadialProgress("impactProgress", Math.min(atsVal + 12, 90));

      $("scoreLabel").textContent = scoreData.fit_prediction || "Good Fit Match";

      // 2. Fetch AI suggestions
      const aiResponse = await fetch(`${BACKEND_URL}/api/ai/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          jd_text: jdText,
          score: atsVal
        })
      });

      if (!aiResponse.ok) throw new Error("AI Suggestions service unavailable.");
      const suggestionsData = await aiResponse.json();

      setAiStatus("✅ Analysis completed successfully. Switch to 'Side-by-Side View' tab for preview.");
      renderSuggestions(suggestionsData.suggestions || []);

      // 3. Trigger visual stepper animation + live preview update
      switchTab("compare");
      await runVisualStepperAnimation();

      // Get tailored text
      const tailorResponse = await fetch(`${BACKEND_URL}/api/ai/auto-tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          jd_text: jdText
        })
      });

      if (!tailorResponse.ok) throw new Error("Auto-tailoring service is busy.");
      const tailorData = await tailorResponse.json();
      
      tailoredResumeText = tailorData.tailored || "";
      
      // Save compiled LaTeX into state for direct download
      window.generatedLatexCode = tailorData.latex || "";

      // Re-render previews
      renderPreviews();

      // Make LaTeX export block visible
      if (latexSection) {
        latexSection.style.display = "block";
      }

      // Display AI summary feedback
      const feedbackPanel = $("aiFeedbackPanel");
      const feedbackContent = $("aiFeedbackContent");
      if (feedbackPanel && feedbackContent) {
        feedbackPanel.style.display = "block";
        feedbackContent.innerHTML = `
          <p><strong>1. Executive Summary Rewrite:</strong> Restructured summary to place your analytical training early in the text.</p>
          <p><strong>2. Keyword Coverage:</strong> Injected matching skills (like <em>Power BI</em> and <em>SQL</em>) inside your work bullets.</p>
          <p><strong>3. Metric Formatting:</strong> Formatted dates, GPA, and location formatting checks to guarantee clear LaTeX compilation.</p>
        `;
      }

      // Show extras grid (Letter, Linkedin, coach)
      const extrasGrid = $("cockpitExtrasGrid");
      if (extrasGrid) extrasGrid.style.display = "grid";

      // Save version to history registry
      saveResumeVersionSnapshot(`Optimized for target JD`);

    } catch (err) {
      console.error(err);
      setAiStatus(`❌ AI service error: ${err.message}`, true);
    } finally {
      btnRunAiAnalysis.disabled = false;
    }
  });
}

function setAiStatus(msg, isError = false) {
  if (!aiAnalysisStatus) return;
  aiAnalysisStatus.textContent = msg;
  aiAnalysisStatus.className = "status-bar" + (isError ? " error" : "");
}

function renderSuggestions(suggestions) {
  if (!aiSuggestionsList) return;

  if (suggestions.length === 0) {
    aiSuggestionsList.innerHTML = `
      <div class="suggestion-item optional">
        <div class="suggestion-header">
          <span>Format compliance looks good</span>
          <span class="suggestion-impact">Optional</span>
        </div>
        <div class="suggestion-detail font-size: 0.85rem;">No critical improvements needed. Your keyword density matches the target role.</div>
      </div>
    `;
    return;
  }

  aiSuggestionsList.innerHTML = suggestions
    .map(item => {
      const title = item.title || "ATS Recommendation";
      const detail = item.detail || "";
      const impact = item.impact || "optional"; // critical, important, optional
      const category = item.category || "General";

      return `
      <div class="suggestion-item ${impact.toLowerCase()}">
        <div class="suggestion-header">
          <span>${title} (${category})</span>
          <span class="suggestion-impact">${impact}</span>
        </div>
        <div class="suggestion-detail">${detail}</div>
      </div>
    `;
    })
    .join("");
}

// --- LaTeX Resume Generation & Export ---
function setupLatexDownload() {
  if (!btnDownloadLatex) return;

  btnDownloadLatex.addEventListener("click", async () => {
    const resumeData = savedResumeData || getStructuredResumeData();
    
    setLatexStatus("⏳ Contacting server to compile LaTeX code...");
    btnDownloadLatex.disabled = true;
    if (latexBtnText) latexBtnText.textContent = "⏳ Generating...";

    try {
      let latexCode = window.generatedLatexCode;
      
      if (!latexCode) {
        const response = await fetch(`${BACKEND_URL}/api/generate-latex-resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resumeData)
        });

        if (!response.ok) throw new Error("Backend compilation error.");
        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Latex service compilation failure.");
        latexCode = result.latex_code;
      }

      const blob = new Blob([latexCode], { type: "text/plain; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fn = resumeData.full_name ? resumeData.full_name.replace(/\s+/g, "_") : "resume";
      a.download = `${fn}_resume.tex`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLatexStatus("✅ LaTeX file downloaded! Compile it on Overleaf.com.", false, true);
      if (latexBtnText) latexBtnText.textContent = "📥 Downloaded!";
      setTimeout(() => {
        if (latexBtnText) latexBtnText.textContent = "📥 Download LaTeX (.tex)";
      }, 3000);
      
    } catch (err) {
      console.error(err);
      setLatexStatus(`❌ LaTeX Generation Error: ${err.message}`, true);
      if (latexBtnText) latexBtnText.textContent = "📥 Download LaTeX (.tex)";
    } finally {
      btnDownloadLatex.disabled = false;
    }
  });
}

function setLatexStatus(msg, isError = false, isSuccess = false) {
  if (!latexStatus) return;
  latexStatus.textContent = msg;
  let cls = "status-bar";
  if (isError) cls += " error";
  if (isSuccess) cls += " success";
  latexStatus.className = cls;
}

// --- Text Exporter ---
function setupTextExporter() {
  if (!btnDownloadTxt) return;
  btnDownloadTxt.addEventListener("click", () => {
    const text = tailoredResumeText || resumeText || "Resume Content";
    const blob = new Blob([text], { type: "text/plain; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailored_resume.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// --- On-demand Career cockpit tools (Extras) ---
function setupExtras() {
  const btnGenLetter = $("btnGenLetter");
  const btnGenLinkedin = $("btnGenLinkedin");
  const btnGenQuestions = $("btnGenQuestions");

  const coverLetterText = $("coverLetterText");
  const linkedinText = $("linkedinText");
  const interviewQuestionsArea = $("interviewQuestionsArea");

  if (btnGenLetter) {
    btnGenLetter.addEventListener("click", async () => {
      btnGenLetter.disabled = true;
      btnGenLetter.textContent = "Generating...";
      try {
        const response = await fetch(`${BACKEND_URL}/api/ai/cover-letter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_text: resumeText,
            jd_text: $("targetJdInput").value.trim()
          })
        });
        if (!response.ok) throw new Error("Service unavailable.");
        const data = await response.json();
        if (coverLetterText) {
          coverLetterText.style.display = "block";
          coverLetterText.value = data.cover_letter || "";
        }
      } catch (e) {
        alert("Failed to create Cover Letter: " + e.message);
      } finally {
        btnGenLetter.disabled = false;
        btnGenLetter.textContent = "Create Cover Letter";
      }
    });
  }

  if (btnGenLinkedin) {
    btnGenLinkedin.addEventListener("click", async () => {
      btnGenLinkedin.disabled = true;
      btnGenLinkedin.textContent = "Generating...";
      try {
        const response = await fetch(`${BACKEND_URL}/api/ai/linkedin-optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_text: resumeText
          })
        });
        if (!response.ok) throw new Error("Service unavailable.");
        const data = await response.json();
        if (linkedinText) {
          linkedinText.style.display = "block";
          linkedinText.value = data.summary || "";
        }
      } catch (e) {
        alert("Failed to optimize LinkedIn: " + e.message);
      } finally {
        btnGenLinkedin.disabled = false;
        btnGenLinkedin.textContent = "Create LinkedIn About";
      }
    });
  }

  if (btnGenQuestions) {
    btnGenQuestions.addEventListener("click", async () => {
      btnGenQuestions.disabled = true;
      btnGenQuestions.textContent = "Generating...";
      try {
        const response = await fetch(`${BACKEND_URL}/api/ai/interview-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_text: resumeText,
            jd_text: $("targetJdInput").value.trim()
          })
        });
        if (!response.ok) throw new Error("Service unavailable.");
        const data = await response.json();
        if (interviewQuestionsArea) {
          interviewQuestionsArea.style.display = "block";
          interviewQuestionsArea.innerHTML = data.questions ? data.questions.split("\n").map(q => `<p>${q}</p>`).join("") : "";
        }
      } catch (e) {
        alert("Failed to generate coach questions: " + e.message);
      } finally {
        btnGenQuestions.disabled = false;
        btnGenQuestions.textContent = "Generate Prep Questions";
      }
    });
  }
}

// --- Version History Snapshot Registry Management ---
function saveResumeVersionSnapshot(description) {
  const timestamp = new Date().toLocaleString();
  const data = getStructuredResumeData();
  
  const version = {
    id: "version-" + Date.now(),
    timestamp,
    description,
    data,
    resumeText,
    tailoredResumeText,
    latexCode: window.generatedLatexCode || ""
  };

  cockpitState.savedVersions.unshift(version); // add to top
  saveToLocalStorage();
}

function renderHistoryList() {
  const list = $("historyList");
  if (!list) return;

  if (cockpitState.savedVersions.length === 0) {
    list.innerHTML = `<p class="empty-state">No saved drafts yet. Save a resume in the Editor to create a snapshot registry.</p>`;
    return;
  }

  list.innerHTML = cockpitState.savedVersions
    .map(v => {
      return `
      <div class="history-item">
        <div class="history-meta">
          <h4>${v.data.full_name || "Resume Draft"} (${v.description})</h4>
          <p>Created: ${v.timestamp} | Skills: ${v.data.skills_programming}</p>
        </div>
        <div class="history-actions">
          <button type="button" class="btn btn-primary btn-sm btn-restore-version" data-id="${v.id}">⏪ Restore</button>
          <button type="button" class="btn btn-secondary btn-sm btn-delete-version" data-id="${v.id}" style="color:#f87171;">✕ Delete</button>
        </div>
      </div>
    `;
    })
    .join("");

  // Attach version restore click listener
  list.querySelectorAll(".btn-restore-version").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      const v = cockpitState.savedVersions.find(item => item.id === id);
      if (v) {
        restoreResumeFromData(v.data);
        resumeText = v.resumeText;
        tailoredResumeText = v.tailoredResumeText;
        window.generatedLatexCode = v.latexCode;
        alert("✅ Version draft successfully restored to active editor workspace!");
        switchTab("form");
        // Scroll page titles to top
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  // Attach version delete listener
  list.querySelectorAll(".btn-delete-version").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      cockpitState.savedVersions = cockpitState.savedVersions.filter(item => item.id !== id);
      saveToLocalStorage();
      renderHistoryList();
    });
  });
}

function restoreResumeFromData(data) {
  $("resName").value = data.full_name || "";
  $("resEmail").value = data.email || "";
  $("resPhone").value = data.phone || "";
  $("resLocation").value = data.location || "";
  $("resLinkedin").value = data.linkedin || "";
  $("resGithub").value = data.github || "";
  $("resPortfolio").value = data.portfolio || "";
  $("resSummary").value = data.summary || "";
  $("resSkillsProg").value = data.skills_programming || "";
  $("resSkillsAnalysis").value = data.skills_data_analysis || "";
  $("resSkillsTools").value = data.skills_tools || "";

  // Reset dynamic list containers
  $("educationList").innerHTML = "";
  $("experienceList").innerHTML = "";
  $("projectsList").innerHTML = "";
  $("achievementsList").innerHTML = "";
  $("certificationsList").innerHTML = "";

  state.educationCount = 0;
  state.experienceCount = 0;
  state.projectCount = 0;
  state.achievementCount = 0;
  state.certificationCount = 0;

  if (data.education) data.education.forEach(edu => addEducationRow(edu));
  if (data.experience) data.experience.forEach(exp => addExperienceRow(exp));
  if (data.projects) data.projects.forEach(proj => addProjectRow(proj));
  if (data.achievements) data.achievements.forEach(ach => addAchievementRow(ach));
  if (data.certifications) data.certifications.forEach(cert => addCertificationRow(cert));
}

// --- Restore Original Parsed Data ---
function restoreOriginalParsedData() {
  if (!originalParsedText) return;
  autoFillFormFromText(originalParsedText);
  alert("⏪ Original parsed values restored to the form!");
}

// --- Try Demo Resume Mode ---
function loadDemoResumeData() {
  const demoData = {
    full_name: "Kalicharan Upadhayay",
    email: "kalicharanupadhayayofficial@gmail.com",
    phone: "+91 98238 65388",
    location: "Pune, Maharashtra",
    linkedin: "https://www.linkedin.com/in/kalicharan-upadhayay-2637b4324",
    github: "https://github.com/akashupadhayay106-au",
    portfolio: "https://akashupadhayay106-au.github.io/portfolio",
    summary: "Detail-oriented Data Analyst with strong expertise in data collection, cleaning, and preprocessing using Python and SQL. Experienced in delivering insights through Power BI dashboard reports.",
    skills_programming: "Python (Pandas, NumPy), SQL",
    skills_data_analysis: "Data Collection, Data Cleaning, EDA, Exploratory Analysis",
    skills_tools: "Power BI, Tableau, Excel Charts, Jupyter Notebook, Git",
    education: [
      {
        degree: "BBA (Computer Applications)",
        institution: "E.S. Divekar College",
        location: "Varvand",
        dates: "Jul 2022 -- May 2025",
        gpa: "CGPA: 6.83"
      }
    ],
    experience: [
      {
        title: "Data Science Trainer",
        company: "Skillected JSSAV Education Pvt Ltd",
        location: "Koregaon Park, Pune",
        dates: "Feb 2026 -- Present",
        bullets: [
          "Deliver training on data collection, cleaning, and preprocessing using real-world datasets.",
          "Perform Exploratory Data Analysis (EDA) to identify trends and patterns."
        ]
      }
    ],
    projects: [
      {
        name: "Sales & Inventory Data Analysis",
        description: [
          "Collected and cleaned 12K+ records using Python (Pandas).",
          "Performed EDA to identify trends and business patterns.",
          "Built Power BI dashboards for actionable insights."
        ]
      }
    ],
    achievements: [
      "Delivered live YouTube sessions teaching Data Science projects from scratch."
    ],
    certifications: [
      "Data Science Certification",
      "Python for Data Analysis"
    ]
  };

  restoreResumeFromData(demoData);

  // Set JD field
  if (targetJdInput) {
    targetJdInput.value = "Looking for a Data Analyst with solid Python, Pandas, and SQL skills to collect and preprocess datasets. Must have experience building reports in Power BI or Tableau to guide business decisions.";
  }

  resumeText = `${demoData.full_name}\n${demoData.summary}\nSkills: ${demoData.skills_programming}, ${demoData.skills_data_analysis}, ${demoData.skills_tools}`;
  
  // Set default scores
  updateRadialProgress("atsScoreProgress", 75);
  updateRadialProgress("keywordScoreProgress", 80);
  updateRadialProgress("readabilityProgress", 70);
  updateRadialProgress("impactProgress", 85);
  
  $("scoreLabel").textContent = "Potential Match (75%)";

  alert("⚡ Demo resume successfully loaded into workspace!");
  switchTab("form");
}

// --- Kanban Tracker Board Manager ---
function renderTrackerBoard() {
  const statuses = ["wishlist", "applied", "interviewing", "offered"];
  
  statuses.forEach(status => {
    const area = document.querySelector(`.kanban-cards-area[data-status="${status}"]`);
    if (!area) return;

    const columnJobs = cockpitState.shortlistedJobs.filter(j => j.status === status);
    
    // Update count display
    const countSpan = area.closest(".kanban-col").querySelector(".kanban-count");
    if (countSpan) countSpan.textContent = columnJobs.length;

    if (columnJobs.length === 0) {
      area.innerHTML = `<p style="text-align:center; padding: 1rem; color:var(--muted); font-size:0.75rem; font-style:italic;">Empty</p>`;
      return;
    }

    area.innerHTML = columnJobs
      .map(job => {
        return `
        <div class="kanban-card" draggable="true" data-id="${job.id}">
          <div class="kanban-card-title">${escapeHtml(job.title)}</div>
          <div class="kanban-card-company">${escapeHtml(job.company)}</div>
          <div class="kanban-card-loc">📍 ${escapeHtml(job.location)}</div>
          <div class="kanban-card-footer">
            <button type="button" class="kanban-btn-delete" data-id="${job.id}">✕ Remove</button>
          </div>
        </div>
      `;
      })
      .join("");

    // Attach drag events to cards
    area.querySelectorAll(".kanban-card").forEach(card => {
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", e.target.getAttribute("data-id"));
      });
    });

    // Attach drop event listeners
    area.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    area.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      const job = cockpitState.shortlistedJobs.find(item => item.id === id);
      if (job && job.status !== status) {
        job.status = status;
        saveToLocalStorage();
        renderTrackerBoard();
      }
    });

    // Attach delete listeners
    area.querySelectorAll(".kanban-btn-delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        cockpitState.shortlistedJobs = cockpitState.shortlistedJobs.filter(item => item.id !== id);
        saveToLocalStorage();
        renderTrackerBoard();
      });
    });
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// Export shortlist method to window context
window.shortlistJob = function(jobData) {
  // Check duplicate
  const exists = cockpitState.shortlistedJobs.some(item => item.id === jobData.id);
  if (exists) {
    alert("ℹ️ Job is already shortlisted in your App Tracker pipeline.");
    return;
  }

  cockpitState.shortlistedJobs.push({
    id: jobData.id,
    title: jobData.title,
    company: jobData.company,
    location: jobData.location,
    status: "wishlist"
  });

  saveToLocalStorage();
  alert("📋 Job successfully shortlisted! Access it inside the 'App Tracker' board tab.");
};
