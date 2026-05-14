/** @type {Set<string>} */
const STOP = new Set(
  `a an the and or but if in on at to for of as is was are were be been being it this that these those with by from into through during before after above below between under again further then once here there when where why how all each both few more most other some such no nor not only own same so than too very can will just should now about over out up down off also any your our their my her his its we you he she they what which who whom`.split(
    /\s+/
  )
);

const SYNONYMS = [
  ["javascript", "js", "ecmascript"],
  ["typescript", "ts"],
  ["kubernetes", "k8s"],
  ["amazon web services", "aws"],
  ["machine learning", "ml"],
  ["user experience", "ux"],
  ["user interface", "ui"],
  ["sql", "mysql", "postgresql", "postgres"],
  ["ci cd", "cicd", "continuous integration"],
];

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\p{L}\p{N}\s+#./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  const n = normalizeText(text);
  return n.split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function tokensMatch(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  if (na.length < 2 || nb.length < 2) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const la = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen <= 5) return la <= 1;
  if (maxLen <= 8) return la <= 2;
  return false;
}

/**
 * @param {string} word
 * @returns {Set<string>}
 */
export function synonymCluster(word) {
  const w = normalizeText(word).replace(/\s+/g, " ");
  const set = new Set([w]);
  for (const group of SYNONYMS) {
    if (group.some((g) => w === g || w.includes(g) || g.includes(w))) {
      group.forEach((g) => set.add(g));
    }
  }
  return set;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * @param {Map<string, number>} a
 * @param {Map<string, number>} b
 * @returns {number}
 */
export function cosineSimilarityMaps(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  for (const [k, va] of a) {
    if (b.has(k)) dot += va * b.get(k);
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * @param {string} resumeTokensJoined
 * @param {string} keyword
 * @returns {boolean}
 */
export function resumeHasKeywordFuzzy(resumeTokensJoined, keyword) {
  const parts = normalizeText(keyword).split(/\s+/).filter((p) => p.length > 1 && !STOP.has(p));
  if (!parts.length) return false;
  const rt = resumeTokensJoined;
  const rtokens = rt.split(/\s+/);
  let hits = 0;
  for (const p of parts) {
    const cluster = synonymCluster(p);
    const found = rtokens.some((t) => [...cluster].some((c) => tokensMatch(t, c)));
    if (found) hits++;
  }
  const required = parts.length <= 3 ? 1 : Math.ceil(parts.length * 0.6);
  return hits >= required;
}

/**
 * @param {string} text
 */
function countSyllables(text) {
  let word = text.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const syl = word.match(/[aeiouy]{1,2}/g);
  return syl ? syl.length : 1;
}

/**
 * @param {string} text
 * @returns {{ score: number, avgSentenceLength: number, interpret: string }}
 */
export function computeReadability(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0 || sentences.length === 0) {
    return { score: 0, avgSentenceLength: 0, interpret: "N/A" };
  }

  let totalSyllables = 0;
  for (const w of words) {
    totalSyllables += countSyllables(w);
  }

  const asl = words.length / sentences.length;
  const asw = totalSyllables / words.length;

  // Flesch Reading Ease Formula
  const score = 206.835 - 1.015 * asl - 84.6 * asw;

  let interpret = "";
  if (score > 90) interpret = "Very easy (5th grade)";
  else if (score > 80) interpret = "Easy (6th grade)";
  else if (score > 70) interpret = "Fairly easy (7th grade)";
  else if (score > 60) interpret = "Standard (8th-9th grade)";
  else if (score > 50) interpret = "Fairly difficult (10th-12th grade)";
  else if (score > 30) interpret = "Difficult (College)";
  else interpret = "Very difficult (Professional/Academic)";

  return { score: Math.round(score), avgSentenceLength: Math.round(asl), interpret };
}
