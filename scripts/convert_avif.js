const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  const filePath = path.resolve('asset-references/furniture/reference images/chairs/red_armchair.jpg');
  await page.goto('file:///' + filePath.split(path.sep).join('/'));
  const img = await page.$('img');
  await img.screenshot({ path: 'asset-references/furniture/reference images/chairs/red_armchair.png' });
  await browser.close();
  console.log('Saved red_armchair.png via Chrome!');
})();
