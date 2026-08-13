const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const DIR = path.join(__dirname, 'ad-screenshots');
const LOG = path.join(DIR, 'tor-clicks.csv');
const TARGET = 'https://pulsetech-adsterra-portal.surge.sh';
const CHROME = '/home/shaharyar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const TOR_PROXY = 'socks5://127.0.0.1:9050';

// Target countries - Tor will randomly give exit nodes
// We keep checking until we hit these countries
const TARGET_COUNTRIES = ['IT', 'KR', 'EG', 'DE'];

const NAMES = ['Ahmed', 'Ali', 'Sara', 'Fatima', 'Hassan', 'Usman', 'Zainab', 'Ayesha'];

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, 'time,country,ip,city,action\n');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(country, ip, city, action) {
    const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    fs.appendFileSync(LOG, `"${now}","${country}","${ip}","${city}","${action}"\n`);
}

async function checkIP(page) {
    try {
        await page.goto('https://ipinfo.io/json', { waitUntil: 'load', timeout: 10000 });
        const text = await page.evaluate(() => document.body.innerText);
        try {
            const d = JSON.parse(text);
            return { ip: d.ip, country: d.country, city: d.city, org: d.org };
        } catch { return null; }
    } catch { return null; }
}

async function interactWithAds(ipData) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const pre = `${ipData.country}-${ts}`;
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];

    let browser;
    try {
        const args = [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            `--proxy-server=${TOR_PROXY}`,
        ];

        browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        console.log(`  📱 Loading https://pulsetech-adsterra-portal.surge.sh...`);
        try { await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 25000 }); } catch {}

        for (let i = 0; i < 12; i++) {
            await sleep(2000);
            const t = await page.title();
            if (t.includes('Narowalians')) break;
        }
        await sleep(5000);
        console.log(`  ✅ Site loaded`);

        // 1. Login page
        let f = `${pre}-01-login.png`;
        await page.screenshot({ path: path.join(DIR, f) });
        log(ipData.country, ipData.ip, ipData.city, 'login');
        console.log(`  📸 ${f}`);

        // 2. Type name
        try {
            await page.waitForSelector('#chatName', { timeout: 5000 });
            await page.type('#chatName', name, { delay: 60 });
            await sleep(1000);
            f = `${pre}-02-name.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            log(ipData.country, ipData.ip, ipData.city, 'name');
            console.log(`  📸 ${f}`);
        } catch {
            console.log(`  ⚠️  name input not found`);
        }

        // 3. Click Join Chat → rewarded ad
        try {
            await page.evaluate(() => {
                [...document.querySelectorAll('button')].find(b => b.textContent.includes('Join Chat'))?.click();
            });
            await sleep(4000);
            f = `${pre}-03-ad-popup.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            log(ipData.country, ipData.ip, ipData.city, 'rewarded-ad');
            console.log(`  📸 ${f} (ad popup)`);

            // 4. Wait for ad timer
            console.log(`  ⏳ Waiting 8s for ad...`);
            await sleep(8000);
            f = `${pre}-04-ad-loaded.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            log(ipData.country, ipData.ip, ipData.city, 'ad-timer-done');
            console.log(`  📸 ${f}`);

            // 5. Click Continue
            try {
                await page.click('#rewardedSkip');
                await sleep(4000);
                f = `${pre}-05-continue.png`;
                await page.screenshot({ path: path.join(DIR, f) });
                log(ipData.country, ipData.ip, ipData.city, 'after-continue');
                console.log(`  📸 ${f}`);
            } catch {}
        } catch (e) {
            console.log(`  ❌ Join: ${e.message.substring(0, 40)}`);
        }

        // 6. Shops
        try {
            await page.evaluate(() => document.querySelectorAll('.tab')[1]?.click());
            await sleep(5000);
            f = `${pre}-06-shops.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            log(ipData.country, ipData.ip, ipData.city, 'shops');
            console.log(`  📸 ${f}`);
        } catch {}

        // 7. View menu — another rewarded ad
        try {
            await page.evaluate(() => document.querySelector('.order-btn')?.click());
            await sleep(3000);
            f = `${pre}-07-shop-ad.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            log(ipData.country, ipData.ip, ipData.city, 'shop-rewarded');
            console.log(`  📸 ${f}`);

            await sleep(8000);
            try { await page.click('#rewardedSkip'); } catch {}
            await sleep(3000);
            f = `${pre}-08-shop-menu.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            log(ipData.country, ipData.ip, ipData.city, 'shop-menu');
            console.log(`  📸 ${f}`);
        } catch {}

        // 8. More page bottom
        try {
            await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(4000);
            await page.evaluate(() => document.querySelectorAll('.tab')[2]?.click());
            await sleep(3000);
            await page.evaluate(() => window.scrollTo(0, 99999));
            await sleep(3000);
            f = `${pre}-09-more.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            log(ipData.country, ipData.ip, ipData.city, 'more-bottom');
            console.log(`  📸 ${f}`);
        } catch {}

        console.log(`  ✅ ${ipData.country} DONE!`);
        return true;
    } catch (e) {
        console.log(`  ❌ ${e.message.substring(0, 60)}`);
        return false;
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

async function main() {
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  TOR RANDOMIZED IP TRACKER — Country Match + Ads        ║');
    console.log('║  Tor exit nodes randomized → match IT/KR/EG/DE           ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    // Stats
    const stats = {};
    TARGET_COUNTRIES.forEach(c => stats[c] = 0);

    let attempts = 0;
    const MAX_PER_COUNTRY = 2; // Take 2 complete sessions per country

    console.log('🔍 Scanning for target country exit nodes...\n');

    // Each new browser connection through Tor may get a different exit node
    // We keep opening browser sessions until we hit all target countries
    while (Object.values(stats).some(c => c < MAX_PER_COUNTRY) && attempts < 60) {
        attempts++;
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`  Attempt #${attempts} (new Tor circuit)`);
        console.log(`${'─'.repeat(50)}`);

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                executablePath: CHROME,
                args: [
                    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                    '--proxy-server=socks5://127.0.0.1:9050',
                ],
            });
            const page = await browser.newPage();

            // Check IP
            const ipData = await checkIP(page);
            if (!ipData) {
                console.log(`  ⚠️  IP check failed`);
                continue;
            }

            console.log(`  🌐 IP: ${ipData.ip} | ${ipData.country} | ${ipData.city || ''}`);

            // If it's a target country and under limit, run full interaction
            if (TARGET_COUNTRIES.includes(ipData.country) && stats[ipData.country] < MAX_PER_COUNTRY) {
                console.log(`  🎯 MATCH! Running full ad interaction...`);
                stats[ipData.country]++;
                await interactWithAds(ipData);
            } else if (stats[ipData.country] >= MAX_PER_COUNTRY) {
                console.log(`  ${ipData.country} already done (${stats[ipData.country]}/${MAX_PER_COUNTRY})`);
            } else {
                console.log(`  ⏩ Not a target country (${ipData.country}), skipping`);
            }
        } catch (e) {
            console.log(`  ❌ ${e.message.substring(0, 60)}`);
        } finally {
            if (browser) await browser.close().catch(() => {});
        }

        // New circuit = new session, slight delay
        await sleep(2000);
    }

    console.log(`\n${'═'.repeat(58)}`);
    console.log(`  📊 RESULTS:`);
    console.log(`${'═'.repeat(58)}`);
    Object.entries(stats).forEach(([c, count]) => {
        console.log(`  ${c}: ${count} sessions completed`);
    });
    console.log(`  Attempts: ${attempts}`);
    console.log(`\n  📂 Screenshots: ${DIR}`);
    console.log(`  📊 Log: ${LOG}`);
    console.log(`\n  💡 TIP: Tor IPs random hote hain. Ye script har 5 min`);
    console.log(`     chalati raho - zyada countries cover hogi.`);
    console.log(`${'═'.repeat(58)}`);
}

main().catch(console.error);