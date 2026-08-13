let puppeteer, StealthPlugin;
try {
  puppeteer = require('/home/shaharyar/Desktop/site/node_modules/puppeteer-extra');
  StealthPlugin = require('/home/shaharyar/Desktop/site/node_modules/puppeteer-extra-plugin-stealth');
} catch (e) {
  puppeteer = require('/home/shaharyar/Desktop/node/node_modules/puppeteer-extra');
  StealthPlugin = require('/home/shaharyar/Desktop/node/node_modules/puppeteer-extra-plugin-stealth');
}
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CHROME = '/home/shaharyar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const LOG = fs.existsSync('/home/shaharyar/Desktop/site') ? '/home/shaharyar/Desktop/site/browser_clicks.log' : '/home/shaharyar/Desktop/node/browser_clicks.log';
const SITE = 'https://tech.narowalians.online/';
const DIRECT_LINKS = [
  'https://www.effectivecpmnetwork.com/f0qx2zbz?key=55c9b86cf539b6f87e8274e633eafcf0',
  'https://www.effectivecpmnetwork.com/ychumnca?key=d926c91e2df60b9b0e204aaf0bc24c62',
  'https://www.effectivecpmnetwork.com/rrnc6wkj20?key=7229316f30175f8124af706edbe27aa8'
];

// Command line arguments support
const API_KEY = process.argv[2] || 'f42e399032fcfc7c8c6f77736b571c0e';
const MAX_MINUTES = (!process.argv[3] || process.argv[3] === 'all') ? Infinity : (parseFloat(process.argv[3]) || 14);
const POOL_MODE = process.argv[4] || 'all';
const PROXY_HOST = 'proxy-server.scraperapi.com:8001';

const COUNTRY_POOLS = {
  tier1: [
    { n: 'Germany', c: 'de', tz: 'Europe/Berlin', lang: 'de-DE,de;q=0.9,en;q=0.8' },
    { n: 'Netherlands', c: 'nl', tz: 'Europe/Amsterdam', lang: 'nl-NL,nl;q=0.9,en;q=0.8' },
    { n: 'United States', c: 'us', tz: 'America/New_York', lang: 'en-US,en;q=0.9' },
    { n: 'United Kingdom', c: 'gb', tz: 'Europe/London', lang: 'en-GB,en;q=0.9' }
  ],
  us: [{ n: 'United States', c: 'us', tz: 'America/New_York', lang: 'en-US,en;q=0.9' }],
  de: [{ n: 'Germany', c: 'de', tz: 'Europe/Berlin', lang: 'de-DE,de;q=0.9,en;q=0.8' }],
  ng: [{ n: 'Nigeria', c: 'ng', tz: 'Africa/Lagos', lang: 'en-NG,en;q=0.9' }],
  all: [
    { n: 'Germany', c: 'de', tz: 'Europe/Berlin', lang: 'de-DE,de;q=0.9,en;q=0.8' },
    { n: 'Netherlands', c: 'nl', tz: 'Europe/Amsterdam', lang: 'nl-NL,nl;q=0.9,en;q=0.8' },
    { n: 'United States', c: 'us', tz: 'America/New_York', lang: 'en-US,en;q=0.9' },
    { n: 'India', c: 'in', tz: 'Asia/Kolkata', lang: 'en-IN,en;q=0.9,hi;q=0.8' },
    { n: 'Brazil', c: 'br', tz: 'America/Sao_Paulo', lang: 'pt-BR,pt;q=0.9,en;q=0.8' },
    { n: 'United Kingdom', c: 'gb', tz: 'Europe/London', lang: 'en-GB,en;q=0.9' }
  ]
};

