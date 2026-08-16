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

  // 1. Open the page, open DevTools Console.
  // 2. In the console, run: setInterval(() => console.log('heartbeat', Date.now()), 500)
  await page.evaluate(() => {
    setInterval(() => console.log('heartbeat', Date.now()), 500);
  });

  // Upload Resume & JD -> Score -> Trigger Tailoring
  fs.writeFileSync('test_valid.txt', 'Experience: Software Engineer\\nSkills: JavaScript, Python, React, HTML, CSS');
  const fileInput = await page.$('input#fileInput');
  await fileInput.setInputFiles('test_valid.txt');
  await page.waitForFunction(() => {
    const el = document.querySelector('#uploadStatus');
    return el && el.textContent.includes('Loaded');
  }, { timeout: 10000 });
  
  const jdInput = await page.$('#jdInput');
  await jdInput.fill('We are looking for a highly skilled Senior React Engineer with 5+ years of experience in JavaScript, React, Node.js, AWS, and TypeScript.');
  await jdInput.dispatchEvent('input');
  
  const btnScoreJd = await page.$('#btnScoreJd');
  await btnScoreJd.click({ force: true });
  
  // wait for scoring to finish
  await page.waitForTimeout(3000);
  
  // 3. Trigger the tailoring flow that opens the frozen 0% modal.
  const btnLowScoreTailor = await page.$('#btnLowScoreTailor');
  
  if (btnLowScoreTailor) {
    console.log("Triggering tailoring flow...");
    // Mock the backend tailoring to just hang or respond slowly so we can observe the frozen 0%
    // Actually, we don't mock it here, we just use the real backend which we know causes the bug
    await page.evaluate(() => document.querySelector('#btnLowScoreTailor').click());
    
    // 4. Watch whether "heartbeat" keeps printing every ~500ms while the modal is stuck at 0%.
    await page.waitForTimeout(10000); // Observe for 10 seconds
  } else {
    console.log("Could not find btnLowScoreTailor");
  }

  await browser.close();
})();
