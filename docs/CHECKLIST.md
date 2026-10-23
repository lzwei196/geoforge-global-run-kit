# Checklist before going live

## Your data

- [ ] `python3 tools/check_data.py <your data folder>` says "ready to publish" (0 errors).
- [ ] `manifest.json` has no `"example": true`.
- [ ] Every text is filled in English and Chinese, and a Chinese speaker has read the Chinese.
- [ ] `updated_at` changes every time new results are written; `manifest.json` is written last.
- [ ] Missing values are `null`, never 0 or -9999.
- [ ] Nothing in `data/` that you are not free to publish (STYLE.md).

## Your page

- [ ] Built from this repository (`npm run build`), header unchanged, back button goes to Global Runs.
- [ ] Opens on a phone (about 390 px wide): map, search, language button and badge all usable.
- [ ] The language button switches every word, including your manifest texts.
- [ ] Opening the page with `?from=cn` starts in Chinese.

## Your server

- [ ] The page server (`geoforge-site`), the status writer (`geoforge-status`) and the tunnel (`geoforge-tunnel`) are
      services that start after a reboot (or, with your own web server: HTTPS with a valid certificate, and ICP
      filing if the server is in mainland China).
- [ ] `curl -sI -H "Origin: https://geoforgehhu.com" https://<address>/data/manifest.json` shows `200`,
      `Cache-Control: no-store` and `Access-Control-Allow-Origin: https://geoforgehhu.com`.
- [ ] The tunnel key is not in any code, chat or repository.
- [ ] The export runs after new results (cron), and the server clock is synced (NTP).

## Send to GeoForge

- [ ] Your page address and `project_id`.
- [ ] One card picture: JPG, 1200 × 800 px, under 300 KB, no text on it.
- [ ] The card text in English and Chinese: title (up to 80 characters), two sentences, up to 6 tags.
- [ ] A contact for status questions (we will not publish it).
