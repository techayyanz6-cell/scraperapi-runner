const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');
const LOG_FILE = path.join(__dirname, 'runner.log');
const PORT = parseInt(process.env.PORT, 10) || 8100;
const API = 'https://api.scraperapi.com';

const DEFAULT_COUNTRIES = ['us', 'gb', 'ca', 'au', 'de', 'nl', 'za', 'ng', 'fr', 'it'];

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

// Configuration & persistent state
let data = {
  keys: [], // array of { key, credits, requests, status, addedAt, lastChecked, exhaustedReason }
  links: [
    'https://www.effectivecpmnetwork.com/mw6dcxpxp?key=a82a80fb72016668fb27decb6d8d487e',
    'https://www.effectivecpmnetwork.com/ychumnca?key=d926c91e2df60b9b0e204aaf0bc24c62',
    'https://www.effectivecpmnetwork.com/rrnc6wkj20?key=7229316f30175f8124af706edbe27aa8',
    'https://www.effectivecpmnetwork.com/f0qx2zbz?key=55c9b86cf539b6f87e8274e633eafcf0'
  ],
  countries: [...DEFAULT_COUNTRIES],
  maxActiveKeys: 4,     // Up to 4 keys working SIMULTANEOUSLY
  workersPerKey: 4,     // 4 concurrent requests per active key (4 keys x 4 workers = 16 processes)
  renderPct: 60,
  autoStart: true,
  deviceMix: 'balanced'
};

// Load saved data if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (Array.isArray(loaded.keys) && loaded.keys.length > 0 && typeof loaded.keys[0] === 'string') {
      loaded.keys = loaded.keys.map(k => ({
        key: k,
        credits: -1,
        requests: 0,
        status: 'standby',
        addedAt: new Date().toISOString()
      }));
    }
    data = { ...data, ...loaded };
  }
} catch (e) {
  console.error('Error loading data.json:', e.message);
}

let state = {
  running: false,
  statusMessage: 'Ready',
  startedAt: null,
  visits: 0,
  landings: 0,
  empty: 0,
  errors: 0,
  clicks: 0,
  clickSuccess: 0,
  sessions: 0,
  activeSessions: 0,
  perCountry: {},
  perKey: {},
  perLink: {}
};

let logs = [];
let workerPromises = [];
let stopFlag = false;
let activeSessionsCount = 0;
const MAX_SESSIONS = 6;
let rotationLock = false;

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save data.json:', e.message);
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logs.push(line);
  if (logs.length > 600) logs = logs.slice(-600);
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

function pick(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function short(k) {
  if (!k) return '--------';
  return String(k).slice(0, 8);
}

// ScraperAPI account info fetcher
async function fetchAccountCredits(key) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const r = await fetch(`${API}/account?api_key=${key}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) return { credits: 0, requests: 0, error: 'Unauthorized / Forbidden' };
      return { credits: -1, requests: 0, error: `HTTP ${r.status}` };
    }
    const j = await r.json();
    return {
      credits: typeof j.creditsLeft === 'number' ? j.creditsLeft : (j.concurrentLimit ? 1000 : 0),
      requests: j.requestCount || 0,
      error: null
    };
  } catch (e) {
    return { credits: -1, requests: 0, error: e.message };
  }
}

// Multi-Active Key Pool Management
function getActiveKeys() {
  return data.keys.filter(k => k.status === 'active');
}

function getStandbyKeys() {
  return data.keys.filter(k => k.status === 'standby' && (k.credits > 50 || k.credits === -1));
}

// Ensure ALL valid keys with credits are ACTIVE instances simultaneously
async function ensureActivePool() {
  if (rotationLock) return;
  rotationLock = true;
  try {
    for (const k of data.keys) {
      if (k.credits > 50 || k.credits === -1) {
        if (k.status !== 'active') {
          k.status = 'active';
          k.lastActivated = new Date().toISOString();
          log(`[KEY INSTANCE ACTIVE] 🟢 Key ${short(k.key)}... is running as a live instance!`);
        }
      }
    }

    const activeKeys = getActiveKeys();
    const workersPerKey = data.workersPerKey || 4;
    const totalWorkers = activeKeys.length * workersPerKey;

    if (activeKeys.length > 0) {
      state.statusMessage = `Running ${activeKeys.length} parallel key instances (${totalWorkers} concurrent processes)`;
      log(`[MULTI-INSTANCE POOL] 🚀 ${activeKeys.length} Active Key Instances (${totalWorkers} parallel worker processes)`);
    } else {
      state.statusMessage = 'Idle — All keys exhausted. Please add new keys!';
      log(`[KEY POOL EMPTY] ⚠️ No active keys with credits. Waiting for new keys via dashboard...`);
    }

    saveData();
    ensureWorkerPool();
  } finally {
    rotationLock = false;
  }
}

// Dynamically scale worker loops based on active keys
function ensureWorkerPool() {
  if (!state.running) return;
  const activeKeys = getActiveKeys();
  const targetWorkers = Math.max(1, activeKeys.length * (data.workersPerKey || 4));

  while (workerPromises.length < targetWorkers && !stopFlag) {
    const workerId = workerPromises.length + 1;
    workerPromises.push(worker(workerId));
    log(`[WORKER SPAWNED] Spawned parallel worker process #${workerId}`);
  }
}

