const puppeteer = require('puppeteer-core');

const BROWSER_PATH = '/home/shaharyar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';

const AD_ZONES = [
    { name: 'Popunder', url: 'https://pl30663448.effectivecpmnetwork.com/0b/fd/9d/0bfd9d08b493adfe36496f317c8e34e6.js' },
    { name: 'Social Bar', url: 'https://pl30663450.effectivecpmnetwork.com/43/53/99/435399e0c3ec1c7004721bd66e78817c.js' },
    { name: 'Native Banner', url: 'https://pl30663449.effectivecpmnetwork.com/998efe3ef3626dd7949c43160d195c30/invoke.js' },
    { name: 'Banner 468x60', key: 'f9a00eb4266f7f16c5512180749923e1' },
    { name: 'Sidebar 160x600', key: 'b0b41d80a4e03056bf62ce74f29d1baa' },
    { name: 'Sidebar 160x300', key: 'c74069871762fbaa9e790b547ca98995' },
    { name: 'Rewarded 300x250', key: 'e7f819513879694f4806db383f6cb7a2' },
    { name: 'Desktop 728x90', key: '13dc957eda6b59fdbfcb6942e530c5ea' },
    { name: 'Mobile 320x50', key: '798c8e273d810d0bb8f90f1333815723' },
];

