const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const DIR = path.join(__dirname, 'ad-screenshots');
const TARGET = 'https://pulsetech-adsterra-portal.surge.sh';

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

async function checkIP(page) {
    try {
        await page.goto('https://ipinfo.io/json', { waitUntil: 'load', timeout: 10000 });
        const data = await page.evaluate(() => {
            try { return JSON.parse(document.body.innerText); } catch { return null; }
        });
        if (data) return `${data.ip} - ${data.country} ${data.city || ''}`;
    } catch {}
    return 'unknown';
}

async function takeScreenshot(label) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = path.join(DIR, `${label}-${ts}.png`);
    
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
        const ip = await checkIP(page);
        console.log(`  🌐 IP: ${ip}`);
        
        // Go to site
        try {
            await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 20000 });
        } catch {
            console.log(`  ⏳ Nav timeout, waiting...`);
        }
        
        // Wait for Cloudflare
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const title = await page.title();
            if (title.includes('Narowalians')) {
                console.log(`  ✅ Cloudflare passed`);
                break;
            }
        }
        
        // Wait for ads to load
        await new Promise(r => setTimeout(r, 10000));
        
        // Check what loaded
        const stats = await page.evaluate(() => {
            const iframes = document.querySelectorAll('iframe');
            const scripts = document.querySelectorAll('script[src]');
            const ads = [];
            iframes.forEach(f => {
                if (f.src && (f.src.includes('effectivecpm') || f.src.includes('highperformance'))) {
                    ads.push({ type: 'iframe', src: f.src.substring(0, 80), w: f.width, h: f.height });
                }
            });
            scripts.forEach(s => {
                if (s.src && (s.src.includes('effectivecpm') || s.src.includes('highperformance'))) {
                    ads.push({ type: 'script', src: s.src.substring(0, 80) });
                }
            });
            return { 
                title: document.title,
                iframeCount: iframes.length,
                adElements: ads,
                bodyText: document.body?.innerText?.substring(0, 100)
            };
        });
        
        console.log(`  📊 Title: ${stats.title.substring(0, 50)}`);
        console.log(`  📊 Iframes: ${stats.iframeCount}`);
        console.log(`  📊 Ad elements: ${stats.adElements.length}`);
        stats.adElements.forEach(a => console.log(`    - ${a.type}: ${a.src}`));
        
        // Screenshot
        await page.screenshot({ path: file, fullPage: false });
        console.log(`  📸 Saved: ${path.basename(file)}`);
        
        // Full page screenshot
        const fullFile = path.join(DIR, `${label}-full-${ts}.png`);
        await page.screenshot({ path: fullFile, fullPage: true });
        console.log(`  📸 Full: ${path.basename(fullFile)}`);
        
        return { file, ip, stats };
    } catch (e) {
        console.log(`  ❌ ${e.message.substring(0, 80)}`);
        return null;
    } finally {
        await browser.close().catch(() => {});
    }
}

async function main() {
    console.log('╔' + '═'.repeat(56) + '╗');
    console.log('║  STEALTH MODE AD TRACKER — https://pulsetech-adsterra-portal.surge.sh             ║');
    console.log('║  Using puppeteer-extra stealth + Tor proxy                ║');
    console.log('╚' + '═'.repeat(56) + '╝');
    
    // First try without proxy to test stealth
    console.log('\n🔹 Test 1: Direct (no proxy) — checking stealth...');
    await takeScreenshot('direct');
    
    // Now try with Tor
    console.log('\n🔹 Test 2: Via Tor proxy...');
    await takeScreenshot('tor');
    
    console.log('\n' + '═'.repeat(56));
    console.log('  📂 Screenshots saved to:', DIR);
    console.log('═'.repeat(56));
}

main().catch(console.error);
