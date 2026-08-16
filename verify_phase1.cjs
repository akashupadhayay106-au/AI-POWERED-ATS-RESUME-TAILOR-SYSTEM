const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
  
  await page.goto('http://127.0.0.1:5173');
  await page.waitForLoadState('load');

  // Test 1: Upload a real TXT file
  console.log('\\n--- TEST 1: Valid TXT ---');
  fs.writeFileSync('test_valid.txt', 'This is a valid test resume.\\nExperience: Software Engineer\\nSkills: JavaScript, Python');
  
  const fileInput = await page.$('input#fileInput');
  await fileInput.setInputFiles('test_valid.txt');
  
  await page.waitForTimeout(2000); // give it time to parse
  const preview = await page.textContent('#resumePreview');
  const status = await page.textContent('#uploadStatus');
  console.log(`Status: ${status}`);
  console.log(`Preview: ${preview.substring(0, 50)}...`);

  // Test 2: Upload a corrupted file
  console.log('\\n--- TEST 2: Corrupted PDF ---');
  fs.writeFileSync('test_corrupted.pdf', 'This is not a real PDF file.');
  await fileInput.setInputFiles('test_corrupted.pdf');
  
  await page.waitForTimeout(2000);
  const errStatus = await page.textContent('#uploadStatus');
  console.log(`Status: ${errStatus}`);

  // Test 3: Upload a >5MB file
  console.log('\\n--- TEST 3: Large File ---');
  // Create a 6MB txt file
  const largeBuf = Buffer.alloc(6 * 1024 * 1024, 'a');
  fs.writeFileSync('test_large.txt', largeBuf);
  await fileInput.setInputFiles('test_large.txt');
  
  await page.waitForTimeout(1000);
  const largeStatus = await page.textContent('#uploadStatus');
  console.log(`Status: ${largeStatus}`);

  await browser.close();
})();
