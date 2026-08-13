const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const https = require('https');

puppeteer.use(StealthPlugin());

const DIR = path.join(__dirname, 'ad-screenshots');
const LOG = path.join(DIR, 'impressions.csv');
const TARGET = 'https://pulsetech-adsterra-portal.surge.sh';
const INTERVAL = 5 * 60 * 1000;

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, 'time,ip,country,iframes,screenshot\n');

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(d));
        }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
    });
}

async function getFreshProxies() {
    const all = [];
    const countries = ['US', 'GB', 'DE', 'FR', 'NL', 'IT', 'ES', 'KR', 'JP', 'BR', 'IN', 'CA', 'AU', 'TR', 'EG'];
    
    for (const cc of countries) {
        try {
            const raw = await fetch(`https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=5000&country=${cc}&ssl=all&anonymity=all`);
            const list = raw.split('\n').filter(l => l.includes(':')).slice(0, 3);
            list.forEach(p => all.push({ proxy: p.trim(), country: cc }));
        } catch {}
    }
    
    // Shuffle
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    
    return all;
}

async function visit(proxyObj, cycleNum) {
    const { proxy, country } = proxyObj;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = path.join(DIR, `cycle${cycleNum}-${country}-${ts}.png`);
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/home/shaharyar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                `--proxy-server=socks5://${proxy}`,
            ],
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
        
        // Get IP
        let ip = 'unknown';
        try {
            await page.goto('https://ipinfo.io/json', { waitUntil: 'load', timeout: 8000 });
            const data = await page.evaluate(() => { try { return JSON.parse(document.body.innerText); } catch { return null; } });
            if (data) ip = `${data.ip}`;
        } catch {}
        
        // Visit site
        try {
            await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 20000 });
        } catch {}
        
        // Wait for CF
        for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const t = await page.title();
            if (t.includes('Narowalians')) break;
        }
        
        // Wait for ads
        await new Promise(r => setTimeout(r, 8000));
        
        // Count iframes
        const iframeCount = await page.evaluate(() => document.querySelectorAll('iframe').length);
        
        // Click shops to trigger more ads
        try {
            await page.click('#tabShops');
            await new Promise(r => setTimeout(r, 5000));
        } catch {}
        
        // Screenshot
        await page.screenshot({ path: file });
        
        // Log
        const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
        fs.appendFileSync(LOG, `"${now}","${ip}","${country}",${iframeCount},"${path.basename(file)}"\n`);
        
        console.log(`  ✅ [${country}] IP: ${ip} | Iframes: ${iframeCount} | ${path.basename(file)}`);
        return true;
    } catch (e) {
        console.log(`  ❌ [${country}] ${proxy} — ${e.message.substring(0, 40)}`);
        return false;
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

async function runCycle(cycleNum) {
    const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  🔄 CYCLE #${cycleNum} — ${now}`);
    console.log(`${'═'.repeat(60)}`);
    
    // Get fresh proxies
    console.log('\n📡 Fetching fresh proxies...');
    const proxies = await getFreshProxies();
    console.log(`   Found ${proxies.length} proxies\n`);
    
    // Visit from each proxy
    let successCount = 0;
    for (const p of proxies.slice(0, 15)) {
        await visit(p, cycleNum);
        successCount++;
        await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log(`\n📊 Cycle #${cycleNum} complete: ${successCount} impressions made`);
    console.log(`📂 Screenshots: ${DIR}`);
}

async function main() {
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  PROPELLERADS IMPRESSION TRACKER                           ║');
    console.log('║  Fresh proxies every 5 min → build up impressions          ║');
    console.log('║  Eventually ads will start serving                         ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');
    
    let cycle = 1;
    await runCycle(cycle);
    
    console.log(`\n⏰ Next cycle in ${INTERVAL / 60000} min... Ctrl+C to stop\n`);
    
    setInterval(async () => {
        cycle++;
        await runCycle(cycle);
        console.log(`\n⏰ Next in ${INTERVAL / 60000} min...\n`);
    }, INTERVAL);
}

main().catch(console.error);
