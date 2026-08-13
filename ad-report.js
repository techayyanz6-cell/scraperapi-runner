const https = require('https');

const WEBSITE = 'https://pulsetech-adsterra-portal.surge.sh';

// All ad zones found in source code
const AD_ZONES = [
    { name: 'Popunder', src: 'pl30663448.effectivecpmnetwork.com', id: '0bfd9d08b493adfe36496f317c8e34e6', type: 'Full page pop-under' },
    { name: 'Social Bar', src: 'pl30663450.effectivecpmnetwork.com', id: '435399e0c3ec1c7004721bd66e78817c', type: 'Floating social-style notifications' },
    { name: 'Native Banner (Shops)', src: 'pl30663449.effectivecpmnetwork.com', id: '998efe3ef3626dd7949c43160d195c30', type: 'Native content ads' },
    { name: 'Banner 468x60 (Desktop Header)', src: 'highperformanceformat.com', id: 'f9a00eb4266f7f16c5512180749923e1', type: 'Classic display banner' },
    { name: 'Sidebar Skyscraper 160x600', src: 'highperformanceformat.com', id: 'b0b41d80a4e03056bf62ce74f29d1baa', type: 'Tall sidebar banner' },
    { name: 'Sidebar Banner 160x300', src: 'highperformanceformat.com', id: 'c74069871762fbaa9e790b547ca98995', type: 'Medium sidebar banner' },
    { name: 'Rewarded / More Page 300x250', src: 'highperformanceformat.com', id: 'e7f819513879694f4806db383f6cb7a2', type: 'Rewarded overlay + More page' },
    { name: 'Desktop Leaderboard 728x90', src: 'highperformanceformat.com', id: '13dc957eda6b59fdbfcb6942e530c5ea', type: 'Bottom leaderboard' },
    { name: 'Mobile Banner 320x50', src: 'highperformanceformat.com', id: '798c8e273d810d0bb8f90f1333815723', type: 'Mobile sticky banner' },
    { name: 'Smart Link (More Page CTA)', src: 'effectivecpmnetwork.com', id: 'mgjwp8zz', type: 'Direct link / affiliate offer' },
];

const AD_NETWORKS = {
    'effectivecpmnetwork.com': {
        company: 'PropellerAds',
        hq: 'Cyprus (Global)',
        types: ['Popunder', 'Social Bar', 'Native', 'Smart Links', 'Push Notifications'],
        payment: 'CPM, CPC',
        topCountries: ['Pakistan', 'India', 'Bangladesh', 'Indonesia', 'Philippines', 'Brazil', 'Turkey', 'Egypt'],
    },
    'highperformanceformat.com': {
        company: 'PropellerAds (getDisplay)',
        hq: 'Cyprus (Global)',
        types: ['Display Banners', 'Native Display', 'In-Page Push'],
        payment: 'CPM',
        topCountries: ['Global - auto-targets visitor country'],
    },
    'cloudflareinsights.com': {
        company: 'Cloudflare Analytics',
        hq: 'USA',
        types: ['Web Analytics (not ads)'],
        payment: 'Free',
        topCountries: ['Global'],
    }
};

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
    });
}

