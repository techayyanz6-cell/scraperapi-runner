const SMARTLINK = 'https://www.effectivecpmnetwork.com/rrnc6wkj20?key=7229316f30175f8124af706edbe27aa8';
const API = 'https://api.scraperapi.com';
const KEYS = [
  '6b4e707d1465a8c341dd92433efbafc1',
  'aaa648b5a372df84d6b0d86819005814'
];
const COUNTRIES = ['eg', 'fr', 'de', 'it', 'nl', 'ng'];
const REFERRERS = [
  'https://www.google.com/search?q=casino+bonus',
  'https://www.bing.com/search?q=live+streaming',
  'https://www.msn.com/', 'https://news.yahoo.com/',
  'https://www.dailymail.co.uk/', 'https://www.reddit.com/',
  'https://t.me/s/casino_bonuses', 'https://www.instagram.com/',
  'https://casino.org/', 'https://www.bet-tracker.com/',
  'https://www.top-casinos.de/', 'https://twitter.com/'
];
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
];
const LOG = '/home/shaharyar/Desktop/node/referrer_test.log';
const fs = require('fs');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG, line + '\n');
  console.log(line);
}

async function hit(key, country) {
  const referer = REFERRERS[Math.floor(Math.random() * REFERRERS.length)];
  const ua = UAS[Math.floor(Math.random() * UAS.length)];
  const params = new URLSearchParams({
    api_key: key, url: SMARTLINK, country, device: 'desktop',
    user_agent: ua, keep_headers: 'true', timeout: '20000'
  });
  const headers = { Referer: referer, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };
  try {
    const r = await fetch(`${API}?${params}`, { timeout: 30000, headers });
    const body = await r.text();
    const title = (body.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    log(`${country} ref=${referer.replace('https://www.', '').slice(0, 25)} status=${r.status} size=${body.length} title="${title.trim().slice(0, 40)}"`);
    return { status: r.status, size: body.length };
  } catch (e) {
    log(`${country} ERR ${String(e).slice(0, 60)}`);
    return { status: 'ERR' };
  }
}

async function main() {
  log('=== REFERRER TEST: 2 keys x 3 workers, no render, ~6 min ===');
  const startedAt = Date.now();
  let counter = 0;
  const stats = { ok: 0, redirect: 0, err: 0 };
  async function worker(key) {
    while ((Date.now() - startedAt) / 60000 < 6) {
      const country = COUNTRIES[(counter++) % COUNTRIES.length];
      const res = await hit(key, country);
      if (res.status === 200) stats.ok++;
      else if (res.status >= 300 && res.status < 400) stats.redirect++;
      else stats.err++;
      await new Promise(r => setTimeout(r, 800 + Math.floor(Math.random() * 1500)));
    }
  }
  const workers = [];
  for (const k of KEYS) for (let i = 0; i < 3; i++) workers.push(worker(k));
  await Promise.all(workers);
  log(`DONE ${((Date.now() - startedAt) / 60000).toFixed(1)}min ok=${stats.ok} redirect=${stats.redirect} err=${stats.err}`);
}

main().catch(e => { log('FATAL: ' + e); process.exit(1); });