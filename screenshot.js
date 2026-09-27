const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Set viewport to 1080p
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Save first screenshot at the top
  await page.screenshot({ path: path.join(__dirname, 'screenshot_top.png') });
  
  // Scroll down a bit to see the CanvasSequence
  await page.evaluate(() => {
    window.scrollTo(0, window.innerHeight);
  });
  
  // Wait a bit for scroll animations
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot of CanvasSequence
  await page.screenshot({ path: path.join(__dirname, 'screenshot_canvas1.png') });

  // Scroll more
  await page.evaluate(() => {
    window.scrollTo(0, window.innerHeight * 3);
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(__dirname, 'screenshot_canvas2.png') });

  // Scroll to bottom
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(__dirname, 'screenshot_bottom.png') });

  await browser.close();
})();
