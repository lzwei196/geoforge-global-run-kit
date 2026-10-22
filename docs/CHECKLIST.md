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

- [ ] HTTPS with a valid certificate (and ICP filing if the server is in mainland China).
- [ ] `data/` is sent with `Cache-Control: no-store` and `Access-Control-Allow-Origin: https://geoforgehhu.com`.
- [ ] `curl -sI -H "Origin: https://geoforgehhu.com" https://<address>/data/manifest.json` shows both.
- [ ] `tools/status_writer.py` (or your own writer) runs and restarts after a reboot.
- [ ] The server clock is synced (NTP).

## Send to GeoForge

- [ ] Your page address and `project_id`.
- [ ] One card picture: JPG, 1200 × 800 px, under 300 KB, no text on it.
- [ ] A contact for status questions (we will not publish it).
