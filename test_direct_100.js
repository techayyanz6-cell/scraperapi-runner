const API_KEY = '79a286ef74ab0e7b22b582ebc4e957ee';
const TARGET_URL = 'https://www.effectivecpmnetwork.com/mw6dcxpxp?key=a82a80fb72016668fb27decb6d8d487e';

// country: code, premium: bool
// NG/NL = standard render (5cr)
const VISIT_PLAN = [
  { country: 'ng', premium: false },
  { country: 'ng', premium: false },
  { country: 'ng', premium: false },
  { country: 'nl', premium: false },
  { country: 'nl', premium: false },
];

// Let ScraperAPI handle UAs based on device
const DEVICES = ['desktop', 'mobile'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function runVisit(index, country, premium) {
  const deviceType = pick(DEVICES);
  const params = new URLSearchParams({
    api_key: API_KEY,
    url: TARGET_URL,
    country,
    device: deviceType,
    render: 'true',
    wait_until: 'networkidle2',
    ...(premium ? { premium: 'true' } : {}),
  });

  const credits = premium ? 10 : 5;
  const startTime = Date.now();
  try {
    const res = await fetch(`https://api.scraperapi.com?${params}`, { signal: AbortSignal.timeout(95000) });
    const body = await res.text();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const title = (body.match(/<title>(.*?)<\/title>/i) || [])[1] || 'None';
    const size = body.length;
    const icon = size > 1000 ? '✅' : size <= 118 ? '❌' : '⚠️';
    const mode = premium ? '🔑PREM' : '🔓STD';

    console.log(`[#${index}] ${country.toUpperCase()} ${deviceType === 'mobile' ? '📱' : '💻'} ${mode} | ${icon} ${size}b | ${duration}s | ${credits}cr | "${title}"`);
    return { loaded: size > 1000, status: res.status };
  } catch (err) {
    console.error(`[#${index}] ${country.toUpperCase()} | ❌ Error: ${err.message}`);
    return { loaded: false, status: 0 };
  }
}

async function start() {
  let totalVisits = 0;
  let round = 1;

  console.log('==================================================');
  console.log(`🚀 Runner 1 — NG+NL (std)`);
  console.log(`🔑 Key: ${API_KEY.slice(0, 8)}...`);
  console.log(`💡 NG/NL=5cr`);
  console.log(`⏳ Runs until credits exhausted or Ctrl+C`);
  console.log('==================================================\n');

  while (true) {
    console.log(`\n--- Round ${round} ---`);

    for (const { country, premium } of VISIT_PLAN) {
      totalVisits++;
      const result = await runVisit(totalVisits, country, premium);

      if (result.status === 403 || result.status === 429) {
        console.log(`\n🛑 Credits exhausted! Total visits: ${totalVisits}`);
        process.exit(0);
      }
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log(`📊 Round ${round} done | Total visits: ${totalVisits}`);
    round++;
    await new Promise(r => setTimeout(r, 3000));
  }
}

start();
