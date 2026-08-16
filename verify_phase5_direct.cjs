const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`BROWSER CONSOLE: ${msg.text()}`);
  });
  
  await page.goto('http://127.0.0.1:5173');
  await page.waitForLoadState('load');

  console.log('\\n--- TEST: Phase 5 Direct Fetch Score ---');
  
  await page.evaluate(async () => {
    if (window.fetchScore) {
      await window.fetchScore('dummy resume', 'dummy jd');
    } else {
      console.log('window.fetchScore not found');
    }
  });
  
  await page.waitForTimeout(2000);
  
  await browser.close();
})();
