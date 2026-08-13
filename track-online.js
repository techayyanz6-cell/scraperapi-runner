const https = require('https');
const fs = require('fs');
const path = require('path');

const ONLINE_API = 'https://chat-worker.techayyanz8.workers.dev/api/online';
const INTERVAL = 5 * 60 * 1000; // 5 minutes
const LOG_FILE = path.join(__dirname, 'online_log.csv');

if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, 'timestamp,users_online,usernames\n');
}

function fetchOnline() {
    https.get(ONLINE_API, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                const count = json.count || 0;
                const users = (json.users || []).join('; ');
                const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
                const line = `"${now}",${count},"${users}"\n`;
                fs.appendFileSync(LOG_FILE, line);
                console.log(`[${now}] Online: ${count} | Users: ${users || 'none'}`);
            } catch (e) {
                console.error('Parse error:', e.message);
            }
        });
    }).on('error', (e) => {
        console.error('Request error:', e.message);
    });
}

console.log('Starting online user tracker...');
console.log(`Checking every ${INTERVAL / 1000 / 60} minutes`);
console.log(`Logging to: ${LOG_FILE}\n`);

fetchOnline();
setInterval(fetchOnline, INTERVAL);
