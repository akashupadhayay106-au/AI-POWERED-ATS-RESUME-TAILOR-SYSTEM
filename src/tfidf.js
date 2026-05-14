import { normalizeText, tokenize } from "./textUtils.js";

export function buildTfidf(corpus) {
  const docs = corpus.map((doc) => tokenize(normalizeText(doc)));
  const df = new Map();

  docs.forEach((tokens) => {
    const unique = new Set(tokens);
    for (const token of unique) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  });

  const idf = new Map();
  const totalDocs = docs.length;
  for (const [token, count] of df.entries()) {
    idf.set(token, Math.log((totalDocs + 1) / (count + 1)) + 1);
  }

  const docVecs = docs.map((tokens) => {
    const vec = new Map();
    for (const token of tokens) {
      vec.set(token, (vec.get(token) || 0) + 1);
    }
    for (const [token, freq] of vec.entries()) {
      vec.set(token, freq * (idf.get(token) || 1));
    }
    return vec;
  });

  return { idf: Object.fromEntries(idf), docVecs };
}
