import { normalizeText } from "./textUtils.js";

const MAX_BYTES = 5 * 1024 * 1024;

const SECTION_PATTERNS = [
  { key: "summary", labels: /\b(summary|objective|profile|about me)\b/i },
  { key: "experience", labels: /\b(experience|employment|work history|professional experience)\b/i },
  { key: "education", labels: /\b(education|academic)\b/i },
  { key: "skills", labels: /\b(skills|technical skills|competencies)\b/i },
  { key: "certifications", labels: /\b(certifications?|licenses)\b/i },
  { key: "projects", labels: /\b(projects?|portfolio)\b/i },
];

/**
 * @param {File} file
 */
export function validateFile(file) {
  if (file.size > MAX_BYTES) {
    throw new Error("File exceeds 5 MB limit.");
  }
  const name = file.name.toLowerCase();
  const ok =
    name.endsWith(".pdf") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt") ||
    file.type === "application/pdf" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "text/plain";
  if (!ok) throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
}

/**
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>}
 */
async function extractPdfText(buffer) {
  const pdfjsLib = await import(
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs"
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";

  const task = pdfjsLib.getDocument({ data: buffer }).promise;
  const pdf = await task;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((/** @type {{ str?: string }} */ it) => ("str" in it ? it.str : "")).join(" ");
    full += strings + "\n";
  }
  return full;
}

/**
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>}
 */
async function extractDocxText(buffer) {
  let mammoth = globalThis.mammoth;
  if (!mammoth) {
    const mod = await import("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.19/mammoth.browser.min.js");
    mammoth = mod.default || globalThis.mammoth || mod.mammoth || mod;
  }
  if (!mammoth || !mammoth.extractRawText) {
    throw new Error("DOCX parser (Mammoth) failed to load.");
  }
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || "";
}

/**
 * @param {File} file
 * @returns {Promise<{ raw: string, structured: Record<string, string>, meta: { fileName: string } }>}
 */
export async function parseResumeFile(file) {
  validateFile(file);
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  let raw = "";
  if (name.endsWith(".txt") || file.type === "text/plain") {
    raw = new TextDecoder("utf-8").decode(buffer);
  } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
    raw = await extractPdfText(buffer);
  } else {
    raw = await extractDocxText(buffer);
  }
  const structured = identifySections(raw);
  return { raw, structured, meta: { fileName: file.name } };
}

/**
 * @param {string} raw
 * @returns {Record<string, string>}
 */
export function identifySections(raw) {
  const text = raw.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  /** @type {Record<string, string[]>} */
  const buckets = {
    contact: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    other: [],
  };

  let current = "other";
  const emailRe = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  const phoneRe = /(\+?\d[\d\s().-]{8,}\d)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let matched = false;
    for (const { key, labels } of SECTION_PATTERNS) {
      if (labels.test(trimmed) && trimmed.length < 80) {
        current = key;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (emailRe.test(trimmed) || phoneRe.test(trimmed) || /\b(linkedin\.com|github\.com)\b/i.test(trimmed)) {
      buckets.contact.push(trimmed);
      continue;
    }

    if (current === "other" && buckets.contact.length < 6 && trimmed.length < 120) {
      buckets.contact.push(trimmed);
      continue;
    }

    buckets[current].push(trimmed);
  }

  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, arr] of Object.entries(buckets)) {
    out[k] = arr.join("\n").trim();
  }
  out.full = normalizeText(text).replace(/\s+/g, " ");
  return out;
}