const COUNTRIES = COUNTRY_POOLS[POOL_MODE] || COUNTRY_POOLS.all;
const NAMES = ['Alex', 'Jordan', 'Sam', 'Chris', 'Ryan', 'Max', 'Leo', 'Tom', 'Ali', 'Omar'];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG, line + '\n');
  console.log(line);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryClickIframeAds(page) {
  const clicked = [];
  try {
    const iframes = await page.$$('iframe');
    for (let i = 0; i < iframes.length; i++) {
      const f = iframes[i];
      try {
        const box = await f.boundingBox();
        if (!box) continue;
        const info = await f.evaluate(el => ({
          src: el.src ? el.src.slice(0, 80) : '',
          w: el.clientWidth,
          h: el.clientHeight
        })).catch(() => ({ src: '', w: 0, h: 0 }));
        if (info.w < 30 || info.h < 20) continue;
        log(`  🖱 iframe click #${i + 1}: ${info.src || '(blank)'} at (${Math.round(box.x + box.width / 2)}, ${Math.round(box.y + box.height / 2)})`);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 80 + Math.random() * 150 });
        clicked.push(info.src || `iframe#${i}`);
        await sleep(1200 + Math.random() * 1500);
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
  return clicked;
}

async function runSession(countryInfo) {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  log(`${countryInfo.n} session (${name}): scraperapi-proxy(${countryInfo.c}) site=${SITE}`);

  let browser;
  try {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,900',
      '--proxy-server=http://proxy-server.scraperapi.com:8001',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      // Block WebRTC to prevent IP leak through Adsterra/ad scripts
      '--disable-features=WebRtcHideLocalIpsWithMdns',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      // DNS through proxy
      '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE proxy-server.scraperapi.com'
    ];
    browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args, protocolTimeout: 120000 });
    const page = await browser.newPage();
    
    // Correct ScraperAPI proxy authentication with country targeting in username
    await page.authenticate({
      username: `scraperapi.country_code=${countryInfo.c.toLowerCase()}`,
      password: API_KEY
    });

    // Block WebRTC in page to prevent IP leaks to ad scripts
    await page.evaluateOnNewDocument(() => {
      const nativeRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function(config) {
        if (config && config.iceServers) config.iceServers = [];
        return new nativeRTCPeerConnection(config);
      };
      Object.assign(window.RTCPeerConnection, nativeRTCPeerConnection);
    });

    if (countryInfo.tz) {
      await page.emulateTimezone(countryInfo.tz).catch(() => {});
    }
    await page.setExtraHTTPHeaders({
      'Accept-Language': countryInfo.lang || 'en-US,en;q=0.9'
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    // Enable request interception to save ScraperAPI credits by blocking heavy assets
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      const url = req.url();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else if (url.includes('google-analytics') || url.includes('analytics.js') || url.includes('gtag')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    log(`  verifying proxy IP...`);
    let proxyIp = '';
    const ipCheckUrls = [
      () => fetch('https://httpbin.org/ip').then(r => r.json()).then(d => d.origin),
      () => fetch('https://api64.ipify.org?format=json').then(r => r.json()).then(d => d.ip),
      () => fetch('https://checkip.amazonaws.com/').then(r => r.text()).then(t => t.trim())
    ];
    for (const checkFn of ipCheckUrls) {
      try {
        proxyIp = await page.evaluate(checkFn).catch(() => '');
        if (proxyIp && proxyIp.length > 4) break;
      } catch {}
    }
    log(`  proxy IP: ${proxyIp || 'UNKNOWN'}`);

    // Skip session if proxy not working (UNKNOWN = likely Pakistan local IP)
    if (!proxyIp || proxyIp.includes('exhausted') || proxyIp.includes('Credit')) {
      log(`  ⚠️ Proxy verification failed (or credits exhausted) — skipping session to avoid Pakistan traffic`);
      return;
    }

    log(`  loading site (${name})...`);
    try { await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 35000 }); } catch (e) {
      for (let i = 0; i < 6; i++) { await sleep(3000); const t = await page.title().catch(() => ''); if (t.trim()) break; }
    }
    // Extra wait + initial scroll so Adsterra ads have time to render
    await sleep(4000);
    await page.evaluate(() => window.scrollBy(0, 300)).catch(() => {});
    await sleep(4000);

    const title = (await page.title().catch(() => '')) || '';
    const url = page.url();
    log(`  opened: title="${title.slice(0, 50)}" url=${url.slice(0, 60)}`);

    const adBoxes = await page.evaluate(() => {
      const ids = ['adsterra-header', 'adsterra-native', 'adsterra-sidebar-1', 'adsterra-sidebar-2', 'stickyAdBox'];
      return ids.map(id => {
        const el = document.getElementById(id);
        return el ? { id, w: el.clientWidth, h: el.clientHeight } : null;
      }).filter(Boolean);
    }).catch(() => []);
    log(`  ad boxes visible: ${adBoxes.length} -> ${adBoxes.map(b => `${b.id}(${b.w}x${b.h})`).join(', ')}`);

    const iframeClicks = await tryClickIframeAds(page);
    log(`  iframe ad clicks: ${iframeClicks.length} registered`);

    const targetDirectLink = DIRECT_LINKS[Math.floor(Math.random() * DIRECT_LINKS.length)];
    const directBtn = await page.$('.btn-direct-link, a[href*="effectivecpmnetwork"]').catch(() => null);
    if (directBtn) {
      log(`  🖱 clicking Direct Link button...`);
      try {
        await Promise.race([
          directBtn.click({ delay: 100 }),
          sleep(8000)
        ]);
        await sleep(3000);
      } catch (e) { log(`  direct link click failed: ${String(e).slice(0, 60)}`); }
    }

    // Always also open a CPM Direct Link tab for extra impressions
    log(`  🚀 CPM Direct Link: ${targetDirectLink.slice(0, 55)}...`);
    if (browser && browser.connected) {
      try {
        const directPage = await browser.newPage();
        await directPage.authenticate({
          username: `scraperapi.country_code=${countryInfo.c.toLowerCase()}`,
          password: API_KEY
        });
        await directPage.goto(targetDirectLink, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await sleep(5000);
      } catch (e) { log(`  CPM link visit failed: ${String(e).slice(0, 60)}`); }
    }

    // Wait for popups/ad pages to load
    log(`  ⏳ Waiting 10s for clicked ads / popups to fully open...`);
    await sleep(10000);

    const pages = await browser.pages();
    if (pages.length > 1) {
      log(`  📢 ${pages.length - 1} ad/popup pages detected. Processing...`);
      for (let i = 1; i < pages.length; i++) {
        const adPage = pages[i];
        try {
          await adPage.bringToFront().catch(() => {});
          const adTitle = await adPage.title().catch(() => 'Ad Page');
          const adUrl = adPage.url();
          log(`    [Ad Tab #${i}] Title: "${adTitle.slice(0, 40)}" | URL: ${adUrl.slice(0, 50)}`);
          
          log(`    [Ad Tab #${i}] Waiting 8s for ad content to load...`);
          await sleep(8000);

          // Scroll a bit to simulate real user engagement
          await adPage.evaluate(() => window.scrollBy(0, 200 + Math.random() * 300)).catch(() => {});
          await sleep(2000);

          // Click a random link on the ad page to generate real user interaction (high CPM!)
          const links = await adPage.$$eval('a[href^="http"]', el => el.map(a => a.href)).catch(() => []);
          if (links.length > 0) {
            log(`    [Ad Tab #${i}] Simulating interaction click on ad page...`);
            await adPage.click('a[href^="http"]', { delay: 150 }).catch(() => {});
            await sleep(5000);
          }

          log(`    [Ad Tab #${i}] Closing ad page.`);
          await adPage.close().catch(() => {});
        } catch (e) {
          log(`    [Ad Tab #${i}] Error: ${e.message.slice(0, 60)}`);
        }
      }
    }

    // Small scroll on main page and finish session
    const scrollSteps = 2 + Math.floor(Math.random() * 2);
    for (let s = 0; s < scrollSteps; s++) {
      await page.evaluate(y => window.scrollBy(0, y), 200 + Math.floor(Math.random() * 200)).catch(() => {});
      await sleep(2000);
    }
    log(`  ${countryInfo.n} session CLOSED`);
  } catch (e) {
    log(`  session ERR: ${String(e).slice(0, 80)}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function main() {
  const shortKey = API_KEY.slice(0, 8);
  log(`=== BROWSER CLICKER v4 [Key:${shortKey}] (ScraperAPI Proxy Mode | Mins:${MAX_MINUTES} | Pool:${POOL_MODE}) ===`);
  const startTime = Date.now();

  while (true) {
    if (MAX_MINUTES !== Infinity && (Date.now() - startTime) > MAX_MINUTES * 60 * 1000) {
      log(`[${shortKey}] Max duration (${MAX_MINUTES} mins) reached. Exiting.`);
      break;
    }
    const info = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    await runSession(info);
    const gap = 15 + Math.floor(Math.random() * 25);
    log(`[${shortKey}] next session in ${gap}s...`);
    await sleep(gap * 1000);
  }
}

main().catch(e => { log('FATAL: ' + e); process.exit(1); });