async function main() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        executablePath: BROWSER_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // Intercept network requests to capture ads
    const adRequests = [];
    page.on('request', req => {
        const url = req.url();
        if (url.includes('effectivecpmnetwork') || url.includes('highperformanceformat') || 
            url.includes('propellerads') || url.includes('googletag') || url.includes('adsense') ||
            url.includes('doubleclick') || url.includes('adnxs') || url.includes('taboola') ||
            url.includes('outbrain') || url.includes('criteo') || url.includes('amazon') ||
            url.includes('pubmatic') || url.includes('openx') || url.includes('rubicon') ||
            url.includes('sharethrough') || url.includes('triplelift') || url.includes('indexww') ||
            url.includes('casalemedia') || url.includes('spotx') || url.includes('teads') ||
            url.includes('prebid') || url.includes('bidswitch') || url.includes('contextweb') ||
            url.includes('sovrn') || url.includes('yieldmo') || url.includes('seedtag') ||
            url.includes('medianet') || url.includes('monetag') || url.includes('hilltopads') ||
            url.includes('exoclick') || url.includes('juicyads') || url.includes('trafficjunky') ||
            url.includes('clickadu') || url.includes('popcash') || url.includes('evadav') ||
            url.includes('galaksion') || url.includes('richpush') || url.includes('mgid') ||
            url.includes('revcontent') || url.includes('mediavine') || url.includes('adsterra') ||
            url.includes('adform') || url.includes('bidvertiser') || url.includes('chitika') ||
            url.includes('infolinks') || url.includes('kontera') || url.includes('vibrant') ||
            url.includes('undertone') || url.includes('nativo') || url.includes('ligatus') ||
            url.includes('overlap') || url.includes('smartadserver') || url.includes('weborama')) {
            adRequests.push({
                url: url.substring(0, 150),
                type: req.resourceType(),
                method: req.method()
            });
        }
    });

    console.log('Loading https://pulsetech-adsterra-portal.surge.sh...\n');
    try {
        await page.goto('https://pulsetech-adsterra-portal.surge.sh', { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
        console.log('Page load timeout, continuing...');
    }

    // Wait for ads to load
    await new Promise(r => setTimeout(r, 5000));

    // Get page title and online count
    const title = await page.title();
    const onlineCount = await page.$eval('#topOnline', el => el.textContent).catch(() => 'N/A');

    // Take screenshot
    await page.screenshot({ path: '/home/shaharyar/Desktop/node/ads-screenshot.png', fullPage: false });
    console.log('Screenshot saved: ads-screenshot.png\n');

    // Analyze all iframes on page
    const iframes = await page.evaluate(() => {
        const frames = document.querySelectorAll('iframe');
        return Array.from(frames).map(f => ({
            src: f.src || f.getAttribute('data-src') || 'inline',
            width: f.width,
            height: f.height,
            id: f.id,
            className: f.className
        }));
    });

    // Analyze scripts
    const scripts = await page.evaluate(() => {
        const scriptTags = document.querySelectorAll('script[src]');
        return Array.from(scriptTags).map(s => s.src).filter(s => 
            s.includes('effectivecpm') || s.includes('highperformance') || 
            s.includes('propellerads') || s.includes('cloudflare')
        );
    });

    // Check for specific ad networks in page content
    const adNetworks = await page.evaluate(() => {
        const html = document.documentElement.outerHTML;
        const networks = [];
        if (html.includes('propellerads') || html.includes('effectivecpmnetwork')) networks.push('PropellerAds');
        if (html.includes('googletag') || html.includes('google_ads')) networks.push('Google Ads');
        if (html.includes('doubleclick.net')) networks.push('Google DoubleClick');
        if (html.includes('adnxs.com')) networks.push('Xandr/AppNexus');
        if (html.includes('taboola.com')) networks.push('Taboola');
        if (html.includes('outbrain.com')) networks.push('Outbrain');
        if (html.includes('criteo.com')) networks.push('Criteo');
        if (html.includes('amazon-adsystem')) networks.push('Amazon Ads');
        if (html.includes('cloudflare')) networks.push('Cloudflare (CDN/Security)');
        return [...new Set(networks)];
    });

    // Print results
    console.log('='.repeat(60));
    console.log('  NAROWALIANS.ONLINE - Ad Analysis Report');
    console.log('='.repeat(60));
    console.log(`  Page Title: ${title}`);
    console.log(`  Online Users: ${onlineCount}`);
    console.log('');

    console.log('AD NETWORKS DETECTED:');
    console.log('-'.repeat(60));
    adNetworks.forEach(n => console.log(`  ✅ ${n}`));

    console.log('\nAD SCRIPTS LOADED:');
    console.log('-'.repeat(60));
    scripts.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

    console.log('\nAD IFRAMES ON PAGE:');
    console.log('-'.repeat(60));
    iframes.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.width}x${f.height} | ${f.src.substring(0, 100)}`);
    });

    console.log('\nAD NETWORK REQUESTS (intercepted):');
    console.log('-'.repeat(60));
    const uniqueDomains = [...new Set(adRequests.map(r => {
        try { return new URL(r.url).hostname; } catch { return r.url; }
    }))];
    uniqueDomains.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
    console.log(`  Total ad requests: ${adRequests.length}`);

    console.log('\nAD ZONES (from source code):');
    console.log('-'.repeat(60));
    AD_ZONES.forEach((z, i) => {
        const url = z.key ? `highperformanceformat.com/${z.key}` : z.url;
        console.log(`  ${i + 1}. ${z.name}`);
        console.log(`     ${url}`);
    });

    // Check page for ad-related elements
    const adElements = await page.evaluate(() => {
        return {
            banners: document.querySelectorAll('[class*="banner"], [id*="banner"], [id*="ad-"]').length,
            popups: document.querySelectorAll('[class*="popup"], [id*="popup"]').length,
            overlays: document.querySelectorAll('[class*="overlay"], [class*="modal"]').length,
        };
    });

    console.log('\nPAGE ELEMENTS:');
    console.log('-'.repeat(60));
    console.log(`  Banner elements: ${adElements.banners}`);
    console.log(`  Popup elements: ${adElements.popups}`);
    console.log(`  Overlay elements: ${adElements.overlays}`);

    console.log('\n' + '='.repeat(60));
    console.log('  COUNTRY-SPECIFIC ADS');
    console.log('='.repeat(60));
    console.log('  PropellerAds serves different ads based on:');
    console.log('  - Visitor country (geo-targeting)');
    console.log('  - Device type (mobile vs desktop)');
    console.log('  - Browser language');
    console.log('  - Time of day');
    console.log('');
    console.log('  To see country-specific ads, use VPN with');
    console.log('  different country IPs (Pakistan, Korea, etc.)');
    console.log('='.repeat(60));

    await browser.close();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
