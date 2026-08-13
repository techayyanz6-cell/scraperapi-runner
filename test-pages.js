const { chromium } = require('playwright');
const path = require('path');

const DIR = path.join(__dirname, 'ad-screenshots');

(async () => {
    const browser = await chromium.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--proxy-server=direct://'] 
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    
    console.log('Loading https://pulsetech-adsterra-portal.surge.sh...');
    await page.goto('https://pulsetech-adsterra-portal.surge.sh', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(8000);
    
    const title = await page.title();
    console.log('Title:', title);
    
    const iframes = await page.locator('iframe').count();
    console.log('Iframes on page:', iframes);
    
    await page.screenshot({ path: path.join(DIR, 'chat-page.png') });
    console.log('Chat page saved');
    
    await page.click('#tabShops');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(DIR, 'shops-page.png') });
    console.log('Shops page saved');
    
    await page.click('#tabMore');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(DIR, 'more-page.png') });
    console.log('More page saved');
    
    await browser.close();
    console.log('Done!');
})();
