const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  
  const layout = await page.evaluate(() => {
    const hero = document.querySelector('.scene-hero');
    const canvas = document.querySelector('canvas').parentElement;
    const eda = document.querySelector('#details');
    const pinSpacer = document.querySelector('.pin-spacer');
    
    return {
      hero: hero ? hero.getBoundingClientRect() : null,
      canvas: canvas ? canvas.getBoundingClientRect() : null,
      eda: eda ? eda.getBoundingClientRect() : null,
      pinSpacer: pinSpacer ? pinSpacer.getBoundingClientRect() : null,
      pinSpacerPadding: pinSpacer ? window.getComputedStyle(pinSpacer).paddingBottom : null,
    };
  });
  
  console.log(JSON.stringify(layout, null, 2));
  await browser.close();
})();