// When a specific active key runs out of credits, mark only that key
async function rotateExhaustedKey(keyStr, reason = 'Credits exhausted') {
  const target = data.keys.find(k => k.key.toLowerCase() === keyStr.toLowerCase());
  if (target) {
    target.status = 'exhausted';
    target.exhaustedAt = new Date().toISOString();
    target.exhaustedReason = reason;
    log(`[KEY EXHAUSTED] 🔴 Key ${short(target.key)}... marked EXHAUSTED (Reason: ${reason})`);
  }

  saveData();
  const activeKeys = getActiveKeys();
  log(`[REMAINING INSTANCES] ${activeKeys.length} key instances still active and running.`);
}

async function verifyAndClassifyKey(keyStr) {
  const cleanKey = keyStr.trim();
  const info = await fetchAccountCredits(cleanKey);
  const now = new Date().toISOString();

  let status = 'standby';
  if (info.credits !== -1 && info.credits <= 50) {
    status = 'exhausted';
  } else if (info.error && info.error.includes('Unauthorized')) {
    status = 'invalid';
  }

  return {
    key: cleanKey,
    credits: info.credits,
    requests: info.requests,
    status,
    addedAt: now,
    lastChecked: now,
    exhaustedReason: status === 'exhausted' ? 'Credits <= 50 on check' : null
  };
}

function isJunk(href) {
  const h = href.toLowerCase();
  if (/(\.css|\.js|\.png|\.jpe?g|\.gif|\.svg|\.webp|\.woff2?|\.ico|\.json|\.xml|\.txt|\.map)(\?|#|$)/.test(h)) return true;
  if (/(fonts\.|googleapis|google-analytics|gstatic|googletagmanager|jsdelivr|cdnjs|jquery|bootstrapcdn|cloudflare|analytics)/.test(h)) return true;
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
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }
  return urls.slice(0, 5);
}

// Request execution engine
async function render(key, link, country, device, full) {
  const ua = device === 'mobile' ? pick(MOBILE_UAS) : pick(DESKTOP_UAS);
  const params = new URLSearchParams({
    api_key: key,
    url: link,
    country,
    device,
    user_agent: ua
  });
  if (full) {
    params.set('render', 'true');
    params.set('wait_until', 'networkidle2');
  }

  try {
    const controller = new AbortController();
    const timeoutMs = full ? 95000 : 35000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const r = await fetch(`${API}?${params}`, { signal: controller.signal });
    clearTimeout(timer);

    const body = await r.text();
    const title = (body.match(/<title>(.*?)<\/title>/i) || [])[1] || '';
    const isLanding = r.status === 200 && body.length > 800 && (full ? true : title.trim().length > 0);

    return {
      status: r.status,
      size: body.length,
      title: title.trim().slice(0, 60),
      landing: isLanding,
      device,
      ads: [],
      rawBodySnippet: body.slice(0, 200)
    };
  } catch (e) {
    return {
      status: 'ERR',
      size: 0,
      title: '',
      landing: false,
      err: String(e.message || e).slice(0, 80),
      device,
      ads: []
    };
  }
}

async function clickAd(key, country, device, url) {
  const ua = device === 'mobile' ? pick(MOBILE_UAS) : pick(DESKTOP_UAS);
  const params = new URLSearchParams({
    api_key: key,
    url,
    country,
    device,
    user_agent: ua
  });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    const r = await fetch(`${API}?${params}`, { signal: controller.signal });
    clearTimeout(timer);
    const body = await r.text();
    return { status: r.status, size: body.length, success: r.status >= 200 && r.status < 400 };
  } catch (e) {
    return { status: 'ERR', size: 0, success: false, err: String(e.message || e).slice(0, 60) };
  }
}

