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

  // 1. Upload Resume & JD -> Score
  fs.writeFileSync('test_valid.txt', 'Experience: Software Engineer\\nSkills: JavaScript, Python, React, HTML, CSS');
  const fileInput = await page.$('input#fileInput');
  await fileInput.setInputFiles('test_valid.txt');
  await page.waitForFunction(() => {
    const el = document.querySelector('#uploadStatus');
    return el && el.textContent.includes('Loaded');
  }, { timeout: 10000 });
  
  const jdInput = await page.$('#jdInput');
  const btnScoreJd = await page.$('#btnScoreJd');
  
  const realJd = 'We are looking for a highly skilled Senior React Engineer with 5+ years of experience in JavaScript, React, Node.js, AWS, and TypeScript.';
  await jdInput.fill(realJd);
  await jdInput.dispatchEvent('input');
  
  await btnScoreJd.click({ force: true });
  
  // wait for scoring to finish
  await page.waitForTimeout(3000);
  
  // 2. Open chat, send "Why is my score low?"
  await page.evaluate(() => {
    if (window.sendChat) {
      window.sendChat('why is my score low?');
    } else {
      console.log('sendChat not globally exposed');
    }
  });
  
  // Wait for reply
  await page.waitForFunction(() => {
    const bubbles = document.querySelectorAll('.msg.assistant .bubble');
    return bubbles.length > 1; // wait for the actual reply
  }, { timeout: 15000 });
  
  const firstReply = await page.evaluate(() => {
    const bubbles = document.querySelectorAll('.msg.assistant .bubble');
    return bubbles[bubbles.length - 1].textContent;
  });
  console.log(`\\n--- REPLY 1 (Normal) ---\\n${firstReply}`);

  // We will pause here so the external bash script can kill the backend
  console.log('\\nREADY_FOR_KILL');
  
  // Wait for the file 'backend_killed.txt'
  await page.waitForFunction(() => {
    return true; // We'll just wait in node
  }, { timeout: 1000 }).catch(()=>{});
  
  while(!fs.existsSync('backend_killed.txt')) {
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // 3. Send message while backend is dead
  await page.evaluate(() => window.sendChat('Are you there?'));
  
  await page.waitForFunction(() => {
    const bubbles = document.querySelectorAll('.msg.assistant .bubble');
    return bubbles[bubbles.length - 1].textContent.includes("Couldn't get a response");
  }, { timeout: 16000 });
  
  const errReply = await page.evaluate(() => {
    const bubbles = document.querySelectorAll('.msg.assistant .bubble');
    return bubbles[bubbles.length - 1].textContent;
  });
  console.log(`\\n--- REPLY 2 (Backend Dead) ---\\n${errReply}`);
  
  // Check if input is re-enabled
  const isDisabled = await page.evaluate(() => document.querySelector('#chatInput').disabled);
  console.log(`\\n--- INPUT RE-ENABLED: ${!isDisabled} ---`);
  
  // We will pause here so external script can restart backend
  console.log('\\nREADY_FOR_RESTART');
  
  while(!fs.existsSync('backend_restarted.txt')) {
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // 4. Send 5 messages rapidly
  await page.evaluate(() => {
    window.sendChat('Hello 1');
    window.sendChat('Hello 2');
    window.sendChat('Hello 3');
    window.sendChat('Hello 4');
    window.sendChat('Hello 5');
  });
  
  await page.waitForTimeout(5000);
  
  const msgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.msg.user .bubble')).map(b => b.textContent);
  });
  console.log(`\\n--- USER MESSAGES SENT ---\\n${msgs.join(', ')}`);
  
  await browser.close();
})();