async function main() {
    console.log('');
    console.log('╔' + '═'.repeat(62) + '╗');
    console.log('║' + '  NAROWALIANS.ONLINE — COMPLETE AD ANALYSIS REPORT'.padEnd(62) + '║');
    console.log('╚' + '═'.repeat(62) + '╝');

    // Fetch website
    console.log('\n📡 Fetching website...');
    try {
        const res = await fetchUrl(WEBSITE);
        console.log(`   Status: HTTP ${res.status}`);
        console.log(`   Cloudflare: ${res.headers['cf-ray'] ? 'Yes (Ray: ' + res.headers['cf-ray'] + ')' : 'No'}`);
        console.log(`   Server: ${res.headers['server'] || 'Unknown'}`);
    } catch (e) {
        console.log(`   Error: ${e.message}`);
    }

    // Ad Networks Info
    console.log('\n' + '─'.repeat(64));
    console.log('  AD NETWORKS IDENTIFIED');
    console.log('─'.repeat(64));
    
    for (const [domain, info] of Object.entries(AD_NETWORKS)) {
        console.log(`\n  🏢 ${info.company}`);
        console.log(`     Domain: ${domain}`);
        console.log(`     HQ: ${info.hq}`);
        console.log(`     Ad Types: ${info.types.join(', ')}`);
        console.log(`     Payment: ${info.payment}`);
        console.log(`     Top Geo: ${info.topCountries.join(', ')}`);
    }

    // All Ad Placements
    console.log('\n' + '─'.repeat(64));
    console.log('  ALL AD PLACEMENTS (10 Total)');
    console.log('─'.repeat(64));
    
    AD_ZONES.forEach((z, i) => {
        console.log(`\n  ${i + 1}. ${z.name}`);
        console.log(`     Type: ${z.type}`);
        console.log(`     Network: ${z.src}`);
        console.log(`     Zone ID: ${z.id}`);
    });

    // Country-specific ad behavior
    console.log('\n' + '─'.repeat(64));
    console.log('  COUNTRY-SPECIFIC AD BEHAVIOR');
    console.log('─'.repeat(64));
    console.log(`
  PropellerAds uses geo-targeting. Ads change based on:

  🇵🇰 PAKISTAN (Primary audience):
     - Local Pakistani ads (Easypaisa, JazzCash, Daraz, etc.)
     - Urdu language ads
     - Higher CPM for Pakistan traffic
     - Popunder + Social Bar most active

  🇰🇷 KOREA (Korean audience):
     - Korean language ads
     - Local Korean brands & apps
     - Different ad creatives

  🇺🇸🌍 OTHER COUNTRIES:
     - English/Global ads
     - VPN, crypto, gambling ads common
     - Lower CPM for Tier-3 countries

  📱 DEVICE-BASED:
     - Mobile: 320x50 banner + Social Bar
     - Desktop: 468x60, 728x90, 160x600 banners
     - Both: Popunder on first click
`);

    // Rewarded Ad System
    console.log('─'.repeat(64));
    console.log('  REWARDED AD SYSTEM (Custom Implementation)');
    console.log('─'.repeat(64));
    console.log(`
  The site has a custom rewarded ad system:
  
  Trigger Points:
  1. Joining chat (first time)
  2. Opening any shop menu
  
  How it works:
  - Shows 5-second countdown timer
  - Displays 300x250 ad from PropellerAds
  - User must wait 5 seconds then click "Continue"
  - Cached for 5 minutes per action (no重复 ads)
  
  Revenue Model:
  - Popunder: ~$1-5 per 1000 views (Pakistan)
  - Social Bar: ~$0.5-3 per 1000 views
  - Display Banners: ~$0.2-2 per 1000 views
  - Rewarded: Higher engagement = higher CPM
`);

    // Summary
    console.log('═'.repeat(64));
    console.log('  SUMMARY');
    console.log('═'.repeat(64));
    console.log(`
  Total Ad Zones: 10
  Primary Network: PropellerAds
  Ad Types: Popunder, Social Bar, Native, Display, Rewarded, Smart Links
  
  Revenue Streams:
  1. Popunder ads (on page load / first click)
  2. Social Bar (floating notifications)
  3. Native ads (in shops listing)
  4. Display banners (6 different sizes)
  5. Rewarded ads (custom 5-sec timer)
  6. Smart Links (affiliate offers)
  
  To see actual ads from different countries:
  - Use VPN → Connect to Pakistan, Korea, etc.
  - Open https://pulsetech-adsterra-portal.surge.sh
  - Ads will change based on your IP country
`);
    console.log('═'.repeat(64));
}

main().catch(console.error);
