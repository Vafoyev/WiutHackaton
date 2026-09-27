const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  
  const layout = await page.evaluate(() => {
    const pinSpacer = document.querySelector('.pin-spacer');
    const canvasContainer = pinSpacer ? pinSpacer.firstElementChild : null;
    const eda = document.querySelector('#details');
    
    return {
      pinSpacer: pinSpacer ? {
        paddingBottom: pinSpacer.style.paddingBottom,
        height: pinSpacer.clientHeight,
        rect: pinSpacer.getBoundingClientRect()
      } : null,
      canvasContainer: canvasContainer ? {
        height: canvasContainer.clientHeight,
        rect: canvasContainer.getBoundingClientRect()
      } : null,
      eda: eda ? {
        top: eda.getBoundingClientRect().top
      } : null
    };
  });
  
  console.log(JSON.stringify(layout, null, 2));
  await browser.close();
})();
