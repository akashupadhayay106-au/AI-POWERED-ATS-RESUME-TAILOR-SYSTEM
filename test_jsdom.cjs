const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const workspacePath = "C:\\Users\\Dell\\OneDrive\\Desktop\\my projects\\AI-POWERED ATS RESUME TAILOR SYSTEM";
const html = fs.readFileSync(path.join(workspacePath, "index.html"), "utf8");

const dom = new JSDOM(html, { 
  runScripts: "outside-only",
  url: "http://localhost:5173" 
});
const { window } = dom;

window.console.log = (...args) => console.log("DOM:", ...args);
window.console.error = (...args) => console.error("DOM ERROR:", ...args);

window.resumeState = { raw: "test", meta: { fileName: "test.pdf" } };
window.triggerOrbReaction = (type) => { console.log("triggerOrbReaction:", type); };
window.fetch = async (url, options) => {
    console.log("Mock fetch called:", url);
    return {
        ok: true,
        json: async () => ({ overall: 85, tailored: "Done" })
    };
};

let scriptContent = fs.readFileSync(path.join(workspacePath, "src/main.js"), "utf8");
// Remove all imports
scriptContent = scriptContent.replace(/import\s+.*?;/gs, "");
scriptContent = scriptContent.replace(/import\s+.*?[\r\n]/gs, "");
scriptContent = scriptContent.replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?/g, "");

window.eval(scriptContent);

setTimeout(() => {
    console.log("Clicking btnTailor...");
    const btn = window.document.getElementById("btnTailor");
    if (btn) btn.click();
}, 500);

let checks = 0;
const interval = setInterval(() => {
    const txt = window.document.getElementById("progressPercent").textContent;
    console.log("Progress percent at check", checks, ":", txt);
    checks++;
    if (checks > 10) {
        clearInterval(interval);
        console.log("Test finished.");
    }
}, 500);
