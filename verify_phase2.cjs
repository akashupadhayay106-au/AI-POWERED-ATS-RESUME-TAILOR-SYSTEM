const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
  
  await page.goto('http://127.0.0.1:5173');
  await page.waitForLoadState('load');

  // We need a dummy resume uploaded first because btnAnalyze requires a resumeState
  fs.writeFileSync('test_valid.txt', 'This is a valid test resume.\\nExperience: Software Engineer\\nSkills: JavaScript, Python');
  const fileInput = await page.$('input#fileInput');
  await fileInput.setInputFiles('test_valid.txt');
  await page.waitForFunction(() => {
    const el = document.querySelector('#uploadStatus');
    return el && el.textContent.includes('Loaded');
  }, { timeout: 10000 });
  
  const jdInput = await page.$('#jdInput');
  const btnAnalyze = await page.$('#btnAnalyze');

  // Test 3: Leave empty and try to proceed
  console.log('\\n--- TEST 3: Empty JD ---');
  await jdInput.fill('');
  console.log('Filled empty');
  await btnAnalyze.click({ force: true });
  console.log('Clicked analyze');
  await page.waitForTimeout(500);
  const emptyStatus = await page.textContent('#jdStatus');
  console.log(`Status: ${emptyStatus}`);
  
  // Test 2: Paste one word
  console.log('\\n--- TEST 2: Too Short JD ---');
  await jdInput.fill('developer');
  // Dispatch input event to trigger char count
  await jdInput.dispatchEvent('input');
  await btnAnalyze.click({ force: true });
  await page.waitForTimeout(500);
  const shortStatus = await page.textContent('#jdStatus');
  const shortCharCount = await page.textContent('#jdCharCount');
  console.log(`Status: ${shortStatus}`);
  console.log(`Char count indicator: ${shortCharCount}`);

  // Test 1: Paste a real JD
  console.log('\\n--- TEST 1: Valid JD ---');
  const realJd = 'We are looking for a highly skilled Senior React Engineer with 5+ years of experience in JavaScript, React, and Node.js. Must have strong understanding of web performance.';
  await jdInput.fill(realJd);
  await jdInput.dispatchEvent('input');
  await btnAnalyze.click({ force: true });
  await page.waitForTimeout(500);
  const validStatus = await page.textContent('#jdStatus');
  const validCharCount = await page.textContent('#jdCharCount');
  console.log(`Status: ${validStatus}`);
  console.log(`Char count indicator: ${validCharCount}`);

  await browser.close();
})();
