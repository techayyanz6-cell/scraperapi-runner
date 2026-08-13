const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

const DIR = path.join(__dirname, 'ad-screenshots');
const LOG = path.join(DIR, 'vpn-sessions.csv');
const TARGET = 'https://pulsetech-adsterra-portal.surge.sh';
const CHROME = '/home/shaharyar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const VPNDIR = '/tmp/vpngate';
const INTERVAL = 5 * 60 * 1000;

const COUNTRIES = {
    'KR': 'Korea',
    'DE': 'Germany',
    'IT': 'Italy',
    'EG': 'Egypt',
};
const NAMES = ['Ahmed', 'Ali', 'Sara', 'Fatima', 'Hassan', 'Usman', 'Zainab', 'Ayesha', 'Bilal', 'Omar'];

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
if (!fs.existsSync(VPNDIR)) fs.mkdirSync(VPNDIR, { recursive: true });
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, 'time,country,ip,actions\n');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(country, ip, actions) {
    const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    fs.appendFileSync(LOG, `"${now}","${country}","${ip}","${actions}"\n`);
}

function fetchCsv() {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec('curl -s --noproxy "*" --max-time 30 "https://www.vpngate.net/api/iphone/" -H "User-Agent: Mozilla/5.0"', (err, stdout) => {
            if (err || !stdout || stdout.length < 100) reject(new Error('fetch failed')); else resolve(stdout);
        });
    });
}

async function getVpnConfig(cc) {
    const csv = await fetchCsv();
    const lines = csv.split('\n').slice(2);
    let best = null;
    for (const line of lines) {
        const p = line.split(',');
        if (p.length < 15) continue;
        if (p[6] === cc && !isNaN(parseInt(p[3])) && parseInt(p[3]) < 120) {
            if (!best || parseInt(p[3]) < parseInt(best[3])) best = p;
        }
    }
    if (best) {
        const config = Buffer.from(best[14], 'base64').toString('utf8');
        const file = path.join(VPNDIR, `${cc}.ovpn`);
        fs.writeFileSync(file, config);
        return { file, ip: best[1], host: best[0], ping: best[3] };
    }
    return null;
}

async function connectVpn(cc) {
    // Kill old VPN
    try { execSync('sudo pkill -f "openvpn --config /tmp/vpngate" 2>/dev/null; sleep 3'); } catch {}
    // Also flush routes to be safe
    try { execSync('sudo pkill openvpn 2>/dev/null; sleep 3'); } catch {}

    const vpn = await getVpnConfig(cc);
    if (!vpn) {
        console.log(`    ❌ No ${cc} server available on VPN Gate`);
        return null;
    }
    console.log(`    📡 Connecting to ${cc}: ${vpn.host} (${vpn.ip}) ping ${vpn.ping}ms`);

    execSync(`sudo nohup openvpn --config ${vpn.file} --disable-dco > /tmp/vpngate/${cc}.log 2>&1 &`, { shell: '/bin/bash' });

    // Wait for connection
    for (let i = 0; i < 10; i++) {
        await sleep(3000);
        try {
            const ip = execSync('curl -s --noproxy "*" --max-time 10 "https://api.ipify.org"').toString().trim();
            if (ip && ip.length > 6) {
                return { ip };
            }
        } catch {}
    }
    return null;
}

async function disconnectVpn() {
    try { execSync('sudo pkill -f "openvpn --config /tmp/vpngate" 2>/dev/null; sleep 2'); } catch {}
    console.log(`    🔌 VPN disconnected`);
}

