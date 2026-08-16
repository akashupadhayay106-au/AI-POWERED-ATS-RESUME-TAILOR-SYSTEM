const { chromium } = require('playwright');

(async () => {
  console.log("Starting Playwright...");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let logs = [];
  page.on('console', msg => {
    const text = msg.text();
    console.log('BROWSER CONSOLE:', text);
    logs.push(text);
  });
  
  // Track network requests
  page.on('request', request => {
    if (request.url().includes('/api/ai/auto-tailor') || request.url().includes('/api/analyze-resume')) {
      console.log(`[NETWORK EVENT] Request made: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/ai/auto-tailor') || response.url().includes('/api/analyze-resume')) {
      console.log(`[NETWORK EVENT] Response received: ${response.status()} from ${response.url()}`);
    }
  });

  page.on('framenavigated', frame => {
    console.log(`[NAVIGATED] Frame navigated to ${frame.url()}`);
  });

  try {
    console.log("Navigating to http://127.0.0.1:5173/");
    await page.goto('http://127.0.0.1:5173/');
    
    console.log("Waiting for app to load...");
    await page.waitForTimeout(1000);
    
    // Upload a dummy file to set internal resumeState
    console.log("Uploading dummy file...");
    await require('fs').promises.writeFile('dummy.txt', 'Fake resume text for testing purposes.');
    await page.setInputFiles('#fileInput', 'dummy.txt');
    
    console.log("Waiting for parsing to complete...");
    await page.waitForTimeout(1500); // Give it time to parse and set resumeState

    await page.evaluate(() => {
      document.getElementById('jdInput').value = "Fake JD".repeat(20);
      
      // Heartbeat test
      setInterval(() => console.log('heartbeat', Date.now()), 500);
    });
    
    console.log('Clicking btnTailor...');
    await page.evaluate(() => {
      document.getElementById('btnTailor').click();
    });
    
    console.log("Waiting for 3 seconds to capture logs...");
    await page.waitForTimeout(3000);
    
    console.log("Reading progressPercent text...");
    const percentInfo = await page.evaluate(() => {
      const el = document.getElementById('progressPercent');
      const allEls = document.querySelectorAll('#progressPercent');
      return {
        text: el ? el.textContent : "null",
        count: allEls.length,
        isHidden: el ? el.hidden : true
      };
    });
    console.log("Progress info is:", percentInfo);

  } catch (err) {
    console.error("Playwright encountered an error:", err);
  } finally {
    await browser.close();
  }
})();
