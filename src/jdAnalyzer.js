import { normalizeText, tokenize, resumeHasKeywordFuzzy } from "./textUtils.js";

export function analyzeJobDescription(jdText) {
  const cleaned = normalizeText(jdText);
  const keywords = extractKeywords(jdText, 30);
  return { cleaned, keywords };
}

export function extractKeywords(text, topN = 30) {
  const tokens = tokenize(text);
  const frequency = tokens.reduce((map, token) => {
    map[token] = (map[token] || 0) + 1;
    return map;
  }, {});

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([token]) => token);
}

export function keywordMatchStats(jdText, resumeText) {
  const jd = analyzeJobDescription(jdText);
  const resumeTokensJoined = tokenize(resumeText).join(" ");
  const matched = jd.keywords.filter((keyword) => resumeHasKeywordFuzzy(resumeTokensJoined, keyword));
  const missing = jd.keywords.filter((keyword) => !matched.includes(keyword));
  return {
    jd,
    matched,
    missing,
    ratio: jd.keywords.length ? matched.length / jd.keywords.length : 0,
  };
}
