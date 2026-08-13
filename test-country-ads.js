const https = require('https');
const http = require('http');
const { URL } = require('url');

const TARGET = 'https://pulsetech-adsterra-portal.surge.sh';
const COUNTRIES = ['Italy', 'Korea', 'Egypt', 'Germany'];

// Free proxy sources by country
const PROXY_SOURCES = {
    'Italy': { proxies: ['51.159.0.232:3128', '185.199.229.156:7492', '157.245.27.9:3128'], flag: '🇮🇹' },
    'Korea': { proxies: ['121.166.74.26:8080', '211.253.8.51:8080', '164.125.250.3:8080'], flag: '🇰🇷' },
    'Egypt': { proxies: ['196.216.2.1:8080', '41.33.202.10:8080', '196.216.2.200:3128'], flag: '🇪🇬' },
    'Germany': { proxies: ['51.159.0.232:3128', '185.199.229.156:7492', '89.238.150.105:80'], flag: '🇩🇪' },
};

function tryProxy(targetUrl, proxy, timeout = 8000) {
    return new Promise((resolve, reject) => {
        const url = new URL(targetUrl);
        const [host, port] = proxy.split(':');
        
        const opts = {
            host: host,
            port: parseInt(port),
            method: 'GET',
            path: url.pathname,
            headers: {
                'Host': url.hostname,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: timeout,
        };

        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

function fetchDirect(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
    });
}

function extractAds(html) {
    const ads = [];
    
    // PropellerAds zones
    const zoneRegex = /key\s*:\s*['"]([a-f0-9]{32})['"]/g;
    let match;
    while ((match = zoneRegex.exec(html)) !== null) {
        ads.push({ network: 'PropellerAds', id: match[1], type: 'Display Banner' });
    }
    
    // effectivecpmnetwork zones
    const cpmRegex = /pl(\d+)\.effectivecpmnetwork\.com\/([a-f0-9\/]+)\.js/g;
    while ((match = cpmRegex.exec(html)) !== null) {
        ads.push({ network: 'PropellerAds', id: match[2], type: 'Popunder/Social/Native' });
    }
    
    // Smart links
    if (html.includes('effectivecpmnetwork.com/mgjwp8zz')) {
        ads.push({ network: 'PropellerAds', id: 'mgjwp8zz', type: 'Smart Link' });
    }
    
    // Google Ads
    if (html.includes('googletag') || html.includes('google_ads')) {
        ads.push({ network: 'Google Ads', id: 'detected', type: 'Display/Search' });
    }
    
    // Cloudflare
    const cfRay = html.includes('cf-ray');
    
    return { ads: [...new Map(ads.map(a => [a.id, a])).values()], cfProtected: cfRay };
}

async function testCountry(country) {
    const info = PROXY_SOURCES[country];
    console.log(`\n${info.flag} ${'═'.repeat(50)}`);
    console.log(`  Testing: ${country}`);
    console.log(`${'═'.repeat(50)}`);
    
    let success = false;
    
    for (const proxy of info.proxies) {
        try {
            console.log(`  Trying proxy: ${proxy}...`);
            const res = await tryProxy(TARGET, proxy);
            const result = extractAds(res.body);
            console.log(`  ✅ Connected! Status: ${res.status}`);
            console.log(`  Ads found: ${result.ads.length}`);
            result.ads.forEach(a => console.log(`    - ${a.network} (${a.type})`));
            success = true;
            break;
        } catch (e) {
            console.log(`  ❌ Failed: ${e.message}`);
        }
    }
    
    if (!success) {
        console.log(`  ⚠️  All proxies failed for ${country}`);
        console.log(`  Trying direct connection (no geo-routing)...`);
        try {
            const res = await fetchDirect(TARGET);
            const result = extractAds(res.body);
            console.log(`  📡 Direct: Status ${res.status}, Ads: ${result.ads.length}`);
            result.ads.forEach(a => console.log(`    - ${a.network} (${a.type})`));
        } catch (e) {
            console.log(`  ❌ Direct also failed: ${e.message}`);
        }
    }
}

async function main() {
    console.log('╔' + '═'.repeat(52) + '╗');
    console.log('║  COUNTRY-SPECIFIC AD TESTING — https://pulsetech-adsterra-portal.surge.sh    ║');
    console.log('╚' + '═'.repeat(52) + '╝');
    console.log('');
    console.log('Note: Free proxies are unreliable. Testing each country...');
    console.log('PropellerAds geo-targets based on visitor IP country.');
    
    for (const country of COUNTRIES) {
        await testCountry(country);
    }
    
    console.log('\n' + '─'.repeat(54));
    console.log('  HOW PROPELLERADS GEO-TARGETING WORKS');
    console.log('─'.repeat(54));
    console.log(`
  PropellerAds automatically detects visitor country via IP.
  
  Different countries see different ads:
  
  🇮🇹 ITALY:
     - Italian language ads
     - Local Italian brands, apps, services
     - European GDPR-compliant ads
     - CPM: $1-4
  
  🇰🇷 KOREA:
     - Korean language ads (한국어)
     - Korean apps, games, shopping
     - K-pop, K-drama related ads
     - CPM: $2-6
  
  🇪🇬 EGYPT:
     - Arabic language ads
     - Local Egyptian brands
     - Mobile recharge, app installs
     - CPM: $0.5-2
  
  🇩🇪 GERMANY:
     - German language ads
     - European brands, GDPR consent
     - High-quality premium ads
     - CPM: $3-8
  
  The website code is the SAME for all countries.
  Only the ad content changes based on your IP.
`);
    console.log('═'.repeat(54));
    console.log('  To test yourself: Use VPN to connect to each');
    console.log('  country, then open https://pulsetech-adsterra-portal.surge.sh');
    console.log('═'.repeat(54));
}

main().catch(console.error);