async function clickSession(key, country, device, link, ads) {
  activeSessionsCount++;
  state.activeSessions = activeSessionsCount;
  const queue = [...ads].sort(() => Math.random() - 0.5).slice(0, 3);
  try {
    for (let ci = 0; ci < queue.length; ci++) {
      if (stopFlag) break;
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
      const c = await clickAd(key, country, device, queue[ci]);
      state.clicks++;
      const pk = state.perKey[short(key)] = state.perKey[short(key)] || { visits: 0, landings: 0, clicks: 0, clickSuccess: 0, errors: 0 };
      pk.clicks++;

      if (c.success) {
        state.clickSuccess++;
        pk.clickSuccess++;
        log(`[SESSION-CLICK ${ci + 1}/${queue.length} OK] ${country}/${device} key=${short(key)} size=${c.size} url=${queue[ci].slice(0, 60)}`);
      } else {
        log(`[SESSION-CLICK ${ci + 1}/${queue.length} FAIL] ${c.status} key=${short(key)} url=${queue[ci].slice(0, 60)}`);
      }

      if (ci < queue.length - 1 && !stopFlag) {
        const stay = 45 + Math.floor(Math.random() * 45);
        log(`[SESSION DWELL] Staying active for ${stay}s (key=${short(key)})...`);
        await new Promise(r => setTimeout(r, stay * 1000));
      }
    }
  } catch (e) {
    log(`[SESSION ERROR] ${String(e.message || e).slice(0, 60)}`);
  } finally {
    activeSessionsCount = Math.max(0, activeSessionsCount - 1);
    state.activeSessions = activeSessionsCount;
  }
}

