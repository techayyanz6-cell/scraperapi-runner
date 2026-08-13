const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const DIR = path.join(__dirname, 'ad-screenshots');
const LOG = path.join(DIR, 'country-scan.csv');
const CHROME = '/home/shaharyar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';

// Countries we want to check (Italy, Korea, Egypt, Germany + others)
const WANTED = ['IT', 'KR', 'EG', 'DE'];

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, 'time,ip,country,city,org,status\n');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(ip, country, city, org, status) {
    const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    fs.appendFileSync(LOG, `"${now}","${ip}","${country}","${city}","${org}","${status}"\n`);
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

async function main() {
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  COUNTRY SCAN — Tor Exit Nodes (No Screenshots)          ║');
    console.log('║  Testing: All countries, tracking IT/KR/EG/DE            ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const found = {};
    const wantedFound = {};
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

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
                    '--proxy-bypass-list=<-loopback>',
                ],
            });
            const page = await browser.newPage();

            const ipData = await checkIP(page);
            if (!ipData) {
                console.log(`  ⚠️  IP check failed`);
                log('-', '-', '-', '-', 'FAIL');
                continue;
            }

            console.log(`  🌐 IP: ${ipData.ip} | ${ipData.country} | ${ipData.city || ''} | ${ipData.org || ''}`);

            // Log everything
            log(ipData.ip, ipData.country, ipData.city || '', ipData.org || '', 'OK');

            // Track found countries
            if (!found[ipData.country]) {
                found[ipData.country] = { ip: ipData.ip, city: ipData.city, org: ipData.org, count: 1 };
                console.log(`  🆕 New country: ${ipData.country}`);
            } else {
                found[ipData.country].count++;
            }

            // Track wanted countries
            if (WANTED.includes(ipData.country)) {
                if (!wantedFound[ipData.country]) {
                    wantedFound[ipData.country] = [];
                }
                wantedFound[ipData.country].push(ipData.ip);
                console.log(`  🎯 MATCH! ${ipData.country} found! ${wantedFound[ipData.country].length} IPs so far`);
            }

            // Stop when all 4 target countries found
            const allFound = WANTED.every(c => wantedFound[c] && wantedFound[c].length >= 2);
            if (allFound) {
                console.log(`\n✅ ALL TARGET COUNTRIES FOUND!`);
                break;
            }
        } catch (e) {
            console.log(`  ❌ ${e.message.substring(0, 60)}`);
        } finally {
            if (browser) await browser.close().catch(() => {});
        }

        await sleep(3000);
    }

    // Results
    console.log(`\n${'═'.repeat(58)}`);
    console.log(`  📊 SCAN RESULTS`);
    console.log(`${'═'.repeat(58)}`);
    console.log(`  Attempts: ${attempts}`);
    console.log(`  Unique countries found: ${Object.keys(found).length}`);
    console.log('');

    // Show all found countries
    Object.entries(found).sort((a, b) => b[1].count - a[1].count).forEach(([cc, info]) => {
        const mark = WANTED.includes(cc) ? ' 🎯' : '';
        console.log(`  ${cc}${mark}: ${info.count}x | ${info.ip} | ${info.city}`);
    });

    console.log('');
    console.log('  🎯 TARGET COUNTRIES:');
    WANTED.forEach(cc => {
        if (wantedFound[cc]) {
            console.log(`  ✅ ${cc}: ${wantedFound[cc].join(', ')}`);
        } else {
            console.log(`  ❌ ${cc}: NOT FOUND`);
        }
    });

    console.log(`\n  📊 Log: ${LOG}`);
    console.log('');

    // Summary of target placement
    console.log('  Where target countries rank in Tor exit nodes:');
    console.log('  🇮🇹 IT (Italy) - common         🇰🇷 KR (Korea) - rare');
    console.log('  🇪🇬 EG (Egypt) - very rare      🇩🇪 DE (Germany) - common');
    console.log('  💡 Korea aur Egypt ke Tor exit nodes bahut rare hain.');
    console.log('  💡 Zyada attempts lag sakte hain. Script repeat karo.');
    console.log(`${'═'.repeat(58)}`);
}

main().catch(console.error);