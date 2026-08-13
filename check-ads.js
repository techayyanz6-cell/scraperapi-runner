const https = require('https');
const http = require('http');

const AD_SCRIPTS = [
    { name: 'Popunder', url: 'https://pl30663448.effectivecpmnetwork.com/0b/fd/9d/0bfd9d08b493adfe36496f317c8e34e6.js' },
    { name: 'Social Bar', url: 'https://pl30663450.effectivecpmnetwork.com/43/53/99/435399e0c3ec1c7004721bd66e78817c.js' },
    { name: 'Native Banner', url: 'https://pl30663449.effectivecpmnetwork.com/998efe3ef3626dd7949c43160d195c30/invoke.js' },
    { name: 'Banner 468x60 (Desktop)', key: 'f9a00eb4266f7f16c5512180749923e1', format: 'iframe' },
    { name: 'Sidebar 160x600', key: 'b0b41d80a4e03056bf62ce74f29d1baa', format: 'iframe' },
    { name: 'Sidebar 160x300', key: 'c74069871762fbaa9e790b547ca98995', format: 'iframe' },
    { name: 'Rewarded / More Page 300x250', key: 'e7f819513879694f4806db383f6cb7a2', format: 'iframe' },
    { name: 'Desktop Banner 728x90', key: '13dc957eda6b59fdbfcb6942e530c5ea', format: 'iframe' },
    { name: 'Mobile Banner 320x50', key: '798c8e273d810d0bb8f90f1333815723', format: 'iframe' },
    { name: 'Smart Link (CTA)', url: 'https://www.effectivecpmnetwork.com/mgjwp8zz?key=3a3648e3a272849b3eaf1553a6e698c6' },
];

const AD_NETWORKS = {
    'effectivecpmnetwork.com': {
        name: 'Effective CPM Network (PropellerAds)',
        type: 'Popunder / Social Bar / Native / Smart Link'
    },
    'highperformanceformat.com': {
        name: 'High Performance Format (PropellerAds)',
        type: 'Display Banners (iframe)'
    }
};

function fetch(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', ...headers } }, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetch(res.headers.location, headers).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    });
}

function analyzeScript(body) {
    const findings = [];
    // Look for ad network indicators
    if (body.includes('propellerads') || body.includes('propeller')) findings.push('PropellerAds detected');
    if (body.includes('popunder') || body.includes('pop-under')) findings.push('Popunder ad type');
    if (body.includes('socialbar') || body.includes('social-bar')) findings.push('Social Bar ad type');
    if (body.includes('exo') || body.includes('evadav')) findings.push('Evadav / ExoClick');
    if (body.includes('adsterra')) findings.push('Adsterra');
    if (body.includes('monetag')) findings.push('Monetag');
    if (body.includes('hilltopads')) findings.push('HilltopAds');
    if (body.includes('juicyads')) findings.push('JuicyAds');
    if (body.includes('clickadu')) findings.push('Clickadu');
    if (body.includes('popcash')) findings.push('PopCash');
    if (body.includes('richpush')) findings.push('RichPush');
    if (body.includes('galaksion')) findings.push('Galaksion');
    if (body.includes('trafficjunky')) findings.push('TrafficJunky');
    if (body.includes('mgid')) findings.push('MGID');
    if (body.includes('taboola')) findings.push('Taboola');
    if (body.includes('outbrain')) findings.push('Outbrain');
    if (body.includes('revcontent')) findings.push('RevContent');
    if (body.includes('mediavine')) findings.push('Mediavine');
    if (body.includes('adthrive') || body.includes('raptive')) findings.push('Adthrive/Raptive');
    if (body.includes('google_ads') || body.includes('googletag') || body.includes('adsense')) findings.push('Google AdSense/Ad Manager');
    if (body.includes('amazon-adsystem')) findings.push('Amazon Ads');
    if (body.includes('criteo')) findings.push('Criteo');
    if (body.includes('pubmatic')) findings.push('PubMatic');
    if (body.includes('openx')) findings.push('OpenX');
    if (body.includes('rubiconproject') || body.includes('magnite')) findings.push('Magnite/Rubicon');
    if (body.includes('indexexchange')) findings.push('Index Exchange');
    if (body.includes('sharethrough')) findings.push('Sharethrough');
    if (body.includes('triplelift')) findings.push('TripleLift');
    
    // Look for targeting/geo info
    const geoMatch = body.match(/country['":\s]*['"]?([A-Z]{2})/i);
    if (geoMatch) findings.push(`Country targeting: ${geoMatch[1]}`);
    
    // Look for ad sizes
    const sizeMatch = body.match(/(\d{2,3})x(\d{2,3})/g);
    if (sizeMatch) findings.push(`Ad sizes: ${[...new Set(sizeMatch)].join(', ')}`);
    
    return findings.length ? findings : ['Script fetched, analyzing...'];
}

async function checkAd(ad) {
    const result = { name: ad.name, status: 'unknown', findings: [] };
    
    try {
        let url;
        if (ad.key) {
            url = `https://www.highperformanceformat.com/${ad.key}/invoke.js`;
        } else {
            url = ad.url;
        }
        
        const res = await fetch(url);
        result.status = `HTTP ${res.status}`;
        result.findings = analyzeScript(res.body);
        result.bodySize = `${(res.body.length / 1024).toFixed(1)} KB`;
        
        // Check response headers for ad network info
        if (res.headers['x-powered-by']) result.findings.push(`Powered by: ${res.headers['x-powered-by']}`);
        if (res.headers['server']) result.findings.push(`Server: ${res.headers['server']}`);
        
    } catch (e) {
        result.status = 'Error';
        result.findings = [e.message];
    }
    
    return result;
}

async function main() {
    console.log('='.repeat(70));
    console.log('  NAROWALIANS.ONLINE - Ad Network Analysis');
    console.log('='.repeat(70));
    console.log('');
    console.log('Ad Networks Detected on Website:');
    console.log('-'.repeat(50));
    for (const [domain, info] of Object.entries(AD_NETWORKS)) {
        console.log(`  Network: ${info.name}`);
        console.log(`  Domain:  ${domain}`);
        console.log(`  Type:    ${info.type}`);
        console.log('');
    }
    
    console.log('Ad Placements:');
    console.log('-'.repeat(50));
    AD_SCRIPTS.forEach((ad, i) => {
        const loc = ad.key ? `highperformanceformat.com/${ad.key}` : ad.url;
        console.log(`  ${i + 1}. ${ad.name}`);
        console.log(`     URL: ${loc}`);
    });
    console.log('');
    
    console.log('Fetching & Analyzing Ad Scripts...');
    console.log('-'.repeat(50));
    
    const results = await Promise.all(AD_SCRIPTS.map(checkAd));
    
    results.forEach(r => {
        console.log(`\n[${r.name}]`);
        console.log(`  Status: ${r.status} | Size: ${r.bodySize || 'N/A'}`);
        r.findings.forEach(f => console.log(`  -> ${f}`));
    });
    
    console.log('');
    console.log('='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log('Primary Ad Network: PropellerAds (effectivecpmnetwork.com)');
    console.log('Ad Types: Popunder, Social Bar, Native, Display Banners, Smart Links');
    console.log('Rewarded Ads: Custom 5-second timer implementation');
    console.log('');
    console.log('NOTE: Actual ad content varies by country/IP.');
    console.log('To see country-specific ads, use VPN or proxy with different IPs.');
}

main().catch(console.error);
