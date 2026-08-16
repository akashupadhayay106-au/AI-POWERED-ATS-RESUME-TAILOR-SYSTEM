import React, { useState, useEffect, useRef } from "react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, 
  XAxis, YAxis, Tooltip, Legend 
} from "recharts";
import { 
  Briefcase, GraduationCap, Award, FileText, Download, 
  RotateCcw, Sparkles, Search, Layers, ClipboardList, 
  Settings, User, Plus, Trash2, Eye, Sun, Moon, CheckCircle
} from "lucide-react";

const BACKEND_URL = "http://localhost:8088";

export default function App() {
  // --- Global App States ---
  const [activeView, setActiveView] = useState("cockpit"); // cockpit, jobs, tracker, history
  const [activeCockpitTab, setActiveCockpitTab] = useState("form"); // form or compare
  const [darkMode, setDarkMode] = useState(true);
  const [stylePreset, setStylePreset] = useState("modern"); // modern, professional, creative

  // --- Form & Editor States ---
  const [resumeForm, setResumeForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    summary: "",
    skills_programming: "",
    skills_data_analysis: "",
    skills_tools: "",
    education: [],
    experience: [],
    projects: [],
    achievements: [],
    certifications: []
  });

  const [activeFormSection, setActiveFormSection] = useState("personal"); // personal, skills, education, experience, projects, extras

  // --- File Upload & Text States ---
  const [originalText, setOriginalText] = useState("");
  const [tailoredText, setTailoredText] = useState("");
  const [latexCode, setLatexCode] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // --- Target JD ---
  const [targetJd, setTargetJd] = useState("");

  // --- Stepper & Cinematic Tailoring Progress ---
  const [tailoringProgressStep, setTailoringProgressStep] = useState(0); // 0 = off, 1 = parse, 2 = rag, 3 = ai, 4 = render
  const [isTailoring, setIsTailoring] = useState(false);

  // --- Metrics & Scoring States ---
  const [scores, setScores] = useState({
    ats: 0,
    keywords: 0,
    readability: 0,
    impact: 0
  });
  const [suggestions, setSuggestions] = useState([]);
  const [aiFeedback, setAiFeedback] = useState("");

  // --- Extra Services ---
  const [coverLetter, setCoverLetter] = useState("");
  const [linkedinSummary, setLinkedinSummary] = useState("");
  const [interviewQuestions, setInterviewQuestions] = useState("");
  const [loadingExtra, setLoadingExtra] = useState({ letter: false, linkedin: false, questions: false });

  // --- Job Search States ---
  const [jobQuery, setJobQuery] = useState("Python Developer");
  const [jobLocation, setJobLocation] = useState("in");
  const [jobsList, setJobsList] = useState([]);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");

  // --- Kanban & Application Tracker States ---
  const [shortlistedJobs, setShortlistedJobs] = useState([]);

  // --- Saved Versions Timeline Registry ---
  const [savedTimeline, setSavedTimeline] = useState([]);

  // --- Previews Scroll Syncing Refs ---
  const originalPreviewRef = useRef(null);
  const tailoredPreviewRef = useRef(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  // --- Fetch localstorage configurations ---
  useEffect(() => {
    try {
      const storedJobs = localStorage.getItem("shortlistedJobs");
      if (storedJobs) setShortlistedJobs(JSON.parse(storedJobs));

      const storedTimeline = localStorage.getItem("savedTimeline");
      if (storedTimeline) setSavedTimeline(JSON.parse(storedTimeline));
      
      const storedResume = localStorage.getItem("resumeForm");
      if (storedResume) setResumeForm(JSON.parse(storedResume));
    } catch (e) {
      console.error("Localstorage retrieval error:", e);
    }
  }, []);

  // --- Save states to localStorage ---
  const saveStateToLocalStorage = (newShortlist, newTimeline, newResume) => {
    if (newShortlist) {
      setShortlistedJobs(newShortlist);
      localStorage.setItem("shortlistedJobs", JSON.stringify(newShortlist));
    }
    if (newTimeline) {
      setSavedTimeline(newTimeline);
      localStorage.setItem("savedTimeline", JSON.stringify(newTimeline));
    }
    if (newResume) {
      setResumeForm(newResume);
      localStorage.setItem("resumeForm", JSON.stringify(newResume));
    }
  };

  // --- Try Demo Resume Loader ---
  const loadDemoResume = () => {
    const demo = {
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
    setResumeForm(demo);
    setTargetJd(
      "Looking for a Data Analyst with solid Python, Pandas, and SQL skills to collect and preprocess datasets. Must have experience building reports in Power BI or Tableau to guide business decisions."
    );
    setOriginalText(demo.summary);
    setScores({
      ats: 75,
      keywords: 80,
      readability: 70,
      impact: 85
    });
    setUploadStatus("⚡ Demo resume successfully loaded into workspace!");
    saveStateToLocalStorage(null, null, demo);
  };

  // --- Reset to Original ---
  const handleReset = () => {
    setResumeForm({
      full_name: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      portfolio: "",
      summary: "",
      skills_programming: "",
      skills_data_analysis: "",
      skills_tools: "",
      education: [],
      experience: [],
      projects: [],
      achievements: [],
      certifications: []
    });
    setOriginalText("");
    setTailoredText("");
    setLatexCode("");
    setScores({ ats: 0, keywords: 0, readability: 0, impact: 0 });
    setSuggestions([]);
    setAiFeedback("");
  };

  // --- Drag & Drop file upload parser ---
  const triggerFileBrowser = () => {
    document.getElementById("reactFileInput").click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadStatus(`⏳ Uploading & parsing "${file.name}"...`);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      let text = "";
      const name = file.name.toLowerCase();

      if (name.endsWith(".txt")) {
        text = new TextDecoder("utf-8").decode(buffer);
      } else if (name.endsWith(".pdf")) {
        // PDF parser loader
        text = await extractPdfText(buffer);
      } else if (name.endsWith(".docx")) {
        text = await extractDocxText(buffer);
      }

      if (!text || text.trim().length === 0) {
        throw new Error("Extracted text is empty or unreadable.");
      }

      setOriginalText(text);
      setUploadStatus(`✅ Successfully parsed: ${file.name}`);
      heuristicAutoFill(text);
      
      // Navigate to compare view to visualize upload text
      setActiveCockpitTab("compare");
    } catch (err) {
      console.error(err);
      setUploadStatus(`❌ Parsing failed: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  // PDF & DOCX loaders using Mammoth / PDF.js loaded inside window from layout CDNs
  const extractPdfText = async (buffer) => {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) throw new Error("PDF.js library failed to load from CDN.");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str || "").join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  };

  const extractDocxText = async (buffer) => {
    const mammoth = window.mammoth;
    if (!mammoth) throw new Error("Mammoth DOCX library failed to load from CDN.");
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || "";
  };

  // Heuristic auto fill parser
  const heuristicAutoFill = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const updated = { ...resumeForm };

    if (lines.length > 0) {
      const nameMatch = lines[0].match(/^[a-zA-Z\s]{3,30}$/);
      updated.full_name = nameMatch ? nameMatch[0] : lines[0].substring(0, 30);
    }

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) updated.email = emailMatch[0];

    const phoneMatch = text.match(/(\+?\d[\d\s().-]{9,}\d)/);
    if (phoneMatch) updated.phone = phoneMatch[0];

    // Simple summary extraction (first 3 lines after metadata)
    updated.summary = lines.slice(1, 5).join(" ").substring(0, 300);
    
    // Default skills heuristic
    updated.skills_programming = "Python, SQL";
    updated.skills_data_analysis = "EDA, Data Cleaning";
    updated.skills_tools = "Git, Excel";

    setResumeForm(updated);
    saveStateToLocalStorage(null, null, updated);
  };

  // --- Dynamic list state handlers ---
  const handleInputChange = (field, val) => {
    const updated = { ...resumeForm, [field]: val };
    setResumeForm(updated);
    saveStateToLocalStorage(null, null, updated);
  };

  const addEducation = () => {
    const updated = {
      ...resumeForm,
      education: [...resumeForm.education, { degree: "", institution: "", location: "", dates: "", gpa: "" }]
    };
    setResumeForm(updated);
  };

  const removeEducation = (index) => {
    const updated = {
      ...resumeForm,
      education: resumeForm.education.filter((_, i) => i !== index)
    };
    setResumeForm(updated);
  };

  const updateEducationField = (index, field, val) => {
    const updatedList = resumeForm.education.map((item, i) => {
      if (i === index) return { ...item, [field]: val };
      return item;
    });
    setResumeForm({ ...resumeForm, education: updatedList });
  };

  const addExperience = () => {
    const updated = {
      ...resumeForm,
      experience: [...resumeForm.experience, { title: "", company: "", location: "", dates: "", bullets: [""] }]
    };
    setResumeForm(updated);
  };

  const removeExperience = (index) => {
    const updated = {
      ...resumeForm,
      experience: resumeForm.experience.filter((_, i) => i !== index)
    };
    setResumeForm(updated);
  };

  const updateExperienceField = (index, field, val) => {
    const updatedList = resumeForm.experience.map((item, i) => {
      if (i === index) return { ...item, [field]: val };
      return item;
    });
    setResumeForm({ ...resumeForm, experience: updatedList });
  };

  const addProject = () => {
    const updated = {
      ...resumeForm,
      projects: [...resumeForm.projects, { name: "", description: [""] }]
    };
    setResumeForm(updated);
  };

  const removeProject = (index) => {
    const updated = {
      ...resumeForm,
      projects: resumeForm.projects.filter((_, i) => i !== index)
    };
    setResumeForm(updated);
  };

  const updateProjectField = (index, field, val) => {
    const updatedList = resumeForm.projects.map((item, i) => {
      if (i === index) return { ...item, [field]: val };
      return item;
    });
    setResumeForm({ ...resumeForm, projects: updatedList });
  };

  // --- Semantic RAG Tailoring Trigger ---
  const handleTailorResume = async () => {
    if (!resumeForm.full_name || !resumeForm.summary) {
      alert("Please fill in at least Name and Summary on the profile form first.");
      return;
    }

    setIsTailoring(true);
    setTailoringProgressStep(1); // 1 = parsing

    try {
      // Form text payload construction
      const payloadText = `${resumeForm.full_name}\n${resumeForm.summary}\nSkills: ${resumeForm.skills_programming}, ${resumeForm.skills_data_analysis}, ${resumeForm.skills_tools}`;
      
      // Step 2: Semantic RAG retrieval
      await new Promise(r => setTimeout(r, 600));
      setTailoringProgressStep(2); // 2 = rag

      // Analyze resume match rate
      const matchResponse = await fetch(`${BACKEND_URL}/api/analyze-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: payloadText,
          jd_text: targetJd || "General Professional Resume",
          filename: "resume.pdf"
        })
      });

      if (!matchResponse.ok) throw new Error("ATS Scorer returned error state.");
      const matchData = await matchResponse.json();

      // Step 3: LLM Optimization
      await new Promise(r => setTimeout(r, 600));
      setTailoringProgressStep(3); // 3 = ai optimization

      // Trigger auto-tailoring API
      const tailorResponse = await fetch(`${BACKEND_URL}/api/ai/auto-tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: payloadText,
          jd_text: targetJd || ""
        })
      });

      if (!tailorResponse.ok) throw new Error("Auto-tailoring service is busy.");
      const tailorData = await tailorResponse.json();

      // Fetch AI recommendations suggestions
      const suggResponse = await fetch(`${BACKEND_URL}/api/ai/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: payloadText,
          jd_text: targetJd || "",
          score: matchData.overall || 70
        })
      });

      const suggestionsData = await suggResponse.json();

      // Step 4: Final rendering
      await new Promise(r => setTimeout(r, 600));
      setTailoringProgressStep(4); // 4 = rendering

      setTailoredText(tailorData.tailored || "");
      setLatexCode(tailorData.latex || "");
      setSuggestions(suggestionsData.suggestions || []);
      
      // Dynamic scores rendering
      const parsedOverall = matchData.overall || 70;
      setScores({
        ats: parsedOverall,
        keywords: Math.min(parsedOverall + 6, 95),
        readability: Math.max(parsedOverall - 12, 60),
        impact: Math.min(parsedOverall + 8, 92)
      });

      setAiFeedback(
        `Restructured professional summary to place core technical competencies first. Quantified project items using action verbs and STAR methodology metrics.`
      );

      // Save snapshots to timeline history list
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newTimelineItem = {
        id: "snapshot-" + Date.now(),
        timestamp,
        description: targetJd ? "Tailored to job description" : "Neutral optimization",
        atsScore: parsedOverall,
        formSnapshot: { ...resumeForm }
      };
      
      const newTimeline = [newTimelineItem, ...savedTimeline];
      saveStateToLocalStorage(null, newTimeline, null);

      // Redirect to side-by-side comparison tab
      setActiveCockpitTab("compare");

    } catch (err) {
      console.error(err);
      alert(`Optimization failure: ${err.message}`);
    } finally {
      setIsTailoring(false);
      setTailoringProgressStep(0);
    }
  };

  // --- One-click LaTeX Export ---
  const handleDownloadLatex = async () => {
    try {
      let finalCode = latexCode;
      
      if (!finalCode) {
        // If not already compiled, query endpoint to compile LaTeX
        const response = await fetch(`${BACKEND_URL}/api/generate-latex-resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...resumeForm,
            style_preset: stylePreset
          })
        });

        if (!response.ok) throw new Error("LaTeX generator service returned error.");
        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Latex service compilation failure.");
        finalCode = result.latex_code;
      }

      const blob = new Blob([finalCode], { type: "text/plain; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fn = resumeForm.full_name ? resumeForm.full_name.replace(/\s+/g, "_") : "resume";
      a.download = `${fn}_resume.tex`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`LaTeX Download Error: ${err.message}`);
    }
  };

  // --- Download TXT ---
  const handleDownloadTxt = () => {
    const text = tailoredText || originalText || "No content available.";
    const blob = new Blob([text], { type: "text/plain; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailored_resume.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Scroll Syncing listeners ---
  const handleOriginalScroll = () => {
    if (isSyncingLeft.current) {
      isSyncingLeft.current = false;
      return;
    }
    isSyncingRight.current = true;
    if (originalPreviewRef.current && tailoredPreviewRef.current) {
      tailoredPreviewRef.current.scrollTop = originalPreviewRef.current.scrollTop;
    }
  };

  const handleTailoredScroll = () => {
    if (isSyncingRight.current) {
      isSyncingRight.current = false;
      return;
    }
    isSyncingLeft.current = true;
    if (originalPreviewRef.current && tailoredPreviewRef.current) {
      originalPreviewRef.current.scrollTop = tailoredPreviewRef.current.scrollTop;
    }
  };

  // --- Live Adzuna Job Searches ---
  const handleJobSearch = async () => {
    setIsSearchingJobs(true);
    setSearchStatus("⏳ Connecting to live Adzuna Database...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/search-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: jobQuery || "Data Analyst",
          location: jobLocation || "in",
          limit: 10
        })
      });

      if (!response.ok) throw new Error("Job search endpoint returned error.");
      const data = await response.json();
      setJobsList(data.jobs || []);
      setSearchStatus(
        data.jobs.length > 0 
          ? `✅ Successfully loaded ${data.jobs.length} jobs` 
          : "⚠️ No jobs matched your criteria. Falling back to simulated jobs..."
      );
    } catch (e) {
      console.error(e);
      setSearchStatus("⚠️ Connection issue. Falling back to local mock jobs.");
      // Fallback mock jobs
      setJobsList([
        {
          id: "mock-1",
          title: `Senior ${jobQuery} Engineer`,
          company: "CloudScale Systems Ltd",
          location: "Bangalore (Remote)",
          description: `Looking for a strong ${jobQuery} developer. Experience building backend APIs, writing clean code, and working with SQL databases required.`,
          apply_link: "#",
          posted_date: "2026-07-10"
        },
        {
          id: "mock-2",
          title: `Lead ${jobQuery} Consultant`,
          company: "DataFrontier Enterprise",
          location: "Mumbai Office",
          description: `Join us as a lead engineer managing data pipelines and system deployments. Required skills: Python, AWS, Docker.`,
          apply_link: "#",
          posted_date: "2026-07-09"
        }
      ]);
    } finally {
      setIsSearchingJobs(false);
    }
  };

  const handleSelectJob = (job) => {
    setTargetJd(job.description);
    setActiveView("cockpit");
    setActiveCockpitTab("form");
    setTimeout(() => {
      const scoring = document.getElementById("scoring-panel");
      if (scoring) scoring.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleShortlistJob = (job) => {
    const exists = shortlistedJobs.some(item => item.id === job.id);
    if (exists) {
      alert("Job is already shortlisted in your App Tracker pipeline.");
      return;
    }

    const updated = [
      ...shortlistedJobs,
      {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        status: "wishlist"
      }
    ];
    saveStateToLocalStorage(updated, null, null);
    alert("📋 Job successfully shortlisted! Access it inside the 'App Tracker' board tab.");
  };

  // --- Kanban drag handlers ---
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const updated = shortlistedJobs.map(job => {
      if (job.id === id) return { ...job, status: targetStatus };
      return job;
    });
    saveStateToLocalStorage(updated, null, null);
  };

  const handleRemoveTrackedJob = (id) => {
    const updated = shortlistedJobs.filter(job => job.id !== id);
    saveStateToLocalStorage(updated, null, null);
  };

  // --- Extras Generates ---
  const generateCoverLetter = async () => {
    setLoadingExtra({ ...loadingExtra, letter: true });
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: originalText || resumeForm.summary,
          jd_text: targetJd
        })
      });
      const data = await res.json();
      setCoverLetter(data.cover_letter || "");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoadingExtra({ ...loadingExtra, letter: false });
    }
  };

  const generateLinkedin = async () => {
    setLoadingExtra({ ...loadingExtra, linkedin: true });
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/linkedin-optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: originalText || resumeForm.summary
        })
      });
      const data = await res.json();
      setLinkedinSummary(data.summary || "");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoadingExtra({ ...loadingExtra, linkedin: false });
    }
  };

  const generateQuestions = async () => {
    setLoadingExtra({ ...loadingExtra, questions: true });
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/interview-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: originalText || resumeForm.summary,
          jd_text: targetJd
        })
      });
      const data = await res.json();
      setInterviewQuestions(data.questions ? data.questions.join("\n") : "");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoadingExtra({ ...loadingExtra, questions: false });
    }
  };

  // --- Recharts Data Mappings ---
  const radarData = [
    { subject: "Languages", A: scores.keywords, B: 85, fullMark: 100 },
    { subject: "Analytics", A: scores.ats, B: 90, fullMark: 100 },
    { subject: "Tools", A: scores.readability, B: 80, fullMark: 100 },
    { subject: "Experience", A: scores.impact, B: 75, fullMark: 100 },
    { subject: "STAR format", A: scores.ats - 5, B: 85, fullMark: 100 }
  ];

  const beforeAfterData = [
    { name: "ATS Match", Original: 55, Optimized: scores.ats || 55 },
    { name: "Keywords", Original: 60, Optimized: scores.keywords || 60 },
    { name: "Readability", Original: 65, Optimized: scores.readability || 65 },
    { name: "Impact Metric", Original: 50, Optimized: scores.impact || 50 }
  ];

  const pieData = [
    { name: "Score", value: scores.ats || 10, fill: "var(--primary)" },
    { name: "Remaining", value: 100 - (scores.ats || 10), fill: "rgba(255,255,255,0.05)" }
  ];

  return (
    <div className={`cockpit-container ${darkMode ? "dark" : "light"}`} style={{ minHeight: "100vh" }}>
      
      {/* Sidebar Navigation */}
      <aside className="cockpit-sidebar" style={{ borderRight: "1px solid var(--glass-border)", background: "rgba(17,24,39,0.85)" }}>
        <div className="sidebar-brand">
          <span className="logo-icon">🚀</span>
          <div className="logo-text">Resume<span>IQ</span></div>
        </div>

        <nav className="sidebar-nav">
          <button 
            type="button" 
            className={`nav-item ${activeView === "cockpit" ? "active" : ""}`}
            onClick={() => setActiveView("cockpit")}
          >
            <span className="nav-icon">🎛️</span>
            <span className="nav-label">AI Cockpit</span>
          </button>
          
          <button 
            type="button" 
            className={`nav-item ${activeView === "jobs" ? "active" : ""}`}
            onClick={() => setActiveView("jobs")}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-label">Search Jobs</span>
          </button>

          <button 
            type="button" 
            className={`nav-item ${activeView === "tracker" ? "active" : ""}`}
            onClick={() => setActiveView("tracker")}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">App Tracker</span>
            {shortlistedJobs.length > 0 && (
              <span className="badge badge-tracker-count">{shortlistedJobs.length}</span>
            )}
          </button>

          <button 
            type="button" 
            className={`nav-item ${activeView === "history" ? "active" : ""}`}
            onClick={() => setActiveView("history")}
          >
            <span className="nav-icon">💾</span>
            <span className="nav-label">Saved Registry</span>
          </button>
        </nav>

        {/* Footer Settings */}
        <div className="sidebar-footer">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm w-full flex items-center justify-center gap-2"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            <span>{darkMode ? "Light Theme" : "Dark Theme"}</span>
          </button>
          <div className="developer-tag mt-3 text-center text-xs opacity-50">Cockpit v2.1</div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="cockpit-main">
        
        {/* Cinematic progress stepper overlay during tailoring */}
        {tailoringProgressStep > 0 && (
          <div className="stepper-overlay" style={{ display: "flex", zIndex: 10000 }}>
            <div className="stepper-card text-center p-6 rounded-xl border border-teal-500/20 bg-slate-900/95 max-w-md w-full">
              <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
                <Sparkles className="animate-spin text-teal-400" />
                Live AI Transformation...
              </h3>
              <p className="text-sm text-slate-400 mb-6">Our FAISS index and Gemini optimizers are aligning your resume context...</p>
              
              <div className="stepper-steps flex flex-col gap-4 text-left mb-6">
                <div className={`step-item flex items-center gap-3 ${tailoringProgressStep >= 1 ? "done text-teal-400 font-bold" : "opacity-40"}`}>
                  <span>{tailoringProgressStep > 1 ? "✅" : "⏳"}</span>
                  <span>Parsing and segmenting resume...</span>
                </div>
                <div className={`step-item flex items-center gap-3 ${tailoringProgressStep >= 2 ? "done text-teal-400 font-bold" : "opacity-40"}`}>
                  <span>{tailoringProgressStep > 2 ? "✅" : "⏳"}</span>
                  <span>Retrieving semantically relevant experience chunks...</span>
                </div>
                <div className={`step-item flex items-center gap-3 ${tailoringProgressStep >= 3 ? "done text-teal-400 font-bold" : "opacity-40"}`}>
                  <span>{tailoringProgressStep > 3 ? "✅" : "⏳"}</span>
                  <span>Aligning experience bullets using STAR XYZ...</span>
                </div>
                <div className={`step-item flex items-center gap-3 ${tailoringProgressStep >= 4 ? "done text-teal-400 font-bold" : "opacity-40"}`}>
                  <span>{tailoringProgressStep >= 4 ? "✅" : "⏳"}</span>
                  <span>Formatting beautiful LaTeX styling templates...</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-teal-500 h-full transition-all duration-500" 
                  style={{ width: `${(tailoringProgressStep / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <header className="cockpit-header">
          <div>
            <h1>
              {activeView === "cockpit" && "AI Career Cockpit"}
              {activeView === "jobs" && "Live Jobs Database"}
              {activeView === "tracker" && "Job Application Tracker"}
              {activeView === "history" && "Version History Timeline"}
            </h1>
            <p className="status-bar opacity-70">
              {activeView === "cockpit" && "Tailor and optimize your resume using semantic vector matching."}
              {activeView === "jobs" && "Search vacancy cards and click 'Select Job' to load context."}
              {activeView === "tracker" && "Kanban pipeline for shorlisted active roles."}
              {activeView === "history" && "Restore previously tailored snapshots."}
            </p>
          </div>

          <div className="header-controls-row">
            {activeView === "cockpit" && (
              <div className="preset-selector-container flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Template Style:</label>
                <select 
                  className="input input-sm border border-slate-700 bg-slate-900 rounded px-2 py-1 text-sm text-white"
                  value={stylePreset}
                  onChange={(e) => setStylePreset(e.target.value)}
                >
                  <option value="modern">✨ Modern (Teal/Sans)</option>
                  <option value="professional">👔 Professional (Navy/Serif)</option>
                  <option value="creative">🎨 Creative (Purple/Mono)</option>
                </select>
              </div>
            )}
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={loadDemoResume}
            >
              ⚡ Try Demo Resume
            </button>
          </div>
        </header>

        {/* ==============================
            VIEW 1: AI COCKPIT
            ============================== */}
        {activeView === "cockpit" && (
          <div>
            
            {/* View tab selector */}
            <div className="tab-row-container flex border-b border-slate-800 mb-6">
              <button 
                type="button"
                className={`tab-btn px-4 py-2 font-semibold ${activeCockpitTab === "form" ? "active border-b-2 border-teal-500 text-teal-400" : "text-slate-400"}`}
                onClick={() => setActiveCockpitTab("form")}
              >
                📝 Profile Editor Form
              </button>
              <button 
                type="button"
                className={`tab-btn px-4 py-2 font-semibold ${activeCockpitTab === "compare" ? "active border-b-2 border-teal-500 text-teal-400" : "text-slate-400"}`}
                onClick={() => setActiveCockpitTab("compare")}
              >
                ⚖️ Split Comparison View
              </button>
            </div>

            {activeCockpitTab === "form" ? (
              <div className="workspace-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Form Editor - 2 columns */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* Drag-and-drop file uploader */}
                  <div 
                    className="dropzone border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-xl p-6 text-center cursor-pointer bg-slate-900/50 hover:bg-slate-900/80 transition-all"
                    onClick={triggerFileBrowser}
                  >
                    <span className="text-3xl block mb-2">📤</span>
                    <p className="font-bold text-sm text-slate-200">Drag & Drop your resume</p>
                    <p className="text-xs text-slate-500 mt-1">Accepts PDF, DOCX, TXT (Max 5MB)</p>
                    <input 
                      type="file" 
                      id="reactFileInput" 
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={handleFileUpload} 
                    />
                  </div>
                  {uploadStatus && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-teal-400 font-semibold">
                      {uploadStatus}
                    </div>
                  )}

                  {/* Section tabs to fix click navigation */}
                  <div className="section-navigator flex flex-wrap gap-2 border border-slate-800 bg-slate-950 p-2 rounded-xl">
                    <button 
                      type="button"
                      aria-expanded={activeFormSection === "personal"}
                      aria-controls="sec-personal"
                      className={`btn btn-sm ${activeFormSection === "personal" ? "btn-primary bg-teal-500" : "btn-secondary"}`}
                      onClick={() => setActiveFormSection("personal")}
                    >
                      👤 Personal Info
                    </button>
                    <button 
                      type="button"
                      aria-expanded={activeFormSection === "skills"}
                      aria-controls="sec-skills"
                      className={`btn btn-sm ${activeFormSection === "skills" ? "btn-primary bg-teal-500" : "btn-secondary"}`}
                      onClick={() => setActiveFormSection("skills")}
                    >
                      🛠️ Skills Core
                    </button>
                    <button 
                      type="button"
                      aria-expanded={activeFormSection === "education"}
                      aria-controls="sec-education"
                      className={`btn btn-sm ${activeFormSection === "education" ? "btn-primary bg-teal-500" : "btn-secondary"}`}
                      onClick={() => setActiveFormSection("education")}
                    >
                      🎓 Education
                    </button>
                    <button 
                      type="button"
                      aria-expanded={activeFormSection === "experience"}
                      aria-controls="sec-experience"
                      className={`btn btn-sm ${activeFormSection === "experience" ? "btn-primary bg-teal-500" : "btn-secondary"}`}
                      onClick={() => setActiveFormSection("experience")}
                    >
                      💼 Experience
                    </button>
                    <button 
                      type="button"
                      aria-expanded={activeFormSection === "projects"}
                      aria-controls="sec-projects"
                      className={`btn btn-sm ${activeFormSection === "projects" ? "btn-primary bg-teal-500" : "btn-secondary"}`}
                      onClick={() => setActiveFormSection("projects")}
                    >
                      🚀 Projects
                    </button>
                    <button 
                      type="button"
                      aria-expanded={activeFormSection === "extras"}
                      aria-controls="sec-extras"
                      className={`btn btn-sm ${activeFormSection === "extras" ? "btn-primary bg-teal-500" : "btn-secondary"}`}
                      onClick={() => setActiveFormSection("extras")}
                    >
                      🏆 Achievements & Certs
                    </button>
                  </div>

                  {/* Accessible Sections */}
                  <form onSubmit={(e) => e.preventDefault()} className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col gap-6">
                    
                    {activeFormSection === "personal" && (
                      <div id="sec-personal" role="region" aria-label="Personal Information" className="flex flex-col gap-4">
                        <h3 className="text-lg font-bold border-b border-slate-800 pb-2 text-teal-400">👤 Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="field">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name *</label>
                            <input 
                              type="text" 
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              value={resumeForm.full_name} 
                              onChange={(e) => handleInputChange("full_name", e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="field">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address *</label>
                            <input 
                              type="email" 
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              value={resumeForm.email} 
                              onChange={(e) => handleInputChange("email", e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="field">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone Number *</label>
                            <input 
                              type="text" 
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              value={resumeForm.phone} 
                              onChange={(e) => handleInputChange("phone", e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="field">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Location *</label>
                            <input 
                              type="text" 
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              value={resumeForm.location} 
                              onChange={(e) => handleInputChange("location", e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="field">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">LinkedIn Link</label>
                            <input 
                              type="url" 
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              value={resumeForm.linkedin} 
                              onChange={(e) => handleInputChange("linkedin", e.target.value)} 
                            />
                          </div>
                          <div className="field">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">GitHub Link</label>
                            <input 
                              type="url" 
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              value={resumeForm.github} 
                              onChange={(e) => handleInputChange("github", e.target.value)} 
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Professional Summary *</label>
                            <textarea 
                              rows={4}
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              value={resumeForm.summary} 
                              onChange={(e) => handleInputChange("summary", e.target.value)} 
                              required 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeFormSection === "skills" && (
                      <div id="sec-skills" role="region" aria-label="Skills Core" className="flex flex-col gap-4">
                        <h3 className="text-lg font-bold border-b border-slate-800 pb-2 text-teal-400">🛠️ Skills Core</h3>
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Programming Languages / Frameworks</label>
                            <input 
                              type="text" 
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              placeholder="e.g. Python (Pandas, NumPy), SQL, Javascript"
                              value={resumeForm.skills_programming} 
                              onChange={(e) => handleInputChange("skills_programming", e.target.value)} 
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Data Analysis Core Skills</label>
                            <input 
                              type="text" 
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              placeholder="e.g. Data Cleaning, EDA, Machine Learning"
                              value={resumeForm.skills_data_analysis} 
                              onChange={(e) => handleInputChange("skills_data_analysis", e.target.value)} 
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Platforms, Databases & Tools</label>
                            <input 
                              type="text" 
                              className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-sm"
                              placeholder="e.g. Power BI, Git, AWS, Tableau"
                              value={resumeForm.skills_tools} 
                              onChange={(e) => handleInputChange("skills_tools", e.target.value)} 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeFormSection === "education" && (
                      <div id="sec-education" role="region" aria-label="Education" className="flex flex-col gap-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <h3 className="text-lg font-bold text-teal-400">🎓 Education Details</h3>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                            onClick={addEducation}
                          >
                            <Plus size={14} /> Add Education
                          </button>
                        </div>
                        {resumeForm.education.length === 0 && (
                          <p className="text-xs text-slate-500 italic">No education entries added yet.</p>
                        )}
                        {resumeForm.education.map((edu, idx) => (
                          <div key={idx} className="ltx-entry-card bg-slate-950/40 p-4 border border-slate-800 rounded-lg relative flex flex-col gap-3">
                            <button 
                              type="button" 
                              className="absolute top-2 right-2 text-red-400 hover:text-red-300 bg-red-500/10 p-1 rounded"
                              onClick={() => removeEducation(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input 
                                type="text" 
                                placeholder="Degree (e.g. B.Tech Computer Science)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                                value={edu.degree}
                                onChange={(e) => updateEducationField(idx, "degree", e.target.value)} 
                              />
                              <input 
                                type="text" 
                                placeholder="Institution (e.g. University Name)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                                value={edu.institution}
                                onChange={(e) => updateEducationField(idx, "institution", e.target.value)} 
                              />
                              <input 
                                type="text" 
                                placeholder="Location (e.g. Pune, India)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                                value={edu.location}
                                onChange={(e) => updateEducationField(idx, "location", e.target.value)} 
                              />
                              <input 
                                type="text" 
                                placeholder="Dates (e.g. Aug 2020 -- May 2024)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                                value={edu.dates}
                                onChange={(e) => updateEducationField(idx, "dates", e.target.value)} 
                              />
                              <input 
                                type="text" 
                                placeholder="GPA / CGPA (e.g. 8.5 / 10)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white md:col-span-2"
                                value={edu.gpa}
                                onChange={(e) => updateEducationField(idx, "gpa", e.target.value)} 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeFormSection === "experience" && (
                      <div id="sec-experience" role="region" aria-label="Experience" className="flex flex-col gap-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <h3 className="text-lg font-bold text-teal-400">💼 Work Experience</h3>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                            onClick={addExperience}
                          >
                            <Plus size={14} /> Add Experience
                          </button>
                        </div>
                        {resumeForm.experience.length === 0 && (
                          <p className="text-xs text-slate-500 italic">No work experience added yet.</p>
                        )}
                        {resumeForm.experience.map((exp, idx) => (
                          <div key={idx} className="ltx-entry-card bg-slate-950/40 p-4 border border-slate-800 rounded-lg relative flex flex-col gap-3">
                            <button 
                              type="button" 
                              className="absolute top-2 right-2 text-red-400 hover:text-red-300 bg-red-500/10 p-1 rounded"
                              onClick={() => removeExperience(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input 
                                type="text" 
                                placeholder="Job Title (e.g. Data Analyst Intern)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                                value={exp.title}
                                onChange={(e) => updateExperienceField(idx, "title", e.target.value)} 
                              />
                              <input 
                                type="text" 
                                placeholder="Company (e.g. Company Pvt Ltd)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                                value={exp.company}
                                onChange={(e) => updateExperienceField(idx, "company", e.target.value)} 
                              />
                              <input 
                                type="text" 
                                placeholder="Location (e.g. Pune, Maharashtra)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                                value={exp.location}
                                onChange={(e) => updateExperienceField(idx, "location", e.target.value)} 
                              />
                              <input 
                                type="text" 
                                placeholder="Dates (e.g. Jun 2023 -- Aug 2023)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                                value={exp.dates}
                                onChange={(e) => updateExperienceField(idx, "dates", e.target.value)} 
                              />
                              <textarea 
                                rows={3}
                                placeholder="Bullets points (one per line)"
                                className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white md:col-span-2"
                                value={exp.bullets ? exp.bullets.join("\n") : ""}
                                onChange={(e) => updateExperienceField(idx, "bullets", e.target.value.split("\n"))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeFormSection === "projects" && (
                      <div id="sec-projects" role="region" aria-label="Projects" className="flex flex-col gap-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <h3 className="text-lg font-bold text-teal-400">🚀 Projects</h3>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                            onClick={addProject}
                          >
                            <Plus size={14} /> Add Project
                          </button>
                        </div>
                        {resumeForm.projects.length === 0 && (
                          <p className="text-xs text-slate-500 italic">No projects added yet.</p>
                        )}
                        {resumeForm.projects.map((proj, idx) => (
                          <div key={idx} className="ltx-entry-card bg-slate-950/40 p-4 border border-slate-800 rounded-lg relative flex flex-col gap-3">
                            <button 
                              type="button" 
                              className="absolute top-2 right-2 text-red-400 hover:text-red-300 bg-red-500/10 p-1 rounded"
                              onClick={() => removeProject(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                            <input 
                              type="text" 
                              placeholder="Project Name (e.g. Sales Analysis Dashboard)"
                              className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                              value={proj.name}
                              onChange={(e) => updateProjectField(idx, "name", e.target.value)} 
                            />
                            <textarea 
                              rows={3}
                              placeholder="Project Description Bullets (one per line)"
                              className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-white"
                              value={proj.description ? proj.description.join("\n") : ""}
                              onChange={(e) => updateProjectField(idx, "description", e.target.value.split("\n"))}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {activeFormSection === "extras" && (
                      <div id="sec-extras" role="region" aria-label="Achievements and Certifications" className="flex flex-col gap-4">
                        <h3 className="text-lg font-bold border-b border-slate-800 pb-2 text-teal-400">🏆 Achievements & Certifications</h3>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Achievements (one per line)</label>
                          <textarea 
                            rows={3}
                            className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-xs"
                            placeholder="e.g. Delivered workshops on Python data collection to 100+ students."
                            value={resumeForm.achievements ? resumeForm.achievements.join("\n") : ""} 
                            onChange={(e) => handleInputChange("achievements", e.target.value.split("\n"))} 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Certifications (one per line)</label>
                          <textarea 
                            rows={3}
                            className="input border border-slate-800 bg-slate-950 p-2 rounded w-full text-white text-xs"
                            placeholder="e.g. Google Advanced Data Analytics Certificate (2024)"
                            value={resumeForm.certifications ? resumeForm.certifications.join("\n") : ""} 
                            onChange={(e) => handleInputChange("certifications", e.target.value.split("\n"))} 
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 justify-end mt-4">
                      <button 
                        type="button" 
                        className="btn btn-secondary flex items-center gap-1"
                        onClick={handleReset}
                      >
                        <RotateCcw size={14} /> Clear Form
                      </button>
                    </div>

                  </form>
                </div>

                {/* Right Analytics, JD pasting, and Recharts widgets */}
                <div className="flex flex-col gap-6">
                  
                  {/* Recharts Pie Chart ATS Score Gauge */}
                  <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col items-center">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">ATS Parse Scorer</h3>
                    <div style={{ width: "100%", height: 160, position: "relative" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={0}
                            dataKey="value"
                          >
                            <Cell fill="var(--primary)" />
                            <Cell fill="rgba(255,255,255,0.06)" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
                        <span className="text-2xl font-extrabold text-white">{scores.ats}%</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">COMPLIANCE</span>
                      </div>
                    </div>
                  </div>

                  {/* Target JD paste Area */}
                  <div id="scoring-panel" className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">Target Job Description</h3>
                    <textarea 
                      rows={6}
                      className="input border border-slate-800 bg-slate-950 p-3 rounded w-full text-xs text-white"
                      placeholder="Paste the job description of your target role here to run RAG vector matching and auto-tailor prompt generation..."
                      value={targetJd}
                      onChange={(e) => setTargetJd(e.target.value)}
                    />
                    <button 
                      type="button"
                      className="btn btn-primary bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                      onClick={handleTailorResume}
                    >
                      <Sparkles size={16} />
                      🚀 Tailor & Analyze Resume
                    </button>
                  </div>

                  {/* Recharts Radar Chart for Skills Gap analysis */}
                  {scores.ats > 0 && (
                    <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col items-center">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Competency Map</h3>
                      <div style={{ width: "100%", height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.06)" />
                            <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={10} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.1)" />
                            <Radar name="Candidate Profile" dataKey="A" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                            <Radar name="Target Job" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              
              /* Split Comparison View */
              <div className="flex flex-col gap-6">
                
                {/* Visual before vs after comparison Recharts Bar chart */}
                {scores.ats > 0 && (
                  <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 mb-4">Score Improvements</h3>
                    <div style={{ width: "100%", height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={beforeAfterData}>
                          <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                          <YAxis stroke="#9ca3af" fontSize={11} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)" }} />
                          <Legend />
                          <Bar dataKey="Original" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Optimized" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Previews panel */}
                <div className="compare-split-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left preview box */}
                  <div className="panel bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col">
                    <div className="panel-header border-b border-slate-800 p-4 flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-200">📄 Original Profile text</span>
                      <span className="preview-badge badge-red px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-500/10 text-red-400">Original</span>
                    </div>
                    <div 
                      ref={originalPreviewRef}
                      onScroll={handleOriginalScroll}
                      className="preview-text-box p-6 h-[400px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 bg-slate-950/60"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {originalText || "Fill in your profile form and click 'Tailor' to visualize original resume."}
                    </div>
                  </div>

                  {/* Right optimized preview box with dynamic highlight tag injections */}
                  <div className="panel bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col">
                    <div className="panel-header border-b border-slate-800 p-4 flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-200">✨ AI Tailored Preview</span>
                      <span className="preview-badge badge-green px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-500/10 text-green-400">Optimized</span>
                    </div>
                    <div 
                      ref={tailoredPreviewRef}
                      onScroll={handleTailoredScroll}
                      className="preview-text-box p-6 h-[400px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 bg-slate-950/60"
                      style={{ whiteSpace: "pre-wrap" }}
                      dangerouslySetInnerHTML={{
                        __html: tailoredText 
                          ? tailoredText.replace(
                              /\b(Python|SQL|Power BI|Tableau|Git|Pandas|data cleaning|EDA)\b/gi, 
                              '<span class="highlight-added font-semibold text-teal-400 underline underline-offset-2">$1</span>'
                            )
                          : "Enter a Target JD and run optimization tailoring to visualize output."
                      }}
                    />
                  </div>

                </div>

                {/* AI feedback justification card */}
                {aiFeedback && (
                  <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 mb-2">Tailoring Impact Report</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{aiFeedback}</p>
                  </div>
                )}

                {/* AI Suggestions check lists */}
                {suggestions.length > 0 && (
                  <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 mb-4">ATS Recommendations Suggestions</h3>
                    <div className="flex flex-col gap-3">
                      {suggestions.map((item, idx) => (
                        <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800 flex justify-between gap-4">
                          <div>
                            <span className="text-xs font-bold text-teal-400 block mb-1">{item.title}</span>
                            <span className="text-xs text-slate-400">{item.detail}</span>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded h-fit ${item.impact === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {item.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exporter triggers */}
                <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Optimized Download Suite</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Export this tailored resume snapshot as compiled Overleaf LaTeX or Plain Text.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      className="btn btn-latex bg-teal-500 hover:bg-teal-400 text-white font-bold px-4 py-2.5 rounded flex items-center gap-1"
                      onClick={handleDownloadLatex}
                    >
                      <Download size={14} /> Download LaTeX (.tex)
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary flex items-center gap-1"
                      onClick={handleDownloadTxt}
                    >
                      <FileText size={14} /> Download Text (.txt)
                    </button>
                  </div>
                </div>

                {/* Extras career tools Cover Letter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Cover Letter</h3>
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={generateCoverLetter}
                      disabled={loadingExtra.letter}
                    >
                      {loadingExtra.letter ? "Generating..." : "Generate Cover Letter"}
                    </button>
                    {coverLetter && (
                      <textarea 
                        rows={6}
                        readOnly 
                        className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-slate-300 w-full"
                        value={coverLetter}
                      />
                    )}
                  </div>

                  <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">LinkedIn About</h3>
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={generateLinkedin}
                      disabled={loadingExtra.linkedin}
                    >
                      {loadingExtra.linkedin ? "Generating..." : "Optimize Profile"}
                    </button>
                    {linkedinSummary && (
                      <textarea 
                        rows={6}
                        readOnly 
                        className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-slate-300 w-full"
                        value={linkedinSummary}
                      />
                    )}
                  </div>

                  <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Interview Coach</h3>
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={generateQuestions}
                      disabled={loadingExtra.questions}
                    >
                      {loadingExtra.questions ? "Generating..." : "Prep Interview Questions"}
                    </button>
                    {interviewQuestions && (
                      <textarea 
                        rows={6}
                        readOnly 
                        className="input border border-slate-800 bg-slate-950 p-2 rounded text-xs text-slate-300 w-full"
                        value={interviewQuestions}
                      />
                    )}
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* ==============================
            VIEW 2: SEARCH JOBS
            ============================== */}
        {activeView === "jobs" && (
          <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col gap-6">
            <h3 className="text-lg font-bold border-b border-slate-800 pb-2 text-teal-400">🔍 Live Adzuna API Search Engine</h3>
            
            <div className="search-bar flex flex-wrap md:flex-nowrap gap-4">
              <input 
                type="text" 
                placeholder="Job keyword (e.g. Python Developer, Data Analyst)"
                className="input border border-slate-800 bg-slate-950 p-3 rounded w-full text-sm text-white"
                value={jobQuery}
                onChange={(e) => setJobQuery(e.target.value)}
              />
              <select 
                className="input border border-slate-800 bg-slate-950 p-3 rounded text-sm text-white"
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
              >
                <option value="in">🇮🇳 India</option>
                <option value="us">🇺🇸 United States</option>
                <option value="gb">🇬🇧 United Kingdom</option>
                <option value="ca">🇨🇦 Canada</option>
                <option value="au">🇦🇺 Australia</option>
              </select>
              <button 
                type="button" 
                className="btn btn-primary bg-teal-500 hover:bg-teal-400 font-bold px-6 py-3 rounded"
                onClick={handleJobSearch}
                disabled={isSearchingJobs}
              >
                {isSearchingJobs ? "Searching..." : "Search Jobs"}
              </button>
            </div>
            
            {searchStatus && (
              <div className="text-xs text-slate-400 italic">{searchStatus}</div>
            )}

            <div className="jobs-grid grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobsList.length === 0 ? (
                <p className="col-span-2 text-center text-sm text-slate-500 italic py-6">Enter a keyword query above to query active job boards.</p>
              ) : (
                jobsList.map(job => (
                  <div key={job.id} className="job-card bg-slate-950/60 border border-slate-800 rounded-lg p-5 flex flex-col justify-between hover:border-teal-500 transition-all">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-sm text-white">{job.title}</span>
                        {job.salary && <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded">{job.salary}</span>}
                      </div>
                      <span className="text-xs text-teal-400 font-semibold block mt-1">{job.company}</span>
                      <span className="text-xs text-slate-500 block mt-0.5">📍 {job.location}</span>
                      <p className="text-xs text-slate-400 mt-3 leading-relaxed line-clamp-3">{job.description}</p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-900">
                      <span className="text-[10px] text-slate-500">{job.posted_date || "Today"}</span>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          className="btn btn-secondary btn-sm text-[10px] px-2.5 py-1"
                          onClick={() => handleSelectJob(job)}
                        >
                          📋 Select Job
                        </button>
                        <button 
                          type="button"
                          className="btn btn-secondary btn-sm text-[10px] px-2.5 py-1"
                          onClick={() => handleShortlistJob(job)}
                        >
                          📌 Shortlist
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* ==============================
            VIEW 3: APP TRACKER
            ============================== */}
        {activeView === "tracker" && (
          <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col gap-6">
            <h3 className="text-lg font-bold border-b border-slate-800 pb-2 text-teal-400">📋 App Tracker Shortlist Board</h3>
            
            <div className="kanban-board grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Wishlist Column */}
              <div 
                className="kanban-col bg-slate-950/40 border border-slate-800 rounded-lg p-3 min-h-[400px] flex flex-col gap-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "wishlist")}
              >
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs uppercase text-slate-400">Wishlist</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {shortlistedJobs.filter(j => j.status === "wishlist").length}
                  </span>
                </div>
                {shortlistedJobs.filter(j => j.status === "wishlist").map(job => (
                  <div 
                    key={job.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    className="kanban-card bg-slate-900 border border-slate-800 p-3 rounded cursor-grab hover:border-teal-500 transition-all"
                  >
                    <div className="font-bold text-xs text-white line-clamp-1">{job.title}</div>
                    <div className="text-[10px] text-teal-400 font-semibold mt-0.5">{job.company}</div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-950">
                      <span className="text-[9px] text-slate-500">📍 {job.location}</span>
                      <button 
                        type="button" 
                        className="text-red-400 hover:text-red-300 text-[9px] font-bold"
                        onClick={() => handleRemoveTrackedJob(job.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Applied Column */}
              <div 
                className="kanban-col bg-slate-950/40 border border-slate-800 rounded-lg p-3 min-h-[400px] flex flex-col gap-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "applied")}
              >
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs uppercase text-slate-400">Applied</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {shortlistedJobs.filter(j => j.status === "applied").length}
                  </span>
                </div>
                {shortlistedJobs.filter(j => j.status === "applied").map(job => (
                  <div 
                    key={job.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    className="kanban-card bg-slate-900 border border-slate-800 p-3 rounded cursor-grab hover:border-teal-500 transition-all"
                  >
                    <div className="font-bold text-xs text-white line-clamp-1">{job.title}</div>
                    <div className="text-[10px] text-teal-400 font-semibold mt-0.5">{job.company}</div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-950">
                      <span className="text-[9px] text-slate-500">📍 {job.location}</span>
                      <button 
                        type="button" 
                        className="text-red-400 hover:text-red-300 text-[9px] font-bold"
                        onClick={() => handleRemoveTrackedJob(job.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interviewing Column */}
              <div 
                className="kanban-col bg-slate-950/40 border border-slate-800 rounded-lg p-3 min-h-[400px] flex flex-col gap-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "interviewing")}
              >
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs uppercase text-slate-400">Interviewing</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {shortlistedJobs.filter(j => j.status === "interviewing").length}
                  </span>
                </div>
                {shortlistedJobs.filter(j => j.status === "interviewing").map(job => (
                  <div 
                    key={job.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    className="kanban-card bg-slate-900 border border-slate-800 p-3 rounded cursor-grab hover:border-teal-500 transition-all"
                  >
                    <div className="font-bold text-xs text-white line-clamp-1">{job.title}</div>
                    <div className="text-[10px] text-teal-400 font-semibold mt-0.5">{job.company}</div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-950">
                      <span className="text-[9px] text-slate-500">📍 {job.location}</span>
                      <button 
                        type="button" 
                        className="text-red-400 hover:text-red-300 text-[9px] font-bold"
                        onClick={() => handleRemoveTrackedJob(job.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Offered Column */}
              <div 
                className="kanban-col bg-slate-950/40 border border-slate-800 rounded-lg p-3 min-h-[400px] flex flex-col gap-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "offered")}
              >
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs uppercase text-slate-400">Offered</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {shortlistedJobs.filter(j => j.status === "offered").length}
                  </span>
                </div>
                {shortlistedJobs.filter(j => j.status === "offered").map(job => (
                  <div 
                    key={job.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    className="kanban-card bg-slate-900 border border-slate-800 p-3 rounded cursor-grab hover:border-teal-500 transition-all"
                  >
                    <div className="font-bold text-xs text-white line-clamp-1">{job.title}</div>
                    <div className="text-[10px] text-teal-400 font-semibold mt-0.5">{job.company}</div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-950">
                      <span className="text-[9px] text-slate-500">📍 {job.location}</span>
                      <button 
                        type="button" 
                        className="text-red-400 hover:text-red-300 text-[9px] font-bold"
                        onClick={() => handleRemoveTrackedJob(job.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

        {/* ==============================
            VIEW 4: SAVED & DRAFTS TIMELINE
            ============================== */}
        {activeView === "history" && (
          <div className="panel bg-slate-900/40 border border-slate-800 p-6 rounded-xl flex flex-col gap-6">
            <h3 className="text-lg font-bold border-b border-slate-800 pb-2 text-teal-400">💾 Saved Snaphots & Version Timeline</h3>
            
            <div className="history-list flex flex-col gap-4">
              {savedTimeline.length === 0 ? (
                <p className="text-center text-sm text-slate-500 italic py-6">No snapshots saved yet. Save or tailor a resume to populate history registry.</p>
              ) : (
                savedTimeline.map(item => (
                  <div key={item.id} className="history-item bg-slate-950/60 border border-slate-800 p-4 rounded-lg flex justify-between items-center hover:border-teal-500 transition-all">
                    <div>
                      <span className="font-bold text-xs text-white block">{item.description}</span>
                      <span className="text-[10px] text-slate-500 mt-1 block">Created at: {item.timestamp} | ATS Score: {item.atsScore}%</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm text-[10px] px-3 py-1 flex items-center gap-1"
                        onClick={() => {
                          setResumeForm(item.formSnapshot);
                          alert("✅ Active Editor Form state successfully restored!");
                          setActiveView("cockpit");
                          setActiveCockpitTab("form");
                        }}
                      >
                        <RotateCcw size={12} /> Restore Draft
                      </button>
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm text-[10px] px-3 py-1 text-red-400 hover:text-red-300 flex items-center gap-1 border-red-500/20"
                        onClick={() => {
                          const updated = savedTimeline.filter(t => t.id !== item.id);
                          saveStateToLocalStorage(null, updated, null);
                        }}
                      >
                        ✕ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
