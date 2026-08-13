const https = require('https');
const http = require('http');

function fetch(url) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetch(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
    });
}

function fetchViaProxy(target, proxy) {
    return new Promise((resolve, reject) => {
        const [host, port] = proxy.split(':');
        const url = new URL(target);
        const req = http.request({
            host, port: parseInt(port), method: 'GET', path: url.href,
            headers: { 'Host': url.hostname, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 8000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, via: proxy }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

const COUNTRIES = {
    'Italy': { flag: '🇮🇹', lang: 'it', keywords: ['italiano', 'italy', 'italia'] },
    'Korea': { flag: '🇰🇷', lang: 'ko', keywords: ['korea', 'korean', '한국'] },
    'Egypt': { flag: '🇪🇬', lang: 'ar', keywords: ['egypt', 'egyptian', 'مصر'] },
    'Germany': { flag: '🇩🇪', lang: 'de', keywords: ['germany', 'german', 'deutsch'] },
};

async function getProxies(country) {
    try {
        const apiMap = {
            'Italy': 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=IT&ssl=all&anonymity=all',
            'Korea': 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=KR&ssl=all&anonymity=all',
            'Egypt': 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=EG&ssl=all&anonymity=all',
            'Germany': 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=DE&ssl=all&anonymity=all',
        };
        const raw = await fetch(apiMap[country]);
        return raw.split('\n').filter(l => l.includes(':')).slice(0, 5);
    } catch { return []; }
}

async function testProxy(target, proxy) {
    try {
        const res = await fetchViaProxy(target, proxy);
        if (res.body.length > 1000) return res;
    } catch {}
    return null;
}

async function main() {
    console.log('╔' + '═'.repeat(55) + '╗');
    console.log('║  NAROWALIANS.ONLINE — Country Ad Detection Test       ║');
    console.log('╚' + '═'.repeat(55) + '╝\n');

    for (const [country, info] of Object.entries(COUNTRIES)) {
        console.log(`${info.flag} ${country}:`);
        console.log('─'.repeat(50));
        
        const proxies = await getProxies(country);
        console.log(`  Found ${proxies.length} proxies`);
        
        let found = false;
        for (const proxy of proxies.slice(0, 3)) {
            process.stdout.write(`  Testing ${proxy}... `);
            const res = await testProxy('https://pulsetech-adsterra-portal.surge.sh', proxy);
            if (res) {
                console.log(`✅ HTTP ${res.status}`);
                
                // Analyze response
                const hasPopunder = res.body.includes('effectivecpmnetwork.com');
                const hasBanners = res.body.includes('highperformanceformat.com');
                const hasSmartLink = res.body.includes('mgjwp8zz');
                const cfProtected = res.body.includes('cf-ray');
                
                console.log(`  Ad Zones Found:`);
                if (hasPopunder) console.log(`    ✓ Popunder/Social/Native (PropellerAds)`);
                if (hasBanners) console.log(`    ✓ Display Banners (PropellerAds)`);
                if (hasSmartLink) console.log(`    ✓ Smart Link/Affiliate`);
                if (cfProtected) console.log(`    ✓ Cloudflare Protection`);
                
                console.log(`  Response Size: ${(res.body.length / 1024).toFixed(1)} KB`);
                found = true;
                break;
            } else {
                console.log(`❌`);
            }
        }
        
        if (!found) {
            console.log(`  ⚠️  Could not connect via proxy`);
            console.log(`  (Free proxies are often blocked/unreliable)`);
        }
        console.log('');
    }

    console.log('═'.repeat(50));
    console.log('  PROPELLERADS GEO-TARGETING INFO');
    console.log('═'.repeat(50));
    console.log(`
  The website code is IDENTICAL for all countries.
  PropellerAds detects your country via IP and shows
  different ad creatives accordingly:

  🇮🇹 ITALY:
  ─────────────────────────────
  Language: Italian
  Ad Examples:
  • App installs (Italian apps)
  • European e-commerce ads
  • GDPR consent banners
  • Italian streaming services
  CPM Range: $1-5
  
  🇰🇷 KOREA:
  ─────────────────────────────
  Language: Korean (한국어)
  Ad Examples:
  • Korean mobile games
  • K-pop/K-drama streaming
  • Korean shopping apps (Coupang style)
  • KakaoTalk related ads
  CPM Range: $2-8
  
  🇪🇬 EGYPT:
  ─────────────────────────────
  Language: Arabic (عربي)
  Ad Examples:
  • Mobile recharge offers
  • Arabic game installs
  • Local Egyptian services
  • Vodafone/Etisalat ads
  CPM Range: $0.3-2
  
  🇩🇪 GERMANY:
  ─────────────────────────────
  Language: German (Deutsch)
  Ad Examples:
  • Premium European brands
  • German e-commerce (Otto, Zalando)
  • VPN/Cybersecurity ads
  • GDPR-compliant consent
  CPM Range: $3-10
  
  SAME website, DIFFERENT ads per country!
  The ad code in source is the same, but
  PropellerAds serves country-specific
  ad creatives from their servers.
`);
    console.log('═'.repeat(50));
}

main().catch(console.error);
