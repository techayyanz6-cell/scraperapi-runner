const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const https = require('https');

puppeteer.use(StealthPlugin());

const DIR = path.join(__dirname, 'ad-screenshots');
const LOG = path.join(DIR, 'clicks.csv');
const TARGET = 'https://pulsetech-adsterra-portal.surge.sh';
const CHROME = '/home/shaharyar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';

const COUNTRIES = {
    'Italy':   { code: 'IT', flag: '🇮🇹' },
    'Korea':   { code: 'KR', flag: '🇰🇷' },
    'Egypt':   { code: 'EG', flag: '🇪🇬' },
    'Germany': { code: 'DE', flag: '🇩🇪' },
};

const NAMES = ['Ahmed', 'Ali', 'Sara', 'Fatima', 'Hassan', 'Usman', 'Zainab', 'Ayesha', 'Bilal', 'Omar', 'Maryam', 'Hina'];

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, 'time,country,ip,port,action\n');

function log(country, ip, port, action) {
    const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    fs.appendFileSync(LOG, `"${now}","${country}","${ip}","${port}","${action}"\n`);
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(d));
        }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
    });
}

async function getAllProxies(cc) {
    const all = [];
    try {
        const raw = await fetchUrl(`https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=5000&country=${cc}&ssl=all&anonymity=all`);
        raw.split('\n').filter(l => l.includes(':')).forEach(l => all.push(l.trim()));
    } catch {}
    // Shuffle for randomization
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function detectIP(page) {
    const services = [
        'https://api.ipify.org?format=json',
        'https://ipinfo.io/json',
        'https://ip-api.com/json',
    ];
    for (const svc of services) {
        try {
            await page.goto(svc, { waitUntil: 'load', timeout: 8000 });
            const text = await page.evaluate(() => document.body.innerText);
            const data = JSON.parse(text);
            if (data.ip) return data.ip;
            if (data.query) return data.query;
        } catch {}
    }
    return 'unknown';
}

async function runCountry(country, info, proxyPool) {
    console.log(`\n${info.flag} ${'═'.repeat(50)}`);
    console.log(`  ${country}`);
    console.log(`${'═'.repeat(50)}`);

    // Get fresh proxy from pool
    let proxy = null;
    if (proxyPool.length > 0) {
        proxy = proxyPool.pop();
        console.log(`  📡 Proxy: ${proxy}`);
    } else {
        console.log(`  📡 No proxies left, using direct`);
    }

    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const pre = `${country}-${ts}`;

    let browser;
    try {
        const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'];
        if (proxy) {
            args.push(`--proxy-server=socks5://${proxy}`);
        } else {
            args.push('--proxy-server=direct://');
        }

        browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        // Detect IP
        console.log(`  🌐 Detecting IP...`);
        const ip = await detectIP(page);
        const port = proxy ? proxy.split(':')[1] : 'direct';
        console.log(`  🌐 IP: ${ip} (port: ${port})`);

        // Load site
        console.log(`  📱 Loading https://pulsetech-adsterra-portal.surge.sh...`);
        try { await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 25000 }); } catch {}

        // Wait for CF
        for (let i = 0; i < 12; i++) {
            await sleep(2000);
            const t = await page.title();
            if (t.includes('Narowalians')) break;
        }
        await sleep(6000);
        console.log(`  ✅ Site loaded`);

        // Screenshot 1: Login page
        let f = `${pre}-01-login.png`;
        await page.screenshot({ path: path.join(DIR, f) });
        console.log(`  📸 ${f}`);
        log(country, ip, port, 'login-page');

        // Type name
        console.log(`  ✍️  Typing: ${name}...`);
        try {
            await page.waitForSelector('#chatName', { timeout: 8000 });
            await page.type('#chatName', name, { delay: 50 });
            await sleep(1000);
            f = `${pre}-02-name.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            console.log(`  📸 ${f}`);
            log(country, ip, port, 'name-typed');
        } catch (e) {
            console.log(`  ⚠️  chatName not found, trying anyway...`);
        }

        // Click Join Chat
        console.log(`  🖱️  Clicking "Join Chat"...`);
        try {
            await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const b of btns) {
                    if (b.textContent.includes('Join Chat')) { b.click(); break; }
                }
            });
            await sleep(3000);
            f = `${pre}-03-join.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            console.log(`  📸 ${f}`);
            log(country, ip, port, 'join-clicked');

            // Rewarded ad popup
            console.log(`  🎬 Rewarded ad appearing...`);
            await sleep(3000);
            f = `${pre}-04-ad-popup.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            console.log(`  📸 ${f}`);
            log(country, ip, port, 'rewarded-ad');

            // Wait for timer
            console.log(`  ⏳ Waiting 8 sec for ad timer...`);
            await sleep(8000);
            f = `${pre}-05-ad-done.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            console.log(`  📸 ${f}`);
            log(country, ip, port, 'ad-timer-done');

            // Click Continue
            console.log(`  ▶️  Clicking Continue...`);
            try {
                await page.click('#rewardedSkip');
                await sleep(4000);
                f = `${pre}-06-continue.png`;
                await page.screenshot({ path: path.join(DIR, f) });
                console.log(`  📸 ${f}`);
                log(country, ip, port, 'after-continue');
            } catch {}
        } catch (e) {
            console.log(`  ❌ Join error: ${e.message.substring(0, 40)}`);
        }

        // Shops page
        console.log(`  🛒 Clicking Shops...`);
        try {
            await page.evaluate(() => document.querySelectorAll('.tab')[1]?.click());
            await sleep(5000);
            f = `${pre}-07-shops.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            console.log(`  📸 ${f}`);
            log(country, ip, port, 'shops-page');
        } catch {}

        // Click View Menu — triggers another rewarded ad
        console.log(`  🎯 Clicking "View Menu"...`);
        try {
            await page.evaluate(() => document.querySelector('.order-btn')?.click());
            await sleep(3000);
            f = `${pre}-08-shop-ad.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            console.log(`  📸 ${f}`);
            log(country, ip, port, 'shop-rewarded');

            console.log(`  ⏳ Waiting 8 sec...`);
            await sleep(8000);

            try { await page.click('#rewardedSkip'); } catch {}
            await sleep(3000);
            f = `${pre}-09-shop-menu.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            console.log(`  📸 ${f}`);
            log(country, ip, port, 'shop-menu');
        } catch {}

        // More page
        console.log(`  📋 Going to More...`);
        try {
            await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(4000);
            await page.evaluate(() => document.querySelectorAll('.tab')[2]?.click());
            await sleep(3000);

            // Scroll to bottom for ads
            await page.evaluate(() => window.scrollTo(0, 99999));
            await sleep(3000);
            f = `${pre}-10-more-bottom.png`;
            await page.screenshot({ path: path.join(DIR, f) });
            console.log(`  📸 ${f}`);
            log(country, ip, port, 'more-bottom');
        } catch {}

        console.log(`  ✅ ${country} DONE!`);
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
    console.log('║  AD CLICK TRACKER v3 — Randomized IPs + Full Flow        ║');
    console.log('║  Italy → Korea → Egypt → Germany                          ║');
    console.log('║  Name → Join → Ad → Wait → Continue → Shop → More        ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    let cycle = 1;

    async function run() {
        console.log(`\n🔄 CYCLE #${cycle} — ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`);

        // Fetch fresh proxy pools for each country
        const pools = {};
        for (const [country, info] of Object.entries(COUNTRIES)) {
            pools[country] = await getAllProxies(info.code);
            console.log(`  ${info.flag} ${country}: ${pools[country].length} proxies`);
        }
        console.log('');

        // Run each country with its own proxy pool
        for (const [country, info] of Object.entries(COUNTRIES)) {
            await runCountry(country, info, pools[country]);
        }

        console.log(`\n📂 Screenshots: ${DIR}`);
        console.log(`📊 Log: ${LOG}`);
        cycle++;
    }

    await run();

    console.log(`\n⏰ Next cycle in 5 min... Ctrl+C to stop\n`);
    setInterval(async () => {
        await run();
        console.log(`\n⏰ Next in 5 min...\n`);
    }, 5 * 60 * 1000);
}

main().catch(console.error);
