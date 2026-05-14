import { describe, it, expect } from "vitest";
import { keywordMatchStats } from "../src/jdAnalyzer.js";

const resumeRaw = `Full stack developer with experience in AWS, JS, and modern CI CD workflows.`;
const jd = `We are hiring an engineer with Amazon Web Services experience, strong JavaScript skills, and CI/CD automation.`;

describe("keywordMatchStats", () => {
  it("matches fuzzy and synonym keywords from the JD", () => {
    const result = keywordMatchStats(jd, resumeRaw);
    expect(result.matched).toContain("javascript");
    expect(result.ratio).toBeGreaterThan(0);
    expect(result.missing.length).toBeLessThan(result.jd.keywords.length);
  });
});
