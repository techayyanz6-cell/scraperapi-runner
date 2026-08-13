const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const DIR = path.join(__dirname, 'ad-screenshots');
const LOG = path.join(DIR, 'full-process.csv');
const TARGET = 'https://pulsetech-adsterra-portal.surge.sh';
const CHROME = '/home/shaharyar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';

const WANTED = ['IT', 'KR', 'EG', 'DE'];
const NAMES = ['Ahmed', 'Ali', 'Sara', 'Fatima', 'Hassan', 'Usman', 'Zainab', 'Ayesha', 'Bilal', 'Omar'];

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, 'time,ip,country,city,org,actions\n');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(ip, country, city, org, actions) {
    const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    fs.appendFileSync(LOG, `"${now}","${ip}","${country}","${city}","${org}","${actions}"\n`);
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

// Full ad interaction process without screenshots
async function fullProcess(ipData) {
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
                '--proxy-server=socks5://127.0.0.1:9050',
            ],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        // Visit site
        try { await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 25000 }); } catch {}
        for (let i = 0; i < 12; i++) {
            await sleep(2000);
            const t = await page.title();
            if (t.includes('Narowalians')) break;
        }
        await sleep(4000);
        actions.push('visited');

        // Type name
        try {
            await page.waitForSelector('#chatName', { timeout: 8000 });
            await page.type('#chatName', name, { delay: 50 });
            await sleep(1000);
            actions.push('name:' + name);
            console.log(`    ✍️  name typed`);
        } catch {
            console.log(`    ⚠️  no name input`);
        }

        // Click Join Chat → rewarded ad
        try {
            await page.evaluate(() => {
                [...document.querySelectorAll('button')].find(b => b.textContent.includes('Join Chat'))?.click();
            });
            await sleep(4000);
            // Check ad popup visible
            const adVisible = await page.evaluate(() => {
                const o = document.querySelector('#rewardedOverlay');
                return o ? o.classList.contains('show') : false;
            });
            if (adVisible) {
                actions.push('ad-popup');
                console.log(`    🎬 AD POPUP VISIBLE!`);
                // Wait for timer
                await sleep(8000);
                actions.push('ad-waited');
                console.log(`    ⏳ ad waited`);
                // Click Continue
                try {
                    await page.click('#rewardedSkip');
                    await sleep(3000);
                    actions.push('ad-continued');
                    console.log(`    ▶️  ad continued`);
                } catch {}
            } else {
                actions.push('no-ad');
                console.log(`    ⚠️  no ad popup`);
            }
        } catch (e) {
            console.log(`    ❌ join: ${e.message.substring(0, 30)}`);
        }

        // Shops tab
        try {
            await page.evaluate(() => document.querySelectorAll('.tab')[1]?.click());
            await sleep(4000);
            actions.push('shops');
            console.log(`    🛒 shops visited`);
        } catch {}

        // Click View Menu → another rewarded ad
        try {
            await page.evaluate(() => document.querySelector('.order-btn')?.click());
            await sleep(3000);
            const adVisible = await page.evaluate(() => {
                const o = document.querySelector('#rewardedOverlay');
                return o ? o.classList.contains('show') : false;
            });
            if (adVisible) {
                actions.push('shop-ad');
                console.log(`    🎬 SHOP AD VISIBLE!`);
                await sleep(8000);
                try { await page.click('#rewardedSkip'); } catch {}
                await sleep(3000);
                actions.push('shop-ad-done');
                console.log(`    ▶️ shop ad continued`);
            } else {
                actions.push('shop-no-ad');
                console.log(`    ⚠️ no shop ad`);
            }
        } catch {}

        // More page bottom
        try {
            await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(3000);
            await page.evaluate(() => window.scrollTo(0, 99999));
            await sleep(3000);
            actions.push('more-bottom');
            console.log(`    📋 more visited`);
        } catch {}

        // Smart link click
        try {
            await page.evaluate(() => {
                const l = document.querySelector('a[href*="effectivecpmnetwork"]');
                if (l) l.click();
            });
            await sleep(3000);
            actions.push('smartlink');
            console.log(`    🔗 smart link clicked`);
        } catch {}

        console.log(`  ✅ ${ipData.country} PROCESS COMPLETE`);
        return actions.join('|');

    } catch (e) {
        console.log(`  ❌ ${e.message.substring(0, 50)}`);
        actions.push('error');
        return actions.join('|');
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

async function main() {
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  FULL PROCESS — All Countries (No Screenshots)           ║');
    console.log('║  Visit → Name → Join → Ad → Wait → Continue → Shops      ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const countriesDone = {};
    const wantedDone = {};
    let attempts = 0;
    const MAX_ATTEMPTS = 80;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`\n📡 Attempt #${attempts} (new Tor circuit)`);

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                executablePath: CHROME,
                args: [
                    '--no-sandbox', '--disable-setuid-sandbox',
                    '--proxy-server=socks5://127.0.0.1:9050',
                ],
            });
            const page = await browser.newPage();

            const ipData = await checkIP(page);
            if (!ipData) {
                console.log(`  ⚠️  IP check failed, retrying...`);
                continue;
            }

            console.log(`  🌐 IP: ${ipData.ip} | ${ipData.country} | ${ipData.city || ''}`);

            // Process from this country if not done yet (do all countries, one session each)
            if (!countriesDone[ipData.country]) {
                console.log(`  🆕 NEW COUNTRY: ${ipData.country} — running full process`);
                const actions = await fullProcess(ipData);
                countriesDone[ipData.country] = { ip: ipData.ip, city: ipData.city, actions };
                log(ipData.ip, ipData.country, ipData.city || '', ipData.org || '', actions);

                if (WANTED.includes(ipData.country)) {
                    wantedDone[ipData.country] = true;
                }
            } else {
                console.log(`  ⏩ ${ipData.country} already processed (${countriesDone[ipData.country].ip})`);
            }
        } catch (e) {
            console.log(`  ❌ ${e.message.substring(0, 50)}`);
        } finally {
            if (browser) await browser.close().catch(() => {});
        }

        await sleep(2000);
    }

    // Results
    console.log(`\n${'═'.repeat(58)}`);
    console.log(`  📊 FINAL RESULTS`);
    console.log(`${'═'.repeat(58)}`);
    console.log(`  Attempts: ${attempts}`);
    console.log(`  Countries processed: ${Object.keys(countriesDone).length}`);
    console.log('');
    Object.entries(countriesDone).forEach(([cc, info]) => {
        const mark = WANTED.includes(cc) ? ' 🎯' : '';
        console.log(`  ${cc}${mark}: ${info.ip} | ${info.city} | ${info.actions}`);
    });
    console.log('');
    console.log('  🎯 TARGET COUNTRIES:');
    WANTED.forEach(cc => {
        console.log(`  ${wantedDone[cc] ? '✅' : '❌'} ${cc} ${wantedDone[cc] ? 'done' : 'NOT FOUND'}`);
    });
    console.log(`\n  📊 Log: ${LOG}`);
    console.log(`${'═'.repeat(58)}`);
}

main().catch(console.error);