import { describe, it, expect } from "vitest";
import { normalizeText, tokenize, tokensMatch, resumeHasKeywordFuzzy } from "../src/textUtils.js";

describe("textUtils", () => {
  it("normalizeText lowercases and strips noise", () => {
    const n = normalizeText("  Hello,  WORLD!!  ");
    expect(n).toMatch(/hello/);
    expect(n).toMatch(/world/);
  });

  it("tokenize removes stopwords", () => {
    const t = tokenize("the quick brown fox");
    expect(t).toContain("quick");
    expect(t).not.toContain("the");
  });

  it("tokensMatch handles substring and fuzzy short tokens", () => {
    expect(tokensMatch("javascript", "javascript")).toBe(true);
    expect(tokensMatch("react", "reactive")).toBe(true);
    expect(tokensMatch("api", "apis")).toBe(true);
  });

  it("resumeHasKeywordFuzzy matches synonyms and related terms", () => {
    const resume = "Experienced AWS cloud engineer with JavaScript and CI/CD pipeline experience.";
    expect(resumeHasKeywordFuzzy(resume, "amazon web services")).toBe(true);
    expect(resumeHasKeywordFuzzy(resume, "k8s")).toBe(false);
    expect(resumeHasKeywordFuzzy(resume, "ci cd")).toBe(true);
  });
});
