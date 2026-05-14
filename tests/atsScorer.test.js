import { describe, it, expect } from "vitest";
import { computeAtsScore } from "../src/atsScorer.js";
import { identifySections } from "../src/parser.js";

const resumeRaw = `Jane Doe
jane@test.com
Skills
Python JavaScript AWS
Experience
Software Engineer
Built REST APIs with Python and AWS. Improved latency by 40%.
Education
BS Computer Science`;

const jd = `We need a senior software engineer. Required: Python, AWS, REST APIs, Agile team.
Preferred: Kubernetes and JavaScript. 5+ years building distributed systems.`;

describe("computeAtsScore", () => {
  it("returns scores in 0-100 range", () => {
    const structured = identifySections(resumeRaw);
    const s = computeAtsScore(resumeRaw, structured, jd);
    expect(s.overall).toBeGreaterThanOrEqual(0);
    expect(s.overall).toBeLessThanOrEqual(100);
    expect(s.breakdown.keyword).toBeGreaterThanOrEqual(0);
    expect(s.breakdown.keyword).toBeLessThanOrEqual(100);
  });
});
