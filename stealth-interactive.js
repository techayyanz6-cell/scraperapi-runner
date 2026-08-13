const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const DIR = path.join(__dirname, 'ad-screenshots');
const TARGET = 'https://pulsetech-adsterra-portal.surge.sh';

async function run() {
    console.log('🚀 Starting stealth browser with interaction...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/home/shaharyar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--proxy-server=socks5://127.0.0.1:9050',
        ],
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
        
        // Check IP
        try {
            await page.goto('https://ipinfo.io/json', { waitUntil: 'load', timeout: 10000 });
            const body = await page.evaluate(() => document.body.innerText);
            const ip = JSON.parse(body);
            console.log(`🌐 IP: ${ip.ip} - ${ip.country} ${ip.city || ''}`);
        } catch { console.log('🌐 IP: unknown'); }
        
        // Load site
        console.log('\n📱 Loading https://pulsetech-adsterra-portal.surge.sh...');
        await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 25000 });
        
        // Wait for CF
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const t = await page.title();
            if (t.includes('Narowalians')) { console.log('✅ CF passed'); break; }
        }
        
        await new Promise(r => setTimeout(r, 5000));
        
        // Screenshot 1: Chat page
        await page.screenshot({ path: path.join(DIR, '01-chat.png') });
        console.log('📸 01-chat.png saved');
        
        // Click "Shops" tab
        console.log('\n🛒 Clicking Shops tab...');
        await page.click('#tabShops');
        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: path.join(DIR, '02-shops.png') });
        console.log('📸 02-shops.png saved');
        
        // Scroll shops page to trigger lazy-loaded ads
        console.log('📜 Scrolling shops...');
        await page.evaluate(() => window.scrollTo(0, 500));
        await new Promise(r => setTimeout(r, 3000));
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(DIR, '03-shops-scrolled.png') });
        console.log('📸 03-shops-scrolled.png saved');
        
        // Click "View Menu & Order" on first shop (triggers rewarded ad)
        console.log('\n🎯 Clicking shop button (triggers rewarded ad)...');
        const shopBtn = await page.$('.order-btn');
        if (shopBtn) {
            await shopBtn.click();
            await new Promise(r => setTimeout(r, 3000));
            await page.screenshot({ path: path.join(DIR, '04-rewarded-ad.png') });
            console.log('📸 04-rewarded-ad.png saved');
            
            // Wait for timer and click continue
            await new Promise(r => setTimeout(r, 6000));
            const continueBtn = await page.$('#rewardedSkip');
            if (continueBtn) {
                await continueBtn.click();
                await new Promise(r => setTimeout(r, 3000));
            }
            await page.screenshot({ path: path.join(DIR, '05-after-rewarded.png') });
            console.log('📸 05-after-rewarded.png saved');
        }
        
        // Click "More" tab
        console.log('\n📋 Clicking More tab...');
        await page.click('#tabMore');
        await new Promise(r => setTimeout(r, 3000));
        
        // Scroll More page
        await page.evaluate(() => window.scrollTo(0, 600));
        await new Promise(r => setTimeout(r, 3000));
        await page.screenshot({ path: path.join(DIR, '06-more-scrolled.png') });
        console.log('📸 06-more-scrolled.png saved');
        
        // Full page screenshots
        console.log('\n📄 Taking full page screenshots...');
        
        await page.click('#tabChat');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(DIR, '07-chat-full.png'), fullPage: true });
        
        await page.click('#tabShops');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(DIR, '08-shops-full.png'), fullPage: true });
        
        await page.click('#tabMore');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(DIR, '09-more-full.png'), fullPage: true });
        
        // Final stats
        const stats = await page.evaluate(() => {
            return {
                iframes: document.querySelectorAll('iframe').length,
                scripts: document.querySelectorAll('script[src]').length,
                adDivs: document.querySelectorAll('[id*="ad"], [class*="ad"]').length,
                overlays: document.querySelectorAll('.rewarded-overlay, .pwa-banner').length,
            };
        });
        
        console.log('\n📊 Final Stats:');
        console.log(`   Iframes: ${stats.iframes}`);
        console.log(`   Scripts: ${stats.scripts}`);
        console.log(`   Ad divs: ${stats.adDivs}`);
        console.log(`   Overlays: ${stats.overlays}`);
        
        console.log('\n✅ All screenshots saved to:', DIR);
        
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await browser.close();
    }
}

run();
