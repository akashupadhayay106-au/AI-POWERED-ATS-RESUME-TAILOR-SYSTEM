const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`BROWSER CONSOLE: ${msg.text()}`);
  });
  
  await page.goto('http://127.0.0.1:5173');
  await page.waitForLoadState('load');

  fs.writeFileSync('test_valid.txt', 'Experience: Software Engineer\\nSkills: JavaScript, Python, React, HTML, CSS');
  const fileInput = await page.$('input#fileInput');
  await fileInput.setInputFiles('test_valid.txt');
  await page.waitForFunction(() => {
    const el = document.querySelector('#uploadStatus');
    return el && el.textContent.includes('Loaded');
  }, { timeout: 10000 });
  
  const jdInput = await page.$('#jdInput');
  const btnScoreJd = await page.$('#btnScoreJd');

  console.log('\\n--- TEST: Phase 5 Fetch Score ---');
  const realJd = 'We are looking for a highly skilled Senior React Engineer with 5+ years of experience in JavaScript, React, Node.js, AWS, and TypeScript. Must have strong understanding of web performance.';
  await jdInput.fill(realJd);
  await jdInput.dispatchEvent('input');
  
  // Click btnScoreJd to trigger fetchScore
  await btnScoreJd.click({ force: true });
  
  // Wait a moment for network
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
