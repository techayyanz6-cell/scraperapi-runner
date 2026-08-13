const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const INTERVAL = 5 * 60 * 1000;
const DIR = path.join(__dirname, 'ad-screenshots');
const TARGET = 'https://pulsetech-adsterra-portal.surge.sh';

// Tor exit nodes by country
const COUNTRIES = {
    'Italy':   { flag: '🇮🇹', exitNode: 'italy' },
    'Korea':   { flag: '🇰🇷', exitNode: 'korea' },
    'Egypt':   { flag: '🇪🇬', exitNode: 'egypt' },
    'Germany': { flag: '🇩🇪', exitNode: 'germany' },
};

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
for (const c of Object.keys(COUNTRIES)) {
    const d = path.join(DIR, c);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function torSwitch(country) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            jsonrpc: '2.0',
            method: 'SIGNAL',
            params: ['NEWNYM'],
            id: 1
        });
        // We use torsocks + ControlPort to switch circuits
        const { execSync } = require('child_process');
        try {
            // Try to get new Tor circuit for specific country
            execSync(`torsocks curl -s --max-time 10 "https://ipinfo.io/json"`, { encoding: 'utf8', timeout: 15000 });
            resolve(true);
        } catch {
            resolve(false);
        }
    });
}

async function takeScreenshot(country, extraArgs) {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const localTime = now.toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    const file = path.join(DIR, country, `${ts}.png`);
    
    let browser;
    try {
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--proxy-server=socks5://127.0.0.1:9050',
            ...(extraArgs || [])
        ];
        
        browser = await chromium.launch({ headless: true, args });
        const ctx = await browser.newContext({
            viewport: { width: 1280, height: 900 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        
        await ctx.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
        
        const page = await ctx.newPage();
        
        // Get current IP
        let currentIP = 'unknown';
        try {
            const ipRes = await page.goto('https://ipinfo.io/json', { waitUntil: 'load', timeout: 10000 });
            const ipText = await page.evaluate(() => document.body.innerText);
            const ipData = JSON.parse(ipText);
            currentIP = `${ipData.ip} (${ipData.country} - ${ipData.city || 'unknown'})`;
            console.log(`    🌐 IP: ${currentIP}`);
        } catch {
            console.log(`    ⚠️  Could not detect IP`);
        }
        
        // Navigate to target
        try {
            await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 20000 });
        } catch {
            console.log(`    ⏳ Navigation timeout, waiting...`);
        }
        
        // Wait for Cloudflare + page load
        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(2000);
            const title = await page.title();
            if (title.includes('Narowalians')) {
                console.log(`    ✅ Page loaded`);
                break;
            }
        }
        
        // Wait extra for ads
        await page.waitForTimeout(8000);
        
        // Count iframes (ads)
        const iframeCount = await page.locator('iframe').count();
        console.log(`    📊 Iframes: ${iframeCount}`);
        
        // Screenshot
        await page.screenshot({ path: file, fullPage: false });
        console.log(`    📸 Saved: ${country}/${ts}.png`);
        
        return { file, ip: currentIP, iframes: iframeCount };
    } catch (e) {
        console.log(`    ❌ ${e.message.substring(0, 80)}`);
        return null;
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

async function runCycle() {
    const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  📸 AD SCREENSHOT CYCLE — ${now}`);
    console.log(`${'═'.repeat(60)}`);
    
    const results = [];
    
    for (const [country, info] of Object.entries(COUNTRIES)) {
        console.log(`\n${info.flag} ${country}:`);
        console.log('─'.repeat(40));
        
        // Each Tor connection gives different exit node
        // We take multiple screenshots to capture different IPs
        const result = await takeScreenshot(country);
        if (result) results.push({ country, ...result });
    }
    
    // Summary
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  📊 CYCLE SUMMARY`);
    console.log(`${'═'.repeat(60)}`);
    results.forEach(r => {
        console.log(`  ${r.country}: IP ${r.ip} | Iframes: ${r.iframes}`);
    });
    console.log(`\n  📂 Screenshots: ${DIR}`);
    console.log(`${'═'.repeat(60)}`);
    
    // Save log
    const logFile = path.join(DIR, 'log.csv');
    if (!fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, 'timestamp,country,ip,iframes,file\n');
    }
    results.forEach(r => {
        fs.appendFileSync(logFile, `"${now}","${r.country}","${r.ip}",${r.iframes},"${r.file}"\n`);
    });
}

async function main() {
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  AD SCREENSHOT TRACKER v2 — https://pulsetech-adsterra-portal.surge.sh            ║');
    console.log('║  Using Tor proxy for country-based screenshots            ║');
    console.log('║  Interval: Every 5 minutes                                ║');
    console.log('╚' + '═'.repeat(58) + '╝');
    
    console.log('\n⚠️  NOTE: Tor exit nodes are random.');
    console.log('Each cycle may give a different country IP.');
    console.log('Multiple cycles = more country coverage.\n');
    
    await runCycle();
    
    console.log(`\n⏰ Next cycle in ${INTERVAL / 60000} minutes... Ctrl+C to stop\n`);
    setInterval(async () => {
        await runCycle();
        console.log(`\n⏰ Next in ${INTERVAL / 60000} min...\n`);
    }, INTERVAL);
}

main().catch(console.error);
