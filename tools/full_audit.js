const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000)); // wait for animations
  
  const outDir = 'C:\\Users\\isobe\\.gemini\\antigravity-ide\\brain\\56c4f8f7-78d9-4e42-b3f8-b46988156a0e';
  
  // Get total page height
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`Total page height: ${totalHeight}px`);
  
  // Take full page screenshot
  await page.screenshot({ path: path.join(outDir, 'full_page.png'), fullPage: true });
  console.log('Full page screenshot saved');
  
  // Now scroll through and take screenshots at each viewport
  const viewportHeight = 1080;
  const numScreenshots = Math.ceil(totalHeight / viewportHeight);
  console.log(`Taking ${numScreenshots} viewport screenshots...`);
  
  for (let i = 0; i < Math.min(numScreenshots, 25); i++) {
    const scrollY = i * viewportHeight;
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(outDir, `viewport_${String(i).padStart(2,'0')}.png`) });
    
    // Get visible text headings at this scroll position
    const headings = await page.evaluate(() => {
      const els = document.querySelectorAll('h1, h2, h3');
      const visible = [];
      els.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top >= -100 && rect.top <= window.innerHeight + 100) {
          visible.push(el.textContent.trim().substring(0, 80));
        }
      });
      return visible;
    });
    
    console.log(`Screenshot ${i}: scrollY=${scrollY}, visible headings: ${JSON.stringify(headings)}`);
  }
  
  await browser.close();
  console.log('Done!');
})();