// 24/7 Worker Loop
async function worker(workerId) {
  let consecutiveErrors = 0;

  while (!stopFlag) {
    let activeKeys = getActiveKeys();

    // If no active keys in pool, try promoting from standby
    if (!activeKeys.length) {
      await ensureActivePool();
      activeKeys = getActiveKeys();
      if (!activeKeys.length) {
        await new Promise(r => setTimeout(r, 8000));
        continue;
      }
    }

    // Pick a key from the active pool (evenly balances workload across all active keys)
    const activeKeyObj = pick(activeKeys);
    if (!activeKeyObj) {
      await new Promise(r => setTimeout(r, 4000));
      continue;
    }

    // Pick active link
    const validLinks = data.links.filter(l => l && /^https?:\/\//i.test(l));
    if (!validLinks.length) {
      state.statusMessage = 'Idle — No valid links configured!';
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }
    const link = pick(validLinks);

    // Pick country and device
    const countries = data.countries && data.countries.length ? data.countries : DEFAULT_COUNTRIES;
    let country = pick(countries);
    let device = Math.random() < 0.6 ? 'desktop' : 'mobile';
    const full = Math.random() < ((data.renderPct || 60) / 100);

    const activeKey = activeKeyObj.key;
    const keyShort = short(activeKey);

    // Execute render (1 credit per request)
    let res = await render(activeKey, link, country, device, full);

    // If 200 but not full landing, only retry in fast mode (full is false) to prevent credit waste on expensive JS renders
    if (res.status === 200 && !res.landing && !full) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const d2 = pick(['desktop', 'desktop', 'mobile']);
        const retryRes = await render(activeKey, link, 'nl', d2, false);
        if (retryRes.status === 200 && retryRes.landing) {
          res = retryRes;
          device = d2;
          break;
        }
        if (retryRes.status === 429 || retryRes.status === 403) break;
      }
    }

    // Stats buckets
    const pk = state.perKey[keyShort] = state.perKey[keyShort] || { visits: 0, landings: 0, errors: 0, clicks: 0, clickSuccess: 0 };
    const pl = state.perLink[link.slice(0, 45)] = state.perLink[link.slice(0, 45)] || { visits: 0, landings: 0 };
    const pc = state.perCountry[country] = state.perCountry[country] || { visits: 0, landings: 0, empty: 0 };

    // Handle HTTP Responses
    if (res.status === 200) {
      consecutiveErrors = 0;
      state.visits++;
      pc.visits++;
      pk.visits++;
      pl.visits++;

      if (res.landing) {
        state.landings++;
        pc.landings++;
        pk.landings++;
        pl.landings++;
        log(`[LANDING OK] ${country.toUpperCase()}/${device} [${keyShort}] size=${res.size} title="${res.title}"`);
      } else {
        state.empty++;
        pc.empty++;
        log(`[EMPTY/REDIRECT] ${country.toUpperCase()}/${device} [${keyShort}] size=${res.size}`);
      }
    } else if (res.status === 429 || res.status === 499) {
      state.errors++;
      pk.errors++;
      consecutiveErrors++;
      const is499 = res.status === 499;
      const backoff = is499 ? (6000 + Math.floor(Math.random() * 6000)) : Math.min(3000 * consecutiveErrors, 18000);
      log(`[${is499 ? 'TIMEOUT' : 'RATE LIMIT'} ${res.status}] [${keyShort}] Cooldown backoff for ${Math.round(backoff / 1000)}s...`);
      await new Promise(r => setTimeout(r, backoff));
    } else if (res.status === 403) {
      state.errors++;
      pk.errors++;
      consecutiveErrors++;
      log(`[TARGET 403] [${keyShort}] Target returned 403 (Country: ${country})`);

      // Only check credit balance if multiple consecutive 403s occur
      if (consecutiveErrors >= 5) {
        const check = await fetchAccountCredits(activeKey);
        if (check.credits !== -1 && check.credits <= 50) {
          log(`[CREDITS EXHAUSTED] ScraperAPI account verified: ${check.credits} credits left.`);
          await rotateExhaustedKey(activeKey, `Verified credits left: ${check.credits}`);
        } else {
          consecutiveErrors = 0;
          log(`[KEY OK] Key ${keyShort} still has ${check.credits} credits. Continuing...`);
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    } else {
      state.errors++;
      pk.errors++;
      consecutiveErrors++;
      log(`[ERROR ${res.status}] [${keyShort}] ${res.err || 'Request failed'} (Country: ${country})`);
      if (consecutiveErrors >= 8) {
        const check = await fetchAccountCredits(activeKey);
        if (check.credits !== -1 && check.credits <= 50) {
          await rotateExhaustedKey(activeKey, `Verified credits left: ${check.credits}`);
        } else {
          consecutiveErrors = 0;
        }
      }
    }

    // Periodic proactive credit verification (every 100 visits)
    if (state.visits > 0 && state.visits % 100 === 0) {
      const activeList = getActiveKeys();
      for (const k of activeList) {
        fetchAccountCredits(k.key).then(info => {
          if (info.credits !== -1) {
            k.credits = info.credits;
            k.requests = info.requests;
            k.lastChecked = new Date().toISOString();
            if (info.credits <= 50) {
              rotateExhaustedKey(k.key, `Proactive credit check: ${info.credits} remaining`);
            }
          }
        });
      }
    }

    // Delay between worker requests (1500ms - 3500ms) to prevent concurrency limit exhaustion
    const delay = 1500 + Math.floor(Math.random() * 2000);
    await new Promise(r => setTimeout(r, delay));
  }
}

// REST APIs

// State endpoint
app.get('/api/state', (req, res) => {
  const activeKeys = getActiveKeys();
  const maxActive = data.maxActiveKeys || 4;
  const workersPerKey = data.workersPerKey || 4;
  const totalWorkers = state.running ? (activeKeys.length * workersPerKey) : 0;

  res.json({
    data,
    state,
    workers: totalWorkers,
    activeKeys,
    activeKeysCount: activeKeys.length,
    maxActiveKeys: maxActive,
    workersPerKey,
    standbyKeysCount: getStandbyKeys().length,
    exhaustedKeysCount: data.keys.filter(k => k.status === 'exhausted').length,
    logs: logs.slice(-100)
  });
});

// Add Key(s) - Single or Bulk
app.post('/api/keys', async (req, res) => {
  const input = String(req.body.key || req.body.keys || '').trim();
  if (!input) return res.status(400).json({ error: 'Please provide at least one ScraperAPI key' });

  const rawKeys = input.split(/[\n,; ]+/).map(k => k.trim()).filter(Boolean);
  const validHexKeys = rawKeys.filter(k => /^[a-f0-9]{32}$/i.test(k));

  if (!validHexKeys.length) {
    return res.status(400).json({ error: 'No valid 32-character hex ScraperAPI keys found' });
  }

  const added = [];
  const existing = [];

  for (const k of validHexKeys) {
    const found = data.keys.find(x => x.key.toLowerCase() === k.toLowerCase());
    if (found) {
      existing.push(k);
      continue;
    }

    const keyObj = await verifyAndClassifyKey(k);
    data.keys.push(keyObj);
    added.push(keyObj);
    log(`[KEY ADDED] Added key ${short(k)} (Status: ${keyObj.status}, Credits: ${keyObj.credits})`);
  }

  // Ensure active pool fills up to maxActiveKeys (e.g. 4 keys)
  await ensureActivePool();

  saveData();
  res.json({
    ok: true,
    addedCount: added.length,
    existingCount: existing.length,
    keys: data.keys
  });
});

// Delete a key
app.delete('/api/keys/:key', async (req, res) => {
  const targetKey = req.params.key.trim().toLowerCase();
  const idx = data.keys.findIndex(k => k.key.toLowerCase() === targetKey);
  if (idx === -1) return res.status(404).json({ error: 'Key not found' });

  const wasActive = data.keys[idx].status === 'active';
  data.keys.splice(idx, 1);
  log(`[KEY REMOVED] Removed key ${short(targetKey)}`);

  if (wasActive) {
    await ensureActivePool();
  }

  saveData();
  res.json({ ok: true, keys: data.keys });
});

// Reset key status from exhausted to standby
app.post('/api/keys/:key/reset', async (req, res) => {
  const targetKey = req.params.key.trim().toLowerCase();
  const keyObj = data.keys.find(k => k.key.toLowerCase() === targetKey);
  if (!keyObj) return res.status(404).json({ error: 'Key not found' });

  const info = await fetchAccountCredits(keyObj.key);
  keyObj.credits = info.credits;
  keyObj.requests = info.requests;
  keyObj.lastChecked = new Date().toISOString();
  keyObj.status = (info.credits > 50 || info.credits === -1) ? 'standby' : 'exhausted';
  keyObj.exhaustedReason = keyObj.status === 'exhausted' ? 'Credits <= 50 on manual check' : null;

  await ensureActivePool();

  saveData();
  res.json({ ok: true, key: keyObj });
});

// Refresh all key credits from ScraperAPI
app.post('/api/keys/refresh', async (req, res) => {
  log('[KEYS REFRESH] Checking credits for all keys...');
  const promises = data.keys.map(async k => {
    const info = await fetchAccountCredits(k.key);
    k.credits = info.credits;
    k.requests = info.requests;
    k.lastChecked = new Date().toISOString();
    if (info.credits > 50 || info.credits === -1) {
      if (k.status === 'exhausted') k.status = 'standby';
      k.exhaustedReason = null;
    } else {
      k.status = 'exhausted';
      k.exhaustedReason = 'Credits <= 50 on check';
    }
  });

  await Promise.all(promises);
  await ensureActivePool();

  saveData();
  res.json({ ok: true, keys: data.keys });
});

// Reset and recheck ALL keys immediately
app.post('/api/keys/reset-all', async (req, res) => {
  log('[RESET ALL] Checking and reactivating all keys with credits...');
  const promises = data.keys.map(async k => {
    const info = await fetchAccountCredits(k.key);
    k.credits = info.credits;
    k.requests = info.requests;
    k.lastChecked = new Date().toISOString();
    if (info.credits > 50 || info.credits === -1) {
      k.status = 'standby';
      k.exhaustedReason = null;
    } else {
      k.status = 'exhausted';
      k.exhaustedReason = 'Credits <= 50 on check';
    }
  });

  await Promise.all(promises);
  await ensureActivePool();

  saveData();
  res.json({ ok: true, keys: data.keys });
});

// Link endpoints
app.post('/api/links', (req, res) => {
  const url = (req.body.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'A valid http:// or https:// URL is required' });
  }
  if (!data.links.includes(url)) {
    data.links.push(url);
    saveData();
    log(`[LINK ADDED] Added link: ${url.slice(0, 60)}`);
  }
  res.json({ ok: true, links: data.links });
});

