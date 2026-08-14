const API_KEY = '79a286ef74ab0e7b22b582ebc4e957ee';
const TARGET_URL = 'https://www.effectivecpmnetwork.com/mw6dcxpxp?key=a82a80fb72016668fb27decb6d8d487e';
const COUNTRIES = ['ca', 'de', 'us'];

const DESKTOP_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function testVisit(country, mode) {
  const ua = pick(DESKTOP_UAS);
  const params = new URLSearchParams({
    api_key: API_KEY,
    url: TARGET_URL,
    country: country,
    device: 'desktop',
    user_agent: ua,
    render: 'true',
    wait_until: 'networkidle2',
    ...(mode === 'premium' ? { premium: 'true' } : {}),
  });

  const startTime = Date.now();
  try {
    const res = await fetch(`https://api.scraperapi.com?${params}`, { signal: AbortSignal.timeout(95000) });
    const body = await res.text();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const title = (body.match(/<title>(.*?)<\/title>/i) || [])[1] || 'None';
    const size = body.length;
    const icon = size > 1000 ? '✅' : size <= 118 ? '❌' : '⚠️';
    console.log(`[${mode.toUpperCase()}] ${country.toUpperCase()} | ${icon} ${size} bytes | ${duration}s | "${title}"`);
  } catch (err) {
    console.error(`[${mode.toUpperCase()}] ${country.toUpperCase()} | ❌ Error: ${err.message}`);
  }
}

async function start() {
  console.log('==================================================');
  console.log(`🧪 Premium IP Test — CA, DE, US`);
  console.log(`💡 Standard (5cr) vs Premium (10cr) comparison`);
  console.log('==================================================\n');

  for (const country of COUNTRIES) {
    console.log(`\n--- Testing ${country.toUpperCase()} ---`);
    // Standard first
    await testVisit(country, 'standard');
    await new Promise(r => setTimeout(r, 3000));
    // Premium
    await testVisit(country, 'premium');
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n✅ Test done! Check results above.');
}

start();
