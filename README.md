# ⚡ ScraperAPI 24/7 Cloud Traffic Runner

A high-performance, resilient 24/7 web service with **Smart Sequential Key Rotation**, dynamic link management, and an ultra-modern real-time web dashboard, ready for **Render** deployment.

---

## ✨ Features (خصوصیات)

1. **🔑 Smart Key Rotation (آٹو کی سوئچنگ)**:
   - Keys ek queue/pool men manage hoti hain (`ACTIVE` -> `STANDBY` -> `EXHAUSTED`).
   - Pehle Active key use hoti hai. Jaise hi uske credits 0 hon ya limit reach ho (`403` / `429` / credits <= 50), runner **automatically aglay Standby key par switch** kar deta hai.
   - Nayi keys online dashboard se kabhi bhi add ki ja sakti hain.
2. **🔗 Dynamic Smartlinks**:
   - CPM direct links aur Smartlinks ko browser se on-the-fly add/delete karein bina server restart kiye.
3. **🌐 24/7 Non-Stop Execution on Render**:
   - `process.env.PORT` binding, `/healthz` zero-downtime health check probe, aur built-in self-keepalive support.
4. **📊 Live Web Dashboard**:
   - Real-time KPI metrics: Total Visits, Landings, Empty responses, Ad Clicks (Success / Total), Ad Sessions, Uptime.
   - Performance tables: Country-wise aur Key-wise breakdown.
   - Live streaming terminal log feed.
5. **🛡️ Headless Cloud Rendering**:
   - ScraperAPI ke proxies aur JS rendering engine ke sath full session interaction (humanized ad clicks & dwell delays).

---

## 🚀 How to Host on Render (Render par Host krne ka Tareeqa)

### Step 1: Push Code to GitHub
Apne project ko GitHub repository men push karein:
```bash
git init
git add .
git commit -m "ScraperAPI 24/7 Runner with Smart Key Rotation"
git remote add origin https://github.com/YOUR_USERNAME/scraperapi-runner.git
git push -u origin main
```

### Step 2: Deploy on Render
1. [Render.com](https://render.com) par login karein.
2. **New +** button par click karein aur **Web Service** select karein.
3. Apni GitHub repository connect karein.
4. Settings enter karein:
   - **Name**: `scraperapi-runner` (ya jo bhi naam aap chahein)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free` (ya Paid for dedicated resources)
5. **Create Web Service** par click karein.

---

## 🕒 24/7 Keep-Alive Setup (Render Free Tier ke liye)

Render Free Tier par service 15 minute inactivity ke baad sleep na ho, iske liye:
1. [UptimeRobot.com](https://uptimerobot.com) ya [Cron-job.org](https://cron-job.org) par free account banayein.
2. **New Monitor** add karein:
   - **Monitor Type**: `HTTP(s)`
   - **URL**: `https://your-app-name.onrender.com/healthz`
   - **Monitoring Interval**: `Every 5 minutes`
3. Ab aapka ScraperAPI Runner 24/7 non-stop chalta rahay ga!

---

## 🖥️ Local Run (Apne Computer par Chalana)

```bash
# Install dependencies
npm install

# Start server
npm start
```
Browser men open karein: `http://localhost:3000`

---

## 📋 API Reference

- `GET /api/state` — Full runner state, stats, keys, and logs.
- `POST /api/keys` — Add single or bulk 32-char ScraperAPI keys.
- `DELETE /api/keys/:key` — Delete a key.
- `POST /api/keys/refresh` — Refresh credit counts of all keys.
- `POST /api/links` — Add destination URL.
- `DELETE /api/links/:idx` — Remove a destination URL.
- `POST /api/settings` — Update concurrency, countries, and render %.
- `POST /api/start` — Start 24/7 background runner.
- `POST /api/stop` — Stop background runner.
- `GET /healthz` — Health check endpoint (returns 200 OK).