app.delete('/api/links/:idx', (req, res) => {
  const idx = parseInt(req.params.idx);
  if (idx >= 0 && idx < data.links.length) {
    const removed = data.links.splice(idx, 1);
    saveData();
    log(`[LINK REMOVED] Removed link: ${removed[0]}`);
  }
  res.json({ ok: true, links: data.links });
});

// Settings endpoint
app.post('/api/settings', (req, res) => {
  if (Array.isArray(req.body.countries)) {
    data.countries = req.body.countries.map(c => String(c).trim().toLowerCase()).filter(c => /^[a-z]{2}$/.test(c));
  }
  if (req.body.renderPct != null) {
    data.renderPct = Math.min(100, Math.max(0, parseInt(req.body.renderPct)));
  }
  if (req.body.maxActiveKeys != null) {
    data.maxActiveKeys = Math.min(10, Math.max(1, parseInt(req.body.maxActiveKeys)));
  }
  if (req.body.workersPerKey != null) {
    data.workersPerKey = Math.min(10, Math.max(1, parseInt(req.body.workersPerKey)));
  }
  if (req.body.autoStart != null) {
    data.autoStart = !!req.body.autoStart;
  }
  saveData();
  ensureActivePool();
  log(`[SETTINGS UPDATED] maxActiveKeys=${data.maxActiveKeys}, workersPerKey=${data.workersPerKey}, renderPct=${data.renderPct}%, countries=${data.countries.join(',')}`);
  res.json({ ok: true, data });
});

