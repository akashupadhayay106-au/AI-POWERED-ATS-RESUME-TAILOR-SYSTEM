import { analyzeJobDescription, keywordMatchStats } from "./jdAnalyzer.js";
import { cosineSimilarityMaps, resumeHasKeywordFuzzy, tokenize } from "./textUtils.js";
import { buildTfidf } from "./tfidf.js";

const WEIGHTS = {
  keyword: 0.35,
  format: 0.15,
  sections: 0.15,
  experience: 0.2,
  skills: 0.15,
};

/**
 * @param {string} resumeRaw
 * @param {Record<string, string>} structured
 * @param {string} jdText
 */
export function computeAtsScore(resumeRaw, structured, jdText) {
  const { jd, matched, missing, ratio } = keywordMatchStats(jdText, resumeRaw);
  const keywordScore = clamp01(ratio) * 100;

  const formatScore = scoreFormatHeuristic(resumeRaw);

  const sectionsScore = scoreSections(structured);

  const expText =
    structured.experience && structured.experience.trim().length > 40
      ? structured.experience
      : resumeRaw;
  const corpus = [jd.cleaned, expText || resumeRaw];
  const { idf, docVecs } = buildTfidf(corpus);
  const jdVec = docVecs[0];
  const expVec = docVecs[1] && [...docVecs[1].keys()].length ? docVecs[1] : docVecs[0];
  const expSim = cosineSimilarityMaps(jdVec, expVec) * 100;

  const skillsText = structured.skills || "";
  const skillTokens = new Set(tokenize(skillsText + " " + resumeRaw));
  const joinedSkills = [...skillTokens].join(" ");
  const jdSkillHits = jd.keywords.filter((k) => resumeHasKeywordFuzzy(joinedSkills, k)).length;
  const skillsScore = jd.keywords.length ? clamp01(jdSkillHits / Math.min(jd.keywords.length, 20)) * 100 : 50;

  const overall =
    keywordScore * WEIGHTS.keyword +
    formatScore * WEIGHTS.format +
    sectionsScore * WEIGHTS.sections +
    expSim * WEIGHTS.experience +
    skillsScore * WEIGHTS.skills;

  const breakdown = {
    keyword: round(keywordScore),
    format: round(formatScore),
    sections: round(sectionsScore),
    experience: round(expSim),
    skills: round(skillsScore),
  };

  return {
    overall: round(overall),
    breakdown,
    interpret: interpretScore(overall),
    matchedKeywords: matched,
    missingKeywords: missing,
    jd,
  };
}

/**
 * @param {string} raw
 */
function scoreFormatHeuristic(raw) {
  let s = 100;
  const t = raw;
  if (t.includes("\t\t")) s -= 5;
  if (/\p{Extended_Pictographic}/u.test(t)) s -= 8;
  if (/[█▓▒░]/.test(t)) s -= 10;
  if ((t.match(/\|/g) || []).length > 30) s -= 15;
  const lines = t.split(/\n/).length;
  if (lines < 12) s -= 10;
  if (lines > 200) s -= 5;
  return clamp(s, 0, 100);
}

/**
 * @param {Record<string, string>} structured
 */
function scoreSections(structured) {
  let pts = 0;
  const checks = [
    ["contact", 15],
    ["experience", 30],
    ["education", 15],
    ["skills", 25],
    ["summary", 15],
  ];
  for (const [key, w] of checks) {
    const block = structured[key];
    if (block && block.length > 20) pts += w;
    else if (block && block.length > 0) pts += w * 0.4;
  }
  return clamp(pts, 0, 100);
}

/**
 * @param {number} v
 */
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * @param {number} v
 * @param {number} a
 * @param {number} b
 */
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/**
 * @param {number} x
 */
function round(x) {
  return Math.round(x * 10) / 10;
}

/**
 * @param {number} score
 */
function interpretScore(score) {
  if (score >= 85) return "Excellent ATS match";
  if (score >= 70) return "Good match — minor improvements";
  if (score >= 55) return "Fair match — significant improvements";
  return "Poor match — major overhaul recommended";
}
