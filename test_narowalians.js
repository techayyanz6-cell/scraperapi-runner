const fs = require('fs');

const API_KEY = '79a286ef74ab0e7b22b582ebc4e957ee';
const TARGET_URL = 'https://tech.narowalians.online';
const COUNTRIES = ['nl', 'de', 'us', 'gb', 'ca', 'it', 'za'];

const DESKTOP_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function runTestVisit(index, renderMode) {
  const country = pick(COUNTRIES);
  const ua = pick(DESKTOP_UAS);
  
  const params = new URLSearchParams({
    api_key: API_KEY,
    url: TARGET_URL,
    country: country,
    device: 'desktop',
    user_agent: ua
  });

  if (renderMode) {
    params.set('render', 'true');
    params.set('wait_until', 'networkidle2');
  }

  console.log(`[Visit #${index}] Target: ${TARGET_URL} | Country: ${country.toUpperCase()} | Render: ${renderMode ? 'YES (5 credits)' : 'NO (1 credit)'}`);
  
  const startTime = Date.now();
  try {
    const res = await fetch(`https://api.scraperapi.com?${params}`, { signal: AbortSignal.timeout(95000) });
    const body = await res.text();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Look for Adsterra script keys in the HTML body to verify ads loaded
    const hasAdsterra1 = body.includes('3b982b00e44dfc6d9a33f488f33cc2fd') || body.includes('effectivecpmnetwork');
    const hasAdsterra2 = body.includes('03b55a68f56799fcefa2e32b025de389') || body.includes('highperformanceformat');

    console.log(`[Result #${index}] Status: ${res.status} | Size: ${body.length} bytes | Time: ${duration}s | Ads Loaded: ${hasAdsterra1 || hasAdsterra2 ? '✅ Yes' : '❌ No'}`);
  } catch (err) {
    console.error(`[Error #${index}] Failed: ${err.message}`);
  }
}

async function start() {
  console.log('==================================================');
  console.log(`🚀 Starting local test run for ${TARGET_URL}`);
  console.log(`🔑 Key: ${API_KEY.slice(0, 8)}...`);
  console.log('==================================================\n');

  // 1. Run 5 Fast Mode visits (render=false)
  console.log('--- PHASE 1: 5 Fast Mode Visits (1 credit each) ---');
  for (let i = 1; i <= 5; i++) {
    await runTestVisit(i, false);
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n--- PHASE 2: 5 JS Render Mode Visits (5 credits each) ---');
  // 2. Run 5 JS Rendered visits (render=true)
  for (let i = 6; i <= 10; i++) {
    await runTestVisit(i, true);
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('\n==================================================');
  console.log('✅ Test visits completed! Check your ad network panel.');
  console.log('==================================================');
}

start();
