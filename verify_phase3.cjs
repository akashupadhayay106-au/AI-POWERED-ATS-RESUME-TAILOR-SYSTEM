const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let phase3Output = null;

  page.on('console', msg => {
    const text = msg.text();
    console.log(`BROWSER CONSOLE: ${text}`);
    if (text.includes('"score":') && text.includes('"missing":')) {
      phase3Output = text;
    }
  });
  
  await page.goto('http://127.0.0.1:5173');
  await page.waitForLoadState('load');

  fs.writeFileSync('test_valid.txt', 'This is a valid test resume.\\nExperience: Software Engineer\\nSkills: JavaScript, Python, React, HTML, CSS');
  const fileInput = await page.$('input#fileInput');
  await fileInput.setInputFiles('test_valid.txt');
  await page.waitForFunction(() => {
    const el = document.querySelector('#uploadStatus');
    return el && el.textContent.includes('Loaded');
  }, { timeout: 10000 });
  
  const jdInput = await page.$('#jdInput');
  const btnAnalyze = await page.$('#btnAnalyze');

  console.log('\\n--- TEST 1: Trigger Phase 3 Fallback ---');
  const realJd = 'We are looking for a highly skilled Senior React Engineer with 5+ years of experience in JavaScript, React, Node.js, AWS, and TypeScript. Must have strong understanding of web performance.';
  await jdInput.fill(realJd);
  await jdInput.dispatchEvent('input');
  
  // By clicking analyze, the backend will fail (since there's no backend running),
  // which will trigger the catch block and output the Phase 3 JSON to the console.
  await btnAnalyze.click({ force: true });
  await page.waitForTimeout(2000);
  
  if (phase3Output) {
    console.log(`Phase 3 JSON Output detected:\\n${phase3Output}`);
  } else {
    console.log('Phase 3 JSON Output NOT detected.');
  }

  await browser.close();
})();
