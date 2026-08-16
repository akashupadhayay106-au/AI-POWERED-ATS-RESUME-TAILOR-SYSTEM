import { basicKeywordExtraction } from "./src/fallbackScorer.js";

const jd = "We need a developer who knows react, node, python, html, and css. Experience with javascript is required.";
const resume = "I am a web developer with 3 years of experience. I know html, css, javascript, and python.";

console.log("--- PHASE 3 FALLBACK RAW OUTPUT ---");
basicKeywordExtraction(jd, resume);
