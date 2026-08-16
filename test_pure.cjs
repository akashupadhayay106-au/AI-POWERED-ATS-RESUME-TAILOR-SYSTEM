const { JSDOM } = require("jsdom");

const html = `
<div id="progressOverlay" hidden></div>
<div id="progressPercent">0%</div>
<div id="step-1"></div>
<div id="step-2"></div>
<div id="step-3"></div>
<div id="step-4"></div>
<div id="step-5"></div>
`;

const dom = new JSDOM(html);
const document = dom.window.document;
const $ = (id) => document.getElementById(id);

function onStepChange(step) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-${i}`);
    if (!el) continue;
    if (i < step) {
      el.classList.add("completed");
      el.classList.remove("active");
    } else if (i === step) {
      el.classList.add("active");
      el.classList.remove("completed");
    } else {
      el.classList.remove("completed", "active");
    }
  }
}

function runTailorStepper(durationMs, onStepChange, onComplete) {
  console.log("Started");
  const overlay = $("progressOverlay");
  const percentEl = $("progressPercent");
  overlay.hidden = false;
  
  let percent = 0;
  const interval = durationMs / 100;
  
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.remove("active", "completed");
  }

  const timer = setInterval(() => {
    percent += 1;
    console.log("Tick:", percent);
    if (percentEl) percentEl.textContent = `${percent}%`;
    
    try {
      const step = Math.min(5, Math.floor(percent / 20) + 1);
      onStepChange(step);
    } catch (e) {
      console.error("Error:", e);
    }
    
    if (percent >= 100) {
      clearInterval(timer);
      setTimeout(() => {
        overlay.hidden = true;
        onComplete();
      }, 400);
    }
  }, interval);
}

runTailorStepper(2000, onStepChange, () => {
    console.log("Done!");
    console.log("Final text:", $("progressPercent").textContent);
});

setTimeout(() => {
    console.log("Exiting test.");
}, 3000);
