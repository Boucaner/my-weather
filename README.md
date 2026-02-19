# My Weather

Life-first weather intelligence — your schedule, your context, your brief.

## Quick Start (Local Dev)

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

Opens at `http://localhost:5173`. Your browser will ask for location access.

## Deploy to Your Phone (3 options)

### Option A: Vercel (Easiest — Free)
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click "Import Project" → select your repo
4. Framework preset: **Vite** (should auto-detect)
5. Click Deploy
6. You'll get a URL like `my-weather-xyz.vercel.app`
7. Open that URL on your Android phone in Chrome
8. Tap the three-dot menu → **"Add to Home Screen"**
9. Done — it's now an app icon on your phone

### Option B: Netlify (Also Free)
1. Push to GitHub
2. Go to [netlify.com](https://netlify.com), sign in with GitHub
3. "Add new site" → "Import an existing project"
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Deploy, then same phone steps as above

### Option C: Local Network (For Testing)
```bash
npm run dev -- --host
```
This exposes the dev server on your local network. Your terminal
will show something like `http://192.168.1.xxx:5173`. Open that
on your phone (must be on same WiFi). Good for quick testing but
not persistent.

## PWA Installation on Android

Once deployed and opened in Chrome on your phone:
1. Chrome will show an "Add to Home Screen" banner automatically, OR
2. Tap ⋮ (three dots) → "Add to Home Screen" → "Install"
3. The app will appear as an icon on your home screen
4. Opens full-screen like a native app (no browser chrome)
5. Works offline for cached data thanks to the service worker

## What's Live

- **Real weather data** from Open-Meteo API (free, no key needed)
- **NWS alerts** for US locations (free, no key needed)
- **Geolocation** — uses your phone's GPS, falls back to Goochland, VA
- **Conversational daily brief** — natural language summary, not raw data
- **Dew point display** with educational info modal
- **Font size** accessibility control (S/M/L)
- **10-day forecast** with temperature range bars
- **24-hour hourly** forecast with precipitation probability
- **PWA** — installable, works offline, full-screen on mobile

## App Icons

You'll need to add icon files for the PWA. Create these in `public/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Use any icon generator — a simple sun/weather icon on a dark (#0a0a0f) background works well. Or use a tool like [realfavicongenerator.net](https://realfavicongenerator.net).

## Architecture

```
src/
  main.jsx          → React entry point
  App.jsx           → Main app component (UI, layout, state)
  useWeatherData.js → Data fetching hook (Open-Meteo, NWS, geolocation)
  weatherUtils.js   → WMO codes, summaries, dew point calc
```

## What's Next (V1.5+)

- Calendar integration (Google Calendar / Apple)
- Background location tracking for pattern learning
- Push notifications for weather-sensitive events
- Personalized briefs based on user routine
- Premium tier with extended features

## API Sources

| Source | What | Cost | Key Needed |
|--------|------|------|------------|
| Open-Meteo | Forecast, current, hourly | Free | No |
| NWS | Severe weather alerts | Free | No |
| Nominatim | Reverse geocoding | Free | No |

All free for this stage. Google Weather API and additional sources
can be layered in later for enhanced accuracy.
