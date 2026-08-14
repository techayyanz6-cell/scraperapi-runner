const API_KEYS = [
  '79a286ef74ab0e7b22b582ebc4e957ee',
  '9ea3578bfd6b63b65c4261b42b05b8a6'
];

const TARGET_URL = 'https://premium-deals-clicks.pages.dev';

// Country mix - NL and NG working best
const COUNTRIES = ['ng', 'ng', 'ng', 'nl', 'nl'];

// Devices rotation
const DEVICES = ['desktop', 'desktop', 'desktop', 'mobile', 'mobile'];

// Realistic viewport sizes
const VIEWPORTS = [
  '1920x1080', '1366x768', '1536x864',
  '1280x720', '1440x900', '390x844',
  '414x896', '375x667'
];

// Premium browser header pools
const ACCEPT_LANGS = [
  'en-US,en;q=0.9',
  'en-GB,en;q=0.9,en-US;q=0.8',
  'en-NG,en;q=0.9',
  'en-ZA,en;q=0.9',
  'en-NL,en;q=0.8,nl;q=0.5',
  'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
];

const ACCEPT_DESKTOP = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
const ACCEPT_MOBILE  = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';

// Realistic referrers (most traffic comes from Google/social)
const REFERRERS = [
  'https://www.google.com/search?q=casino+bonus+deals',
  'https://www.google.com/search?q=online+entertainment',
  'https://www.google.ng/search?q=best+casino+games',
  'https://www.facebook.com/',
  'https://www.twitter.com/',
  'https://www.reddit.com/r/onlinecasino/',
  'https://t.co/random_tweet',
  ''  // direct traffic
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Human scroll + dwell JS snippet (URL encoded)
function buildJsSnippet(dwellSeconds) {
  const js = `
    (async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const h = document.body.scrollHeight;
      
      // Simulate reading: scroll down in chunks
      await sleep(${randInt(800, 2000)});
      window.scrollTo({ top: h * 0.2, behavior: 'smooth' });
      await sleep(${randInt(1500, 3000)});
      window.scrollTo({ top: h * 0.4, behavior: 'smooth' });
      await sleep(${randInt(1000, 2500)});
      window.scrollTo({ top: h * 0.6, behavior: 'smooth' });
      await sleep(${randInt(2000, 4000)});
      window.scrollTo({ top: h * 0.8, behavior: 'smooth' });
      await sleep(${randInt(1000, 2000)});
      window.scrollTo({ top: h, behavior: 'smooth' });
      
      // Randomly click a card/link on the page
      await sleep(${randInt(1500, 3000)});
      const links = Array.from(document.querySelectorAll('a.card, a[href]'))
        .filter(a => a.href && !a.href.includes('javascript'));
      if (links.length > 0) {
        const randomLink = links[Math.floor(Math.random() * links.length)];
        randomLink.click();
      }
      
      // Stay on page
      await sleep(${dwellSeconds * 1000});
    })();
  `;
  return encodeURIComponent(js.trim());
}

async function runVisit(index, country, device, key) {
  const referrer = pick(REFERRERS);
  const viewport = pick(VIEWPORTS);
  const [vw, vh] = viewport.split('x');
  const dwellSecs = randInt(15, 60);
  const lang = pick(ACCEPT_LANGS);
  const isMobile = device === 'mobile';

  // Build realistic browser headers
  const headers = {
    'Accept': isMobile ? ACCEPT_MOBILE : ACCEPT_DESKTOP,
    'Accept-Language': lang,
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'DNT': pick(['0', '0', '0', '1']),
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': referrer ? 'cross-site' : 'none',
    'Sec-Fetch-User': '?1',
    'Connection': 'keep-alive',
  };

  if (referrer) {
    headers['Referer'] = referrer;
  }

  const params = new URLSearchParams({
    api_key: key,
    url: TARGET_URL,
    country,
    device,
    render: 'true',
    wait_until: 'networkidle2',
    window_width: vw,
    window_height: vh,
    js_snippet: buildJsSnippet(dwellSecs),
    custom_headers: JSON.stringify(headers)
  });

  const startTime = Date.now();
  const keyShort = key.slice(0, 6);

  try {
    const res = await fetch(`https://api.scraperapi.com?${params}`, {
      signal: AbortSignal.timeout(120000)
    });
    const body = await res.text();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const title = (body.match(/<title>(.*?)<\/title>/i) || [])[1] || 'None';
    const size = body.length;
    const icon = size > 1000 ? '✅' : size <= 118 ? '❌' : '⚠️';

    console.log(`[#${index}] ${country.toUpperCase()} ${device === 'mobile' ? '📱' : '💻'} [${keyShort}] | ${icon} ${size}b | ${duration}s | dwell:${dwellSecs}s | ref:${referrer ? new URL(referrer).hostname : 'direct'} | "${title}"`);
    return { loaded: size > 1000, status: res.status };
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[#${index}] ${country.toUpperCase()} [${keyShort}] | ❌ Error after ${duration}s: ${err.message}`);
    return { loaded: false, status: 0 };
  }
}

async function start() {
  let totalVisits = 0;
  let round = 1;

  console.log('==================================================');
  console.log(`🤖→🧑 Human Behavior Runner`);
  console.log(`🌍 Countries: NG + NL`);
  console.log(`🎭 Referrers: Google, Facebook, Twitter, Reddit, Direct`);
  console.log(`📜 Scroll: Realistic slow scroll + random click`);
  console.log(`⏱️  Dwell: 15-60s per visit`);
  console.log(`🔑 Keys: ${API_KEYS.map(k => k.slice(0, 6)).join(', ')}`);
  console.log('==================================================\n');

  while (true) {
    console.log(`\n--- Round ${round} ---`);

    for (let i = 0; i < COUNTRIES.length; i++) {
      totalVisits++;
      const country = COUNTRIES[i % COUNTRIES.length];
      const device = DEVICES[i % DEVICES.length];
      const key = pick(API_KEYS);

      const result = await runVisit(totalVisits, country, device, key);

      if (result.status === 403 || result.status === 429) {
        console.log(`\n🛑 Credits exhausted (HTTP ${result.status})! Total visits: ${totalVisits}`);
        process.exit(0);
      }

      // Human-like delay between visits: 8-25 seconds
      const delay = randInt(8000, 25000);
      console.log(`⏳ Next visit in ${(delay / 1000).toFixed(1)}s...`);
      await sleep(delay);
    }

    console.log(`\n📊 Round ${round} done | Total visits: ${totalVisits}`);
    round++;

    // Longer break between rounds (simulate session gaps)
    const roundBreak = randInt(30000, 90000);
    console.log(`💤 Round break: ${(roundBreak / 1000).toFixed(0)}s...`);
    await sleep(roundBreak);
  }
}

start();
