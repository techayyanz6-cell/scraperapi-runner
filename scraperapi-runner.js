const fs = require('fs');
const config = require('/home/shaharyar/Desktop/narowalians/config.json');

const API = 'https://api.scraperapi.com';
const SMARTLINK_LIST = [
  'https://www.effectivecpmnetwork.com/mw6dcxpxp?key=a82a80fb72016668fb27decb6d8d487e',
  'https://www.effectivecpmnetwork.com/ychumnca?key=d926c91e2df60b9b0e204aaf0bc24c62',
  'https://www.effectivecpmnetwork.com/rrnc6wkj20?key=7229316f30175f8124af706edbe27aa8',
  'https://www.effectivecpmnetwork.com/f0qx2zbz?key=55c9b86cf539b6f87e8274e633eafcf0'
];
const SMARTLINK = () => pick(SMARTLINK_LIST);
const COUNTRIES = ['ng', 'eg', 'fr', 'de', 'it', 'nl', 'us', 'gb', 'ca', 'au', 'za', 'sg'];
const COUNTRY_POOLS = {
  ng: ['ng', 'ng', 'ng', 'ng'],
  tier1: ['us', 'us', 'gb', 'gb', 'ca', 'au', 'za', 'sg'],
  all: ['ng', 'ng', 'ng', 'ng', 'us', 'us', 'us', 'gb', 'ca', 'au', 'za', 'eg', 'fr', 'de', 'it', 'nl'],
  usng: ['us', 'us', 'us', 'ng', 'ng', 'ng', 'ca', 'gb', 'au'],
  top: ['ng', 'ng', 'ng', 'us', 'us', 'gb', 'ca', 'au', 'de', 'nl', 'za'],
  ngmix: ['ng', 'ng', 'ng', 'ng', 'ng', 'ng', 'us', 'gb', 'ca', 'au', 'za'],
  landing: ['ng', 'ng', 'ng', 'ng', 'de', 'de', 'nl', 'nl', 'us', 'gb', 'ca', 'au', 'za'],
  fill: ['ng', 'ng', 'ng', 'ng', 'ng', 'ng', 'eg', 'eg', 'de', 'de', 'nl', 'it']
};
const POOL_MODE = process.argv[5] || 'all';
const COUNTRY_POOL = COUNTRY_POOLS[POOL_MODE] || COUNTRY_POOLS.all;
const WORKERS_PER_KEY = 4;
const MAX_MINUTES = process.argv[2] === 'all' ? Infinity : (parseFloat(process.argv[2]) || 14);
const ONLY_KEY = process.argv[3] || null;
const LOG = '/home/shaharyar/Desktop/node/scraperapi_sessions.log';
const STATE = '/home/shaharyar/Desktop/node/scraperapi_state.json';
const CREDITS_FILE = '/home/shaharyar/Desktop/node/scraperapi_credits.json';
const DESKTOP_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0'
];
const MOBILE_UAS = [
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function isJunk(href) {
  const h = href.toLowerCase();
  if (/(\.css|\.js|\.png|\.jpe?g|\.gif|\.svg|\.webp|\.woff2?|\.ico|\.json|\.xml|\.txt|\.map)(\?|#|$)/.test(h)) return true;
  if (/(fonts\.|googleapis|google-analytics|gstatic|googletagmanager|jsdelivr|cdnjs|jquery|bootstrapcdn|cloudflare|analytics|metrics)/.test(h)) return true;
  return false;
}

function extractAds(body) {
  const seen = new Set();
  const urls = [];
  const re = /href="([^"]+)"/g;
  let m;
  while ((m = re.exec(body))) {
    const u = m[1].replace(/&amp;/g, '&');
    if (!u || !u.startsWith('http')) continue;
    if (/(javascript:|mailto:|#|facebook\.com|twitter\.com|youtube\.com|instagram\.com)/.test(u)) continue;
    if (isJunk(u)) continue;
    if (!seen.has(u)) { seen.add(u); urls.push(u); }
  }
  return urls.slice(0, 5);
}

function getCredits(key) {
  return new Promise((resolve) => {
    fetch(`${API}/account?api_key=${key}`, { timeout: 15000 })
      .then(r => r.json())
      .then(j => resolve({ credits: j.creditsLeft || 0, requests: j.requestCount || 0 }))
      .catch(() => resolve({ credits: -1, requests: 0 }));
  });
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG, line + '\n');
  console.log(line);
}

async function render(key, country, device, full) {
  const ua = device === 'mobile' ? pick(MOBILE_UAS) : pick(DESKTOP_UAS);
  const params = new URLSearchParams({
    api_key: key, url: SMARTLINK(), country, device, user_agent: ua
  });
  if (full) {
    params.set('render', 'true');
    params.set('wait_until', 'networkidle2');
  }
  try {
    const r = await fetch(`${API}?${params}`, { timeout: full ? 100000 : 30000 });
    const body = await r.text();
    const title = (body.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    const adRefs = full ? (body.match(/effectivecpm/g) || []).length
      + (body.match(/highperformanceformat/g) || []).length
      + (body.match(/rtmark/g) || []).length : 0;
    const isLanding = r.status === 200 && body.length > 1000 && (full ? true : title.trim().length > 0);
    return { status: r.status, size: body.length, title: title.trim().slice(0, 60), adRefs, landing: isLanding || (!full && r.status === 200 && body.length > 1000), device, ads: (full && isLanding) ? extractAds(body) : [] };
  } catch (e) {
    return { status: 'ERR', size: 0, title: '', adRefs: 0, landing: false, err: String(e).slice(0, 60), device, ads: [] };
  }
}

async function clickAd(key, country, device, ua, url) {
  const params = new URLSearchParams({
    api_key: key, url, country, device, user_agent: ua
  });
  try {
    const r = await fetch(`${API}?${params}`, { timeout: 60000 });
    const body = await r.text();
    const title = (body.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    const success = r.status >= 200 && r.status < 400;
    return { status: r.status, size: body.length, title: title.trim().slice(0, 60), success };
  } catch (e) {
    return { status: 'ERR', size: 0, title: '', success: false, err: String(e).slice(0, 60) };
  }
}

async function renderSimple(key, country, device, ua) {
  const params = new URLSearchParams({
    api_key: key, url: SMARTLINK(), country, device, user_agent: ua
  });
  try {
    const r = await fetch(`${API}?${params}`, { timeout: 60000 });
    const body = await r.text();
    const title = (body.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    return { status: r.status, size: body.length, title: title.trim().slice(0, 60), landing: r.status === 200 && body.length > 1000 && title.trim().length > 0, device };
  } catch (e) {
    return { status: 'ERR', size: 0, title: '', landing: false, err: String(e).slice(0, 60), device };
  }
}

function saveState(state) {
  state.updated = new Date().toISOString();
  try { fs.writeFileSync(STATE, JSON.stringify(state, null, 1)); } catch {}
}

function saveCredits(key, info) {
  let all = {};
  try { all = JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf-8')); } catch {}
  all[key] = { ...info, at: new Date().toISOString() };
  try { fs.writeFileSync(CREDITS_FILE, JSON.stringify(all, null, 1)); } catch {}
}

async function main() {
  console.log('=== SCRAPERAPI NODE RUNNER v4 (per-key control) ===');
  const keys = ONLY_KEY ? [ONLY_KEY] : (config.keys || []);
  const active = [];
  for (const k of keys) {
    const info = await getCredits(k);
    log(`key ${k.slice(0, 8)}... credits=${info.credits} requests=${info.requests}`);
    saveCredits(k, info);
    if (info.credits > 100) active.push({ key: k });
  }
  if (!active.length) { log('No active keys'); return; }

  const state = { visits: 0, landings: 0, empty: 0, errors: 0, clicks: 0, clickSuccess: 0, perCountry: {}, perKey: {} };
  const startedAt = Date.now();
  let activeSessions = 0;
  const MAX_SESSIONS = 3;

  async function clickSession(key, country, device, ads, pc, pk) {
    const uaBase = device === 'mobile' ? MOBILE_UAS : DESKTOP_UAS;
    const queue = [...ads].sort(() => Math.random() - 0.5).slice(0, 3);
    try {
      for (let ci = 0; ci < queue.length; ci++) {
        await new Promise(r => setTimeout(r, 1500 + Math.floor(Math.random() * 1500)));
        const click = await clickAd(key, country, device, pick(uaBase), queue[ci]);
        state.clicks++; pc.clicks++; pk.clicks++;
        if (click.success) {
          state.clickSuccess++; pc.clickSuccess++; pk.clickSuccess++;
          log(`${country}/${device} [${key.slice(0, 8)}] SESSION-CLICK(${ci + 1}/3)-OK size=${click.size} url=${queue[ci].slice(0, 60)}`);
        } else {
          log(`${country}/${device} [${key.slice(0, 8)}] SESSION-CLICK(${ci + 1}/3)-FAIL ${click.status} ${click.err || ''} url=${queue[ci].slice(0, 60)}`);
        }
        if (ci < queue.length - 1) {
          const stay = 60 + Math.floor(Math.random() * 60);
          log(`${country}/${device} [${key.slice(0, 8)}] SESSION stays open ${stay}s before next click`);
          await new Promise(r => setTimeout(r, stay * 1000));
        }
      }
      log(`${country}/${device} [${key.slice(0, 8)}] SESSION closed`);
    } catch (e) {
      log(`SESSION ERR ${String(e).slice(0, 60)}`);
    } finally {
      activeSessions--;
    }
  }

  async function worker(key, keyIdx) {
    let backoff = 0;
    while (true) {
      if ((Date.now() - startedAt) / 60000 >= MAX_MINUTES) return;
      // skip if key exhausted
      const info = await getCredits(key);
      saveCredits(key, info);
      if (info.credits <= 50) {
        log(`key ${key.slice(0, 8)} exhausted (${info.credits}) - worker ${keyIdx} quits`);
        return;
      }
      let country = COUNTRY_POOL[Math.floor(Math.random() * COUNTRY_POOL.length)];
      const device = pick(['desktop', 'desktop', 'desktop', 'mobile', 'mobile']);
      const full = Math.random() < (parseFloat(process.argv[6]) / 100 || 0.5);
      let res = await render(key, country, device, full);
      const pk = state.perKey[key] = state.perKey[key] || { visits: 0, landings: 0, errors: 0, clicks: 0, clickSuccess: 0 };
      if (res.status === 429 || res.status === 499 || res.status === 403) {
        state.errors++; pk.errors++;
        backoff = Math.min(backoff + 5000, 30000);
        log(`${country} [${key.slice(0, 8)}] ${res.status} backoff=${backoff / 1000}s`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      if (res.status === 200 && !res.landing) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          const c2 = COUNTRY_POOL[Math.floor(Math.random() * COUNTRY_POOL.length)];
          const d2 = pick(['desktop', 'desktop', 'desktop', 'mobile', 'mobile']);
          log(`${country}/${res.device} [${key.slice(0, 8)}] EMPTY size=${res.size} -> retry${attempt} ${c2}/${d2}`);
          res = await render(key, c2, d2, full);
          state.empty++;
          if (res.status === 200 && res.landing) {
            country = c2;
            break;
          }
          if (res.status === 429 || res.status === 499 || res.status === 403) break;
        }
        if (!res.landing) {
          state.errors++;
          log(`${country}/${res.device} [${key.slice(0, 8)}] EMPTY (all retries) size=${res.size}`);
        }
      }
      if (res.status === 200) {
        backoff = 0;
        const pc = state.perCountry[country] = state.perCountry[country] || { visits: 0, landings: 0, empty: 0, clicks: 0, clickSuccess: 0 };
        state.visits++; pc.visits++; pk.visits++;
        if (res.landing) {
          state.landings++; pc.landings++; pk.landings++;
          log(`${country}/${res.device} [${key.slice(0, 8)}] LANDING size=${res.size} title="${res.title}" ads=${res.ads.length}${res.device !== device ? '' : ''}`);
          if (res.ads.length > 3 && activeSessions < MAX_SESSIONS && full) {
            activeSessions++;
            clickSession(key, country, res.device, res.ads, pc, pk);
            state.sessions = (state.sessions || 0) + 1;
          }
        } else {
          state.empty++; pc.empty++;
          log(`${country}/${res.device} [${key.slice(0, 8)}] EMPTY size=${res.size}`);
        }
      } else if (res.status === 429 || res.status === 499 || res.status === 403) {
        state.errors++; pk.errors++;
        backoff = Math.min(backoff + 5000, 30000);
        log(`${country} [${key.slice(0, 8)}] ${res.status} backoff=${backoff / 1000}s`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      } else {
        const fb = await renderSimple(key, country, res.device, pick(res.device === 'mobile' ? MOBILE_UAS : DESKTOP_UAS));
        if (fb.status === 200) {
          const pc = state.perCountry[country] = state.perCountry[country] || { visits: 0, landings: 0, empty: 0, clicks: 0, clickSuccess: 0 };
          state.visits++; pc.visits++; pk.visits++;
          if (fb.landing) {
            state.landings++; pc.landings++; pk.landings++;
            log(`${country}/${fb.device} [${key.slice(0, 8)}] LANDING-FALLBACK size=${fb.size} title="${fb.title}"`);
          } else {
            state.empty++; pc.empty++;
            log(`${country}/${fb.device} [${key.slice(0, 8)}] EMPTY-FALLBACK size=${fb.size}`);
          }
        } else {
          state.errors++; pk.errors++;
          log(`${country} [${key.slice(0, 8)}] ${res.status}/${fb.status} ${fb.err || res.err || ''}`);
        }
      }
      const elapsedMin = (Date.now() - startedAt) / 60000;
      if (state.visits % 20 === 0) {
        saveState(state);
        log(`STAT ${elapsedMin.toFixed(1)}min visits=${state.visits} landings=${state.landings} empty=${state.empty} errors=${state.errors} clicks=${state.clicks} ok=${state.clickSuccess}`);
      }
      await new Promise(r => setTimeout(r, 250 + Math.floor(Math.random() * 350)));
    }
  }

  const workers = [];
  for (let i = 0; i < active.length; i++) {
    for (let w = 0; w < WORKERS_PER_KEY; w++) {
      workers.push(worker(active[i].key, i));
    }
  }
  log(`Starting ${workers.length} workers (${active.length} keys x ${WORKERS_PER_KEY}) for ${MAX_MINUTES}min`);
  await Promise.all(workers);
  saveState(state);
  log(`DONE ${((Date.now() - startedAt) / 60000).toFixed(1)}min visits=${state.visits} landings=${state.landings} empty=${state.empty} errors=${state.errors} clicks=${state.clicks} ok=${state.clickSuccess}`);
}

main().catch(e => { log('FATAL: ' + e); process.exit(1); });