async function fullProcess(country, ip) {
    const actions = [];
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: CHROME,
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--proxy-server=direct://',
            ],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        console.log(`    📱 Visiting https://pulsetech-adsterra-portal.surge.sh...`);
        try { await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 25000 }); } catch {}
        for (let i = 0; i < 12; i++) {
            await sleep(2000);
            const t = await page.title();
            if (t.includes('Narowalians')) break;
        }
        await sleep(4000);
        actions.push('visit');

        // Type name
        try {
            await page.waitForSelector('#chatName', { timeout: 8000 });
            await page.type('#chatName', name, { delay: 60 });
            await sleep(1000);
            actions.push('name:' + name);
            console.log(`    ✍️  Name: ${name}`);
        } catch {
            console.log(`    ⚠️  No name input`);
        }

        // Join Chat → rewarded ad
        try {
            await page.evaluate(() => {
                [...document.querySelectorAll('button')].find(b => b.textContent.includes('Join Chat'))?.click();
            });
            await sleep(3000);
            const adVisible = await page.evaluate(() => {
                const o = document.querySelector('#rewardedOverlay');
                return o ? o.classList.contains('show') : false;
            });
            if (adVisible) {
                actions.push('ad-popup');
                console.log(`    🎬 AD POPUP SHOWING!`);
                await sleep(8000); // wait for 5s timer
                actions.push('ad-wait');
                try {
                    await page.click('#rewardedSkip');
                    await sleep(3000);
                    actions.push('ad-continue');
                    console.log(`    ▶️  Ad continued`);
                } catch {}
            } else {
                actions.push('no-ad');
                console.log(`    ⚠️  No ad popup`);
            }
        } catch (e) {
            console.log(`    ❌ join: ${e.message.substring(0, 30)}`);
        }

        // Shops
        try {
            await page.evaluate(() => document.querySelectorAll('.tab')[1]?.click());
            await sleep(4000);
            actions.push('shops');
        } catch {}

        // View menu → rewarded ad
        try {
            await page.evaluate(() => document.querySelector('.order-btn')?.click());
            await sleep(3000);
            const ad2 = await page.evaluate(() => {
                const o = document.querySelector('#rewardedOverlay');
                return o ? o.classList.contains('show') : false;
            });
            if (ad2) {
                actions.push('shop-ad');
                console.log(`    🎬 Shop ad showing!`);
                await sleep(8000);
                try { await page.click('#rewardedSkip'); } catch {}
                await sleep(3000);
                actions.push('shop-ad-done');
            }
        } catch {}

        // More page
        try {
            await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(3000);
            await page.evaluate(() => document.querySelectorAll('.tab')[2]?.click());
            await sleep(3000);
            await page.evaluate(() => window.scrollTo(0, 99999));
            await sleep(3000);
            actions.push('more');
        } catch {}

        console.log(`    ✅ ${country} COMPLETE (${ip})`);
        return actions.join('|');

    } catch (e) {
        console.log(`    ❌ ${e.message.substring(0, 50)}`);
        actions.push('error');
        return actions.join('|');
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

async function runCycle() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  🔄 CYCLE — ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`);
    console.log(`${'═'.repeat(60)}`);

    for (const [cc, country] of Object.entries(COUNTRIES)) {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`  🌍 ${country} (${cc})`);
        console.log(`${'─'.repeat(50)}`);

        const vpn = await connectVpn(cc);
        if (!vpn) {
            console.log(`    ⚠️  Skipping ${country} - no VPN available`);
            continue;
        }
        console.log(`    ✅ Connected! IP: ${vpn.ip}`);

        const actions = await fullProcess(country, vpn.ip);
        log(country, vpn.ip, actions);

        await disconnectVpn();
    }
}

async function main() {
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  VPN GATE COUNTRY TRACKER — Real IPs From Each Country  ║');
    console.log('║  Korea → Germany → Italy → Egypt                         ║');
    console.log('║  OpenVPN + VPN Gate public servers                       ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    await runCycle();

    console.log(`\n⏰ Next cycle in ${INTERVAL / 60000} min... Ctrl+C to stop\n`);
    setInterval(async () => {
        await runCycle();
        console.log(`\n⏰ Next in ${INTERVAL / 60000} min...\n`);
    }, INTERVAL);
}

main().catch(console.error);