// Start / Stop runner
app.post('/api/start', async (req, res) => {
  if (state.running) return res.status(400).json({ error: 'Runner is already active' });

  await ensureActivePool();
  const activeKeys = getActiveKeys();

  if (!activeKeys.length) {
    return res.status(400).json({ error: 'No active or standby keys with available credits. Please add a valid ScraperAPI key first.' });
  }

  if (!data.links || !data.links.length) {
    return res.status(400).json({ error: 'Please add at least one destination/smartlink before starting.' });
  }

  stopFlag = false;
  state.running = true;
  state.startedAt = Date.now();

  const totalWorkers = Math.max(4, activeKeys.length * (data.workersPerKey || 4));
  workerPromises = [];
  for (let i = 1; i <= totalWorkers; i++) {
    workerPromises.push(worker(i));
  }

  log(`[RUNNER STARTED] 24/7 Engine active with ${totalWorkers} concurrent processes (${activeKeys.length} active keys x ${data.workersPerKey || 4} workers/key)!`);
  res.json({ ok: true, workers: totalWorkers, activeKeysCount: activeKeys.length });
});

app.post('/api/stop', (req, res) => {
  stopFlag = true;
  state.running = false;
  state.statusMessage = 'Stopped by user';
  log('[RUNNER STOPPED] Stop signal sent to all workers');
  res.json({ ok: true });
});

// Render Keep-Alive & Health Check Probes
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/ping', (req, res) => {
  const activeKeys = getActiveKeys();
  res.json({ status: 'alive', uptime: process.uptime(), running: state.running, visits: state.visits, activeKeysCount: activeKeys.length });
});

// Self Keep-Alive to prevent Render free instance sleeping
if (process.env.RENDER_EXTERNAL_URL) {
  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  setInterval(() => {
    fetch(`${selfUrl}/healthz`).catch(() => {});
  }, 10 * 60 * 1000);
  console.log(`[KEEP-ALIVE] Configured self-ping to ${selfUrl}`);
}

// Global safe crash prevention
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  log(`[FATAL TRAP] Uncaught Exception: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  log(`[FATAL TRAP] Unhandled Rejection: ${reason}`);
});

// Auto-boot runner on server startup
const HOST = process.env.IP || '::';
app.listen(PORT, HOST, async () => {
  console.log(`====================================================`);
  console.log(`🚀 ScraperAPI 24/7 All-Key Multi-Instance Server running!`);
  console.log(`🌐 Dashboard URL: http://${HOST}:${PORT}`);
  console.log(`⚡ Mode: All added keys run as parallel active instances`);
  console.log(`🔥 Workers Per Key: ${data.workersPerKey || 4}`);
  console.log(`====================================================`);

  if (data.autoStart && data.links && data.links.length > 0) {
    await ensureActivePool();
    const activeKeys = getActiveKeys();
    if (activeKeys.length > 0) {
      console.log(`[AUTO-START] Auto-starting 24/7 worker engine with ${activeKeys.length} active key instances...`);
      stopFlag = false;
      state.running = true;
      state.startedAt = Date.now();
      const totalWorkers = Math.max(4, activeKeys.length * (data.workersPerKey || 4));
      for (let i = 1; i <= totalWorkers; i++) {
        workerPromises.push(worker(i));
      }
      log(`[AUTO-START] 24/7 Engine active with ${totalWorkers} concurrent processes across all ${activeKeys.length} active keys.`);
    }
  }
});
